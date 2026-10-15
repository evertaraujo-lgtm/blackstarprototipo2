import { SuperficieFisica } from './SuperficieFisica';
import { Vetor3 } from './Vetor3';
import { TERRA } from './ambiente/CampoGravitacional';

/** Secção circular terrestre XY, extrudada em Z somente para a geometria dos corpos. */
export class SuperficieEsferica extends SuperficieFisica {
  /** Configura superfície rígida circular em XY, material concreto e propriedades de contato; exige raio positivo finito e centro com Z zero. Não representa oceano nem rotação terrestre. @contract f-9eac1149d1a4ca7a @reviewed M12-DOC: implementação lida. */
  public constructor(id: string, public readonly centroM: Vetor3, public readonly raioM: number = TERRA.raioM,
    resistenciaColisaoJ = 1_000_000, dissipacaoImpacto = 0.04, coeficienteAtritoDinamico = 0.9) {
    super(id, 'concreto', resistenciaColisaoJ, dissipacaoImpacto, coeficienteAtritoDinamico);
    if (!Number.isFinite(raioM) || raioM <= 0 || centroM.z !== 0) throw new Error('Superfície esférica XY inválida.');
  }
  /** Retorna distância radial em XY menos raio, em m; positivo fora, negativo dentro. Z não altera a geometria planar. @contract f-8e1821f8d4a7658a @reviewed M12-DOC: implementação lida. */
  public distanciaAssinadaM(p: Vetor3): number { return Math.hypot(p.x - this.centroM.x, p.y - this.centroM.y) - this.raioM; }
  /** Normaliza o raio em XY apontando para fora; lança erro no centro, onde não existe normal única. @contract f-9bf75e102dce8e85 @reviewed M12-DOC: implementação lida. */
  public normalEm(p: Vetor3): Vetor3 {
    const r = new Vetor3(p.x - this.centroM.x, p.y - this.centroM.y, 0);
    if (r.magnitude === 0) throw new Error('Normal da superfície indefinida no centro.');
    return r.multiplicar(1 / r.magnitude);
  }
  /** Projeta radialmente sobre o círculo preservando Z do ponto; herda singularidade de normalEm no centro. @contract f-07d02372207ebdce @reviewed M12-DOC: implementação lida. */
  public projetar(p: Vetor3): Vetor3 { return this.centroM.adicionar(this.normalEm(p).multiplicar(this.raioM)).adicionar(new Vetor3(0, 0, p.z)); }
  /** Acrescenta aos vértices mínimos radiais interiores dos segmentos entre pontos da mesma geometria convexa; captura contato no meio de base tangente. Não une corpos diferentes. @contract f-759c955510442332 @reviewed M12-DOC: implementação lida. */
  public override candidatosContato(pontos: readonly Vetor3[]): readonly Vetor3[] {
    // O mínimo radial pode estar no interior de uma aresta (ex.: base plana
    // tangente ao planeta), não somente nos vértices. Chords entre pontos da
    // geometria convexa cobrem suas arestas; nunca unem objetos distintos.
    const candidatos = [...pontos];
    for (let i = 0; i < pontos.length; i++) for (let j = i + 1; j < pontos.length; j++) {
      const a = pontos[i], d = pontos[j].subtrair(a);
      const comprimento2 = d.x ** 2 + d.y ** 2;
      if (comprimento2 === 0) continue;
      const r = a.subtrair(this.centroM);
      const t = Math.max(0, Math.min(1, -(r.x * d.x + r.y * d.y) / comprimento2));
      if (t > 0 && t < 1) candidatos.push(a.adicionar(d.multiplicar(t)));
    }
    return candidatos;
  }
}
