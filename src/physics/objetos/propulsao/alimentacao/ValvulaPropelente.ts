export interface DefinicaoValvulaPropelente { readonly id: string; readonly vazaoMaximaKgS: number; }

/** Válvula de fluxo proporcional; a abertura efetiva limita a vazão da linha. */
export class ValvulaPropelente {
  private aberturaAtual = 0;
  /** Escritas diretas: `this.definicao`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-8ee9a0cb7c08bc7e */
  public constructor(private readonly definicao: DefinicaoValvulaPropelente) {
    if (!definicao.id || !Number.isFinite(definicao.vazaoMaximaKgS) || definicao.vazaoMaximaKgS <= 0) throw new Error('Definição de válvula inválida.');
  }
  /** Devolve `this.aberturaAtual`. Efeitos indiretos seguem as dependências chamadas. @contract f-49e6ce0f9aa07c8f */
  public get abertura(): number { return this.aberturaAtual; }
  /** Escritas diretas: `this.aberturaAtual`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-d7d19be5363ce423 */
  public definirAbertura(abertura: number): void {
    if (!Number.isFinite(abertura) || abertura < 0 || abertura > 1) throw new Error('Abertura da válvula deve estar entre 0 e 1.');
    this.aberturaAtual = abertura;
  }
  /** Devolve `this.definicao.vazaoMaximaKgS * this.aberturaAtual`. Efeitos indiretos seguem as dependências chamadas. @contract f-bae681c5c17d6414 */
  public obterVazaoMaximaKgS(): number { return this.definicao.vazaoMaximaKgS * this.aberturaAtual; }
}
