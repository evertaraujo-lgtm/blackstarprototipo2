import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { criarEstadoInicialLocal } from '../physics/ambiente/EstadoInicialLocal';
import { normalizarAngulo } from '../physics/ambiente/ReferencialFisico';
import { PerfilAtmosfericoReentrada } from '../physics/ambiente/PerfilAtmosfericoReentrada';
import { MundoFisico } from '../physics/MundoFisico';
import { Vetor3 } from '../physics/Vetor3';
import type { EstadoFisico, Objeto } from '../physics/objetos/base/Objeto';
import { OrbitadorReentrada } from '../physics/objetos/veiculos/OrbitadorReentrada';
import { FlapReentrada } from '../physics/objetos/componentes/FlapReentrada';
import { Bateria } from '../physics/objetos/fontes-de-energia/Bateria';
import { FixadorEstrutural } from '../physics/conexoes/FixadorEstrutural';
import { SuperficieEsferica } from '../physics/SuperficieEsferica';
import { SensoresVeiculoComposto } from '../physics/sensores/SensoresVeiculoComposto';
import { GerenciadorDeControladores } from '../physics/sistemas de controle/GerenciadorDeControladores';
import { ControladorPousoDePropulsores } from '../physics/sistemas de controle/ControladorPousoDePropulsores';
import { ControladorReentrada, type CorredorReentrada } from '../physics/sistemas de controle/ControladorReentrada';
import { SupervisorReentrada, LIMITES_TRANSFERENCIA, type LimitesTransferencia } from '../physics/sistemas de controle/SupervisorReentrada';
import { MODELO_REENTRADA } from '../physics/reentrada/ModeloAerodinamicoReentrada';
import type { EstadoExecucaoMissao, EventoMissao, InstanciaMissao, ResultadoComandoMissao } from '../missoes/ContratoMissao';
import { RegistroMissao, type DiarioMissao } from '../missoes/RegistroMissao';
import { copiarSnapshot } from '../missoes/SnapshotMissao';

export interface ConfiguracaoReentrada {
  readonly altitudeM: number;
  readonly velocidadeMps: number;
  readonly anguloAtaqueRad: number;
  readonly trajetoriaRad: number;
  readonly rolagemRad: number;
  readonly limiteOrbitadorC: number;
  readonly limiteFlapsC: number;
  readonly limiteBateriaC: number;
  readonly automatico: boolean;
  readonly chaveamentoAutomatico: boolean;
  readonly vacuo: boolean;
  readonly semente: number;
  readonly passoS: number;
  readonly corredor: CorredorReentrada;
  readonly transferencia: LimitesTransferencia;
}
export const CONFIGURACAO_REENTRADA: ConfiguracaoReentrada = copiarSnapshot({ altitudeM: 120_000,
  velocidadeMps: 7700, anguloAtaqueRad: 40 * Math.PI / 180, trajetoriaRad: -Math.PI / 180,
  rolagemRad: 0, limiteOrbitadorC: 1100, limiteFlapsC: 900, limiteBateriaC: 60, automatico: true,
  chaveamentoAutomatico: false, vacuo: false, semente: 1, passoS: 1 / 240,
  corredor: { pressaoMaximaPa: 50_000, fluxoMaximoWm2: 500_000, cargaMaximaG: 5 },
  transferencia: LIMITES_TRANSFERENCIA });

export type ComandoReentrada =
  | { readonly tipo: 'modo'; readonly automatico: boolean }
  | { readonly tipo: 'alvos'; readonly alphaRad: number; readonly phiRad: number }
  | { readonly tipo: 'flaps'; readonly dianteiroRad: number; readonly traseiroRad: number }
  | { readonly tipo: 'rolagem'; readonly phiRad: number }
  | { readonly tipo: 'chaveamento'; readonly automatico: boolean }
  | { readonly tipo: 'pouso' }
  | { readonly tipo: 'alimentacao'; readonly ligada: boolean }
  | { readonly tipo: 'falha-rolagem' }
  | { readonly tipo: 'separar-flap'; readonly indice: 0 | 1 };

