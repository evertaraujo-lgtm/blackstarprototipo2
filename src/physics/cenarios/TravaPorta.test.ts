import { describe, expect, it } from 'vitest';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { criarEnsaioPortaVertical } from './EnsaioPortaVertical';

function energizar() {
  const e = criarEnsaioPortaVertical();
  e.gerador.ligar(); e.porta.ligarAlimentacao(); e.porta.ligarControle();
  if (!e.trava) throw new Error('Ensaio exige trava.');
  return { ...e, trava: e.trava };
}

describe('Trava fail-safe da porta', () => {
  it('é um Objeto com comportamento de Cilindro e nasce avançada sem energia', () => {
    const e = criarEnsaioPortaVertical();
    expect(e.trava).toBeInstanceOf(Objeto);
    expect(e.trava?.estaAvancada).toBe(true);
    expect(e.trava?.velocidadeAvancoMps).toBe(0.5);
    e.mundo.avancar(0.5);
    expect(e.trava?.estaAvancada).toBe(true);
  });

  it('o comando abrir recua a trava antes de autorizar o movimento da porta', () => {
    const e = energizar(); const altura = e.porta.getEstadoFisico().posicaoM.y;
    e.porta.abrir(); e.mundo.avancar(0.1);
    expect(e.trava.comandoAtual).toBe('recuar');
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeCloseTo(altura, 2);
    e.mundo.avancar(0.5);
    expect(e.trava.estaRecuada).toBe(true);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeGreaterThan(altura);
  });

  it('sensor de porta aberta avança a trava e ela sustenta a porta sem energia', () => {
    const e = energizar(); e.porta.abrir(); e.mundo.avancar(7);
    expect(e.porta.sensorAbertoAcionado).toBe(true);
    expect(e.porta.comandoAtual).toBe('parar');
    expect(e.trava.comandoAtual).toBe('avancar');
    expect(e.trava.estaAvancada).toBe(true);
    const altura = e.porta.getEstadoFisico().posicaoM.y;
    e.porta.desligarAlimentacao(); e.gerador.desligar(); e.mundo.avancar(120);
    expect(e.trava.estaAvancada).toBe(true);
    expect(e.guiaTrava?.estaRompida).toBe(false);
    expect(e.trava.getEstadoFisico().posicaoM.y).toBeCloseTo(2.32, 8);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeGreaterThan(altura - 0.03);
  }, 90_000);

  it('não sustenta a porta à distância quando perde o encaixe físico', () => {
    const e = energizar(); e.porta.abrir(); e.mundo.avancar(7);
    expect(e.trava.estaSustentandoPorta).toBe(true);
    const estado = e.trava.getEstadoFisico();
    e.trava.atualizarEstadoPeloCore({ ...estado, posicaoM: estado.posicaoM.adicionar(new Vetor3(0, -2, 0)) });
    expect(e.trava.estaSustentandoPorta).toBe(false);
    expect(e.trava.obterForcasNaPorta()).toEqual([]);
  }, 20_000);

  it('comando fechar recua a trava e só depois permite a descida', () => {
    const e = energizar(); e.porta.abrir(); e.mundo.avancar(7);
    const altura = e.porta.getEstadoFisico().posicaoM.y;
    e.porta.fechar(); e.mundo.avancar(0.1);
    expect(e.trava.comandoAtual).toBe('recuar');
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeCloseTo(altura, 2);
    e.mundo.avancar(0.5);
    expect(e.trava.estaRecuada).toBe(true);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeLessThan(altura);
  }, 20_000);

  it('perda de CC durante o recuo aciona o retorno mecânico ao avanço', () => {
    const e = energizar(); e.porta.abrir(); e.mundo.avancar(0.5);
    expect(e.trava.estaRecuada).toBe(true);
    e.porta.desligarAlimentacao(); e.mundo.avancar(1 / 240);
    expect(e.trava.comandoAtual).toBe('avancar');
    expect(e.trava.forcaAtualDaTravaN).toBeGreaterThan(0);
  });

  it('sofre dano acima de 150 °C e falha totalmente a 700 °C', () => {
    const e = energizar(); const trava = e.trava;
    trava.aplicarEnergiaTermicaPeloCore((150 - trava.temperaturaC) * trava.capacidadeTermicaJPorC, 0.01);
    expect(trava.integridadeEstrutural).toBe(1);
    trava.aplicarEnergiaTermicaPeloCore(100 * trava.capacidadeTermicaJPorC, 0.01);
    expect(trava.integridadeEstrutural).toBeGreaterThan(0);
    expect(trava.integridadeEstrutural).toBeLessThan(1);
    trava.aplicarEnergiaTermicaPeloCore(450 * trava.capacidadeTermicaJPorC, 0.01);
    expect(trava.integridadeEstrutural).toBe(0);
  });
});
