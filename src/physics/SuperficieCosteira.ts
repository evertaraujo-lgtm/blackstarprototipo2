import { SuperficieEsferica } from './SuperficieEsferica';
import type { GeografiaCosteira } from './ambiente/GeografiaCosteira';
import { Vetor3 } from './Vetor3';

/** Solo radial contínuo, incluindo praias e fundo; não inclui a interface líquida. */
export class SuperficieCosteira extends SuperficieEsferica {
  /** Configura a superfície sólida esférica/costeira com centro e raio em m; a superfície livre líquida permanece no meio volumétrico separado. @contract f-6f0395858ebb9ab5 @reviewed M12-DOC: implementação lida. */
  public constructor(id: string, centro: Vetor3, raioM: number, public readonly costa: GeografiaCosteira) {
    super(id, centro, raioM);
  }
  /** Calcula gradiente radial menos tangente vezes declive corrigido por R/(R+h), após projetar geometria para XY. @contract f-97baaedd5edd01b1 @reviewed M12-DOC: implementação lida. */
  private gradiente(p: Vetor3): Vetor3 {
    p = this.xy(p);
    const ref = this.costa.referencial, h = ref.altitudeGeometricaM(p);
    const k = this.costa.derivadaSolo(ref.posicaoHorizontalM(p)) * this.raioM / (this.raioM + h);
    return ref.radial(p).subtrair(ref.tangencial(p).multiplicar(k));
  }
  /** Mede afastamento radial ao perfil costeiro, dividido pelo módulo do gradiente; valor negativo indica penetração sólida em m. @contract f-b8779080ceb3160f @reviewed M12-DOC: implementação lida. */
  public override distanciaAssinadaM(p: Vetor3): number {
    p = this.xy(p);
    const ref = this.costa.referencial;
    return (ref.altitudeGeometricaM(p) - this.costa.alturaSoloM(ref.posicaoHorizontalM(p))) / this.gradiente(p).magnitude;
  }
  /** Normaliza o gradiente do perfil costeiro para obter normal física exterior; não presume +Y global. @contract f-735d96fa05a91818 @reviewed M12-DOC: implementação lida. */
  public override normalEm(p: Vetor3): Vetor3 { const n = this.gradiente(p); return n.multiplicar(1 / n.magnitude); }
  /** Projeta ponto na superfície sólida por seis correções locais normal×distância; retorna geometria, sem mover objeto diretamente. @contract f-4c56f0f537cf77b3 @reviewed M12-DOC: implementação lida. */
  public override projetar(p: Vetor3): Vetor3 {
    let q = p;
    for (let i = 0; i < 6; i++) q = q.subtrair(this.normalEm(q).multiplicar(this.distanciaAssinadaM(q)));
    return q;
  }
  /** Acrescenta aos candidatos esféricos os cruzamentos de arestas com limites das rampas, por bisseção de 28 iterações; cobre corpos ocupando terra e oceano. @contract f-6b921c4ced5af66f @reviewed M12-DOC: implementação lida. */
  public override candidatosContato(pontos: readonly Vetor3[]): readonly Vetor3[] {
    const r = [...super.candidatosContato(pontos)], ref = this.costa.referencial, c = this.costa.configuracao;
    const limites = [c.inicioArcoM, c.inicioArcoM + c.larguraRampaM, this.costa.fimArcoM - c.larguraRampaM, this.costa.fimArcoM];
    for (let i = 0; i < pontos.length; i++) for (let j = i + 1; j < pontos.length; j++) {
      const a = pontos[i], b = pontos[j], sa = ref.posicaoHorizontalM(this.xy(a)), sb = ref.posicaoHorizontalM(this.xy(b));
      for (const limite of limites) {
        if ((sa - limite) * (sb - limite) >= 0) continue;
        let lo = 0, hi = 1;
        for (let n = 0; n < 28; n++) {
          const t = (lo + hi) / 2, s = ref.posicaoHorizontalM(this.xy(a.adicionar(b.subtrair(a).multiplicar(t))));
          if ((s - limite) * (sa - limite) > 0) lo = t; else hi = t;
        }
        r.push(a.adicionar(b.subtrair(a).multiplicar((lo + hi) / 2)));
      }
    }
    return r;
  }
  /** Z representa a extrusão geométrica dos corpos; geografia e dinâmica continuam XY.
   * @remarks Remove somente Z da consulta geográfica; mantém X/Y e não modifica o vetor de origem.
   * @contract f-783e0e8e151e6137
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  private xy(p: Vetor3): Vetor3 { return p.z === 0 ? p : new Vetor3(p.x, p.y, 0); }
}
