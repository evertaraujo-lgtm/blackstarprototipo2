import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { AmbienteTerrestre } from '../ambiente/AmbienteFisico';
import { GeografiaCosteira } from '../ambiente/GeografiaCosteira';
import { RegiaoAquatica } from './RegiaoAquatica';
import { SistemaHidrodinamico } from './SistemaHidrodinamico';

function prova(massa: number, d = new Vetor3(2, 2, 1), h = -3, theta = 0, v = Vetor3.zero, omega = 0, corrente = 0) {
  const ambiente = new AmbienteTerrestre(), ref = ambiente.referencial;
  const costa = new GeografiaCosteira(ref, { inicioArcoM: -100, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 1000, nivelMarM: 0 });
  const agua = new RegiaoAquatica('prova', costa, 1000, corrente);
  const o = new Objeto({ id: 'prova', massaBaseKg: massa, dimensoesM: d, resistenciaColisaoJ: 1e6, limiteTermicoC: 1000,
    areaFrontalM2: 2, estadoInicial: { posicaoM: ref.posicaoPorArcoM(0, h), velocidadeMps: v,
      orientacaoRad: new Vetor3(0, 0, theta), velocidadeAngularRadps: new Vetor3(0, 0, omega) } });
  const sistema = new SistemaHidrodinamico([agua], p => ambiente.campo.aceleracaoEm(p));
  sistema.registrar(o, { dimensoesM: d, coeficienteArrasto: 1 });
  return { ambiente, agua, o, sistema };
}
describe('Arrasto distribuído e estabilidade', () => {
  it('segue v² e se opõe à translação, com área orientada', () => {
    const medir = (v: number, theta = 0) => { const b = prova(4000, undefined, -3, theta, new Vetor3(v, 0, 0)); return b.sistema.calcular(b.o).estados[0]; };
    const a = medir(2), b = medir(4); expect(a.forcaArrastoN.x).toBeCloseTo(-4000, 5);
    expect(b.forcaArrastoN.x / a.forcaArrastoN.x).toBeCloseTo(4, 8); expect(medir(-2).forcaArrastoN.x).toBeGreaterThan(0);
    const ret = prova(8000, new Vetor3(1, 8, 1), -8, Math.PI / 2, new Vetor3(2, 0, 0));
    expect(ret.sistema.calcular(ret.o).estados[0].forcaArrastoN.x).toBeCloseTo(-2000, 5);
  });
  it('resiste ao giro por forças de velocidade local e dissipa trabalho relativo', () => {
    for (const omega of [-1, 1]) {
      const b = prova(4000, undefined, -3, 0, Vetor3.zero, omega);
      const s = b.sistema.calcular(b.o).estados[0];
      expect(s.torqueHidrodinamicoNm.z * omega).toBeLessThan(0); expect(s.potenciaDissipadaW).toBeGreaterThan(0);
      expect(s.forcaArrastoN.magnitude).toBeLessThan(1e-8);
    }
  });
  it('usa corrente física em vez da velocidade absoluta', () => {
    const b = prova(4000, undefined, -3, 0, new Vetor3(2, 0, 0), 0, 2);
    expect(b.sistema.calcular(b.o).estados[0].forcaArrastoN.magnitude).toBeLessThan(1e-5);
  });
  it('centro de empuxo restaura corpo largo e desestabiliza corpo alto, com sinais espelhados', () => {
    for (const theta of [-0.01, 0.01]) {
      const largo = prova(4000, new Vetor3(4, 2, 1), 0, theta), alto = prova(4000, new Vetor3(1, 8, 1), 0, theta);
      expect(largo.sistema.calcular(largo.o).estados[0].torqueHidrodinamicoNm.z * theta).toBeLessThan(0);
      expect(alto.sistema.calcular(alto.o).estados[0].torqueHidrodinamicoNm.z * theta).toBeGreaterThan(0);
    }
  });
  it('atinge calado analítico sem ancoragem e preserva massa', () => {
    const b = prova(1000, new Vetor3(4, 1, 1), 0.4), m = new MundoFisico(1 / 240, { ambiente: b.ambiente, regioesAquaticas: [b.agua] });
    m.registrarObjeto(b.o); m.registrarGeometriaAquatica(b.o, { dimensoesM: b.o.dimensoesM, coeficienteArrasto: 1 });
    m.avancar(120);
    const s = m.obterImersao(b.o)[0];
    // Arrasto quadrático: amortecimento assintótico. Orçamento de 5 mm (2% do calado de 0,25 m) após 120 s.
    expect(Math.abs(b.o.getEstadoFisico().posicaoM.y - 0.25)).toBeLessThan(0.005);
    expect(Math.abs(s.volumeSubmersoM3 - 1)).toBeLessThan(0.02);
    expect(b.o.massaKg).toBe(1000); expect(m.obterContatosDoObjeto(b.o)).toHaveLength(0);
  }, 30_000);
  it('corpo denso afunda, mesmo tendo empuxo e resistência', () => {
    const b = prova(6000, undefined, -3), m = new MundoFisico(1 / 240, { ambiente: b.ambiente, regioesAquaticas: [b.agua] });
    m.registrarObjeto(b.o); m.registrarGeometriaAquatica(b.o, { dimensoesM: b.o.dimensoesM, coeficienteArrasto: 1 }); m.avancar(5);
    expect(b.o.getEstadoFisico().posicaoM.y).toBeLessThan(-10); expect(b.o.getEstadoFisico().velocidadeMps.y).toBeLessThan(0);
  });
  it('reduz exposição do ar continuamente e elimina arrasto atmosférico submerso', () => {
    const b = prova(4000, undefined, -3, 0, new Vetor3(2, 0, 0)), m = new MundoFisico(1 / 240, { ambiente: b.ambiente, regioesAquaticas: [b.agua] });
    m.registrarObjeto(b.o); m.registrarGeometriaAquatica(b.o, { dimensoesM: b.o.dimensoesM, coeficienteArrasto: 1 });
    expect(m.obterForcaArrastoAtmosferico(b.o).magnitude).toBe(0);
    const parcial = prova(4000, undefined, 0), seco = prova(4000, undefined, 3);
    expect(parcial.sistema.fracaoExpostaAr(parcial.o)).toBeCloseTo(0.5, 8); expect(seco.sistema.fracaoExpostaAr(seco.o)).toBe(1);
  });
  it('refina dt sem cortar velocidade e é determinístico', () => {
    const simular = (dt: number) => {
      const b = prova(6000, undefined, -3, 0, new Vetor3(0, -50, 0));
      const m = new MundoFisico(dt, { ambiente: b.ambiente, regioesAquaticas: [b.agua] });
      m.registrarObjeto(b.o); m.registrarGeometriaAquatica(b.o, { dimensoesM: b.o.dimensoesM, coeficienteArrasto: 1 });
      for (let i = 0; i < 240; i++) m.avancar(1 / 240); return b.o.getEstadoFisico();
    };
    const a = simular(1 / 240), b = simular(1 / 480); expect(a).toEqual(simular(1 / 240));
    // Erro de trajetória < 5 cm após 1 s na queda inicial a 50 m/s.
    expect(a.posicaoM.subtrair(b.posicaoM).magnitude).toBeLessThan(0.05);
    expect(a.velocidadeMps.y).toBeLessThan(0);
  });
});
