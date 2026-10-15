/** Comandos e realimentações; não representam posições cinemáticas. */
export interface EntradasCilindro {
  readonly avancar: boolean;
  readonly recuar: boolean;
  readonly avancado: boolean;
  readonly recuado: boolean;
}

export interface DefinicaoCilindro {
  readonly velocidadeAvancoMps: number;
  readonly velocidadeRecuoMps: number;
}

/** Comportamento de duas posições, sem massa, geometria ou estado físico. */
export class Cilindro {
  private entradas: EntradasCilindro = { avancar: false, recuar: false, avancado: false, recuado: false };
  private comandoSelado: 'avancar' | 'recuar' | undefined;
  private avancoMps = 0;
  private recuoMps = 0;

  /** Dependências diretas: `this.configurarVelocidades`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0268843ba048392d */
  public constructor(definicao: DefinicaoCilindro) {
    this.configurarVelocidades(definicao.velocidadeAvancoMps, definicao.velocidadeRecuoMps);
  }
  /** Devolve `this.avancoMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-e611e55f85b7fd3e */
  public get velocidadeAvancoMps(): number { return this.avancoMps; }
  /** Devolve `this.recuoMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-31d94731d579f621 */
  public get velocidadeRecuoMps(): number { return this.recuoMps; }
  /** Devolve `{ ...this.entradas }`. Efeitos indiretos seguem as dependências chamadas. @contract f-a5f7d7ff3e40698a */
  public get entradasAtuais(): EntradasCilindro { return { ...this.entradas }; }
  /** REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-d1d36ea303033cd4 */
  public get velocidadeSolicitadaMps(): number {
    if (this.entradas.avancar && !this.entradas.avancado) return this.avancoMps;
    if (this.entradas.recuar && !this.entradas.recuado) return -this.recuoMps;
    return 0;
  }
  /** Escritas diretas: `this.comandoSelado`, `this.entradas`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-e44d86abf66b0b01 */
  public definirEntradas(entradas: EntradasCilindro): void {
    if (entradas.avancar && entradas.recuar) throw new Error('Cilindro não pode avançar e recuar simultaneamente.');
    if (entradas.avancar) this.comandoSelado = 'avancar';
    else if (entradas.recuar) this.comandoSelado = 'recuar';
    this.entradas = {
      ...entradas,
      avancar: this.comandoSelado === 'avancar',
      recuar: this.comandoSelado === 'recuar',
    };
  }
  /** Escritas diretas: `this.comandoSelado`, `this.entradas`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-36049b7cfcf65d94 */
  public limparSelo(): void {
    this.comandoSelado = undefined;
    this.entradas = { ...this.entradas, avancar: false, recuar: false };
  }
  /** Escritas diretas: `this.avancoMps`, `this.recuoMps`. Dependências diretas: `[avancoMps, recuoMps].every`, `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-a7cf4543ed0b41f0 */
  public configurarVelocidades(avancoMps: number, recuoMps: number): void {
    if (![avancoMps, recuoMps].every((valor) => Number.isFinite(valor) && valor > 0)) {
      throw new Error('Velocidades do cilindro devem ser positivas e finitas, em m/s.');
    }
    this.avancoMps = avancoMps;
    this.recuoMps = recuoMps;
  }
}

// O construtor variádico preserva os argumentos de qualquer classe base no mixin.
type Construtor = new (...args: any[]) => object;

/** Herança de comportamento sem exigir herança múltipla ou substituir a física.
 * @contract f-37ea8d6287dee55e
 */
export function ComCilindro<TBase extends Construtor>(Base: TBase) {
  return class extends Base {
    private comportamentoCilindro?: Cilindro;
    /** Escritas diretas: `this.comportamentoCilindro`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-460d48af47bfa25b */
    public instalarCilindro(cilindro: Cilindro): void {
      if (this.comportamentoCilindro) throw new Error('Cilindro já instalado.');
      this.comportamentoCilindro = cilindro;
    }
    /** Devolve `this.comportamentoCilindro`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0e43557eded6c289 */
    private get cilindro(): Cilindro {
      if (!this.comportamentoCilindro) throw new Error('Configure o cilindro antes de operá-lo.');
      return this.comportamentoCilindro;
    }
    /** Dependências diretas: `this.cilindro.definirEntradas`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-d290466219a1aff7 */
    public definirEntradas(entradas: EntradasCilindro): void { this.cilindro.definirEntradas(entradas); }
    /** Dependências diretas: `this.cilindro.configurarVelocidades`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-8d083881cc14ee4c */
    public configurarVelocidades(avancoMps: number, recuoMps: number): void { this.cilindro.configurarVelocidades(avancoMps, recuoMps); }
    /** Devolve `this.cilindro.velocidadeAvancoMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-490ed0311646e80f */
    public get velocidadeAvancoMps(): number { return this.cilindro.velocidadeAvancoMps; }
    /** Devolve `this.cilindro.velocidadeRecuoMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-dabbbc3ed88eefb4 */
    public get velocidadeRecuoMps(): number { return this.cilindro.velocidadeRecuoMps; }
    /** Devolve `this.cilindro.entradasAtuais`. Efeitos indiretos seguem as dependências chamadas. @contract f-5b2848167c00d21e */
    public get entradasAtuais(): EntradasCilindro { return this.cilindro.entradasAtuais; }
    /** Dependências diretas: `this.cilindro.limparSelo`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-5f008584d25099a4 */
    public limparSelo(): void { this.cilindro.limparSelo(); }
    /** Devolve `this.cilindro.velocidadeSolicitadaMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-d79542767fa0d4b6 */
    public get velocidadeSolicitadaMps(): number { return this.cilindro.velocidadeSolicitadaMps; }
  };
}
