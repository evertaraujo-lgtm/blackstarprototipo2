/** Contatos de potência isolados da bobina CC; não transfere energia entre circuitos. */
export class Contator {
  private fechado = false;
  /** Armazena bobina com tensão V e potência W positivas finitas; não energiza contato automaticamente. @contract f-3376117ecdde8868 @reviewed M12-DOC: implementação lida. */
  public constructor(public readonly tensaoBobinaV = 24, public readonly potenciaBobinaW = 6) {
    if (![tensaoBobinaV, potenciaBobinaW].every(v => Number.isFinite(v) && v > 0)) throw new Error('Bobina exige tensão e potência positivas.');
  }
  /** Devolve `this.fechado`. Efeitos indiretos seguem as dependências chamadas. @contract f-bec825c4bd507c0f */
  public get estaFechado(): boolean { return this.fechado; }
  /** Para dt positivo s, fecha contato somente com autorização, tensão dentro de ±5% e energia J suficiente para potência vezes dt (tolerância 1e-10 J); caso contrário abre. Não retira energia da fonte nesta função. @contract f-54d88e5cb4a3e40c @reviewed M12-DOC: implementação lida. */
  public atualizarBobina(autorizada: boolean, tensaoV: number, energiaJ: number, dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0 || !Number.isFinite(tensaoV) || !Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Passo da bobina inválido.');
    this.fechado = autorizada && Math.abs(tensaoV - this.tensaoBobinaV) <= this.tensaoBobinaV * 0.05 && energiaJ >= this.potenciaBobinaW * dtS - 1e-10;
  }
  /** Abre contato de potência imediatamente; não altera conexões físicas nem apaga energia armazenada da fonte. @contract f-f1c066d01776d1ea @reviewed M12-DOC: implementação lida. */
  public desarmar(): void { this.fechado = false; }
}
