import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorDesaceleracao, type ConfiguracaoControleDesaceleracao } from './ControladorDesaceleracao';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

export class ControladorDesaceleracaoDePropulsores implements ControladorDeVoo {
  public readonly id = 'desaceleracao';
  public readonly prioridade = 75;
  private controlador = new ControladorDesaceleracao();
  private idsPropulsores: readonly string[] = [];
  /** Substitui controlador de desaceleração pela nova configuração e copia ids dos motores; memória anterior não é preservada. @contract f-c21cd42fd0b7de7c @reviewed M12-DOC: implementação lida. */
  public configurar(configuracao: Partial<ConfiguracaoControleDesaceleracao>, ids: readonly string[]): void {
    this.controlador = new ControladorDesaceleracao(configuracao); this.idsPropulsores = [...ids];
  }
  /** Habilita o controlador interno reiniciando sua memória; não comanda ignição. @contract f-c4755790234ed284 @reviewed M12-DOC: implementação lida. */
  public habilitar(): void { this.controlador.habilitar(); }
  /** Desabilita o controlador interno e reinicia sua memória. @contract f-9dbf2fa8a94bb9c4 @reviewed M12-DOC: implementação lida. */
  public desabilitar(): void { this.controlador.desabilitar(); }
  /** Devolve `this.controlador.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-68dbf0dd4ff13c6c */
  public get estaHabilitado(): boolean { return this.controlador.estaHabilitado; }
  /** Traduz resultado do PID em solicitações de throttle para os ids configurados; comando inativo produz pedido explícito zero. Arbitragem e aplicação ficam no computador de voo. @contract f-7993336ec0721f53 @reviewed M12-DOC: implementação lida. */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    const comando = this.controlador.calcularComando(leituras, dtS);
    return this.idsPropulsores.map((idAtuador) => ({
      idAtuador,
      recurso: 'throttle' as const,
      valor: comando.ativo ? comando.throttle : 0,
    }));
  }
}
