import { Vetor3 } from '../physics/Vetor3';

/** Projeção para pixels relativa à câmera; jamais altera o estado do mundo. */
export class CameraFisica2D {
  public constructor(public readonly centroM: Vetor3, public readonly metrosPorPixel: number,
    public readonly larguraPx: number, public readonly alturaPx: number) {
    if (![metrosPorPixel, larguraPx, alturaPx].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Escala de câmera inválida.');
  }
  public projetar(p: Vetor3): { x: number; y: number } {
    return { x: this.larguraPx / 2 + (p.x - this.centroM.x) / this.metrosPorPixel,
      y: this.alturaPx / 2 - (p.y - this.centroM.y) / this.metrosPorPixel };
  }
  public desprojetar(x: number, y: number): Vetor3 {
    return new Vetor3(this.centroM.x + (x - this.larguraPx / 2) * this.metrosPorPixel,
      this.centroM.y - (y - this.alturaPx / 2) * this.metrosPorPixel, 0);
  }
}
