/** Coordena somente a solicitação operacional de modo. Recebe altitude do referencial compartilhado. */
export class ControladorPerfilVooExperimental {
  private transicaoSolicitada = false;
  public constructor(private readonly altitudeTransicaoM: number, private readonly automatico: boolean) {
    if (!Number.isFinite(altitudeTransicaoM) || altitudeTransicaoM <= 0) throw new Error('Altitude de transição inválida.');
  }
  public atualizar(altitudeGeometricaM: number): 'pouso' | undefined {
    if (!Number.isFinite(altitudeGeometricaM)) throw new Error('Altitude observada inválida.');
    if (!this.automatico || this.transicaoSolicitada || altitudeGeometricaM < this.altitudeTransicaoM) return;
    this.transicaoSolicitada = true;
    return 'pouso';
  }
}
