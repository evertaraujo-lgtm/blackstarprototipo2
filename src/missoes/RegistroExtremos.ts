import { copiarSnapshot } from './SnapshotMissao';

export interface ExtremoTemporal { readonly valor: number; readonly passo: number; readonly tempoS: number }
export interface FaixaTemporal { readonly minimo: ExtremoTemporal; readonly maximo: ExtremoTemporal }

/** Redução online por passo físico: memória O(canais), sem armazenar trajetória
 * paralela. Um intervalo fechado acompanha a amostra do diário; globais preservam
 * extremos mesmo se a janela de amostras antigas for descartada explicitamente.
 */
export class RegistroExtremos {
  private readonly globais: Record<string, FaixaTemporal> = {};
  private atual: Record<string, FaixaTemporal> = {};
  private ultimoIntervalo: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal> } | null = null;
  private inicioPasso = 0;
  private ultimoPasso = -1;

  /** Recebe intervalo inteiro positivo em passos; não depende do relógio real.  @contract f-a127d9dc71e4e4e5 */
  public constructor(private readonly intervaloPassos: number) {
    if (!Number.isSafeInteger(intervaloPassos) || intervaloPassos < 1) throw new Error('Intervalo de extremos inválido.');
  }

  /** Registra valores SI finitos no índice/tempo efetivos. Empates preservam o
   * primeiro instante. A resolução é do passo integrado, não interpolação contínua.
   * @contract f-924d20c3c048dff6
   */
  public registrar(valores: Readonly<Record<string, number>>, passo: number, tempoS: number): void {
    if (!Number.isSafeInteger(passo) || passo <= this.ultimoPasso || !Number.isFinite(tempoS) || tempoS < 0) throw new Error('Ordem temporal dos extremos inválida.');
    for (const [canal, valor] of Object.entries(valores)) {
      if (!Number.isFinite(valor)) throw new Error(`Extremo não finito: ${canal}`);
      const novo = { valor, passo, tempoS };
      for (const tabela of [this.globais, this.atual]) {
        const antigo = tabela[canal];
        tabela[canal] = { minimo: !antigo || valor < antigo.minimo.valor ? novo : antigo.minimo,
          maximo: !antigo || valor > antigo.maximo.valor ? novo : antigo.maximo };
      }
    }
    this.ultimoPasso = passo;
    if (passo > 0 && passo % this.intervaloPassos === 0) {
      this.ultimoIntervalo = { inicioPasso: this.inicioPasso, fimPasso: passo, extremos: this.atual };
      this.atual = {}; this.inicioPasso = passo + 1;
    }
  }

  /** Copia resumo global, intervalo em curso e último fechado; sem histórico O(t).
   * Cada amostra do diário carrega seu intervalo e a frequência consta da receita.
   * @contract f-06f593710de6734b
   */
  public observar() {
    return copiarSnapshot({ globais: this.globais, intervaloAtual: { inicioPasso: this.inicioPasso,
      fimPasso: this.ultimoPasso, extremos: this.atual }, ultimoIntervalo: this.ultimoIntervalo });
  }
}
