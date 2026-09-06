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
  public constructor(private readonly config: DefinicaoGeradorCA) {
    super(config);
    for (const v of [config.tensaoNominalV, config.frequenciaHz, config.potenciaNominalW, config.eficiencia]) {
      if (!Number.isFinite(v) || v <= 0) throw new Error('Parâmetros do gerador devem ser positivos e finitos.');
    }
    if (config.eficiencia > 1 || !Number.isFinite(config.energiaMecanicaInicialJ) || config.energiaMecanicaInicialJ < 0) throw new Error('Reserva ou eficiência inválida.');
    this.reservaJ = config.energiaMecanicaInicialJ;
  }
  public get tensaoNominalV(): number { return this.config.tensaoNominalV; }
  public get frequenciaHz(): number { return this.config.frequenciaHz; }
  public get potenciaNominalW(): number { return this.config.potenciaNominalW; }
  public get estaLigado(): boolean { return this.ligado && this.integridadeEstrutural > 0 && this.reservaJ > 0; }
  public get estaDescarregada(): boolean { return !this.estaLigado; }
  public get energiaMecanicaRestanteJ(): number { return this.reservaJ; }
  public get energiaArmazenadaJ(): number { return this.reservaJ * this.config.eficiencia; }
  public get energiaDisponivelNoPassoJ(): number { return this.estaLigado ? Math.min(this.disponivelJ, this.energiaArmazenadaJ) : 0; }
  public get energiaEletricaGeradaJ(): number { return this.entregueJ; }
  public ligar(): boolean { this.ligado = this.integridadeEstrutural > 0 && this.reservaJ > 0; return this.estaLigado; }
  public desligar(): void { this.ligado = false; this.disponivelJ = 0; }
  public override prepararPassoEnergetico(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt do gerador inválido.');
    this.dtS = dtS; this.perdasPassoJ = 0;
    this.disponivelJ = this.estaLigado ? this.potenciaNominalW * this.integridadeEstrutural * dtS : 0;
    if (!this.estaLigado) this.ligado = false;
  }
  public fornecerEnergia(energiaJ: number): number {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia inválida.');
    const entregue = Math.min(energiaJ, this.energiaDisponivelNoPassoJ);
    const mecanica = entregue / this.config.eficiencia;
    this.reservaJ = Math.max(0, this.reservaJ - mecanica);
    this.disponivelJ = Math.max(0, this.disponivelJ - entregue);
    this.entregueJ += entregue; this.perdasPassoJ += mecanica - entregue;
    return entregue;
  }
  public override obterPotenciaTermicaGeradaW(): number { return this.dtS > 0 ? this.perdasPassoJ / this.dtS : 0; }
}
