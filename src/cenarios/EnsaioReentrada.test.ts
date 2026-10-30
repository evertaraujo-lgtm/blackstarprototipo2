import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { EnsaioReentrada, criarCenarioReentrada, criarEnsaioReentrada, configurarReentrada, reproduzirEnsaioReentrada } from './EnsaioReentrada';
import { PerfilAtmosfericoReentrada } from '../physics/ambiente/PerfilAtmosfericoReentrada';
import { projetarSustentacao } from '../physics/reentrada/ModeloAerodinamicoReentrada';
import { RolagemVirtual } from '../physics/objetos/componentes/RolagemVirtual';
import { Vetor3 } from '../physics/Vetor3';
import { MundoFisico } from '../physics/MundoFisico';
import { OrbitadorReentrada } from '../physics/objetos/veiculos/OrbitadorReentrada';
import { TERRA } from '../physics/ambiente/CampoGravitacional';
import { criarEstadoInicialLocal } from '../physics/ambiente/EstadoInicialLocal';
import { GerenciadorDeControladores, type ControladorDeVoo } from '../physics/sistemas de controle/GerenciadorDeControladores';
import { SupervisorReentrada, type EstadoTransferenciaPouso } from '../physics/sistemas de controle/SupervisorReentrada';
import { ControladorReentrada, type TelemetriaControleReentrada } from '../physics/sistemas de controle/ControladorReentrada';
import { ComputadorDeVoo } from '../physics/objetos/veiculos/ComputadorDeVoo';

