import { ControladorPerfilVooExperimental } from '../physics/sistemas de controle/ControladorPerfilVooExperimental';
import { DEFINICAO_BSS006 } from '../veiculos/DefinicaoBss006';
import type { MontagemBss } from '../veiculos/MontagemBss';
import { copiarSnapshot } from './SnapshotMissao';
import { CicloMissao } from './CicloMissao';
import { criarAmbienteLancamento, PASSO_MISSAO_BSS_S } from './AmbienteLancamento';
import { criarAmbienteAmerissagem } from './AmbienteAmerissagem';
import { registrarHidrodinamicaBss006 } from '../veiculos/HidrodinamicaBss006';
import { Vetor3 } from '../physics/Vetor3';
import { AcompanhamentoAmerissagem, type MedidasAmerissagem } from './ObservacaoAmerissagem';
import type { EventoMissao, InstanciaMissao, ResultadoComandoMissao, DefinicaoMissao } from './ContratoMissao';
import type { ComandoBss006, ConfiguracaoMissaoBss006, ObservacaoBss006, SistemaBss } from './TiposMissaoBss006';

export const ID_MISSAO_BSS006 = 'BSS006_VOO_EXPERIMENTAL';
export const ID_AMERISSAGEM_BSS006 = 'BSS006_AMERISSAGEM_EXPERIMENTAL';
const SISTEMAS: readonly SistemaBss[] = ['elétrico', 'hidráulico', 'combustível', 'controle'];
/** Limites da M9-G, separados da resposta física do contato. */
export const CRITERIOS_RETORNO_BSS006 = Object.freeze({
  velocidadeToqueMps: 0.2, atitudeToqueRad: 0.01, taxaToqueRadps: 0.01, erroAlvoM: 1,
  velocidadeCascoRepousoMps: 0.05, velocidadeComponentesRepousoMps: 0.1,
  taxaComponentesRepousoRadps: 0.01, distanciaGeometricaM: 0.001, duracaoRepousoS: 3,
});

/** Instância operacional. Toda cinemática permanece exclusivamente no MundoFisico. */
export class MissaoBss006 implements InstanciaMissao<ComandoBss006, ObservacaoBss006> {
  public readonly id: string;
  public readonly passoS = PASSO_MISSAO_BSS_S;
  public readonly configuracao: Readonly<Required<Omit<ConfiguracaoMissaoBss006, 'ensaioAquatico'>> & Pick<ConfiguracaoMissaoBss006, 'ensaioAquatico'>>;
  private readonly acompanhamentoAquatico = new AcompanhamentoAmerissagem();
  private readonly ciclo = new CicloMissao();
  private readonly ambiente: ReturnType<typeof criarAmbienteLancamento>;
  private readonly veiculo: MontagemBss;
  private readonly eventos: EventoMissao[] = [];
  private decolou = false;
  private desceu = false;
  private readonly perfil: ControladorPerfilVooExperimental;
  private contatoInicial = true;
  private toqueRetorno = false;
  private limitesToque = false;
  private integridadeMinima = 1;
  private repousoS = 0;
  private maiorRepousoS = 0;
  private bilateralObservado = false;
  private bilateralS = 0;
  private maiorBilateralS = 0;
  private seguro = false;
  private registrouRepouso = false;
  private rompeu = new Set<string>();
  private picoAltitudeM = 0;

