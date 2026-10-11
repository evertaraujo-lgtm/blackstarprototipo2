import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { SensoresVeiculoComposto, SensorNivelInterno } from './SensoresVeiculoComposto';

describe('SensorNivelInterno', () => {
  it('normaliza a inclinacao para -180 a +180 graus', () => {
    const objeto = new Objeto({
      id: 'casco-sensor-nivel', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 1_000, limiteTermicoC: 1_000,
      estadoInicial: { orientacaoRad: new Vetor3(0, 0, 4 * Math.PI + 0.25) },
    });
    const sensor = new SensorNivelInterno(objeto);

    expect(sensor.obterInclinacaoRad()).toBeCloseTo(0.25, 12);
  });
});

describe('SensoresVeiculoComposto — injeção determinística M8', () => {
  const criar = () => {
    const objeto = new Objeto({
      id: 'casco-sensores-m8', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 1_000, limiteTermicoC: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 100, 0), velocidadeMps: new Vetor3(0, 2, 0) },
    });
    const sensores = new SensoresVeiculoComposto(objeto);
    const mundo = new MundoFisico(0.1);
    mundo.registrarObjeto(objeto);
    mundo.registrarSensoresVeiculo(sensores);
    return { objeto, sensores, mundo };
  };

  it('detecta congelamento pela idade da amostra e conserva estado físico independente', () => {
    const { objeto, sensores, mundo } = criar();
    mundo.avancar(0.1);
    const leituraAntesDaFalha = sensores.obterLeituras();
    sensores.injetarFalha({ tipo: 'congelado', iniciarEmS: mundo.tempoS });
    mundo.avancar(0.1);
    const leituraCongelada = sensores.obterLeituras();
    expect(leituraCongelada.altitudeM).toBe(leituraAntesDaFalha.altitudeM);
    expect(leituraCongelada.idadeLeituraS).toBeCloseTo(0.1, 12);
    expect(leituraCongelada.sensoresValidos).toBe(true);

    mundo.avancar(0.2);
    const leituraObsoleta = sensores.obterLeituras();
    expect(leituraObsoleta.idadeLeituraS).toBeCloseTo(0.3, 12);
    expect(leituraObsoleta.sensoresValidos).toBe(false);
    expect(objeto.getEstadoFisico().posicaoM.y).not.toBe(leituraObsoleta.altitudeM);
  });

  it('reproduz atraso e desvio com tempo simulado, sem relógio externo', () => {
    const primeiro = criar();
    primeiro.sensores.injetarFalha({ tipo: 'atraso', iniciarEmS: 0, atrasoS: 0.3 });
    primeiro.mundo.avancar(0.5);
    const atrasada = primeiro.sensores.obterLeituras();
    expect(atrasada.tempoAmostraS).toBeCloseTo(0.2, 12);
    expect(atrasada.idadeLeituraS).toBeCloseTo(0.3, 12);
    expect(atrasada.sensoresValidos).toBe(false);

    const segundo = criar();
    segundo.sensores.injetarFalha({ tipo: 'desvio', iniciarEmS: 0, altitudeM: 4, velocidadeVerticalMps: -1 });
    segundo.mundo.avancar(0.1);
    expect(segundo.sensores.obterLeituras().altitudeM).toBeCloseTo(segundo.objeto.getEstadoFisico().posicaoM.y + 4, 12);
    expect(segundo.sensores.obterLeituras().sensoresValidos).toBe(true);
  });
});