/** Valida comando serializável por chaves exatas, finitude e limites; não executa.  @contract f-52a010df6b7f3e6e */
export function validarComandoReentrada(entrada: unknown): entrada is ComandoReentrada {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return false;
  const e = entrada as Record<string, unknown>;
  const chaves: Record<string, string[]> = { modo: ['automatico'], alvos: ['alphaRad', 'phiRad'],
    flaps: ['dianteiroRad', 'traseiroRad'], rolagem: ['phiRad'], chaveamento: ['automatico'], pouso: [],
    alimentacao: ['ligada'], 'falha-rolagem': [], 'separar-flap': ['indice'] };
  if (typeof e.tipo !== 'string' || !Object.hasOwn(chaves, e.tipo)) return false;
  if (Object.keys(e).length !== chaves[e.tipo].length + 1 || !chaves[e.tipo].every(k => Object.hasOwn(e, k))) return false;
  switch (e.tipo) {
    case 'modo': case 'chaveamento': return typeof e.automatico === 'boolean';
    case 'alimentacao': return typeof e.ligada === 'boolean';
    case 'separar-flap': return e.indice === 0 || e.indice === 1;
    case 'alvos': return typeof e.alphaRad === 'number' && Number.isFinite(e.alphaRad) && e.alphaRad >= 0
      && e.alphaRad <= 80 * Math.PI / 180 && typeof e.phiRad === 'number' && Number.isFinite(e.phiRad) && Math.abs(e.phiRad) <= Math.PI / 2;
    case 'rolagem': return typeof e.phiRad === 'number' && Number.isFinite(e.phiRad) && Math.abs(e.phiRad) <= Math.PI / 2;
    case 'flaps': return [e.dianteiroRad, e.traseiroRad].every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= Math.PI / 6);
    default: return true;
  }
}

/** Cria configuração copiada, validada e congelada; os limiares térmicos padrão
 * foram definidos pelo operador, não representam estrutura interna/qualificação.
 * @contract f-f88e23012b3ae8c3
   */
export function configurarReentrada(entrada: Partial<ConfiguracaoReentrada> = {}): ConfiguracaoReentrada {
  const c = copiarSnapshot({ ...CONFIGURACAO_REENTRADA, ...entrada });
  if (![c.altitudeM, c.velocidadeMps, c.anguloAtaqueRad, c.trajetoriaRad, c.rolagemRad,
    c.limiteOrbitadorC, c.limiteFlapsC, c.limiteBateriaC, c.passoS].every(Number.isFinite)
    || c.altitudeM < 10 || c.altitudeM > 200_000 || c.velocidadeMps < 0 || c.velocidadeMps > 12_000
    || c.anguloAtaqueRad < 0 || c.anguloAtaqueRad > 80 * Math.PI / 180 || Math.abs(c.trajetoriaRad) > Math.PI / 2
    || Math.abs(c.rolagemRad) > Math.PI / 2 || c.passoS <= 0 || c.passoS > 1 / 240
    || c.limiteOrbitadorC < -200 || c.limiteOrbitadorC > 5000 || c.limiteFlapsC < -200 || c.limiteFlapsC > 5000
    || c.limiteBateriaC < -200 || c.limiteBateriaC > 5000
    || !Number.isSafeInteger(c.semente) || c.semente < 0
    || ![c.automatico, c.chaveamentoAutomatico, c.vacuo].every(v => typeof v === 'boolean')
    || !c.corredor || !Object.values(c.corredor).every(v => Number.isFinite(v) && v > 0)) throw new Error('Configuração RE-001 inválida.');
  return c;
}

/** Constrói somente estado inicial de módulo: pose relativa rígida e velocidade
 * v+ω×r em SI. Não é usada para reposicionar objetos durante o ensaio.
 * @contract f-532e693d7fa63ff9
   */
function estadoModulo(e: EstadoFisico, x: number, y: number): EstadoFisico {
  const a = e.orientacaoRad.z;
  const r = new Vetor3(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), 0);
  return { ...e, posicaoM: e.posicaoM.adicionar(r),
    velocidadeMps: e.velocidadeMps.adicionar(e.velocidadeAngularRadps.produtoVetorial(r)) };
}

/** Fábrica ADM de corpos reais e vínculos no mesmo MundoFisico. Vácuo é explícito;
 * atmosfera RE é opt-in. Terra estática, XY, dt máximo 1/240 s. Fonte enclausurada.
 * @contract f-8fc45f499c16a562
   */
