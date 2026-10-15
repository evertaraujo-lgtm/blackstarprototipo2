/** Contato ideal: fechado conduz, aberto interrompe a alimentação. */
export class Interruptor {
  private fechado: boolean;
  /** Escritas diretas: `this.id`, `this.fechado`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-33f15af7abb38cd9 */
  public constructor(public readonly id: string, inicialmenteFechado = false) {
    if (!id) throw new Error('Interruptor exige identidade.');
    this.fechado = inicialmenteFechado;
  }
  /** Devolve `this.fechado`. Efeitos indiretos seguem as dependências chamadas. @contract f-74c168a2187a23a0 */
  public get estaFechado(): boolean { return this.fechado; }
  /** Escritas diretas: `this.fechado`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-5874f99f89936ada */
  public abrir(): void { this.fechado = false; }
  /** Escritas diretas: `this.fechado`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-22bfe0ed2f54802d */
  public fechar(): void { this.fechado = true; }
}
