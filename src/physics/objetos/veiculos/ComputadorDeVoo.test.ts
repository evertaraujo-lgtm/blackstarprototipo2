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
});
