/** Vetor imutável em unidades SI. */
export class Vetor3 {
  public static readonly zero = new Vetor3(0, 0, 0);

  public constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
  ) {
    if (![x, y, z].every(Number.isFinite)) {
      throw new Error('Componentes de Vetor3 devem ser números finitos.');
    }
  }

  public adicionar(outro: Vetor3): Vetor3 {
    return new Vetor3(this.x + outro.x, this.y + outro.y, this.z + outro.z);
  }

  public subtrair(outro: Vetor3): Vetor3 {
    return new Vetor3(this.x - outro.x, this.y - outro.y, this.z - outro.z);
  }

  public multiplicar(escalar: number): Vetor3 {
    if (!Number.isFinite(escalar)) throw new Error('Escalar deve ser finito.');
    return new Vetor3(this.x * escalar, this.y * escalar, this.z * escalar);
  }

  public produtoVetorial(outro: Vetor3): Vetor3 {
    return new Vetor3(
      this.y * outro.z - this.z * outro.y,
      this.z * outro.x - this.x * outro.z,
      this.x * outro.y - this.y * outro.x,
    );
  }

  public produtoEscalar(outro: Vetor3): number {
    return this.x * outro.x + this.y * outro.y + this.z * outro.z;
  }

  public get magnitude(): number {
    return Math.hypot(this.x, this.y, this.z);
  }
}
