/** Coordena somente a solicitação operacional de modo. Recebe altitude do referencial compartilhado. */
export class ControladorPerfilVooExperimental {
  private transicaoSolicitada = false;
  /** Escritas diretas: `this.altitudeTransicaoM`, `this.automatico`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0c9abac72f8565f4 */
  public constructor(private readonly altitudeTransicaoM: number, private readonly automatico: boolean) {
    if (!Number.isFinite(altitudeTransicaoM) || altitudeTransicaoM <= 0) throw new Error('Altitude de transição inválida.');
  }
  /** Devolve `'pouso'`. Escritas diretas: `this.transicaoSolicitada`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-6d857d6fdafe867a */
  public atualizar(altitudeGeometricaM: number): 'pouso' | undefined {
    if (!Number.isFinite(altitudeGeometricaM)) throw new Error('Altitude observada inválida.');
    if (!this.automatico || this.transicaoSolicitada || altitudeGeometricaM < this.altitudeTransicaoM) return;
    this.transicaoSolicitada = true;
    return 'pouso';
  }
}
