import { Vetor3 } from '../../physics/Vetor3';
import { CameraFisica2D } from '../../visualizacao/CameraFisica2D';
import type { ObservacaoBss006 } from '../../missoes/TiposMissaoBss006';

/** Câmera radial de observação. Base/câmera nunca entram no integrador. */
export class CameraMissao {
  private readonly projecao: CameraFisica2D;
  public readonly radial: Vetor3;
  public readonly tangencial: Vetor3;
  public readonly centroM: Vetor3;
  /** Constrói base de observação radial/tangencial no corpo observado e centro visual 5 m acima do casco; configura escala m/pixel e viewport em pixels, sem modificar o referencial físico. @contract f-09a1763e24b38923 @reviewed M12-DOC: implementação lida. */
  public constructor(o: ObservacaoBss006, public readonly larguraPx: number,
    public readonly alturaPx: number, public readonly metrosPorPixel: number) {
    const c = o.cenario.centroTerraM;
    const r = o.casco.posicaoM.subtrair(new Vetor3(c.x, c.y, c.z));
    this.radial = r.multiplicar(1 / r.magnitude);
    this.tangencial = new Vetor3(this.radial.y, -this.radial.x, 0);
    // Enquadramento do conjunto acima do casco; sempre acompanha sua posição física.
    this.centroM = o.casco.posicaoM.adicionar(this.radial.multiplicar(5));
    this.projecao = new CameraFisica2D(Vetor3.zero, metrosPorPixel, larguraPx, alturaPx);
  }
  /** Projeta posição global m na base local da câmera e converte para pixels com Y invertido para Canvas. @contract f-a1e2f780f72e3f4e @reviewed M12-DOC: implementação lida. */
  public projetar(p: { readonly x: number; readonly y: number; readonly z: number }) {
    const delta = new Vetor3(p.x, p.y, p.z).subtrair(this.centroM);
    return this.projecao.projetar(new Vetor3(delta.produtoEscalar(this.tangencial), delta.produtoEscalar(this.radial), 0));
  }
  /** Transforma eixo físico de ângulo rad para a base visual local e inverte sinal para Y descendente; não escreve atitude física. @contract f-4f2bd3e5976bba3a @reviewed M12-DOC: implementação lida. */
  public anguloCanvas(theta: number): number {
    const eixo = new Vetor3(Math.cos(theta), Math.sin(theta), 0);
    return -Math.atan2(eixo.produtoEscalar(this.radial), eixo.produtoEscalar(this.tangencial));
  }
  /** Converte coordenadas de tela em pixels para ponto global m na carta tangente da câmera; consulta, sem reposicionar corpo. @contract f-d12f526207c205f7 @reviewed M12-DOC: implementação lida. */
  public pontoNaTela(x: number, y: number): Vetor3 {
    const q = this.projecao.desprojetar(x, y);
    return this.centroM.adicionar(this.tangencial.multiplicar(q.x)).adicionar(this.radial.multiplicar(q.y));
  }
}
