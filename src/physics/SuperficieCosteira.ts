import { SuperficieEsferica } from './SuperficieEsferica';
import type { GeografiaCosteira } from './ambiente/GeografiaCosteira';
import { Vetor3 } from './Vetor3';

/** Solo radial contínuo, incluindo praias e fundo; não inclui a interface líquida. */
export class SuperficieCosteira extends SuperficieEsferica {
  public constructor(id: string, centro: Vetor3, raioM: number, public readonly costa: GeografiaCosteira) {
    super(id, centro, raioM);
  }
  private gradiente(p: Vetor3): Vetor3 {
    const ref = this.costa.referencial, h = ref.altitudeGeometricaM(p);
    const k = this.costa.derivadaSolo(ref.posicaoHorizontalM(p)) * this.raioM / (this.raioM + h);
    return ref.radial(p).subtrair(ref.tangencial(p).multiplicar(k));
  }
  public override distanciaAssinadaM(p: Vetor3): number {
    const ref = this.costa.referencial;
    return (ref.altitudeGeometricaM(p) - this.costa.alturaSoloM(ref.posicaoHorizontalM(p))) / this.gradiente(p).magnitude;
  }
  public override normalEm(p: Vetor3): Vetor3 { const n = this.gradiente(p); return n.multiplicar(1 / n.magnitude); }
  public override projetar(p: Vetor3): Vetor3 {
    let q = p;
    for (let i = 0; i < 6; i++) q = q.subtrair(this.normalEm(q).multiplicar(this.distanciaAssinadaM(q)));
    return q;
  }
  public override candidatosContato(pontos: readonly Vetor3[]): readonly Vetor3[] {
    const r = [...super.candidatosContato(pontos)], ref = this.costa.referencial, c = this.costa.configuracao;
    const limites = [c.inicioArcoM, c.inicioArcoM + c.larguraRampaM, this.costa.fimArcoM - c.larguraRampaM, this.costa.fimArcoM];
    for (let i = 0; i < pontos.length; i++) for (let j = i + 1; j < pontos.length; j++) {
      const a = pontos[i], b = pontos[j], sa = ref.posicaoHorizontalM(a), sb = ref.posicaoHorizontalM(b);
      for (const limite of limites) {
        if ((sa - limite) * (sb - limite) >= 0) continue;
        let lo = 0, hi = 1;
        for (let n = 0; n < 28; n++) {
          const t = (lo + hi) / 2, s = ref.posicaoHorizontalM(a.adicionar(b.subtrair(a).multiplicar(t)));
          if ((s - limite) * (sa - limite) > 0) lo = t; else hi = t;
        }
        r.push(a.adicionar(b.subtrair(a).multiplicar((lo + hi) / 2)));
      }
    }
    return r;
  }
}
