export interface DefinicaoValvulaPropelente { readonly id: string; readonly vazaoMaximaKgS: number; }

/** Válvula de fluxo proporcional; a abertura efetiva limita a vazão da linha. */
export class ValvulaPropelente {
  private aberturaAtual = 0;
  /** Valida identidade e vazão máxima positiva finita em kg/s; não consome tanque nem produz pressão. @contract f-8ee9a0cb7c08bc7e @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoValvulaPropelente) {
    if (!definicao.id || !Number.isFinite(definicao.vazaoMaximaKgS) || definicao.vazaoMaximaKgS <= 0) throw new Error('Definição de válvula inválida.');
  }
  /** Devolve `this.aberturaAtual`. Efeitos indiretos seguem as dependências chamadas. @contract f-49e6ce0f9aa07c8f */
  public get abertura(): number { return this.aberturaAtual; }
  /** Armazena fração de abertura finita em [0,1]; vazão efetiva será limitada pela linha/bomba. @contract f-d7d19be5363ce423 @reviewed M12-DOC: implementação lida. */
  public definirAbertura(abertura: number): void {
    if (!Number.isFinite(abertura) || abertura < 0 || abertura > 1) throw new Error('Abertura da válvula deve estar entre 0 e 1.');
    this.aberturaAtual = abertura;
  }
  /** Devolve `this.definicao.vazaoMaximaKgS * this.aberturaAtual`. Efeitos indiretos seguem as dependências chamadas. @contract f-bae681c5c17d6414 */
  public obterVazaoMaximaKgS(): number { return this.definicao.vazaoMaximaKgS * this.aberturaAtual; }
}
