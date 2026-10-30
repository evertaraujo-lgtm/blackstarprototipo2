import { validarConfiguracaoTermicaReentrada, type ConfiguracaoTermicaReentrada } from '../physics/reentrada/ConfiguracaoTermicaReentrada';
import { RegistroExtremos } from '../missoes/RegistroExtremos';
import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { normalizarAngulo } from '../physics/ambiente/ReferencialFisico';
import { criarEstadoInicialLocal } from '../physics/ambiente/EstadoInicialLocal';
import { PerfilAtmosfericoReentrada } from '../physics/ambiente/PerfilAtmosfericoReentrada';
import { MundoFisico } from '../physics/MundoFisico';
import { Vetor3 } from '../physics/Vetor3';
import type { EstadoFisico, Objeto } from '../physics/objetos/base/Objeto';
import { OrbitadorReentrada } from '../physics/objetos/veiculos/OrbitadorReentrada';
import { FlapReentrada } from '../physics/objetos/componentes/FlapReentrada';
import { Bateria } from '../physics/objetos/fontes-de-energia/Bateria';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { Propulsor } from '../physics/objetos/propulsao/Propulsor';
import { BombaPropelente } from '../physics/objetos/propulsao/alimentacao/BombaPropelente';
import { LinhaDePropelente } from '../physics/objetos/propulsao/alimentacao/LinhaDePropelente';
import { ValvulaPropelente } from '../physics/objetos/propulsao/alimentacao/ValvulaPropelente';
import { CamaraCombustao } from '../physics/objetos/propulsao/combustao/CamaraCombustao';
import { Bocal, GRAVIDADE_PADRAO_MPS2 } from '../physics/objetos/propulsao/combustao/Bocal';
import { FixadorEstrutural } from '../physics/conexoes/FixadorEstrutural';
import { SuperficieEsferica } from '../physics/SuperficieEsferica';
import { SensoresVeiculoComposto } from '../physics/sensores/SensoresVeiculoComposto';
import { GerenciadorDeControladores } from '../physics/sistemas de controle/GerenciadorDeControladores';
import { ControladorPousoDePropulsores } from '../physics/sistemas de controle/ControladorPousoDePropulsores';
import { ControladorRcsManual, type ComandoRotacaoRcs } from '../physics/sistemas de controle/ControladorRcsManual';
import { ControladorReentrada, type CorredorReentrada } from '../physics/sistemas de controle/ControladorReentrada';
import { LIMITES_TRANSFERENCIA, type LimitesTransferencia } from '../physics/sistemas de controle/SupervisorReentrada';
import { SupervisorRecuperacao } from '../physics/sistemas de controle/SupervisorRecuperacao';
import { ControladorAproximacao } from '../physics/sistemas de controle/ControladorAproximacao';
import { configurarFronteiraAproximacao, type ConfiguracaoFronteiraAproximacao } from '../physics/sistemas de controle/FronteiraAproximacao';
import { MODELO_REENTRADA, configurarParametrosReentrada, calcularFluxoTermicoIndicador, type ParametrosReentrada } from '../physics/reentrada/ModeloAerodinamicoReentrada';
import type { EstadoExecucaoMissao, EventoMissao, InstanciaMissao, ResultadoComandoMissao } from '../missoes/ContratoMissao';
import { RegistroMissao, type DiarioMissao } from '../missoes/RegistroMissao';
import { copiarSnapshot } from '../missoes/SnapshotMissao';
import { diagnosticarMomentoAngular, BalancoAngular } from '../physics/estruturas/DiagnosticoAngular';

export interface ConfiguracaoReentrada {
  /** Ausente/null: legado RE-003. Presente: opt-in explícito na rede RE-004. */
  readonly termica?: ConfiguracaoTermicaReentrada | null;
  readonly altitudeM: number;
  readonly velocidadeMps: number;
  readonly anguloAtaqueRad: number;
  readonly taxaAtitudeLocalInicialRadps: number;
  readonly trajetoriaRad: number;
  readonly rolagemRad: number;
  readonly limiteOrbitadorC: number;
  readonly limiteFlapsC: number;
  readonly limiteBateriaC: number;
  readonly automatico: boolean;
  readonly chaveamentoAutomatico: boolean;
  /** Opt-in da montagem RE-002E neste cenário; preserva a massa/base RE-001. */
  readonly propulsaoExperimental: boolean;
  readonly vacuo: boolean;
  readonly semente: number;
  readonly passoS: number;
  readonly corredor: CorredorReentrada;
  /** Legado serializado; não define a nova fronteira de aproximação. */
  readonly transferencia: LimitesTransferencia;
  readonly aproximacao: ConfiguracaoFronteiraAproximacao;
  readonly parametros: ParametrosReentrada;
  readonly intervaloColetaS: number;
  readonly limiteAmostras: number;
  readonly limiteEventos: number;
}
export type EntradaConfiguracaoReentrada = Omit<Partial<ConfiguracaoReentrada>, 'parametros' | 'aproximacao'> & { readonly parametros?: Partial<ParametrosReentrada>; readonly aproximacao?: Partial<ConfiguracaoFronteiraAproximacao> };
interface EstadoCruzeMachReentrada {
  readonly tempoS: number; readonly passo: number; readonly mach: number; readonly altitudeM: number; readonly arcoM: number;
  readonly velocidadeMps: number; readonly velocidadeRadialMps: number; readonly velocidadeTangencialMps: number;
  readonly trajetoriaRad: number; readonly atitudeLocalRad: number; readonly alphaRad: number; readonly omegaRadps: number;
  readonly pressaoDinamicaPa: number; readonly fluxoTermicoWm2: number; readonly torqueAerodinamicoNm: number;
  readonly energiaMecanicaEspecificaJPorKg: number; readonly temperaturaCorpoC: number; readonly temperaturaFlapsC: readonly number[];
  readonly integridadeCorpo: number; readonly integridadeFlaps: readonly number[]; readonly alimentacaoFlaps: readonly boolean[];
  readonly vinculosFlaps: readonly boolean[]; readonly estadoControle: string; readonly autoridadeDisponivel: boolean;
}
export const CONFIGURACAO_REENTRADA: ConfiguracaoReentrada = copiarSnapshot({ altitudeM: 120_000,
  velocidadeMps: 7700, taxaAtitudeLocalInicialRadps: 0, anguloAtaqueRad: 40 * Math.PI / 180, trajetoriaRad: -Math.PI / 180,
  rolagemRad: 0, limiteOrbitadorC: 1100, limiteFlapsC: 900, limiteBateriaC: 60, automatico: true,
  chaveamentoAutomatico: false, propulsaoExperimental: false, vacuo: false, semente: 1, passoS: 1 / 240,
  corredor: { pressaoMaximaPa: 50_000, fluxoMaximoWm2: 500_000, cargaMaximaG: 5 },
  intervaloColetaS: 1, limiteAmostras: 3600, limiteEventos: 20000,
  aproximacao: configurarFronteiraAproximacao(), transferencia: LIMITES_TRANSFERENCIA, parametros: configurarParametrosReentrada() });

export type ComandoReentrada =
  | { readonly tipo: 'modo'; readonly automatico: boolean }
  | { readonly tipo: 'alvos'; readonly alphaRad: number; readonly phiRad: number }
  | { readonly tipo: 'flaps'; readonly dianteiroRad: number; readonly traseiroRad: number }
  | { readonly tipo: 'throttle-propulsor'; readonly throttle: number }
  | { readonly tipo: 'ignicao-propulsor' }
  | { readonly tipo: 'corte-propulsor' }
  | { readonly tipo: 'armar-rcs' }
  | { readonly tipo: 'rcs'; readonly comando: ComandoRotacaoRcs }
  | { readonly tipo: 'rolagem'; readonly phiRad: number }
  | { readonly tipo: 'chaveamento'; readonly automatico: boolean }
  | { readonly tipo: 'pouso' }
  | { readonly tipo: 'aproximacao' }
  | { readonly tipo: 'alimentacao'; readonly ligada: boolean }
  | { readonly tipo: 'falha-rolagem' }
  | { readonly tipo: 'separar-flap'; readonly indice: 0 | 1 };

