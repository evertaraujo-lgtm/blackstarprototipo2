/** Controlador PID de atitude no eixo planar, sem dependência do MundoFisico. */
export class ControladorInclinacaoPid {
  private erroAnteriorRad = 0;
  private integralErro = 0;
  private habilitado = false;

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

  public habilitar(): void {
    this.habilitado = true;
    this.integralErro = 0;
    this.erroAnteriorRad = 0;
  }

  public desabilitar(): void {
    this.habilitado = false;
    this.integralErro = 0;
    this.erroAnteriorRad = 0;
  }

  public get estaHabilitado(): boolean { return this.habilitado; }

  /** Retorna o comando de gimbal necessário para reduzir o erro de inclinação. */
  protected calcularComando(erroRad: number, dtS: number): number {
    if (!this.habilitado) return 0;
    if (!Number.isFinite(erroRad) || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Entrada do controlador PID inválida.');
    const derivadaErroRadPorS = (erroRad - this.erroAnteriorRad) / dtS;
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
