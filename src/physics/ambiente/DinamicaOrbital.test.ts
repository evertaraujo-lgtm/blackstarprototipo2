import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { AmbienteTerrestre } from './AmbienteFisico';
import { TERRA } from './CampoGravitacional';
import { ReferencialEsferico } from './ReferencialFisico';
import { obterTelemetriaOrbital } from './TelemetriaOrbital';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';

// Corpo de prova inerte: mesmos material/limite térmico explicitamente declarados
// nos ensaios do core (1000 °C). Sem propulsão, área de arrasto ou controle.
const corpo = (p: Vetor3, v: Vetor3, massaKg = 10, id = 'prova') => new Objeto({
  id, massaBaseKg: massaKg, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 1e6,
  limiteTermicoC: 1000, estadoInicial: { posicaoM: p, velocidadeMps: v },
});
const raio = TERRA.raioM + 400_000;
const vc = Math.sqrt(TERRA.muM3S2 / raio);
const periodo = 2 * Math.PI * Math.sqrt(raio ** 3 / TERRA.muM3S2);
const evidencias: object[] = [];

function propagar(dt: number, e = 0, metodo: 'euler-semi-implicito' | 'verlet-gravitacional' = 'verlet-gravitacional', voltas = 1) {
  const ambiente = new AmbienteTerrestre();
  const mundo = new MundoFisico(dt, { ambiente, integracao: metodo, densidadeAtmosfericaKgM3: 0 });
  const objeto = corpo(new Vetor3(0, 400_000, 0), new Vetor3(vc * Math.sqrt(1 + e), 0, 0));
  mundo.registrarObjeto(objeto);
  const inicial = obterTelemetriaOrbital(objeto.getEstadoFisico().posicaoM, objeto.getEstadoFisico().velocidadeMps, ambiente.campo);
  const T = inicial.periodoS!;
  let minR = Infinity, maxR = 0, somaR = 0, maxEnergia = 0, maxH = 0, amostras = 0;
  let angulo = 0, phiAntes = 0;
  const cruzamentosS: number[] = [];
  const tempoFinal = T * voltas + 2 * dt;
  for (let t = 0; t < tempoFinal;) {
    const tAntes = t;
    const passo = Math.min(dt, tempoFinal - t);
    mundo.avancar(passo); t += passo;
    const estado = objeto.getEstadoFisico();
    const leitura = obterTelemetriaOrbital(estado.posicaoM, estado.velocidadeMps, ambiente.campo);
    minR = Math.min(minR, leitura.raioM); maxR = Math.max(maxR, leitura.raioM); somaR += leitura.raioM; amostras++;
    maxEnergia = Math.max(maxEnergia, Math.abs(leitura.energiaEspecificaJPorKg / inicial.energiaEspecificaJPorKg - 1));
    maxH = Math.max(maxH, Math.abs(leitura.momentoAngularEspecificoM2S / inicial.momentoAngularEspecificoM2S - 1));
    const r = estado.posicaoM.subtrair(ambiente.campo.centroM);
    const phi = Math.atan2(r.x, r.y);
    const anguloAntes = angulo;
    angulo += Math.atan2(Math.sin(phi - phiAntes), Math.cos(phi - phiAntes)); phiAntes = phi;
    const alvo = 2 * Math.PI * (cruzamentosS.length + 1);
    if (angulo >= alvo) cruzamentosS.push(tAntes + passo * (alvo - anguloAntes) / (angulo - anguloAntes));
  }
  expect(cruzamentosS).toHaveLength(voltas);
  const periodoMedidoS = cruzamentosS.at(-1)! / voltas;
  const erroPeriodoS = Math.abs(periodoMedidoS - T);
  const metricas = { dt, e, metodo, voltas, raioMedioM: somaR / amostras, perigeuM: minR - TERRA.raioM,
    apogeuM: maxR - TERRA.raioM, periodoAnaliticoS: T, periodoMedidoS, erroPeriodoS, maxEnergia, maxH,
    desvioRadialM: Math.max(Math.abs(minR - raio), Math.abs(maxR - (e ? raio * (1 + e) / (1 - e) : raio))) };
  evidencias.push(metricas);
  return { metricas, estado: objeto.getEstadoFisico() };
}

