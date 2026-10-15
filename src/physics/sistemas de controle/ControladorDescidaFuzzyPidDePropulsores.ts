import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { IDADE_MAXIMA_LEITURA_SENSOR_S } from '../sensores/SensoresVeiculoComposto';
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
  /** Sensor de contato físico opcional; quando presente, altitude sozinha não autoriza cortar o motor. */
  readonly obterContatoComSolo?: () => boolean;
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
/** Satura escalar no intervalo fechado [mínimo,máximo], sem modificar ganhos ou estados físicos. @contract f-4df50faf6e900cbd @reviewed M12-DOC: implementação lida. */
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

  /** Valida ganhos/envelope SI e lista de motores não vazia/única; copia configuração e IDs e limpa memória PID. @contract f-d85233dae6573762 @reviewed M12-DOC: implementação lida. */
  public configurar(configuracao: ConfiguracaoDescidaFuzzyPid, idsPropulsores: readonly string[]): void {
    this.validarConfiguracao(configuracao);
    if (idsPropulsores.length === 0 || new Set(idsPropulsores).size !== idsPropulsores.length) {
      throw new Error('O controle de pouso exige uma lista não vazia de propulsores sem duplicatas.');
    }
    this.configuracao = { ...configuracao };
    this.idsPropulsores = [...idsPropulsores];
    this.reiniciar();
  }

  /** Exige configuração prévia e habilita controle com memória reiniciada. @contract f-bd460279a707c15d @reviewed M12-DOC: implementação lida. */
  public habilitar(): void {
    if (!this.configuracao) throw new Error('Configure o controle de pouso antes de habilitá-lo.');
    this.habilitado = true;
    this.reiniciar();
  }

  /** Desabilita, limpa memória e registra saída inativa/throttle zero; a aplicação da saída permanece no computador. @contract f-e4a9a77a1864fdaf @reviewed M12-DOC: implementação lida. */
  public desabilitar(): void {
    this.habilitado = false;
    this.reiniciar();
    this.comandoAtual = { ...this.comandoAtual, fase: 'inativo', throttle: 0 };
  }

  /** Consulta seleção operacional do controle. @contract f-67272a24c9b64ffa @reviewed M12-DOC: implementação lida. */
  public get estaHabilitado(): boolean { return this.habilitado; }
  /** Devolve cópia da última fase/referência/throttle calculados. @contract f-2867079eb944ae55 @reviewed M12-DOC: implementação lida. */
  public obterUltimoComando(): ComandoDescidaFuzzyPid { return { ...this.comandoAtual }; }

  /** Quando habilitado/configurado, calcula uma saída e solicita o mesmo throttle normalizado aos motores selecionados; caso contrário lista vazia. @contract f-91ca295ae4c3ef6d @reviewed M12-DOC: implementação lida. */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!this.habilitado || !this.configuracao) return [];
    const comando = this.calcularComando(leituras, dtS);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'throttle', valor: comando.throttle }));
  }

  /** Agenda velocidade descendente por pertinência linear de altitude, aplica PID com peso local e massa instantânea, anti-windup e rampa de throttle. Valida dtS s/leituras, corta solicitação com stale, toque permitido ou subida; frenagem extrema solicita 1 imediatamente. Atualiza memória e diagnóstico, nunca estado físico. @contract f-56d60a5edf2cafc8 @reviewed M12-DOC: implementação lida. */
  public calcularComando(leituras: LeiturasVeiculoComposto, dtS: number): ComandoDescidaFuzzyPid {
    const c = this.configuracao;
    if (!this.habilitado || !c) return this.obterUltimoComando();
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo do controle de pouso deve ser positivo e finito.');
    const massaKg = leituras.massaInstantaneaKg ?? 0;
    const entradas = [leituras.altitudeM, leituras.velocidadeVerticalMps, massaKg, leituras.gravidadeLocalMps2 ?? GRAVIDADE_MPS2];
    const amostraAtual = leituras.sensoresValidos !== false
      && (leituras.idadeLeituraS === undefined || leituras.idadeLeituraS <= IDADE_MAXIMA_LEITURA_SENSOR_S);
    if (!amostraAtual || !entradas.every(Number.isFinite) || massaKg <= 0 || (leituras.gravidadeLocalMps2 ?? GRAVIDADE_MPS2) < 0) {
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

    const chegouAoSolo = c.obterContatoComSolo ? c.obterContatoComSolo() : altitudeRestanteM <= 0.01;
    if (chegouAoSolo && leituras.velocidadeVerticalMps >= -c.velocidadeToqueMps) {
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
    const throttleSustentacao = massaKg * (leituras.gravidadeLocalMps2 ?? GRAVIDADE_MPS2) / c.empuxoMaximoN;
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

  /** Zera integral, erro anterior e throttle anterior para eliminar transientes de uma fase anterior. @contract f-d302c2a442e86025 @reviewed M12-DOC: implementação lida. */
  private reiniciar(): void {
    this.throttleAnterior = 0;
    this.integralErro = 0;
    this.erroAnterior = 0;
  }

  /** Exige finitude dos ganhos e envelope (m, m/s, N), velocidades de toque menores que descida, limiares/rampa positivos e callback de contato quando fornecido; lança erro sem ajustar valores. @contract f-50da500bd8494302 @reviewed M12-DOC: implementação lida. */
  private validarConfiguracao(c: ConfiguracaoDescidaFuzzyPid): void {
    const { obterContatoComSolo, ...parametros } = c;
    const valores = Object.values(parametros).filter((valor): valor is number => valor !== undefined);
    if (!valores.every(Number.isFinite)
      || c.altitudeAlvoM < 0 || c.altitudeTransicaoM <= 0
      || c.velocidadeDescidaMaximaMps <= 0 || c.velocidadeToqueMps <= 0
      || c.velocidadeToqueMps >= c.velocidadeDescidaMaximaMps
      || c.empuxoMaximoN <= 0 || c.ganhoProporcionalThrottlePorMps < 0
      || c.ganhoIntegralThrottlePorM < 0 || c.ganhoDerivativoThrottleSegundosPorM < 0
      || c.taxaMaximaThrottlePorS <= 0 || c.erroParaEmpuxoMaximoMps <= 0
      || (c.ganhoAtitudePorVelocidadeHorizontalRadPorMps ?? 0.01) < 0
      || (obterContatoComSolo !== undefined && typeof obterContatoComSolo !== 'function')) {
      throw new Error('Configuração inválida para o controle de pouso fuzzy-PID.');
    }
  }
}
