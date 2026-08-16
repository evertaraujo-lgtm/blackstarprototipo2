export interface DefinicaoParaquedas {
  readonly id: string;
  /** Área frontal adicional quando aberto, em m². */
  readonly areaFrontalM2: number;
}

/** Snapshot de leitura; não expõe o componente mutável. */
export interface EstadoParaquedas {
  readonly id: string;
  readonly massaKg: number;
  readonly areaFrontalM2: number;
  readonly coeficienteArrasto: number;
  readonly resistenciaTracaoN: number;
  readonly integridadeEstrutural: number;
  readonly estaAberto: boolean;
}

/** Componente físico encapsulado de dossel, linhas e ponto de fixação. */
export class Paraquedas {
  private static readonly massaPorAreaKgM2 = 0.2;
  private static readonly coeficienteArrastoPadrao = 1.5;
  private static readonly resistenciaPorAreaN = 800;
  private aberta = false;
  private integridadeEstruturalAtual = 1;
  private readonly idInterno: string;
  private massaInternaKg: number;
  private areaFrontalInternaM2: number;
  private coeficienteArrastoInterno: number;
  private resistenciaTracaoInternaN: number;

  public constructor(definicao: DefinicaoParaquedas) {
    if (!definicao.id || !Number.isFinite(definicao.areaFrontalM2) || definicao.areaFrontalM2 <= 0) {
      throw new Error('Definição de paraquedas inválida.');
    }
    this.idInterno = definicao.id;
    this.massaInternaKg = 0;
    this.areaFrontalInternaM2 = 0;
    this.coeficienteArrastoInterno = 0;
    this.resistenciaTracaoInternaN = 0;
    this.configurarAreaFrontal(definicao.areaFrontalM2);
  }

  public get id(): string { return this.idInterno; }
  public get massaKg(): number { return this.massaInternaKg; }
  public get estaAberto(): boolean { return this.aberta; }
  public get areaFrontalM2(): number { return this.areaFrontalInternaM2; }
  public get coeficienteArrasto(): number { return this.coeficienteArrastoInterno; }
  public get resistenciaTracaoN(): number { return this.resistenciaTracaoInternaN; }
  public get integridadeEstrutural(): number { return this.integridadeEstruturalAtual; }
  public obterEstado(): EstadoParaquedas {
    return { id: this.idInterno, massaKg: this.massaInternaKg, areaFrontalM2: this.areaFrontalInternaM2, coeficienteArrasto: this.coeficienteArrastoInterno, resistenciaTracaoN: this.resistenciaTracaoInternaN, integridadeEstrutural: this.integridadeEstruturalAtual, estaAberto: this.aberta };
  }
  public configurarAreaFrontal(areaFrontalM2: number): void {
    if (this.integridadeEstruturalAtual === 0) throw new Error('Paraquedas inoperante não pode ser reconfigurado.');
    if (!Number.isFinite(areaFrontalM2) || areaFrontalM2 <= 0) throw new Error('Área de paraquedas inválida.');
    this.massaInternaKg = areaFrontalM2 * Paraquedas.massaPorAreaKgM2;
    this.areaFrontalInternaM2 = areaFrontalM2;
    this.coeficienteArrastoInterno = Paraquedas.coeficienteArrastoPadrao;
    this.resistenciaTracaoInternaN = areaFrontalM2 * Paraquedas.resistenciaPorAreaN;
  }
  public acionar(): boolean {
    if (this.integridadeEstruturalAtual === 0) return false;
    this.aberta = true;
    return true;
  }
  public recolher(): void { this.aberta = false; }
  /** Registra carga no engate; uma carga excessiva inutiliza o componente. */
  public aplicarCargaTracao(cargaN: number): void {
    if (!Number.isFinite(cargaN) || cargaN < 0) throw new Error('Carga de tração inválida.');
    if (cargaN > this.resistenciaTracaoInternaN) {
      this.integridadeEstruturalAtual = 0;
      this.aberta = false;
    }
  }
}
