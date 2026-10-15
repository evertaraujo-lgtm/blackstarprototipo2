import { Vetor3 } from '../Vetor3';
import { TERRA } from './CampoGravitacional';

/** Normaliza ângulo em rad para [−π,π] por atan2(sin,cos); mantém equivalência angular sem modificar estado. @contract f-a83a925cd4624e54 @reviewed M12-DOC: implementação lida. */
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
  /** Devolve Y em m no ambiente plano legado. @contract f-2bd5470c312ea2b2 @reviewed M12-DOC: implementação lida. */
  public altitudeGeometricaM(p: Vetor3): number { return p.y; }
  /** Devolve vertical unitária +Y fixa do legado, independentemente da posição. @contract f-861523d885bf2367 @reviewed M12-DOC: implementação lida. */
  public radial(_p: Vetor3): Vetor3 { return new Vetor3(0, 1, 0); }
  /** Devolve tangente unitária +X fixa do legado. @contract f-1d3f0c402bf99cdc @reviewed M12-DOC: implementação lida. */
  public tangencial(_p: Vetor3): Vetor3 { return new Vetor3(1, 0, 0); }
  /** Devolve coordenada X em m no legado. @contract f-85b1407c929b6ea0 @reviewed M12-DOC: implementação lida. */
  public posicaoHorizontalM(p: Vetor3): number { return p.x; }
  /** Calcula alvo−X em m no plano legado. @contract f-6b4682b68e5d7d24 @reviewed M12-DOC: implementação lida. */
  public erroHorizontalM(alvo: number, p: Vetor3): number { return alvo - p.x; }
  /** Constrói posição XY (s,h) em m; no plano, s é deslocamento linear. @contract f-437c0b1769292c41 @reviewed M12-DOC: implementação lida. */
  public posicaoPorArcoM(s: number, h: number): Vetor3 { return new Vetor3(s, h, 0); }
  /** Normaliza atitude em rad; vertical local coincide com vertical inercial plana. @contract f-573e239e871765bb @reviewed M12-DOC: implementação lida. */
  public atitudeLocalRad(theta: number, _p: Vetor3): number { return normalizarAngulo(theta); }
  /** Devolve atitude local em rad sem conversão adicional no legado. @contract f-e2cc52130e895bd8 @reviewed M12-DOC: implementação lida. */
  public atitudeInercialRad(theta: number, _p: Vetor3): number { return theta; }
  /** Devolve taxa angular em rad/s; a vertical plana não gira com a posição. @contract f-190d541e1ee8d016 @reviewed M12-DOC: implementação lida. */
  public taxaAtitudeLocalRadps(omega: number, _p: Vetor3, _v: Vetor3): number { return omega; }
  /** Preserva o vetor no referencial plano, cujos eixos locais e globais coincidem. @contract f-f8f272002f764100 @reviewed M12-DOC: implementação lida. */
  public vetorParaLocal(v: Vetor3, _p: Vetor3): Vetor3 { return v; }
  /** Preserva o vetor no referencial plano sem rotação de base. @contract f-616a8d01768f0bea @reviewed M12-DOC: implementação lida. */
  public vetorParaGlobal(v: Vetor3, _p: Vetor3): Vetor3 { return v; }
  /** Soma âncora e posição local em m; não reposiciona objetos registrados. @contract f-fa2facd365c60180 @reviewed M12-DOC: implementação lida. */
  public localParaGlobal(p: Vetor3, ancora: Vetor3): Vetor3 { return ancora.adicionar(p); }
  /** Subtrai âncora da posição global em m, sem alterar o vetor de origem. @contract f-225ae6fe4cfce9f0 @reviewed M12-DOC: implementação lida. */
  public globalParaLocal(p: Vetor3, ancora: Vetor3): Vetor3 { return p.subtrair(ancora); }
}

