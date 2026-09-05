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
  private avancoMps = 0;
  private recuoMps = 0;

  public constructor(definicao: DefinicaoCilindro) {
    this.configurarVelocidades(definicao.velocidadeAvancoMps, definicao.velocidadeRecuoMps);
  }
  public get velocidadeAvancoMps(): number { return this.avancoMps; }
  public get velocidadeRecuoMps(): number { return this.recuoMps; }
  public get velocidadeSolicitadaMps(): number {
    if (this.entradas.avancar && !this.entradas.avancado) return this.avancoMps;
    if (this.entradas.recuar && !this.entradas.recuado) return -this.recuoMps;
    return 0;
  }
  public definirEntradas(entradas: EntradasCilindro): void {
    if (entradas.avancar && entradas.recuar) throw new Error('Cilindro não pode avançar e recuar simultaneamente.');
    this.entradas = { ...entradas };
  }
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

/** Herança de comportamento sem exigir herança múltipla ou substituir a física. */
export function ComCilindro<TBase extends Construtor>(Base: TBase) {
  return class extends Base {
    private comportamentoCilindro?: Cilindro;
    public instalarCilindro(cilindro: Cilindro): void {
      if (this.comportamentoCilindro) throw new Error('Cilindro já instalado.');
      this.comportamentoCilindro = cilindro;
    }
    private get cilindro(): Cilindro {
      if (!this.comportamentoCilindro) throw new Error('Configure o cilindro antes de operá-lo.');
      return this.comportamentoCilindro;
    }
    public definirEntradas(entradas: EntradasCilindro): void { this.cilindro.definirEntradas(entradas); }
    public configurarVelocidades(avancoMps: number, recuoMps: number): void { this.cilindro.configurarVelocidades(avancoMps, recuoMps); }
    public get velocidadeAvancoMps(): number { return this.cilindro.velocidadeAvancoMps; }
    public get velocidadeRecuoMps(): number { return this.cilindro.velocidadeRecuoMps; }
    public get velocidadeSolicitadaMps(): number { return this.cilindro.velocidadeSolicitadaMps; }
  };
}
