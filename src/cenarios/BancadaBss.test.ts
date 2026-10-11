import { describe, expect, it } from 'vitest';
import { setImmediate } from 'node:timers/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { criarTesteBss006 } from './BancadaBss';
import { Vetor3 } from '../physics/Vetor3';

const DT_S = 1 / 240;
// A ilha permanece física após o toque. Pequenas oscilações numéricas do
// apoio são admissíveis; nenhum corpo é congelado para concluir o ensaio.
const TOLERANCIA_REPOUSO_MPS = 0.1;

describe('BSS-006 — voo completo da montagem usada pela interface', () => {
  it.each([
    { altitudeTrocaM: 80, alvoXM: 0, ventoXMps: 0 },
    { altitudeTrocaM: 300, alvoXM: 0, ventoXMps: 0 },
    { altitudeTrocaM: 300, alvoXM: 34.7, ventoXMps: 0 },
    { altitudeTrocaM: 300, alvoXM: -34.7, ventoXMps: 0 },
    { altitudeTrocaM: 300, alvoXM: 0, ventoXMps: -5 },
    { altitudeTrocaM: 300, alvoXM: 0, ventoXMps: 5 },
  ])('decola, muda para pouso a $altitudeTrocaM m e repousa no alvo X=$alvoXM com vento $ventoXMps m/s', async ({ altitudeTrocaM, alvoXM, ventoXMps }) => {
    const cenario = criarTesteBss006({ velocidadeArMps: new Vetor3(ventoXMps, 0, 0) });
    const { mundo, seguirObjeto: casco, propulsorControlavel: motor } = cenario;
    const tanques = cenario.objetos.filter((objeto): objeto is TanquePropelente => objeto instanceof TanquePropelente);
    const propelenteInicialKg = tanques.reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0);
    expect(cenario.selecionarPontoPousoX!(alvoXM)).toBe(true);
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) {
      expect(motor.ligarSistema(sistema)).toBe(true);
    }
    motor.definirThrottle(0.65);
    expect(motor.solicitarIgnicao()).toBe(true);

    const alturaMinimaM = (): number => Math.min(...cenario.objetos.flatMap((objeto) => {
      const estado = objeto.getEstadoFisico();
      return objeto.getPontosDeContatoLocaisM().map((ponto) => estado.posicaoM.y
        + ponto.x * Math.sin(estado.orientacaoRad.z) + ponto.y * Math.cos(estado.orientacaoRad.z));
    }));
    let mudouParaPouso = false;
    let atingiuApogeu = false;
    let toque: { velocidadeVerticalMps: number; velocidadeHorizontalMps: number; erroHorizontalM: number; atitudeRad: number; velocidadeAngularRadps: number } | undefined;
    let repousoContinuoS = 0;
    let maiorAltitudeM = 0;
    let observouEmpuxo = false;
    const transicoesAutoridade: { t: number; id: string }[] = [];

    // Limite é um watchdog do teste; nunca encerra a simulação da bancada.
    for (let passo = 0; passo < 180 / DT_S && repousoContinuoS < 3; passo += 1) {
      if (passo % 2400 === 0) await setImmediate();
      const antes = casco.getEstadoFisico();
      if (!mudouParaPouso && antes.posicaoM.y >= altitudeTrocaM) {
        expect(antes.velocidadeMps.y).toBeGreaterThan(0);
        cenario.ativarModoBss04!('pouso');
        mudouParaPouso = true;
        expect(cenario.selecionarPontoPousoX!(alvoXM + 10)).toBe(false);
      }
      cenario.atualizarControle?.();
      mundo.avancar(DT_S);
      const depois = casco.getEstadoFisico();
      const gimbal = casco.obterSolicitacoesAplicadas().filter((s) => s.recurso === 'gimbal');
      expect(gimbal).toHaveLength(1);
      const dono = gimbal[0]!.idControlador;
      expect(dono).toBe(mudouParaPouso && antes.velocidadeMps.y < -0.1 ? 'guia-pouso-bss06' : 'inclinacao');
      if (dono !== transicoesAutoridade.at(-1)?.id) transicoesAutoridade.push({ t: mundo.tempoS, id: dono });
      maiorAltitudeM = Math.max(maiorAltitudeM, depois.posicaoM.y);
      observouEmpuxo ||= motor.empuxoAtualN > 0 && motor.vazaoAtualKgS > 0;
      atingiuApogeu ||= mudouParaPouso && depois.velocidadeMps.y < -1;
      if (atingiuApogeu && !toque && alturaMinimaM() <= 1e-7) {
        toque = {
          atitudeRad: antes.orientacaoRad.z, velocidadeAngularRadps: antes.velocidadeAngularRadps.z,
          velocidadeVerticalMps: antes.velocidadeMps.y,
          velocidadeHorizontalMps: antes.velocidadeMps.x,
          erroHorizontalM: alvoXM - antes.posicaoM.x,
        };
      }
      const repousou = toque && alturaMinimaM() <= 0.001 && motor.empuxoAtualN === 0
        && depois.velocidadeMps.magnitude <= 0.05
        && cenario.objetos.every((objeto) => {
          const estado = objeto.getEstadoFisico();
          return estado.velocidadeMps.magnitude <= TOLERANCIA_REPOUSO_MPS
            && estado.velocidadeAngularRadps.magnitude <= 0.01;
        });
      repousoContinuoS = repousou ? repousoContinuoS + DT_S : 0;
      // Falhar no instante da ruptura preserva o diagnóstico do contato.
      expect(cenario.fixadores.filter((fixador) => fixador.estaRompido).map((fixador) => fixador.id)).toEqual([]);
    }

    const diagnostico = JSON.stringify({ t: mundo.tempoS, maiorAltitudeM, toque, repousoContinuoS });
    expect(observouEmpuxo).toBe(true);
    expect(mudouParaPouso).toBe(true);
    expect(atingiuApogeu).toBe(true);
    expect(maiorAltitudeM).toBeGreaterThan(altitudeTrocaM);
    expect(toque, diagnostico).toBeDefined();
    expect(Math.abs(toque!.velocidadeVerticalMps), diagnostico).toBeLessThan(0.2);
    expect(Math.abs(toque!.velocidadeHorizontalMps), diagnostico).toBeLessThan(0.2);
    expect(Math.abs(toque!.erroHorizontalM), diagnostico).toBeLessThan(1);
    expect(Math.abs(toque!.atitudeRad), diagnostico).toBeLessThan(0.01);
    expect(Math.abs(toque!.velocidadeAngularRadps), diagnostico).toBeLessThan(0.01);
    expect(repousoContinuoS, diagnostico).toBeGreaterThanOrEqual(3);
    expect(Math.abs(casco.getEstadoFisico().orientacaoRad.z)).toBeLessThan(0.01);
    expect(cenario.objetos.every((objeto) => objeto.integridadeEstrutural === 1)).toBe(true);
    expect(motor.empuxoAtualN).toBe(0);
    const restanteKg = tanques.reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0);
    expect(restanteKg).toBeLessThan(propelenteInicialKg);
    expect(restanteKg).toBeGreaterThan(0);
    if (process.env.BSS_M3_EVIDENCIAS_DIR) {
      mkdirSync(process.env.BSS_M3_EVIDENCIAS_DIR, { recursive: true });
      writeFileSync(join(process.env.BSS_M3_EVIDENCIAS_DIR, `voo-${altitudeTrocaM}-${alvoXM}-vento-${ventoXMps}.json`), JSON.stringify({
        dtS: DT_S, altitudeTrocaM, alvoXM, ventoXMps, tempoFinalS: mundo.tempoS, maiorAltitudeM, toque, repousoContinuoS,
        propelenteInicialKg, restanteKg, estadoFinal: casco.getEstadoFisico(),
        integridadeMinima: Math.min(...cenario.objetos.map((o) => o.integridadeEstrutural)),
        vinculosRompidos: cenario.fixadores.filter((f) => f.estaRompido).map((f) => f.id),
        autoridadeFinal: casco.obterSolicitacoesAplicadas(), transicoesAutoridade,
      }, null, 2));
    }
  }, 120_000);

  it('aguarda no solo sem comando de ignição mesmo com o modo pouso selecionado', () => {
    const cenario = criarTesteBss006();
    const tanques = cenario.objetos.filter((objeto): objeto is TanquePropelente => objeto instanceof TanquePropelente);
    const propelenteInicialKg = tanques.reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0);
    cenario.ativarModoBss04!('pouso');
    for (let passo = 0; passo < 240; passo += 1) {
      cenario.atualizarControle?.();
      cenario.mundo.avancar(DT_S);
    }
    expect(cenario.propulsorControlavel.estaIgnitado).toBe(false);
    expect(cenario.propulsorControlavel.empuxoAtualN).toBe(0);
    expect(cenario.seguirObjeto.getEstadoFisico().posicaoM.y).toBeCloseTo(4.8, 2);
    expect(tanques.reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0)).toBe(propelenteInicialKg);
  });

  it('a perda elétrica interrompe controle e propulsão e a queda produz dano estrutural real', async () => {
    const cenario = criarTesteBss006();
    const motor = cenario.propulsorControlavel;
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) motor.ligarSistema(sistema);
    motor.definirThrottle(0.65);
    expect(motor.solicitarIgnicao()).toBe(true);
    let perdeuEletrica = false;
    let gimbalAntesDaPerdaRad = 0;
    for (let passo = 0; passo < 60 / DT_S; passo += 1) {
      if (passo % 2400 === 0) await setImmediate();
      if (!perdeuEletrica && cenario.seguirObjeto.getEstadoFisico().posicaoM.y >= 300) {
        cenario.ativarModoBss04!('pouso');
        gimbalAntesDaPerdaRad = motor.obterEstadoDaVetorizacao().anguloAlvoRad;
        motor.desligarSistema('elétrico');
        perdeuEletrica = true;
      }
      cenario.atualizarControle?.();
      cenario.mundo.avancar(DT_S);
      if (perdeuEletrica) {
        expect(motor.sistemaEstaOperacional('controle')).toBe(false);
        expect(motor.empuxoAtualN).toBe(0);
        expect(motor.vazaoAtualKgS).toBe(0);
        expect(motor.obterEstadoDaVetorizacao().anguloAlvoRad).toBe(gimbalAntesDaPerdaRad);
        if (cenario.objetos.some((objeto) => objeto.integridadeEstrutural < 1)) break;
      }
    }
    expect(perdeuEletrica).toBe(true);
    expect(cenario.objetos.some((objeto) => objeto.integridadeEstrutural < 1)).toBe(true);
    expect(cenario.fixadores.some((fixador) => fixador.estaRompido)).toBe(true);
  }, 60_000);
});

