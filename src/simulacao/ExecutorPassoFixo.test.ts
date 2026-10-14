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
  it('preserva todo o atraso real com orçamento de quadro e drena os mesmos passos físicos', () => {
    const executor = new ExecutorPassoFixo(1 / 240, 0.05, true);
    let passos = 0;
    const executar = (dt: number) => { expect(dt).toBe(1 / 240); passos++; };
    expect(executor.avancar(1, 1, executar, { maxPassos: 12 })).toBe(12);
    expect(executor.tempoPendenteS).toBeCloseTo(0.95, 12);
    while (executor.tempoPendenteS > 1e-12) executor.avancar(0, 1, executar, { maxPassos: 12 });
    expect(passos).toBe(240); expect(executor.tempoPendenteS).toBeLessThan(1e-12);
  });
  it('orçamento cooperativo mantém passos pendentes e pausa exclui somente tempo parado', () => {
    const executor = new ExecutorPassoFixo(0.01, 0.05, true);
    let n = 0;
    executor.avancarAte(0, 1, () => n++);
    expect(executor.avancarAte(1000, 1, () => n++, { maxPassos: 100, continuar: () => n < 3 })).toBe(3);
    expect(executor.tempoPendenteS).toBeCloseTo(0.97, 12);
    executor.suspenderReferenciaRelogio();
    expect(executor.avancarAte(10000, 1, () => n++)).toBe(0);
    expect(executor.avancarAte(10010, 1, () => n++)).toBe(98);
    expect(n).toBe(101); expect(executor.tempoPendenteS).toBeLessThan(1e-12);
    executor.reiniciar(); expect(executor.tempoPendenteS).toBe(0);
  });
  it('cadências com trabalho limitado produzem a mesma sequência física do avanço integral', () => {
    const estado = (limitado: boolean) => {
      const executor = new ExecutorPassoFixo(1 / 240, 0.05, true), dts: number[] = [];
      for (const delta of [0.016, 0.35, 0.009, 0.125]) executor.avancar(delta, 1, dt => dts.push(dt), limitado ? { maxPassos: 5 } : undefined);
      while (executor.tempoPendenteS > 1e-12) executor.avancar(0, 1, dt => dts.push(dt), limitado ? { maxPassos: 5 } : undefined);
      return dts;
    };
    expect(estado(true)).toEqual(estado(false)); expect(estado(true)).toHaveLength(120);
  });

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
