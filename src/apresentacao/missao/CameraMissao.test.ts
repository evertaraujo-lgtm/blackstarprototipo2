import { describe, expect, it } from 'vitest';
import { BSS006_VOO_EXPERIMENTAL } from '../../missoes/MissaoBss006';
import { CameraMissao } from './CameraMissao';

 describe('M10-G — projeção independente', () => {
  it('centraliza conjunto, acompanha sítio radial, faz round-trip e respeita sinal Canvas', () => {
    const m = BSS006_VOO_EXPERIMENTAL.criar({ arcoBaseM: 1e6 }); const o = m.observar();
    const c = new CameraMissao(o, 1000, 600, 0.1);
    const p = c.projetar(o.casco.posicaoM); expect(p.x).toBeCloseTo(500, 6); expect(p.y).toBeCloseTo(350, 6);
    expect(c.pontoNaTela(p.x, p.y).subtrair(o.casco.posicaoM).magnitude).toBeLessThan(1e-8);
    expect(c.anguloCanvas(o.casco.orientacaoRad.z)).toBeCloseTo(0, 6);
    expect(c.anguloCanvas(o.casco.orientacaoRad.z + 0.1)).toBeCloseTo(-0.1, 6);
  });
  it('zoom e enquadramento não alteram física, consumo ou eventos', () => {
    const m = BSS006_VOO_EXPERIMENTAL.criar(); const antes = m.observar(); const eventos = m.obterEventos();
    for (const escala of [0.05, 0.12, 0.8]) new CameraMissao(antes, 390, 440, escala).projetar(antes.casco.posicaoM);
    expect(m.observar()).toEqual(antes); expect(m.obterEventos()).toEqual(eventos);
    expect(() => new CameraMissao(antes, 390, 440, 0)).toThrow('inválida');
  });
 });
