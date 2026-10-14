import { describe, expect, it } from 'vitest';
import { Vetor3 } from './Vetor3';
import { Objeto } from './objetos/base/Objeto';
import { ConjuntoEstruturalRigido } from './estruturas/ConjuntoEstruturalRigido';

const corpo = (id: string, x: number) => new Objeto({ id, massaBaseKg: 10, dimensoesM: new Vetor3(1, 2, 3),
  resistenciaColisaoJ: 1000, limiteTermicoC: 1000, estadoInicial: { posicaoM: new Vetor3(x, 0, 0) } });
describe('M11-P — caches de propriedades físicas', () => {
  it('lote de kicks reproduz exatamente projeções individuais, inclusive torque e massa variável', () => {
    for (const carga of [0, 3.25, 18]) {
      const montar = () => {
        const a = corpo('a', -1.234), b = corpo('b', 2.678); b.definirMassaVariavelKg(carga);
        a.atualizarEstadoPeloCore({ ...a.getEstadoFisico(), velocidadeMps: new Vetor3(1.01, -2.34, 0), velocidadeAngularRadps: new Vetor3(0, 0, 0.123) });
        b.atualizarEstadoPeloCore({ ...b.getEstadoFisico(), velocidadeMps: new Vetor3(-0.456, 3.456, 0), velocidadeAngularRadps: new Vetor3(0, 0, -0.04) });
        return { a, b, ilha: new ConjuntoEstruturalRigido([a, b]) };
      };
      const original = montar(), lote = montar();
      const impulsos = Array.from({ length: 27 }, (_, i) => ({ impulsoNs: new Vetor3(Math.sin(i) * 0.123, Math.cos(i) * 0.456, 0), pontoM: new Vetor3(i / 19, -i / 13, 0) }));
      for (const j of impulsos) original.ilha.aplicarImpulsoNoPonto(j.impulsoNs, j.pontoM);
      lote.ilha.aplicarImpulsosSequenciais(impulsos);
      expect(lote.a.getEstadoFisico()).toEqual(original.a.getEstadoFisico()); expect(lote.b.getEstadoFisico()).toEqual(original.b.getEstadoFisico());
    }
  });
  it('módulo mantém Math.hypot exato, JSON portátil e consulta em vetor congelado', () => {
    const v = Object.freeze(new Vetor3(1.234, -5.678, 9.1));
    expect(v.magnitude).toBe(Math.hypot(v.x, v.y, v.z)); expect(v.magnitude).toBe(Math.hypot(v.x, v.y, v.z));
    expect(JSON.parse(JSON.stringify(v))).toEqual({ x: 1.234, y: -5.678, z: 9.1 });
    for (const invalido of [NaN, Infinity, -Infinity]) expect(() => new Vetor3(0, invalido, 0)).toThrow();
  });
  it('snapshot cinemático permanece imutável e não muda após escrita do core', () => {
    const o = corpo('snapshot', 0), antes = o.getEstadoFisico();
    expect(Object.isFrozen(antes)).toBe(true);
    expect(Reflect.set(antes, 'posicaoM', new Vetor3(100, 0, 0))).toBe(false);
    o.atualizarEstadoPeloCore({ ...antes, posicaoM: new Vetor3(2, 0, 0) });
    expect(antes.posicaoM.x).toBe(0); expect(o.getEstadoFisico().posicaoM.x).toBe(2);
  });
  it('centro e inércia respondem a massa redistribuída e pose nova, sem mudar massa total', () => {
    const a = corpo('a', 0), b = corpo('b', 4); a.definirMassaVariavelKg(10);
    const ilha = new ConjuntoEstruturalRigido([a, b]);
    expect(ilha.obterCentroDeMassaAtual().x).toBe(4 / 3);
    const I = a.getMomentoInerciaKgM2().z;
    a.definirMassaVariavelKg(0); b.definirMassaVariavelKg(10);
    expect(ilha.massaTotalKg).toBe(30); expect(ilha.obterCentroDeMassaAtual().x).toBe(8 / 3);
    expect(a.getMomentoInerciaKgM2().z).toBe(I / 2);
    b.atualizarEstadoPeloCore({ ...b.getEstadoFisico(), posicaoM: new Vetor3(7, 0, 0) });
    expect(ilha.obterCentroDeMassaAtual().x).toBeCloseTo(14 / 3, 14);
  });
});