describe('M9-C — dois corpos inertes em vácuo explícito', () => {
  it('projeções e transformações são consistentes em todo o plano e a vertical móvel tem taxa própria', () => {
    const ref = new ReferencialEsferico();
    for (const phi of [0, 0.3, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const p = ref.posicaoPorArcoM(phi * TERRA.raioM, 15_000);
      expect(Math.abs(ref.altitudeGeometricaM(p) - 15_000)).toBeLessThan(1e-8);
      const v = ref.vetorParaGlobal(new Vetor3(123, -45, 0), p);
      expect(ref.vetorParaLocal(v, p).x).toBeCloseTo(123, 11);
      expect(ref.vetorParaLocal(v, p).y).toBeCloseTo(-45, 11);
      expect(ref.atitudeLocalRad(-phi, p)).toBeCloseTo(0, 12);
      expect(ref.taxaAtitudeLocalRadps(0, p, v)).toBeCloseTo(123 / (TERRA.raioM + 15000), 14);
      const local = new Vetor3(32, 12, 0);
      expect(ref.globalParaLocal(ref.localParaGlobal(local, p), p).subtrair(local).magnitude).toBeLessThan(1e-8);
    }
  });
  it('órbita circular de 400 km: 3 voltas, convergência e repetição determinística', () => {
    expect(vc).toBeCloseTo(7672.598648, 5);
    expect(periodo).toBeCloseTo(5544.855096, 5);
    const resultados = [1, 0.5, 0.25].map((dt) => propagar(dt, 0, 'verlet-gravitacional', 3));
    for (const { metricas: m } of resultados) {
      expect(m.desvioRadialM).toBeLessThan(10);
      expect(m.maxEnergia).toBeLessThan(1e-6);
      expect(m.maxH).toBeLessThan(1e-10);
      expect(m.erroPeriodoS).toBeLessThan(0.1);
    }
    expect(resultados[1].metricas.desvioRadialM).toBeLessThan(resultados[0].metricas.desvioRadialM / 3);
    expect(resultados[2].metricas.desvioRadialM).toBeLessThan(resultados[1].metricas.desvioRadialM / 3);
    expect(propagar(1, 0, 'verlet-gravitacional', 3).estado).toEqual(resultados[0].estado);
    const kdk = propagar(1);
    const legado = propagar(1, 0, 'euler-semi-implicito');
    expect(kdk.metricas.desvioRadialM).toBeLessThan(10);
    expect(legado.metricas.desvioRadialM).toBeGreaterThan(10);
  }, 30_000);
  it('elipse e=0,1 conserva energia/momento e reproduz apsides e período de Kepler', () => {
    for (const dt of [1, 0.5]) {
      const { metricas: m } = propagar(dt, 0.1);
      expect(m.desvioRadialM).toBeLessThan(10);
      expect(m.maxEnergia).toBeLessThan(1e-6);
      expect(m.maxH).toBeLessThan(1e-10);
      expect(m.erroPeriodoS).toBeLessThan(0.1);
    }
  });
  it('queda radial independe de massa e conserva energia sem apoio artificial', () => {
    const estados = [1, 100].map((massa) => {
      const ambiente = new AmbienteTerrestre();
      const mundo = new MundoFisico(0.25, { ambiente, densidadeAtmosfericaKgM3: 0 });
      const objeto = corpo(new Vetor3(0, 400000, 0), Vetor3.zero, massa);
      mundo.registrarObjeto(objeto);
      const inicial = obterTelemetriaOrbital(objeto.getEstadoFisico().posicaoM, Vetor3.zero, ambiente.campo);
      for (let i = 0; i < 400; i++) mundo.avancar(0.25);
      const e = objeto.getEstadoFisico();
      const final = obterTelemetriaOrbital(e.posicaoM, e.velocidadeMps, ambiente.campo);
      expect(Math.abs(final.energiaEspecificaJPorKg / inicial.energiaEspecificaJPorKg - 1)).toBeLessThan(1e-6);
      expect(Math.abs(final.momentoAngularEspecificoM2S)).toBe(0);
      expect(e.posicaoM.x).toBe(0); expect(e.velocidadeMps.y).toBeLessThan(0);
      return e;
    });
    expect(estados[0].posicaoM.subtrair(estados[1].posicaoM).magnitude).toBeLessThan(1e-8);
    expect(estados[0].velocidadeMps.subtrair(estados[1].velocidadeMps).magnitude).toBeLessThan(1e-10);
  });
  it.each([0.99, 1, 1.01])('limite de escape: fator %f', (fator) => {
    const ambiente = new AmbienteTerrestre();
    const mundo = new MundoFisico(0.5, { ambiente, densidadeAtmosfericaKgM3: 0 });
    const objeto = corpo(new Vetor3(0, 400000, 0), new Vetor3(Math.sqrt(2) * vc * fator, 0, 0));
    mundo.registrarObjeto(objeto);
    const inicial = obterTelemetriaOrbital(objeto.getEstadoFisico().posicaoM, objeto.getEstadoFisico().velocidadeMps, ambiente.campo);
    expect(inicial.estado).toBe(fator < 1 ? 'orbital' : fator === 1 ? 'limite-de-escape' : 'escape');
    for (let i = 0; i < 1200; i++) mundo.avancar(0.5);
    const e = objeto.getEstadoFisico();
    const final = obterTelemetriaOrbital(e.posicaoM, e.velocidadeMps, ambiente.campo);
    expect(final.raioM).toBeGreaterThan(raio);
    expect(Math.abs(final.energiaEspecificaJPorKg - inicial.energiaEspecificaJPorKg) / (TERRA.muM3S2 / raio)).toBeLessThan(1e-6);
  });
  it('ilha recebe gravidade e ruptura libera módulos mantendo dinâmica central', () => {
    const ambiente = new AmbienteTerrestre();
    const mundo = new MundoFisico(0.01, { ambiente, densidadeAtmosfericaKgM3: 0 });
    const a = corpo(new Vetor3(-1, 400000, 0), new Vetor3(vc, 0, 0), 10, 'a');
    const b = corpo(new Vetor3(1, 400000, 0), new Vetor3(vc, 0, 0), 10, 'b');
    mundo.registrarObjeto(a); mundo.registrarObjeto(b);
    let esforco = 0;
    const fixador = new FixadorEstrutural({ id: 'vinculo', objetoA: a, objetoB: b, resistenciaTracaoN: 1000, obterEsforcoSolicitadoN: () => esforco });
    mundo.registrarFixador(fixador);
    mundo.avancar(0.01);
    expect(b.getEstadoFisico().posicaoM.subtrair(a.getEstadoFisico().posicaoM).magnitude).toBeCloseTo(2, 9);
    esforco = 1001; mundo.avancar(0.01);
    expect(fixador.estaRompido).toBe(true);
    expect(a.getEstadoFisico().velocidadeMps.y).toBeLessThan(0);
  });
  it('rejeita corpos e comandos fora de XY', () => {
    const mundo = new MundoFisico(1, { ambiente: new AmbienteTerrestre(), densidadeAtmosfericaKgM3: 0 });
    expect(() => mundo.registrarObjeto(corpo(new Vetor3(0, 400000, 1), Vetor3.zero))).toThrow(/XY/);
    const o = corpo(new Vetor3(0, 400000, 0), Vetor3.zero);
    mundo.registrarObjeto(o);
    expect(() => mundo.aplicarForca(o, new Vetor3(0, 0, 1))).toThrow(/XY/);
  });
  it('exporta evidências somente quando solicitado', () => {
    const dir = process.env.M9_EVIDENCIAS_DIR;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/orbitas.json`, JSON.stringify({ constantes: TERRA, vc, periodo, evidencias }, null, 2)); }
  });
});
