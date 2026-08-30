import { Vetor3 } from '../Vetor3';

/** Força externa em N e seu ponto de aplicação em coordenadas do mundo, em m. */
export interface ForcaAplicada {
  readonly forcaN: Vetor3;
  readonly pontoM: Vetor3;
}