/** Valida comando serializável por chaves exatas, finitude e limites; não executa.  @contract f-52a010df6b7f3e6e */
export function validarComandoReentrada(entrada: unknown): entrada is ComandoReentrada {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return false;
  const e = entrada as Record<string, unknown>;
  const chaves: Record<string, string[]> = { modo: ['automatico'], alvos: ['alphaRad', 'phiRad'],
    flaps: ['dianteiroRad', 'traseiroRad'], 'throttle-propulsor': ['throttle'], 'ignicao-propulsor': [], 'corte-propulsor': [],
    'armar-rcs': [], rcs: ['comando'], rolagem: ['phiRad'], chaveamento: ['automatico'], pouso: [], aproximacao: [],
    alimentacao: ['ligada'], 'falha-rolagem': [], 'separar-flap': ['indice'] };
  if (typeof e.tipo !== 'string' || !Object.hasOwn(chaves, e.tipo)) return false;
  if (Object.keys(e).length !== chaves[e.tipo].length + 1 || !chaves[e.tipo].every(k => Object.hasOwn(e, k))) return false;
  switch (e.tipo) {
    case 'modo': case 'chaveamento': return typeof e.automatico === 'boolean';
    case 'throttle-propulsor': return typeof e.throttle === 'number' && Number.isFinite(e.throttle) && e.throttle >= 0 && e.throttle <= 1;
    case 'rcs': return e.comando === -1 || e.comando === 0 || e.comando === 1;
    case 'alimentacao': return typeof e.ligada === 'boolean';
    case 'separar-flap': return e.indice === 0 || e.indice === 1;
    case 'alvos': return typeof e.alphaRad === 'number' && Number.isFinite(e.alphaRad) && e.alphaRad >= 0
      && e.alphaRad <= 80 * Math.PI / 180 && typeof e.phiRad === 'number' && Number.isFinite(e.phiRad) && Math.abs(e.phiRad) <= Math.PI / 2;
    case 'rolagem': return typeof e.phiRad === 'number' && Number.isFinite(e.phiRad) && Math.abs(e.phiRad) <= Math.PI / 2;
    case 'flaps': return [e.dianteiroRad, e.traseiroRad].every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < Math.PI / 2);
    default: return true;
  }
}

/** Cria configuração copiada, validada e congelada; os limiares térmicos padrão
 * foram definidos pelo operador. Com rede optante migram para superfície;
 * região estrutural tem limite próprio. Divergência entre representações é erro.
 * @contract f-f88e23012b3ae8c3
   */
export function configurarReentrada(entrada: EntradaConfiguracaoReentrada = {}): ConfiguracaoReentrada {
  const termica = entrada.termica == null ? entrada.termica : validarConfiguracaoTermicaReentrada(entrada.termica);
  const limites = termica ? { limiteOrbitadorC: termica.corpo.regioes.find(r => r.id === 'superficie')!.limiteTermicoC,
    limiteFlapsC: termica.flap.regioes.find(r => r.id === 'superficie')!.limiteTermicoC,
    limiteBateriaC: termica.bateria.regioes[0].limiteTermicoC } : {};
  for (const [chave, valor] of Object.entries(limites)) {
    if (entrada[chave as keyof typeof limites] !== undefined && entrada[chave as keyof typeof limites] !== valor) throw new Error(`Limite ${chave} diverge da região térmica declarada.`);
  }
  const c = copiarSnapshot({ ...CONFIGURACAO_REENTRADA, ...entrada, ...limites,
    ...(termica ? { termica } : {}), parametros: configurarParametrosReentrada(entrada.parametros), aproximacao: configurarFronteiraAproximacao(entrada.aproximacao) });
  const intervalos: readonly [keyof ConfiguracaoReentrada, number, number][] = [
    ['altitudeM', 10, 200000], ['velocidadeMps', 0, 12000],
    ['anguloAtaqueRad', 0, 80 * Math.PI / 180], ['trajetoriaRad', -Math.PI / 2, Math.PI / 2],
    ['rolagemRad', -Math.PI / 2, Math.PI / 2], ['taxaAtitudeLocalInicialRadps', -1, 1],
    ['limiteOrbitadorC', -200, 5000], ['limiteFlapsC', -200, 5000], ['limiteBateriaC', -200, 5000],
    ['passoS', Number.MIN_VALUE, 1 / 120], ['intervaloColetaS', c.passoS, 60],
    ['semente', 0, Number.MAX_SAFE_INTEGER], ['limiteAmostras', 2, 100000], ['limiteEventos', 10, 100000],
  ];
  for (const [nome, minimo, maximo] of intervalos) {
    const valor = c[nome];
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < minimo || valor > maximo) {
      throw new Error(`Configuração RE-001 inválida: ${nome} deve estar entre ${minimo} e ${maximo}.`);
    }
  }
  for (const nome of ['semente', 'limiteAmostras', 'limiteEventos'] as const) {
    if (!Number.isSafeInteger(c[nome])) throw new Error(`Configuração RE-001 inválida: ${nome} deve ser inteiro seguro.`);
  }
  for (const nome of ['automatico', 'chaveamentoAutomatico', 'propulsaoExperimental', 'vacuo'] as const) {
    if (typeof c[nome] !== 'boolean') throw new Error(`Configuração RE-001 inválida: ${nome} deve ser booleano.`);
  }
  if (Math.abs(c.intervaloColetaS / c.passoS - Math.round(c.intervaloColetaS / c.passoS)) > 1e-8) {
    throw new Error('Configuração RE-001 inválida: intervaloColetaS deve ser múltiplo inteiro de passoS.');
  }
  if (!c.corredor || !Object.values(c.corredor).every(v => Number.isFinite(v) && v > 0)) {
    throw new Error('Configuração RE-001 inválida: corredor deve conter limites positivos e finitos em Pa, W/m² e g₀.');
  }
  return c;
}

/** Exige campos próprios conhecidos, sem undefined nem omissão. Validação de
 * valores/unidades permanece nas regras do cenário; não cria objetos físicos.
 * O campo legado não editável pode ser omitido explicitamente pela interface.
 * @contract f-25970cc620e51b6d
   */
function exigirCamposConfiguracao(valor: unknown, referencia: object, prefixo: string,
  ignorados: readonly string[] = []): void {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error(`Configuração inválida: ${prefixo} deve ser objeto.`);
  for (const nome of Object.keys(referencia)) {
    if (!ignorados.includes(nome) && (!Object.hasOwn(valor, nome) || (valor as Record<string, unknown>)[nome] === undefined)) {
      throw new Error(`Configuração incompleta: ${prefixo}.${nome}. Nenhum padrão foi aplicado.`);
    }
  }
  for (const nome of Object.keys(valor)) {
    if (!Object.hasOwn(referencia, nome)) throw new Error(`Campo desconhecido: ${prefixo}.${nome}.`);
  }
}

/** Fronteira estrita para formulários: exige todos os parâmetros editáveis em SI
 * antes da validação/congelamento de domínio. Somente transferência legada,
 * ausente da interface, usa a referência declarada. Rede opcional é validada
 * integralmente; ausência preserva contrato legado. Não altera fábrica parcial,
 * física, relógio ou configuração de ensaios existentes. Testes RE-003 A–G.
 * @contract f-a01ba13dc3b415ea
   */
export function validarConfiguracaoExplicitaReentrada(entrada: unknown): ConfiguracaoReentrada {
  exigirCamposConfiguracao(entrada, { ...CONFIGURACAO_REENTRADA, termica: null }, 'configuracao', ['transferencia', 'termica', 'propulsaoExperimental']);
  const e = entrada as EntradaConfiguracaoReentrada;
  exigirCamposConfiguracao(e.parametros, CONFIGURACAO_REENTRADA.parametros, 'parametros');
  exigirCamposConfiguracao(e.corredor, CONFIGURACAO_REENTRADA.corredor, 'corredor');
  exigirCamposConfiguracao(e.aproximacao, CONFIGURACAO_REENTRADA.aproximacao, 'aproximacao');
  return configurarReentrada(e);
}

/** Constrói somente estado inicial de módulo: pose relativa rígida e velocidade
 * v+ω×r em SI. Não é usada para reposicionar objetos durante o ensaio.
 * @contract f-532e693d7fa63ff9
   */
