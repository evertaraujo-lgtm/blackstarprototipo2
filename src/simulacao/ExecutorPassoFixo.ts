export interface LimiteExecucaoPassos {
  readonly maxPassos: number;
  /** Orçamento da apresentação; jamais muda o dt físico. */
  readonly continuar?: /** Consulta se orçamento cooperativo ainda permite outro passo; false mantém dívida temporal, sem descartar integração pendente. @contract f-b5c741e87d68944a @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => boolean;
}

/**
 * Converte tempo de apresentação variável em passos iguais de tempo simulado.
 * Renderização e relógio real ficam fora do núcleo físico determinístico.
 */
export class ExecutorPassoFixo {
  private acumuladoS = 0;
  private ultimoInstanteRealMs?: number;

  /** Exige passo simulado e limite de delta real positivos finitos em s; não consulta relógio nem avança mundo na construção. @contract f-fd1a2d2565c3f4ad @reviewed M12-DOC: implementação lida. */
  public constructor(
    public readonly passoS: number,
    private readonly deltaRealMaximoS = 0.05,
    private readonly preservarTempoReal = false,
  ) {
    if (!Number.isFinite(passoS) || passoS <= 0) throw new Error('Passo fixo deve ser positivo e finito.');
    if (!Number.isFinite(deltaRealMaximoS) || deltaRealMaximoS <= 0) throw new Error('Delta real máximo deve ser positivo e finito.');
  }

  /** Retorna quantos passos físicos foram executados neste quadro.
   * @contract f-43accb474e314552
   */
  public avancar(deltaRealS: number, escalaTemporal: number, executarPasso: /** Executa callback síncrono de controle/física para um passo fixo em s; executor contabiliza somente passos executados, sem depender da frequência de desenho. @contract f-2331b1605705b104 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ (passoS: number) => void, limite?: LimiteExecucaoPassos): number {
    if (!Number.isFinite(deltaRealS) || deltaRealS < 0) throw new Error('Delta real deve ser finito e não negativo.');
    if (!Number.isFinite(escalaTemporal) || escalaTemporal <= 0) throw new Error('Escala temporal deve ser positiva e finita.');
    if (limite && (!Number.isSafeInteger(limite.maxPassos) || limite.maxPassos < 1)) throw new Error('Orçamento de passos inválido.');
    this.acumuladoS += (this.preservarTempoReal ? deltaRealS : Math.min(deltaRealS, this.deltaRealMaximoS)) * escalaTemporal;
    const quantidadePassos = Math.min(Math.floor((this.acumuladoS + Number.EPSILON * 8) / this.passoS), limite?.maxPassos ?? Infinity);
    let executados = 0;
    try {
      while (executados < quantidadePassos && (executados === 0 || !limite?.continuar || limite.continuar())) {
        executarPasso(this.passoS); executados++;
      }
    } finally {
      this.acumuladoS = Math.max(0, this.acumuladoS - executados * this.passoS);
    }
    return executados;
  }

  /**
   * Avança a partir de timestamps do requestAnimationFrame. O primeiro quadro
   * apenas estabelece a referência, e arredondamentos regressivos são ignorados.
   * @contract f-959c6d231a3a8516
   */
  public avancarAte(instanteRealMs: number, escalaTemporal: number, executarPasso: /** Executa callback síncrono de controle/física para um passo fixo em s; executor contabiliza somente passos executados, sem depender da frequência de desenho. @contract f-d12e9cd65db20741 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ (passoS: number) => void, limite?: LimiteExecucaoPassos): number {
    if (!Number.isFinite(instanteRealMs) || instanteRealMs < 0) throw new Error('Instante real deve ser finito e não negativo.');
    if (this.ultimoInstanteRealMs === undefined) {
      this.ultimoInstanteRealMs = instanteRealMs;
      return 0;
    }
    if (instanteRealMs <= this.ultimoInstanteRealMs) return 0;
    const deltaRealS = (instanteRealMs - this.ultimoInstanteRealMs) / 1_000;
    this.ultimoInstanteRealMs = instanteRealMs;
    return this.avancar(deltaRealS, escalaTemporal, executarPasso, limite);
  }

  /** Devolve `this.acumuladoS`. Efeitos indiretos seguem as dependências chamadas. @contract f-7d4f5893017d32c8 */
  public get tempoPendenteS(): number { return this.acumuladoS; }
  /** Pausa explícita exclui o relógio parado, preservando trabalho já acumulado.
   * @contract f-158c15b5ed7fb296
   */
  public suspenderReferenciaRelogio(): void { this.ultimoInstanteRealMs = undefined; }

  /** Zera dívida temporal e apaga referência de timestamp; próximo quadro estabelece nova origem sem avanço residual. @contract f-7205103b168f9360 @reviewed M12-DOC: implementação lida. */
  public reiniciar(): void {
    this.acumuladoS = 0;
    this.ultimoInstanteRealMs = undefined;
  }
}
