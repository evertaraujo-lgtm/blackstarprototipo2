import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorInclinacaoPid } from './ControladorInclinacaoPid';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

/** Adaptador do PID para os propulsores selecionados, sem conhecer o veículo. */
export class ControladorInclinacaoDePropulsores implements ControladorDeVoo {
  public readonly id = 'inclinacao';
  public readonly prioridade = 50;
  private readonly pid = new ControladorInclinacaoPid(2, 0.05, 0.2, Math.PI / 12);
  private idsPropulsores: readonly string[] = [];

  public configurarAlvos(idsPropulsores: readonly string[]): void { this.idsPropulsores = [...idsPropulsores]; }
  public habilitar(): void { this.pid.habilitar(); }
  public desabilitar(): void { this.pid.desabilitar(); }
  public get estaHabilitado(): boolean { return this.pid.estaHabilitado; }

  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    const gimbalRad = this.pid.calcularComando(leituras.inclinacaoRad, dtS);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'gimbal' as const, valor: gimbalRad }));
  }
}
