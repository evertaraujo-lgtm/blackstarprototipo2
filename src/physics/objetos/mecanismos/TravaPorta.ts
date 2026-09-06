import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Vetor3 } from '../../Vetor3';
import { Cilindro, ComCilindro } from '../atuadores/Cilindro';
import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada } from '../base/Objeto';

export interface DefinicaoTravaPorta extends DefinicaoObjeto {
  readonly batente: Objeto;
  readonly porta: () => Objeto;
  readonly conexaoComando: ConexaoEletrica;
  readonly sensorPortaAberta: () => boolean;
  readonly obterUltimoComandoOperacional: () => { readonly sequencia: number; readonly comando: 'abrir' | 'fechar' | 'parar' } | undefined;
  readonly cursoM: number;
  readonly velocidadeMps: number;
  readonly forcaMaximaN: number;
  readonly potenciaRecuoW: number;
  readonly apoioEstruturalDisponivel?: () => boolean;
}

/**
 * Ferrolho fail-safe: é um Objeto que incorpora Cilindro. A mola o mantém
 * avançado sem energia; o circuito CC energiza apenas o recuo.
 */
export class TravaPorta extends ComCilindro(Objeto) {
  private readonly xAvancadoM: number;
  private readonly xRecuadoM: number;
  private forcaAtualN = 0;
  private recuoSolicitado = false;
  private alturaRetidaM?: number;
  private ultimaSequenciaDeMovimento = 0;
  private comandoOperacionalAtual: 'abrir' | 'fechar' | 'parar' = 'parar';

  public constructor(private readonly config: DefinicaoTravaPorta) {
    super(config);
    if (![config.cursoM, config.velocidadeMps, config.forcaMaximaN, config.potenciaRecuoW]
      .every(valor => Number.isFinite(valor) && valor > 0)) throw new Error('Definição da trava inválida.');
    this.xAvancadoM = this.getEstadoFisico().posicaoM.x;
    this.xRecuadoM = this.xAvancadoM - config.cursoM;
    this.instalarCilindro(new Cilindro({ velocidadeAvancoMps: config.velocidadeMps, velocidadeRecuoMps: config.velocidadeMps }));
    this.atualizarComando();
  }

  public get estaAvancada(): boolean { return Math.abs(this.getEstadoFisico().posicaoM.x - this.xAvancadoM) <= 0.01; }
  public get estaRecuada(): boolean { return Math.abs(this.getEstadoFisico().posicaoM.x - this.xRecuadoM) <= 0.01; }
  public get forcaAtualDaTravaN(): number { return this.forcaAtualN; }
  public get comandoAtual(): 'avancar' | 'recuar' { return this.recuoSolicitado ? 'recuar' : 'avancar'; }
  public get estaSustentandoPorta(): boolean {
    if (!this.estaAvancada || this.alturaRetidaM === undefined || this.integridadeEstrutural === 0
      || this.config.apoioEstruturalDisponivel?.() === false) return false;
    const porta = this.config.porta();
    const estadoTrava = this.getEstadoFisico();
    const estadoPorta = porta.getEstadoFisico();
    const sobreposicaoHorizontalM = (this.dimensoesM.x + porta.dimensoesM.x) / 2 - Math.abs(estadoTrava.posicaoM.x - estadoPorta.posicaoM.x);
    const topoTravaM = estadoTrava.posicaoM.y + this.dimensoesM.y / 2;
    const basePortaM = estadoPorta.posicaoM.y - porta.dimensoesM.y / 2;
    const distanciaVerticalM = basePortaM - topoTravaM;
    return sobreposicaoHorizontalM > 0 && distanciaVerticalM >= -0.03 && distanciaVerticalM <= 0.08;
  }

