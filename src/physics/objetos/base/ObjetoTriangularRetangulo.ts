import { Objeto, type DefinicaoObjeto } from './Objeto';
import { Vetor3 } from '../../Vetor3';

export interface DefinicaoObjetoTriangularRetangulo extends DefinicaoObjeto {
  /** Inclinação da hipotenusa em relação ao solo, em radianos. */
  readonly inclinacaoRad: number;
}

/** Prisma triangular reto cuja hipotenusa forma uma rampa física. */
export class ObjetoTriangularRetangulo extends Objeto {
  /** Inicializa corpo e exige inclinação finita entre 0 e π/2 e altura=base×tan(inclinação), tolerância 1e-9 m; não substitui geometria por caixa cheia. @contract f-13053ef3d73ba42a @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicaoTriangulo: DefinicaoObjetoTriangularRetangulo) {
    super(definicaoTriangulo);
    if (!Number.isFinite(definicaoTriangulo.inclinacaoRad) || definicaoTriangulo.inclinacaoRad <= 0 || definicaoTriangulo.inclinacaoRad >= Math.PI / 2) {
      throw new Error('Inclinação triangular deve estar entre 0 e 90 graus.');
    }
    const alturaEsperadaM = definicaoTriangulo.dimensoesM.x * Math.tan(definicaoTriangulo.inclinacaoRad);
    if (Math.abs(definicaoTriangulo.dimensoesM.y - alturaEsperadaM) > 1e-9) {
      throw new Error('A altura do triângulo deve corresponder à base e à inclinação declarada.');
    }
  }

  /** Devolve `this.definicaoTriangulo.inclinacaoRad`. Efeitos indiretos seguem as dependências chamadas. @contract f-adac845d39b1605c */
  public get inclinacaoRad(): number { return this.definicaoTriangulo.inclinacaoRad; }

  /** Vértices relativos ao centroide físico da seção triangular.
   * @contract f-341bcf633fa406bc
   */
  public override getVerticesColisaoLocais2D(): readonly Vetor3[] {
    const baseM = this.dimensoesM.x;
    const alturaM = this.dimensoesM.y;
    return [
      new Vetor3((-2 * baseM) / 3, -alturaM / 3, 0),
      new Vetor3(baseM / 3, -alturaM / 3, 0),
      new Vetor3(baseM / 3, (2 * alturaM) / 3, 0),
    ];
  }

  /** Extruda vértices triangulares XY às duas faces Z de meia espessura em m para contatos físicos. @contract f-863779999d13bf39 @reviewed M12-DOC: implementação lida. */
  public override getPontosDeContatoLocaisM(): readonly Vetor3[] {
    const metadeZ = this.dimensoesM.z / 2;
    return this.getVerticesColisaoLocais2D().flatMap((vertice) => [
      new Vetor3(vertice.x, vertice.y, -metadeZ), new Vetor3(vertice.x, vertice.y, metadeZ),
    ]);
  }
}