export function criarCenarioReentrada(entrada: Partial<ConfiguracaoReentrada> = {}) {
  const configuracao = configurarReentrada(entrada), c = configuracao;
  const ambiente = new AmbienteTerrestre(), perfil = new PerfilAtmosfericoReentrada();
  const mundo = new MundoFisico(c.passoS, { ambiente, perfilAtmosferico: perfil,
    densidadeAtmosfericaKgM3: c.vacuo ? 0 : 1.225 });
  const e = criarEstadoInicialLocal(ambiente.referencial, { arcoM: 0, altitudeM: c.altitudeM,
    velocidadeTangencialMps: c.velocidadeMps * Math.cos(c.trajetoriaRad),
    velocidadeRadialMps: c.velocidadeMps * Math.sin(c.trajetoriaRad),
    // Eixo longitudinal +X: θ=γ+α na tangente, distinto da vertical +Y dos BSS.
    atitudeLocalRad: c.trajetoriaRad + c.anguloAtaqueRad, taxaAtitudeLocalRadps: 0 });
  const orbitador = new OrbitadorReentrada(e, c.limiteOrbitadorC, c.rolagemRad, perfil, ambiente.referencial, () => mundo.velocidadeDoArMps);
  const bateria = new Bateria({ id: 'bateria-interna-re', massaBaseKg: MODELO_REENTRADA.massaBateriaKg, dimensoesM: new Vetor3(0.5, 0.5, 0.5),
    resistenciaColisaoJ: 1e6, limiteTermicoC: c.limiteBateriaC,
    // Fonte ideal enclausurada sem modelo térmico de atuador interno neste marco.
    coeficienteConveccaoWPorM2C: 0, tensaoNominalV: MODELO_REENTRADA.tensaoBateriaV,
    capacidadeEnergiaJ: MODELO_REENTRADA.energiaBateriaJ, energiaInicialJ: MODELO_REENTRADA.energiaBateriaJ, estadoInicial: e });
  const fixadores: FixadorEstrutural[] = [];
  const flaps = [0, 1].map(i => new FlapReentrada({ id: i === 0 ? 'flap-dianteiro' : 'flap-traseiro',
    massaBaseKg: MODELO_REENTRADA.massaFlapKg, dimensoesM: new Vetor3(4, 2, 8),
    areaEfetivaM2: MODELO_REENTRADA.areaFlapM2, coeficienteSustentacaoPorRad: MODELO_REENTRADA.clFlapPorRad,
    coeficienteArrasto: MODELO_REENTRADA.cdFlapBase, deflexaoMaximaRad: MODELO_REENTRADA.cursoFlapRad,
    velocidadeAngularMaximaRadps: MODELO_REENTRADA.taxaFlapRadps,
    potenciaNominalAtuadorW: MODELO_REENTRADA.potenciaFlapW, potenciaEmRepousoW: MODELO_REENTRADA.potenciaRepousoFlapW, fonteEletrica: bateria,
    /** Permissivo do atuador: vínculo íntegro e corpo vivo; não produz força.  @contract f-974c61344181bb4f */
    operacaoAutorizada: () => fixadores[i]?.estaAtivo === true && orbitador.integridadeEstrutural > 0,
    resistenciaColisaoJ: MODELO_REENTRADA.resistenciaFlapJ, limiteTermicoC: c.limiteFlapsC,
    estadoInicial: estadoModulo(e, i === 0 ? 16 : -16, -5) },
  () => orbitador.observarRolagem().atualRad, () => fixadores[i]?.estaAtivo === true));
  const objetos: readonly Objeto[] = [orbitador, ...flaps, bateria];
  for (const o of objetos) mundo.registrarObjeto(o);
  for (const modulo of [...flaps, bateria]) {
    const f = new FixadorEstrutural({ id: `fixador-${modulo.id}`, objetoA: orbitador, objetoB: modulo,
      resistenciaTracaoN: MODELO_REENTRADA.resistenciaFixadorN, limiteTermicoC: c.limiteFlapsC,
      condutanciaTermicaWPorC: modulo === bateria ? 0 : 100,
      /** Sem solicitação operacional extra; impactos são registrados pelo core.
       * Esforço aerodinâmico distribuído de vínculos não é qualificado neste ensaio.
       * @contract f-f310bba164029a51
   */
      obterEsforcoSolicitadoN: () => 0 });
    fixadores.push(f); mundo.registrarFixador(f);
  }
  const solo = new SuperficieEsferica('terra-re-001', ambiente.campo.centroM);
  mundo.registrarSuperficie(solo);
  const sensores = new SensoresVeiculoComposto(orbitador, 0,
    () => orbitador.massaKg + fixadores.filter(f => f.estaAtivo).reduce((s, f) => s + f.objetoB.massaKg, 0));
  mundo.registrarSensoresVeiculo(sensores);
  return { configuracao, ambiente, perfil, mundo, orbitador, flaps, bateria, fixadores, objetos, sensores, solo };
}

type CenarioReentrada = ReturnType<typeof criarCenarioReentrada>;

/** Calcula massa/CM/inércia instantâneos somente dos módulos ainda conectados.
 * Diagnóstico, não segunda cópia de posições nem um integrador.
 * @contract f-79e1834474e775f0
   */