describe('RE-001 — inicialização e ambiente opt-in', () => {
  it('inicia o cenário manual horizontal a 120 km e transmite comandos aos atuadores dos flaps', () => {
    const r = new EnsaioReentrada({ altitudeM: 120_000, velocidadeMps: 7700,
      anguloAtaqueRad: 0, trajetoriaRad: 0, automatico: false, chaveamentoAutomatico: false });
    const inicial = r.observar();
    expect(inicial.altitudeM).toBe(120_000);
    expect(inicial.trajetoriaRad).toBeCloseTo(0, 12);
    expect(inicial.aerodinamica.anguloAtaqueRad).toBeCloseTo(0, 12);
    expect(inicial.atitudeLocalRad).toBeCloseTo(0, 12);
    expect(inicial.controle.estado).toBe('manual');
    expect(inicial.propulsaoDisponivel).toBe(false);
    expect(r.receberComando({ tipo: 'flaps', dianteiroRad: 10 * Math.PI / 180, traseiroRad: -10 * Math.PI / 180 }).aceito).toBe(true);
    expect(r.observar().flaps[0].comandoRad).toBeCloseTo(10 * Math.PI / 180, 12);
    r.iniciar();
    for (let i = 0; i < Math.round(1 / r.passoS); i++) r.avancarPasso();
    const avancado = r.observar();
    expect(avancado.tempoS).toBeCloseTo(1, 10);
    expect(avancado.flaps[0].deflexaoRad).toBeGreaterThan(0);
    expect(avancado.flaps[1].deflexaoRad).toBeLessThan(0);
  });

  it('inicializa 120 km, 7700 m/s, alpha 40°, trajetória −1°, automático e motores ausentes', () => {
    const r = criarEnsaioReentrada(), o = r.observar();
    expect(o.altitudeM).toBe(120_000); expect(o.velocidadeMps).toBeCloseTo(7700, 9);
    expect(o.trajetoriaRad).toBeCloseTo(-Math.PI / 180, 12);
    expect(o.aerodinamica.anguloAtaqueRad).toBeCloseTo(40 * Math.PI / 180, 12);
    expect(o.estado.orientacaoRad.z).toBeCloseTo(39 * Math.PI / 180, 12);
    expect(o.estado.velocidadeMps.x).toBeCloseTo(7700 * Math.cos(-Math.PI / 180), 9);
    expect(o.estado.velocidadeMps.y).toBeCloseTo(7700 * Math.sin(-Math.PI / 180), 9);
    expect(o.controle.estado).toBe('automatico'); expect(o.rolagem.atualRad).toBe(0);
    expect(o.propulsaoDisponivel).toBe(false); expect(o.rcsDisponivel).toBe(false);
    expect(o.massaKg).toBe(80_000); expect(o.limiteOrbitadorC).toBe(1100); expect(o.limiteFlapsC).toBe(900);
    expect(o.limiteBateriaC).toBe(60); expect(o.temperaturaBateriaC).toBe(20);
    expect(Object.isFrozen(o.estado)).toBe(true);
  });

  it('mede alpha contra fluxo e conserva a conversão em outro arco terrestre', () => {
    const c = criarCenarioReentrada(), ref = c.ambiente.referencial;
    const estado = criarEstadoInicialLocal(ref, { arcoM: 500_000, altitudeM: 120_000,
      velocidadeTangencialMps: 7700 * Math.cos(-0.1), velocidadeRadialMps: 7700 * Math.sin(-0.1),
      atitudeLocalRad: -0.1 + 0.7, taxaAtitudeLocalRadps: 0 });
    const o = new OrbitadorReentrada(estado, 1100, 0, c.perfil, ref, () => Vetor3.zero);
    expect(o.avaliar({ densidadeArKgM3: 1e-8, velocidadeArMps: Vetor3.zero }).anguloAtaqueRad).toBeCloseTo(0.7, 10);
    expect(o.avaliar({ densidadeArKgM3: 1e-8, velocidadeArMps: new Vetor3(100, 200, 0) }).anguloAtaqueRad).not.toBeCloseTo(0.7, 5);
  });

  it('perfil contínuo, densidade não nula a 25 e 120 km, rarefação identificada e cauda explícita', () => {
    const p = new PerfilAtmosfericoReentrada();
    expect(p.obterDensidadeKgM3(0)).toBeCloseTo(1.225, 12);
    expect(p.obterDensidadeKgM3(120_000)).toBeCloseTo(2.222e-8, 15);
    for (const h of [11e3, 20e3, 25e3, 32e3, 47e3, 51e3, 71e3, 86e3, 100e3, 120e3, 150e3, 200e3]) {
      expect(p.obterDensidadeKgM3(h)).toBeGreaterThan(0);
      expect(Math.abs(p.obterDensidadeKgM3(h - 0.001) / p.obterDensidadeKgM3(h + 0.001) - 1)).toBeLessThan(1e-6);
    }
    expect(criarEnsaioReentrada().observar().aerodinamica.regime).toBe('transicao');
    expect(criarEnsaioReentrada().observar().aerodinamica.modeloContinuoAplicavel).toBe(false);
    expect(p.amostrar(201_000).dentroDominio).toBe(false);
    expect(p.obterDensidadeKgM3(201_000)).toBeGreaterThan(0);
  });

  it('valida SI, dt máximo, configuração térmica e registra revisão/limites fornecidos', () => {
    expect(() => configurarReentrada({ passoS: 1 / 60 })).toThrow();
    expect(() => configurarReentrada({ velocidadeMps: Infinity })).toThrow();
    expect(() => configurarReentrada({ limiteFlapsC: NaN })).toThrow();
    const d = criarEnsaioReentrada({ limiteOrbitadorC: 1050, limiteFlapsC: 800 }).exportar();
    expect(JSON.stringify(d.identificacao)).toContain('re-atmosfera-log-1');
    expect(JSON.stringify(d.identificacao)).toContain('1050');
    expect(d.eventos.some(e => e.tipo === 'limites-termicos' && e.descricao.includes('800'))).toBe(true);
  });
});

