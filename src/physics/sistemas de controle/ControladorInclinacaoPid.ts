/** Controlador PID de atitude no eixo planar, sem dependência do MundoFisico. */
export class ControladorInclinacaoPid {
  private erroAnteriorRad: number | undefined;
  private integralErro = 0;
  private habilitado = false;

  /** Valida ganhos finitos/não negativos e limite de saída rad positivo; não instala atuador nem escreve atitude. @contract f-6fd33485b6c6ed80 @reviewed M12-DOC: implementação lida. */
  public constructor(
    private readonly ganhoProporcional = 1,
    private readonly ganhoIntegral = 0,
    private readonly ganhoDerivativo = 0,
    private readonly limiteSaidaRad = Math.PI / 12,
  ) {
    if (![ganhoProporcional, ganhoIntegral, ganhoDerivativo, limiteSaidaRad].every(Number.isFinite) ||
      ganhoProporcional < 0 || ganhoIntegral < 0 || ganhoDerivativo < 0 || limiteSaidaRad <= 0) {
      throw new Error('Ganhos e limite do controlador PID devem ser finitos e válidos.');
    }
  }

  /** Habilita PID e limpa integral/erro anterior. @contract f-10fd6d01a5a9d79b @reviewed M12-DOC: implementação lida. */
  public habilitar(): void {
    this.habilitado = true;
    this.integralErro = 0;
    this.erroAnteriorRad = undefined;
  }

  /** Desabilita PID e limpa memória transiente. @contract f-1f23e3c97c4df6ba @reviewed M12-DOC: implementação lida. */
  public desabilitar(): void {
    this.habilitado = false;
    this.integralErro = 0;
    this.erroAnteriorRad = undefined;
  }

  /** Consulta estado operacional do PID. @contract f-74cafd77f60d117a @reviewed M12-DOC: implementação lida. */
  public get estaHabilitado(): boolean { return this.habilitado; }

  /** Retorna o comando de gimbal necessário para reduzir o erro de inclinação.
   * @remarks Produz comando rad limitado para erro rad e dtS s positivo; derivada usa taxa medida rad/s quando fornecida, senão diferença temporal. Desabilitado retorna zero; desfaz incremento integral em saturação (anti-windup).
   * @contract f-77b552ea54018bb9
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public calcularComando(erroRad: number, dtS: number, velocidadeAngularRadps?: number): number {
    if (!this.habilitado) return 0;
    if (!Number.isFinite(erroRad) || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Entrada do controlador PID inválida.');
    if (velocidadeAngularRadps !== undefined && !Number.isFinite(velocidadeAngularRadps)) throw new Error('Velocidade angular inválida.');
    // Derivada da medição evita impulsos quando a referência muda. Sem sensor
    // angular, a primeira amostra somente estabelece a referência temporal.
    const derivadaErroRadPorS = velocidadeAngularRadps
      ?? (this.erroAnteriorRad === undefined ? 0 : (erroRad - this.erroAnteriorRad) / dtS);
    const integralAnterior = this.integralErro;
    this.integralErro += erroRad * dtS;
    const saidaNaoLimitada = this.ganhoProporcional * erroRad +
      this.ganhoIntegral * this.integralErro +
      this.ganhoDerivativo * derivadaErroRadPorS;
    const saida = Math.max(-this.limiteSaidaRad, Math.min(this.limiteSaidaRad, saidaNaoLimitada));
    if (saida !== saidaNaoLimitada) this.integralErro = integralAnterior;
    this.erroAnteriorRad = erroRad;
    return saida;
  }
}