function estadoModulo(e: EstadoFisico, x: number, y: number, anguloRelativoRad = 0): EstadoFisico {
  const a = e.orientacaoRad.z;
  const r = new Vetor3(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), 0);
  return { ...e, posicaoM: e.posicaoM.adicionar(r), orientacaoRad: new Vetor3(0, 0, a + anguloRelativoRad),
    velocidadeMps: e.velocidadeMps.adicionar(e.velocidadeAngularRadps.produtoVetorial(r)) };
}

const EMPUXO_MOTOR_REENTRADA_N = 2_400_000;
const ISP_MOTOR_REENTRADA_S = 350;
const RAZAO_MISTURA_REENTRADA = 4;
const VAZAO_METANO_REENTRADA_KGS = EMPUXO_MOTOR_REENTRADA_N
  / (ISP_MOTOR_REENTRADA_S * GRAVIDADE_PADRAO_MPS2 * (1 + RAZAO_MISTURA_REENTRADA));
const RCS_EMPUXO_POR_JATO_N = 10_000;
const RCS_ISP_S = 280;
const RCS_VAZAO_POR_JATO_KGS = RCS_EMPUXO_POR_JATO_N / (RCS_ISP_S * GRAVIDADE_PADRAO_MPS2);

/** Fábrica ADM de corpos reais e vínculos no mesmo MundoFisico. Vácuo é explícito;
 * atmosfera RE e rede térmica regional são opt-in. Redes e caminhos são
 * instalados antes do registro, sem adicionar massa mecânica. Terra estática, XY; padrão 1/240 s, máximo exploratório 1/120 s. Fonte enclausurada.
 * @contract f-8fc45f499c16a562
   */
