import { Vetor3 } from '../Vetor3';
import { TERRA } from './CampoGravitacional';

export const normalizarAngulo = (angulo: number): number => Math.atan2(Math.sin(angulo), Math.cos(angulo));

/** Geometria operacional XY; posições e velocidades do core permanecem inerciais. */
export interface ReferencialFisico {
  altitudeGeometricaM(p: Vetor3): number;
  radial(p: Vetor3): Vetor3;
  tangencial(p: Vetor3): Vetor3;
  posicaoHorizontalM(p: Vetor3): number;
  erroHorizontalM(alvoM: number, p: Vetor3): number;
  posicaoPorArcoM(sM: number, altitudeM: number): Vetor3;
  atitudeLocalRad(thetaInercialRad: number, p: Vetor3): number;
  atitudeInercialRad(thetaLocalRad: number, p: Vetor3): number;
  taxaAtitudeLocalRadps(omegaRadps: number, p: Vetor3, v: Vetor3): number;
  vetorParaLocal(v: Vetor3, p: Vetor3): Vetor3;
  vetorParaGlobal(vLocal: Vetor3, p: Vetor3): Vetor3;
  localParaGlobal(pLocal: Vetor3, ancoraM: Vetor3): Vetor3;
  globalParaLocal(p: Vetor3, ancoraM: Vetor3): Vetor3;
}

export class ReferencialPlano implements ReferencialFisico {
  public altitudeGeometricaM(p: Vetor3): number { return p.y; }
  public radial(_p: Vetor3): Vetor3 { return new Vetor3(0, 1, 0); }
  public tangencial(_p: Vetor3): Vetor3 { return new Vetor3(1, 0, 0); }
  public posicaoHorizontalM(p: Vetor3): number { return p.x; }
  public erroHorizontalM(alvo: number, p: Vetor3): number { return alvo - p.x; }
  public posicaoPorArcoM(s: number, h: number): Vetor3 { return new Vetor3(s, h, 0); }
  public atitudeLocalRad(theta: number, _p: Vetor3): number { return normalizarAngulo(theta); }
  public atitudeInercialRad(theta: number, _p: Vetor3): number { return theta; }
  public taxaAtitudeLocalRadps(omega: number, _p: Vetor3, _v: Vetor3): number { return omega; }
  public vetorParaLocal(v: Vetor3, _p: Vetor3): Vetor3 { return v; }
  public vetorParaGlobal(v: Vetor3, _p: Vetor3): Vetor3 { return v; }
  public localParaGlobal(p: Vetor3, ancora: Vetor3): Vetor3 { return ancora.adicionar(p); }
  public globalParaLocal(p: Vetor3, ancora: Vetor3): Vetor3 { return p.subtrair(ancora); }
}

export class ReferencialEsferico implements ReferencialFisico {
  public constructor(
    public readonly centroM = new Vetor3(0, -TERRA.raioM, 0),
    public readonly raioM: number = TERRA.raioM,
  ) {
    if (!Number.isFinite(raioM) || raioM <= 0 || centroM.z !== 0) throw new Error('Geometria esférica XY inválida.');
  }
  public altitudeGeometricaM(p: Vetor3): number { return this.vetorRadial(p).magnitude - this.raioM; }
  public radial(p: Vetor3): Vetor3 {
    const r = this.vetorRadial(p);
    if (r.magnitude === 0) throw new Error('Vertical local indefinida no centro.');
    return r.multiplicar(1 / r.magnitude);
  }
  public tangencial(p: Vetor3): Vetor3 { const n = this.radial(p); return new Vetor3(n.y, -n.x, 0); }
  /** Arco assinado em [-πR,πR]; não é longitude geográfica nem coordenada desenrolada. */
  public posicaoHorizontalM(p: Vetor3): number { const r = this.radial(p); return this.raioM * Math.atan2(r.x, r.y); }
  public erroHorizontalM(alvo: number, p: Vetor3): number { return this.raioM * normalizarAngulo((alvo - this.posicaoHorizontalM(p)) / this.raioM); }
  public posicaoPorArcoM(s: number, h: number): Vetor3 {
    if (!Number.isFinite(s) || !Number.isFinite(h) || h <= -this.raioM) throw new Error('Coordenadas radiais inválidas.');
    const phi = s / this.raioM;
    return this.centroM.adicionar(new Vetor3(Math.sin(phi), Math.cos(phi), 0).multiplicar(this.raioM + h));
  }
  public atitudeLocalRad(theta: number, p: Vetor3): number {
    const n = this.radial(p);
    return normalizarAngulo(theta - Math.atan2(-n.x, n.y));
  }
  public atitudeInercialRad(theta: number, p: Vetor3): number {
    const n = this.radial(p);
    return theta + Math.atan2(-n.x, n.y);
  }
  public taxaAtitudeLocalRadps(omega: number, p: Vetor3, v: Vetor3): number {
    return omega + v.produtoEscalar(this.tangencial(p)) / this.vetorRadial(p).magnitude;
  }
  public vetorParaLocal(v: Vetor3, p: Vetor3): Vetor3 {
    return new Vetor3(v.produtoEscalar(this.tangencial(p)), v.produtoEscalar(this.radial(p)), v.z);
  }
  public vetorParaGlobal(v: Vetor3, p: Vetor3): Vetor3 {
    return this.tangencial(p).multiplicar(v.x).adicionar(this.radial(p).multiplicar(v.y)).adicionar(new Vetor3(0, 0, v.z));
  }
  public localParaGlobal(p: Vetor3, ancora: Vetor3): Vetor3 { return ancora.adicionar(this.vetorParaGlobal(p, ancora)); }
  public globalParaLocal(p: Vetor3, ancora: Vetor3): Vetor3 { return this.vetorParaLocal(p.subtrair(ancora), ancora); }
  private vetorRadial(p: Vetor3): Vetor3 {
    if (p.z !== 0) throw new Error('Referencial orbital restrito ao plano XY (z=0).');
    return p.subtrair(this.centroM);
  }
}
