/** Resistor ideal em série, sem corpo ou temperatura próprios neste modelo concentrado. */
export class Resistor {
  /** Escritas diretas: `this.id`, `this.valorOhm`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-464f0a613325638b */
  public constructor(public readonly id: string, private readonly valorOhm: number) {
    if (!id || !Number.isFinite(valorOhm) || valorOhm < 0) throw new Error('Resistor exige identidade e resistência finita não negativa, em ohms.');
  }
  /** Devolve `this.valorOhm`. Efeitos indiretos seguem as dependências chamadas. @contract f-ea47a439f451d437 */
  public get resistenciaOhm(): number { return this.valorOhm; }
}
