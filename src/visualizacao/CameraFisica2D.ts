import { Vetor3 } from '../physics/Vetor3';

/** Projeção para pixels relativa à câmera; jamais altera o estado do mundo. */
export class CameraFisica2D {
  /** Configura centro m, escala m/pixel e viewport em pixels positivos/finitos; não registra corpo ou força no mundo. @contract f-07a1929a163d1610 @reviewed M12-DOC: implementação lida. */
  public constructor(public readonly centroM: Vetor3, public readonly metrosPorPixel: number,
    public readonly larguraPx: number, public readonly alturaPx: number) {
    if (![metrosPorPixel, larguraPx, alturaPx].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Escala de câmera inválida.');
  }
  /** Converte posição global m para pixels relativos ao centro, invertendo Y para Canvas; devolve coordenadas de apresentação. @contract f-31d5b085ffb8952c @reviewed M12-DOC: implementação lida. */
  public projetar(p: Vetor3): { x: number; y: number } {
    return { x: this.larguraPx / 2 + (p.x - this.centroM.x) / this.metrosPorPixel,
      y: this.alturaPx / 2 - (p.y - this.centroM.y) / this.metrosPorPixel };
  }
  /** Converte pixels de tela em posição global m no plano Z=0; é consulta geométrica, não comando cinemático. @contract f-257cc87e0a37306e @reviewed M12-DOC: implementação lida. */
  public desprojetar(x: number, y: number): Vetor3 {
    return new Vetor3(this.centroM.x + (x - this.larguraPx / 2) * this.metrosPorPixel,
      this.centroM.y - (y - this.alturaPx / 2) * this.metrosPorPixel, 0);
  }
}