function geometriaConjunto(c: CenarioReentrada) {
  const membros = c.objetos.filter(o => o === c.orbitador || c.fixadores.some(f => f.objetoB === o && f.estaAtivo));
  const massaKg = membros.reduce((s, o) => s + o.massaKg, 0);
  const centroM = membros.reduce((s, o) => s.adicionar(o.getEstadoFisico().posicaoM.multiplicar(o.massaKg / massaKg)), Vetor3.zero);
  const inerciaKgM2 = membros.reduce((s, o) => s + o.getMomentoInerciaKgM2().z
    + o.massaKg * o.getEstadoFisico().posicaoM.subtrair(centroM).magnitude ** 2, 0);
  return { membros, massaKg, centroM, inerciaKgM2 };
}

/** Instância de missão ADM sem DOM: portas compatíveis com registro e executor existentes. */
export class EnsaioReentrada implements InstanciaMissao<ComandoReentrada, ObservacaoReentrada> {
  public readonly id = 'RE-001';
  public readonly passoS: number;
  public readonly configuracao: ConfiguracaoReentrada;
  private passos = 0;
  private execucao: EstadoExecucaoMissao = 'preparada';
  private readonly cenario: CenarioReentrada;
  private readonly gerenciador = new GerenciadorDeControladores();
  private readonly controlador: ControladorReentrada;
  private readonly supervisor: SupervisorReentrada;
  private readonly eventos: EventoMissao[] = [];
  private readonly condicoesRegistradas = new Map<string, boolean>();
  private energiaDissipadaJ = 0;

  /** Monta controles por portas de leitura, registra adaptador de pouso desabilitado
   * sem motores, e registra hipóteses/revisão. Não inicia execução ou ignição.
   * @contract f-34fba91cf8789bd5
   */
  public constructor(entrada: Partial<ConfiguracaoReentrada> = {}) {
    this.cenario = criarCenarioReentrada(entrada); this.configuracao = this.cenario.configuracao;
    this.passoS = this.configuracao.passoS;
    this.controlador = new ControladorReentrada(() => this.lerControle(), this.configuracao.anguloAtaqueRad,
      this.configuracao.rolagemRad, this.configuracao.corredor);
    this.gerenciador.registrar(this.controlador);
    const pouso = new ControladorPousoDePropulsores();
    pouso.configurar({}, []); this.gerenciador.registrar(pouso);
    if (this.configuracao.automatico) this.gerenciador.habilitar('reentrada');
    this.supervisor = new SupervisorReentrada(this.gerenciador, this.configuracao.transferencia);
    this.supervisor.definirAutomatico(this.configuracao.chaveamentoAutomatico);
    this.atualizarSupervisor();
    this.evento('modelo', `${MODELO_REENTRADA.revisao}; ${this.cenario.perfil.revisao}; XY, Terra estática; `
      + (this.configuracao.vacuo ? 'vácuo explícito' : 'atmosfera de engenharia') + '; RCS/propulsão ausentes; indicadores preliminares.');
    this.evento('limites-termicos', `Limiares provisórios: orbitador ${this.configuracao.limiteOrbitadorC} °C; flaps ${this.configuracao.limiteFlapsC} °C; bateria isolada ${this.configuracao.limiteBateriaC} °C. Sem qualificação material/limite interno; bateria sem previsão de fuga térmica ou falha catastrófica.`);
  }
  /** Índice exato usado pela agenda reproduzível.  @contract f-675d2c66285d618a */
  public get passosExecutados(): number { return this.passos; }
  /** Consulta execução real; pausa não altera estado físico.  @contract f-a7a4e68b04548ca1 */
  public get estadoExecucao(): EstadoExecucaoMissao { return this.execucao; }
  /** Autoriza passos simulados, sem alterar trajetória.  @contract f-cd5bce11227c4b08 */
  public iniciar(): void { this.execucao = 'executando'; }
  /** Suspende executor mantendo corpos e fila operacional.  @contract f-862b111fdbd503d8 */
  public pausar(): void { this.execucao = 'pausada'; }
  /** Eventos são copiados/congelados para consumidores.  @contract f-6a94dcd54d1a0d5d */
  public obterEventos(): readonly EventoMissao[] { return copiarSnapshot(this.eventos); }