  public constructor(configuracao: ConfiguracaoMissaoBss006 = {}, id: string = ID_MISSAO_BSS006) {
    if (typeof id !== 'string' || id.trim().length === 0) throw new Error('Identificação de missão inválida.');
    this.id = configuracao.ensaioAquatico && id === ID_MISSAO_BSS006 ? ID_AMERISSAGEM_BSS006 : id;
    this.configuracao = Object.freeze({ arcoBaseM: configuracao.arcoBaseM ?? 0,
      ventoTangencialMps: configuracao.ventoTangencialMps ?? 0,
      alvoPousoLocalM: configuracao.alvoPousoLocalM ?? 0,
      altitudeTransicaoM: configuracao.altitudeTransicaoM ?? 300,
      transicaoAutomatica: configuracao.transicaoAutomatica ?? true,
      ...(configuracao.ensaioAquatico ? { ensaioAquatico: Object.freeze({ ...configuracao.ensaioAquatico }) } : {}) });
    const c = this.configuracao;
    if (![c.arcoBaseM, c.ventoTangencialMps, c.alvoPousoLocalM, c.altitudeTransicaoM].every(Number.isFinite)
      || c.altitudeTransicaoM <= 5.3 || typeof c.transicaoAutomatica !== 'boolean') throw new Error('Configuração de missão inválida.');
    this.perfil = new ControladorPerfilVooExperimental(c.altitudeTransicaoM, c.transicaoAutomatica);
    const ensaio = c.ensaioAquatico;
    if (ensaio && (!Object.values(ensaio).every(Number.isFinite) || ensaio.velocidadeInicialMps < 0
      || ensaio.altitudeInicialM < 3 || Math.abs(ensaio.inclinacaoInicialRad) > Math.PI / 12)) throw new Error('Condição de ensaio aquático inválida.');
    this.ambiente = ensaio ? criarAmbienteAmerissagem(c.arcoBaseM, c.ventoTangencialMps) : criarAmbienteLancamento(c.arcoBaseM, c.ventoTangencialMps);
    this.veiculo = DEFINICAO_BSS006.montar(this.ambiente.mundo, this.ambiente.solo, c.arcoBaseM, ensaio ? {
      centroCascoLocalM: new Vetor3(200, ensaio.altitudeInicialM, 0), velocidadeLocalMps: new Vetor3(0, -ensaio.velocidadeInicialMps, 0),
      inclinacaoRad: ensaio.inclinacaoInicialRad, velocidadeAngularRadps: 0 } : undefined);
    if (ensaio) registrarHidrodinamicaBss006(this.ambiente.mundo, this.veiculo);
    if (!this.veiculo.selecionarAlvo(c.arcoBaseM + c.alvoPousoLocalM)) throw new Error('Alvo inicial inválido.');
    // Contato inicial deriva da geometria, não de um contato de retorno fabricado.
    this.contatoInicial = this.veiculo.objetos.some(o => this.ambiente.mundo.obterMenorDistanciaSuperficieM(o, this.ambiente.solo) <= CRITERIOS_RETORNO_BSS006.distanciaGeometricaM);
    this.evento('missao', 'missao-carregada', ensaio ? 'BSS-006 preparado em ensaio de aproximação sobre oceano.' : 'BSS-006 preparado na plataforma costeira.');
    if (ensaio) this.evento('missao', 'ensaio-adm-aproximacao', 'Condição inicial ADM sobre oceano: motores desligados, sem trajetória de lançamento presumida.');
  }
  public get passosExecutados(): number { return this.ciclo.passosExecutados; }
  public get estadoExecucao() { return this.ciclo.estadoExecucao; }
  public iniciar(): void {
    if (this.estadoExecucao === 'executando') return;
    this.ciclo.iniciar(); this.evento('missao', 'execucao-iniciada', 'Avanço físico iniciado.');
  }
  public pausar(): void {
    if (this.estadoExecucao !== 'executando') return;
    this.ciclo.pausar(); this.evento('missao', 'execucao-pausada', 'Avanço físico pausado.');
  }
  public obterEventos(): readonly EventoMissao[] { return this.eventos.map(e => ({ ...e })); }

