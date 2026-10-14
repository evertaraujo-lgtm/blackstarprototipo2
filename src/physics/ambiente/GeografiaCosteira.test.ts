import { describe, expect, it } from 'vitest';
import { AmbienteTerrestre } from './AmbienteFisico';
import { GeografiaCosteira } from './GeografiaCosteira';
import { SuperficieCosteira } from '../SuperficieCosteira';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

describe('Costa radial e fundo real', () => {
  for (const arco of [0, 1_000_000]) it(`mantém praia, normal e projeção em ${arco} m`, () => {
    const a = new AmbienteTerrestre(), r = a.referencial;
    const g = new GeografiaCosteira(r, { inicioArcoM: arco + 60, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 2000, nivelMarM: 0 });
    const s = new SuperficieCosteira('costa', a.campo.centroM, r.raioM, g);
    expect(g.alturaSoloM(arco)).toBe(0); expect(g.alturaSoloM(arco + 85)).toBe(-25);
    expect(g.alturaSoloM(arco + 200)).toBe(-50); expect(g.alturaSoloM(g.fimArcoM)).toBe(0);
    const p = r.posicaoPorArcoM(arco + 85, -20), q = s.projetar(p);
    expect(Math.abs(s.distanciaAssinadaM(q))).toBeLessThan(1e-6);
    expect(s.normalEm(p).produtoEscalar(r.radial(p))).toBeCloseTo(Math.SQRT1_2, 4);
    expect(g.contemAgua(r.posicaoPorArcoM(arco + 200, -5))).toBe(true);
    expect(g.contemAgua(r.posicaoPorArcoM(arco, -5))).toBe(false);
  });
  it('cruza nível do mar sem contato rígido, mas encontra terra e fundo', () => {
    const a = new AmbienteTerrestre(), r = a.referencial;
    const g = new GeografiaCosteira(r, { inicioArcoM: 60, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 2000, nivelMarM: 0 });
    const s = new SuperficieCosteira('costa', a.campo.centroM, r.raioM, g), m = new MundoFisico(1 / 240, { ambiente: a }); m.registrarSuperficie(s);
    const criar = (id: string, x: number) => new Objeto({ id, massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 1000,
      limiteTermicoC: 1000, estadoInicial: { posicaoM: r.posicaoPorArcoM(x, 1) } });
    const terra = criar('terra', 0), mar = criar('mar', 200); m.registrarObjeto(terra); m.registrarObjeto(mar);
    expect(m.obterMenorDistanciaSuperficieM(terra, s)).toBeCloseTo(0.5, 6);
    m.avancar(1);
    expect(r.altitudeGeometricaM(terra.getEstadoFisico().posicaoM)).toBeGreaterThanOrEqual(0.49999);
    expect(r.altitudeGeometricaM(mar.getEstadoFisico().posicaoM)).toBeLessThan(-3);
    expect(m.obterContatosDoObjeto(mar)).toHaveLength(0);
    m.avancar(5); expect(r.altitudeGeometricaM(mar.getEstadoFisico().posicaoM)).toBeGreaterThan(-49.51);
  });
  it('inclui a quebra da costa quando um corpo abrange terra e água', () => {
    const a = new AmbienteTerrestre(), r = a.referencial;
    const g = new GeografiaCosteira(r, { inicioArcoM: 60, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 2000, nivelMarM: 0 });
    const s = new SuperficieCosteira('costa', a.campo.centroM, r.raioM, g);
    const p = [r.posicaoPorArcoM(50, -1), r.posicaoPorArcoM(80, -1)];
    expect(s.candidatosContato(p).some(q => Math.abs(r.posicaoHorizontalM(q) - 60) < 1e-5)).toBe(true);
    expect(s.distanciaAssinadaM(p[0])).toBeLessThan(0); expect(s.distanciaAssinadaM(p[1])).toBeGreaterThan(0);
  });
});