export function criarCenarioReentrada(entrada: EntradaConfiguracaoReentrada = {}) {
  const configuracao = configurarReentrada(entrada), c = configuracao, p = c.parametros;
  const ambiente = new AmbienteTerrestre(), perfil = new PerfilAtmosfericoReentrada();
  const mundo = new MundoFisico(c.passoS, { ambiente, perfilAtmosferico: perfil,
    densidadeAtmosfericaKgM3: c.vacuo ? 0 : 1.225, avaliarCargasEstruturaisDistribuidas: true });
  const e = criarEstadoInicialLocal(ambiente.referencial, { arcoM: 0, altitudeM: c.altitudeM,
    velocidadeTangencialMps: c.velocidadeMps * Math.cos(c.trajetoriaRad),
    velocidadeRadialMps: c.velocidadeMps * Math.sin(c.trajetoriaRad),
    // Eixo longitudinal +X: θ=γ+α na tangente, distinto da vertical +Y dos BSS.
    atitudeLocalRad: c.trajetoriaRad + c.anguloAtaqueRad, taxaAtitudeLocalRadps: c.taxaAtitudeLocalInicialRadps });
  const orbitador = new OrbitadorReentrada(e, c.limiteOrbitadorC, c.rolagemRad, perfil, ambiente.referencial, () => mundo.velocidadeDoArMps, p);
  const bateria = new Bateria({ id: 'bateria-interna-re', massaBaseKg: p.massaBateriaKg, dimensoesM: new Vetor3(0.5, 0.5, 0.5),
    resistenciaColisaoJ: 1e6, limiteTermicoC: c.limiteBateriaC,
    // Legado isolado; optante recebe rede própria e condução pelo fixador interno.
    coeficienteConveccaoWPorM2C: 0, tensaoNominalV: p.tensaoBateriaV,
    capacidadeEnergiaJ: p.energiaBateriaJ, energiaInicialJ: p.energiaBateriaJ * p.fracaoCargaInicialBateria, estadoInicial: e });
  // Motor principal RE-002E integrado à reentrada: usa o mesmo modelo químico
  // de referência e inicia desligado. Os quatro jatos RCS formam dois pares
  // físicos de torque; cada disparo consome propelente e aplica forças no core.
  const fatorEscalaPropulsor = EMPUXO_MOTOR_REENTRADA_N / 40_000;
  const fatorEscalaTanque = 30;
  const ladoTanqueM = Math.cbrt(fatorEscalaTanque);
  const massaBaseTanqueKg = 180 * fatorEscalaTanque ** (2 / 3);
  const fatorVazaoEletrica = VAZAO_METANO_REENTRADA_KGS / (0.8 * fatorEscalaPropulsor);
  const comprimentoLinhasM = 40;
  const tanqueMetano = new TanquePropelente({ id: 'tanque-metano-re-001', massaBaseKg: massaBaseTanqueKg,
    dimensoesM: new Vetor3(2 * ladoTanqueM, 1.5 * ladoTanqueM, 1.8 * ladoTanqueM), resistenciaColisaoJ: 20_000_000,
    limiteTermicoC: 500, tipoPropelente: 'metano', capacidadePropelenteKg: 120 * fatorEscalaTanque,
    massaPropelenteInicialKg: 120 * fatorEscalaTanque, estadoInicial: estadoModulo(e, -10, 0) });
  const tanqueOxidante = new TanquePropelente({ id: 'tanque-oxidante-re-001', massaBaseKg: massaBaseTanqueKg,
    dimensoesM: new Vetor3(2 * ladoTanqueM, 1.5 * ladoTanqueM, 1.8 * ladoTanqueM), resistenciaColisaoJ: 20_000_000,
    limiteTermicoC: 500, tipoPropelente: 'oxigenio', capacidadePropelenteKg: 480 * fatorEscalaTanque,
    massaPropelenteInicialKg: 480 * fatorEscalaTanque, estadoInicial: estadoModulo(e, -3, 0) });
  const motor = new Propulsor({ id: 'motor-principal-re-001', massaBaseKg: 90 * fatorEscalaPropulsor,
    dimensoesM: new Vetor3(1.6, 1.4, 1.4).multiplicar(ladoTanqueM), resistenciaColisaoJ: 10_000_000,
    limiteTermicoC: 1_000, tensaoAlimentacaoNominalV: p.tensaoBateriaV,
    potenciaEletricaMaximaW: 1_200 * fatorEscalaPropulsor * fatorVazaoEletrica,
    potenciaTermicaMaximaW: 2_000_000 * fatorEscalaPropulsor, empuxoMaximoN: EMPUXO_MOTOR_REENTRADA_N,
    vazaoMaximaKgS: VAZAO_METANO_REENTRADA_KGS, propelenteCompativel: 'metano', estadoInicial: estadoModulo(e, -18, 0) });
  motor.conectarTanque(tanqueMetano, comprimentoLinhasM);
  motor.conectarBateria(bateria, comprimentoLinhasM);
  const valvulaMetano = new ValvulaPropelente({ id: 'valvula-metano-re-001', vazaoMaximaKgS: VAZAO_METANO_REENTRADA_KGS });
  const valvulaOxidante = new ValvulaPropelente({ id: 'valvula-oxidante-re-001', vazaoMaximaKgS: VAZAO_METANO_REENTRADA_KGS * RAZAO_MISTURA_REENTRADA });
  valvulaMetano.definirAbertura(1); valvulaOxidante.definirAbertura(1);
  motor.configurarCadeiaBipropelente({
    linhaCombustivel: new LinhaDePropelente({ id: 'linha-metano-re-001', tanque: tanqueMetano, tipoPropelente: 'metano',
      comprimentoMaximoM: comprimentoLinhasM, vazaoMaximaKgS: VAZAO_METANO_REENTRADA_KGS, valvula: valvulaMetano }),
    linhaOxidante: new LinhaDePropelente({ id: 'linha-oxidante-re-001', tanque: tanqueOxidante, tipoPropelente: 'oxigenio',
      comprimentoMaximoM: comprimentoLinhasM, vazaoMaximaKgS: VAZAO_METANO_REENTRADA_KGS * RAZAO_MISTURA_REENTRADA, valvula: valvulaOxidante }),
    bombaCombustivel: new BombaPropelente({ id: 'bomba-metano-re-001', tensaoNominalV: p.tensaoBateriaV,
      vazaoMaximaKgS: VAZAO_METANO_REENTRADA_KGS, potenciaEletricaMaximaW: 400 * fatorEscalaPropulsor * fatorVazaoEletrica }),
    bombaOxidante: new BombaPropelente({ id: 'bomba-oxidante-re-001', tensaoNominalV: p.tensaoBateriaV,
      vazaoMaximaKgS: VAZAO_METANO_REENTRADA_KGS * RAZAO_MISTURA_REENTRADA,
      potenciaEletricaMaximaW: 600 * fatorEscalaPropulsor * fatorVazaoEletrica }),
    camara: new CamaraCombustao({ razaoMisturaOxidanteCombustivel: RAZAO_MISTURA_REENTRADA, toleranciaRazaoMistura: 0.1 }),
    bocal: new Bocal({ empuxoMaximoN: EMPUXO_MOTOR_REENTRADA_N, eficienciaNominal: 1, impulsoEspecificoNominalS: ISP_MOTOR_REENTRADA_S }),
  });
  const tanqueRcs = new TanquePropelente({ id: 'tanque-nitrogenio-rcs-re-001', massaBaseKg: 200,
    dimensoesM: new Vetor3(2, 2, 2), resistenciaColisaoJ: 1_000_000, limiteTermicoC: 300,
    tipoPropelente: 'nitrogenio', capacidadePropelenteKg: 500, massaPropelenteInicialKg: 500,
    estadoInicial: estadoModulo(e, 2, 0) });
  const configuracoesJatos: readonly { id: string; x: number; y: number; anguloRad: number; par: 'nariz-cima' | 'nariz-baixo' }[] = [
    { id: 'rcs-nariz-cima-superior-re-001', x: -16, y: 4, anguloRad: Math.PI, par: 'nariz-cima' },
    { id: 'rcs-nariz-cima-inferior-re-001', x: -16, y: -4, anguloRad: 0, par: 'nariz-cima' },
    { id: 'rcs-nariz-baixo-superior-re-001', x: 16, y: 4, anguloRad: 0, par: 'nariz-baixo' },
    { id: 'rcs-nariz-baixo-inferior-re-001', x: 16, y: -4, anguloRad: Math.PI, par: 'nariz-baixo' },
  ];
  const jatosRcs = configuracoesJatos.map(j => {
    const propulsor = new Propulsor({ id: j.id, massaBaseKg: 40, dimensoesM: new Vetor3(0.6, 0.6, 0.6),
      resistenciaColisaoJ: 100_000, limiteTermicoC: 700, tensaoAlimentacaoNominalV: p.tensaoBateriaV,
      potenciaEletricaMaximaW: 100, empuxoMaximoN: RCS_EMPUXO_POR_JATO_N, vazaoMaximaKgS: RCS_VAZAO_POR_JATO_KGS,
      propelenteCompativel: 'nitrogenio', estadoInicial: estadoModulo(e, j.x, j.y, j.anguloRad) });
    propulsor.conectarTanque(tanqueRcs, comprimentoLinhasM);
    propulsor.conectarBateria(bateria, comprimentoLinhasM);
    return { propulsor, par: j.par };
  });
  const propulsoresRcsCima = jatosRcs.filter(j => j.par === 'nariz-cima').map(j => j.propulsor) as [Propulsor, Propulsor];
  const propulsoresRcsBaixo = jatosRcs.filter(j => j.par === 'nariz-baixo').map(j => j.propulsor) as [Propulsor, Propulsor];
  const fixadores: FixadorEstrutural[] = [];
  const flaps = [0, 1].map((i): FlapReentrada => { const flap: FlapReentrada = new FlapReentrada({ id: i === 0 ? 'flap-dianteiro' : 'flap-traseiro',
    massaBaseKg: p.massaFlapKg, dimensoesM: new Vetor3(4, 2, 8),
    areaEfetivaM2: p.areaFlapM2, coeficienteSustentacaoPorRad: p.clFlapPorRad,
    coeficienteArrasto: p.cdFlapBase, deflexaoMaximaRad: p.cursoFlapRad,
    velocidadeAngularMaximaRadps: p.taxaFlapRadps,
    /** Eficiência do mecanismo interno, sem alterar controlador ou corrente.  @contract f-a8c04a2cf1437583 */
    /** Lê integridade interna observada pela rede térmica, sem estimativa visual. @contract f-d7ef45a317bd8f64 @reviewed RE-004: falha térmica reduz autoridade do atuador. */
    lerEficienciaAtuacao: () => flap.obterRedeTermicaPeloCore()?.obterRegiao('interna').integridade ?? 1,
    potenciaNominalAtuadorW: p.potenciaFlapW, potenciaEmRepousoW: p.potenciaRepousoFlapW, fonteEletrica: bateria,
    /** Permissivo do atuador: vínculo íntegro e corpo vivo; não produz força.  @contract f-974c61344181bb4f */
    /** Permite atuação somente com vínculo íntegro e corpo operacional. @contract f-ba61c20d9dc11b36 @reviewed RE-004: falha do vínculo bloqueia o atuador. */
    operacaoAutorizada: () => fixadores[i]?.estaAtivo === true && orbitador.integridadeEstrutural > 0,
    resistenciaColisaoJ: p.resistenciaFlapJ, limiteTermicoC: c.limiteFlapsC,
    estadoInicial: estadoModulo(e, i === 0 ? p.bracoFlapM : -p.bracoFlapM, p.deslocamentoVerticalFlapM) },
  () => orbitador.observarRolagem().atualRad, () => fixadores[i]?.estaAtivo === true, p);
    if (c.termica) flap.configurarRedeTermicaPeloCore(c.termica.flap);
    return flap;
  });
  if (c.termica) {
    orbitador.configurarRedeTermicaPeloCore(c.termica.corpo);
    bateria.configurarRedeTermicaPeloCore(c.termica.bateria);
  }
  const modulosPropulsao: readonly Objeto[] = [tanqueMetano, tanqueOxidante, motor, tanqueRcs, ...jatosRcs.map(j => j.propulsor)];
  const objetos: readonly Objeto[] = [orbitador, ...flaps, bateria, ...(c.propulsaoExperimental ? modulosPropulsao : [])];
  for (const o of objetos) mundo.registrarObjeto(o);
  for (const modulo of [...flaps, bateria, ...(c.propulsaoExperimental ? modulosPropulsao : [])]) {
    const conexaoTermicaModelada = c.termica !== undefined && c.termica !== null
      && (modulo === bateria || flaps.includes(modulo as FlapReentrada));
    const f = new FixadorEstrutural({ id: `fixador-${modulo.id}`, objetoA: orbitador, objetoB: modulo,
      resistenciaTracaoN: p.resistenciaFixadorN, limiteTermicoC: c.limiteFlapsC,
      condutanciaTermicaWPorC: modulo === bateria ? c.termica?.condutanciaBateriaWPorC ?? 0 : p.condutanciaFlapWPorC,
      ...(conexaoTermicaModelada ? { portasTermicas: { regiaoA: modulo === bateria ? 'interna' : 'estrutura', regiaoB: 'estrutura' },
        limiteTermicoC: orbitador.limiteTermicoC } : {}),
      /** Sem solicitação operacional extra; impactos são registrados pelo core.
       * Esforço aerodinâmico distribuído de vínculos não é qualificado neste ensaio.
       * @contract f-f310bba164029a51
   */
      obterEsforcoSolicitadoN: () => modulo === motor ? motor.empuxoAtualN
        : modulo instanceof Propulsor && jatosRcs.some(j => j.propulsor === modulo) ? modulo.empuxoAtualN : 0 });
    fixadores.push(f); mundo.registrarFixador(f);
  }
  const solo = new SuperficieEsferica('terra-re-001', ambiente.campo.centroM);
  mundo.registrarSuperficie(solo);
  const sensores = new SensoresVeiculoComposto(orbitador, 0,
    () => orbitador.massaKg + fixadores.filter(f => f.estaAtivo).reduce((s, f) => s + f.objetoB.massaKg, 0));
  mundo.registrarSensoresVeiculo(sensores);
  return { configuracao, ambiente, perfil, mundo, orbitador, flaps, bateria, motor, tanqueMetano, tanqueOxidante,
    tanqueRcs, jatosRcs: jatosRcs.map(j => j.propulsor), propulsoresRcsCima, propulsoresRcsBaixo,
    fixadores, objetos, sensores, solo };
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
  private readonly controladorRcs: ControladorRcsManual;
  private rcsArmado = false;
  private readonly supervisor: SupervisorRecuperacao;
  private readonly eventos: EventoMissao[] = [];
  private readonly condicoesRegistradas = new Map<string, boolean>();
  private energiaDissipadaJ = 0;
  private readonly balancoAngular = new BalancoAngular();
  private readonly extremos: RegistroExtremos;
  private sequenciaEvento = 0;
  private eventosDescartados = 0;
  private ultimaObservacaoMach!: EstadoCruzeMachReentrada;

  /** Monta controles por portas de leitura, registra adaptador de pouso desabilitado
   * sem motores, e registra hipóteses/revisão, inclusive a térmica regional. Não inicia execução ou ignição.
   * @contract f-34fba91cf8789bd5
   */
  public constructor(entrada: EntradaConfiguracaoReentrada = {}) {
    this.cenario = criarCenarioReentrada(entrada); this.configuracao = this.cenario.configuracao;
    this.controladorRcs = new ControladorRcsManual(this.cenario.propulsoresRcsCima, this.cenario.propulsoresRcsBaixo);
    this.passoS = this.configuracao.passoS;
    this.extremos = new RegistroExtremos(Math.round(this.configuracao.intervaloColetaS / this.passoS));
    this.controlador = new ControladorReentrada(() => this.lerControle(), this.configuracao.anguloAtaqueRad,
      this.configuracao.rolagemRad, this.configuracao.corredor, this.configuracao.parametros);
    this.gerenciador.registrar(this.controlador);
    this.gerenciador.registrar(new ControladorAproximacao());
    const pouso = new ControladorPousoDePropulsores();
    pouso.configurar({}, []); this.gerenciador.registrar(pouso);
    if (this.configuracao.automatico) this.gerenciador.habilitar('reentrada');
    else this.controlador.desabilitar();
    this.supervisor = new SupervisorRecuperacao(this.gerenciador, this.configuracao.aproximacao);
    this.supervisor.definirAutomatico(this.configuracao.chaveamentoAutomatico);
    this.atualizarSupervisor();
    this.evento('modelo', `${MODELO_REENTRADA.revisao}; ${this.cenario.perfil.revisao}; XY, Terra estática; `
      + (this.configuracao.vacuo ? 'vácuo explícito' : 'atmosfera de engenharia') + '; propulsor bipropelente RE-002E e quatro jatos RCS experimentais; indicadores preliminares.');
    this.evento('limites-termicos', this.configuracao.termica
      ? `RE-004-r1: limites regionais em °C, perfis ${this.configuracao.termica.perfil}; bateria com caminho condutivo declarado. Sem certificação ou fuga térmica.`
      : `Limiares provisórios: orbitador ${this.configuracao.limiteOrbitadorC} °C; flaps ${this.configuracao.limiteFlapsC} °C; bateria isolada ${this.configuracao.limiteBateriaC} °C. Sem qualificação material/limite interno; bateria sem previsão de fuga térmica ou falha catastrófica.`);
    this.extremos.registrar(this.lerMetricasPasso(), 0, 0);
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
   * seleção manual; aproximação passa pelo supervisor e pouso direto é bloqueado.
   * @contract f-ea3e069c929c0c05
   */
  public receberComando(comando: ComandoReentrada): ResultadoComandoMissao {
    if (!validarComandoReentrada(comando)) return { aceito: false, motivo: 'Comando RE inválido.' };
    const c = this.cenario;
    let aceito = true, motivo = 'Comando aplicado.';
    if (!this.configuracao.propulsaoExperimental && ['throttle-propulsor', 'ignicao-propulsor', 'corte-propulsor', 'armar-rcs', 'rcs'].includes(comando.tipo)) {
      aceito = false; motivo = 'Propulsão e RCS não estão instalados neste ensaio.';
    } else if (this.supervisor.observar().fase !== 'reentrada' && ['modo', 'alvos', 'flaps', 'rolagem'].includes(comando.tipo)) {
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
    } else if (comando.tipo === 'throttle-propulsor') c.motor.definirThrottle(comando.throttle);
    else if (comando.tipo === 'ignicao-propulsor') {
      const partida = (['elétrico', 'hidráulico', 'combustível', 'controle'] as const).every(s => c.motor.ligarSistema(s));
      aceito = partida && c.motor.solicitarIgnicao();
      if (!aceito) motivo = `Ignição recusada: ${c.motor.diagnosticoOperacional.join('; ')}`;
    } else if (comando.tipo === 'corte-propulsor') {
      c.motor.definirThrottle(0); c.motor.desligarSistema('elétrico');
    } else if (comando.tipo === 'armar-rcs') {
      const jatos = [...c.propulsoresRcsCima, ...c.propulsoresRcsBaixo];
      const aceitos = jatos.map(j => (['elétrico', 'hidráulico', 'combustível', 'controle'] as const).every(s => j.ligarSistema(s)) && j.solicitarIgnicao());
      this.rcsArmado = aceitos.every(Boolean);
      aceito = this.rcsArmado;
      if (!aceito) motivo = 'RCS não armado: ' + jatos.flatMap(j => j.diagnosticoOperacional).join('; ');
    } else if (comando.tipo === 'rcs') {
      if (!this.rcsArmado) { aceito = false; motivo = 'Arme o sistema RCS antes de comandar rotação.'; }
      else this.controladorRcs.solicitarRotacao(comando.comando);
    } else if (comando.tipo === 'chaveamento') this.supervisor.definirAutomatico(comando.automatico);
    else if (comando.tipo === 'pouso') {
      aceito = false; motivo = 'Fluxo obrigatório: Reentrada → Aproximação → Pouso; pouso fora deste marco.';
    } else if (comando.tipo === 'aproximacao') {
      this.supervisor.solicitarAproximacao(); this.atualizarSupervisor();
      aceito = this.supervisor.observar().fase === 'aproximacao';
      motivo = aceito ? 'Posse transferida à aproximação.' : this.supervisor.observar().requisitos.filter(r => !r.atendido).map(r => r.descricao).join('; ');
    } else if (comando.tipo === 'alimentacao') c.flaps.forEach(f => {
      if (comando.ligada) f.conexaoEletrica.fecharInterruptor(); else f.conexaoEletrica.abrirInterruptor();
    });
    else if (comando.tipo === 'falha-rolagem') c.orbitador.definirDisponibilidadeRolagem(false);
    else if (comando.tipo === 'separar-flap') c.fixadores[comando.indice].liberar();
    this.evento(aceito ? 'comando' : 'comando-bloqueado', `${comando.tipo}: ${motivo}`, 'comando');
    return { aceito, motivo };
  }

  /** Consome solicitações arbitradas e avança um único passo no mundo compartilhado.
   * Não encerra por tempo/evento intermediário. Registra quadratura do torque
   * e resíduo de L intrínseco, sem correção UI. Contato/ruptura sinaliza balanço incompleto.
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
    const gAntes = geometriaConjunto(c);
    const antes = diagnosticarMomentoAngular(gAntes.membros, c.ambiente.campo.centroM, p => c.mundo.obterGravidadeMps2(p));
    const torqueAero = c.mundo.obterCargasAerodinamicas(gAntes.membros, antes.centroM).torqueNm.z;
    c.mundo.avancar(this.passoS); this.passos++;
    const gDepois = geometriaConjunto(c);
    const depois = diagnosticarMomentoAngular(gDepois.membros, c.ambiente.campo.centroM, p => c.mundo.obterGravidadeMps2(p));
    const aplicado = c.mundo.obterDiagnosticoAngularDoPasso(c.orbitador);
    this.balancoAngular.registrar(antes, depois, this.passoS, torqueAero,
      gAntes.massaKg === gDepois.massaKg && gAntes.membros.length === gDepois.membros.length
      && c.mundo.obterContatosComSuperficie().length === 0,
      aplicado ? aplicado.impulsoGravitacionalNmS + (aplicado.torqueAerodinamicoNm + aplicado.torqueOutrosContinuosNm) * aplicado.dtS : undefined);
    this.energiaDissipadaJ += potenciaDissipadaW * this.passoS;
    this.atualizarSupervisor();
    this.registrarCondicoes();
    this.extremos.registrar(this.lerMetricasPasso(), this.passos, c.mundo.tempoS);
    return true;
  }

  /** Observação escalar enxuta para cruzamentos por passo. Não copia histórico,
   * serializa geometria nem altera a física; consulta o estado atual do core.
   * @contract f-f6df730721c69dac */
  public observarCruzamentoMach() {
    return this.ultimaObservacaoMach;
  }

  /** Observação escalar/geométrica e balanço angular, copiada e congelada. Torque
   * Não oferece objetos mutáveis nem corrige estado. Rede optante expõe nós,
   * balanços SI e limites; temperaturaC passa a significar estrutura. @contract f-05755a69bc286c7f */
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
      execucao: this.execucao, estado: e, extremos: this.extremos.observar(), eventosDescartados: this.eventosDescartados, altitudeM: c.ambiente.referencial.altitudeGeometricaM(e.posicaoM),
      arcoM: c.ambiente.referencial.posicaoHorizontalM(e.posicaoM), velocidadeMps: e.velocidadeMps.magnitude,
      trajetoriaRad: Math.atan2(velLocal.y, velLocal.x), velocidadeRadialMps: velLocal.y, velocidadeTangencialMps: velLocal.x,
      energiaMecanicaEspecificaJPorKg: e.velocidadeMps.magnitude ** 2 / 2 - c.ambiente.campo.muM3S2 / e.posicaoM.subtrair(c.ambiente.campo.centroM).magnitude,
      atitudeInercialRad: e.orientacaoRad.z, atitudeLocalRad: c.ambiente.referencial.atitudeLocalRad(e.orientacaoRad.z, e.posicaoM),
      aerodinamica: a, rolagem: c.orbitador.observarRolagem(), controle: this.controlador.observar(),
      historicoRolagem: c.orbitador.obterHistoricoRolagem(),
      supervisor: this.supervisor.observar(), arbitragem: this.gerenciador.obterUltimaArbitragem(),
      massaKg: g.massaKg, inerciaKgM2: g.inerciaKgM2, centroM: g.centroM, forcaAerodinamicaN: cargas.forcaN,
      torqueAerodinamicoNm: cargas.torqueNm.z, aceleracaoMps2: gravidade.adicionar(aceleracaoAero),
      rotacao: { ...diagnosticarMomentoAngular(g.membros, c.ambiente.campo.centroM, p => c.mundo.obterGravidadeMps2(p)),
        ...this.balancoAngular.observar(), cargasEfetivamenteIntegradas: c.mundo.obterDiagnosticoAngularDoPasso(c.orbitador) ?? null, torqueAerodinamicoNm: cargas.torqueNm.z,
        torqueOutrosContinuosNm: 0, fontesImpulsivas: c.mundo.obterContatosComSuperficie().length > 0 },
      cargaG: aceleracaoAero.magnitude / 9.80665,
      desaceleracaoMps2: a.velocidadeRelativaMps > 0 ? -aceleracaoAero.produtoEscalar(e.velocidadeMps) / Math.max(1e-6, e.velocidadeMps.magnitude) : 0,
      ...(this.configuracao.termica ? { termica: { revisao: 'RE-004-r1', perfil: this.configuracao.termica.perfil,
        corpo: c.orbitador.observarRedeTermica()!, flaps: c.flaps.map(f => f.observarRedeTermica()!), bateria: c.bateria.observarRedeTermica()!,
        temperaturaLegadaSignifica: 'estrutura',
        energiaAtmosferaLegadaSignifica: 'residuo-DV-menos-calor-nao-fechado-no-modelo-de-fluxo-prescrito' } } : {}),
      temperaturaC: c.orbitador.temperaturaC, integridade: c.orbitador.integridadeEstrutural,
      limiteOrbitadorC: this.configuracao.limiteOrbitadorC, limiteFlapsC: this.configuracao.limiteFlapsC,
      energiaAbsorvidaJ: c.objetos.reduce((s, o) => s + o.energiaTermicaAerodinamicaAcumuladaJ, 0),
      energiaDissipadaJ: this.energiaDissipadaJ,
      energiaAtmosferaJ: Math.max(0, this.energiaDissipadaJ - c.objetos.reduce((s, o) => s + o.energiaTermicaAerodinamicaAcumuladaJ, 0)),
      respostaTermica: { energiaAbsorvidaCorpoJ: c.orbitador.energiaTermicaAerodinamicaAcumuladaJ, modelo: this.configuracao.termica ? 'rede-regional-fluxo-prescrito-SG-radiacao-conducao' : 'concentrado-min-indicador-DV-experimental', tetoUniversal: false,
        potenciaIndicadorCorpoW: a.fluxoTermicoIndicadorWm2 * this.configuracao.parametros.areaAquecidaM2,
        potenciaTransferidaCorpoW: c.orbitador.obterPotenciaAquecimentoAerodinamicoW(condicoes, Math.max(0, -c.mundo.obterForcaArrastoAtmosferico(c.orbitador).produtoEscalar(e.velocidadeMps.subtrair(c.mundo.velocidadeDoArMps)))),
        tpsInstalado: this.configuracao.termica?.perfil === 'tps-experimental', camadasInternasModeladas: !!this.configuracao.termica },
      estadosTerminais: { corpoDestruido: c.orbitador.integridadeEstrutural === 0,
        controlePerdido: c.flaps.some(f => f.integridadeEstrutural === 0 || (f.obterDiagnosticoAtuacao().integridadeMecanismo === 0)),
        contato: c.mundo.obterContatosComSuperficie().length > 0,
        impactoDestrutivo: c.mundo.obterContatosComSuperficie().some(ct => ct.energiaImpactoJ > c.orbitador.resistenciaColisaoJ) },
      dissipacaoW, calorTransferidoW: calorW, potenciaAtmosferaW: Math.max(0, dissipacaoW - calorW),
      energiaBateriaJ: c.bateria.energiaArmazenadaJ,
      temperaturaBateriaC: c.bateria.temperaturaC, integridadeBateria: c.bateria.integridadeEstrutural,
      limiteBateriaC: this.configuracao.limiteBateriaC,
      motor: { estado: c.motor.getEstadoFisico(), ignitado: c.motor.estaIgnitado, throttle: c.motor.throttleAtual,
        empuxoN: c.motor.empuxoAtualN, vazaoKgS: c.motor.vazaoAtualKgS, integridade: c.motor.integridadeEstrutural,
        metanoKg: c.tanqueMetano.massaPropelenteKg, oxidanteKg: c.tanqueOxidante.massaPropelenteKg },
      rcs: { armado: this.rcsArmado, comando: this.controladorRcs.observarComando(), nitrogenioKg: c.tanqueRcs.massaPropelenteKg,
        jatos: c.jatosRcs.map(j => ({ id: j.id, estado: j.getEstadoFisico(), ignitado: j.estaIgnitado,
          throttle: j.throttleAtual, empuxoN: j.empuxoAtualN, integridade: j.integridadeEstrutural })) },
      flaps: c.flaps.map((f, i) => ({ id: f.id, estado: f.getEstadoFisico(), comandoRad: f.comandoAtualRad,
        deflexaoRad: f.deflexaoAtualRad, integridade: f.integridadeEstrutural, temperaturaC: f.temperaturaC,
        energiaAbsorvidaJ: f.energiaTermicaAerodinamicaAcumuladaJ, conectado: c.fixadores[i].estaAtivo,
        fluxoTermicoIndicadorWm2: calcularFluxoTermicoIndicador(c.mundo.obterCondicoesAtmosfericas(f).densidadeArKgM3,
          f.getEstadoFisico().velocidadeMps.subtrair(c.mundo.velocidadeDoArMps).magnitude,
          this.configuracao.parametros.raioNarizFlapM, this.configuracao.parametros.coeficienteSuttonGravesSI),
        energizado: f.conexaoEletrica.estaEnergizada, atuacao: f.obterDiagnosticoAtuacao(),
        knudsenEstimado: c.perfil.amostrar(c.ambiente.referencial.altitudeGeometricaM(f.getEstadoFisico().posicaoM)).caminhoLivreMedioM / this.configuracao.parametros.comprimentoCaracteristicoFlapM,
        modeloEscoamento: 'polar-continua-extrapolada' })),
      vinculos: c.fixadores.map(f => ({ ...(this.configuracao.termica ? { termica: f.obterDiagnosticoTermico() } : {}), id: f.id, estado: f.estado, tracaoAtualN: f.esforcoFisicoSolicitadoN, picoTracaoN: f.picoEsforcoFisicoN, resistenciaTracaoN: f.resistenciaTracaoEfetivaN, cisalhamentoFlexaoTorcaoModelados: false })),
      raioTerraM: c.ambiente.referencial.raioM, centroTerraM: c.ambiente.campo.centroM,
      propulsaoDisponivel: this.configuracao.propulsaoExperimental && c.motor.estaIgnitado && c.motor.integridadeEstrutural > 0,
      rcsDisponivel: this.configuracao.propulsaoExperimental && this.rcsArmado && c.tanqueRcs.massaPropelenteKg > 0 && c.jatosRcs.every(j => j.integridadeEstrutural > 0) });
  }

  /** Telemetria física para PD; calcula derivada angular do fluxo por v×a/|v|²,
   * sem diferenciar relógio real ou alterar estado. Dano próprio do mecanismo
   * optante participa apenas da disponibilidade, sem mudar lei de controle. Torque passivo exclui lift ativo.
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
      energiaMecanicaEspecificaJPorKg: e.velocidadeMps.magnitude ** 2 / 2 - c.ambiente.campo.muM3S2 / e.posicaoM.subtrair(c.ambiente.campo.centroM).magnitude,
      integridadeMinima: Math.min(...g.membros.map(o => o.integridadeEstrutural)),
      inerciaKgM2: g.inerciaKgM2, phiRad: c.orbitador.observarRolagem().atualRad,
      disponivel: c.orbitador.integridadeEstrutural > 0 && c.flaps.every((f, i) => f.integridadeEstrutural > 0
        && f.conexaoEletrica.estaEnergizada && c.fixadores[i].estaAtivo && (f.obterDiagnosticoAtuacao().integridadeMecanismo ?? 1) > 0) };
  }

  /** Avalia estado real, autoridade remanescente e filtros A/B sem reutilizar
   * limites antigos de pouso. Mecanismo optante sem integridade não oferece autoridade. Não há propulsão nem integração física de aproximação.
   * @contract f-b5dfd4d0081ccbd9
   */
  private atualizarSupervisor(): void {
    const c = this.cenario, l = c.sensores.obterLeituras(), fase = this.supervisor.observar().fase;
    const t = this.lerControle(), p = this.configuracao.parametros;
    const integridadeFlaps = Math.min(...c.flaps.map((f, i) => c.fixadores[i].estaAtivo ? f.integridadeEstrutural : 0));
    const autoridadeNmPorRad = Math.abs(2 * t.pressaoDinamicaPa * p.areaFlapM2 * p.clFlapPorRad * p.bracoFlapM
      * Math.cos(t.alphaRad) * Math.cos(t.phiRad)) * integridadeFlaps;
    this.supervisor.atualizar({ altitudeM: l.altitudeM, arcoM: l.posicaoHorizontalM ?? 0,
      velocidadeMps: Math.hypot(l.velocidadeHorizontalMps, l.velocidadeVerticalMps),
      velocidadeRadialMps: l.velocidadeVerticalMps, velocidadeTangencialMps: l.velocidadeHorizontalMps,
      alphaRad: t.alphaRad, alphaAlvoRad: this.controlador.observar().alphaGerenciadoRad,
      omegaRadps: t.taxaArfagemRadps, energiaMecanicaEspecificaJPorKg: t.energiaMecanicaEspecificaJPorKg,
      sensoresValidos: l.sensoresValidos !== false && (l.idadeLeituraS ?? 0) <= 0.25,
      integridade: c.orbitador.integridadeEstrutural, integridadeFlaps,
      termicaCompativel: c.orbitador.temperaturaC <= c.orbitador.limiteTermicoC
        && c.flaps.every(f => f.temperaturaC <= f.limiteTermicoC && (f.obterDiagnosticoAtuacao().integridadeMecanismo ?? 1) > 0) && c.bateria.temperaturaC <= c.bateria.limiteTermicoC,
      alimentacaoDisponivel: c.flaps.every(f => f.conexaoEletrica.estaEnergizada),
      autoridadeAerodinamicaDisponivel: autoridadeNmPorRad >= p.torqueMinimoAutoridadeNm,
      corredorCompativel: t.pressaoDinamicaPa <= this.configuracao.corredor.pressaoMaximaPa
        && t.fluxoTermicoWm2 <= this.configuracao.corredor.fluxoMaximoWm2 && t.cargaG <= this.configuracao.corredor.cargaMaximaG,
      propulsaoDisponivel: this.configuracao.propulsaoExperimental && c.motor.estaIgnitado && c.motor.integridadeEstrutural > 0,
      integracaoCompativel: false });
    if (this.supervisor.observar().fase !== fase) this.evento('chaveamento', `${fase} → ${this.supervisor.observar().fase}`);
  }

  /** Registra arestas de falha/recuperação de condições, não repete eventos por frame.
   * Nó optante identifica corpo/região, limiar e colapso próprios.
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
      'candidato-aproximacao': this.supervisor.observar().candidatoCinematico,
      'autorizacao-aproximacao': this.supervisor.observar().autorizado,
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
    const valores: Record<string, number | boolean> = {
      'limite-termico-orbitador': c.orbitador.temperaturaC, 'limite-termico-flaps': Math.max(...c.flaps.map(f => f.temperaturaC)),
      'limite-termico-bateria': c.bateria.temperaturaC, 'degradacao-orbitador': c.orbitador.integridadeEstrutural,
      'colapso-orbitador': c.orbitador.integridadeEstrutural,
      'corredor-pressao': a.pressaoDinamicaPa, 'corredor-aquecimento': a.fluxoTermicoIndicadorWm2,
      'corredor-carga': this.lerControle().cargaG,
    };
    for (const [i, f] of c.flaps.entries()) {
      valores[`degradacao-flap-${i + 1}`] = f.integridadeEstrutural;
      valores[`colapso-flap-${i + 1}`] = f.integridadeEstrutural;
    }
    if (this.configuracao.termica) for (const objeto of c.objetos) {
      for (const r of objeto.observarRedeTermica()!.regioes) {
        const chave = `limite-termico-${objeto.id}-${r.id}`;
        condicoes[chave] = r.temperaturaC > r.limiteTermicoC; valores[chave] = r.temperaturaC;
        condicoes[`colapso-termico-${objeto.id}-${r.id}`] = r.integridade === 0;
        valores[`colapso-termico-${objeto.id}-${r.id}`] = r.integridade;
      }
    }
    for (const [tipo, ativo] of Object.entries(condicoes)) {
      if (ativo !== (this.condicoesRegistradas.get(tipo) ?? false)) this.evento(tipo, ativo ? 'Condição detectada.' : 'Condição cessou.', 'fisico', { ativo, valor: valores[tipo] ?? ativo, causa: tipo });
      this.condicoesRegistradas.set(tipo, ativo);
    }
  }

  /** Acrescenta evento no tempo de missão, com sequência estável e categoria.  @contract f-593973bfbdc79c20 */
  private evento(tipo: string, descricao: string, categoria: EventoMissao['categoria'] = 'missao', dados?: EventoMissao['dados']): void {
    this.eventos.push({ sequencia: this.sequenciaEvento++, passo: this.passos, tempoS: this.cenario.mundo.tempoS, categoria, tipo, descricao,
      ...(dados ? { dados: { ...dados } } : {}) });
    if (this.eventos.length > this.configuracao.limiteEventos) { this.eventos.splice(2, 1); this.eventosDescartados++; }
  }

  /** Coleta canais físicos SI em todo passo, antes de qualquer redução visual.
   * Inclui temperaturas e resíduos de cada região optante.
   * Sem cópia de trajetória ou recalibração de forças. Chaves/unidades acompanham
   * o diário; extremos têm passo e instante e não dependem da renderização.
   * @contract f-08107e4693116363
   */
  private lerMetricasPasso(): Readonly<Record<string, number>> {
    const c = this.cenario, e = c.orbitador.getEstadoFisico(), a = c.orbitador.avaliar(c.mundo.obterCondicoesAtmosfericas(c.orbitador));
    const local = c.ambiente.referencial.vetorParaLocal(e.velocidadeMps, e.posicaoM);
    const altitudeM = c.ambiente.referencial.altitudeGeometricaM(e.posicaoM);
    const torqueAerodinamicoNm = c.mundo.obterDiagnosticoAngularDoPasso(c.orbitador)?.torqueAerodinamicoNm ?? 0;
    this.ultimaObservacaoMach = { tempoS: c.mundo.tempoS, passo: this.passos, mach: a.mach, altitudeM,
      arcoM: c.ambiente.referencial.posicaoHorizontalM(e.posicaoM), velocidadeMps: e.velocidadeMps.magnitude,
      velocidadeRadialMps: local.y, velocidadeTangencialMps: local.x, trajetoriaRad: Math.atan2(local.y, local.x),
      atitudeLocalRad: c.ambiente.referencial.atitudeLocalRad(e.orientacaoRad.z, e.posicaoM), alphaRad: a.anguloAtaqueRad,
      omegaRadps: e.velocidadeAngularRadps.z, pressaoDinamicaPa: a.pressaoDinamicaPa,
      fluxoTermicoWm2: a.fluxoTermicoIndicadorWm2, torqueAerodinamicoNm,
      energiaMecanicaEspecificaJPorKg: e.velocidadeMps.magnitude ** 2 / 2
        - c.ambiente.campo.muM3S2 / e.posicaoM.subtrair(c.ambiente.campo.centroM).magnitude,
      temperaturaCorpoC: c.orbitador.temperaturaC, temperaturaFlapsC: c.flaps.map(f => f.temperaturaC),
      integridadeCorpo: c.orbitador.integridadeEstrutural, integridadeFlaps: c.flaps.map(f => f.integridadeEstrutural),
      alimentacaoFlaps: c.flaps.map(f => f.conexaoEletrica.estaEnergizada), vinculosFlaps: c.fixadores.map(f => f.estaAtivo),
      estadoControle: this.controlador.observar().estado,
      autoridadeDisponivel: c.flaps.every((f, i) => f.integridadeEstrutural > 0 && f.conexaoEletrica.estaEnergizada
        && c.fixadores[i].estaAtivo && f.obterDiagnosticoAtuacao().integridadeMecanismo !== 0) };
    const regionais: Record<string, number> = {};
    if (this.configuracao.termica) for (const objeto of c.objetos) {
      const rede = objeto.observarRedeTermica()!;
      for (const r of rede.regioes) regionais[`temperatura-${objeto.id}-${r.id}-C`] = r.temperaturaC;
      regionais[`residuo-termico-${objeto.id}-J`] = rede.residuoEnergiaJ;
    }
    return { ...regionais, cargaG: this.lerControle().cargaG,
      erroAlphaRad: normalizarAngulo(a.anguloAtaqueRad - this.controlador.observar().alphaGerenciadoRad),
      energiaTermicaCorpoJ: c.orbitador.energiaTermicaAerodinamicaAcumuladaJ,
      energiaTermicaFlap1J: c.flaps[0].energiaTermicaAerodinamicaAcumuladaJ,
      energiaTermicaFlap2J: c.flaps[1].energiaTermicaAerodinamicaAcumuladaJ,
      altitudeM: c.ambiente.referencial.altitudeGeometricaM(e.posicaoM), velocidadeMps: e.velocidadeMps.magnitude,
      omegaInercialRadps: e.velocidadeAngularRadps.z, alphaRad: a.anguloAtaqueRad,
      pressaoDinamicaPa: a.pressaoDinamicaPa, fluxoTermicoIndicadorWm2: a.fluxoTermicoIndicadorWm2,
      temperaturaCorpoC: c.orbitador.temperaturaC, temperaturaFlap1C: c.flaps[0].temperaturaC,
      temperaturaFlap2C: c.flaps[1].temperaturaC, integridadeCorpo: c.orbitador.integridadeEstrutural,
      integridadeFlap1: c.flaps[0].integridadeEstrutural, integridadeFlap2: c.flaps[1].integridadeEstrutural,
      energiaMecanicaEspecificaJPorKg: e.velocidadeMps.magnitude ** 2 / 2 - c.ambiente.campo.muM3S2 / e.posicaoM.subtrair(c.ambiente.campo.centroM).magnitude,
      torqueAerodinamicoNm: c.mundo.obterDiagnosticoAngularDoPasso(c.orbitador)?.torqueAerodinamicoNm ?? 0,
      energiaBateriaJ: c.bateria.energiaArmazenadaJ };
  }

  /** Exporta identificação/revisões e hipóteses; RE-004 só com rede optante.
   * Toda definição regional é serializada para reprodução estrita.  @contract f-4987311594a9418d */
  public obterIdentificacao(): object {
    const descricaoPropulsao = this.configuracao.propulsaoExperimental
      ? ' propulsor bipropelente e quatro jatos RCS experimentais RE-002E;' : ' sem RCS/propulsão;';
    return copiarSnapshot({ id: this.id, revisao: this.configuracao.termica ? 'RE-004-r1' : MODELO_REENTRADA.revisao, configuracao: this.configuracao,
      modeloFisico: this.cenario.mundo.obterConfiguracaoFisica(), modeloOrbitador: { revisao: MODELO_REENTRADA.revisao, ...this.configuracao.parametros },
      hipoteses: this.configuracao.termica ? this.configuracao.termica.hipotese + ` ADM XY, Terra e ar estáticos; coeficientes analíticos preliminares;${descricaoPropulsao} rolagem prescrita; lateral omitida; superfície/estrutura/interior separados.` : `ADM XY, Terra e ar estáticos; coeficientes analíticos preliminares;${descricaoPropulsao} rolagem prescrita; lateral omitida; calor concentrado sem TPS separado.` });
  }
}

