import { describe, expect, it } from 'vitest';
import { criarEnsaioPortaVertical } from './EnsaioPortaVertical';

function iniciar() {
  const e = criarEnsaioPortaVertical();
  expect(e.gerador.ligar()).toBe(true);
  expect(e.porta.ligarAlimentacao()).toBe(true);
  expect(e.porta.ligarControle()).toBe(true);
  expect(e.porta.abrir()).toBe(true);
  return e;
}

describe('Porta com comando CC e potência CA — SI, atmosfera padrão, dt ≤ 1/240 s', () => {
  it('CC sozinho alimenta o controle e não move a carga; CA sozinho não fecha K1', () => {
    const e = criarEnsaioPortaVertical();
    e.porta.ligarAlimentacao(); e.porta.ligarControle();
    expect(e.porta.abrir()).toBe(false);
    e.mundo.avancar(0.1);
    expect(e.bateria.energiaConsumidaJ).toBeCloseTo(0.6, 6);
    expect(e.gerador.energiaEletricaGeradaJ).toBe(0);
    expect(e.porta.forcaAtualN).toBe(0);
    e.porta.desligarAlimentacao(); e.gerador.ligar(); e.mundo.avancar(0.1);
    expect(e.contator.estaFechado).toBe(false);
    expect(e.porta.forcaAtualN).toBe(0);
  });
  it('abre e fecha com energia do gerador e consumo independente de comando', () => {
    const e = iniciar(); e.mundo.avancar(7);
    expect(e.porta.sensorAbertoAcionado).toBe(true);
    expect(e.bateria.energiaConsumidaJ).toBeGreaterThan(12 * 7);
    expect(e.bateria.energiaConsumidaJ).toBeLessThan(200);
    expect(e.gerador.energiaEletricaGeradaJ).toBeGreaterThan(500);
    expect(e.gerador.energiaMecanicaRestanteJ).toBeCloseTo(1e7 - e.gerador.energiaEletricaGeradaJ / 0.9, 5);
    e.porta.fechar(); e.mundo.avancar(8);
    expect(e.porta.sensorFechadoAcionado).toBe(true);
    expect(e.porta.integridadeEstrutural).toBe(1);
    expect(e.gerador.getEstadoFisico().posicaoM.y - e.gerador.dimensoesM.y / 2).toBeCloseTo(0, 10);
  }, 20_000);
  it.each(['cc', 'ca', 'gerador'] as const)('perda de %s corta potência sem retorno automático', (falha) => {
    const e = iniciar(); e.mundo.avancar(0.3);
    if (falha === 'cc') e.conexaoEletrica.desconectar();
    if (falha === 'ca') e.conexaoPotencia.desconectar();
    if (falha === 'gerador') e.gerador.desligar();
    e.mundo.avancar(1 / 240);
    expect(e.porta.forcaAtualN).toBe(0);
    expect(e.contator.estaFechado).toBe(false);
    expect(e.porta.comandoAtual).toBe('parar');
    e.conexaoEletrica.conectar(); e.conexaoEletrica.fecharInterruptor();
    e.conexaoPotencia.conectar(); e.conexaoPotencia.fecharInterruptor(); e.gerador.ligar();
    e.mundo.avancar(0.1);
    expect(e.contator.estaFechado).toBe(false);
    expect(e.porta.forcaAtualN).toBe(0);
  });
  it.each(['cc', 'ca'] as const)('ruptura de %s interrompe a cadeia', (circuito) => {
    const e = iniciar(); e.mundo.avancar(0.2);
    (circuito === 'cc' ? e.conexaoEletrica : e.conexaoPotencia).romper();
    e.mundo.avancar(1 / 240);
    expect(e.porta.forcaAtualN).toBe(0); expect(e.contator.estaFechado).toBe(false);
  });
  it('limitação de corrente CC derruba bobina, sem usar energia CA para sustentar o controle', () => {
    const e = iniciar(); e.mundo.avancar(0.1);
    e.conexaoEletrica.configurarCorrenteMaxima(0.3); e.mundo.avancar(1 / 240);
    expect(e.contator.estaFechado).toBe(false); expect(e.porta.controleLigado).toBe(false);
    expect(e.porta.forcaAtualN).toBe(0);
  });
  it('limitação de potência CA não aumenta o consumo CC', () => {
    const e = iniciar(); e.conexaoPotencia.configurarCorrenteMaxima(0.001); e.mundo.avancar(0.2);
    expect(e.porta.getEstadoFisico().posicaoM.y).toBeCloseTo(1.2, 2);
    expect(e.bateria.energiaConsumidaJ).toBeGreaterThan(2.4);
    expect(e.bateria.energiaConsumidaJ).toBeLessThan(10);
    expect(e.conexaoPotencia.correnteLimitada).toBe(true);
  });
  it('gerador degrada acima de 125 °C e falha a 180 °C sem representar fusão', () => {
    const e = iniciar(); const g = e.gerador;
    g.aplicarEnergiaTermicaPeloCore((125 - g.temperaturaC) * g.capacidadeTermicaJPorC, 0.001);
    expect(g.integridadeEstrutural).toBe(1);
    g.aplicarEnergiaTermicaPeloCore(25 * g.capacidadeTermicaJPorC, 0.001);
    expect(g.integridadeEstrutural).toBeGreaterThan(0); expect(g.integridadeEstrutural).toBeLessThan(1);
    g.aplicarEnergiaTermicaPeloCore(30 * g.capacidadeTermicaJPorC, 0.001);
    expect(g.temperaturaC).toBe(180); expect(g.integridadeEstrutural).toBe(0);
    expect(g.temperaturaFusaoC).toBeUndefined();
    e.mundo.avancar(1 / 240); expect(e.porta.forcaAtualN).toBe(0); expect(g.ligar()).toBe(false);
  });
  it('orçamento do gerador é compartilhado e as perdas conservam energia', () => {
    const { gerador: g } = criarEnsaioPortaVertical(); g.ligar(); g.prepararPassoEnergetico(0.01);
    expect(g.fornecerEnergia(30)).toBe(30);
    expect(g.fornecerEnergia(30)).toBe(10);
    expect(g.fornecerEnergia(1)).toBe(0);
    expect(g.obterPotenciaTermicaGeradaW() * 0.01 + 40).toBeCloseTo(40 / 0.9, 10);
  });
  it('repete estados e consumos com a mesma sequência', () => {
    const executar = () => { const e = iniciar(); for (let i = 0; i < 30; i++) e.mundo.avancar(1 / 60);
      return [e.porta.getEstadoFisico(), e.bateria.energiaConsumidaJ, e.gerador.energiaEletricaGeradaJ]; };
    expect(executar()).toEqual(executar());
  });
});
