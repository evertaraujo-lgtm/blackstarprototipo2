/** Contatos de potência isolados da bobina CC; não transfere energia entre circuitos. */
export class Contator {
  private fechado = false;
  public constructor(public readonly tensaoBobinaV = 24, public readonly potenciaBobinaW = 6) {
    if (![tensaoBobinaV, potenciaBobinaW].every(v => Number.isFinite(v) && v > 0)) throw new Error('Bobina exige tensão e potência positivas.');
  }
  public get estaFechado(): boolean { return this.fechado; }
  public atualizarBobina(autorizada: boolean, tensaoV: number, energiaJ: number, dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0 || !Number.isFinite(tensaoV) || !Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Passo da bobina inválido.');
    this.fechado = autorizada && Math.abs(tensaoV - this.tensaoBobinaV) <= this.tensaoBobinaV * 0.05 && energiaJ >= this.potenciaBobinaW * dtS - 1e-10;
  }
  public desarmar(): void { this.fechado = false; }
}
