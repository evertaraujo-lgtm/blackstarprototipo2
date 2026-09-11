import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../physics/MundoFisico';
import { Objeto } from '../physics/objetos/base/Objeto';
import { Vetor3 } from '../physics/Vetor3';
import { ExecutorPassoFixo } from './ExecutorPassoFixo';

const simularComCadencia = (quadrosPorSegundo: number) => {
  const passoS = 1 / 120;
  const executor = new ExecutorPassoFixo(passoS);
  const mundo = new MundoFisico(passoS, { densidadeAtmosfericaKgM3: 0 });
  const objeto = new Objeto({
    id: `objeto-${quadrosPorSegundo}fps`, massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 1_000, limiteTermicoC: 1_000,
  });
  mundo.registrarObjeto(objeto);
  for (let quadro = 0; quadro < quadrosPorSegundo; quadro += 1) {
    executor.avancar(1 / quadrosPorSegundo, 1, (dtS) => {
      // Comando calculado no tempo simulado e antes do respectivo passo físico.
      if (mundo.tempoS >= 0.5) mundo.aplicarForca(objeto, new Vetor3(100, 0, 0));
      mundo.avancar(dtS);
    });
  }
  return { estado: objeto.getEstadoFisico(), tempoS: mundo.tempoS };
};

describe('ExecutorPassoFixo', () => {
  it('ignora o primeiro timestamp e pequenos regressos do relógio de renderização', () => {
    const executor = new ExecutorPassoFixo(1 / 120);
    let passos = 0;
    const executarPasso = () => { passos += 1; };

    expect(executor.avancarAte(100.1, 1, executarPasso)).toBe(0);
    expect(executor.avancarAte(100, 1, executarPasso)).toBe(0);
    expect(executor.avancarAte(108.5, 1, executarPasso)).toBe(1);
    expect(passos).toBe(1);
  });

  it('reproduz estado e comandos com cadências de renderização diferentes', () => {
    const a30Fps = simularComCadencia(30);
    const a60Fps = simularComCadencia(60);
    const a144Fps = simularComCadencia(144);

    expect(a30Fps).toEqual(a60Fps);
    expect(a60Fps).toEqual(a144Fps);
    expect(a30Fps.tempoS).toBeCloseTo(1, 12);
    expect(a30Fps.estado.velocidadeMps.x).toBeCloseTo(5, 10);
  });
});
