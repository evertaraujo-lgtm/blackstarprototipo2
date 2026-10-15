import { Vetor3 } from './Vetor3';

/** Material e contrato de geometria de uma superfície estática no plano XY. */
export abstract class SuperficieFisica {
  private integridade = 1;
  private temperaturaAtualC: number;
  private energiaTermicaDeAtritoJ = 0;

  /** Escritas diretas: `this.id`, `this.tipoMaterial`, `this.resistenciaColisaoJ`, `this.dissipacaoImpacto`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-de0f9204a43fbad4 */
  public constructor(
    public readonly id: string,
    public readonly tipoMaterial: 'areia' | 'agua' | 'terra' | 'concreto' | 'aco' | 'outro',
    public readonly resistenciaColisaoJ: number,
    /** Fração de energia dissipada pelo material da superfície (0 a < 1). */
    public readonly dissipacaoImpacto = 0.15,
    /** Coeficiente de atrito dinâmico da superfície (0 a 1). */
    public readonly coeficienteAtritoDinamico = 0.65,
    /** Temperatura inicial da massa térmica da superfície, em °C. */
    temperaturaInicialC = 20,
    /** Capacidade térmica concentrada da região de contato, em J/°C. */
    public readonly capacidadeTermicaJPorC = 1_000_000,
  ) {
    if (!id || resistenciaColisaoJ <= 0 || !Number.isFinite(dissipacaoImpacto) || dissipacaoImpacto < 0 || dissipacaoImpacto >= 1 || !Number.isFinite(coeficienteAtritoDinamico) || coeficienteAtritoDinamico < 0 || coeficienteAtritoDinamico > 1 || !Number.isFinite(temperaturaInicialC) || !Number.isFinite(capacidadeTermicaJPorC) || capacidadeTermicaJPorC <= 0) {
      throw new Error('Definição de superfície inválida.');
    }
    this.temperaturaAtualC = temperaturaInicialC;
  }

  public abstract distanciaAssinadaM(pontoM: Vetor3): number;
  public abstract normalEm(pontoM: Vetor3): Vetor3;
  public abstract projetar(pontoM: Vetor3): Vetor3;
  /** Devolve `true`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0b83791d53142aaf */
  public contemProjecao(_pontoM: Vetor3): boolean { return true; }
  /** Devolve `Vetor3.zero`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-4c317235a33e5226 */
  public velocidadeNoPonto(_pontoM: Vetor3): Vetor3 { return Vetor3.zero; }
  /** Devolve `pontos`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-5d9e830dffef3966 */
  public candidatosContato(pontos: readonly Vetor3[]): readonly Vetor3[] { return pontos; }

  /** Devolve `this.integridade`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-41e1ec354f9dfa4b */
  public get integridadeEstrutural(): number { return this.integridade; }
  /** Devolve `this.temperaturaAtualC`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-6431b37fd60040ec */
  public get temperaturaC(): number { return this.temperaturaAtualC; }
  /** Devolve `this.energiaTermicaDeAtritoJ`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-2e6fb278c91dd910 */
  public get energiaTermicaDeAtritoAcumuladaJ(): number { return this.energiaTermicaDeAtritoJ; }

  /** Escritas diretas: `this.integridade`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-27173dfe139bb15d */
  public aplicarDanoPorImpacto(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de impacto inválida.');
    if (energiaJ <= this.resistenciaColisaoJ) return;
    this.integridade = Math.max(0, this.integridade - ((energiaJ - this.resistenciaColisaoJ) / this.resistenciaColisaoJ));
  }

  /** Recebe a parcela de energia dissipada no par objeto–superfície.
   * @contract f-0117439d53534cc6
   */
  public aplicarCalorDeAtritoPeloCore(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de atrito inválida.');
    this.energiaTermicaDeAtritoJ += energiaJ;
    this.temperaturaAtualC += energiaJ / this.capacidadeTermicaJPorC;
  }
}
