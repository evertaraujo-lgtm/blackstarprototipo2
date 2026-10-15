/** Contato ideal: fechado conduz, aberto interrompe a alimentação. */
export class Interruptor {
  private fechado: boolean;
  /** Valida identidade e inicializa continuidade elétrica conforme comando inicial. @contract f-33f15af7abb38cd9 @reviewed M12-DOC: implementação lida. */
  public constructor(public readonly id: string, inicialmenteFechado = false) {
    if (!id) throw new Error('Interruptor exige identidade.');
    this.fechado = inicialmenteFechado;
  }
  /** Devolve `this.fechado`. Efeitos indiretos seguem as dependências chamadas. @contract f-74c168a2187a23a0 */
  public get estaFechado(): boolean { return this.fechado; }
  /** Interrompe continuidade do interruptor; não rompe o cabo nem modifica energia da fonte. @contract f-5874f99f89936ada @reviewed M12-DOC: implementação lida. */
  public abrir(): void { this.fechado = false; }
  /** Solicita continuidade do interruptor; disponibilidade efetiva ainda depende do restante do circuito. @contract f-22bfe0ed2f54802d @reviewed M12-DOC: implementação lida. */
  public fechar(): void { this.fechado = true; }
}
