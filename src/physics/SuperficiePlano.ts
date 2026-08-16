/** Superfície física horizontal; não é um Objeto da cena. */
export class SuperficiePlano {
  private integridade = 1;

  public constructor(
    public readonly id: string,
    public readonly tipoMaterial: 'areia' | 'agua' | 'terra' | 'concreto' | 'outro',
    public readonly alturaM: number,
    public readonly resistenciaColisaoJ: number,
    /** Fração de energia dissipada pelo material da superfície (0 a < 1). */
    public readonly dissipacaoImpacto = 0.15,
    /** Coeficiente de atrito dinâmico da superfície (0 a 1). */
    public readonly coeficienteAtritoDinamico = 0.65,
  ) {
    if (!id || !Number.isFinite(alturaM) || resistenciaColisaoJ <= 0 || !Number.isFinite(dissipacaoImpacto) || dissipacaoImpacto < 0 || dissipacaoImpacto >= 1 || !Number.isFinite(coeficienteAtritoDinamico) || coeficienteAtritoDinamico < 0 || coeficienteAtritoDinamico > 1) {
      throw new Error('Definição de superfície inválida.');
    }
  }

  public get integridadeEstrutural(): number { return this.integridade; }

  public aplicarDanoPorImpacto(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de impacto inválida.');
    if (energiaJ <= this.resistenciaColisaoJ) return;
    this.integridade = Math.max(0, this.integridade - ((energiaJ - this.resistenciaColisaoJ) / this.resistenciaColisaoJ));
  }
}
