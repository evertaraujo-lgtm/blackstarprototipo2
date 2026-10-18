import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';
import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';

/** Porta futura de aproximação. Não contém propulsão ou trajetória programada. */
export class ControladorAproximacao implements ControladorDeVoo {
  public readonly id = 'aproximacao';
  public readonly prioridade = 85;
  private habilitado = false;
  /** Seleciona protótipo sem autorizar atuação física.  @contract f-534188cc7979d4c8 */
  public habilitar(): void { this.habilitado = true; }
  /** Retira o protótipo da seleção.  @contract f-6bfef8a77e42e997 */
  public desabilitar(): void { this.habilitado = false; }
  /** Consulta seleção, distinta de prontidão operacional.  @contract f-e51247b354a8b769 */
  public get estaHabilitado(): boolean { return this.habilitado; }
  /** Valida dt SI e retorna ausência de solicitações em todos os estados.
   * Instalar esta classe não torna a integração propulsiva compatível.
   * @contract f-11a58d8d31bdebcd
   */
  public calcularSolicitacoes(_leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!Number.isFinite(dtS) || dtS <= 0 || dtS > 1 / 60) throw new Error('dt de aproximação inválido.');
    return [];
  }
}
