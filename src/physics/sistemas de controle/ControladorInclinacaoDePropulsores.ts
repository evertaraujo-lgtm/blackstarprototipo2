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

  /** Escritas diretas: `this.idsPropulsores`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-072ca5129fc83639 */
  public configurarAlvos(idsPropulsores: readonly string[]): void { this.idsPropulsores = [...idsPropulsores]; }
  /** Escritas diretas: `this.ganhoAtitudePorVelocidadeHorizontalRadPorMps`, `this.ganhoAtitudeHorizontalAtual`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-11f93b7258dcb4d2 */
  public configurarAmortecimentoHorizontal(ganhoAtitudeRadPorMps: number): void {
    if (!Number.isFinite(ganhoAtitudeRadPorMps) || ganhoAtitudeRadPorMps < 0) {
      throw new Error('Parâmetros inválidos para amortecer velocidade horizontal pelo gimbal.');
    }
    this.ganhoAtitudePorVelocidadeHorizontalRadPorMps = ganhoAtitudeRadPorMps;
    this.ganhoAtitudeHorizontalAtual = 0;
  }
  /** Escritas diretas: `this.ganhoAtitudePorVelocidadeHorizontalRadPorMps`, `this.ganhoAtitudeHorizontalAtual`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b9a4b283f07fe632 */
  public desabilitarAmortecimentoHorizontal(): void {
    this.ganhoAtitudePorVelocidadeHorizontalRadPorMps = 0;
    this.ganhoAtitudeHorizontalAtual = 0;
  }
  /** Dependências diretas: `this.pid.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-abfba32141fc1536 */
  public habilitar(): void { this.pid.habilitar(); }
  /** Dependências diretas: `this.pid.desabilitar`, `this.desabilitarAmortecimentoHorizontal`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-589f4957014d754d */
  public desabilitar(): void { this.pid.desabilitar(); this.desabilitarAmortecimentoHorizontal(); }
  /** Devolve `this.pid.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-fa83f1a20c6c8201 */
  public get estaHabilitado(): boolean { return this.pid.estaHabilitado; }
  /** Dependências diretas: `this.pid.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-4435f8deac06cd35 */
  public reiniciarMemoria(): void { if (this.estaHabilitado) this.pid.habilitar(); }

  /** Escritas diretas: `this.ganhoAtitudeHorizontalAtual`. Dependências diretas: `this.pid.calcularComando`, `this.idsPropulsores.map`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-fea52c1c911aa39c */
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
