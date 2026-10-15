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

  /** Valida curso m, velocidade m/s, força N e potência W positivos finitos; deriva limites X da pose inicial, instala cilindro e sincroniza comando. @contract f-73153b491956dc49 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly config: DefinicaoTravaPorta) {
    super(config);
    if (![config.cursoM, config.velocidadeMps, config.forcaMaximaN, config.potenciaRecuoW]
      .every(valor => Number.isFinite(valor) && valor > 0)) throw new Error('Definição da trava inválida.');
    this.xAvancadoM = this.getEstadoFisico().posicaoM.x;
    this.xRecuadoM = this.xAvancadoM - config.cursoM;
    this.instalarCilindro(new Cilindro({ velocidadeAvancoMps: config.velocidadeMps, velocidadeRecuoMps: config.velocidadeMps }));
    this.atualizarComando();
  }

  /** Devolve `Math.abs(this.getEstadoFisico().posicaoM.x - this.xAvancadoM) <= 0.01`. Dependências diretas: `this.getEstadoFisico`. Efeitos indiretos seguem as dependências chamadas. @contract f-92b56f02c10c9ad0 */
  public get estaAvancada(): boolean { return Math.abs(this.getEstadoFisico().posicaoM.x - this.xAvancadoM) <= 0.01; }
  /** Devolve `Math.abs(this.getEstadoFisico().posicaoM.x - this.xRecuadoM) <= 0.01`. Dependências diretas: `this.getEstadoFisico`. Efeitos indiretos seguem as dependências chamadas. @contract f-80cb2b6dd4ddfaa9 */
  public get estaRecuada(): boolean { return Math.abs(this.getEstadoFisico().posicaoM.x - this.xRecuadoM) <= 0.01; }
  /** Devolve `this.forcaAtualN`. Efeitos indiretos seguem as dependências chamadas. @contract f-af2750c97a2d9eaa */
  public get forcaAtualDaTravaN(): number { return this.forcaAtualN; }
  /** Devolve `this.recuoSolicitado ? 'recuar' : 'avancar'`. Efeitos indiretos seguem as dependências chamadas. @contract f-f0e48507b8c057bb */
  public get comandoAtual(): 'avancar' | 'recuar' { return this.recuoSolicitado ? 'recuar' : 'avancar'; }
  /** Exige trava avançada, altura retida, integridade/suporte e sobreposição horizontal; aceita distância vertical de -0,03 a 0,08 m. É envelope de apoio deste mecanismo local, não contato esférico genérico. @contract f-ee530e6e751a3407 @reviewed M12-DOC: implementação lida. */
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

  /** Detecta nova sequência operacional para iniciar recuo e liberar altura; sensor de porta aberta autoriza avanço, salvo fechamento. Atualiza selo/fins de curso sem mover trava. @contract f-ae5f6598a284f391 @reviewed M12-DOC: implementação lida. */
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

  /** Para dt positivo calcula servo implícito no eixo X limitado por força e integridade. Recuo consome energia elétrica; avanço usa mecanismo declarado. Registra altura a sustentar após avanço/porta aberta, sem corrigir pose. @contract f-fb51fc04b8452318 @reviewed M12-DOC: implementação lida. */
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

  /** Se suporte válido, solicita força +Y por peso padrão, mola de 80 kN/m e amortecimento crítico, limitada à capacidade. Modelo de bancada usa Y e g0 fixos; não é ancoragem cinemática nem hidrodinâmica. @contract f-ea33945378347a46 @reviewed M12-DOC: implementação lida. */
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

  /** Retorna força horizontal atual do mecanismo em N para integração do corpo da trava. @contract f-608dfb1b6c2d6288 @reviewed M12-DOC: implementação lida. */
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    return [{ forcaN: new Vetor3(this.forcaAtualN, 0, 0) }];
  }
  /** Retorna reação oposta à força horizontal e ao suporte vertical da porta; fecha par de esforços sem modificar batente diretamente. @contract f-c36df25d45b03cb4 @reviewed M12-DOC: implementação lida. */
  public obterReacaoNoBatente(): readonly ForcaFisicaSolicitada[] {
    const suporteN = this.obterForcasNaPorta()[0]?.forcaN.y ?? 0;
    return [{ forcaN: new Vetor3(-this.forcaAtualN, -suporteN, 0) }];
  }
}
