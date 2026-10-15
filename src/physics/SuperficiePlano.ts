import { SuperficieFisica } from './SuperficieFisica';
import { Vetor3 } from './Vetor3';

/** Plano horizontal infinito, preservado para bancadas e cenários legados. */
export class SuperficiePlano extends SuperficieFisica {
  /** Configura plano horizontal infinito com altura finita em m e propriedades materiais/térmicas herdadas; preserva ambiente cartesiano legado. @contract f-e05668c4d2d10883 @reviewed M12-DOC: implementação lida. */
  public constructor(
    id: string, tipoMaterial: 'areia' | 'agua' | 'terra' | 'concreto' | 'aco' | 'outro',
    public readonly alturaM: number, resistenciaColisaoJ: number,
    dissipacaoImpacto = 0.15, coeficienteAtritoDinamico = 0.65,
    temperaturaInicialC = 20, capacidadeTermicaJPorC = 1_000_000,
  ) {
    super(id, tipoMaterial, resistenciaColisaoJ, dissipacaoImpacto, coeficienteAtritoDinamico, temperaturaInicialC, capacidadeTermicaJPorC);
    if (!Number.isFinite(alturaM)) throw new Error('Altura do plano deve ser finita.');
  }
  /** Retorna Y menos altura do solo em m; negativo indica penetração no plano horizontal legado. @contract f-5d5c720c09ba2d4e @reviewed M12-DOC: implementação lida. */
  public distanciaAssinadaM(p: Vetor3): number { return p.y - this.alturaM; }
  /** Retorna +Y unitário independentemente da posição, por definição deste plano horizontal. @contract f-b5fb94d5a5041833 @reviewed M12-DOC: implementação lida. */
  public normalEm(_p: Vetor3): Vetor3 { return new Vetor3(0, 1, 0); }
  /** Substitui Y pela altura fixa e preserva X/Z; não altera ponto original. @contract f-8aed11a31e582eb2 @reviewed M12-DOC: implementação lida. */
  public projetar(p: Vetor3): Vetor3 { return new Vetor3(p.x, this.alturaM, p.z); }
}
