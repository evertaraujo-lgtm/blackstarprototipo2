import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

export interface ConfiguracaoDescidaFuzzyPid {
  readonly altitudeAlvoM: number;
  readonly altitudeTransicaoM: number;
  readonly velocidadeDescidaMaximaMps: number;
  readonly velocidadeToqueMps: number;
  readonly empuxoMaximoN: number;
  readonly ganhoProporcionalThrottlePorMps: number;
  readonly ganhoIntegralThrottlePorM: number;
  readonly ganhoDerivativoThrottleSegundosPorM: number;
  readonly taxaMaximaThrottlePorS: number;
  readonly erroParaEmpuxoMaximoMps: number;
  /** Inclinação-alvo por velocidade horizontal durante a descida, em rad/(m/s). */
  readonly ganhoAtitudePorVelocidadeHorizontalRadPorMps?: number;
}

export type FaseDescidaFuzzyPid =
  | 'inativo'
  | 'aproximacao'
  | 'frenagem'
  | 'toque'
  | 'aguardando-descida'
  | 'falha-de-sensores';

export interface ComandoDescidaFuzzyPid {
  readonly fase: FaseDescidaFuzzyPid;
  readonly throttle: number;
  readonly velocidadeVerticalAlvoMps: number;
  readonly altitudeRestanteM: number;
  readonly massaInstantaneaKg: number;
}

const GRAVIDADE_MPS2 = 9.80665;
const limitar = (valor: number, minimo: number, maximo: number): number => Math.max(minimo, Math.min(maximo, valor));

/**
 * Agenda a velocidade de descida por pertinência fuzzy de altitude e usa PID
 * com compensação de peso para comandar o throttle. O controlador só solicita
 * atuação; movimento e contato continuam sob autoridade do MundoFisico.
 */
export class ControladorDescidaFuzzyPidDePropulsores implements ControladorDeVoo {
  public readonly id = 'bss04-pouso-fuzzy-pid';
  public readonly prioridade = 100;
  private habilitado = false;
  private idsPropulsores: readonly string[] = [];
  private configuracao?: ConfiguracaoDescidaFuzzyPid;
  private throttleAnterior = 0;
  private integralErro = 0;
  private erroAnterior = 0;
  private comandoAtual: ComandoDescidaFuzzyPid = {
    fase: 'inativo', throttle: 0, velocidadeVerticalAlvoMps: 0, altitudeRestanteM: 0, massaInstantaneaKg: 0,
  };

  public configurar(configuracao: ConfiguracaoDescidaFuzzyPid, idsPropulsores: readonly string[]): void {
    this.validarConfiguracao(configuracao);
    if (idsPropulsores.length === 0 || new Set(idsPropulsores).size !== idsPropulsores.length) {
      throw new Error('O controle de pouso exige uma lista não vazia de propulsores sem duplicatas.');
    }
    this.configuracao = { ...configuracao };
    this.idsPropulsores = [...idsPropulsores];
    this.reiniciar();
  }

  public habilitar(): void {
    if (!this.configuracao) throw new Error('Configure o controle de pouso antes de habilitá-lo.');
    this.habilitado = true;
    this.reiniciar();
  }

  public desabilitar(): void {
    this.habilitado = false;
    this.reiniciar();
    this.comandoAtual = { ...this.comandoAtual, fase: 'inativo', throttle: 0 };
  }

