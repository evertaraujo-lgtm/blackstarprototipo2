import { describe, expect, it } from 'vitest';
import { criarCenarioReentrada, criarEnsaioReentrada, configurarReentrada, reproduzirEnsaioReentrada } from './EnsaioReentrada';
import { configurarParametrosReentrada, MODELO_REENTRADA } from '../physics/reentrada/ModeloAerodinamicoReentrada';
import { RegistroExtremos } from '../missoes/RegistroExtremos';

describe('RE-002C — parâmetros e instrumentação por passo', () => {
  it('copia parâmetros parciais, preserva padrões e rejeita campos/valores inválidos', () => {
    const c = configurarReentrada({ parametros: { cpBaseM: -2, cdCorpoBase: 0.2 } });
    expect(c.parametros.cpBaseM).toBe(-2); expect(c.parametros.cdCorpoBase).toBe(0.2);
    expect(configurarReentrada().parametros.cpBaseM).toBe(-0.15);
    expect(Object.isFrozen(c.parametros)).toBe(true);
    expect(() => configurarParametrosReentrada({ desconhecido: 1 } as never)).toThrow();
    expect(() => configurarParametrosReentrada({ massaCorpoKg: -1 })).toThrow();
    expect(() => configurarParametrosReentrada({ calorEspecificoCorpoJPorKgC: 0 })).toThrow();
    expect(() => configurarParametrosReentrada({ fracaoCargaInicialBateria: 2 })).toThrow();
    expect(() => configurarParametrosReentrada({ cursoFlapRad: Math.PI })).toThrow();
  });

  it('coeficientes, CP, massa, capacidade térmica e bank configurados chegam aos corpos reais', () => {
    const a = criarCenarioReentrada({ altitudeM: 65000 });
    const b = criarCenarioReentrada({ altitudeM: 65000, parametros: { clCorpo: 0.45, cpBaseM: -2,
      massaCorpoKg: 80000, calorEspecificoCorpoJPorKgC: 900, taxaRolagemRadps: 0.01 } });
    expect(b.orbitador.avaliar(b.mundo.obterCondicoesAtmosfericas(b.orbitador)).sustentacaoN)
      .toBeCloseTo(a.orbitador.avaliar(a.mundo.obterCondicoesAtmosfericas(a.orbitador)).sustentacaoN / 2, 6);
    expect(b.orbitador.massaKg).toBe(80000); expect(b.orbitador.capacidadeTermicaJPorC).toBe(72e6);
    expect(b.orbitador.avaliar(b.mundo.obterCondicoesAtmosfericas(b.orbitador)).centroPressaoLocalM).toBeLessThan(-2);
    b.orbitador.solicitarRolagem(1, 0); b.mundo.avancar(1 / 240);
    expect(b.orbitador.observarRolagem().atualRad).toBeCloseTo(0.01 / 240, 12);
  });

  it('comprimento característico altera Kn e mantém indicação de extrapolação', () => {
    const a = criarEnsaioReentrada(), b = criarEnsaioReentrada({ parametros: { comprimentoCaracteristicoCorpoM: 16 } });
    expect(b.observar().aerodinamica.knudsen).toBe(a.observar().aerodinamica.knudsen / 2);
    expect(b.observar().flaps[0].modeloEscoamento).toBe('polar-continua-extrapolada');
  });

  it('registra cruzamento térmico no passo efetivo, antes da coleta a 1 Hz', () => {
    const e = criarEnsaioReentrada({ altitudeM: 65000, limiteOrbitadorC: 20.001, limiteFlapsC: 20.001 });
    e.iniciar(); e.avancarPasso();
    const evento = e.obterEventos().find(x => x.tipo === 'limite-termico-orbitador');
    expect(evento?.passo).toBe(1); expect(evento?.tempoS).toBe(e.passoS);
    expect(evento?.dados?.causa).toBe('limite-termico-orbitador');
    expect(Number(evento?.dados?.valor)).toBeGreaterThan(20.001);
    expect(e.exportar().amostras).toHaveLength(1);
    expect(e.observar().extremos.globais.temperaturaCorpoC.maximo.passo).toBe(1);
  });

  it('pico entre amostras mantém valor, tempo e passo no intervalo', () => {
    const r = new RegistroExtremos(4);
    for (let p = 0; p <= 4; p++) r.registrar({ qPa: p === 2 ? 1000 : 0 }, p, p / 240);
    const o = r.observar();
    expect(o.ultimoIntervalo?.extremos.qPa.maximo).toEqual({ valor: 1000, passo: 2, tempoS: 2 / 240 });
    expect(o.globais.qPa.maximo.valor).toBe(1000);
    expect(() => r.registrar({ qPa: NaN }, 5, 5 / 240)).toThrow();
  });

  it('janela do diário é limitada, declara descartes e mantém replay exato', () => {
    const e = criarEnsaioReentrada({ intervaloColetaS: 1 / 240, limiteAmostras: 2, limiteEventos: 10 });
    e.iniciar(); for (let i = 0; i < 10; i++) e.avancarPasso();
    const d = e.exportar(); expect(d.amostras).toHaveLength(2);
    expect(d.amostras[0].passo).toBe(0); expect(d.amostras[1].passo).toBe(10);
    expect(d.retencao).toMatchObject({ amostrasDescartadas: 9, agendaCompleta: true });
    expect(reproduzirEnsaioReentrada(d).exportar()).toEqual(d);
  });

  it('retém eventos com sequência original e declara descartes sem perder a agenda', () => {
    const e = criarEnsaioReentrada({ limiteEventos: 10 });
    for (let i = 0; i < 26; i++) e.receberComando({ tipo: 'alimentacao', ligada: i % 2 === 0 });
    expect(e.obterEventos()).toHaveLength(10); expect(e.observar().eventosDescartados).toBe(18);
    expect(e.obterEventos()[2].sequencia).toBe(20);
    expect(reproduzirEnsaioReentrada(e.exportar()).exportar()).toEqual(e.exportar());
  });

  it('torque registrado após atuação fecha o balanço melhor que amostragem anterior ao passo', () => {
    const e = criarEnsaioReentrada({ altitudeM: 65000, velocidadeMps: 2500 });
    e.iniciar(); for (let i = 0; i < 100; i++) e.avancarPasso();
    const o = e.observar(); expect(o.rotacao.cargasEfetivamenteIntegradas).not.toBeNull();
    expect(o.rotacao.passosIncompletos).toBe(0);
    expect(Math.abs(o.rotacao.residuoAcumuladoKgM2ps)).toBeLessThan(0.01);
    expect(o.flaps[0].atuacao.torqueDisponivelNm).toBeNull();
    expect(Math.abs(o.flaps[0].atuacao.taxaEfetivaRadps)).toBeLessThanOrEqual(MODELO_REENTRADA.taxaFlapRadps * (1 + 1e-10));
  });

  it('cargas aerodinâmicas reais chegam aos fixadores sem calibrar resistência para romper', () => {
    const c = criarCenarioReentrada({ altitudeM: 1000, velocidadeMps: 12000, anguloAtaqueRad: 80 * Math.PI / 180 });
    c.mundo.avancar(1 / 240);
    expect(Math.max(...c.fixadores.map(f => f.picoEsforcoFisicoN))).toBeGreaterThan(0);
    // Neste estado o esforço axial calculado não excede os 100 MN. Pressão
    // alta, sozinha, não autoriza fabricar ruptura ou dano de cisalhamento.
    expect(Math.max(...c.fixadores.map(f => f.picoEsforcoFisicoN))).toBeLessThan(1e8);
    expect(c.objetos).toHaveLength(4);
    for (const o of c.objetos) expect(Number.isFinite(o.getEstadoFisico().velocidadeMps.magnitude)).toBe(true);
  });

  it('tração externa declarada de 500 MN rompe o vínculo de 100 MN e preserva os corpos', () => {
    const c = criarCenarioReentrada({ vacuo: true, altitudeM: 200000, velocidadeMps: 9000 });
    const r = c.flaps[0].getEstadoFisico().posicaoM.subtrair(c.orbitador.getEstadoFisico().posicaoM);
    c.mundo.aplicarForca(c.flaps[0], r.multiplicar(500e6 / r.magnitude));
    c.mundo.avancar(1 / 240);
    expect(c.fixadores[0].resistenciaTracaoN).toBe(100e6);
    expect(c.fixadores[0].estaRompido).toBe(true);
    expect(c.objetos).toHaveLength(4);
    expect(c.flaps[0].getEstadoFisico().velocidadeMps).not.toEqual(c.orbitador.getEstadoFisico().velocidadeMps);
  });

  it('expõe a limitação da hipótese min(indicador, D·V), sem tratá-la como lei universal', () => {
    const e = criarEnsaioReentrada({ altitudeM: 65000, anguloAtaqueRad: 0,
      parametros: { clCorpo: 0, cdCorpoBase: 0, cdCorpoAlpha: 0, cdMachGauss: 0 } });
    const t = e.observar().respostaTermica;
    expect(t.potenciaIndicadorCorpoW).toBeGreaterThan(0);
    expect(t.potenciaTransferidaCorpoW).toBe(0);
    expect(t.tetoUniversal).toBe(false);
  });

  it('bateria vazia impede atuação, mantendo isolamento térmico e parâmetros rastreáveis', () => {
    const e = criarEnsaioReentrada({ parametros: { fracaoCargaInicialBateria: 0, cdCorpoBase: 0.25 } });
    e.iniciar(); e.avancarPasso(); const o = e.observar();
    expect(o.energiaBateriaJ).toBe(0); expect(o.temperaturaBateriaC).toBe(20);
    expect(o.flaps[0].atuacao.taxaEfetivaRadps).toBe(0);
    expect((e.exportar().identificacao as { modeloOrbitador: { cdCorpoBase: number } }).modeloOrbitador.cdCorpoBase).toBe(0.25);
    expect(o.respostaTermica.tetoUniversal).toBe(false);
  });
});
