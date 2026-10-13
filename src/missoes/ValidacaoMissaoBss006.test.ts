import { describe, expect, it, afterAll } from 'vitest';
import { setImmediate } from 'node:timers/promises';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { BSS006_VOO_EXPERIMENTAL, CRITERIOS_RETORNO_BSS006 } from './MissaoBss006';
import { CASOS_M10, fisicaMissao, hashFisica, type ReferenciaCasoM10 } from '../validacao/ReferenciaBancadaM10';

const referencias: ReferenciaCasoM10[] = JSON.parse(readFileSync('docs/validacoes/2026-10-13-m10-referencia-bancada.json', 'utf8')).casos;
const evidencias: object[] = [];
describe('M10-E — equivalência exata e determinismo em instâncias independentes', () => {
  it.each(CASOS_M10)('$id: mesmos estados, controles, massa, contatos e consumo da bancada', async caso => {
    const r = referencias.find(x => x.id === caso.id)!;
    const m = BSS006_VOO_EXPERIMENTAL.criar({ alvoPousoLocalM: caso.alvoM, ventoTangencialMps: caso.ventoMps });
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(m.receberComando({ tipo: 'sistema', sistema, ligar: true }).aceito).toBe(true);
    if (caso.falha !== 'sem-ignicao') expect(m.receberComando({ tipo: 'ignicao' }).aceito).toBe(true);
    m.iniciar(); let frame = 0;
    const conferir = () => {
      const esperado = r.frames[frame]; if (esperado?.passo !== m.passosExecutados) return;
      expect(hashFisica(fisicaMissao(m.observar())), `Divergência no passo ${m.passosExecutados}`).toBe(esperado.sha256); frame++;
    };
    conferir();
    for (let i = 0; i < r.passos; i++) {
      if (i % 2400 === 0) await setImmediate();
      if (i === r.passoFalha && caso.falha !== 'nenhuma' && caso.falha !== 'sem-ignicao') m.receberComando({ tipo: 'falha-alimentacao', alimentacao: caso.falha });
      m.avancarPasso(); conferir();
    }
    const o = m.observar(); expect(frame).toBe(r.frames.length);
    expect(JSON.parse(JSON.stringify(fisicaMissao(o)))).toEqual(r.final);
    if (caso.falha === 'nenhuma') {
      expect(o.pouso.toqueRetorno).toBe(true); expect(o.pouso.limitesToqueAtendidos).toBe(true);
      expect(o.pouso.repousoGeometricoS).toBeGreaterThanOrEqual(3); expect(o.integridadeMinima).toBe(1);
      expect(o.fixadores.every(f => f.estado === 'integro')).toBe(true);
      expect(o.pouso.pousoEstruturalmenteSeguro).toBe(false);
      expect(m.obterEventos().some(e => e.tipo === 'transicao-pouso')).toBe(true);
      expect(m.obterEventos().some(e => e.tipo === 'repouso-geometrico')).toBe(true);
    } else if (caso.falha === 'sem-ignicao') {
      expect(o.metanoKg).toBe(600); expect(o.oxidanteKg).toBe(2400); expect(o.empuxoN).toBe(0);
      expect(o.pouso.toqueRetorno).toBe(false); expect(m.obterEventos().some(e => e.tipo === 'decolagem')).toBe(false);
    } else {
      expect(o.empuxoN).toBe(0); expect(o.integridadeMinima).toBeLessThan(1);
      expect(o.fixadores.some(f => f.estado === 'rompido')).toBe(true); expect(o.pouso.pousoEstruturalmenteSeguro).toBe(false);
      expect(m.obterEventos().some(e => e.tipo === 'dano-estrutural')).toBe(true);
      expect(m.receberComando({ tipo: 'ignicao' }).aceito).toBe(false);
    }
    evidencias.push({ caso, framesExatos: frame, apogeuM: r.apogeuM, final: o, eventos: m.obterEventos() });
  }, 120_000);
  it('observações frequentes não alteram determinismo de estado e eventos', () => {
    const a = BSS006_VOO_EXPERIMENTAL.criar({ ventoTangencialMps: 5 }), b = BSS006_VOO_EXPERIMENTAL.criar({ ventoTangencialMps: 5 });
    for (const m of [a, b]) { for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) m.receberComando({ tipo: 'sistema', sistema, ligar: true }); m.receberComando({ tipo: 'ignicao' }); m.iniciar(); }
    for (let i = 0; i < 480; i++) { a.avancarPasso(); b.avancarPasso(); if (i % 40 === 0) a.observar(); }
    expect(a.observar()).toEqual(b.observar()); expect(a.obterEventos()).toEqual(b.obterEventos());
  }, 30_000);
});
afterAll(() => { if (process.env.M10_EVIDENCIAS_DIR) {
  mkdirSync(process.env.M10_EVIDENCIAS_DIR, { recursive: true });
  writeFileSync(`${process.env.M10_EVIDENCIAS_DIR}/m10-missoes.json`, JSON.stringify({ base: '00db5fe', passoS: 1 / 240, criterios: CRITERIOS_RETORNO_BSS006, evidencias }, null, 2) + '\n');
} });
