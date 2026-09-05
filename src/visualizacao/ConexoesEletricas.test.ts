import { describe, expect, it, vi } from 'vitest';
import { criarEnsaioPortaVertical } from '../physics/cenarios/EnsaioPortaVertical';
import { Vetor3 } from '../physics/Vetor3';
import { conexoesEletricasExpostas, desenharConexoesEletricas, terminalEletricoM, type ConexaoEletricaVisual } from './ConexoesEletricas';

function contextoDeTeste() {
  return { fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), fillText: vi.fn(), setLineDash: vi.fn() };
}

describe('Conexões elétricas de fontes expostas', () => {
  it.each(['energizada', 'desligada', 'rompida'] as const)('mantém cabos renderizados no estado %s, sem alterar energia ou movimento', (estado) => {
    const e = criarEnsaioPortaVertical();
    const conexao: ConexaoEletricaVisual = e.conexaoEletrica;
    if (estado === 'energizada') conexao.fecharInterruptor();
    if (estado === 'rompida') conexao.romper();
    const contexto = contextoDeTeste();
    const estadoInicial = e.bateria.getEstadoFisico();
    const energiaInicial = e.bateria.energiaArmazenadaJ;
    desenharConexoesEletricas(contexto as unknown as CanvasRenderingContext2D, [conexao], e.objetos, (p) => ({ x: p.x * 60, y: -p.y * 60 }));
    expect(contexto.stroke).toHaveBeenCalled();
    expect(contexto.fillText).toHaveBeenCalledWith(estado === 'energizada' ? 'ALIMENTAÇÃO ON' : estado === 'desligada' ? 'ALIMENTAÇÃO OFF' : 'CABO ROMPIDO', expect.any(Number), expect.any(Number));
    expect(e.bateria.getEstadoFisico()).toEqual(estadoInicial);
    expect(e.bateria.energiaArmazenadaJ).toBe(energiaInicial);
  });
  it('oculta os cabos internos de uma fonte enclausurada sem removê-la da simulação', () => {
    const e = criarEnsaioPortaVertical();
    const conexao: ConexaoEletricaVisual = e.conexaoEletrica;
    const visiveis = e.objetos.filter((objeto) => objeto !== e.bateria);
    const contexto = contextoDeTeste();
    expect(conexoesEletricasExpostas([conexao], visiveis)).toEqual([]);
    desenharConexoesEletricas(contexto as unknown as CanvasRenderingContext2D, [conexao], visiveis, (p) => p);
    expect(contexto.stroke).not.toHaveBeenCalled();
    e.porta.ligarAlimentacao(); e.porta.ligarControle(); e.porta.abrir(); e.mundo.avancar(0.1);
    expect(e.bateria.energiaConsumidaJ).toBeGreaterThan(0);
    expect(e.porta.getEstadoFisico().velocidadeMps.y).toBeGreaterThan(0);
  });
  it('ancora o terminal na face real ao transladar e girar o corpo', () => {
    const e = criarEnsaioPortaVertical();
    expect(terminalEletricoM(e.bateria)).toEqual(new Vetor3(-2.75, 0.25, 0));
    e.bateria.atualizarEstadoPeloCore({ ...e.bateria.getEstadoFisico(), posicaoM: new Vetor3(3, 4, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) });
    const terminal = terminalEletricoM(e.bateria);
    expect(terminal.x).toBeCloseTo(3, 10);
    expect(terminal.y).toBeCloseTo(3.75, 10);
  });
});
