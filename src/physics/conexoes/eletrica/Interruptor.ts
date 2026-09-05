/** Contato ideal: fechado conduz, aberto interrompe a alimentação. */
export class Interruptor {
  private fechado: boolean;
  public constructor(public readonly id: string, inicialmenteFechado = false) {
    if (!id) throw new Error('Interruptor exige identidade.');
    this.fechado = inicialmenteFechado;
  }
  public get estaFechado(): boolean { return this.fechado; }
  public abrir(): void { this.fechado = false; }
  public fechar(): void { this.fechado = true; }
}
