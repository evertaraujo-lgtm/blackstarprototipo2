import { describe, expect, it } from 'vitest';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { AmbienteTerrestre } from '../ambiente/AmbienteFisico';
import { GeografiaCosteira } from '../ambiente/GeografiaCosteira';
import { RegiaoAquatica } from './RegiaoAquatica';
import { SistemaHidrodinamico } from './SistemaHidrodinamico';
import { calcularGeometriaSubmersa } from './GeometriaSubmersa';
import { MundoFisico } from '../MundoFisico';

export function bancadaAgua(arco = 0, corrente = 0) {
  const ambiente = new AmbienteTerrestre(), ref = ambiente.referencial;
  const costa = new GeografiaCosteira(ref, { inicioArcoM: arco - 100, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 1000, nivelMarM: 0 });
  const agua = new RegiaoAquatica('baia', costa, 1000, corrente);
  return { ambiente, ref, costa, agua };
}
export function corpoAgua(h: number, massa = 500, theta = 0, arco = 0, dim = new Vetor3(2, 2, 1)) {
  const { ref } = bancadaAgua(arco);
  return new Objeto({ id: `prova-${h}-${massa}`, massaBaseKg: massa, dimensoesM: dim, resistenciaColisaoJ: 1e6, limiteTermicoC: 1000,
    estadoInicial: { posicaoM: ref.posicaoPorArcoM(arco, h), orientacaoRad: new Vetor3(0, 0, ref.atitudeInercialRad(theta, ref.posicaoPorArcoM(arco, h))) } });
}
describe('Arquimedes e geometria XY extrudada', () => {
  for (const arco of [0, 1_000_000]) it(`calcula seco/parcial/total e centro em ${arco} m`, () => {
    const { ambiente, agua } = bancadaAgua(arco), h = new SistemaHidrodinamico([agua], p => ambiente.campo.aceleracaoEm(p));
    for (const [altitude, volume] of [[2, 0], [0, 2], [-2, 4]]) {
      const o = corpoAgua(altitude, 500, 0, arco); h.registrar(o, { dimensoesM: o.dimensoesM, coeficienteArrasto: 1 });
      const s = h.calcular(o).estados[0]; expect(s.volumeSubmersoM3).toBeCloseTo(volume, 6);
      if (s.centroEmpuxoM) expect(s.forcaEmpuxoN.magnitude).toBeCloseTo(1000 * volume * ambiente.campo.aceleracaoEm(s.centroEmpuxoM).magnitude, 5);
    }
  });
  it('recorta corpo inclinado, preserva volume e centro de empuxo', () => {
    const { agua } = bancadaAgua();
    for (const theta of [-Math.PI / 4, 0, Math.PI / 4, Math.PI / 2]) {
      const o = corpoAgua(0, 500, theta), p = { dimensoesM: o.dimensoesM, coeficienteArrasto: 1 };
      const g = calcularGeometriaSubmersa(o.getEstadoFisico(), p, agua);
      expect(g.volumeSubmersoM3).toBeCloseTo(2, 7); expect(g.centroEmpuxoM!.y).toBeLessThan(0);
    }
  });
  it('rejeita volume sobreposto em vez de duplicar empuxo', () => {
    const { agua, ambiente } = bancadaAgua(), h = new SistemaHidrodinamico([agua], p => ambiente.campo.aceleracaoEm(p));
    const a = corpoAgua(0, 500), b = corpoAgua(0, 600);
    h.registrar(a, { dimensoesM: a.dimensoesM, coeficienteArrasto: 1 });
    expect(() => h.registrar(b, { dimensoesM: b.dimensoesM, coeficienteArrasto: 1 })).toThrow(/sobrepostos/);
  });
  it('integra empuxo no mundo sem piso aquático ou escrita cinemática externa', () => {
    const { ambiente, agua } = bancadaAgua(), m = new MundoFisico(1 / 240, { ambiente, regioesAquaticas: [agua] });
    const o = corpoAgua(-2, 1000); m.registrarObjeto(o); m.registrarGeometriaAquatica(o, { dimensoesM: o.dimensoesM, coeficienteArrasto: 0 });
    m.avancar(0.1); expect(o.getEstadoFisico().velocidadeMps.y).toBeGreaterThan(2);
    expect(m.obterContatosDoObjeto(o)).toHaveLength(0);
  });
  it('volume e forças não dependem da massa do objeto', () => {
    const { ambiente, agua } = bancadaAgua();
    const executar = (massa: number) => { const o = corpoAgua(-2, massa), h = new SistemaHidrodinamico([agua], p => ambiente.campo.aceleracaoEm(p));
      h.registrar(o, { dimensoesM: o.dimensoesM, coeficienteArrasto: 0 }); return h.calcular(o).estados[0].forcaEmpuxoN; };
    expect(executar(1000)).toEqual(executar(5000));
  });
});
