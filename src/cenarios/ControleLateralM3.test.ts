import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FixadorEstrutural } from '../physics/conexoes/FixadorEstrutural';
import { MundoFisico } from '../physics/MundoFisico';
import { Vetor3 } from '../physics/Vetor3';
import { AletaAerodinamica } from '../physics/objetos/componentes/AletaAerodinamica';
import { Bateria } from '../physics/objetos/fontes-de-energia/Bateria';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { PropulsorVetorizado } from '../physics/objetos/propulsao/PropulsorVetorizado';
import { VeiculoComposto } from '../physics/objetos/veiculos/VeiculoComposto';
import { ControladorGuiaPousoBss06 } from '../physics/sistemas de controle/ControladorGuiaPousoBss06';

const DT = 1 / 240;
interface ConfiguracaoEnsaio {
  vx?: number; vy?: number; theta?: number; omega?: number; massaCasco?: number;
  tanqueY?: number; vento?: number; densidade?: number; aletas?: boolean;
  empuxo?: boolean; controle?: boolean; alvoX?: number; cursoGimbal?: number; taxaGimbal?: number;
}
const registrar = (nome: string, resultado: unknown): void => {
  const destino = process.env.BSS_M3_EVIDENCIAS_DIR;
  if (!destino) return;
  mkdirSync(destino, { recursive: true });
  writeFileSync(join(destino, `${nome}.json`), JSON.stringify(resultado, null, 2));
};