describe('RE-001 — gravidade, forças e balanço', () => {
  it('gravidade central e energia mecânica do conjunto em vácuo explícito sem propulsão', () => {
    const c = criarCenarioReentrada({ vacuo: true, automatico: false });
    const energia = () => c.objetos.reduce((s, o) => {
      const e = o.getEstadoFisico();
      return s + 0.5 * o.massaKg * e.velocidadeMps.magnitude ** 2
        + 0.5 * o.getMomentoInerciaKgM2().z * e.velocidadeAngularRadps.z ** 2
        - TERRA.muM3S2 * o.massaKg / e.posicaoM.subtrair(c.ambiente.campo.centroM).magnitude;
    }, 0);
    const E = energia(), e = c.orbitador.getEstadoFisico();
    expect(c.mundo.obterGravidadeMps2(e.posicaoM).magnitude).toBeCloseTo(TERRA.muM3S2 / (TERRA.raioM + 120_000) ** 2, 10);
    for (let i = 0; i < 2400; i++) c.mundo.avancar(1 / 240);
    expect(Math.abs(energia() / E - 1)).toBeLessThan(1e-8);
    expect(c.orbitador.getEstadoFisico().velocidadeMps.y).toBeLessThan(e.velocidadeMps.y);
  }, 30_000);

  it('vácuo elimina lift, drag, aquecimento e torque dos flaps mesmo com comandos', () => {
    const c = criarCenarioReentrada({ vacuo: true });
    c.flaps.forEach(f => f.solicitarDeflexaoRad(0.4));
    for (let i = 0; i < 240; i++) c.mundo.avancar(1 / 240);
    for (const o of c.objetos) {
      expect(c.mundo.obterForcaArrastoAtmosferico(o).magnitude).toBe(0);
      expect(o.obterForcasAerodinamicas(c.mundo.obterCondicoesAtmosfericas(o)).reduce((s, f) => s + f.forcaN.magnitude, 0)).toBe(0);
      expect(o.energiaTermicaAerodinamicaAcumuladaJ).toBe(0);
    }
  });

  it.each([0, 60, 90, -60, -90])('projeta sustentação em %s°, sem alterar Cd ou dissipação', graus => {
    const a = criarEnsaioReentrada({ altitudeM: 60_000, rolagemRad: graus * Math.PI / 180 }).observar();
    const zero = criarEnsaioReentrada({ altitudeM: 60_000 }).observar();
    expect(a.aerodinamica.sustentacaoXYN).toBeCloseTo(zero.aerodinamica.sustentacaoN * Math.cos(graus * Math.PI / 180), 6);
    expect(a.aerodinamica.arrastoN).toBe(zero.aerodinamica.arrastoN);
    expect(a.dissipacaoW).toBe(zero.dissipacaoW);
    expect(a.calorTransferidoW).toBe(zero.calorTransferidoW);
  });

  it('projeção simétrica e lift perpendicular: nenhuma potência translacional fictícia', () => {
    expect(projetarSustentacao(1000, Math.PI / 3)).toBeCloseTo(500, 10);
    expect(projetarSustentacao(1000, -Math.PI / 3)).toBe(projetarSustentacao(1000, Math.PI / 3));
    const o = criarEnsaioReentrada({ altitudeM: 60_000 }).observar();
    expect(Math.abs(o.aerodinamica.forcaSustentacaoN.produtoEscalar(o.estado.velocidadeMps))).toBeLessThan(1e-6);
    expect(o.aerodinamica.forcaArrastoN.produtoEscalar(o.estado.velocidadeMps)).toBeLessThan(0);
  });

  it('contabiliza drag uma vez e substitui aquecimento histórico uma única vez', () => {
    const c = criarCenarioReentrada({ altitudeM: 60_000 });
    const corpo = c.orbitador;
    const mundo = new MundoFisico(1 / 240, { ambiente: c.ambiente, perfilAtmosferico: c.perfil });
    mundo.registrarObjeto(corpo);
    const estado = corpo.getEstadoFisico(), condicoes = mundo.obterCondicoesAtmosfericas(corpo), a = corpo.avaliar(condicoes);
    const cargas = mundo.obterCargasAerodinamicas([corpo], estado.posicaoM);
    expect(cargas.forcaN.subtrair(a.forcaArrastoN.adicionar(a.forcaSustentacaoN)).magnitude).toBeLessThan(1e-8);
    const P = a.arrastoN * a.velocidadeRelativaMps;
    const calor = corpo.obterPotenciaAquecimentoAerodinamicoW(condicoes, P);
    expect(calor).toBeGreaterThan(0); expect(calor).toBeLessThanOrEqual(P);
    mundo.avancar(1 / 240);
    expect(corpo.energiaTermicaAerodinamicaAcumuladaJ).toBeCloseTo(calor / 240, 7);
    const dv = corpo.getEstadoFisico().velocidadeMps.subtrair(estado.velocidadeMps).multiplicar(240);
    const esperado = cargas.forcaN.multiplicar(1 / corpo.massaKg).adicionar(mundo.obterGravidadeMps2(estado.posicaoM));
    expect(dv.subtrair(esperado).magnitude).toBeLessThan(0.01);
  });

  it('flaps sem fluxo não produzem autoridade; comando é distinto de deflexão e consome bateria', () => {
    const c = criarCenarioReentrada({ velocidadeMps: 0 });
    c.flaps[0].solicitarDeflexaoRad(0.3);
    expect(c.flaps[0].deflexaoAtualRad).toBe(0);
    const energia = c.bateria.energiaArmazenadaJ;
    c.flaps[0].prepararPassoOperacional(1 / 240);
    expect(c.flaps[0].deflexaoAtualRad).toBeGreaterThan(0);
    expect(c.flaps[0].deflexaoAtualRad).toBeLessThan(0.3);
    expect(c.flaps[0].obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero })).toEqual([]);
    expect(c.bateria.energiaArmazenadaJ).toBeLessThan(energia);
    c.flaps[0].conexaoEletrica.abrirInterruptor();
    const deflexao = c.flaps[0].deflexaoAtualRad;
    c.flaps[0].prepararPassoOperacional(1 / 240);
    expect(c.flaps[0].deflexaoAtualRad).toBe(deflexao);
  });

  it('autoridade do flap decai com densidade e falha estrutural suprime sua sustentação', () => {
    const c = criarCenarioReentrada({ altitudeM: 60_000 });
    c.flaps[0].solicitarDeflexaoRad(0.3);
    for (let i = 0; i < 240; i++) c.flaps[0].prepararPassoOperacional(1 / 240);
    const denso = c.flaps[0].obterForcasAerodinamicas({ densidadeArKgM3: 1, velocidadeArMps: Vetor3.zero })[0].forcaN.magnitude;
    const rarefeito = c.flaps[0].obterForcasAerodinamicas({ densidadeArKgM3: 1e-8, velocidadeArMps: Vetor3.zero })[0].forcaN.magnitude;
    expect(rarefeito / denso).toBeCloseTo(1e-8, 14);
    c.fixadores[0].liberar();
    expect(c.flaps[0].obterForcasAerodinamicas({ densidadeArKgM3: 1, velocidadeArMps: Vetor3.zero })[0].forcaN.magnitude).toBe(denso);
    c.flaps[0].aplicarEnergiaTermicaPeloCore(1e12, 1000);
    expect(c.flaps[0].obterForcasAerodinamicas({ densidadeArKgM3: 1, velocidadeArMps: Vetor3.zero })[0].forcaN.magnitude).toBe(0);
  });

  it('dano térmico progride no core e reduz sustentação, sem falha instantânea no limiar', () => {
    const c = criarCenarioReentrada({ altitudeM: 60_000, limiteOrbitadorC: 20.001, limiteFlapsC: 20.001 });
    c.mundo.avancar(1 / 240);
    expect(c.orbitador.temperaturaC).toBeGreaterThan(20.001);
    expect(c.orbitador.integridadeEstrutural).toBeGreaterThan(0);
    expect(c.orbitador.integridadeEstrutural).toBeLessThan(1);
    const anterior = c.orbitador.integridadeEstrutural;
    for (let i = 0; i < 120; i++) c.mundo.avancar(1 / 240);
    expect(c.orbitador.integridadeEstrutural).toBeLessThan(anterior);
    expect(c.flaps[0].integridadeEstrutural).toBeLessThan(1);
    const before = c.orbitador.avaliar(c.mundo.obterCondicoesAtmosfericas(c.orbitador));
    c.orbitador.aplicarEnergiaTermicaPeloCore(1e12, 1000);
    expect(c.orbitador.integridadeEstrutural).toBe(0);
    const after = c.orbitador.avaliar(c.mundo.obterCondicoesAtmosfericas(c.orbitador));
    expect(before.sustentacaoN).not.toBe(0); expect(after.sustentacaoN).toBe(0);
    const phi = c.orbitador.observarRolagem().atualRad;
    c.orbitador.solicitarRolagem(1, c.mundo.tempoS); c.orbitador.prepararPassoOperacional(1 / 240);
    expect(c.orbitador.observarRolagem().disponivel).toBe(false);
    expect(c.orbitador.observarRolagem().atualRad).toBe(phi);
  });

  it('impacto destrutivo usa superfície e massa física, com dano mensurável', () => {
    const c = criarCenarioReentrada({ altitudeM: 50, velocidadeMps: 1000, trajetoriaRad: -Math.PI / 2, anguloAtaqueRad: 0 });
    for (let i = 0; i < 60; i++) c.mundo.avancar(1 / 240);
    expect(c.objetos.some(o => o.integridadeEstrutural < 1)).toBe(true);
    expect(c.objetos.every(o => Number.isFinite(o.getEstadoFisico().posicaoM.y))).toBe(true);
  });

  it('bateria tem limiar independente de 60 °C, isolamento externo e degradação progressiva existente', () => {
    const c = criarCenarioReentrada({ altitudeM: 60_000 });
    for (let i = 0; i < 240; i++) c.mundo.avancar(1 / 240);
    expect(c.orbitador.temperaturaC).toBeGreaterThan(20);
    expect(c.bateria.temperaturaC).toBe(20); expect(c.bateria.limiteTermicoC).toBe(60);
    expect(c.bateria.integridadeEstrutural).toBe(1);
    // Calor de ensaio aplicado pela porta térmica do core, sem inventar acoplamento externo.
    c.bateria.aplicarEnergiaTermicaPeloCore(c.bateria.capacidadeTermicaJPorC * 50, 1);
    expect(c.bateria.temperaturaC).toBe(70);
    const integridade = c.bateria.integridadeEstrutural;
    expect(integridade).toBeGreaterThan(0); expect(integridade).toBeLessThan(1);
    expect(c.flaps[0].conexaoEletrica.fonteDisponivel).toBe(true);
    c.bateria.aplicarEnergiaTermicaPeloCore(c.bateria.capacidadeTermicaJPorC, 1);
    expect(c.bateria.integridadeEstrutural).toBeLessThan(integridade);
    const d = criarEnsaioReentrada({ limiteBateriaC: 55 }).exportar();
    expect((d.identificacao as { configuracao: { limiteBateriaC: number } }).configuracao.limiteBateriaC).toBe(55);
  });
});

