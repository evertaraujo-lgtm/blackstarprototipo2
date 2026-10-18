import { describe, it, expect } from 'vitest';
import { criarCenarioReentrada } from '../../cenarios/EnsaioReentrada';
import { ConjuntoEstruturalRigido } from './ConjuntoEstruturalRigido';
import { diagnosticarMomentoAngular, BalancoAngular } from './DiagnosticoAngular';
import { Vetor3 } from '../Vetor3';
import { MundoFisico } from '../MundoFisico';
import { AmbientePlano } from '../ambiente/AmbienteFisico';

describe('RE-002B — momento intrínseco sem contaminação orbital', () => {
  it('100.000 projeções sem torque conservam rotação e invariância de Galileu', () => {
    const finais: number[] = [];
    for (const incremento of [0, 9000]) {
      const c = criarCenarioReentrada({ vacuo: true, altitudeM: 200000, velocidadeMps: 9000 });
      for (const o of c.objetos) {
        const e = o.getEstadoFisico();
        o.atualizarEstadoPeloCore({ ...e, posicaoM: e.posicaoM.adicionar(new Vetor3(6e6, 7e6, 0)),
          velocidadeMps: e.velocidadeMps.adicionar(new Vetor3(incremento, 0, 0)) });
      }
      const ilha = new ConjuntoEstruturalRigido(c.objetos), w0 = c.orbitador.getEstadoFisico().velocidadeAngularRadps.z;
      for (let i = 0; i < 100000; i++) ilha.sincronizar(0, false);
      const w = c.orbitador.getEstadoFisico().velocidadeAngularRadps.z;
      // Orçamento 1e−10 rad/s: 10 milhões de vezes menor que a deriva reproduzida.
      expect(Math.abs(w - w0)).toBeLessThan(1e-10); finais.push(w);
    }
    expect(Math.abs(finais[0] - finais[1])).toBeLessThan(1e-10);
  });

  it('impulso pelo CM não gira e impulso excêntrico produz J angular / I', () => {
    const c = criarCenarioReentrada({ vacuo: true, velocidadeMps: 9000, altitudeM: 200000 });
    const ilha = new ConjuntoEstruturalRigido(c.objetos), G = ilha.obterCentroDeMassaAtual();
    const w0 = c.orbitador.getEstadoFisico().velocidadeAngularRadps.z;
    ilha.aplicarImpulsosSequenciais([{ impulsoNs: new Vetor3(1e5, -2e5, 0), pontoM: G }]);
    expect(c.orbitador.getEstadoFisico().velocidadeAngularRadps.z).toBeCloseTo(w0, 11);
    ilha.aplicarImpulsosSequenciais([{ impulsoNs: new Vetor3(0, 1000, 0), pontoM: G.adicionar(new Vetor3(10, 0, 0)) }]);
    expect(c.orbitador.getEstadoFisico().velocidadeAngularRadps.z).toBeCloseTo(w0 + 10000 / ilha.momentoInerciaZKgM2, 10);
  });

  it('gravidade uniforme em vácuo não cria torque de gradiente ou deriva angular', () => {
    const c = criarCenarioReentrada({ vacuo: true, altitudeM: 200000, velocidadeMps: 9000 });
    const mundo = new MundoFisico(1 / 240, { ambiente: new AmbientePlano(), densidadeAtmosfericaKgM3: 0 });
    for (const o of c.objetos) mundo.registrarObjeto(o);
    for (const f of c.fixadores) mundo.registrarFixador(f);
    const w0 = c.orbitador.getEstadoFisico().velocidadeAngularRadps.z;
    for (let i = 0; i < 2400; i++) mundo.avancar(1 / 240);
    const d = diagnosticarMomentoAngular(c.objetos, Vetor3.zero, p => mundo.obterGravidadeMps2(p));
    expect(d.torqueGravitacionalNm).toBe(0);
    expect(Math.abs(d.omegaInercialRadps - w0)).toBeLessThan(1e-9);
  });

  it.each([1 / 120, 1 / 240, 1 / 480, 1 / 960])('gradiente central e balanço de torque, dt=%s s em vácuo', dt => {
    const c = criarCenarioReentrada({ vacuo: true, altitudeM: 200000, velocidadeMps: 9000, passoS: dt });
    const b = new BalancoAngular();
    const medir = () => diagnosticarMomentoAngular(c.objetos, c.ambiente.campo.centroM, p => c.mundo.obterGravidadeMps2(p));
    const inicial = medir(); let antes = inicial;
    for (let i = 0; i < 10 / dt; i++) {
      c.mundo.avancar(dt); const depois = medir(); b.registrar(antes, depois, dt, 0, true); antes = depois;
    }
    expect(Math.abs(antes.torqueGravitacionalNm)).toBeGreaterThan(0);
    // 0,01 N·m·s equivale a <1e−9 rad/s para a montagem de ~1e7 kg·m².
    expect(Math.abs(b.observar().residuoAcumuladoKgM2ps)).toBeLessThan(0.01);
    expect(Math.abs((antes.momentoOrbitalKgM2ps - inicial.momentoOrbitalKgM2ps) / inicial.momentoOrbitalKgM2ps)).toBeLessThan(1e-10);
  });

  it('corpo isolado em órbita central e vácuo conserva rotação inercial sem torque', () => {
    const c = criarCenarioReentrada({ vacuo: true, altitudeM: 200000, velocidadeMps: 9000 });
    const mundo = new MundoFisico(1 / 240, { ambiente: c.ambiente, densidadeAtmosfericaKgM3: 0 });
    mundo.registrarObjeto(c.orbitador);
    const w0 = c.orbitador.getEstadoFisico().velocidadeAngularRadps.z;
    for (let i = 0; i < 2400; i++) mundo.avancar(1 / 240);
    expect(c.orbitador.getEstadoFisico().velocidadeAngularRadps.z).toBe(w0);
  });

  it('diagnóstico não altera estado e balanço não encobre passos com impulso desconhecido', () => {
    const c = criarCenarioReentrada({ vacuo: true }), estado = c.orbitador.getEstadoFisico();
    const d = diagnosticarMomentoAngular(c.objetos, c.ambiente.campo.centroM, p => c.mundo.obterGravidadeMps2(p));
    const b = new BalancoAngular(); b.registrar(d, d, 1 / 240, 10, false);
    expect(c.orbitador.getEstadoFisico()).toEqual(estado);
    expect(b.observar().passosIncompletos).toBe(1);
    expect(b.observar().residuoAcumuladoKgM2ps).not.toBe(0);
  });
});