/** Montagem isolada para ensaiar torque/controle, sem alterar estados após registro. */
const criarEnsaio = (config: ConfiguracaoEnsaio = {}) => {
  const theta = config.theta ?? 0;
  const omega = config.omega ?? 0;
  const mundo = new MundoFisico(DT, {
    densidadeAtmosfericaKgM3: config.densidade ?? 1.225,
    velocidadeArMps: new Vetor3(config.vento ?? 0, 0, 0),
  });
  const base = (id: string, massaBaseKg: number, dimensoesM: Vetor3, x = 0, y = 0, angulo = 0) => {
    const raio = new Vetor3(x * Math.cos(theta) - y * Math.sin(theta), x * Math.sin(theta) + y * Math.cos(theta), 0);
    return {
      id, massaBaseKg, dimensoesM, resistenciaColisaoJ: 1_000_000, limiteTermicoC: 1_000,
      estadoInicial: {
        posicaoM: new Vetor3(0, 1_000, 0).adicionar(raio),
        velocidadeMps: new Vetor3((config.vx ?? 0) - omega * raio.y, (config.vy ?? -12) + omega * raio.x, 0),
        orientacaoRad: new Vetor3(0, 0, theta + angulo), velocidadeAngularRadps: new Vetor3(0, 0, omega),
      },
    };
  };
  const casco = new VeiculoComposto({ ...base('casco-m3', config.massaCasco ?? 1_000, new Vetor3(2, 10, 1)), areaFrontalM2: 1, coeficienteArrasto: 0.5 });
  const bateria = new Bateria({ ...base('bateria-m3', 20, new Vetor3(0.5, 0.5, 0.5), 0, 4), tensaoNominalV: 24, capacidadeEnergiaJ: 1e6, energiaInicialJ: 1e6 });
  const tanque = new TanquePropelente({ ...base('tanque-m3', 80, new Vetor3(1, 1, 1), 0, config.tanqueY ?? 2), tipoPropelente: 'metano', capacidadePropelenteKg: 300, massaPropelenteInicialKg: 300 });
  // Parâmetros de ensaio fecham F/(mdot*g0)=350 s. Não se trata de missão CH4/O2.
  const motor = new PropulsorVetorizado({
    ...base('motor-m3', 100, new Vetor3(1, 1, 1), 0, -6, Math.PI / 2),
    tensaoAlimentacaoNominalV: 24, potenciaEletricaMaximaW: 1_000,
    empuxoMaximoN: 40_000, vazaoMaximaKgS: 40_000 / (350 * 9.80665), propelenteCompativel: 'metano',
    vetorizacao: { limiteAngularRad: config.cursoGimbal ?? Math.PI / 12, velocidadeAngularMaximaRadps: config.taxaGimbal ?? Math.PI / 2 },
  });
  motor.conectarTanque(tanque, 12);
  motor.conectarBateria(bateria, 12);
  const energizado = () => motor.sistemaEstaOperacional('elétrico') && motor.sistemaEstaOperacional('controle');
  const aletas = config.aletas === false ? [] : [-1, 1].map((lado) => new AletaAerodinamica({
    ...base(`aleta-m3-${lado}`, 30, new Vetor3(0.4, 1.5, 0.5), lado * 1.5, 7),
    areaEfetivaM2: 5, coeficienteSustentacaoPorRad: 2, coeficienteArrasto: 1.1,
    deflexaoMaximaRad: 25 * Math.PI / 180, velocidadeAngularMaximaRadps: 35 * Math.PI / 180,
    potenciaNominalAtuadorW: 1_000, potenciaEmRepousoW: 10, fonteEletrica: bateria, operacaoAutorizada: energizado,
  }));
  const modulos = [bateria, tanque, motor, ...aletas];
  for (const modulo of modulos) {
    casco.adicionarModulo(modulo);
    casco.adicionarFixador(new FixadorEstrutural({ id: `fixador-${modulo.id}`, objetoA: casco, objetoB: modulo,
      resistenciaTracaoN: 1e6, resistenciaCompressaoN: 1e6, obterEsforcoSolicitadoN: () => motor.empuxoAtualN }));
  }
  casco.instalarPropulsor(motor);
  casco.registrarNoMundo(mundo);
  casco.habilitarControleDeInclinacao();
  const guia = new ControladorGuiaPousoBss06(aletas, motor, energizado, () => {
    const e = casco.getEstadoFisico();
    const centroMassa = casco.centroDeMassaDoConjuntoM;
    const cargas = mundo.obterCargasAerodinamicas(casco.obterObjetosFisicosConectados(), centroMassa);
    const braco = motor.getEstadoFisico().posicaoM.subtrair(centroMassa);
    const c = Math.cos(e.orientacaoRad.z), s = Math.sin(e.orientacaoRad.z);
    return { forcaAerodinamicaXN: cargas.forcaN.x, torqueAerodinamicoNm: cargas.torqueNm.z,
      bracoPropulsorLocalM: new Vetor3(braco.x * c + braco.y * s, -braco.x * s + braco.y * c, 0), erroHorizontalM: (config.alvoX ?? 0) - e.posicaoM.x,
      velocidadeHorizontalMps: e.velocidadeMps.x, velocidadeVerticalMps: e.velocidadeMps.y,
      orientacaoRad: e.orientacaoRad.z, velocidadeAngularRadps: e.velocidadeAngularRadps.z,
      massaKg: casco.massaInstantaneaDoConjuntoKg, empuxoN: motor.empuxoAtualN,
      densidadeArKgM3: mundo.obterCondicoesAtmosfericas(casco).densidadeArKgM3, velocidadeArMps: mundo.velocidadeDoArMps,
    };
  });
  casco.registrarControlador(guia);
  if (config.controle !== false) guia.habilitar();
  for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(motor.ligarSistema(sistema)).toBe(true);
  if (config.empuxo !== false) {
    motor.definirThrottle(casco.massaInstantaneaDoConjuntoKg * 9.80665 / motor.empuxoMaximoN);
    expect(motor.solicitarIgnicao()).toBe(true);
  }
  return { mundo, casco, bateria, tanque, motor, aletas, guia };
};

