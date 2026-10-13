import { describe, expect, it } from 'vitest';
import { CampoCentral, CampoUniforme, TERRA } from './CampoGravitacional';
import { Vetor3 } from '../Vetor3';

describe('M9-B — campo gravitacional independente de veículos', () => {
  const campo = new CampoCentral();
  it.each([0, 15_000, 100_000, 400_000])('valida μ/r² a %i m em todo o plano', (h) => {
    const r = TERRA.raioM + h;
    for (const angulo of [0, 0.3, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const radial = new Vetor3(Math.sin(angulo), Math.cos(angulo), 0);
      const p = campo.centroM.adicionar(radial.multiplicar(r));
      const a = campo.aceleracaoEm(p);
      expect(Math.abs(a.magnitude / (TERRA.muM3S2 / r ** 2) - 1)).toBeLessThan(1e-12);
      expect(a.produtoVetorial(radial).magnitude).toBeLessThan(1e-12);
      expect(a.produtoEscalar(radial)).toBeLessThan(0);
      expect(campo.aceleracaoEm(p)).toEqual(a);
    }
  });
  it('mantém g0 distinto da gravidade superficial e não depende de massa/atitude', () => {
    expect(campo.aceleracaoEm(Vetor3.zero).magnitude).toBeCloseTo(9.820250487, 8);
    expect(campo.aceleracaoEm(Vetor3.zero).magnitude).not.toBe(TERRA.g0Mps2);
    const g = new CampoUniforme();
    expect(g.aceleracaoEm(new Vetor3(1e7, 1e7, 0))).toEqual(new Vetor3(0, -9.80665, 0));
  });
  it('rejeita singularidade e constantes inválidas sem produzir NaN', () => {
    expect(() => campo.aceleracaoEm(campo.centroM)).toThrow(/singular/);
    for (const mu of [0, -1, Infinity, NaN]) expect(() => new CampoCentral(Vetor3.zero, mu)).toThrow();
  });
  it('campo varia continuamente em torno da plataforma', () => {
    const a = campo.aceleracaoEm(new Vetor3(-0.001, 0, 0));
    const b = campo.aceleracaoEm(new Vetor3(0.001, 0, 0));
    expect(a.subtrair(b).magnitude).toBeLessThan(4e-9);
  });
});
