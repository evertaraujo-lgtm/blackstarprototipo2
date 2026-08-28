import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from './Bateria';

const criarBateria = (energiaInicialJ = 500) => new Bateria({
  id: 'bateria', massaBaseKg: 20, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 80,
  tensaoNominalV: 28, capacidadeEnergiaJ: 1_000, energiaInicialJ,
});

describe('Bateria', () => {
  it('mantém carga finita e entrega no máximo a energia armazenada', () => {
    const bateria = criarBateria();
    expect(bateria.fornecerEnergia(300)).toBe(300);
    expect(bateria.energiaArmazenadaJ).toBe(200);
    expect(bateria.fornecerEnergia(300)).toBe(200);
    expect(bateria.estaDescarregada).toBe(true);
    expect(bateria.percentualDeCarga).toBe(0);
  });

  it('valida tensão, capacidade e carga inicial', () => {
    expect(() => new Bateria({
      id: 'bateria-invalida', massaBaseKg: 20, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 80,
      tensaoNominalV: 0, capacidadeEnergiaJ: 1_000, energiaInicialJ: 1_000,
    })).toThrow('Definição de bateria inválida.');
  });
});