const observar = (ensaio: ReturnType<typeof criarEnsaio>) => {
  const e = ensaio.casco.getEstadoFisico();
  return { t: ensaio.mundo.tempoS, x: e.posicaoM.x, y: e.posicaoM.y, vx: e.velocidadeMps.x, vy: e.velocidadeMps.y,
    theta: Math.atan2(Math.sin(e.orientacaoRad.z), Math.cos(e.orientacaoRad.z)), omega: e.velocidadeAngularRadps.z,
    massaKg: ensaio.casco.massaInstantaneaDoConjuntoKg, propelenteKg: ensaio.tanque.massaPropelenteKg,
    velocidadeCentroMassaMps: ensaio.casco.obterObjetosFisicosConectados().reduce((v, o) =>
      v.adicionar(o.getEstadoFisico().velocidadeMps.multiplicar(o.massaKg / ensaio.casco.massaInstantaneaDoConjuntoKg)), Vetor3.zero),
    centroMassaM: ensaio.casco.centroDeMassaDoConjuntoM, gimbal: ensaio.motor.obterEstadoDaVetorizacao(),
    guia: ensaio.guia.obterDiagnostico(), aletas: ensaio.aletas.map((a) => a.deflexaoAtualRad),
    autoridade: ensaio.casco.obterSolicitacoesAplicadas(), integridade: Math.min(ensaio.casco.integridadeEstrutural, ...ensaio.casco.modulosFisicos.map((m) => m.integridadeEstrutural)) };
};
const executar = (config: ConfiguracaoEnsaio, duracaoS = 12) => {
  const e = criarEnsaio(config);
  const inicial = observar(e);
  const amostras = [inicial];
  let saturacoes = 0;
  for (let i = 0; i < duracaoS / DT; i++) {
    const antes = e.motor.obterEstadoDaVetorizacao();
    e.mundo.avancar(DT);
    const depois = e.motor.obterEstadoDaVetorizacao();
    expect(Math.abs(depois.anguloAtualRad)).toBeLessThanOrEqual(depois.limiteAngularRad + 1e-12);
    expect(Math.abs(depois.anguloAtualRad - antes.anguloAtualRad)).toBeLessThanOrEqual(depois.velocidadeAngularMaximaRadps * DT + 1e-12);
    const comandos = e.casco.obterSolicitacoesAplicadas().filter((s) => s.recurso === 'gimbal');
    expect(comandos).toHaveLength(1);
    if (config.controle !== false && e.casco.getEstadoFisico().velocidadeMps.y < -0.1) expect(comandos[0]!.idControlador).toBe('guia-pouso-bss06');
    if (e.guia.obterDiagnostico().gimbalSaturado) saturacoes++;
    if (i % 240 === 239) amostras.push(observar(e));
  }
  const resultado = { config, dtS: DT, duracaoS, inicial, final: observar(e), saturacoes, amostras };
  expect(resultado.final.integridade).toBe(1);
  expect(e.casco.fixadoresEstruturais.some((f) => f.estaRompido)).toBe(false);
  return resultado;
};

