import { describe, expect, it } from 'vitest';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { SensorNivelInterno } from './SensoresVeiculoComposto';

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
