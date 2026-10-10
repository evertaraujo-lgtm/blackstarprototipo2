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

  it('registra canais analogicos com escala de corrente', () => {
    const trace = new TracePLC(10, 10);
    let correnteA = 0;
    trace.adicionarSinal('I MOTOR', () => correnteA, '#fb923c', { minimo: 0, maximo: 125, unidade: 'A' });
    trace.registrar(0, true);
    correnteA = 62.5;
    trace.registrar(0.1);

    expect(trace.canais[0].escala).toEqual({ minimo: 0, maximo: 125, unidade: 'A' });
    expect(trace.amostras.map((amostra) => amostra.sinais[0])).toEqual([0, 62.5]);
  });

  it('normaliza sinais booleanos para 0 e 1', () => {
    let ligado = false;
    const trace = new TracePLC(10, 10);
    trace.adicionarSinal('LIGADO', () => ligado, '#4ade80');
    trace.registrar(0, true);
    ligado = true;
    trace.registrar(0.1);

    expect(trace.amostras.map((amostra) => amostra.sinais[0])).toEqual([0, 1]);
  });

  it('recusa o décimo primeiro canal', () => {
    const trace = new TracePLC();
    for (let indice = 0; indice < 10; indice += 1) trace.adicionarSinal(`S${indice}`, () => 0, '#fff');
    expect(() => trace.adicionarSinal('S10', () => 0, '#fff')).toThrow('10 canais');
  });

  it('registra os 11 canais do BSS-006 quando a capacidade é configurada pelo cenário', () => {
    const nomes = ['THROTTLE', 'EMPUXO', 'POT. TÉRMICA', 'GIMBAL', 'MASSA', 'VELOCIDADE X', 'ALVO X', 'ERRO X', 'ATITUDE', 'VEL. ANGULAR', 'GRID FINS'];
    const trace = new TracePLC(nomes.length, 10);
    for (const [indice, nome] of nomes.entries()) {
      trace.adicionarSinal(nome, () => indice, '#fff', { minimo: -50, maximo: 100 });
    }
    trace.registrar(0, true);
    trace.registrar(1 / 240, true);

    expect(trace.canais.map((canal) => canal.nome)).toEqual(nomes);
    expect(trace.amostras).toHaveLength(2);
    expect(trace.amostras[1].sinais).toEqual(nomes.map((_, indice) => indice));
    expect(() => trace.adicionarSinal('EXTRA', () => 0, '#fff')).toThrow('11 canais');
  });

  it.each([0, -1, 1.5, NaN, Infinity])('recusa capacidade de canais inválida: %s', (capacidade) => {
    expect(() => new TracePLC(capacidade)).toThrow('inteiro positivo');
  });
});
