import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorInclinacaoPid } from './ControladorInclinacaoPid';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

/**
 * Gimbal exclusivo de descida: mantém o eixo da nave vertical e reduz deriva
 * lateral usando somente os bocais do conjunto de pouso. Não comanda throttle.
 */
export class ControladorGimbalDescidaDePropulsores implements ControladorDeVoo {
  public readonly id = 'gimbal-descida';
  public readonly prioridade = 90;
  private readonly pid = new ControladorInclinacaoPid(2.5, 0.04, 3, Math.PI / 12);
  private idsPropulsores: readonly string[] = [];
  private ganhoDerivaRadPorMps = 0.04;

  public configurarAlvos(idsPropulsores: readonly string[], ganhoDerivaRadPorMps = 0.04): void {
    if (!Number.isFinite(ganhoDerivaRadPorMps) || ganhoDerivaRadPorMps < 0) throw new Error('Ganho de deriva inválido.');
    this.idsPropulsores = [...idsPropulsores];
    this.ganhoDerivaRadPorMps = ganhoDerivaRadPorMps;
  }
  public habilitar(): void { this.pid.habilitar(); }
  public desabilitar(): void { this.pid.desabilitar(); }
  public get estaHabilitado(): boolean { return this.pid.estaHabilitado; }
  public reiniciarMemoria(): void { if (this.estaHabilitado) this.pid.habilitar(); }

  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!this.estaHabilitado) return [];
    const erroDeVerticalizacaoRad = leituras.inclinacaoRad - this.ganhoDerivaRadPorMps * leituras.velocidadeHorizontalMps;
    const erroRad = Math.atan2(Math.sin(erroDeVerticalizacaoRad), Math.cos(erroDeVerticalizacaoRad));
    const gimbalRad = this.pid.calcularComando(erroRad, dtS, leituras.velocidadeAngularRadps);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'gimbal' as const, valor: gimbalRad }));
  }
}