describe('RE-001 — rolagem, controle e supervisão', () => {
  it('controle satura, informa ausência de autoridade e gerencia alvos ao exceder corredor', () => {
    const leituras = criarCenarioReentrada().sensores.obterLeituras();
    let t: TelemetriaControleReentrada = { alphaRad: 0, taxaArfagemRadps: 0, taxaFluxoRadps: 0,
      pressaoDinamicaPa: 100, fluxoTermicoWm2: 100, cargaG: 1, torquePassivoNm: 0,
      inerciaKgM2: 1e9, phiRad: 0, disponivel: true };
    const controle = new ControladorReentrada(() => t, 0.7, 1, { pressaoMaximaPa: 500,
      fluxoMaximoWm2: 1000, cargaMaximaG: 5 });
    controle.habilitar();
    expect(Math.abs(controle.calcularSolicitacoes(leituras, 1 / 240)[0].valor)).toBe(Math.PI / 6);
    expect(controle.observar().estado).toBe('saturado');
    t = { ...t, pressaoDinamicaPa: 0 }; controle.calcularSolicitacoes(leituras, 1 / 240);
    expect(controle.observar().estado).toBe('sem-autoridade');
    t = { ...t, pressaoDinamicaPa: 1000 };
    expect(controle.calcularSolicitacoes(leituras, 1 / 240).find(s => s.recurso === 'rolagem-virtual')?.valor).toBe(0);
    expect(controle.observar().alphaGerenciadoRad).toBeGreaterThan(0.7);
    expect(controle.calcularSolicitacoes({ ...leituras, sensoresValidos: false }, 1 / 240)).toEqual([]);
  });

  it('computador propulsivo não interpreta recursos novos como comandos de gimbal', () => {
    const vetorizacao = vi.fn(() => true);
    const computador = new ComputadorDeVoo({ obterLeituras: () => criarCenarioReentrada().sensores.obterLeituras() });
    computador.instalarPropulsor({ id: 'motor', estaIgnitado: true, diagnosticoOperacional: [],
      sistemaEstaOperacional: () => true, ligarSistema: () => true, solicitarIgnicao: () => true,
      definirThrottle: () => undefined, desligarSistema: () => undefined,
      solicitarVetorizacao: vetorizacao, obterEstadoDaVetorizacao: () => ({ anguloAlvoRad: 0, anguloAtualRad: 0,
        limiteAngularRad: 0.3, velocidadeAngularMaximaRadps: 1, estaHabilitado: true }) });
    computador.registrarControlador({ id: 'flap-nao-propulsivo', prioridade: 100, estaHabilitado: true,
      habilitar: () => undefined, desabilitar: () => undefined,
      calcularSolicitacoes: () => [{ idAtuador: 'motor', recurso: 'flap', valor: 0.2 }] });
    computador.atualizarControladores(1 / 240);
    expect(vetorizacao).not.toHaveBeenCalled();
  });
  it('limita taxa da rolagem virtual e indisponibilidade congela somente variável prescrita', () => {
    const r = new RolagemVirtual(0, Math.PI / 18);
    r.solicitar(Math.PI / 3, 0);
    for (let i = 0; i < 240; i++) r.avancar(1 / 240);
    expect(r.observar().atualRad).toBeCloseTo(Math.PI / 18, 12);
    r.definirDisponibilidade(false); r.avancar(1 / 240);
    expect(r.observar().atualRad).toBeCloseTo(Math.PI / 18, 12);
    expect(r.obterHistorico()).toHaveLength(2);
    expect(() => r.avancar(1)).toThrow();
  });

  it('comandos e controladores não escrevem estado cinemático; avanço ocorre só pelo core', () => {
    const r = criarEnsaioReentrada(), e = r.observar().estado;
    r.receberComando({ tipo: 'alvos', alphaRad: 0.6, phiRad: 1 });
    r.receberComando({ tipo: 'modo', automatico: false });
    r.receberComando({ tipo: 'flaps', dianteiroRad: 0.2, traseiroRad: -0.2 });
    expect(r.observar().estado).toEqual(e);
    for (const nome of ['ControladorReentrada', 'SupervisorReentrada']) {
      const fonte = readFileSync(new URL(`../physics/sistemas de controle/${nome}.ts`, import.meta.url), 'utf8');
      expect(fonte).not.toMatch(/atualizarEstadoPeloCore|aplicarImpulso|\.velocidadeMps\s*=/);
    }
    r.iniciar(); r.avancarPasso(); expect(r.observar().estado.posicaoM).not.toEqual(e.posicaoM);
  });

  it('bloqueia comando manual em automático, perde autoridade por energia/vínculo e registra eventos', () => {
    const r = criarEnsaioReentrada({ altitudeM: 60_000 });
    expect(r.receberComando({ tipo: 'flaps', dianteiroRad: 0.2, traseiroRad: 0 }).aceito).toBe(false);
    r.receberComando({ tipo: 'alimentacao', ligada: false }); r.iniciar();
    for (let i = 0; i < 24; i++) r.avancarPasso();
    expect(r.observar().controle.estado).toBe('falha');
    expect(r.obterEventos().some(e => e.tipo === 'perda-alimentacao')).toBe(true);
    expect(r.obterEventos().some(e => e.tipo === 'falha-controle-reentrada')).toBe(true);
    r.receberComando({ tipo: 'separar-flap', indice: 0 });
    for (let i = 0; i < 24; i++) r.avancarPasso();
    expect(r.observar().flaps[0].conectado).toBe(false); expect(r.observar().massaKg).toBe(79_500);
    expect(r.obterEventos().some(e => e.tipo === 'perda-vinculo')).toBe(true);
    expect(r.receberComando({ tipo: 'pouso' }).aceito).toBe(false);
    expect(r.observar().supervisor.requisitos.filter(e => !e.atendido).map(e => e.descricao)).toContain('Propulsão operacional');
  });

  const favoravel: EstadoTransferenciaPouso = { altitudeM: 300, velocidadeMps: 50, atitudeVerticalRad: 0,
    trajetoriaRad: -Math.PI / 2, sensoresValidos: true, integridade: 1, propulsaoDisponivel: true, integracaoCompativel: true };
  function montagem() {
    const g = new GerenciadorDeControladores();
    const criar = (id: string): ControladorDeVoo => ({ id, prioridade: 1, estaHabilitado: id === 'reentrada',
      habilitar: vi.fn(function(this: { estaHabilitado: boolean }) { this.estaHabilitado = true; }),
      desabilitar: vi.fn(function(this: { estaHabilitado: boolean }) { this.estaHabilitado = false; }),
      calcularSolicitacoes: () => [] });
    g.registrar(criar('reentrada')); g.registrar(criar('pouso'));
    return { g, s: new SupervisorReentrada(g) };
  }
  it.each<Partial<EstadoTransferenciaPouso>>([{ altitudeM: 120_000 }, { velocidadeMps: 7700 },
    { atitudeVerticalRad: 1 }, { trajetoriaRad: 0.1 }, { sensoresValidos: false },
    { integridade: 0 }, { propulsaoDisponivel: false }, { integracaoCompativel: false }, { velocidadeMps: NaN }])(
    'supervisor recusa condição incompatível %o', alteracao => {
      const { g, s } = montagem(); s.solicitarPouso(); s.atualizar({ ...favoravel, ...alteracao });
      expect(s.observar().autorizado).toBe(false); expect(g.idsAtivos()).not.toContain('pouso');
    });
  it.each([false, true])('transferência compatível manual/automática (%s) exclui reentrada e trata perda de propulsão', automatico => {
    const { g, s } = montagem(); s.definirAutomatico(automatico);
    if (!automatico) { s.atualizar(favoravel); expect(g.idsAtivos()).toEqual(['reentrada']); s.solicitarPouso(); }
    s.atualizar(favoravel); expect(g.idsAtivos()).toEqual(['pouso']);
    s.atualizar({ ...favoravel, propulsaoDisponivel: false });
    expect(s.observar().fase).toBe('falha'); expect(g.idsAtivos()).toEqual([]);
  });
});