  private atualizarComando(): void {
    const comandoIniciado = this.config.obterUltimoComandoOperacional();
    if (comandoIniciado && comandoIniciado.sequencia !== this.ultimaSequenciaDeMovimento) {
      this.ultimaSequenciaDeMovimento = comandoIniciado.sequencia;
      this.comandoOperacionalAtual = comandoIniciado.comando;
      this.recuoSolicitado = comandoIniciado.comando !== 'parar';
      this.alturaRetidaM = undefined;
    }
    // O comando de abrir inicia o recuo uma vez. Depois, o sensor aberto
    // autoriza o avanço da trava mesmo que abrir continue selado na porta.
    if (this.comandoOperacionalAtual !== 'fechar' && this.config.sensorPortaAberta()) this.recuoSolicitado = false;
    const avancar = this.config.sensorPortaAberta() && this.comandoOperacionalAtual !== 'fechar';
    this.definirEntradas({ avancar: avancar && !this.recuoSolicitado, recuar: this.recuoSolicitado,
      avancado: this.estaAvancada, recuado: this.estaRecuada });
  }

  public override prepararPassoOperacional(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt da trava deve ser positivo e finito.');
    this.atualizarComando();
    const estado = this.getEstadoFisico();
    const alvoM = this.recuoSolicitado ? this.xRecuadoM : this.xAvancadoM;
    const erroM = alvoM - estado.posicaoM.x;
    const velocidadeAlvoMps = Math.sign(erroM) * Math.min(this.config.velocidadeMps, Math.abs(erroM) / dtS);
    const ganhoNPorMps = this.config.forcaMaximaN / this.config.velocidadeMps;
    const inversaMassaEfetiva = 1 / this.massaKg + 1 / this.config.batente.massaKg;
    let forcaN = Math.max(-this.config.forcaMaximaN, Math.min(this.config.forcaMaximaN,
      (velocidadeAlvoMps - estado.velocidadeMps.x) * ganhoNPorMps /
        (1 + inversaMassaEfetiva * ganhoNPorMps * dtS)));
    if (this.recuoSolicitado) {
      const energiaSolicitadaJ = this.config.potenciaRecuoW * dtS;
      const energiaJ = this.config.conexaoComando.estaEnergizada
        ? this.config.conexaoComando.fornecerEnergia(energiaSolicitadaJ) : 0;
      forcaN *= energiaSolicitadaJ === 0 ? 0 : energiaJ / energiaSolicitadaJ;
    }
    this.forcaAtualN = forcaN * Math.min(this.integridadeEstrutural, this.config.batente.integridadeEstrutural);
    if (this.estaAvancada && this.config.sensorPortaAberta() && !this.recuoSolicitado) {
      this.alturaRetidaM ??= this.config.porta().getEstadoFisico().posicaoM.y;
    } else if (this.recuoSolicitado) this.alturaRetidaM = undefined;
  }

  public obterForcasNaPorta(): readonly ForcaFisicaSolicitada[] {
    if (!this.estaSustentandoPorta) return [];
    const alturaRetidaM = this.alturaRetidaM;
    if (alturaRetidaM === undefined) return [];
    const porta = this.config.porta();
    const estado = porta.getEstadoFisico();
    const rigidezNPorM = 80_000;
    const amortecimentoNsPorM = 2 * Math.sqrt(rigidezNPorM * porta.massaKg);
    const suporteN = Math.max(0, Math.min(this.config.forcaMaximaN,
      porta.massaKg * 9.80665 + (alturaRetidaM - estado.posicaoM.y) * rigidezNPorM - estado.velocidadeMps.y * amortecimentoNsPorM));
    return [{ forcaN: new Vetor3(0, suporteN, 0) }];
  }

  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    return [{ forcaN: new Vetor3(this.forcaAtualN, 0, 0) }];
  }
  public obterReacaoNoBatente(): readonly ForcaFisicaSolicitada[] {
    const suporteN = this.obterForcasNaPorta()[0]?.forcaN.y ?? 0;
    return [{ forcaN: new Vetor3(-this.forcaAtualN, -suporteN, 0) }];
  }
}
