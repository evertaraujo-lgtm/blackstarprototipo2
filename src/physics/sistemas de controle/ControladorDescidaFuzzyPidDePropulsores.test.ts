import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorDescidaFuzzyPidDePropulsores, type ConfiguracaoDescidaFuzzyPid } from './ControladorDescidaFuzzyPidDePropulsores';

const configuracao: ConfiguracaoDescidaFuzzyPid = {
  altitudeAlvoM: 4.8,
  altitudeTransicaoM: 80,
  velocidadeDescidaMaximaMps: 12,
  velocidadeToqueMps: 0.35,
  empuxoMaximoN: 40_000,
  ganhoProporcionalThrottlePorMps: 0.07,
  ganhoIntegralThrottlePorM: 0.004,
  ganhoDerivativoThrottleSegundosPorM: 0.015,
  taxaMaximaThrottlePorS: 100,
  erroParaEmpuxoMaximoMps: 2,
};

const criarLeituras = (parcial: Partial<LeiturasVeiculoComposto> = {}): LeiturasVeiculoComposto => ({
  posicaoGpsM: new Vetor3(0, 50, 0), altitudeM: 50, velocidadeVerticalMps: -12,
  velocidadeHorizontalMps: 0, inclinacaoRad: 0, massaInstantaneaKg: 2_000, ...parcial,
});

const criarControlador = (): ControladorDescidaFuzzyPidDePropulsores => {
  const controlador = new ControladorDescidaFuzzyPidDePropulsores();
  controlador.configurar(configuracao, ['motor']);
  controlador.habilitar();
  return controlador;
};

describe('ControladorDescidaFuzzyPidDePropulsores', () => {
  it('reduz suavemente a velocidade-alvo conforme a altitude cai', () => {
    const controlador = criarControlador();
    const alto = controlador.calcularComando(criarLeituras({ altitudeM: 100 }), 0.1);
    const baixo = controlador.calcularComando(criarLeituras({ altitudeM: 24.8 }), 0.1);

    expect(alto.velocidadeVerticalAlvoMps).toBe(-12);
    expect(baixo.velocidadeVerticalAlvoMps).toBeCloseTo(-3.2625, 3);
    expect(baixo.velocidadeVerticalAlvoMps).toBeGreaterThan(alto.velocidadeVerticalAlvoMps);
  });

  it('usa a massa instantânea no throttle de sustentação', () => {
    const leve = criarControlador().calcularComando(criarLeituras({ altitudeM: 100, massaInstantaneaKg: 1_000 }), 1);
    const pesado = criarControlador().calcularComando(criarLeituras({ altitudeM: 100, massaInstantaneaKg: 2_000 }), 1);

    expect(leve.throttle).toBeCloseTo(1_000 * 9.80665 / 40_000, 5);
    expect(pesado.throttle).toBeCloseTo(2_000 * 9.80665 / 40_000, 5);
    expect(pesado.throttle).toBeGreaterThan(leve.throttle);
  });

  it('comanda empuxo máximo quando a descida excede a curva segura', () => {
    const comando = criarControlador().calcularComando(criarLeituras({ altitudeM: 20, velocidadeVerticalMps: -20 }), 1 / 240);

    expect(comando.fase).toBe('frenagem');
    expect(comando.throttle).toBe(1);
  });

  it('corta o empuxo durante a subida e libera quando a nave desce', () => {
    const controlador = criarControlador();
    const subindo = controlador.calcularComando(criarLeituras({ velocidadeVerticalMps: 2 }), 1 / 240);
    const descendo = controlador.calcularComando(criarLeituras({ velocidadeVerticalMps: -11.5 }), 1 / 240);

    expect(subindo.fase).toBe('aguardando-descida');
    expect(subindo.throttle).toBe(0);
    expect(descendo.throttle).toBeGreaterThan(0);
  });

  it('corta o motor ao alcançar a faixa segura de toque', () => {
    const comando = criarControlador().calcularComando(criarLeituras({ altitudeM: 4.805, velocidadeVerticalMps: -0.2 }), 1 / 240);

    expect(comando.fase).toBe('toque');
    expect(comando.throttle).toBe(0);
  });

  it('falha de forma segura quando a massa deixa de ser válida', () => {
    const comando = criarControlador().calcularComando(criarLeituras({ massaInstantaneaKg: Number.NaN }), 1 / 240);

    expect(comando.fase).toBe('falha-de-sensores');
    expect(comando.throttle).toBe(0);
  });

  it('mantém potência antes do contato e corta depois do apoio quando há sensor nas sapatas', () => {
    let emContato = false;
    const controlador = new ControladorDescidaFuzzyPidDePropulsores();
    controlador.configurar({ ...configuracao, obterContatoComSolo: () => emContato }, ['motor']);
    controlador.habilitar();
    const quaseTocando = criarLeituras({ altitudeM: 4.805, velocidadeVerticalMps: -0.2 });
    const aproximacao = controlador.calcularComando(quaseTocando, 1 / 240);
    expect(aproximacao.fase).toBe('frenagem');
    expect(aproximacao.throttle).toBeGreaterThan(0);

    emContato = true;
    const toque = controlador.calcularComando(quaseTocando, 1 / 240);
    expect(toque.fase).toBe('toque');
    expect(toque.throttle).toBe(0);
  });
});
