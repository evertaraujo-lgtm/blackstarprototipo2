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

  /** Copia ids e valida ganho de deriva finito não negativo em rad/(m/s); não aplica gimbal. @contract f-cce221037c45b500 @reviewed M12-DOC: implementação lida. */
  public configurarAlvos(idsPropulsores: readonly string[], ganhoDerivaRadPorMps = 0.04): void {
    if (!Number.isFinite(ganhoDerivaRadPorMps) || ganhoDerivaRadPorMps < 0) throw new Error('Ganho de deriva inválido.');
    this.idsPropulsores = [...idsPropulsores];
    this.ganhoDerivaRadPorMps = ganhoDerivaRadPorMps;
  }
  /** Habilita PID de atitude e reinicia sua memória pelo contrato do PID. @contract f-c279657ea977122b @reviewed M12-DOC: implementação lida. */
  public habilitar(): void { this.pid.habilitar(); }
  /** Desabilita PID sem alterar diretamente atuadores. @contract f-35c76f5f84f7bd4f @reviewed M12-DOC: implementação lida. */
  public desabilitar(): void { this.pid.desabilitar(); }
  /** Devolve `this.pid.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-3fe4661210dd3700 */
  public get estaHabilitado(): boolean { return this.pid.estaHabilitado; }
  /** Reinicia PID somente se já habilitado, preservando seleção operacional. @contract f-9f236997fdeb8504 @reviewed M12-DOC: implementação lida. */
  public reiniciarMemoria(): void { if (this.estaHabilitado) this.pid.habilitar(); }

  /** Se habilitado, normaliza erro de inclinação menos ganho vezes velocidade horizontal para [-π,π] e calcula gimbal PID usando taxa angular. Retorna solicitações para arbitragem; leituras SI/referência local devem ser fornecidas pelo serviço compartilhado. @contract f-9c0d1c5d19bd31c5 @reviewed M12-DOC: implementação lida. */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!this.estaHabilitado) return [];
    const erroDeVerticalizacaoRad = leituras.inclinacaoRad - this.ganhoDerivaRadPorMps * leituras.velocidadeHorizontalMps;
    const erroRad = Math.atan2(Math.sin(erroDeVerticalizacaoRad), Math.cos(erroDeVerticalizacaoRad));
    const gimbalRad = this.pid.calcularComando(erroRad, dtS, leituras.velocidadeAngularRadps);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'gimbal' as const, valor: gimbalRad }));
  }
}
