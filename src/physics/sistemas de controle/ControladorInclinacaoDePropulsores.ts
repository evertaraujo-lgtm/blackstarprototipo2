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
  public reiniciarMemoria(): void { if (this.estaHabilitado) this.pid.habilitar(); }

  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!this.estaHabilitado) return [];
    const descendo = leituras.velocidadeVerticalMps < 0;
    const ganhoAlvo = descendo ? this.ganhoAtitudePorVelocidadeHorizontalRadPorMps : 0;
    const variacaoGanhoMaxima = dtS * 0.02;
    this.ganhoAtitudeHorizontalAtual += Math.max(-variacaoGanhoMaxima,
      Math.min(variacaoGanhoMaxima, ganhoAlvo - this.ganhoAtitudeHorizontalAtual));
    // vx positivo pede atitude positiva (topo para -X, empuxo para -X).
    // O ganho entra gradualmente ao chavear para pouso.
    const erroComDerivaRad = leituras.inclinacaoRad
      - (descendo ? this.ganhoAtitudeHorizontalAtual * leituras.velocidadeHorizontalMps : 0);
    const erroRad = Math.atan2(Math.sin(erroComDerivaRad), Math.cos(erroComDerivaRad));
    const gimbalRad = this.pid.calcularComando(erroRad, dtS, leituras.velocidadeAngularRadps);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'gimbal' as const, valor: gimbalRad }));
  }
}
