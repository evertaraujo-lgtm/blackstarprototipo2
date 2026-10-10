import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorInclinacaoPid } from './ControladorInclinacaoPid';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

/** Adaptador do PID para os propulsores selecionados, sem conhecer o veículo. */
export class ControladorInclinacaoDePropulsores implements ControladorDeVoo {
  public readonly id = 'inclinacao';
  public readonly prioridade = 50;
  private readonly pid = new ControladorInclinacaoPid(2, 0.05, 0.2, Math.PI / 12);
  private idsPropulsores: readonly string[] = [];
  private ganhoAtitudePorVelocidadeHorizontalRadPorMps = 0;
  private ganhoAtitudeHorizontalAtual = 0;

  public configurarAlvos(idsPropulsores: readonly string[]): void { this.idsPropulsores = [...idsPropulsores]; }
  public configurarAmortecimentoHorizontal(ganhoAtitudeRadPorMps: number): void {
    if (!Number.isFinite(ganhoAtitudeRadPorMps) || ganhoAtitudeRadPorMps < 0) {
      throw new Error('Parâmetros inválidos para amortecer velocidade horizontal pelo gimbal.');
    }
    this.ganhoAtitudePorVelocidadeHorizontalRadPorMps = ganhoAtitudeRadPorMps;
    this.ganhoAtitudeHorizontalAtual = 0;
  }
  public desabilitarAmortecimentoHorizontal(): void {
    this.ganhoAtitudePorVelocidadeHorizontalRadPorMps = 0;
    this.ganhoAtitudeHorizontalAtual = 0;
  }
  public habilitar(): void { this.pid.habilitar(); }
  public desabilitar(): void { this.pid.desabilitar(); this.desabilitarAmortecimentoHorizontal(); }
  public get estaHabilitado(): boolean { return this.pid.estaHabilitado; }

  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    const descendo = leituras.velocidadeVerticalMps < 0;
    const ganhoAlvo = descendo ? this.ganhoAtitudePorVelocidadeHorizontalRadPorMps : 0;
    const variacaoGanhoMaxima = dtS * 0.02;
    this.ganhoAtitudeHorizontalAtual += Math.max(-variacaoGanhoMaxima,
      Math.min(variacaoGanhoMaxima, ganhoAlvo - this.ganhoAtitudeHorizontalAtual));
    // vx positivo pede inclinação do casco para +X para apontar o empuxo
    // contra a deriva. O ganho entra gradualmente para evitar um degrau no
    // derivativo do PID ao chavear para pouso.
    const erroComDerivaRad = leituras.inclinacaoRad
      - (descendo ? this.ganhoAtitudeHorizontalAtual * leituras.velocidadeHorizontalMps : 0);
    const gimbalRad = this.pid.calcularComando(erroComDerivaRad, dtS);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'gimbal' as const, valor: gimbalRad }));
  }
}
