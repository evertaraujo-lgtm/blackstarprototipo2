import { describe, expect, it } from 'vitest';
import { criarEnsaioAmerissagem } from './EnsaioAmerissagem';

describe('BSS-006: estabilidade passiva na água', () => {
  it('tomba por momento do empuxo, sem motor, e preserva massa/estrutura', () => {
    const { mundo, veiculo: v } = criarEnsaioAmerissagem();
    const massa = v.veiculo.massaInstantaneaDoConjuntoKg;
    expect(mundo.obterImersao(v.veiculo)[0].volumeSubmersoM3).toBe(0);
    mundo.avancar(1);
    const estados = v.objetos.flatMap(o => mundo.obterImersao(o));
    expect(estados.reduce((s, x) => s + x.volumeSubmersoM3, 0)).toBeGreaterThan(0);
    expect(estados.reduce((s, x) => s + x.torqueHidrodinamicoNm.z, 0)).toBeGreaterThan(0);
    expect(v.veiculo.getEstadoFisico().velocidadeAngularRadps.z).toBeGreaterThan(0);
    mundo.avancar(7);
    const e = v.veiculo.getEstadoFisico();
    expect(Math.abs(mundo.ambiente.referencial.atitudeLocalRad(e.orientacaoRad.z, e.posicaoM))).toBeGreaterThan(1.4);
    expect(v.propulsor.empuxoAtualN).toBe(0); expect(v.propulsor.estaIgnitado).toBe(false);
    expect(v.veiculo.massaInstantaneaDoConjuntoKg).toBe(massa);
    expect(v.objetos.every(o => o.integridadeEstrutural === 1)).toBe(true);
    expect(mundo.obterContatosComSuperficie()).toHaveLength(0);
  }, 60_000);
  it('inclinação inicial oposta gera momento oposto, mantendo montagem comum', () => {
    const { mundo, veiculo: v } = criarEnsaioAmerissagem(-0.01); mundo.avancar(1);
    expect(v.objetos.flatMap(o => mundo.obterImersao(o)).reduce((s, x) => s + x.torqueHidrodinamicoNm.z, 0)).toBeLessThan(0);
    expect(v.veiculo.getEstadoFisico().velocidadeAngularRadps.z).toBeLessThan(0);
    expect(v.objetos).toHaveLength(12); expect(v.veiculo.massaInstantaneaDoConjuntoKg).toBeCloseTo(5349.1660309923745, 8);
  }, 30_000);
});