export class ReferencialEsferico implements ReferencialFisico {
  /** Configura centro XY e raio positivo/finito em m; rejeita centro com Z≠0. @contract f-1b0d7996da737c93 @reviewed M12-DOC: implementação lida. */
  public constructor(
    public readonly centroM = new Vetor3(0, -TERRA.raioM, 0),
    public readonly raioM: number = TERRA.raioM,
  ) {
    if (!Number.isFinite(raioM) || raioM <= 0 || centroM.z !== 0) throw new Error('Geometria esférica XY inválida.');
  }
  /** Calcula altitude radial |p−C|−R em m; não confunde Y global com altura. @contract f-582d3d2d1b9f29b2 @reviewed M12-DOC: implementação lida. */
  public altitudeGeometricaM(p: Vetor3): number { return this.vetorRadial(p).magnitude - this.raioM; }
  /** Normaliza p−C para obter vertical unitária exterior; rejeita centro singular. @contract f-a006bd5979b880f7 @reviewed M12-DOC: implementação lida. */
  public radial(p: Vetor3): Vetor3 {
    const r = this.vetorRadial(p);
    if (r.magnitude === 0) throw new Error('Vertical local indefinida no centro.');
    return r.multiplicar(1 / r.magnitude);
  }
  /** Constrói tangente unitária (nY,−nX,0) ortogonal à radial no plano XY. @contract f-6946d613669fa4df @reviewed M12-DOC: implementação lida. */
  public tangencial(p: Vetor3): Vetor3 { const n = this.radial(p); return new Vetor3(n.y, -n.x, 0); }
  /** Arco assinado em [-πR,πR]; não é longitude geográfica nem coordenada desenrolada.
   * @contract f-bd20ed8be1fb01f5
   */
  public posicaoHorizontalM(p: Vetor3): number { const r = this.radial(p); return this.raioM * Math.atan2(r.x, r.y); }
  /** Calcula erro de alvo pelo menor arco assinado em m, normalizando diferença angular; não é longitude geográfica. @contract f-39a40c95947d4828 @reviewed M12-DOC: implementação lida. */
  public erroHorizontalM(alvo: number, p: Vetor3): number { return this.raioM * normalizarAngulo((alvo - this.posicaoHorizontalM(p)) / this.raioM); }
  /** Converte arco s em m e altitude h em m para C+(R+h)(sin(s/R),cos(s/R),0); exige valores finitos e h>−R. @contract f-2e5bbecdfd66906a @reviewed M12-DOC: implementação lida. */
  public posicaoPorArcoM(s: number, h: number): Vetor3 {
    if (!Number.isFinite(s) || !Number.isFinite(h) || h <= -this.raioM) throw new Error('Coordenadas radiais inválidas.');
    const phi = s / this.raioM;
    return this.centroM.adicionar(new Vetor3(Math.sin(phi), Math.cos(phi), 0).multiplicar(this.raioM + h));
  }
  /** Subtrai o ângulo da radial local da atitude inercial Z e normaliza resultado em rad. @contract f-34d30a219ee36d9e @reviewed M12-DOC: implementação lida. */
  public atitudeLocalRad(theta: number, p: Vetor3): number {
    const n = this.radial(p);
    return normalizarAngulo(theta - Math.atan2(-n.x, n.y));
  }
  /** Soma ao ângulo local a orientação da vertical radial; retorno rad, sem girar veículo. @contract f-bee1f9f453566181 @reviewed M12-DOC: implementação lida. */
  public atitudeInercialRad(theta: number, p: Vetor3): number {
    const n = this.radial(p);
    return theta + Math.atan2(-n.x, n.y);
  }
  /** Corrige ω inercial pela taxa de mudança da vertical local v_t/|p−C|; devolve rad/s. @contract f-8a6761cf0a42dce0 @reviewed M12-DOC: implementação lida. */
  public taxaAtitudeLocalRadps(omega: number, p: Vetor3, v: Vetor3): number {
    return omega + v.produtoEscalar(this.tangencial(p)) / this.vetorRadial(p).magnitude;
  }
  /** Projeta vetor na tangente e radial locais (ordem X,Y), preservando componente Z; não altera cinemática. @contract f-4bf90558cabd7c46 @reviewed M12-DOC: implementação lida. */
  public vetorParaLocal(v: Vetor3, p: Vetor3): Vetor3 {
    return new Vetor3(v.produtoEscalar(this.tangencial(p)), v.produtoEscalar(this.radial(p)), v.z);
  }
  /** Reconstrói vetor global pela soma das componentes tangencial/radial e Z; base é consultada na posição informada. @contract f-aff72d718afc88ea @reviewed M12-DOC: implementação lida. */
  public vetorParaGlobal(v: Vetor3, p: Vetor3): Vetor3 {
    return this.tangencial(p).multiplicar(v.x).adicionar(this.radial(p).multiplicar(v.y)).adicionar(new Vetor3(0, 0, v.z));
  }
  /** Transforma deslocamento na base da âncora e soma translação; é carta local tangente, não conversão geodésica global. @contract f-cd1bca7be3afbd3e @reviewed M12-DOC: implementação lida. */
  public localParaGlobal(p: Vetor3, ancora: Vetor3): Vetor3 { return ancora.adicionar(this.vetorParaGlobal(p, ancora)); }
  /** Subtrai âncora e projeta deslocamento na base local da âncora; não integra trajetória. @contract f-2f97104e63f4ebee @reviewed M12-DOC: implementação lida. */
  public globalParaLocal(p: Vetor3, ancora: Vetor3): Vetor3 { return this.vetorParaLocal(p.subtrair(ancora), ancora); }
  /** Exige posição em XY e devolve p−C em m; rejeita componente Z fora do plano. @contract f-f540c4767ce36c2e @reviewed M12-DOC: implementação lida. */
  private vetorRadial(p: Vetor3): Vetor3 {
    if (p.z !== 0) throw new Error('Referencial orbital restrito ao plano XY (z=0).');
    return p.subtrair(this.centroM);
  }
}
