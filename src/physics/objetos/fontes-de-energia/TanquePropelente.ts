import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

export interface DefinicaoTanquePropelente extends DefinicaoObjeto {
  readonly tipoPropelente: string;
  readonly capacidadePropelenteKg: number;
  readonly massaPropelenteInicialKg: number;
}

/** Tanque físico: o propelente compõe sua massa instantânea. */
export class TanquePropelente extends Objeto {
  private massaPropelenteAtualKg: number;
  public constructor(private readonly definicaoTanque: DefinicaoTanquePropelente) {
    super(definicaoTanque);
    if (!definicaoTanque.tipoPropelente || definicaoTanque.capacidadePropelenteKg <= 0 || definicaoTanque.massaPropelenteInicialKg < 0 || definicaoTanque.massaPropelenteInicialKg > definicaoTanque.capacidadePropelenteKg) throw new Error('Definição de tanque inválida.');
    this.massaPropelenteAtualKg = definicaoTanque.massaPropelenteInicialKg;
    this.definirMassaVariavelKg(this.massaPropelenteAtualKg);
  }
  public get tipoPropelente(): string { return this.definicaoTanque.tipoPropelente; }
  public get massaPropelenteKg(): number { return this.massaPropelenteAtualKg; }
  public get massaPropelenteInicialKg(): number { return this.definicaoTanque.massaPropelenteInicialKg; }
  public get massaPropelenteConsumidaKg(): number { return this.massaPropelenteInicialKg - this.massaPropelenteAtualKg; }
  public fornecerPropelente(massaSolicitadaKg: number): number {
    if (!Number.isFinite(massaSolicitadaKg) || massaSolicitadaKg < 0) throw new Error('Massa solicitada inválida.');
    const fornecida = Math.min(massaSolicitadaKg, this.massaPropelenteAtualKg);
    this.massaPropelenteAtualKg -= fornecida;
    this.definirMassaVariavelKg(this.massaPropelenteAtualKg);
    return fornecida;
  }
}
