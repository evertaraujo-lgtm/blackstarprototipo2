export interface EntradaEnsaioBancada {
  readonly passo: number;
  readonly acao: string;
  readonly valor?: string | number | boolean;
}

/** Diário completo de entradas, independente da janela circular de sinais do trace. */
export class RegistroEnsaioBancada {
  private passos = 0;
  private readonly entradas: EntradaEnsaioBancada[] = [];
  private readonly configuracaoJson: string;

  public constructor(private readonly dtS: number, configuracao: unknown) {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt do ensaio deve ser positivo em s.');
    this.configuracaoJson = JSON.stringify(configuracao);
  }

  /** Chamado somente após um passo físico concluído. */
  public registrarPasso(dtS: number): void {
    if (dtS !== this.dtS) throw new Error('O ensaio requer passos físicos fixos.');
    this.passos += 1;
  }

  /** A entrada é aplicada antes do próximo passo; ordem de chamadas preservada. */
  public registrarEntrada(acao: string, valor?: EntradaEnsaioBancada['valor']): void {
    if (!acao || (typeof valor === 'number' && !Number.isFinite(valor))) throw new Error('Entrada de ensaio inválida.');
    this.entradas.push({ passo: this.passos, acao, valor });
  }

  public exportar() {
    return {
      versao: 1,
      dtS: this.dtS,
      passosExecutados: this.passos,
      configuracao: JSON.parse(this.configuracaoJson) as unknown,
      entradas: this.entradas.map((entrada) => ({ ...entrada })),
      reproducao: 'Recriar a configuração inicial no modelo físico e constantes registrados, na mesma revisão do código; aplicar entradas em ordem antes do passo indicado; avançar exatamente dtS por passosExecutados. Sem aleatoriedade nos cenários BSS atuais.',
    };
  }
}
