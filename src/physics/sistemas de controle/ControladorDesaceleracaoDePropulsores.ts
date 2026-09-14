import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorDesaceleracao, type ConfiguracaoControleDesaceleracao } from './ControladorDesaceleracao';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

export class ControladorDesaceleracaoDePropulsores implements ControladorDeVoo {
  public readonly id = 'desaceleracao';
  public readonly prioridade = 75;
  private controlador = new ControladorDesaceleracao();
  private idsPropulsores: readonly string[] = [];
  public configurar(configuracao: Partial<ConfiguracaoControleDesaceleracao>, ids: readonly string[]): void {
    this.controlador = new ControladorDesaceleracao(configuracao); this.idsPropulsores = [...ids];
  }
  public habilitar(): void { this.controlador.habilitar(); }
  public desabilitar(): void { this.controlador.desabilitar(); }
  public get estaHabilitado(): boolean { return this.controlador.estaHabilitado; }
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    const comando = this.controlador.calcularComando(leituras, dtS);
    return comando.ativo ? this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'throttle' as const, valor: comando.throttle })) : [];
  }
}
