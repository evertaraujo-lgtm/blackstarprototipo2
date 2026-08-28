import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

export interface DefinicaoBateria extends DefinicaoObjeto {
  /** Tensão nominal entregue aos consumidores, em V. */
  readonly tensaoNominalV: number;
  /** Energia máxima armazenável, em J. */
  readonly capacidadeEnergiaJ: number;
  /** Energia disponível no início da simulação, em J. */
  readonly energiaInicialJ: number;
}

/** Fonte elétrica física com carga finita; sua massa e integridade pertencem ao mundo. */
export class Bateria extends Objeto {
  private energiaAtualJ: number;

  public constructor(private readonly definicaoBateria: DefinicaoBateria) {
    super(definicaoBateria);
    if (!Number.isFinite(definicaoBateria.tensaoNominalV) || definicaoBateria.tensaoNominalV <= 0 ||
      !Number.isFinite(definicaoBateria.capacidadeEnergiaJ) || definicaoBateria.capacidadeEnergiaJ <= 0 ||
      !Number.isFinite(definicaoBateria.energiaInicialJ) || definicaoBateria.energiaInicialJ < 0 ||
      definicaoBateria.energiaInicialJ > definicaoBateria.capacidadeEnergiaJ) {
      throw new Error('Definição de bateria inválida.');
    }
    this.energiaAtualJ = definicaoBateria.energiaInicialJ;
  }

  public get tensaoNominalV(): number { return this.definicaoBateria.tensaoNominalV; }
  public get capacidadeEnergiaJ(): number { return this.definicaoBateria.capacidadeEnergiaJ; }
  public get energiaArmazenadaJ(): number { return this.energiaAtualJ; }
  public get energiaConsumidaJ(): number { return this.capacidadeEnergiaInicialJ - this.energiaAtualJ; }
  public get percentualDeCarga(): number { return this.energiaAtualJ / this.capacidadeEnergiaJ; }
  public get estaDescarregada(): boolean { return this.energiaAtualJ === 0; }

  /** Entrega somente a energia efetivamente armazenada, em J. */
  public fornecerEnergia(energiaSolicitadaJ: number): number {
    if (!Number.isFinite(energiaSolicitadaJ) || energiaSolicitadaJ < 0) throw new Error('Energia solicitada inválida.');
    const fornecida = Math.min(energiaSolicitadaJ, this.energiaAtualJ);
    this.energiaAtualJ -= fornecida;
    return fornecida;
  }

  private get capacidadeEnergiaInicialJ(): number { return this.definicaoBateria.energiaInicialJ; }
}