  /** Aplica comandos públicos e registra aceitação/bloqueio. Comando manual exige
   * seleção manual; pouso sempre verifica supervisor, não habilita motor implícito.
   * @contract f-ea3e069c929c0c05
   */
  public receberComando(comando: ComandoReentrada): ResultadoComandoMissao {
    if (!validarComandoReentrada(comando)) return { aceito: false, motivo: 'Comando RE inválido.' };
    const c = this.cenario;
    let aceito = true, motivo = 'Comando aplicado.';
    if (this.supervisor.observar().fase !== 'reentrada' && ['modo', 'alvos', 'flaps', 'rolagem'].includes(comando.tipo)) {
      aceito = false; motivo = 'Supervisor não autoriza posse de reentrada.';
    } else if (comando.tipo === 'modo') {
      if (comando.automatico) this.gerenciador.habilitar('reentrada'); else {
        this.gerenciador.desabilitar('reentrada'); c.flaps.forEach(f => f.solicitarDeflexaoRad(0));
      }
    } else if (comando.tipo === 'alvos') this.controlador.configurarAlvos(comando.alphaRad, comando.phiRad);
    else if (comando.tipo === 'flaps' || comando.tipo === 'rolagem') {
      if (this.controlador.estaHabilitado) { aceito = false; motivo = 'Selecione controle manual antes de comandar atuadores.'; }
      else if (comando.tipo === 'flaps') {
        c.flaps[0].solicitarDeflexaoRad(comando.dianteiroRad); c.flaps[1].solicitarDeflexaoRad(comando.traseiroRad);
      } else c.orbitador.solicitarRolagem(comando.phiRad, c.mundo.tempoS);
    } else if (comando.tipo === 'chaveamento') this.supervisor.definirAutomatico(comando.automatico);
    else if (comando.tipo === 'pouso') {
      this.supervisor.solicitarPouso(); this.atualizarSupervisor();
      aceito = this.supervisor.observar().fase === 'pouso';
      motivo = aceito ? 'Posse transferida ao pouso.' : this.supervisor.observar().requisitos.filter(r => !r.atendido).map(r => r.descricao).join('; ');
    } else if (comando.tipo === 'alimentacao') c.flaps.forEach(f => {
      if (comando.ligada) f.conexaoEletrica.fecharInterruptor(); else f.conexaoEletrica.abrirInterruptor();
    });
    else if (comando.tipo === 'falha-rolagem') c.orbitador.definirDisponibilidadeRolagem(false);
    else if (comando.tipo === 'separar-flap') c.fixadores[comando.indice].liberar();
    this.evento(aceito ? 'comando' : 'comando-bloqueado', `${comando.tipo}: ${motivo}`, 'comando');
    return { aceito, motivo };
  }

  /** Consome solicitações arbitradas e avança um único passo no mundo compartilhado.
   * Não encerra por tempo/evento intermediário. Falhas são observadas, sem correção UI.
   * @contract f-6c85c671f0b775b6
   */
  public avancarPasso(): boolean {
    if (this.execucao !== 'executando') return false;
    const c = this.cenario;
    this.atualizarSupervisor();
    for (const s of this.gerenciador.calcularSolicitacoes(c.sensores.obterLeituras(), this.passoS)) {
      if (s.recurso === 'flap') c.flaps.find(f => f.id === s.idAtuador)?.solicitarDeflexaoRad(s.valor);
      if (s.recurso === 'rolagem-virtual') c.orbitador.solicitarRolagem(s.valor, c.mundo.tempoS);
    }
    const potenciaDissipadaW = c.objetos.reduce((s, o) => s + Math.max(0, -c.mundo.obterForcaArrastoAtmosferico(o)
      .produtoEscalar(o.getEstadoFisico().velocidadeMps.subtrair(c.mundo.velocidadeDoArMps))), 0);
    c.mundo.avancar(this.passoS); this.passos++;
    this.energiaDissipadaJ += potenciaDissipadaW * this.passoS;
    this.atualizarSupervisor();
    if (this.passos % 24 === 0) this.registrarCondicoes();
    return true;
  }

