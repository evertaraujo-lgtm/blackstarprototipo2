/** Contatos de potência isolados da bobina CC; não transfere energia entre circuitos. */
export class Contator {
  private fechado = false;
  /** Escritas diretas: `this.tensaoBobinaV`, `this.potenciaBobinaW`. Dependências diretas: `[tensaoBobinaV, potenciaBobinaW].every`, `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-3376117ecdde8868 */
  public constructor(public readonly tensaoBobinaV = 24, public readonly potenciaBobinaW = 6) {
    if (![tensaoBobinaV, potenciaBobinaW].every(v => Number.isFinite(v) && v > 0)) throw new Error('Bobina exige tensão e potência positivas.');
  }
  /** Devolve `this.fechado`. Efeitos indiretos seguem as dependências chamadas. @contract f-bec825c4bd507c0f */
  public get estaFechado(): boolean { return this.fechado; }
  /** Escritas diretas: `this.fechado`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-54d88e5cb4a3e40c */
  public atualizarBobina(autorizada: boolean, tensaoV: number, energiaJ: number, dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0 || !Number.isFinite(tensaoV) || !Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Passo da bobina inválido.');
    this.fechado = autorizada && Math.abs(tensaoV - this.tensaoBobinaV) <= this.tensaoBobinaV * 0.05 && energiaJ >= this.potenciaBobinaW * dtS - 1e-10;
  }
  /** Escritas diretas: `this.fechado`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-f1c066d01776d1ea */
  public desarmar(): void { this.fechado = false; }
}
