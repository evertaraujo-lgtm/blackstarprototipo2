import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorPouso, type ComandoControlePouso, type ConfiguracaoControlePouso } from './ControladorPouso';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

/** Adaptador do controle de pouso para um conjunto de propulsores. */
export class ControladorPousoDePropulsores implements ControladorDeVoo {
  public readonly id = 'pouso';
  public readonly prioridade = 100;
  private controlador = new ControladorPouso();
  private idsPropulsores: readonly string[] = [];

  /** Escritas diretas: `this.controlador`, `this.idsPropulsores`. Dependências diretas: `ControladorPouso`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-23b3b270943a05e3 */
  public configurar(configuracao: Partial<ConfiguracaoControlePouso>, idsPropulsores: readonly string[]): void {
    this.controlador = new ControladorPouso(configuracao);
    this.idsPropulsores = [...idsPropulsores];
  }
  /** Dependências diretas: `this.controlador.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-4d8e72630fd9eba7 */
  public habilitar(): void { this.controlador.habilitar(); }
  /** Dependências diretas: `this.controlador.desabilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-4f5bebc938d844e4 */
  public desabilitar(): void { this.controlador.desabilitar(); }
  /** Devolve `this.controlador.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-81eaf6ec49059906 */
  public get estaHabilitado(): boolean { return this.controlador.estaHabilitado; }
  /** Devolve `this.controlador.obterUltimoComando()`. Dependências diretas: `this.controlador.obterUltimoComando`. Efeitos indiretos seguem as dependências chamadas. @contract f-ce1c2b94d71bfea5 */
  public obterUltimoComando(): ComandoControlePouso { return this.controlador.obterUltimoComando(); }

  /** Dependências diretas: `this.controlador.calcularComando`, `this.idsPropulsores.flatMap`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-8c8042bab45e6519 */
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
