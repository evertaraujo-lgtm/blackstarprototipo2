/** Superfície física horizontal; não é um Objeto da cena. */
export class SuperficiePlano {
  private integridade = 1;
  private temperaturaAtualC: number;
  private energiaTermicaDeAtritoJ = 0;

  public constructor(
    public readonly id: string,
    public readonly tipoMaterial: 'areia' | 'agua' | 'terra' | 'concreto' | 'outro',
    public readonly alturaM: number,
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
    if (!id || !Number.isFinite(alturaM) || resistenciaColisaoJ <= 0 || !Number.isFinite(dissipacaoImpacto) || dissipacaoImpacto < 0 || dissipacaoImpacto >= 1 || !Number.isFinite(coeficienteAtritoDinamico) || coeficienteAtritoDinamico < 0 || coeficienteAtritoDinamico > 1 || !Number.isFinite(temperaturaInicialC) || !Number.isFinite(capacidadeTermicaJPorC) || capacidadeTermicaJPorC <= 0) {
      throw new Error('Definição de superfície inválida.');
    }
    this.temperaturaAtualC = temperaturaInicialC;
  }

  public get integridadeEstrutural(): number { return this.integridade; }
  public get temperaturaC(): number { return this.temperaturaAtualC; }
  public get energiaTermicaDeAtritoAcumuladaJ(): number { return this.energiaTermicaDeAtritoJ; }

  public aplicarDanoPorImpacto(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de impacto inválida.');
    if (energiaJ <= this.resistenciaColisaoJ) return;
    this.integridade = Math.max(0, this.integridade - ((energiaJ - this.resistenciaColisaoJ) / this.resistenciaColisaoJ));
  }

  /** Recebe a parcela de energia dissipada no par objeto–superfície. */
  public aplicarCalorDeAtritoPeloCore(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de atrito inválida.');
    this.energiaTermicaDeAtritoJ += energiaJ;
    this.temperaturaAtualC += energiaJ / this.capacidadeTermicaJPorC;
  }
}
