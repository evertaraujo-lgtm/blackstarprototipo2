import { describe, expect, it, afterAll } from 'vitest';
import { setImmediate } from 'node:timers/promises';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { criarTesteBss006 } from '../cenarios/BancadaBss';
import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { Vetor3 } from '../physics/Vetor3';
import { CASOS_M10, fisicaBancada, hashFisica, type ReferenciaCasoM10 } from '../validacao/ReferenciaBancadaM10';

const DT = 1 / 240, referencias: ReferenciaCasoM10[] = [];
const destino = process.env.M10_REFERENCIA_DIR;
const antiga: ReferenciaCasoM10[] = destino ? [] : JSON.parse(readFileSync('docs/validacoes/2026-10-13-m10-referencia-bancada.json', 'utf8')).casos;
describe('M10-E — referência independente do voo na bancada', () => {
  it.each(CASOS_M10)('$id: coleta física completa em instância separada', async caso => {
    const b = criarTesteBss006({ ambienteFisico: new AmbienteTerrestre(), velocidadeArMps: new Vetor3(caso.ventoMps, 0, 0) });
    b.selecionarPontoPousoX!(caso.alvoM);
    for (const s of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(b.propulsorControlavel.ligarSistema(s)).toBe(true);
    if (caso.falha !== 'sem-ignicao') expect(b.propulsorControlavel.solicitarIgnicao()).toBe(true);
    const frames: { passo: number; sha256: string }[] = [{ passo: 0, sha256: hashFisica(fisicaBancada(b)) }];
    let trocou = false, desceu = false, toque = false, repouso = 0, apogeuM = 0, passos = 0, passoFalha;
    for (let i = 0; i < (caso.falha === 'sem-ignicao' ? 2 : caso.falha !== 'nenhuma' ? 60 : 180) / DT; i++) {
      if (i % 2400 === 0) await setImmediate();
      const ref = b.mundo.ambiente.referencial, antes = b.seguirObjeto.getEstadoFisico();
      if (!trocou && ref.altitudeGeometricaM(antes.posicaoM) >= 300) { b.ativarModoBss04!('pouso'); trocou = true; }
      if (caso.falha !== 'nenhuma' && caso.falha !== 'sem-ignicao' && passoFalha === undefined && ref.altitudeGeometricaM(antes.posicaoM) > 80) {
        passoFalha = i;
        if (caso.falha === 'eletrica') b.propulsorControlavel.conexaoEletrica!.romper();
        else b.linhasComFalhaControlavel[caso.falha === 'metano' ? 'combustivel' : 'oxidante'].romper();
      }
      b.atualizarControle?.(); b.mundo.avancar(DT); passos = i + 1;
      const e = b.seguirObjeto.getEstadoFisico(), h = ref.altitudeGeometricaM(e.posicaoM);
      apogeuM = Math.max(apogeuM, h); desceu ||= ref.vetorParaLocal(e.velocidadeMps, e.posicaoM).y < -1;
      toque ||= desceu && b.mundo.obterContatosComSuperficie().some(ct => ct.impulsoNormalNs > 0 && (ct.objetoId === b.seguirObjeto.id || /sapata|perna/.test(ct.objetoId)));
      const quietos = e.velocidadeMps.magnitude <= .05 && b.objetos.every(o => o.getEstadoFisico().velocidadeMps.magnitude <= .1 && o.getEstadoFisico().velocidadeAngularRadps.magnitude <= .01);
      const geometrico = toque && h < 8 && b.objetos.some(o => b.mundo.obterMenorDistanciaSuperficieM(o, b.superficies[0]) <= .001);
      repouso = geometrico && quietos && b.propulsorControlavel.empuxoAtualN === 0 ? repouso + DT : 0;
      if (passos % 240 === 0 || repouso >= 3) frames.push({ passo: passos, sha256: hashFisica(fisicaBancada(b)) });
      if (caso.falha === 'nenhuma' && repouso >= 3) break;
    }
    const r = JSON.parse(JSON.stringify({ id: caso.id, passos, passoFalha, apogeuM, repousoGeometricoS: repouso, frames, final: fisicaBancada(b) })) as ReferenciaCasoM10;
    if (caso.falha === 'nenhuma') { expect(repouso).toBeGreaterThanOrEqual(3); expect(r.final.corpos.every(c => c.integridade === 1)).toBe(true); }
    else if (caso.falha === 'sem-ignicao') expect(r.final.engenharia.combustivelKg).toBe(3000);
    else expect(Math.min(...r.final.corpos.map(c => c.integridade))).toBeLessThan(1);
    if (!destino) expect(r).toEqual(antiga.find(x => x.id === caso.id));
    referencias.push(r);
  }, 120_000);
});
afterAll(() => { if (destino) { mkdirSync(destino, { recursive: true }); writeFileSync(`${destino}/m10-referencia-bancada.json`, JSON.stringify({ baseMontagem: '14f6c52', passoS: DT, casos: referencias }, null, 2) + '\n'); } });
