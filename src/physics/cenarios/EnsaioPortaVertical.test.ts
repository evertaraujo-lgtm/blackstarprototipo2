import { describe, expect, it } from 'vitest';
import { criarEnsaioPortaVertical } from './EnsaioPortaVertical';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

function energizar(ensaio: ReturnType<typeof criarEnsaioPortaVertical>) {
  expect(ensaio.porta.ligarAlimentacao()).toBe(true);
  expect(ensaio.porta.ligarControle()).toBe(true);
}

describe('Porta vertical — atmosfera padrão, SI, dt máximo 1/240 s', () => {
  it('apoia a bateria pela face inferior no solo antes e durante a operação', () => {
    const e = criarEnsaioPortaVertical();
    const alturaDaBase = () => e.bateria.getEstadoFisico().posicaoM.y - e.bateria.dimensoesM.y / 2;
    expect(alturaDaBase()).toBe(e.solo.alturaM);
    energizar(e); e.porta.abrir(); e.mundo.avancar(0.5);
    expect(alturaDaBase()).toBeCloseTo(e.solo.alturaM, 10);
  });
  it('nasce fechada e exige alimentação antes do controle e dos comandos', () => {
    const e = criarEnsaioPortaVertical();
    expect(e.porta).toBeInstanceOf(Objeto);
    expect(e.porta.sensorFechadoAcionado).toBe(true);
    expect(e.porta.sensorAbertoAcionado).toBe(false);
    expect(e.porta.ligarControle()).toBe(false);
    expect(e.porta.abrir()).toBe(false);
    e.mundo.avancar(1);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeCloseTo(1.2, 2);
    expect(e.bateria.energiaConsumidaJ).toBe(0);
  });
  it('abre, retém contra gravidade e fecha pelos sensores físicos', () => {
    const e = criarEnsaioPortaVertical(); energizar(e);
    const inicial = e.porta.getEstadoFisico();
    e.porta.abrir();
    expect(e.porta.getEstadoFisico()).toEqual(inicial);
    e.mundo.avancar(7);
    expect(e.porta.sensorAbertoAcionado).toBe(true);
    expect(e.porta.sensorFechadoAcionado).toBe(false);
    expect(e.porta.velocidadeSolicitadaMps).toBe(0);
    const alturaAberta = e.porta.getEstadoFisico().posicaoM.y;
    e.mundo.avancar(2);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeCloseTo(alturaAberta, 2);
    expect(Math.abs(e.porta.getEstadoFisico().velocidadeMps.y)).toBeLessThan(0.05);
    e.porta.fechar(); e.mundo.avancar(8);
    expect(e.porta.sensorFechadoAcionado).toBe(true);
    expect(e.porta.sensorAbertoAcionado).toBe(false);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeGreaterThanOrEqual(1.19);
    expect(e.porta.integridadeEstrutural).toBe(1);
    expect(e.bateria.energiaConsumidaJ).toBeGreaterThan(0);
  }, 20_000);
  it.each([{ energiaInicialJ: 0 }, { tensaoBateriaV: 12 }])('bloqueia fonte indisponível: %j', (config) => {
    const e = criarEnsaioPortaVertical(config);
    expect(e.porta.ligarAlimentacao()).toBe(false);
    expect(e.porta.ligarControle()).toBe(false);
    e.porta.abrir(); e.mundo.avancar(0.1);
    expect(e.porta.forcaAtualN).toBe(0);
  });
  it('perda de alimentação cancela controle e deixa a porta cair sem congelar a física', () => {
    const e = criarEnsaioPortaVertical(); energizar(e); e.porta.abrir(); e.mundo.avancar(7);
    const altura = e.porta.getEstadoFisico().posicaoM.y;
    e.porta.desligarAlimentacao(); e.mundo.avancar(0.2);
    expect(e.porta.controleLigado).toBe(false);
    expect(e.porta.forcaAtualN).toBe(0);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeLessThan(altura - 0.1);
    e.porta.ligarAlimentacao();
    expect(e.porta.controleLigado).toBe(false);
    expect(e.porta.comandoAtual).toBe('parar');
  });
  it('impacto de fechamento acima da resistência produz dano mensurável', () => {
    const e = criarEnsaioPortaVertical({ alturaInicialM: 3, velocidadeInicialMps: -20, resistenciaPortaJ: 100 });
    e.mundo.avancar(0.4);
    expect(e.porta.integridadeEstrutural).toBeLessThan(1);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeGreaterThan(1.15);
  });
  it('dano a 150 °C é progressivo até a fusão a 700 °C na porta e no batente', () => {
    const e = criarEnsaioPortaVertical();
    for (const objeto of [e.porta, e.superior, e.inferior, ...e.laterais]) {
      objeto.aplicarEnergiaTermicaPeloCore((150 - objeto.temperaturaC) * objeto.capacidadeTermicaJPorC, 0.01);
      expect(objeto.integridadeEstrutural).toBe(1);
      objeto.aplicarEnergiaTermicaPeloCore(50 * objeto.capacidadeTermicaJPorC, 0.01);
      expect(objeto.integridadeEstrutural).toBeLessThan(1);
      expect(objeto.integridadeEstrutural).toBeGreaterThan(0);
      objeto.aplicarEnergiaTermicaPeloCore(500 * objeto.capacidadeTermicaJPorC, 0.01);
      expect(objeto.temperaturaC).toBe(700);
      expect(objeto.integridadeEstrutural).toBe(0);
    }
    expect(e.porta.ligarControle()).toBe(false);
  });
  it('esgotamento da bateria cancela a cadeia no próprio passo, sem partida automática', () => {
    const e = criarEnsaioPortaVertical({ energiaInicialJ: 1 }); energizar(e);
    e.porta.abrir(); e.mundo.avancar(0.2);
    expect(e.bateria.estaDescarregada).toBe(true);
    expect(e.porta.alimentacaoLigada).toBe(false);
    expect(e.porta.controleLigado).toBe(false);
    expect(e.porta.forcaAtualN).toBe(0);
  });
  it('rompe uma guia fraca sob esforço lateral e libera o movimento no mesmo core', () => {
    const e = criarEnsaioPortaVertical({ resistenciaGuiaN: 1 });
    e.mundo.aplicarForca(e.porta, new Vetor3(1_000, 0, 0));
    e.mundo.avancar(1 / 240);
    expect(e.guia.estaRompida).toBe(true);
    expect(e.porta.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(0);
  });
  it('fixação fraca rompe e o batente deixa de ficar ancorado artificialmente', () => {
    const e = criarEnsaioPortaVertical({ resistenciaChumbadoresN: 1 });
    const y = e.superior.getEstadoFisico().posicaoM.y;
    e.mundo.avancar(0.1);
    expect(e.chumbadores.find((c) => c.objeto === e.superior)?.estaRompido).toBe(true);
    expect(e.superior.getEstadoFisico().posicaoM.y).toBeLessThan(y);
  });
  it('reproduz o mesmo ciclo com os mesmos comandos e subpassos', () => {
    const executar = () => {
      const e = criarEnsaioPortaVertical(); energizar(e); e.porta.abrir();
      for (let i = 0; i < 180; i++) e.mundo.avancar(1 / 60);
      e.porta.fechar();
      for (let i = 0; i < 180; i++) e.mundo.avancar(1 / 60);
      return { estado: e.porta.getEstadoFisico(), energia: e.bateria.energiaArmazenadaJ, aberto: e.sensorAberto.sinal, fechado: e.sensorFechado.sinal };
    };
    expect(executar()).toEqual(executar());
  }, 20_000);
  it('ignora realimentação forjada pela API de comandos e respeita os sensores reais', () => {
    const e = criarEnsaioPortaVertical(); energizar(e);
    e.porta.definirEntradas({ avancar: true, recuar: false, avancado: true, recuado: false });
    expect(e.porta.velocidadeSolicitadaMps).toBe(0.6);
    e.mundo.avancar(0.1);
    expect(e.porta.getEstadoFisico().velocidadeMps.y).toBeGreaterThan(0);
  });

  it('degrada a força com a integridade e corta a operação quando a porta funde', () => {
    const e = criarEnsaioPortaVertical(); energizar(e); e.porta.abrir();
    e.porta.prepararPassoOperacional(1 / 240);
    const forcaIntegra = e.porta.forcaAtualN;
    e.porta.aplicarEnergiaTermicaPeloCore((425 - e.porta.temperaturaC) * e.porta.capacidadeTermicaJPorC, 0.001);
    e.porta.prepararPassoOperacional(1 / 240);
    expect(e.porta.forcaAtualN).toBeGreaterThan(0);
    expect(e.porta.forcaAtualN).toBeLessThan(forcaIntegra);
    expect(e.porta.obterForcasOperacionais()[0].forcaN.y + e.superior.obterForcasOperacionais()[0].forcaN.y).toBeCloseTo(0, 12);
    e.porta.aplicarEnergiaTermicaPeloCore((700 - e.porta.temperaturaC) * e.porta.capacidadeTermicaJPorC, 0.001);
    e.porta.prepararPassoOperacional(1 / 240);
    expect(e.porta.forcaAtualN).toBe(0);
    expect(e.porta.abrir()).toBe(false);
  });

  it.each(['abrirInterruptor', 'desconectar', 'romper'] as const)('corta a força quando a conexão elétrica executa %s', (acao) => {
    const e = criarEnsaioPortaVertical(); energizar(e); e.porta.abrir(); e.mundo.avancar(0.3);
    const energia = e.bateria.energiaArmazenadaJ;
    e.conexaoEletrica[acao](); e.mundo.avancar(1 / 240);
    expect(e.porta.forcaAtualN).toBe(0);
    expect(e.porta.controleLigado).toBe(false);
    expect(e.porta.comandoAtual).toBe('parar');
    expect(e.bateria.energiaArmazenadaJ).toBe(energia);
    if (acao !== 'romper') {
      e.conexaoEletrica.conectar(); e.conexaoEletrica.fecharInterruptor();
      expect(e.porta.controleLigado).toBe(false);
    }
  });
  it.each([{ correnteMaximaA: 0.1 }, { resistenciaCaboOhm: 100 }])('não levanta a porta quando a conexão não entrega potência suficiente: %j', (config) => {
    const e = criarEnsaioPortaVertical(config); energizar(e); e.porta.abrir(); e.mundo.avancar(0.2);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeCloseTo(1.2, 2);
    expect(e.conexaoEletrica.correnteLimitada).toBe(true);
    expect(e.conexaoEletrica.correnteAtualA).toBeLessThanOrEqual(e.conexaoEletrica.correnteMaximaA + 1e-9);
  });

});
