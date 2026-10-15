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

  /** Escritas diretas: `this.idsPropulsores`, `this.ganhoDerivaRadPorMps`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-cce221037c45b500 */
  public configurarAlvos(idsPropulsores: readonly string[], ganhoDerivaRadPorMps = 0.04): void {
    if (!Number.isFinite(ganhoDerivaRadPorMps) || ganhoDerivaRadPorMps < 0) throw new Error('Ganho de deriva inválido.');
    this.idsPropulsores = [...idsPropulsores];
    this.ganhoDerivaRadPorMps = ganhoDerivaRadPorMps;
  }
  /** Dependências diretas: `this.pid.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-c279657ea977122b */
  public habilitar(): void { this.pid.habilitar(); }
  /** Dependências diretas: `this.pid.desabilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-35c76f5f84f7bd4f */
  public desabilitar(): void { this.pid.desabilitar(); }
  /** Devolve `this.pid.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-3fe4661210dd3700 */
  public get estaHabilitado(): boolean { return this.pid.estaHabilitado; }
  /** Dependências diretas: `this.pid.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-9f236997fdeb8504 */
  public reiniciarMemoria(): void { if (this.estaHabilitado) this.pid.habilitar(); }

  /** Dependências diretas: `this.pid.calcularComando`, `this.idsPropulsores.map`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-9c0d1c5d19bd31c5 */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!this.estaHabilitado) return [];
    const erroDeVerticalizacaoRad = leituras.inclinacaoRad - this.ganhoDerivaRadPorMps * leituras.velocidadeHorizontalMps;
    const erroRad = Math.atan2(Math.sin(erroDeVerticalizacaoRad), Math.cos(erroDeVerticalizacaoRad));
    const gimbalRad = this.pid.calcularComando(erroRad, dtS, leituras.velocidadeAngularRadps);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'gimbal' as const, valor: gimbalRad }));
  }
}
