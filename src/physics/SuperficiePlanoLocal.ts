import { SuperficieFisica } from './SuperficieFisica';
import { Vetor3 } from './Vetor3';

/** Face superior estática de plataforma local finita; não representa solo global. */
export class SuperficiePlanoLocal extends SuperficieFisica {
  public readonly normal: Vetor3;
  private readonly tangente: Vetor3;
  /** Configura plataforma rígida de concreto ancorada em m; exige normal não nula em XY e semilargura positiva finita. Normaliza normal e constrói tangente ortogonal fixa. @contract f-0b7412a4b180e52d @reviewed M12-DOC: implementação lida. */
  public constructor(id: string, public readonly ancoraM: Vetor3, normal: Vetor3, public readonly semiLarguraM: number,
    resistenciaColisaoJ = 1_000_000, dissipacaoImpacto = 0.04, coeficienteAtritoDinamico = 0.9) {
    super(id, 'concreto', resistenciaColisaoJ, dissipacaoImpacto, coeficienteAtritoDinamico);
    if (normal.z !== 0 || normal.magnitude === 0 || !Number.isFinite(semiLarguraM) || semiLarguraM <= 0) throw new Error('Plataforma XY inválida.');
    this.normal = normal.multiplicar(1 / normal.magnitude);
    this.tangente = new Vetor3(this.normal.y, -this.normal.x, 0);
  }
  /** Projeta deslocamento desde a âncora sobre normal unitária; retorna distância assinada em m ao plano de suporte. @contract f-e855b219c8075b64 @reviewed M12-DOC: implementação lida. */
  public distanciaAssinadaM(p: Vetor3): number { return p.subtrair(this.ancoraM).produtoEscalar(this.normal); }
  /** Consulta normal unitária fixa definida na construção da plataforma. @contract f-e4f571e17c0c5b2c @reviewed M12-DOC: implementação lida. */
  public normalEm(_p: Vetor3): Vetor3 { return this.normal; }
  /** Remove componente normal para projetar ponto sobre plano; limitação lateral é verificada separadamente. @contract f-ef5ef0e2329b1484 @reviewed M12-DOC: implementação lida. */
  public projetar(p: Vetor3): Vetor3 { return p.subtrair(this.normal.multiplicar(this.distanciaAssinadaM(p))); }
  /** Aceita coordenada tangencial em módulo até a semilargura, incluindo bordas. @contract f-bbc2a95922c77bcb @reviewed M12-DOC: implementação lida. */
  public override contemProjecao(p: Vetor3): boolean { return Math.abs(p.subtrair(this.ancoraM).produtoEscalar(this.tangente)) <= this.semiLarguraM; }
  /** Inclui interseções interiores dos segmentos com as duas bordas tangenciais; mantém vértices originais para filtrar projeções válidas. @contract f-b0bea2f678b1b9f0 @reviewed M12-DOC: implementação lida. */
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
