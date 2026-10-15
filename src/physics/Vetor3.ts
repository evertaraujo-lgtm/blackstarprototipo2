/** Vetor imutável em unidades SI. */
export class Vetor3 {
  // Cache privado não enumerável: vetores são imutáveis, inclusive nos snapshots congelados.
  #modulo?: number;
  public static readonly zero = new Vetor3(0, 0, 0);

  /** Constrói um vetor de três componentes finitas, sem vincular unidade à álgebra; rejeita NaN/Infinity. @contract f-74cb96218f91335f @reviewed M12-DOC: implementação lida. */
  public constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
  ) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error('Componentes de Vetor3 devem ser números finitos.');
    }
  }

  /** Soma componentes correspondentes e devolve novo vetor; preserva os dois operandos. @contract f-398d35f0224d6119 @reviewed M12-DOC: implementação lida. */
  public adicionar(outro: Vetor3): Vetor3 {
    return new Vetor3(this.x + outro.x, this.y + outro.y, this.z + outro.z);
  }

  /** Subtrai componentes correspondentes e devolve novo vetor; preserva os operandos. @contract f-875994508ec8fe68 @reviewed M12-DOC: implementação lida. */
  public subtrair(outro: Vetor3): Vetor3 {
    return new Vetor3(this.x - outro.x, this.y - outro.y, this.z - outro.z);
  }

  /** Escala cada componente por um escalar finito e devolve novo vetor; rejeita escalar não finito. @contract f-8ac3b8b224d1a12b @reviewed M12-DOC: implementação lida. */
  public multiplicar(escalar: number): Vetor3 {
    if (!Number.isFinite(escalar)) throw new Error('Escalar deve ser finito.');
    return new Vetor3(this.x * escalar, this.y * escalar, this.z * escalar);
  }

  /** Calcula a×b pela regra da mão direita; devolve novo vetor, sem mutação dos operandos. @contract f-d457dfdf5debf072 @reviewed M12-DOC: implementação lida. */
  public produtoVetorial(outro: Vetor3): Vetor3 {
    return new Vetor3(
      this.y * outro.z - this.z * outro.y,
      this.z * outro.x - this.x * outro.z,
      this.x * outro.y - this.y * outro.x,
    );
  }

  /** Calcula x₁x₂+y₁y₂+z₁z₂; unidade do resultado é o produto das unidades dos operandos. @contract f-e1f977babcad5453 @reviewed M12-DOC: implementação lida. */
  public produtoEscalar(outro: Vetor3): number {
    return this.x * outro.x + this.y * outro.y + this.z * outro.z;
  }

  /** Devolve a norma euclidiana; memoiza somente #modulo privado, mantendo x/y/z imutáveis. @contract f-dd14a5d2e2c14ab5 @reviewed M12-DOC: implementação lida. */
  public get magnitude(): number {
    return this.#modulo ??= Math.hypot(this.x, this.y, this.z);
  }
}
