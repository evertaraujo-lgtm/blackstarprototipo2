/** Coordena somente a solicitação operacional de modo. Recebe altitude do referencial compartilhado. */
export class ControladorPerfilVooExperimental {
  private transicaoSolicitada = false;
  /** Armazena altitude de transição positiva finita em m; não configura lançador nem piloto orbital. @contract f-0c9abac72f8565f4 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly altitudeTransicaoM: number, private readonly automatico: boolean) {
    if (!Number.isFinite(altitudeTransicaoM) || altitudeTransicaoM <= 0) throw new Error('Altitude de transição inválida.');
  }
  /** Valida altitude geométrica e em modo automático emite pouso uma única vez ao alcançar limiar. Marca transição solicitada; evento operacional não altera estado físico. @contract f-6d857d6fdafe867a @reviewed M12-DOC: implementação lida. */
  public atualizar(altitudeGeometricaM: number): 'pouso' | undefined {
    if (!Number.isFinite(altitudeGeometricaM)) throw new Error('Altitude observada inválida.');
    if (!this.automatico || this.transicaoSolicitada || altitudeGeometricaM < this.altitudeTransicaoM) return;
    this.transicaoSolicitada = true;
    return 'pouso';
  }
}