  public get estaHabilitado(): boolean { return this.habilitado; }
  public obterUltimoComando(): ComandoDescidaFuzzyPid { return { ...this.comandoAtual }; }

  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!this.habilitado || !this.configuracao) return [];
    const comando = this.calcularComando(leituras, dtS);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'throttle', valor: comando.throttle }));
  }

  public calcularComando(leituras: LeiturasVeiculoComposto, dtS: number): ComandoDescidaFuzzyPid {
    const c = this.configuracao;
    if (!this.habilitado || !c) return this.obterUltimoComando();
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo do controle de pouso deve ser positivo e finito.');
    const massaKg = leituras.massaInstantaneaKg ?? 0;
    const entradas = [leituras.altitudeM, leituras.velocidadeVerticalMps, massaKg];
    if (!entradas.every(Number.isFinite) || massaKg <= 0) {
      this.reiniciar();
      this.comandoAtual = {
        fase: 'falha-de-sensores', throttle: 0, velocidadeVerticalAlvoMps: 0,
        altitudeRestanteM: 0, massaInstantaneaKg: 0,
      };
      return this.obterUltimoComando();
    }

    const altitudeRestanteM = Math.max(0, leituras.altitudeM - c.altitudeAlvoM);
    // Pertinência linear: em altitude alta, velocidade máxima; perto do solo,
    // o alvo converge suavemente para a velocidade definida para o toque.
    const pertinenciaAltitudeAlta = limitar(altitudeRestanteM / c.altitudeTransicaoM, 0, 1);
    const velocidadeAlvoDescidaMps = c.velocidadeToqueMps
      + pertinenciaAltitudeAlta * (c.velocidadeDescidaMaximaMps - c.velocidadeToqueMps);
    const velocidadeVerticalAlvoMps = -velocidadeAlvoDescidaMps;

    if (altitudeRestanteM <= 0.01 && leituras.velocidadeVerticalMps >= -c.velocidadeToqueMps) {
      this.reiniciar();
      this.comandoAtual = {
        fase: 'toque', throttle: 0, velocidadeVerticalAlvoMps,
        altitudeRestanteM, massaInstantaneaKg: massaKg,
      };
      return this.obterUltimoComando();
    }

    // Se há velocidade de subida, o motor não pode mantê-la nem ampliá-la.
    // A gravidade retoma a descida; o PID reinicia para não acumular integral.
    if (leituras.velocidadeVerticalMps >= 0) {
      this.reiniciar();
      this.comandoAtual = {
        fase: 'aguardando-descida', throttle: 0, velocidadeVerticalAlvoMps,
        altitudeRestanteM, massaInstantaneaKg: massaKg,
      };
      return this.obterUltimoComando();
    }

    const erroVelocidadeMps = velocidadeVerticalAlvoMps - leituras.velocidadeVerticalMps;
    if (erroVelocidadeMps >= c.erroParaEmpuxoMaximoMps) {
      // Queda bem acima da curva segura: freio máximo imediato, sem rampa.
      this.throttleAnterior = 1;
      this.integralErro = 0;
      this.erroAnterior = erroVelocidadeMps;
      this.comandoAtual = {
        fase: altitudeRestanteM > c.altitudeTransicaoM ? 'aproximacao' : 'frenagem',
        throttle: 1, velocidadeVerticalAlvoMps, altitudeRestanteM, massaInstantaneaKg: massaKg,
      };
      return this.obterUltimoComando();
    }

    const erroIntegralAnterior = this.integralErro;
    this.integralErro += erroVelocidadeMps * dtS;
    const reentradaDoControle = this.comandoAtual.fase === 'inativo'
      || this.comandoAtual.fase === 'aguardando-descida'
      || this.comandoAtual.fase === 'falha-de-sensores';
    const derivadaErroPorS = reentradaDoControle ? 0 : (erroVelocidadeMps - this.erroAnterior) / dtS;
    const throttleSustentacao = massaKg * GRAVIDADE_MPS2 / c.empuxoMaximoN;
    const throttleSemLimite = throttleSustentacao
      + c.ganhoProporcionalThrottlePorMps * erroVelocidadeMps
      + c.ganhoIntegralThrottlePorM * this.integralErro
      + c.ganhoDerivativoThrottleSegundosPorM * derivadaErroPorS;
    const throttleAlvo = limitar(throttleSemLimite, 0, 1);
    if (throttleAlvo !== throttleSemLimite) this.integralErro = erroIntegralAnterior;
    const variacaoMaxima = c.taxaMaximaThrottlePorS * dtS;
    const throttle = limitar(throttleAlvo, this.throttleAnterior - variacaoMaxima, this.throttleAnterior + variacaoMaxima);
    this.throttleAnterior = limitar(throttle, 0, 1);
    this.erroAnterior = erroVelocidadeMps;
    this.comandoAtual = {
      fase: altitudeRestanteM > c.altitudeTransicaoM ? 'aproximacao' : 'frenagem',
      throttle: this.throttleAnterior, velocidadeVerticalAlvoMps, altitudeRestanteM, massaInstantaneaKg: massaKg,
    };
    return this.obterUltimoComando();
  }

  private reiniciar(): void {
    this.throttleAnterior = 0;
    this.integralErro = 0;
    this.erroAnterior = 0;
  }

  private validarConfiguracao(c: ConfiguracaoDescidaFuzzyPid): void {
    const valores = Object.values(c).filter((valor): valor is number => valor !== undefined);
    if (!valores.every(Number.isFinite)
      || c.altitudeAlvoM < 0 || c.altitudeTransicaoM <= 0
      || c.velocidadeDescidaMaximaMps <= 0 || c.velocidadeToqueMps <= 0
      || c.velocidadeToqueMps >= c.velocidadeDescidaMaximaMps
      || c.empuxoMaximoN <= 0 || c.ganhoProporcionalThrottlePorMps < 0
      || c.ganhoIntegralThrottlePorM < 0 || c.ganhoDerivativoThrottleSegundosPorM < 0
      || c.taxaMaximaThrottlePorS <= 0 || c.erroParaEmpuxoMaximoMps <= 0
      || (c.ganhoAtitudePorVelocidadeHorizontalRadPorMps ?? 0.01) < 0) {
      throw new Error('Configuração inválida para o controle de pouso fuzzy-PID.');
    }
  }
}