  public receberComando(comando: ComandoBss006): ResultadoComandoMissao {
    const v = this.veiculo, m = v.propulsor;
    let aceito = true, motivo = 'Comando aplicado.';
    switch (comando.tipo) {
      case 'sistema':
        if (!SISTEMAS.includes(comando.sistema) || typeof comando.ligar !== 'boolean') return this.negar('Sistema/comando inválido.');
        if (comando.ligar) aceito = m.ligarSistema(comando.sistema); else m.desligarSistema(comando.sistema);
        if (!aceito) motivo = m.diagnosticoOperacional.join(' · '); break;
      case 'ignicao': aceito = m.solicitarIgnicao();
        if (!aceito) motivo = m.diagnosticoOperacional.join(' · '); break;
      case 'desligar-motor': v.veiculo.desligarPropulsor(m.id);
        if (this.configuracao.ensaioAquatico) this.evento('missao', 'desligamento-motor', 'Desligamento solicitado pela operação sem alteração cinemática.'); break;
      case 'throttle':
        if (!Number.isFinite(comando.valor) || comando.valor < 0 || comando.valor > 1) return this.negar('Throttle deve estar entre 0 e 1.');
        if (v.obterModo() === 'pouso') return this.negar('Throttle sob autoridade do controlador de pouso.');
        v.veiculo.definirThrottleDoPropulsor(m.id, comando.valor); break;
      case 'alvo-pouso': aceito = v.selecionarAlvo(this.configuracao.arcoBaseM + comando.deslocamentoM);
        if (!aceito) motivo = 'Alvo inválido ou seleção bloqueada após decolagem.'; break;
      case 'modo':
        if (comando.modo !== 'decolagem' && comando.modo !== 'pouso') return this.negar('Modo inválido.');
        v.ativarModo(comando.modo); break;
      case 'controle-atitude':
        if (typeof comando.habilitar !== 'boolean') return this.negar('Comando de atitude inválido.');
        if (v.obterModo() === 'pouso') return this.negar('Atitude sob autoridade dos controladores de pouso.');
        if (comando.habilitar) v.veiculo.habilitarControleDeInclinacao(); else v.veiculo.desabilitarControleDeInclinacao(); break;
      case 'falha-alimentacao':
        if (comando.alimentacao === 'eletrica') m.conexaoEletrica!.romper();
        else if (comando.alimentacao === 'metano') v.linhaCombustivel.romper();
        else if (comando.alimentacao === 'oxidante') v.linhaOxidante.romper();
        else return this.negar('Alimentação inválida.'); break;
      default: return this.negar('Comando desconhecido.');
    }
    this.evento('comando', aceito ? 'comando-aceito' : 'comando-negado', `${comando.tipo}: ${motivo}`);
    return { aceito, motivo };
  }
  private negar(motivo: string): ResultadoComandoMissao {
    this.evento('comando', 'comando-negado', motivo); return { aceito: false, motivo };
  }
  private evento(categoria: EventoMissao['categoria'], tipo: string, descricao: string): void {
    this.eventos.push({ sequencia: this.eventos.length, passo: this.passosExecutados,
      tempoS: this.ambiente.mundo.tempoS, categoria, tipo, descricao });
  }