export type ObservacaoReentrada = ReturnType<EnsaioReentrada['observar']>;
export type DiarioReentrada = DiarioMissao<ComandoReentrada, ObservacaoReentrada>;

/** Fábrica pública de ensaio registrável, sem relógio, DOM ou escrita externa.  @contract f-fbefc47b0a643060 */
export function criarEnsaioReentrada(configuracao: EntradaConfiguracaoReentrada = {}) {
  const ensaio = new EnsaioReentrada(configuracao);
  return new RegistroMissao(ensaio, ensaio.obterIdentificacao(), validarComandoReentrada, Math.round(ensaio.configuracao.intervaloColetaS / ensaio.passoS), ensaio.configuracao.limiteAmostras);
}

/** Seleciona revisão térmica explícita do diário, preservando RE-003 sem rede.
 * Reexecuta agenda no mesmo modelo/runtime; rejeita revisão, entradas e resultados
 * divergentes. Pausa/exportação não reproduzem relógio real. O custo é
 * proporcional ao número de passos físicos do diário; chamada síncrona headless.
 * @contract f-af7e1ca547762556
   */
export function reproduzirEnsaioReentrada(diario: DiarioReentrada) {
  if (!diario || diario.formato !== 'blackstar-missao-1' || !Number.isSafeInteger(diario.passosExecutados)
    || diario.passosExecutados < 0) throw new Error('Diário RE inválido.');
  const identificacao = diario.identificacao as { revisao?: string; configuracao?: ConfiguracaoReentrada };
  if (!identificacao.configuracao || identificacao.revisao !== (identificacao.configuracao.termica ? 'RE-004-r1' : MODELO_REENTRADA.revisao)) throw new Error('Revisão RE incompatível.');
  const ensaio = criarEnsaioReentrada(identificacao.configuracao);
  if (JSON.stringify(ensaio.exportar().identificacao) !== JSON.stringify(diario.identificacao)
    || diario.passoS !== ensaio.passoS || diario.intervaloAmostraPassos !== Math.round(identificacao.configuracao.intervaloColetaS / ensaio.passoS)
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
