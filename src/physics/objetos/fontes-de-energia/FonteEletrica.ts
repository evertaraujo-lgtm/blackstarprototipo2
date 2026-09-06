import type { Objeto } from '../base/Objeto';

/** Contrato compartilhado por fontes físicas CC e CA (tensão eficaz para CA). */
export type FonteEletrica = Objeto & {
  readonly tensaoNominalV: number;
  readonly tipoCorrente: 'CC' | 'CA';
  readonly energiaArmazenadaJ: number;
  readonly estaDescarregada: boolean;
  readonly energiaDisponivelNoPassoJ?: number;
  fornecerEnergia(energiaJ: number): number;
};