  public avancarPasso(): boolean {
    if (this.estadoExecucao !== 'executando') return false;
    const { mundo, solo } = this.ambiente, v = this.veiculo, ref = mundo.ambiente.referencial;
    const antes = v.veiculo.getEstadoFisico();
    if (this.perfil.atualizar(ref.altitudeGeometricaM(antes.posicaoM)) === 'pouso') {
      v.ativarModo('pouso');
      this.evento('missao', 'transicao-pouso', `Modo pouso aos ${ref.altitudeGeometricaM(antes.posicaoM).toFixed(3)} m.`);
    }
    v.atualizarControleAletas(); mundo.avancar(this.passoS); this.ciclo.registrarPasso();
    const e = v.veiculo.getEstadoFisico(), h = ref.altitudeGeometricaM(e.posicaoM);
    if (this.configuracao.ensaioAquatico) for (const tipo of this.acompanhamentoAquatico.atualizar(this.medidasAquaticas(), this.passoS))
      this.evento('fisico', tipo, 'Evento derivado da imersão, forças e estado físico medidos.');
    const vr = ref.vetorParaLocal(e.velocidadeMps, e.posicaoM).y;
    this.picoAltitudeM = Math.max(this.picoAltitudeM, h);
    if (!this.decolou && h > v.alturaInicialM + 0.5) { this.decolou = true; this.evento('fisico', 'decolagem', 'Veículo afastou-se do solo.'); }
    if (this.decolou && vr < -1 && !this.desceu) { this.desceu = true; this.evento('fisico', 'descida', 'Velocidade radial negativa após subida.'); }
    const contatos = mundo.obterContatosComSuperficie();
    const retorno = this.desceu && contatos.some(ct => ct.impulsoNormalNs > 0
      && (ct.objetoId === v.veiculo.id || /sapata|perna/.test(ct.objetoId)));
    if (retorno && !this.toqueRetorno) {
      const vel = ref.vetorParaLocal(antes.velocidadeMps, antes.posicaoM), k = CRITERIOS_RETORNO_BSS006;
      this.limitesToque = Math.abs(vel.y) < k.velocidadeToqueMps && Math.abs(vel.x) < k.velocidadeToqueMps
        && Math.abs(ref.atitudeLocalRad(antes.orientacaoRad.z, antes.posicaoM)) < k.atitudeToqueRad
        && Math.abs(ref.taxaAtitudeLocalRadps(antes.velocidadeAngularRadps.z, antes.posicaoM, antes.velocidadeMps)) < k.taxaToqueRadps
        && Math.abs(ref.erroHorizontalM(v.obterAlvo(), antes.posicaoM)) < k.erroAlvoM;
      this.toqueRetorno = true; this.evento('fisico', 'toque-retorno', 'Primeiro impulso de contato do veículo após descida.');
    }
    const integridade = Math.min(...v.objetos.map(o => o.integridadeEstrutural));
    if (integridade < this.integridadeMinima) { if (this.integridadeMinima === 1) this.evento('fisico', 'dano-estrutural', 'Integridade reduzida pelo core.'); this.integridadeMinima = integridade; }
    for (const f of v.fixadores) if (f.estaRompido && !this.rompeu.has(f.id)) {
      this.rompeu.add(f.id); this.evento('fisico', 'vinculo-rompido', f.id);
    }
    const k = CRITERIOS_RETORNO_BSS006;
    const quietos = e.velocidadeMps.magnitude <= k.velocidadeCascoRepousoMps && v.objetos.every(o => {
      const s = o.getEstadoFisico(); return s.velocidadeMps.magnitude <= k.velocidadeComponentesRepousoMps
        && s.velocidadeAngularRadps.magnitude <= k.taxaComponentesRepousoRadps;
    });
    const geometrico = this.toqueRetorno && h < 8 && v.objetos.some(o => mundo.obterMenorDistanciaSuperficieM(o, solo) <= k.distanciaGeometricaM);
    const sapatas = v.pernasFixas.filter(o => o.id.includes('sapata'));
    this.bilateralObservado = sapatas.every(o => contatos.some(ct => ct.objetoId === o.id && ct.emApoio));
    // Dois impulsos normais positivos no mesmo subpasso; não confundir com proximidade.
    const reacaoBilateral = sapatas.every(o => contatos.some(ct => ct.objetoId === o.id && ct.impulsoNormalNs > 0));
    this.repousoS = geometrico && quietos && v.propulsor.empuxoAtualN === 0 ? this.repousoS + this.passoS : 0;
    this.bilateralS = this.toqueRetorno && reacaoBilateral && quietos && v.propulsor.empuxoAtualN === 0 ? this.bilateralS + this.passoS : 0;
    this.maiorRepousoS = Math.max(this.maiorRepousoS, this.repousoS); this.maiorBilateralS = Math.max(this.maiorBilateralS, this.bilateralS);
    if (this.repousoS >= k.duracaoRepousoS && !this.registrouRepouso) {
      this.registrouRepouso = true; this.evento('fisico', 'repouso-geometrico', 'Três segundos de geometria no solo e velocidades dentro dos limites.');
    }
    const seguro = this.limitesToque && integridade === 1 && this.rompeu.size === 0 && this.bilateralS >= k.duracaoRepousoS;
    if (seguro && !this.seguro) this.evento('missao', 'pouso-seguro', 'Toque, integridade e apoio bilateral sustentado atenderam aos critérios.');
    this.seguro = seguro;
    return true;
  }