  /** Observação escalar/geométrica, copiada e congelada, sem oferecer objetos mutáveis.  @contract f-05755a69bc286c7f */
  public observar() {
    const c = this.cenario, e = c.orbitador.getEstadoFisico();
    const condicoes = c.mundo.obterCondicoesAtmosfericas(c.orbitador), a = c.orbitador.avaliar(condicoes);
    const g = geometriaConjunto(c), cargas = c.mundo.obterCargasAerodinamicas(g.membros, g.centroM);
    const aceleracaoAero = cargas.forcaN.multiplicar(1 / g.massaKg);
    const gravidade = c.mundo.obterGravidadeMps2(e.posicaoM);
    const velLocal = c.ambiente.referencial.vetorParaLocal(e.velocidadeMps, e.posicaoM);
    const dissipacaoW = g.membros.reduce((s, o) => s + Math.max(0, -c.mundo.obterForcaArrastoAtmosferico(o)
      .produtoEscalar(o.getEstadoFisico().velocidadeMps.subtrair(c.mundo.velocidadeDoArMps))), 0);
    const calorW = g.membros.reduce((s, o) => {
      const dissipacao = Math.max(0, -c.mundo.obterForcaArrastoAtmosferico(o).produtoEscalar(o.getEstadoFisico().velocidadeMps.subtrair(c.mundo.velocidadeDoArMps)));
      return s + o.obterPotenciaAquecimentoAerodinamicoW(c.mundo.obterCondicoesAtmosfericas(o), dissipacao);
    }, 0);
    return copiarSnapshot({ id: this.id, tempoS: c.mundo.tempoS, passo: this.passos,
      execucao: this.execucao, estado: e, altitudeM: c.ambiente.referencial.altitudeGeometricaM(e.posicaoM),
      arcoM: c.ambiente.referencial.posicaoHorizontalM(e.posicaoM), velocidadeMps: e.velocidadeMps.magnitude,
      trajetoriaRad: Math.atan2(velLocal.y, velLocal.x), velocidadeRadialMps: velLocal.y,
      aerodinamica: a, rolagem: c.orbitador.observarRolagem(), controle: this.controlador.observar(),
      historicoRolagem: c.orbitador.obterHistoricoRolagem(),
      supervisor: this.supervisor.observar(), arbitragem: this.gerenciador.obterUltimaArbitragem(),
      massaKg: g.massaKg, inerciaKgM2: g.inerciaKgM2, centroM: g.centroM, forcaAerodinamicaN: cargas.forcaN,
      torqueAerodinamicoNm: cargas.torqueNm.z, aceleracaoMps2: gravidade.adicionar(aceleracaoAero),
      cargaG: aceleracaoAero.magnitude / 9.80665,
      desaceleracaoMps2: a.velocidadeRelativaMps > 0 ? -aceleracaoAero.produtoEscalar(e.velocidadeMps) / Math.max(1e-6, e.velocidadeMps.magnitude) : 0,
      temperaturaC: c.orbitador.temperaturaC, integridade: c.orbitador.integridadeEstrutural,
      limiteOrbitadorC: this.configuracao.limiteOrbitadorC, limiteFlapsC: this.configuracao.limiteFlapsC,
      energiaAbsorvidaJ: c.objetos.reduce((s, o) => s + o.energiaTermicaAerodinamicaAcumuladaJ, 0),
      energiaDissipadaJ: this.energiaDissipadaJ,
      energiaAtmosferaJ: Math.max(0, this.energiaDissipadaJ - c.objetos.reduce((s, o) => s + o.energiaTermicaAerodinamicaAcumuladaJ, 0)),
      dissipacaoW, calorTransferidoW: calorW, potenciaAtmosferaW: Math.max(0, dissipacaoW - calorW),
      energiaBateriaJ: c.bateria.energiaArmazenadaJ,
      temperaturaBateriaC: c.bateria.temperaturaC, integridadeBateria: c.bateria.integridadeEstrutural,
      limiteBateriaC: this.configuracao.limiteBateriaC,
      flaps: c.flaps.map((f, i) => ({ id: f.id, estado: f.getEstadoFisico(), comandoRad: f.comandoAtualRad,
        deflexaoRad: f.deflexaoAtualRad, integridade: f.integridadeEstrutural, temperaturaC: f.temperaturaC,
        energiaAbsorvidaJ: f.energiaTermicaAerodinamicaAcumuladaJ, conectado: c.fixadores[i].estaAtivo,
        energizado: f.conexaoEletrica.estaEnergizada })),
      vinculos: c.fixadores.map(f => ({ id: f.id, estado: f.estado })),
      raioTerraM: c.ambiente.referencial.raioM, centroTerraM: c.ambiente.campo.centroM,
      propulsaoDisponivel: false, rcsDisponivel: false });
  }

