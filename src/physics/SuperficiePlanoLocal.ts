import { SuperficieFisica } from './SuperficieFisica';
import { Vetor3 } from './Vetor3';

/** Face superior estática de plataforma local finita; não representa solo global. */
export class SuperficiePlanoLocal extends SuperficieFisica {
  public readonly normal: Vetor3;
  private readonly tangente: Vetor3;
  public constructor(id: string, public readonly ancoraM: Vetor3, normal: Vetor3, public readonly semiLarguraM: number,
    resistenciaColisaoJ = 1_000_000, dissipacaoImpacto = 0.04, coeficienteAtritoDinamico = 0.9) {
    super(id, 'concreto', resistenciaColisaoJ, dissipacaoImpacto, coeficienteAtritoDinamico);
    if (normal.z !== 0 || normal.magnitude === 0 || !Number.isFinite(semiLarguraM) || semiLarguraM <= 0) throw new Error('Plataforma XY inválida.');
    this.normal = normal.multiplicar(1 / normal.magnitude);
    this.tangente = new Vetor3(this.normal.y, -this.normal.x, 0);
  }
  public distanciaAssinadaM(p: Vetor3): number { return p.subtrair(this.ancoraM).produtoEscalar(this.normal); }
  public normalEm(_p: Vetor3): Vetor3 { return this.normal; }
  public projetar(p: Vetor3): Vetor3 { return p.subtrair(this.normal.multiplicar(this.distanciaAssinadaM(p))); }
  public override contemProjecao(p: Vetor3): boolean { return Math.abs(p.subtrair(this.ancoraM).produtoEscalar(this.tangente)) <= this.semiLarguraM; }
  public override candidatosContato(pontos: readonly Vetor3[]): readonly Vetor3[] {
    const candidatos = [...pontos];
    for (let i = 0; i < pontos.length; i++) for (let j = i + 1; j < pontos.length; j++) {
      const a = pontos[i], b = pontos[j];
      const sa = a.subtrair(this.ancoraM).produtoEscalar(this.tangente);
      const sb = b.subtrair(this.ancoraM).produtoEscalar(this.tangente);
      if (sa === sb) continue;
      for (const limite of [-this.semiLarguraM, this.semiLarguraM]) {
        const t = (limite - sa) / (sb - sa);
        if (t > 0 && t < 1) candidatos.push(a.adicionar(b.subtrair(a).multiplicar(t)));
      }
    }
    return candidatos;
  }
}
