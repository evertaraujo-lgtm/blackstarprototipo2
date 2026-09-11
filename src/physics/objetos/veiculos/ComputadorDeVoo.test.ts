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
});
