import { it, expect } from 'vitest';
import { setImmediate } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { criarTesteBss006 } from '../cenarios/BancadaBss';
import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { BSS006_VOO_EXPERIMENTAL } from './MissaoBss006';
import { fisicaBancada, fisicaMissao } from '../validacao/ReferenciaBancadaM10';
import { reproduzirDiarioBss006 } from './ReplayMissaoBss006';

// Não substitui as referências imutáveis M10. Compara consumidores independentes
// da MESMA revisão corrigida, mantendo critérios físicos existentes.
it.each([false, true])('RE-002: bancada e missão atuais são exatas em voo completo; falha elétrica=%s', async falhaEletrica => {
  const b = criarTesteBss006({ ambienteFisico: new AmbienteTerrestre() });
  const m = BSS006_VOO_EXPERIMENTAL.criar();
  for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) {
    expect(b.propulsorControlavel.ligarSistema(sistema)).toBe(true);
    expect(m.receberComando({ tipo: 'sistema', sistema, ligar: true }).aceito).toBe(true);
  }
  expect(b.propulsorControlavel.solicitarIgnicao()).toBe(true);
  expect(m.receberComando({ tipo: 'ignicao' }).aceito).toBe(true); m.iniciar();
  let trocou = false, injetouFalha = false, repousoAtingido = false;
  const verificar = () => expect(JSON.parse(JSON.stringify(fisicaMissao(m.observar()))))
    .toEqual(JSON.parse(JSON.stringify(fisicaBancada(b))));
  verificar();
  for (let passo = 0; passo < (falhaEletrica ? 60 : 180) * 240; passo++) {
    if (passo % 2400 === 0) await setImmediate();
    const h = b.mundo.ambiente.referencial.altitudeGeometricaM(b.seguirObjeto.getEstadoFisico().posicaoM);
    if (!trocou && h >= 300) { b.ativarModoBss04!('pouso'); trocou = true; }
    if (falhaEletrica && !injetouFalha && h > 80) {
      b.propulsorControlavel.conexaoEletrica!.romper();
      expect(m.receberComando({ tipo: 'falha-alimentacao', alimentacao: 'eletrica' }).aceito).toBe(true); injetouFalha = true;
    }
    b.atualizarControle?.(); b.mundo.avancar(1 / 240); m.avancarPasso();
    if ((passo + 1) % 240 === 0) verificar();
    if (!falhaEletrica && m.obterEventos().some(e => e.tipo === 'repouso-geometrico')) { verificar(); repousoAtingido = true; break; }
  }
  const o = m.observar();
  if (falhaEletrica) {
    expect(injetouFalha).toBe(true); expect(o.empuxoN).toBe(0);
    expect(o.integridadeMinima).toBeLessThan(1); expect(o.fixadores.some(f => f.estado === 'rompido')).toBe(true);
  } else {
    expect(trocou).toBe(true); expect(repousoAtingido).toBe(true); expect(o.integridadeMinima).toBe(1);
    expect(o.pouso.repousoGeometricoS).toBeGreaterThanOrEqual(3); expect(o.pouso.limitesToqueAtendidos).toBe(true);
  }
}, 180_000);

it('RE-002: o diário histórico permanece intacto e é recusado pela revisão física atual', () => {
  const original = JSON.parse(readFileSync('docs/validacoes/2026-10-13-m10-diario-node.json', 'utf8'));
  expect(original.passosExecutados).toBe(18308);
  expect(() => reproduzirDiarioBss006(original)).toThrow(/Revisão, modelo físico/);
});
