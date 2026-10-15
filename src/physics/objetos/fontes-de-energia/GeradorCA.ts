import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

export interface DefinicaoGeradorCA extends DefinicaoObjeto {
  readonly tensaoNominalV: number;
  readonly frequenciaHz: number;
  readonly potenciaNominalW: number;
  /** Reserva equivalente do acionamento mecânico; não é carga de bateria. */
  readonly energiaMecanicaInicialJ: number;
  readonly eficiencia: number;
}

/** Gerador monofásico em regime RMS, fator de potência unitário nesta etapa. */
export class GeradorCA extends Objeto {
  public readonly tipoCorrente = 'CA' as const;
  private ligado = false;
  private reservaJ: number;
  private disponivelJ = 0;
  private entregueJ = 0;
  private perdasPassoJ = 0;
  private dtS = 0;
  /** Inicializa corpo/fonte CA, valida tensão V, frequência Hz, potência W, eficiência (0,1] e reserva mecânica J não negativa; não fornece energia infinita. @contract f-692af7e2d7d6cffa @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly config: DefinicaoGeradorCA) {
    super(config);
    for (const v of [config.tensaoNominalV, config.frequenciaHz, config.potenciaNominalW, config.eficiencia]) {
      if (!Number.isFinite(v) || v <= 0) throw new Error('Parâmetros do gerador devem ser positivos e finitos.');
    }
    if (config.eficiencia > 1 || !Number.isFinite(config.energiaMecanicaInicialJ) || config.energiaMecanicaInicialJ < 0) throw new Error('Reserva ou eficiência inválida.');
    this.reservaJ = config.energiaMecanicaInicialJ;
  }
  /** Devolve `this.config.tensaoNominalV`. Efeitos indiretos seguem as dependências chamadas. @contract f-7918a305ac5ecd80 */
  public get tensaoNominalV(): number { return this.config.tensaoNominalV; }
  /** Devolve `this.config.frequenciaHz`. Efeitos indiretos seguem as dependências chamadas. @contract f-6c7462cec3947e93 */
  public get frequenciaHz(): number { return this.config.frequenciaHz; }
  /** Devolve `this.config.potenciaNominalW`. Efeitos indiretos seguem as dependências chamadas. @contract f-a1bf1e61bfd0f248 */
  public get potenciaNominalW(): number { return this.config.potenciaNominalW; }
  /** Devolve `this.ligado && this.integridadeEstrutural > 0 && this.reservaJ > 0`. Efeitos indiretos seguem as dependências chamadas. @contract f-825b08a8153bc5b8 */
  public get estaLigado(): boolean { return this.ligado && this.integridadeEstrutural > 0 && this.reservaJ > 0; }
  /** Devolve `!this.estaLigado`. Efeitos indiretos seguem as dependências chamadas. @contract f-0fb44aaccdeee90e */
  public get estaDescarregada(): boolean { return !this.estaLigado; }
  /** Devolve `this.reservaJ`. Efeitos indiretos seguem as dependências chamadas. @contract f-0e01593bc29e084c */
  public get energiaMecanicaRestanteJ(): number { return this.reservaJ; }
  /** Devolve `this.reservaJ * this.config.eficiencia`. Efeitos indiretos seguem as dependências chamadas. @contract f-3286ebef665d5a12 */
  public get energiaArmazenadaJ(): number { return this.reservaJ * this.config.eficiencia; }
  /** Devolve `this.estaLigado ? Math.min(this.disponivelJ, this.energiaArmazenadaJ) : 0`. Efeitos indiretos seguem as dependências chamadas. @contract f-4fec02850e72227c */
  public get energiaDisponivelNoPassoJ(): number { return this.estaLigado ? Math.min(this.disponivelJ, this.energiaArmazenadaJ) : 0; }
  /** Devolve `this.entregueJ`. Efeitos indiretos seguem as dependências chamadas. @contract f-be9673577ed0679f */
  public get energiaEletricaGeradaJ(): number { return this.entregueJ; }
  /** Ativa somente com integridade e reserva positivas; retorna disponibilidade operacional atual. @contract f-d64655978e5d05fc @reviewed M12-DOC: implementação lida. */
  public ligar(): boolean { this.ligado = this.integridadeEstrutural > 0 && this.reservaJ > 0; return this.estaLigado; }
  /** Desativa geração e zera orçamento disponível do passo, preservando reserva mecânica restante. @contract f-38cecfc76a3e86ea @reviewed M12-DOC: implementação lida. */
  public desligar(): void { this.ligado = false; this.disponivelJ = 0; }
  /** Valida dt positivo s, zera perdas do passo e calcula orçamento elétrico por potência×integridade×dt se ligado; não consome reserva antes de haver entrega. @contract f-bc3f153dcb6bb796 @reviewed M12-DOC: implementação lida. */
  public override prepararPassoEnergetico(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt do gerador inválido.');
    this.dtS = dtS; this.perdasPassoJ = 0;
    this.disponivelJ = this.estaLigado ? this.potenciaNominalW * this.integridadeEstrutural * dtS : 0;
    if (!this.estaLigado) this.ligado = false;
  }
  /** Valida pedido em J, limita à disponibilidade do passo/reserva e consome energia mecânica entregue/eficiência; acumula entrega e perdas sem criar energia. @contract f-209be506eb47acc7 @reviewed M12-DOC: implementação lida. */
  public fornecerEnergia(energiaJ: number): number {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia inválida.');
    const entregue = Math.min(energiaJ, this.energiaDisponivelNoPassoJ);
    const mecanica = entregue / this.config.eficiencia;
    this.reservaJ = Math.max(0, this.reservaJ - mecanica);
    this.disponivelJ = Math.max(0, this.disponivelJ - entregue);
    this.entregueJ += entregue; this.perdasPassoJ += mecanica - entregue;
    return entregue;
  }
  /** Devolve `this.dtS > 0 ? this.perdasPassoJ / this.dtS : 0`. Efeitos indiretos seguem as dependências chamadas. @contract f-29a79b7c8723509b */
  public override obterPotenciaTermicaGeradaW(): number { return this.dtS > 0 ? this.perdasPassoJ / this.dtS : 0; }
}
