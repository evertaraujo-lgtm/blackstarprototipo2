/**
 * Converte tempo de apresentação variável em passos iguais de tempo simulado.
 * Renderização e relógio real ficam fora do núcleo físico determinístico.
 */
export class ExecutorPassoFixo {
  private acumuladoS = 0;
  private ultimoInstanteRealMs?: number;

  public constructor(
    public readonly passoS: number,
    private readonly deltaRealMaximoS = 0.05,
  ) {
    if (!Number.isFinite(passoS) || passoS <= 0) throw new Error('Passo fixo deve ser positivo e finito.');
    if (!Number.isFinite(deltaRealMaximoS) || deltaRealMaximoS <= 0) throw new Error('Delta real máximo deve ser positivo e finito.');
  }

  /** Retorna quantos passos físicos foram executados neste quadro. */
  public avancar(deltaRealS: number, escalaTemporal: number, executarPasso: (passoS: number) => void): number {
    if (!Number.isFinite(deltaRealS) || deltaRealS < 0) throw new Error('Delta real deve ser finito e não negativo.');
    if (!Number.isFinite(escalaTemporal) || escalaTemporal <= 0) throw new Error('Escala temporal deve ser positiva e finita.');
    this.acumuladoS += Math.min(deltaRealS, this.deltaRealMaximoS) * escalaTemporal;
    const quantidadePassos = Math.floor((this.acumuladoS + Number.EPSILON * 8) / this.passoS);
    for (let indice = 0; indice < quantidadePassos; indice += 1) executarPasso(this.passoS);
    this.acumuladoS = Math.max(0, this.acumuladoS - quantidadePassos * this.passoS);
    return quantidadePassos;
  }

  /**
   * Avança a partir de timestamps do requestAnimationFrame. O primeiro quadro
   * apenas estabelece a referência, e arredondamentos regressivos são ignorados.
   */
  public avancarAte(instanteRealMs: number, escalaTemporal: number, executarPasso: (passoS: number) => void): number {
    if (!Number.isFinite(instanteRealMs) || instanteRealMs < 0) throw new Error('Instante real deve ser finito e não negativo.');
    if (this.ultimoInstanteRealMs === undefined) {
      this.ultimoInstanteRealMs = instanteRealMs;
      return 0;
    }
    if (instanteRealMs <= this.ultimoInstanteRealMs) return 0;
    const deltaRealS = (instanteRealMs - this.ultimoInstanteRealMs) / 1_000;
    this.ultimoInstanteRealMs = instanteRealMs;
    return this.avancar(deltaRealS, escalaTemporal, executarPasso);
  }

  public reiniciar(): void {
    this.acumuladoS = 0;
    this.ultimoInstanteRealMs = undefined;
  }
}
