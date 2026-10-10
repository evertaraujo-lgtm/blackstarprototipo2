import { describe, expect, it } from 'vitest';
import { AletaAerodinamica } from './AletaAerodinamica';
import { Vetor3 } from '../../Vetor3';

const criarAleta = () => new AletaAerodinamica({
  id: 'aleta-teste', massaBaseKg: 20, dimensoesM: new Vetor3(0.5, 1, 0.3),
  resistenciaColisaoJ: 10_000, limiteTermicoC: 800, areaEfetivaM2: 4,
  coeficienteSustentacaoPorRad: 2, coeficienteArrasto: 1.1,
  deflexaoMaximaRad: Math.PI / 6, velocidadeAngularMaximaRadps: 1,
  estadoInicial: { velocidadeMps: new Vetor3(0, -10, 0) },
});

describe('AletaAerodinamica', () => {
  it('limita curso e velocidade do atuador, e produz força lateral somente em fluxo atmosférico', () => {
    const aleta = criarAleta();
    aleta.solicitarDeflexaoRad(Math.PI);
    aleta.prepararPassoOperacional(0.1);
    expect(aleta.deflexaoAtualRad).toBeCloseTo(0.1);
    const [forca] = aleta.obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero });
    expect(forca?.forcaN.x).toBeGreaterThan(0);
    expect(forca?.forcaN.y).toBeGreaterThan(0);
    expect(aleta.obterForcasAerodinamicas({ densidadeArKgM3: 0, velocidadeArMps: Vetor3.zero })).toEqual([]);

    aleta.prepararPassoOperacional(10);
    expect(aleta.deflexaoAtualRad).toBeCloseTo(Math.PI / 6);
    aleta.aplicarDanoPorImpacto(20_000);
    expect(aleta.integridadeEstrutural).toBe(0);
    expect(aleta.obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero })).toEqual([]);
  });
});