  /** Telemetria física para PD; calcula derivada angular do fluxo por v×a/|v|²,
   * sem diferenciar relógio real ou alterar estado. Torque passivo exclui lift ativo.
   * @contract f-2db95d019a3477f5
   */
  private lerControle() {
    const c = this.cenario, e = c.orbitador.getEstadoFisico(), g = geometriaConjunto(c);
    const a = c.orbitador.avaliar(c.mundo.obterCondicoesAtmosfericas(c.orbitador));
    const cargas = c.mundo.obterCargasAerodinamicas(g.membros, g.centroM);
    const aceleracao = c.mundo.obterGravidadeMps2(e.posicaoM).adicionar(cargas.forcaN.multiplicar(1 / g.massaKg));
    const v = e.velocidadeMps.subtrair(c.mundo.velocidadeDoArMps);
    const torqueFlaps = c.flaps.reduce((s, f, i) => s + (c.fixadores[i].estaAtivo
      ? f.obterForcasAerodinamicas(c.mundo.obterCondicoesAtmosfericas(f)).reduce((p, forca) => p
        + (forca.pontoM ?? f.getEstadoFisico().posicaoM).subtrair(g.centroM).produtoVetorial(forca.forcaN).z, 0) : 0), 0);
    return { alphaRad: a.anguloAtaqueRad, taxaArfagemRadps: e.velocidadeAngularRadps.z,
      taxaFluxoRadps: v.magnitude > 1 ? v.produtoVetorial(aceleracao).z / v.magnitude ** 2 : 0,
      pressaoDinamicaPa: a.pressaoDinamicaPa, fluxoTermicoWm2: a.fluxoTermicoIndicadorWm2,
      cargaG: cargas.forcaN.magnitude / g.massaKg / 9.80665, torquePassivoNm: cargas.torqueNm.z - torqueFlaps,
      inerciaKgM2: g.inerciaKgM2, phiRad: c.orbitador.observarRolagem().atualRad,
      disponivel: c.orbitador.integridadeEstrutural > 0 && c.flaps.every((f, i) => f.integridadeEstrutural > 0
        && f.conexaoEletrica.estaEnergizada && c.fixadores[i].estaAtivo) };
  }

  /** Mapeia eixo longitudinal +X para atitude da vertical esperada pelo pouso
   * BSS (+Y); integração propulsiva ausente bloqueia transferência explicitamente.
   * @contract f-b5dfd4d0081ccbd9
   */
  private atualizarSupervisor(): void {
    const c = this.cenario, l = c.sensores.obterLeituras(), fase = this.supervisor.observar().fase;
    this.supervisor.atualizar({ altitudeM: l.altitudeM, velocidadeMps: Math.hypot(l.velocidadeHorizontalMps, l.velocidadeVerticalMps),
      atitudeVerticalRad: normalizarAngulo(l.inclinacaoRad - Math.PI / 2),
      trajetoriaRad: Math.atan2(l.velocidadeVerticalMps, l.velocidadeHorizontalMps), sensoresValidos: l.sensoresValidos !== false,
      integridade: c.orbitador.integridadeEstrutural, propulsaoDisponivel: false, integracaoCompativel: false });
    if (this.supervisor.observar().fase !== fase) this.evento('chaveamento', `${fase} → ${this.supervisor.observar().fase}`);
  }

  /** Registra arestas de falha/recuperação de condições, não repete eventos por frame.
   * Colisão, dano e separação não encerram evolução física.
   * @contract f-5dacbb18677d6f4c
   */
  private registrarCondicoes(): void {
    const c = this.cenario, a = c.orbitador.avaliar(c.mundo.obterCondicoesAtmosfericas(c.orbitador));
    const condicoes: Record<string, boolean> = {
      'limite-termico-orbitador': c.orbitador.temperaturaC > c.orbitador.limiteTermicoC,
      'degradacao-orbitador': c.orbitador.integridadeEstrutural < 1,
      'colapso-orbitador': c.orbitador.integridadeEstrutural === 0,
      'limite-termico-flaps': c.flaps.some(f => f.temperaturaC > f.limiteTermicoC),
      'limite-termico-bateria': c.bateria.temperaturaC > c.bateria.limiteTermicoC,
      'colapso-bateria': c.bateria.integridadeEstrutural === 0,
      'falha-controle-reentrada': this.controlador.observar().estado === 'falha',
      'perda-alimentacao': c.flaps.some(f => f.conexaoEletrica.estaIndisponivel),
      'perda-vinculo': c.fixadores.some(f => !f.estaAtivo),
      'contato-superficie': c.mundo.obterContatosComSuperficie().length > 0,
      'corredor-pressao': a.pressaoDinamicaPa > this.configuracao.corredor.pressaoMaximaPa,
      'corredor-aquecimento': a.fluxoTermicoIndicadorWm2 > this.configuracao.corredor.fluxoMaximoWm2,
      'corredor-carga': this.lerControle().cargaG > this.configuracao.corredor.cargaMaximaG,
      'atmosfera-fora-dominio': !c.perfil.amostrar(c.ambiente.referencial.altitudeGeometricaM(c.orbitador.getEstadoFisico().posicaoM)).dentroDominio,
      'rolagem-indisponivel': !c.orbitador.observarRolagem().disponivel,
    };
    for (const [i, flap] of c.flaps.entries()) {
      condicoes[`degradacao-flap-${i + 1}`] = flap.integridadeEstrutural < 1;
      condicoes[`colapso-flap-${i + 1}`] = flap.integridadeEstrutural === 0;
    }
    for (const [tipo, ativo] of Object.entries(condicoes)) {
      if (ativo !== (this.condicoesRegistradas.get(tipo) ?? false)) this.evento(tipo, ativo ? 'Condição detectada.' : 'Condição cessou.', 'fisico');
      this.condicoesRegistradas.set(tipo, ativo);
    }
  }

