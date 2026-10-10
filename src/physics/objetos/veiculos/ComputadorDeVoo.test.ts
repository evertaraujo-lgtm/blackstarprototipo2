import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../../Vetor3';
import type { LeiturasVeiculoComposto } from '../../sensores/SensoresVeiculoComposto';
import { ComputadorDeVoo, type IPropulsorControlavelPeloComputador } from './ComputadorDeVoo';

const leiturasComInclinacao = (inclinacaoRad: number): LeiturasVeiculoComposto => ({
  posicaoGpsM: Vetor3.zero,
  altitudeM: 0,
  velocidadeVerticalMps: 0,
  velocidadeHorizontalMps: 0,
  inclinacaoRad,
});

describe('ComputadorDeVoo', () => {
  it('comanda o gimbal no sentido restaurador para inclinação positiva', () => {
    let inclinacaoRad = 0.1;
    let comandoRad = 0;
    const computador = new ComputadorDeVoo({ obterLeituras: () => leiturasComInclinacao(inclinacaoRad) });
    const propulsor: IPropulsorControlavelPeloComputador = {
      id: 'propulsor-teste',
      estaIgnitado: true,
      diagnosticoOperacional: [],
      ligarSistema: () => true,
      solicitarIgnicao: () => true,
      definirThrottle: () => undefined,
      desligarSistema: () => undefined,
      solicitarVetorizacao: (anguloAlvoRad) => { comandoRad = anguloAlvoRad; return true; },
      obterEstadoDaVetorizacao: () => ({
        anguloAlvoRad: comandoRad,
        anguloAtualRad: comandoRad,
        limiteAngularRad: Math.PI / 12,
        velocidadeAngularMaximaRadps: Math.PI,
        estaHabilitado: true,
      }),
    };

    computador.instalarPropulsor(propulsor);
    computador.habilitar();
    computador.atualizarControleDeInclinacao(0.01);
    expect(comandoRad).toBeGreaterThan(0);

    inclinacaoRad = -0.1;
    computador.atualizarControleDeInclinacao(0.01);
    expect(comandoRad).toBeLessThan(0);
  });

  it('aplica o controle de pouso no throttle e no gimbal a partir dos sensores', () => {
    let leitura = leiturasComInclinacao(0.1);
    leitura = { ...leitura, altitudeM: 8, velocidadeVerticalMps: -10, velocidadeHorizontalMps: 2 };
    let throttle = 0;
    let comandoGimbalRad = 0;
    const computador = new ComputadorDeVoo({ obterLeituras: () => leitura });
    const propulsor: IPropulsorControlavelPeloComputador = {
      id: 'propulsor-pouso', estaIgnitado: true, diagnosticoOperacional: [],
      ligarSistema: () => true,
      solicitarIgnicao: () => true,
      definirThrottle: (valor) => { throttle = valor; },
      desligarSistema: () => undefined,
      solicitarVetorizacao: (anguloAlvoRad) => { comandoGimbalRad = anguloAlvoRad; return true; },
      obterEstadoDaVetorizacao: () => ({
        anguloAlvoRad: comandoGimbalRad, anguloAtualRad: comandoGimbalRad,
        limiteAngularRad: Math.PI / 12, velocidadeAngularMaximaRadps: Math.PI, estaHabilitado: true,
      }),
    };
    computador.instalarPropulsor(propulsor);
    computador.habilitarControleDePouso({ altitudeAlvoM: 3, taxaMaximaThrottlePorS: 10 });

    computador.atualizarControladores(0.1);

    expect(throttle).toBeGreaterThan(0.5);
    expect(comandoGimbalRad).toBeGreaterThan(0);
    expect(computador.obterUltimoComandoDePouso()).toMatchObject({ fase: 'frenagem', leiturasValidas: true });
  });

  it('mantém ignição explícita e torna pouso e PID de inclinação mutuamente exclusivos', () => {
    let solicitacoesDeIgnicao = 0;
    const computador = new ComputadorDeVoo({ obterLeituras: () => leiturasComInclinacao(0.1) });
    computador.instalarPropulsor({
      id: 'propulsor-sem-ignicao-automatica', estaIgnitado: false, diagnosticoOperacional: ['ignição não realizada'],
      ligarSistema: () => true,
      solicitarIgnicao: () => { solicitacoesDeIgnicao += 1; return true; },
      definirThrottle: () => undefined,
      desligarSistema: () => undefined,
    });

    computador.habilitar();
    expect(computador.estaHabilitado).toBe(true);
    computador.habilitarControleDePouso();
    computador.atualizarControladores(0.1);
    expect(computador.estaHabilitado).toBe(false);
    expect(computador.controleDePousoEstaHabilitado).toBe(true);
    expect(solicitacoesDeIgnicao).toBe(0);

    computador.habilitar();
    expect(computador.controleDePousoEstaHabilitado).toBe(false);
    expect(computador.estaHabilitado).toBe(true);
  });

  it('mantém o gimbal de descida ativo enquanto o throttle fuzzy-PID assume o pouso', () => {
    let throttle = 0;
    let comandoGimbalRad = 0;
    const leituras: LeiturasVeiculoComposto = {
      ...leiturasComInclinacao(0), altitudeM: 20, velocidadeVerticalMps: -15, massaInstantaneaKg: 1_500,
    };
    const computador = new ComputadorDeVoo({ obterLeituras: () => leituras });
    computador.instalarPropulsor({
      id: 'motor-bss04', estaIgnitado: true, diagnosticoOperacional: [],
      ligarSistema: () => true, solicitarIgnicao: () => true,
      definirThrottle: (valor) => { throttle = valor; }, desligarSistema: () => undefined,
      solicitarVetorizacao: (angulo) => { comandoGimbalRad = angulo; return true; },
      obterEstadoDaVetorizacao: () => ({
        anguloAlvoRad: comandoGimbalRad, anguloAtualRad: comandoGimbalRad,
        limiteAngularRad: Math.PI / 12, velocidadeAngularMaximaRadps: Math.PI, estaHabilitado: true,
      }),
    });
    computador.habilitarControleDeInclinacao(['motor-bss04']);
    computador.habilitarControleDeDescidaFuzzyPid({
      altitudeAlvoM: 4.8, altitudeTransicaoM: 40,
      velocidadeDescidaMaximaMps: 12, velocidadeToqueMps: 0.35,
      empuxoMaximoN: 40_000, ganhoProporcionalThrottlePorMps: 0.07,
      ganhoIntegralThrottlePorM: 0.004, ganhoDerivativoThrottleSegundosPorM: 0.015,
      taxaMaximaThrottlePorS: 10, erroParaEmpuxoMaximoMps: 2,
    }, ['motor-bss04']);

    computador.atualizarControladores(1 / 240);

    expect(computador.estaHabilitado).toBe(true);
    expect(computador.controleDeDescidaFuzzyPidEstaHabilitado).toBe(true);
    expect(throttle).toBe(1);
  });

  it('usa o gimbal para frear deriva horizontal apenas durante a descida', () => {
    let comandoGimbalRad = 0;
    let leituras: LeiturasVeiculoComposto = {
      ...leiturasComInclinacao(0), altitudeM: 30, velocidadeVerticalMps: -5,
      velocidadeHorizontalMps: 8, massaInstantaneaKg: 1_500,
    };
    const computador = new ComputadorDeVoo({ obterLeituras: () => leituras });
    computador.instalarPropulsor({
      id: 'motor-deriva', estaIgnitado: true, diagnosticoOperacional: [],
      ligarSistema: () => true, solicitarIgnicao: () => true,
      definirThrottle: () => undefined, desligarSistema: () => undefined,
      solicitarVetorizacao: (angulo) => { comandoGimbalRad = angulo; return true; },
      obterEstadoDaVetorizacao: () => ({
        anguloAlvoRad: comandoGimbalRad, anguloAtualRad: comandoGimbalRad,
        limiteAngularRad: Math.PI / 12, velocidadeAngularMaximaRadps: Math.PI, estaHabilitado: true,
      }),
    });
    computador.habilitarControleDeInclinacao(['motor-deriva']);
    computador.habilitarControleDeDescidaFuzzyPid({
      altitudeAlvoM: 4.8, altitudeTransicaoM: 80,
      velocidadeDescidaMaximaMps: 12, velocidadeToqueMps: 0.35,
      empuxoMaximoN: 40_000, ganhoProporcionalThrottlePorMps: 0.07,
      ganhoIntegralThrottlePorM: 0.004, ganhoDerivativoThrottleSegundosPorM: 0.015,
      taxaMaximaThrottlePorS: 10, erroParaEmpuxoMaximoMps: 2,
      ganhoAtitudePorVelocidadeHorizontalRadPorMps: 0.01,
    }, ['motor-deriva']);

    computador.atualizarControladores(1 / 240);
    expect(comandoGimbalRad).toBeLessThan(0);

    leituras = { ...leituras, velocidadeVerticalMps: 2 };
    for (let passo = 0; passo < 120; passo += 1) computador.atualizarControladores(1 / 240);
    expect(Math.abs(comandoGimbalRad)).toBeLessThan(0.02);
  });
});
