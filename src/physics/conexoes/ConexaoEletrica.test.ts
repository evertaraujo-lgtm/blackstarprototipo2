import { describe, expect, it } from 'vitest';
import { criarEnsaioPortaVertical } from '../cenarios/EnsaioPortaVertical';
import { ConexaoEletrica } from './ConexaoEletrica';
import { Resistor } from './eletrica/Resistor';
import { Interruptor } from './eletrica/Interruptor';
import { Vetor3 } from '../Vetor3';

function criar(correnteMaximaA = 10, resistenciaCaboOhm = 0, energiaInicialJ = 1e6) {
  const e = criarEnsaioPortaVertical({ energiaInicialJ });
  const conexao = new ConexaoEletrica({ id: 'cabo-teste', fonte: e.bateria, destino: e.superior, comprimentoMaximoM: 8, correnteMaximaA, resistenciaCaboOhm, inicialmenteLigada: true });
  return { ...e, conexao };
}

describe('ConexaoEletrica — DC, A/V/ohms/J/s', () => {
  it('fornece energia ideal e compartilha o limite entre várias cargas no mesmo passo', () => {
    const e = criar(2); e.conexao.prepararPasso(1);
    expect(e.conexao.fornecerEnergia(24)).toBe(24);
    expect(e.conexao.fornecerEnergia(48)).toBe(24);
    expect(e.conexao.fornecerEnergia(1)).toBe(0);
    expect(e.conexao.correnteAtualA).toBe(2);
    expect(e.conexao.correnteLimitada).toBe(true);
    expect(e.bateria.energiaConsumidaJ).toBe(48);
    expect(e.conexao.energiaDissipadaNoPassoJ).toBe(0);
  });
  it('aplica queda V=RI e perdas I²R conservando energia ao dividir solicitações', () => {
    const e = criar(10, 2); e.conexao.prepararPasso(1);
    expect(e.conexao.fornecerEnergia(20)).toBeCloseTo(20, 10);
    expect(e.conexao.fornecerEnergia(20)).toBeCloseTo(20, 10);
    expect(e.conexao.correnteAtualA).toBeCloseTo(2, 10);
    expect(e.conexao.tensaoSaidaV).toBeCloseTo(20, 10);
    expect(e.conexao.energiaDissipadaNoPassoJ).toBeCloseTo(8, 10);
    expect(e.bateria.energiaConsumidaJ).toBeCloseTo(48, 10);
    expect(e.conexao.energiaEntregueNoPassoJ + e.conexao.energiaDissipadaNoPassoJ).toBeCloseTo(e.conexao.energiaConsumidaNoPassoJ, 10);
  });
  it('limita a corrente continuamente e não cria energia sob carga excessiva', () => {
    const e = criar(3, 2); e.conexao.prepararPasso(1);
    expect(e.conexao.fornecerEnergia(500)).toBeCloseTo(54, 10);
    expect(e.conexao.correnteAtualA).toBeCloseTo(3, 10);
    expect(e.conexao.tensaoSaidaV).toBeCloseTo(18, 10);
    expect(e.bateria.energiaConsumidaJ).toBeCloseTo(72, 10);
  });
  it('respeita a potência máxima transferível de uma resistência elevada', () => {
    const e = criar(100, 10); e.conexao.prepararPasso(1);
    expect(e.conexao.fornecerEnergia(500)).toBeCloseTo(14.4, 10);
    expect(e.conexao.tensaoSaidaV).toBeCloseTo(12, 10);
    expect(e.conexao.correnteAtualA).toBeCloseTo(1.2, 10);
  });
  it('compõe vários resistores e interruptores em série', () => {
    const e = criar(); const a = new Interruptor('a', true); const b = new Interruptor('b');
    const conexao = new ConexaoEletrica({ id: 'serie', fonte: e.bateria, destino: e.superior, comprimentoMaximoM: 8, correnteMaximaA: 10,
      inicialmenteLigada: true, resistores: [new Resistor('r1', 0.5), new Resistor('r2', 1.5)], interruptores: [a, b] });
    conexao.prepararPasso(1); expect(conexao.fornecerEnergia(40)).toBe(0);
    b.fechar(); expect(conexao.fornecerEnergia(40)).toBeCloseTo(40, 10);
    expect(conexao.resistenciaTotalOhm).toBe(2);
    a.abrir(); expect(conexao.fornecerEnergia(1)).toBe(0);
    expect(conexao.correnteAtualA).toBe(0);
  });
  it('esgota a bateria descontando também as perdas, sem saldo negativo', () => {
    const e = criar(10, 2, 12); e.conexao.prepararPasso(1);
    expect(e.conexao.fornecerEnergia(40)).toBeCloseTo(11.5, 10);
    expect(e.conexao.energiaDissipadaNoPassoJ).toBeCloseTo(0.5, 10);
    expect(e.bateria.energiaArmazenadaJ).toBe(0);
    expect(e.conexao.fornecerEnergia(1)).toBe(0);
  });
  it('desconecta, reconecta desligada e não repara uma ruptura', () => {
    const e = criar(); e.conexao.prepararPasso(1); e.conexao.desconectar();
    expect(e.conexao.fornecerEnergia(10)).toBe(0);
    expect(e.conexao.estaRompida).toBe(false);
    expect(e.conexao.conectar()).toBe(true);
    expect(e.conexao.interruptorFechado).toBe(false);
    expect(e.conexao.fecharInterruptor()).toBe(true);
    expect(e.conexao.fornecerEnergia(10)).toBeCloseTo(10, 10);
    e.conexao.romper(); expect(e.conexao.conectar()).toBe(false);
    expect(e.conexao.fecharInterruptor()).toBe(false);
    expect(e.conexao.fornecerEnergia(10)).toBe(0);
  });
  it('rompe por alcance mesmo sem carga, sem mudar posições dos corpos', () => {
    const e = criar(); const posicao = new Vetor3(20, 0, 0);
    e.bateria.atualizarEstadoPeloCore({ ...e.bateria.getEstadoFisico(), posicaoM: posicao });
    e.conexao.prepararPasso(1 / 240);
    expect(e.conexao.estaRompida).toBe(true);
    expect(e.conexao.fornecerEnergia(10)).toBe(0);
    expect(e.bateria.getEstadoFisico().posicaoM).toEqual(posicao);
  });
  it('faz a mesma transferência total em subpassos equivalentes', () => {
    const a = criar(10, 2); const b = criar(10, 2);
    a.conexao.prepararPasso(1); a.conexao.fornecerEnergia(40);
    for (let i = 0; i < 240; i++) { b.conexao.prepararPasso(1 / 240); b.conexao.fornecerEnergia(40 / 240); }
    expect(a.bateria.energiaArmazenadaJ).toBeCloseTo(b.bateria.energiaArmazenadaJ, 6);
    expect(b.conexao.energiaDissipadaAcumuladaJ).toBeCloseTo(8, 8);
  });
  it('valida parâmetros e bloqueia corrente zero e fonte destruída', () => {
    expect(() => criar(-1)).toThrow(); expect(() => criar(10, Infinity)).toThrow();
    const e = criar(0); e.conexao.prepararPasso(1); expect(e.conexao.fornecerEnergia(1)).toBe(0);
    expect(() => e.conexao.prepararPasso(0)).toThrow();
    expect(() => e.conexao.fornecerEnergia(NaN)).toThrow();
    e.conexao.configurarCorrenteMaxima(10); expect(() => e.conexao.fornecerEnergia(1)).toThrow();
    e.bateria.aplicarDanoPorImpacto(e.bateria.resistenciaColisaoJ * 3);
    e.conexao.prepararPasso(1); expect(e.conexao.fornecerEnergia(1)).toBe(0);
  });
});
