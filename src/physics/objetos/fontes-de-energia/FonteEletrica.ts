import type { Objeto } from '../base/Objeto';

/** Contrato compartilhado por fontes físicas CC e CA (tensão eficaz para CA). */
export type FonteEletrica = Objeto & {
  readonly tensaoNominalV: number;
  readonly tipoCorrente: 'CC' | 'CA';
  readonly energiaArmazenadaJ: number;
  readonly estaDescarregada: boolean;
  readonly energiaDisponivelNoPassoJ?: number;
  /** Recebe pedido não negativo em J e retorna energia efetivamente entregue dentro do orçamento/reserva; consome fonte e atualiza diagnósticos conforme implementação. @contract f-ab20e650db054ae0 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  fornecerEnergia(energiaJ: number): number;
};
