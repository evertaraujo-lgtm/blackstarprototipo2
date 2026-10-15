import { SuperficieFisica } from './SuperficieFisica';
import { Vetor3 } from './Vetor3';

/** Face superior estática de plataforma local finita; não representa solo global. */
export class SuperficiePlanoLocal extends SuperficieFisica {
  public readonly normal: Vetor3;
  private readonly tangente: Vetor3;
  /** Escritas diretas: `this.ancoraM`, `this.semiLarguraM`, `this.normal`, `this.tangente`. Dependências diretas: `super`, `Error`, `normal.multiplicar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0b7412a4b180e52d */
  public constructor(id: string, public readonly ancoraM: Vetor3, normal: Vetor3, public readonly semiLarguraM: number,
    resistenciaColisaoJ = 1_000_000, dissipacaoImpacto = 0.04, coeficienteAtritoDinamico = 0.9) {
    super(id, 'concreto', resistenciaColisaoJ, dissipacaoImpacto, coeficienteAtritoDinamico);
    if (normal.z !== 0 || normal.magnitude === 0 || !Number.isFinite(semiLarguraM) || semiLarguraM <= 0) throw new Error('Plataforma XY inválida.');
    this.normal = normal.multiplicar(1 / normal.magnitude);
    this.tangente = new Vetor3(this.normal.y, -this.normal.x, 0);
  }
  /** Devolve `p.subtrair(this.ancoraM).produtoEscalar(this.normal)`. Dependências diretas: `p.subtrair(this.ancoraM).produtoEscalar`, `p.subtrair`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-e855b219c8075b64 */
  public distanciaAssinadaM(p: Vetor3): number { return p.subtrair(this.ancoraM).produtoEscalar(this.normal); }
  /** Devolve `this.normal`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-e4f571e17c0c5b2c */
  public normalEm(_p: Vetor3): Vetor3 { return this.normal; }
  /** Devolve `p.subtrair(this.normal.multiplicar(this.distanciaAssinadaM(p)))`. Dependências diretas: `p.subtrair`, `this.normal.multiplicar`, `this.distanciaAssinadaM`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-ef5ef0e2329b1484 */
  public projetar(p: Vetor3): Vetor3 { return p.subtrair(this.normal.multiplicar(this.distanciaAssinadaM(p))); }
  /** Devolve `Math.abs(p.subtrair(this.ancoraM).produtoEscalar(this.tangente)) <= this.semiLarguraM`. Dependências diretas: `p.subtrair(this.ancoraM).produtoEscalar`, `p.subtrair`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-bbc2a95922c77bcb */
  public override contemProjecao(p: Vetor3): boolean { return Math.abs(p.subtrair(this.ancoraM).produtoEscalar(this.tangente)) <= this.semiLarguraM; }
  /** Devolve `candidatos`. Dependências diretas: `a.subtrair(this.ancoraM).produtoEscalar`, `a.subtrair`, `b.subtrair(this.ancoraM).produtoEscalar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b0bea2f678b1b9f0 */
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