describe('M3 — resposta física lateral e de atitude', () => {
  it.each([-1, 1])('reduz deriva com sinal %s, com e sem grid fins', (sinal) => {
    const comAletas = executar({ vx: sinal * 5 });
    const semAletas = executar({ vx: sinal * 5, aletas: false });
    for (const r of [comAletas, semAletas]) {
      expect(Math.abs(r.final.vx), JSON.stringify(r.final)).toBeLessThan(2);
      expect(Math.abs(r.final.theta)).toBeLessThan(0.2);
      expect(r.final.propelenteKg).toBeLessThan(r.inicial.propelenteKg);
    }
    registrar(`deriva-${sinal}`, { comAletas, semAletas });
  }, 30_000);
  it.each([-1, 1])('recupera atitude perturbada de sinal %s sem pico na referência', (sinal) => {
    const r = executar({ theta: sinal * 0.1, omega: sinal * 0.03, vx: sinal * 2 });
    expect(Math.abs(r.final.theta), JSON.stringify(r.final)).toBeLessThan(0.04);
    expect(Math.abs(r.final.omega)).toBeLessThan(0.03);
    registrar(`atitude-${sinal}`, r);
  }, 30_000);
  it.each([[-5, 700, -1], [5, 1_800, 4]])('mantém redução de deriva com vento %s m/s, massa %s kg e tanque y=%s m', (vento, massaCasco, tanqueY) => {
    const r = executar({ vx: Math.sign(vento) * 5, vento, massaCasco, tanqueY });
    expect(Math.abs(r.final.vx), JSON.stringify(r.final)).toBeLessThan(Math.abs(r.inicial.vx));
    expect(Math.abs(r.final.theta)).toBeLessThan(0.2);
    expect(r.final.massaKg).toBeLessThan(r.inicial.massaKg);
    expect(r.final.centroMassaM.y - r.final.y).not.toBeCloseTo(r.inicial.centroMassaM.y - r.inicial.y, 5);
    registrar(`vento-${vento}`, r);
  }, 30_000);
  it.each([[-20, -5], [-20, 5], [20, -5], [20, 5]])('freia a deriva e reduz erro observado nos quadrantes alvo=%s m e vx=%s m/s', (alvoX, vx) => {
    const r = executar({ alvoX, vx });
    const maiorErroM = Math.max(...r.amostras.map((a) => Math.abs(alvoX - a.x)));
    expect(Math.abs(alvoX - r.final.x), JSON.stringify(r.final)).toBeLessThan(maiorErroM);
    expect(Math.abs(r.final.theta)).toBeLessThan(0.2);
    registrar(`quadrante-${alvoX}-${vx}`, r);
  }, 30_000);
  it.each([-1, 1])('gimbal genérico de descida freia fisicamente a deriva de sinal %s', (sinal) => {
    const e = criarEnsaio({ vx: sinal * 5, aletas: false, controle: false });
    e.casco.habilitarControleDeGimbalDeDescida([e.motor.id]);
    for (let i = 0; i < 12 / DT; i++) e.mundo.avancar(DT);
    const final = observar(e);
    expect(Math.abs(final.vx), JSON.stringify(final)).toBeLessThan(2);
    expect(final.autoridade[0]!.idControlador).toBe('gimbal-descida');
    registrar(`gimbal-generico-${sinal}`, { config: { vx: sinal * 5, aletas: false, controle: false, controlador: 'gimbal-descida', ganhoDerivaRadPorMps: 0.04 }, dtS: DT, duracaoS: 12, final });
  }, 30_000);
  it('respeita saturação e atraso sem esconder autoridade insuficiente', () => {
    const config = { vx: 25, theta: 0.3, cursoGimbal: 0.03, taxaGimbal: 0.02, aletas: false };
    const r = executar(config, 4);
    expect(r.saturacoes).toBeGreaterThan(0);
    expect(Math.abs(r.final.vx)).toBeGreaterThan(2); // Condição não recuperada nessa janela.
    registrar('gimbal-limitado', r);
  }, 30_000);
  it('sem empuxo usa somente aerodinâmica; em vácuo explícito não cria correção física', () => {
    const comAletas = executar({ empuxo: false, theta: 0.1, omega: 0.1, vy: -50 }, 8);
    const semAletas = executar({ empuxo: false, aletas: false, theta: 0.1, omega: 0.1, vy: -50 }, 8);
    const vacuo = executar({ empuxo: false, densidade: 0, theta: 0.1, omega: 0.1, vy: -50 }, 8);
    expect(Math.abs(comAletas.final.omega)).toBeLessThan(Math.abs(semAletas.final.omega));
    expect(Math.abs(comAletas.final.theta)).toBeLessThan(Math.abs(semAletas.final.theta));
    expect(vacuo.final.velocidadeCentroMassaMps.x).toBeCloseTo(vacuo.inicial.velocidadeCentroMassaMps.x, 10);
    expect(vacuo.final.omega).toBeCloseTo(vacuo.inicial.omega, 10);
    expect(vacuo.final.propelenteKg).toBe(vacuo.inicial.propelenteKg);
    expect(vacuo.final.guia.empuxoDisponivelN).toBe(0);
    registrar('motor-cortado', { comAletas, semAletas, vacuo });
  }, 30_000);
  it('perda de controle e elétrica limpa autoridade e congela atuação; exige nova ignição', () => {
    const resultados = [];
    for (const sistema of ['controle', 'elétrico'] as const) {
      const e = criarEnsaio({ vx: 5, vy: -25 });
      for (let i = 0; i < 240; i++) e.mundo.avancar(DT);
      e.motor.desligarSistema(sistema);
      e.mundo.avancar(DT);
      const angulos = e.aletas.map((a) => a.deflexaoAtualRad);
      const gimbal = e.motor.obterEstadoDaVetorizacao().anguloAtualRad;
      for (let i = 0; i < 240; i++) e.mundo.avancar(DT);
      expect(e.casco.obterSolicitacoesAplicadas()).toEqual([]);
      expect(e.motor.empuxoAtualN).toBe(0);
      expect(e.motor.vazaoAtualKgS).toBe(0);
      expect(e.aletas.map((a) => a.deflexaoAtualRad)).toEqual(angulos);
      expect(e.motor.obterEstadoDaVetorizacao().anguloAtualRad).toBe(gimbal);
      expect(e.guia.obterDiagnostico().fase).toBe('sem-energia');
      const aposPerda = observar(e);
      for (const s of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) e.motor.ligarSistema(s);
      e.mundo.avancar(DT);
      expect(e.motor.estaIgnitado).toBe(false);
      expect(e.motor.empuxoAtualN).toBe(0);
      expect(e.casco.obterSolicitacoesAplicadas().filter((s) => s.recurso === 'gimbal')).toHaveLength(1);
      resultados.push({ sistema, config: { vx: 5, vy: -25 }, dtS: DT, aposPerda, aposReligar: observar(e) });
    }
    registrar('perda-de-sistemas', resultados);
  }, 30_000);
  it('repete exatamente a trajetória com vento e mesmos comandos', () => {
    const config = { vx: 5, vento: 5 };
    const primeira = executar(config, 4);
    expect(primeira).toEqual(executar(config, 4));
    registrar('determinismo', { config, dtS: DT, duracaoS: 4, repeticaoIdentica: true });
  }, 30_000);
});
