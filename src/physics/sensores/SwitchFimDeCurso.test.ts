import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../MundoFisico';
import { Vetor3 } from '../Vetor3';
import { Objeto } from '../objetos/base/Objeto';
import { SuperficiePlano } from '../SuperficiePlano';
import { SwitchFimDeCurso } from './SwitchFimDeCurso';

const criarObjeto = (id: string, posicaoM: Vetor3, orientacaoZRad = 0) => new Objeto({
  id, massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
  estadoInicial: { posicaoM, orientacaoRad: new Vetor3(0, 0, orientacaoZRad) },
});

describe('SwitchFimDeCurso', () => {
  it('retorna sinal 1/true quando sua face externa encontra outro objeto', () => {
    const mundo = new MundoFisico(0.01, { densidadeAtmosfericaKgM3: 0 });
    const hospedeiro = criarObjeto('carro', Vetor3.zero);
    const batente = criarObjeto('batente', new Vetor3(1.005, 0, 0));
    const sensor = new SwitchFimDeCurso({ id: 'fim-curso-frontal', objetoHospedeiro: hospedeiro, face: 'xPositiva', larguraM: 0.2, alturaM: 0.2, cursoM: 0.01 });
    mundo.registrarObjeto(hospedeiro); mundo.registrarObjeto(batente); mundo.registrarSwitchFimDeCurso(sensor);

    mundo.avancar(0.01);

    expect(sensor.estaAcionado()).toBe(true);
    expect(sensor.sinal).toBe(1);
    expect(sensor.obterAlvoEmContato()).toBe(batente);
  });

  it('acompanha a rotação do hospedeiro e desaciona quando o alvo deixa o curso', () => {
    const mundo = new MundoFisico(0.01, { densidadeAtmosfericaKgM3: 0 });
    const hospedeiro = criarObjeto('braço', Vetor3.zero, Math.PI / 2);
    const batente = criarObjeto('batente-superior', new Vetor3(0, 1.005, 0));
    const sensor = new SwitchFimDeCurso({ id: 'fim-curso-rotacionado', objetoHospedeiro: hospedeiro, face: 'xPositiva', cursoM: 0.01 });
    mundo.registrarObjeto(hospedeiro); mundo.registrarObjeto(batente); mundo.registrarSwitchFimDeCurso(sensor);
    mundo.avancar(0.01);
    expect(sensor.sinal).toBe(1);

    batente.atualizarEstadoPeloCore({ ...batente.getEstadoFisico(), posicaoM: new Vetor3(5, 5, 0) });
    mundo.avancar(0.01);
    expect(sensor.estaAcionado()).toBe(false);
    expect(sensor.sinal).toBe(0);
    expect(sensor.obterAlvoEmContato()).toBeUndefined();
  });

  it('detecta uma superfície pelo volume sensível sem participar da colisão', () => {
    const mundo = new MundoFisico(0.01, { densidadeAtmosfericaKgM3: 0 });
    const hospedeiro = criarObjeto('elevador', new Vetor3(0, 0.505, 0));
    const sensor = new SwitchFimDeCurso({ id: 'fim-curso-inferior', objetoHospedeiro: hospedeiro, face: 'yNegativa', cursoM: 0.01 });
    mundo.registrarObjeto(hospedeiro);
    mundo.registrarSuperficie(new SuperficiePlano('piso', 'aco', 0, 100_000, 0.5));
    mundo.registrarSwitchFimDeCurso(sensor);

    mundo.avancar(0.01);

    expect(sensor.sinal).toBe(1);
    expect(sensor.obterAlvoEmContato()).toEqual({ id: 'piso', tipo: 'superficie' });
  });
  it('usa diferencial mecânico de liberação sem acionar à distância (vácuo explícito)', () => {
    const mundo = new MundoFisico(0.001, { densidadeAtmosfericaKgM3: 0 });
    const suporte = criarObjeto('suporte-histerese', Vetor3.zero);
    const alvo = criarObjeto('alvo-histerese', new Vetor3(1.005, 0, 0));
    alvo.atualizarEstadoPeloCore({ ...alvo.getEstadoFisico(), velocidadeMps: new Vetor3(0.1, 0, 0) });
    const sensor = new SwitchFimDeCurso({ id: 'switch-histerese', objetoHospedeiro: suporte, face: 'xPositiva', cursoM: 0.01, histereseM: 0.01 });
    mundo.registrarObjeto(suporte); mundo.registrarObjeto(alvo); mundo.registrarSwitchFimDeCurso(sensor);
    expect(sensor.sinal).toBe(1);
    mundo.avancar(0.1);
    expect(sensor.sinal).toBe(1);
    mundo.avancar(0.1);
    expect(sensor.sinal).toBe(0);
    expect(sensor.cursoM).toBe(0.01);
  });

});
