/** Resistor ideal em série, sem corpo ou temperatura próprios neste modelo concentrado. */
export class Resistor {
  /** Valida identidade e resistência finita não negativa em ohms; permite zero explicitamente sem calcular corrente nesta construção. @contract f-464f0a613325638b @reviewed M12-DOC: implementação lida. */
  public constructor(public readonly id: string, private readonly valorOhm: number) {
    if (!id || !Number.isFinite(valorOhm) || valorOhm < 0) throw new Error('Resistor exige identidade e resistência finita não negativa, em ohms.');
  }
  /** Devolve `this.valorOhm`. Efeitos indiretos seguem as dependências chamadas. @contract f-ea47a439f451d437 */
  public get resistenciaOhm(): number { return this.valorOhm; }
}
