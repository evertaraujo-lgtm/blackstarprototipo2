import { describe, expect, it } from 'vitest';
import { TracePLC } from './TracePLC';

describe('TracePLC', () => {
  it('registra canais digitais e evita amostras repetidas', () => {
    let sinal: 0 | 1 = 0;
    const trace = new TracePLC(10, 10);
    trace.adicionarSinal('SENSOR', () => sinal, '#4ade80');

    trace.registrar(0, true);
    trace.registrar(0.01);
    sinal = 1;
    trace.registrar(0.02);

    expect(trace.canais).toHaveLength(1);
    expect(trace.amostras.map((amostra) => amostra.sinais[0])).toEqual([0, 1]);
    expect(trace.obterIndiceMaisProximo(0.02)).toBe(1);
  });

  it('recusa o décimo primeiro canal', () => {
    const trace = new TracePLC();
    for (let indice = 0; indice < 10; indice += 1) trace.adicionarSinal(`S${indice}`, () => 0, '#fff');
    expect(() => trace.adicionarSinal('S10', () => 0, '#fff')).toThrow('10 canais');
  });
});
