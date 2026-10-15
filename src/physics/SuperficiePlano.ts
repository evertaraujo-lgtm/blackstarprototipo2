import { SuperficieFisica } from './SuperficieFisica';
import { Vetor3 } from './Vetor3';

/** Plano horizontal infinito, preservado para bancadas e cenários legados. */
export class SuperficiePlano extends SuperficieFisica {
  /** Escritas diretas: `this.alturaM`. Dependências diretas: `super`, `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-e05668c4d2d10883 */
  public constructor(
    id: string, tipoMaterial: 'areia' | 'agua' | 'terra' | 'concreto' | 'aco' | 'outro',
    public readonly alturaM: number, resistenciaColisaoJ: number,
    dissipacaoImpacto = 0.15, coeficienteAtritoDinamico = 0.65,
    temperaturaInicialC = 20, capacidadeTermicaJPorC = 1_000_000,
  ) {
    super(id, tipoMaterial, resistenciaColisaoJ, dissipacaoImpacto, coeficienteAtritoDinamico, temperaturaInicialC, capacidadeTermicaJPorC);
    if (!Number.isFinite(alturaM)) throw new Error('Altura do plano deve ser finita.');
  }
  /** Devolve `p.y - this.alturaM`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-5d5c720c09ba2d4e */
  public distanciaAssinadaM(p: Vetor3): number { return p.y - this.alturaM; }
  /** Devolve `new Vetor3(0, 1, 0)`. Dependências diretas: `Vetor3`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b5fb94d5a5041833 */
  public normalEm(_p: Vetor3): Vetor3 { return new Vetor3(0, 1, 0); }
  /** Devolve `new Vetor3(p.x, this.alturaM, p.z)`. Dependências diretas: `Vetor3`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-8aed11a31e582eb2 */
  public projetar(p: Vetor3): Vetor3 { return new Vetor3(p.x, this.alturaM, p.z); }
}
