import { describe, expect, it } from 'vitest';
import { GeradorCA } from './GeradorCA';
import { Vetor3 } from '../../Vetor3';
import { MundoFisico } from '../../MundoFisico';
import { Objeto } from '../base/Objeto';

const definicao = { id: 'gerador', massaBaseKg: 80, dimensoesM: new Vetor3(1, 0.8, 0.8),
  resistenciaColisaoJ: 20_000, limiteTermicoC: 125, temperaturaFalhaTotalC: 180,
  tensaoNominalV: 220, frequenciaHz: 60, potenciaNominalW: 4_000, energiaMecanicaInicialJ: 100, eficiencia: 0.9 };

describe('Gerador CA RMS', () => {
  it('esgota reserva mecânica sem criar energia e bloqueia partida', () => {
    const g = new GeradorCA(definicao); g.ligar(); g.prepararPassoEnergetico(0.1);
    expect(g.fornecerEnergia(1000)).toBe(90);
    expect(g.energiaMecanicaRestanteJ).toBe(0);
    expect(g.fornecerEnergia(1)).toBe(0); expect(g.ligar()).toBe(false);
  });
  it.each([0, -1, NaN, Infinity])('rejeita dt inválido %s', dt => {
    const g = new GeradorCA(definicao); expect(() => g.prepararPassoEnergetico(dt)).toThrow();
  });
  it('rejeita potência, reserva, frequência, eficiência e limite térmico inválidos', () => {
    for (const config of [{ potenciaNominalW: 0 }, { energiaMecanicaInicialJ: -1 }, { frequenciaHz: 0 }, { eficiencia: 1.1 }, { temperaturaFalhaTotalC: 125 }]) {
      expect(() => new GeradorCA({ ...definicao, ...config })).toThrow();
    }
  });
  it('conserva energia ao subdividir o tempo', () => {
    const executar = (dt: number, passos: number) => { const g = new GeradorCA(definicao); g.ligar();
      for (let i = 0; i < passos; i++) { g.prepararPassoEnergetico(dt); g.fornecerEnergia(100 * dt); }
      return g.energiaMecanicaRestanteJ; };
    expect(executar(0.01, 10)).toBeCloseTo(executar(0.005, 20), 10);
  });
  it('prepara fonte antes da carga mesmo quando registrada depois no mundo', () => {
    const g = new GeradorCA(definicao);
    class Carga extends Objeto { public override prepararPassoOperacional(dt: number): void { g.fornecerEnergia(100 * dt); } }
    const carga = new Carga({ ...definicao, id: 'carga' });
    const mundo = new MundoFisico(); mundo.registrarObjeto(carga); mundo.registrarObjeto(g);
    g.ligar(); mundo.avancar(0.01);
    expect(g.energiaEletricaGeradaJ).toBeCloseTo(1, 10);
  });
});
