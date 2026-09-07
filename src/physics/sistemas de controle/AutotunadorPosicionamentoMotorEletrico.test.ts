import { describe, expect, it } from 'vitest';
import { Bateria } from '../objetos/fontes-de-energia/Bateria';
import { MotorEletricoRotacional } from '../objetos/atuadores/MotorEletricoRotacional';
import { AutotunadorPosicionamentoMotorEletrico } from './AutotunadorPosicionamentoMotorEletrico';
import { Vetor3 } from '../Vetor3';

describe('AutotunadorPosicionamentoMotorEletrico', () => {
  it('simula candidatos, informa progresso e aplica os ganhos selecionados', async () => {
    const bateria = new Bateria({
      id: 'bateria-autotune-teste', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, estadoInicial: { posicaoM: new Vetor3(0, 1, 0) },
      tensaoNominalV: 24, capacidadeEnergiaJ: 100_000, energiaInicialJ: 100_000,
    });
    const motor = new MotorEletricoRotacional({
      id: 'motor-autotune-teste', massaBaseKg: 20, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, estadoInicial: { posicaoM: Vetor3.zero },
      fonteEletrica: bateria, obterAnguloAtualRad: () => 0, obterVelocidadeAngularRadps: () => 0,
      torqueMaximoNm: 500, velocidadeAngularMaximaRadps: 2, aceleracaoMaximaRadps2: 5, potenciaNominalW: 100,
    });
    const progresso: number[] = [];
    const resultado = await new AutotunadorPosicionamentoMotorEletrico(motor).executar(({ percentual }) => progresso.push(percentual));

    expect(progresso.at(-1)).toBe(100);
    expect(Number.isFinite(resultado.custo)).toBe(true);
    expect(motor.ganhos).toEqual(resultado.ganhos);
  });
});
