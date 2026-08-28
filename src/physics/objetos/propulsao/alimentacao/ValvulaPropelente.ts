export interface DefinicaoValvulaPropelente { readonly id: string; readonly vazaoMaximaKgS: number; }

/** Válvula de fluxo proporcional; a abertura efetiva limita a vazão da linha. */
export class ValvulaPropelente {
  private aberturaAtual = 0;
  public constructor(private readonly definicao: DefinicaoValvulaPropelente) {
    if (!definicao.id || !Number.isFinite(definicao.vazaoMaximaKgS) || definicao.vazaoMaximaKgS <= 0) throw new Error('Definição de válvula inválida.');
  }
  public get abertura(): number { return this.aberturaAtual; }
  public definirAbertura(abertura: number): void {
    if (!Number.isFinite(abertura) || abertura < 0 || abertura > 1) throw new Error('Abertura da válvula deve estar entre 0 e 1.');
    this.aberturaAtual = abertura;
  }
  public obterVazaoMaximaKgS(): number { return this.definicao.vazaoMaximaKgS * this.aberturaAtual; }
}
