import { describe, expect, it } from 'vitest';
import { AletaAerodinamica } from './AletaAerodinamica';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';

const criarBateria = (id = 'bateria-aleta') => new Bateria({
  id, massaBaseKg: 10, dimensoesM: new Vetor3(0.5, 0.5, 0.5), resistenciaColisaoJ: 10_000,
  limiteTermicoC: 800, tensaoNominalV: 24, capacidadeEnergiaJ: 100_000, energiaInicialJ: 100_000,
});

const criarAleta = (fonteEletrica: Bateria, operacaoAutorizada: () => boolean = () => true) => new AletaAerodinamica({
  id: 'aleta-teste', massaBaseKg: 20, dimensoesM: new Vetor3(0.5, 1, 0.3),
  resistenciaColisaoJ: 10_000, limiteTermicoC: 800, areaEfetivaM2: 4,
  coeficienteSustentacaoPorRad: 2, coeficienteArrasto: 1.1,
  deflexaoMaximaRad: Math.PI / 6, velocidadeAngularMaximaRadps: 1,
  estadoInicial: { velocidadeMps: new Vetor3(0, -10, 0) },
  potenciaNominalAtuadorW: 500, potenciaEmRepousoW: 5, fonteEletrica, operacaoAutorizada,
});

describe('AletaAerodinamica', () => {
  it('limita curso e velocidade do atuador, e produz força lateral somente em fluxo atmosférico', () => {
    const bateria = criarBateria();
    const aleta = criarAleta(bateria);
    aleta.solicitarDeflexaoRad(Math.PI);
    aleta.prepararPassoOperacional(0.1);
    expect(aleta.deflexaoAtualRad).toBeCloseTo(0.1);
    const [forca] = aleta.obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero });
    expect(forca?.forcaN.x).toBeGreaterThan(0);
    expect(forca?.forcaN.y).toBeGreaterThan(0);
    expect(aleta.obterForcasAerodinamicas({ densidadeArKgM3: 0, velocidadeArMps: Vetor3.zero })).toEqual([]);

    aleta.prepararPassoOperacional(10);
    expect(aleta.deflexaoAtualRad).toBeCloseTo(Math.PI / 6);
    expect(bateria.energiaConsumidaJ).toBeGreaterThan(0);
    aleta.aplicarDanoPorImpacto(20_000);
    expect(aleta.integridadeEstrutural).toBe(0);
    expect(aleta.obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero })).toEqual([]);
  });

  it('não move sem alimentação no circuito ou sem permissivo do sistema elétrico', () => {
    const bateria = criarBateria('bateria-aleta-sem-permissivo');
    let eletricaAutorizada = true;
    const aleta = criarAleta(bateria, () => eletricaAutorizada);
    aleta.solicitarDeflexaoRad(Math.PI / 6);
    aleta.conexaoEletrica.abrirInterruptor();
    aleta.prepararPassoOperacional(0.1);
    expect(aleta.deflexaoAtualRad).toBe(0);

    expect(aleta.conexaoEletrica.fecharInterruptor()).toBe(true);
    eletricaAutorizada = false;
    aleta.prepararPassoOperacional(0.1);
    expect(aleta.deflexaoAtualRad).toBe(0);
  });
});
