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

  /** Valida id e área frontal positiva finita m²; deriva massa, arrasto e resistência pelo modelo padrão através de configurarAreaFrontal. @contract f-a9ae40fb84d5293f @reviewed M12-DOC: implementação lida. */
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

  /** Devolve `this.idInterno`. Efeitos indiretos seguem as dependências chamadas. @contract f-c504e133c9c7558d */
  public get id(): string { return this.idInterno; }
  /** Devolve `this.massaInternaKg`. Efeitos indiretos seguem as dependências chamadas. @contract f-73f7aca409e0a816 */
  public get massaKg(): number { return this.massaInternaKg; }
  /** Devolve `this.aberta`. Efeitos indiretos seguem as dependências chamadas. @contract f-4da3f2e4eeaa111f */
  public get estaAberto(): boolean { return this.aberta; }
  /** Devolve `this.areaFrontalInternaM2`. Efeitos indiretos seguem as dependências chamadas. @contract f-3ab2bc4324233398 */
  public get areaFrontalM2(): number { return this.areaFrontalInternaM2; }
  /** Devolve `this.coeficienteArrastoInterno`. Efeitos indiretos seguem as dependências chamadas. @contract f-14c9a71705b8bab5 */
  public get coeficienteArrasto(): number { return this.coeficienteArrastoInterno; }
  /** Devolve `this.resistenciaTracaoInternaN`. Efeitos indiretos seguem as dependências chamadas. @contract f-4c86e62fdd409726 */
  public get resistenciaTracaoN(): number { return this.resistenciaTracaoInternaN; }
  /** Devolve `this.integridadeEstruturalAtual`. Efeitos indiretos seguem as dependências chamadas. @contract f-cff4610c4d747596 */
  public get integridadeEstrutural(): number { return this.integridadeEstruturalAtual; }
  /** Retorna novo DTO escalar com identidade, massa kg, área m², Cd, resistência N, integridade e abertura; não expõe campos internos mutáveis. @contract f-d73ffb724693278f @reviewed M12-DOC: implementação lida. */
  public obterEstado(): EstadoParaquedas {
    return { id: this.idInterno, massaKg: this.massaInternaKg, areaFrontalM2: this.areaFrontalInternaM2, coeficienteArrasto: this.coeficienteArrastoInterno, resistenciaTracaoN: this.resistenciaTracaoInternaN, integridadeEstrutural: this.integridadeEstruturalAtual, estaAberto: this.aberta };
  }
  /** Rejeita equipamento destruído/área inválida e recalcula massa kg, Cd e resistência N pelas constantes padrão; não abre dossel. @contract f-f87501433647d95b @reviewed M12-DOC: implementação lida. */
  public configurarAreaFrontal(areaFrontalM2: number): void {
    if (this.integridadeEstruturalAtual === 0) throw new Error('Paraquedas inoperante não pode ser reconfigurado.');
    if (!Number.isFinite(areaFrontalM2) || areaFrontalM2 <= 0) throw new Error('Área de paraquedas inválida.');
    this.massaInternaKg = areaFrontalM2 * Paraquedas.massaPorAreaKgM2;
    this.areaFrontalInternaM2 = areaFrontalM2;
    this.coeficienteArrastoInterno = Paraquedas.coeficienteArrastoPadrao;
    this.resistenciaTracaoInternaN = areaFrontalM2 * Paraquedas.resistenciaPorAreaN;
  }
  /** Abre somente se integridade não nula e informa aceitação; redução de velocidade depende do arrasto aplicado pelo mundo. @contract f-2cedf3c8f5f535df @reviewed M12-DOC: implementação lida. */
  public acionar(): boolean {
    if (this.integridadeEstruturalAtual === 0) return false;
    this.aberta = true;
    return true;
  }
  /** Fecha dossel sem recuperar integridade ou alterar movimento do portador. @contract f-702e6837bab5fd97 @reviewed M12-DOC: implementação lida. */
  public recolher(): void { this.aberta = false; }
  /** Registra carga no engate; uma carga excessiva inutiliza o componente.
   * @contract f-62769c88c33d07e9
   */
  public aplicarCargaTracao(cargaN: number): void {
    if (!Number.isFinite(cargaN) || cargaN < 0) throw new Error('Carga de tração inválida.');
    if (cargaN > this.resistenciaTracaoInternaN) {
      this.integridadeEstruturalAtual = 0;
      this.aberta = false;
    }
  }
}