  public observar(): ObservacaoBss006 {
    const { mundo } = this.ambiente, v = this.veiculo, ref = mundo.ambiente.referencial;
    const e = v.veiculo.getEstadoFisico(), engenharia = v.obterDadosMissao();
    const leitura = v.veiculo.obterLeiturasDosSensores();
    const observacao: ObservacaoBss006 = {
      ...(this.configuracao.ensaioAquatico ? { aquatico: this.acompanhamentoAquatico.observar(this.medidasAquaticas()) } : {}),
      id: this.id, passo: this.passosExecutados, tempoS: mundo.tempoS, execucao: this.estadoExecucao,
      fase: this.integridadeMinima < 1 ? 'falha' : this.configuracao.ensaioAquatico ? 'agua' : this.toqueRetorno ? 'contato' : this.desceu ? 'descida' : this.decolou ? 'subida' : 'solo',
      modo: v.obterModo(), casco: e, altitudeM: engenharia.altitudeGeometricaM,
      deslocamentoHorizontalM: -ref.erroHorizontalM(this.configuracao.arcoBaseM, e.posicaoM),
      velocidadeRadialMps: engenharia.velocidadeRadialMps, velocidadeTangencialMps: engenharia.velocidadeTangencialMps,
      atitudeLocalRad: engenharia.atitudeLocalRad, taxaAtitudeLocalRadps: ref.taxaAtitudeLocalRadps(e.velocidadeAngularRadps.z, e.posicaoM, e.velocidadeMps),
      alvoPousoLocalM: v.obterAlvo() - this.configuracao.arcoBaseM, erroAlvoM: ref.erroHorizontalM(v.obterAlvo(), e.posicaoM),
      empuxoN: v.propulsor.empuxoAtualN, vazaoKgS: v.propulsor.vazaoReagidaKgS, throttle: v.propulsor.throttleAtual,
      ignitado: v.propulsor.estaIgnitado, metanoKg: v.tanqueCombustivel.massaPropelenteKg, oxidanteKg: v.tanqueOxidante.massaPropelenteKg,
      energiaEletricaJ: v.bateria.energiaArmazenadaJ, sistemas: Object.fromEntries(SISTEMAS.map(s => [s, v.propulsor.sistemaEstaOperacional(s)])) as Record<SistemaBss, boolean>,
      integridadeMinima: Math.min(...v.objetos.map(o => o.integridadeEstrutural)),
      fixadores: v.fixadores.map(f => ({ id: f.id, estado: f.estado })),
      corpos: v.objetos.map(o => ({ id: o.id, estado: o.getEstadoFisico(), dimensoesM: { ...o.dimensoesM },
        massaKg: o.massaKg, integridade: o.integridadeEstrutural, temperaturaC: o.temperaturaC,
        deflexaoRad: v.aletasAerodinamicas.find(a => a === o)?.deflexaoAtualRad })),
      conexoesEletricas: [v.painel.conexaoCarga, v.propulsor.conexaoEletrica!, ...v.aletasAerodinamicas.map(a => a.conexaoEletrica)].map(c => ({
        id: c.id, fonteId: c.fonte.id, destinoId: c.destino.id,
        estado: c.estaRompida ? 'rompida' : c.estaDesconectada ? 'desconectada' : c.estaEnergizada ? 'energizada' : 'desligada',
      })),
      contatos: mundo.obterContatosComSuperficie(), pouso: { contatoInicial: this.contatoInicial, toqueRetorno: this.toqueRetorno,
        repousoGeometricoS: this.repousoS, maiorRepousoGeometricoS: this.maiorRepousoS,
        apoioBilateralObservado: this.bilateralObservado, apoioBilateralSustentadoS: this.bilateralS,
        maiorApoioBilateralSustentadoS: this.maiorBilateralS, pousoEstruturalmenteSeguro: this.seguro, limitesToqueAtendidos: this.limitesToque },
      objetivos: this.configuracao.ensaioAquatico ? [
        { id: 'entrada', descricao: 'Entrada física sem piso líquido', estado: this.obterEventos().some(e => e.tipo === 'entrada-na-agua') ? 'atingido' : 'pendente' },
        { id: 'flutuacao', descricao: 'Equilíbrio de forças e momentos por 3 s, sem propulsão', estado: this.acompanhamentoAquatico.observar(this.medidasAquaticas()).equilibrioObservado ? 'atingido' : 'pendente' },
        { id: 'integridade', descricao: 'Preservar integridade estrutural', estado: this.integridadeMinima < 1 ? 'falhou' : 'pendente' },
      ] : [
        { id: 'decolagem', descricao: 'Decolar por propulsão física', estado: this.decolou ? 'atingido' : 'pendente' },
        { id: 'subida', descricao: `Alcançar ${this.configuracao.altitudeTransicaoM} m`, estado: this.picoAltitudeM >= this.configuracao.altitudeTransicaoM ? 'atingido' : 'pendente' },
        { id: 'retorno', descricao: 'Tentar retorno e observar contato', estado: this.toqueRetorno ? 'atingido' : 'pendente' },
        { id: 'repouso-geometrico', descricao: 'Repouso geométrico contínuo por 3 s', estado: this.registrouRepouso ? 'atingido' : 'pendente' },
        { id: 'pouso-seguro', descricao: 'Integridade e apoio bilateral sustentado', estado: this.integridadeMinima < 1 ? 'falhou' : this.seguro ? 'atingido' : 'nao-qualificado' },
      ],
      diagnosticoMotor: engenharia.diagnosticoMotor, faseControlador: v.veiculo.obterUltimoComandoDeDescidaFuzzyPid().fase,
      gimbalRad: v.propulsor.obterEstadoDaVetorizacao().anguloAtualRad,
      sensores: { validos: leitura.sensoresValidos !== false, idadeS: leitura.idadeLeituraS ?? 0 },
      arbitragem: v.veiculo.obterSolicitacoesAplicadas().map(s => ({ ...s })), engenharia,
      cenario: { ancoraM: { ...this.ambiente.ancoraM }, centroTerraM: { ...this.ambiente.solo.centroM },
        ...('costa' in this.ambiente.solo ? { costa: (this.ambiente.solo as ReturnType<typeof criarAmbienteAmerissagem>['solo']).costa.configuracao } : {}),
        raioTerraM: this.ambiente.solo.raioM, arcoBaseM: this.configuracao.arcoBaseM,
        altitudeTransicaoM: this.configuracao.altitudeTransicaoM, modeloFisico: mundo.obterConfiguracaoFisica() },
    };
    return copiarSnapshot(observacao);
  }
  private medidasAquaticas(): MedidasAmerissagem {
    const v = this.veiculo, m = this.ambiente.mundo, e = v.veiculo.getEstadoFisico(), ref = m.ambiente.referencial;
    const conectados = v.veiculo.obterObjetosFisicosConectados();
    return { componentes: conectados.flatMap(o => m.obterImersao(o)), G: v.veiculo.centroDeMassaDoConjuntoM,
      massaKg: v.veiculo.massaInstantaneaDoConjuntoKg, gravidadeMps2: m.obterGravidadeMps2(e.posicaoM).magnitude,
      velocidadeMps: e.velocidadeMps.magnitude, velocidadeRadialMps: ref.vetorParaLocal(e.velocidadeMps, e.posicaoM).y,
      atitudeRad: ref.atitudeLocalRad(e.orientacaoRad.z, e.posicaoM), omegaRadps: e.velocidadeAngularRadps.z, empuxoMotorN: v.propulsor.empuxoAtualN,
      contatoSolido: conectados.some(o => m.obterContatosDoObjeto(o).some(c => c.emContatoGeometrico || c.impulsoNormalNs > 0)) };
  }
}
export const BSS006_VOO_EXPERIMENTAL = Object.freeze({ id: ID_MISSAO_BSS006,
  revisao: 'm10-voo-experimental-1', criar: (configuracao: ConfiguracaoMissaoBss006 = {}) => new MissaoBss006(configuracao) } satisfies DefinicaoMissao<ConfiguracaoMissaoBss006, ComandoBss006, ObservacaoBss006>);
export const BSS006_AMERISSAGEM_EXPERIMENTAL = Object.freeze({ id: ID_AMERISSAGEM_BSS006, revisao: 'm11-amerissagem-2',
  criar: (configuracao: ConfiguracaoMissaoBss006 = {}) => new MissaoBss006({ ...configuracao,
    ensaioAquatico: configuracao.ensaioAquatico ?? { inclinacaoInicialRad: 0.005, velocidadeInicialMps: 0.5, altitudeInicialM: 5 } }, ID_AMERISSAGEM_BSS006) });
