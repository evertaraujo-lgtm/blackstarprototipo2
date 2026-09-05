/** Resistor ideal em série, sem corpo ou temperatura próprios neste modelo concentrado. */
export class Resistor {
  public constructor(public readonly id: string, private readonly valorOhm: number) {
    if (!id || !Number.isFinite(valorOhm) || valorOhm < 0) throw new Error('Resistor exige identidade e resistência finita não negativa, em ohms.');
  }
  public get resistenciaOhm(): number { return this.valorOhm; }
}
