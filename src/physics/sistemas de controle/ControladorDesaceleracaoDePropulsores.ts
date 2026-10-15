import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorDesaceleracao, type ConfiguracaoControleDesaceleracao } from './ControladorDesaceleracao';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

export class ControladorDesaceleracaoDePropulsores implements ControladorDeVoo {
  public readonly id = 'desaceleracao';
  public readonly prioridade = 75;
  private controlador = new ControladorDesaceleracao();
  private idsPropulsores: readonly string[] = [];
  /** Escritas diretas: `this.controlador`, `this.idsPropulsores`. Dependências diretas: `ControladorDesaceleracao`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-c21cd42fd0b7de7c */
  public configurar(configuracao: Partial<ConfiguracaoControleDesaceleracao>, ids: readonly string[]): void {
    this.controlador = new ControladorDesaceleracao(configuracao); this.idsPropulsores = [...ids];
  }
  /** Dependências diretas: `this.controlador.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-c4755790234ed284 */
  public habilitar(): void { this.controlador.habilitar(); }
  /** Dependências diretas: `this.controlador.desabilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-9dbf2fa8a94bb9c4 */
  public desabilitar(): void { this.controlador.desabilitar(); }
  /** Devolve `this.controlador.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-68dbf0dd4ff13c6c */
  public get estaHabilitado(): boolean { return this.controlador.estaHabilitado; }
  /** Devolve `this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'throttle' as const, valor: comando.ativo ? comando.throttle : 0, }))`. Dependências diretas: `this.controlador.calcularComando`, `this.idsPropulsores.map`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-7993336ec0721f53 */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    const comando = this.controlador.calcularComando(leituras, dtS);
    return this.idsPropulsores.map((idAtuador) => ({
      idAtuador,
      recurso: 'throttle' as const,
      valor: comando.ativo ? comando.throttle : 0,
    }));
  }
}
