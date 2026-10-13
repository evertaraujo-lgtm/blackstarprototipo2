import { describe, expect, it } from 'vitest';
import { setImmediate } from 'node:timers/promises';
import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { Vetor3 } from '../physics/Vetor3';
import { criarTesteBss006 } from './BancadaBss';

const DT = 1 / 240;
describe('M9-G — envelope da guiagem BSS-006 em Terra esférica', () => {
  it.each([
    { alvoM: 34.7, ventoMps: 0 }, { alvoM: -34.7, ventoMps: 0 },
    { alvoM: 0, ventoMps: 5 }, { alvoM: 0, ventoMps: -5 },
  ])('repouso geométrico após subida a 300m, alvo $alvoM, vento $ventoMps', async ({ alvoM, ventoMps }) => {
    const c = criarTesteBss006({ ambienteFisico: new AmbienteTerrestre(), velocidadeArMps: new Vetor3(ventoMps, 0, 0) });
    const ref = c.mundo.ambiente.referencial;
    const motor = c.propulsorControlavel;
    expect(c.selecionarPontoPousoX!(alvoM)).toBe(true);
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(motor.ligarSistema(sistema)).toBe(true);
    motor.definirThrottle(0.65); expect(motor.solicitarIgnicao()).toBe(true);
    let pouso = false, desceu = false, repousoS = 0;
    let toque: { radial: number; tangencial: number; atitude: number; omega: number; erro: number } | undefined;
    for (let passo = 0; passo < 180 / DT && repousoS < 3; passo++) {
      if (passo % 2400 === 0) await setImmediate();
      const antes = c.seguirObjeto.getEstadoFisico();
      if (!pouso && ref.altitudeGeometricaM(antes.posicaoM) >= 300) { c.ativarModoBss04!('pouso'); pouso = true; }
      c.atualizarControle?.(); c.mundo.avancar(DT);
      const depois = c.seguirObjeto.getEstadoFisico();
      desceu ||= pouso && ref.vetorParaLocal(depois.velocidadeMps, depois.posicaoM).y < -1;
      const contato = desceu && c.mundo.obterContatosComSuperficie().some(ct => ct.impulsoNormalNs > 0
        && (ct.objetoId === c.seguirObjeto.id || /sapata|perna/.test(ct.objetoId)));
      if (!toque && contato) {
        const v = ref.vetorParaLocal(antes.velocidadeMps, antes.posicaoM);
        toque = { radial: v.y, tangencial: v.x, atitude: ref.atitudeLocalRad(antes.orientacaoRad.z, antes.posicaoM),
          omega: ref.taxaAtitudeLocalRadps(antes.velocidadeAngularRadps.z, antes.posicaoM, antes.velocidadeMps),
          erro: ref.erroHorizontalM(alvoM, antes.posicaoM) };
      }
      const geometriaNoSolo = toque && ref.altitudeGeometricaM(depois.posicaoM) < 8
        && c.objetos.some(o => c.mundo.obterMenorDistanciaSuperficieM(o, c.superficies[0]) <= 0.001);
      const quietos = depois.velocidadeMps.magnitude <= 0.05 && c.objetos.every(o => o.getEstadoFisico().velocidadeMps.magnitude <= 0.1
        && o.getEstadoFisico().velocidadeAngularRadps.magnitude <= 0.01);
      repousoS = geometriaNoSolo && quietos && motor.empuxoAtualN === 0 ? repousoS + DT : 0;
    }
    const diagnostico = JSON.stringify({ tempoS: c.mundo.tempoS, toque, repousoS });
    expect(toque, diagnostico).toBeDefined();
    expect(Math.abs(toque!.radial), diagnostico).toBeLessThan(0.2);
    expect(Math.abs(toque!.tangencial), diagnostico).toBeLessThan(0.2);
    expect(Math.abs(toque!.atitude), diagnostico).toBeLessThan(0.01);
    expect(Math.abs(toque!.omega), diagnostico).toBeLessThan(0.01);
    expect(Math.abs(toque!.erro), diagnostico).toBeLessThan(1);
    expect(repousoS, diagnostico).toBeGreaterThanOrEqual(3);
    expect(c.objetos.every(o => o.integridadeEstrutural === 1)).toBe(true);
    expect(c.fixadores.some(f => f.estaRompido)).toBe(false);
  }, 120_000);
});
