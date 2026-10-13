import { describe, expect, it, afterAll } from 'vitest';
import { setImmediate } from 'node:timers/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { criarTesteBss001, criarTesteBss002, criarTesteBss004, criarTesteBss005, criarTesteBss006, type AmbienteBancadaBss } from './BancadaBss';
import { criarTesteBss003 } from './BancadaBss003';
import { AmbientePlano, AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';

const DT = 1 / 240;
const fabricas = [criarTesteBss001, criarTesteBss002, criarTesteBss003, criarTesteBss004, criarTesteBss005, criarTesteBss006];
const evidencias: object[] = [];

async function voo(fabrica: typeof fabricas[number], configuracao: AmbienteBancadaBss, falha: 'nenhuma' | 'eletrica' = 'nenhuma') {
  const c = fabrica(configuracao);
  const ref = c.mundo.ambiente.referencial;
  const casco = c.seguirObjeto;
  const motores = 'gruposPropulsao' in c ? c.gruposPropulsao[0].propulsores : [c.propulsorControlavel];
  const tanques = c.objetos.filter((o): o is TanquePropelente => o instanceof TanquePropelente);
  const combustivel = () => tanques.reduce((n, t) => n + t.massaPropelenteKg, 0);
  const inicial = combustivel();
  for (const motor of motores) {
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(motor.ligarSistema(sistema)).toBe(true);
    motor.definirThrottle(0.65); expect(motor.solicitarIgnicao()).toBe(true);
  }
  let trocou = false, apogeu = 0, repousoS = 0, repousoGeometricoS = 0, maiorRepousoBilateralS = 0, maiorRepousoGeometricoS = 0;
  let primeiroImpacto, toqueVeiculo;
  let eventoTroca;
  let picoVelocidadeRadial = 0, picoEmpuxo = 0;
  for (let passo = 0; passo < 120 / DT; passo++) {
    if (passo % 2400 === 0) await setImmediate();
    const e = casco.getEstadoFisico();
    const h = ref.altitudeGeometricaM(e.posicaoM);
    if (!trocou && h >= 80) {
      trocou = true;
      eventoTroca = { tempoS: c.mundo.tempoS, altitudeM: h, velocidadeRadialMps: ref.vetorParaLocal(e.velocidadeMps, e.posicaoM).y, combustivelKg: combustivel() };
      if (falha === 'eletrica') for (const m of motores) m.desligarSistema('elétrico');
      else if ('ativarControleBss03' in c) c.ativarControleBss03('pouso');
      else if (c.ativarModoBss04) c.ativarModoBss04('pouso');
      else for (const m of motores) m.definirThrottle(0); // corte manual, sem controle de pouso instalado
    }
    if ('atualizarControle' in c) c.atualizarControle?.();
    try { c.mundo.avancar(DT); } catch (error) {
      throw new Error(`${String(error)}; t=${c.mundo.tempoS}; estados=${JSON.stringify(c.objetos.map((o) => ({ id: o.id, e: o.getEstadoFisico() })))} `);
    }
    const estado = casco.getEstadoFisico();
    apogeu = Math.max(apogeu, ref.altitudeGeometricaM(estado.posicaoM));
    picoVelocidadeRadial = Math.max(picoVelocidadeRadial, Math.abs(ref.vetorParaLocal(estado.velocidadeMps, estado.posicaoM).y));
    picoEmpuxo = Math.max(picoEmpuxo, ...motores.map((m) => m.empuxoAtualN));
    for (const contato of c.mundo.obterContatosComSuperficie()) {
      if (contato.penetracaoM < 0 || contato.impulsoNormalNs <= 0 || !trocou) continue;
      const registro = { tempoS: c.mundo.tempoS, ...contato };
      primeiroImpacto ??= registro;
      if (contato.objetoId === casco.id || /perna|sapata|trem/.test(contato.objetoId)) toqueVeiculo ??= registro;
    }
    const temContato = c.mundo.obterContatosComSuperficie().some((ct) => ct.emApoio);
    const sapatas = c.objetos.filter((o) => o.id.includes('sapata'));
    const bilateral = sapatas.length === 0 || sapatas.every((o) => c.mundo.obterContatosDoObjeto(o).some((ct) => ct.emApoio));
    const quietos = casco.getEstadoFisico().velocidadeMps.magnitude <= 0.05 && c.objetos.every((o) => o.getEstadoFisico().velocidadeMps.magnitude <= 0.1 && o.getEstadoFisico().velocidadeAngularRadps.magnitude <= 0.01);
    const motoresApagados = c.objetos.every((o) => !('empuxoAtualN' in o) || o.empuxoAtualN === 0);
    const geometriaNoSolo = trocou && quietos && motoresApagados && c.objetos.some((o) => c.mundo.obterMenorDistanciaSuperficieM(o, c.superficies[0]) <= 0.001);
    repousoGeometricoS = trocou && geometriaNoSolo && quietos && motoresApagados ? repousoGeometricoS + DT : 0;
    repousoS = trocou && temContato && bilateral && quietos && motoresApagados ? repousoS + DT : 0;
    maiorRepousoBilateralS = Math.max(maiorRepousoBilateralS, repousoS);
    maiorRepousoGeometricoS = Math.max(maiorRepousoGeometricoS, repousoGeometricoS);
    if (repousoS >= 3) break;
  }
  const integridadeMinima = Math.min(...c.objetos.map((o) => o.integridadeEstrutural));
  const resultado = { nome: c.nome, modelo: c.mundo.obterConfiguracaoFisica(), falha,
    eventoTroca, apogeuM: apogeu, consumoKg: inicial - combustivel(), restanteKg: combustivel(),
    picoVelocidadeRadialMps: picoVelocidadeRadial, picoEmpuxoN: picoEmpuxo,
    primeiroImpacto, toqueVeiculo, integridadeMinima,
    fixadoresRompidos: c.fixadores.filter((f) => f.estaRompido).map((f) => f.id),
    tempoFinalS: c.mundo.tempoS, repousoContinuoS: repousoS, maiorRepousoBilateralS, maiorRepousoGeometricoS,
    repousoBilateralQualificado: maiorRepousoBilateralS >= 3, repousoGeometricoQualificado: maiorRepousoGeometricoS >= 3,
    estado: integridadeMinima < 1 ? 'dano' : repousoS >= 3 ? 'repouso-integro' : 'sem-repouso-no-watchdog',
  };
  evidencias.push(resultado);
  expect(trocou).toBe(true); expect(resultado.consumoKg).toBeGreaterThan(0); expect(picoEmpuxo).toBeGreaterThan(0);
  expect(primeiroImpacto).toBeDefined();
  return resultado;
}

describe('M9-F — mesma montagem, comandos e critérios, ambiente legado vs central', () => {
  it.each(fabricas.map((f, i) => ({ fabrica: f, numero: i + 1 })))('BSS-00$numero: decolagem, apogeu e retorno medidos', async ({ fabrica }) => {
    const legado = await voo(fabrica, { ambienteFisico: new AmbientePlano() });
    const central = await voo(fabrica, { ambienteFisico: new AmbienteTerrestre() });
    expect(central.apogeuM).toBeGreaterThan(80);
    // Não exige coincidência de pouso nem recalibra veículos: registra ambos.
    expect(Math.abs(central.apogeuM - legado.apogeuM)).toBeLessThan(10);
    if (fabrica === criarTesteBss006) {
      for (const r of [legado, central]) {
        expect(r.repousoGeometricoQualificado).toBe(true);
        expect(r.integridadeMinima).toBe(1);
        // O limite bilateral de 3 s permanece na classificação, separado do
        // repouso geométrico historicamente exigido pela BancadaBss.
        expect(r.maiorRepousoBilateralS).toBeLessThan(3);
        expect(r.repousoBilateralQualificado).toBe(false);
        expect(r.fixadoresRompidos).toHaveLength(0);
        expect(Math.abs(r.toqueVeiculo!.velocidadeNormalAntesMps)).toBeLessThan(0.2);
      }
    }
  }, 180_000);
  it('BSS-006: falha elétrica continua causando queda/dano nos dois ambientes', async () => {
    for (const ambiente of [new AmbientePlano(), new AmbienteTerrestre()]) {
      const r = await voo(criarTesteBss006, { ambienteFisico: ambiente }, 'eletrica');
      expect(r.integridadeMinima).toBeLessThan(1); expect(r.fixadoresRompidos.length).toBeGreaterThan(0);
    }
  }, 120_000);
  it('sem ignição não cria empuxo/consumo nos seis cenários em ambos os ambientes', () => {
    for (const fabrica of fabricas) for (const ambiente of [new AmbientePlano(), new AmbienteTerrestre()]) {
      const c = fabrica({ ambienteFisico: ambiente });
      const antes = c.objetos.reduce((m, o) => m + o.massaKg, 0);
      c.mundo.avancar(0.1);
      expect(c.propulsorControlavel.empuxoAtualN).toBe(0);
      expect(c.objetos.reduce((m, o) => m + o.massaKg, 0)).toBe(antes);
    }
  });
  afterAll(() => {
    const dir = process.env.M9_EVIDENCIAS_DIR;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/bss-comparacao.json`, JSON.stringify({ dtS: DT, comando: '65%; troca/corte manual em subida a 80m; watchdog observacional 120s', evidencias }, null, 2)); }
  });
});
