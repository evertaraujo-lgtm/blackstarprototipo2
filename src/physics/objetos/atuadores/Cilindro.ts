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

  /** Inicializa comportamento de comando selado e valida velocidades de avanço/recuo em m/s; não representa corpo cinemático independente. @contract f-0268843ba048392d @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoCilindro) {
    this.configurarVelocidades(definicao.velocidadeAvancoMps, definicao.velocidadeRecuoMps);
  }
  /** Devolve `this.avancoMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-e611e55f85b7fd3e */
  public get velocidadeAvancoMps(): number { return this.avancoMps; }
  /** Devolve `this.recuoMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-31d94731d579f621 */
  public get velocidadeRecuoMps(): number { return this.recuoMps; }
  /** Devolve `{ ...this.entradas }`. Efeitos indiretos seguem as dependências chamadas. @contract f-a5f7d7ff3e40698a */
  public get entradasAtuais(): EntradasCilindro { return { ...this.entradas }; }
  /** Retorna velocidade positiva no avanço não concluído, negativa no recuo não concluído ou zero; apenas solicita movimento, sem impor velocidade física. @contract f-d1d36ea303033cd4 @reviewed M12-DOC: implementação lida. */
  public get velocidadeSolicitadaMps(): number {
    if (this.entradas.avancar && !this.entradas.avancado) return this.avancoMps;
    if (this.entradas.recuar && !this.entradas.recuado) return -this.recuoMps;
    return 0;
  }
  /** Rejeita avanço/recuo simultâneos e sela último sentido pedido; copia fins de curso e preserva comando até limparSelo ou novo sentido. @contract f-e44d86abf66b0b01 @reviewed M12-DOC: implementação lida. */
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
  /** Apaga comando retido e desativa entradas de movimento preservando leituras de fim de curso. @contract f-36049b7cfcf65d94 @reviewed M12-DOC: implementação lida. */
  public limparSelo(): void {
    this.comandoSelado = undefined;
    this.entradas = { ...this.entradas, avancar: false, recuar: false };
  }
  /** Exige avanço/recuo positivos finitos em m/s e armazena limites operacionais. @contract f-a7cf4543ed0b41f0 @reviewed M12-DOC: implementação lida. */
  public configurarVelocidades(avancoMps: number, recuoMps: number): void {
    if (![avancoMps, recuoMps].every((valor) => Number.isFinite(valor) && valor > 0)) {
      throw new Error('Velocidades do cilindro devem ser positivas e finitas, em m/s.');
    }
    this.avancoMps = avancoMps;
    this.recuoMps = recuoMps;
  }
}

// O construtor variádico preserva os argumentos de qualquer classe base no mixin.
type Construtor = /** Tipo de construtor do mixin: instancia classe base com argumentos preservados; instalação do comportamento não autoriza alterar cinemática fora do core. @contract f-2018a9bb816af2a1 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ new (...args: any[]) => object;

/** Herança de comportamento sem exigir herança múltipla ou substituir a física.
 * @contract f-37ea8d6287dee55e
 */
export function ComCilindro<TBase extends Construtor>(Base: TBase) {
  return class extends Base {
    private comportamentoCilindro?: Cilindro;
    /** Instala comportamento uma única vez; rejeita substituição implícita de cilindro já associado. @contract f-460d48af47bfa25b @reviewed M12-DOC: implementação lida. */
    public instalarCilindro(cilindro: Cilindro): void {
      if (this.comportamentoCilindro) throw new Error('Cilindro já instalado.');
      this.comportamentoCilindro = cilindro;
    }
    /** Consulta comportamento instalado ou lança erro antes de qualquer operação sem configuração. @contract f-0e43557eded6c289 @reviewed M12-DOC: implementação lida. */
    private get cilindro(): Cilindro {
      if (!this.comportamentoCilindro) throw new Error('Configure o cilindro antes de operá-lo.');
      return this.comportamentoCilindro;
    }
    /** Encaminha entradas ao comportamento instalado, preservando validação e selo. @contract f-d290466219a1aff7 @reviewed M12-DOC: implementação lida. */
    public definirEntradas(entradas: EntradasCilindro): void { this.cilindro.definirEntradas(entradas); }
    /** Encaminha limites m/s ao comportamento instalado; não escreve cinemática. @contract f-8d083881cc14ee4c @reviewed M12-DOC: implementação lida. */
    public configurarVelocidades(avancoMps: number, recuoMps: number): void { this.cilindro.configurarVelocidades(avancoMps, recuoMps); }
    /** Devolve `this.cilindro.velocidadeAvancoMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-490ed0311646e80f */
    public get velocidadeAvancoMps(): number { return this.cilindro.velocidadeAvancoMps; }
    /** Devolve `this.cilindro.velocidadeRecuoMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-dabbbc3ed88eefb4 */
    public get velocidadeRecuoMps(): number { return this.cilindro.velocidadeRecuoMps; }
    /** Devolve `this.cilindro.entradasAtuais`. Efeitos indiretos seguem as dependências chamadas. @contract f-5b2848167c00d21e */
    public get entradasAtuais(): EntradasCilindro { return this.cilindro.entradasAtuais; }
    /** Encaminha limpeza da memória operacional de movimento ao comportamento instalado. @contract f-5f008584d25099a4 @reviewed M12-DOC: implementação lida. */
    public limparSelo(): void { this.cilindro.limparSelo(); }
    /** Devolve `this.cilindro.velocidadeSolicitadaMps`. Efeitos indiretos seguem as dependências chamadas. @contract f-d79542767fa0d4b6 */
    public get velocidadeSolicitadaMps(): number { return this.cilindro.velocidadeSolicitadaMps; }
  };
}
