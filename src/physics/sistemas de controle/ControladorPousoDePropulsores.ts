import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorPouso, type ComandoControlePouso, type ConfiguracaoControlePouso } from './ControladorPouso';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

/** Adaptador do controle de pouso para um conjunto de propulsores. */
export class ControladorPousoDePropulsores implements ControladorDeVoo {
  public readonly id = 'pouso';
  public readonly prioridade = 100;
  private controlador = new ControladorPouso();
  private idsPropulsores: readonly string[] = [];

  public configurar(configuracao: Partial<ConfiguracaoControlePouso>, idsPropulsores: readonly string[]): void {
    this.controlador = new ControladorPouso(configuracao);
    this.idsPropulsores = [...idsPropulsores];
  }
  public habilitar(): void { this.controlador.habilitar(); }
  public desabilitar(): void { this.controlador.desabilitar(); }
  public get estaHabilitado(): boolean { return this.controlador.estaHabilitado; }
  public obterUltimoComando(): ComandoControlePouso { return this.controlador.obterUltimoComando(); }

  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    const comando = this.controlador.calcularComando(leituras, dtS);
    if (comando.fase === 'inativo' || comando.fase === 'falha-de-sensores') return [];
    return this.idsPropulsores.flatMap((idAtuador) => [
      { idAtuador, recurso: 'throttle' as const, valor: comando.throttle },
      ...(this.controlador.configuracao.controlarGimbal
        ? [{ idAtuador, recurso: 'gimbal' as const, valor: comando.anguloGimbalRad }]
        : []),
    ]);
  }
}
