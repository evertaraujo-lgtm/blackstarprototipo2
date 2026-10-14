import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import { Objeto } from '../objetos/base/Objeto';
import { MundoFisico } from '../MundoFisico';
import { AmbienteTerrestre } from '../ambiente/AmbienteFisico';
import { GeografiaCosteira } from '../ambiente/GeografiaCosteira';
import { RegiaoAquatica } from './RegiaoAquatica';
import { calcularGeometriaSubmersa } from './GeometriaSubmersa';
import { SistemaHidrodinamico } from './SistemaHidrodinamico';

function base(inicio = -100) {
  const ambiente = new AmbienteTerrestre(), ref = ambiente.referencial;
  const costa = new GeografiaCosteira(ref, { inicioArcoM: inicio, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 1000, nivelMarM: 0 });
  return { ambiente, ref, agua: new RegiaoAquatica('agua', costa, 1000) };
}
function objeto(id: string, d: Vetor3, massa: number, posicaoM: Vetor3, theta = 0, omega = 0) {
  return new Objeto({ id, massaBaseKg: massa, dimensoesM: d, resistenciaColisaoJ: 1e9, limiteTermicoC: 1000,
    estadoInicial: { posicaoM, orientacaoRad: new Vetor3(0, 0, theta), velocidadeAngularRadps: new Vetor3(0, 0, omega) } });
}
describe('M11-H — Referências analíticas e limites do meio', () => {
  it('rejeita objeto sem geometria aquática em vez de pressupor volume/arrasto', () => {
    const { ambiente, agua } = base(), m = new MundoFisico(1 / 240, { ambiente, regioesAquaticas: [agua] });
    m.registrarObjeto(objeto('sem-geometria', new Vetor3(1, 1, 1), 1000, Vetor3.zero));
    expect(() => m.avancar(1 / 240)).toThrow(/Geometria aquática não declarada/);
    expect(m.tempoS).toBe(0);
  });
  it('recorta costa pelo volume inteiro, inclusive quando centro está em terra', () => {
    const { ref, agua } = base(60), p = { dimensoesM: new Vetor3(30, 2, 1), coeficienteArrasto: 1 };
    const e = { posicaoM: ref.posicaoPorArcoM(65, 0), orientacaoRad: new Vetor3(0, 0, ref.atitudeInercialRad(0, ref.posicaoPorArcoM(65, 0))), velocidadeMps: Vetor3.zero, velocidadeAngularRadps: Vetor3.zero };
    // Integral analítica: triângulo de praia 0,5 m² + 19 m² em água livre; erro de curvatura < 0,003 m³.
    expect(Math.abs(calcularGeometriaSubmersa(e, p, agua).volumeSubmersoM3 - 19.5)).toBeLessThan(0.003);
    const longo = { ...e, posicaoM: ref.posicaoPorArcoM(45, 1), orientacaoRad: new Vetor3(0, 0, -0.05) };
    expect(agua.costa.contemAgua(longo.posicaoM)).toBe(false);
    expect(calcularGeometriaSubmersa(longo, { ...p, dimensoesM: new Vetor3(60, 1, 1) }, agua).volumeSubmersoM3).toBeGreaterThan(0);
  });
  it('momento de pequena inclinação concorda com metacentro analítico a 1%', () => {
    const { ambiente, agua } = base(), theta = 0.001;
    for (const [d, calado, GM] of [[new Vetor3(4, 2, 1), 1, 0.5 + 16 / 12 - 1], [new Vetor3(1, 8, 1), 4, 2 + 1 / 48 - 4]] as const) {
      const o = objeto('prova', d, 4000, Vetor3.zero, theta), s = new SistemaHidrodinamico([agua], p => ambiente.campo.aceleracaoEm(p));
      s.registrar(o, { dimensoesM: d, coeficienteArrasto: 0 }); const estado = s.calcular(o).estados[0];
      expect(estado.volumeSubmersoM3).toBeCloseTo(d.x * calado, 5);
      const previsto = -4000 * ambiente.campo.aceleracaoEm(Vetor3.zero).magnitude * GM * theta;
      expect(Math.abs(estado.torqueHidrodinamicoNm.z / previsto - 1)).toBeLessThan(0.01);
    }
  });
  it('velocidade terminal de corpo denso concorda com equilíbrio de forças a 2%', () => {
    const { ambiente, agua } = base(), o = objeto('denso', new Vetor3(2, 2, 1), 6000, new Vetor3(0, -3, 0));
    const m = new MundoFisico(1 / 240, { ambiente, regioesAquaticas: [agua] }); m.registrarObjeto(o);
    m.registrarGeometriaAquatica(o, { dimensoesM: o.dimensoesM, coeficienteArrasto: 1 }); m.avancar(5);
    const g = ambiente.campo.aceleracaoEm(o.getEstadoFisico().posicaoM).magnitude;
    const terminal = Math.sqrt(2 * (6000 - 1000 * 4) * g / (1000 * 1 * 2));
    expect(Math.abs(-o.getEstadoFisico().velocidadeMps.y / terminal - 1)).toBeLessThan(0.02);
  });
  it('rotação passiva totalmente imersa não ganha energia cinética', () => {
    const { ambiente, agua } = base(), o = objeto('neutro', new Vetor3(2, 2, 1), 4000, new Vetor3(0, -5, 0), 0, 1);
    const m = new MundoFisico(1 / 240, { ambiente, regioesAquaticas: [agua] }); m.registrarObjeto(o);
    m.registrarGeometriaAquatica(o, { dimensoesM: o.dimensoesM, coeficienteArrasto: 1 });
    const energia = () => { const e = o.getEstadoFisico(); return 0.5 * o.massaKg * e.velocidadeMps.magnitude ** 2 + 0.5 * o.getMomentoInerciaKgM2().z * e.velocidadeAngularRadps.z ** 2; };
    let anterior = energia();
    for (let i = 0; i < 240; i++) { m.avancar(1 / 240); const E = energia(); expect(E).toBeLessThanOrEqual(anterior + 1e-8); anterior = E; }
    expect(anterior).toBeLessThan(1000); expect(o.massaKg).toBe(4000);
  });
});