  /** Acrescenta evento no tempo de missão, com sequência estável e categoria.  @contract f-593973bfbdc79c20 */
  private evento(tipo: string, descricao: string, categoria: EventoMissao['categoria'] = 'missao'): void {
    this.eventos.push({ sequencia: this.eventos.length, passo: this.passos, tempoS: this.cenario.mundo.tempoS, categoria, tipo, descricao });
  }

  /** Exporta identificação completa/revisões para o decorador de diário compartilhado.  @contract f-4987311594a9418d */
  public obterIdentificacao(): object {
    return copiarSnapshot({ id: this.id, revisao: MODELO_REENTRADA.revisao, configuracao: this.configuracao,
      modeloFisico: this.cenario.mundo.obterConfiguracaoFisica(), modeloOrbitador: MODELO_REENTRADA,
      hipoteses: 'ADM XY, Terra e ar estáticos; coeficientes analíticos preliminares; sem RCS/propulsão; rolagem prescrita; lateral omitida; calor concentrado sem TPS separado.' });
  }
}

export type ObservacaoReentrada = ReturnType<EnsaioReentrada['observar']>;
export type DiarioReentrada = DiarioMissao<ComandoReentrada, ObservacaoReentrada>;

/** Fábrica pública de ensaio registrável, sem relógio, DOM ou escrita externa.  @contract f-fbefc47b0a643060 */
export function criarEnsaioReentrada(configuracao: Partial<ConfiguracaoReentrada> = {}) {
  const ensaio = new EnsaioReentrada(configuracao);
  return new RegistroMissao(ensaio, ensaio.obterIdentificacao(), validarComandoReentrada, 240);
}

/** Reexecuta agenda no mesmo modelo/runtime; rejeita revisão, entradas e resultados
 * divergentes. Pausa/exportação não reproduzem relógio real. O custo é
 * proporcional ao número de passos físicos do diário; chamada síncrona headless.
 * @contract f-af7e1ca547762556
   */
export function reproduzirEnsaioReentrada(diario: DiarioReentrada) {
  if (!diario || diario.formato !== 'blackstar-missao-1' || !Number.isSafeInteger(diario.passosExecutados)
    || diario.passosExecutados < 0) throw new Error('Diário RE inválido.');
  const identificacao = diario.identificacao as { revisao?: string; configuracao?: ConfiguracaoReentrada };
  if (identificacao.revisao !== MODELO_REENTRADA.revisao || !identificacao.configuracao) throw new Error('Revisão RE incompatível.');
  const ensaio = criarEnsaioReentrada(identificacao.configuracao);
  if (JSON.stringify(ensaio.exportar().identificacao) !== JSON.stringify(diario.identificacao)
    || diario.passoS !== ensaio.passoS || diario.intervaloAmostraPassos !== 240
    || JSON.stringify(ensaio.observar()) !== JSON.stringify(diario.inicial)) throw new Error('Modelo/estado inicial RE divergente.');
  let indice = 0;
  while (ensaio.passosExecutados <= diario.passosExecutados) {
    while (indice < diario.entradas.length && diario.entradas[indice].passo === ensaio.passosExecutados) {
      const e = diario.entradas[indice];
      if (e.sequencia !== indice) throw new Error('Sequência de diário inválida.');
      if (e.tipo === 'iniciar') ensaio.iniciar(); else if (e.tipo === 'pausar') ensaio.pausar();
      else if (e.tipo === 'comando') {
        if (JSON.stringify(ensaio.receberComando(e.comando)) !== JSON.stringify(e.resultado)) throw new Error('Resultado de comando divergente.');
      } else throw new Error('Entrada desconhecida.');
      indice++;
    }
    if (ensaio.passosExecutados === diario.passosExecutados) break;
    if (!ensaio.avancarPasso()) throw new Error('Agenda não autoriza avanço.');
  }
  if (indice !== diario.entradas.length || JSON.stringify(ensaio.exportar()) !== JSON.stringify(diario)) throw new Error('Replay RE divergente.');
  return ensaio;
}
