import { Vetor3 } from '../../physics/Vetor3';
import { CameraFisica2D } from '../../visualizacao/CameraFisica2D';
import type { ObservacaoBss006 } from '../../missoes/TiposMissaoBss006';

/** Câmera radial de observação. Base/câmera nunca entram no integrador. */
export class CameraMissao {
  private readonly projecao: CameraFisica2D;
  public readonly radial: Vetor3;
  public readonly tangencial: Vetor3;
  public readonly centroM: Vetor3;
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
  public projetar(p: { readonly x: number; readonly y: number; readonly z: number }) {
    const delta = new Vetor3(p.x, p.y, p.z).subtrair(this.centroM);
    return this.projecao.projetar(new Vetor3(delta.produtoEscalar(this.tangencial), delta.produtoEscalar(this.radial), 0));
  }
  public anguloCanvas(theta: number): number {
    const eixo = new Vetor3(Math.cos(theta), Math.sin(theta), 0);
    return -Math.atan2(eixo.produtoEscalar(this.radial), eixo.produtoEscalar(this.tangencial));
  }
  public pontoNaTela(x: number, y: number): Vetor3 {
    const q = this.projecao.desprojetar(x, y);
    return this.centroM.adicionar(this.tangencial.multiplicar(q.x)).adicionar(this.radial.multiplicar(q.y));
  }
}
