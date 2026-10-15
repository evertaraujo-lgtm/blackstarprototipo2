import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';

export interface ConfiguracaoControleDesaceleracao {
  readonly velocidadeInicioMps: number;
  readonly velocidadeVerticalAlvoMps: number;
  readonly altitudeMinimaM: number;
  readonly throttleSustentacao: number;
  readonly ganhoProporcional: number;
  readonly ganhoIntegral: number;
  readonly ganhoDerivativo: number;
  readonly taxaMaximaThrottlePorS: number;
}

export interface ComandoDesaceleracao {
  readonly ativo: boolean;
  readonly throttle: number;
  readonly velocidadeAlvoMps: number;
}

const PADRAO: ConfiguracaoControleDesaceleracao = {
  velocidadeInicioMps: 10, velocidadeVerticalAlvoMps: -7, altitudeMinimaM: 40,
  throttleSustentacao: 0.6, ganhoProporcional: 0.12, ganhoIntegral: 0.02,
  ganhoDerivativo: 0.01, taxaMaximaThrottlePorS: 2,
};
/** Devolve `Math.max(minimo, Math.min(maximo, valor))`. Efeitos indiretos seguem as dependências chamadas. @contract f-2df8a6ec72d97e33 */
const limitar = (valor: number, minimo: number, maximo: number): number => Math.max(minimo, Math.min(maximo, valor));

/** PID de velocidade que só atua na queda rápida acima da faixa de pouso. */
export class ControladorDesaceleracao {
  public readonly configuracao: ConfiguracaoControleDesaceleracao;
  private habilitado = false;
  private throttleAnterior = 0;
  private erroAnterior = 0;
  private integral = 0;

  /** Escritas diretas: `this.configuracao`. Dependências diretas: `Object.values(this.configuracao).every`, `Object.values`, `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-7e75241e4d879eae */
  public constructor(configuracao: Partial<ConfiguracaoControleDesaceleracao> = {}) {
    this.configuracao = { ...PADRAO, ...configuracao };
    if (!Object.values(this.configuracao).every(Number.isFinite)
      || this.configuracao.velocidadeInicioMps <= 0 || this.configuracao.velocidadeVerticalAlvoMps >= 0
      || this.configuracao.altitudeMinimaM < 0 || this.configuracao.throttleSustentacao < 0
      || this.configuracao.throttleSustentacao > 1 || this.configuracao.ganhoProporcional < 0
      || this.configuracao.ganhoIntegral < 0 || this.configuracao.ganhoDerivativo < 0
      || this.configuracao.taxaMaximaThrottlePorS <= 0) throw new Error('Configuração de desaceleração inválida.');
  }

  /** Escritas diretas: `this.habilitado`. Dependências diretas: `this.reiniciarPid`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0374cf69bea7156f */
  public habilitar(): void { this.habilitado = true; this.reiniciarPid(); }
  /** Escritas diretas: `this.habilitado`. Dependências diretas: `this.reiniciarPid`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-e41f13303b40de48 */
  public desabilitar(): void { this.habilitado = false; this.reiniciarPid(); }
  /** Devolve `this.habilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-718ecd848d205af8 */
  public get estaHabilitado(): boolean { return this.habilitado; }

  /** Escritas diretas: `this.integral`, `this.throttleAnterior`, `this.erroAnterior`. Dependências diretas: `this.reiniciarPid`, `limitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-e66370bab0970886 */
  public calcularComando(leituras: LeiturasVeiculoComposto, dtS: number): ComandoDesaceleracao {
    if (!this.habilitado || !Number.isFinite(dtS) || dtS <= 0) return { ativo: false, throttle: 0, velocidadeAlvoMps: 0 };
    const { altitudeM, velocidadeVerticalMps } = leituras;
    if (!Number.isFinite(altitudeM) || !Number.isFinite(velocidadeVerticalMps)) {
      this.reiniciarPid();
      return { ativo: false, throttle: 0, velocidadeAlvoMps: 0 };
    }
    const c = this.configuracao;
    if (altitudeM <= c.altitudeMinimaM || velocidadeVerticalMps > -c.velocidadeInicioMps) {
      this.reiniciarPid();
      return { ativo: false, throttle: 0, velocidadeAlvoMps: c.velocidadeVerticalAlvoMps };
    }
    const erro = c.velocidadeVerticalAlvoMps - velocidadeVerticalMps;
    const integralAnterior = this.integral;
    this.integral += erro * dtS;
    const saidaSemLimite = c.throttleSustentacao + c.ganhoProporcional * erro
      + c.ganhoIntegral * this.integral + c.ganhoDerivativo * (erro - this.erroAnterior) / dtS;
    const alvo = limitar(saidaSemLimite, 0, 1);
    if (alvo !== saidaSemLimite) this.integral = integralAnterior;
    const variacao = c.taxaMaximaThrottlePorS * dtS;
    this.throttleAnterior = limitar(alvo, this.throttleAnterior - variacao, this.throttleAnterior + variacao);
    this.erroAnterior = erro;
    return { ativo: true, throttle: this.throttleAnterior, velocidadeAlvoMps: c.velocidadeVerticalAlvoMps };
  }

  /** Escritas diretas: `this.throttleAnterior`, `this.erroAnterior`, `this.integral`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-6a3c02ab7cd11a61 */
  private reiniciarPid(): void { this.throttleAnterior = 0; this.erroAnterior = 0; this.integral = 0; }
}