describe('RE-001 — estabilidade e replay', () => {
  it('estados hipersônicos finitos, deterministicamente reproduzíveis, com comandos/pausa/falhas', () => {
    const r = criarEnsaioReentrada({ altitudeM: 65_000 });
    r.iniciar();
    for (let i = 0; i < 1200; i++) {
      if (i === 100) r.receberComando({ tipo: 'alvos', alphaRad: 0.8, phiRad: Math.PI / 3 });
      if (i === 500) { r.pausar(); expect(r.avancarPasso()).toBe(false); r.iniciar(); }
      if (i === 700) r.receberComando({ tipo: 'alimentacao', ligada: false });
      r.avancarPasso();
    }
    const diario = JSON.parse(JSON.stringify(r.exportar()));
    expect(JSON.stringify(reproduzirEnsaioReentrada(diario).exportar())).toBe(JSON.stringify(diario));
    const o = r.observar();
    expect([o.altitudeM, o.velocidadeMps, o.temperaturaC, o.estado.orientacaoRad.z,
      o.estado.velocidadeAngularRadps.z, o.cargaG, o.calorTransferidoW].every(Number.isFinite)).toBe(true);
    expect(o.estado.posicaoM.z).toBe(0); expect(o.estado.orientacaoRad.x).toBe(0);
    expect(o.energiaAbsorvidaJ).toBeGreaterThan(0);
    const adulterado = { ...diario, final: { ...diario.final, altitudeM: 0 } };
    expect(() => reproduzirEnsaioReentrada(adulterado)).toThrow('divergente');
    expect(() => reproduzirEnsaioReentrada({ ...diario, identificacao: { revisao: 'outra' } })).toThrow();
  }, 30_000);

  it('refinamento do dt hipersônico mantém trajetória próxima sem ajustar resultados históricos', () => {
    const a = criarEnsaioReentrada({ altitudeM: 65_000 }), b = criarEnsaioReentrada({ altitudeM: 65_000, passoS: 1 / 480 });
    a.iniciar(); b.iniciar();
    for (let i = 0; i < 480; i++) { a.avancarPasso(); b.avancarPasso(); b.avancarPasso(); }
    expect(a.observar().estado.posicaoM.subtrair(b.observar().estado.posicaoM).magnitude).toBeLessThan(2);
    expect(Math.abs(a.observar().velocidadeMps - b.observar().velocidadeMps)).toBeLessThan(1);
  }, 30_000);
});
