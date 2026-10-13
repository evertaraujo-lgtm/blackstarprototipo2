import { SuperficieFisica } from './SuperficieFisica';
import { Vetor3 } from './Vetor3';

/** Plano horizontal infinito, preservado para bancadas e cenários legados. */
export class SuperficiePlano extends SuperficieFisica {
  public constructor(
    id: string, tipoMaterial: 'areia' | 'agua' | 'terra' | 'concreto' | 'aco' | 'outro',
    public readonly alturaM: number, resistenciaColisaoJ: number,
    dissipacaoImpacto = 0.15, coeficienteAtritoDinamico = 0.65,
    temperaturaInicialC = 20, capacidadeTermicaJPorC = 1_000_000,
  ) {
    super(id, tipoMaterial, resistenciaColisaoJ, dissipacaoImpacto, coeficienteAtritoDinamico, temperaturaInicialC, capacidadeTermicaJPorC);
    if (!Number.isFinite(alturaM)) throw new Error('Altura do plano deve ser finita.');
  }
  public distanciaAssinadaM(p: Vetor3): number { return p.y - this.alturaM; }
  public normalEm(_p: Vetor3): Vetor3 { return new Vetor3(0, 1, 0); }
  public projetar(p: Vetor3): Vetor3 { return new Vetor3(p.x, this.alturaM, p.z); }
}