it('retoma o PID de atitude ao sair de Pouso e preserva a ignição explícita nas transições', async () => {
  const cenario = criarTesteBss006();
  const { seguirObjeto: casco, propulsorControlavel: motor, mundo } = cenario;
  cenario.ativarModoBss04!('pouso');
  for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) motor.ligarSistema(sistema);
  mundo.avancar(DT_S);
  expect(motor.estaIgnitado).toBe(false);
  expect(motor.empuxoAtualN).toBe(0);
  cenario.ativarModoBss04!('decolagem');
  motor.definirThrottle(0.65);
  expect(motor.solicitarIgnicao()).toBe(true);
  while (casco.getEstadoFisico().posicaoM.y < 30 && mundo.tempoS < 10) {
    cenario.atualizarControle?.(); mundo.avancar(DT_S);
  }
  expect(casco.getEstadoFisico().posicaoM.y).toBeGreaterThan(30);
  cenario.ativarModoBss04!('pouso');
  while (casco.getEstadoFisico().velocidadeMps.y >= -0.1 && mundo.tempoS < 20) {
    cenario.atualizarControle?.(); mundo.avancar(DT_S);
  }
  mundo.avancar(DT_S);
  expect(casco.obterSolicitacoesAplicadas().find((s) => s.recurso === 'gimbal')?.idControlador).toBe('guia-pouso-bss06');
  cenario.ativarModoBss04!('decolagem');
  mundo.avancar(DT_S);
  expect(casco.controleDeInclinacaoEstaHabilitado).toBe(true);
  expect(casco.obterSolicitacoesAplicadas()).toHaveLength(1);
  expect(casco.obterSolicitacoesAplicadas()[0]!.idControlador).toBe('inclinacao');
  cenario.ativarModoBss04!('pouso');
  mundo.avancar(DT_S);
  expect(casco.obterSolicitacoesAplicadas().filter((s) => s.recurso === 'gimbal')).toHaveLength(1);
  expect(casco.obterSolicitacoesAplicadas().find((s) => s.recurso === 'gimbal')?.idControlador).toBe('guia-pouso-bss06');
  await setImmediate();
}, 30_000);
