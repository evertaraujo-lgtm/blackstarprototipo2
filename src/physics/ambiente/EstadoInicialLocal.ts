import type { EstadoFisico } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import type { ReferencialFisico } from './ReferencialFisico';

/** DTO para condições iniciais de ensaio/ADM, sem alterar corpos já em voo. */
export interface CondicoesIniciaisLocais {
  readonly arcoM: number;
  readonly altitudeM: number;
  readonly velocidadeRadialMps: number;
  readonly velocidadeTangencialMps: number;
  readonly atitudeLocalRad: number;
  readonly taxaAtitudeLocalRadps: number;
}

export function criarEstadoInicialLocal(ref: ReferencialFisico, c: CondicoesIniciaisLocais): EstadoFisico {
  if (!Object.values(c).every(Number.isFinite)) throw new Error('Condições iniciais devem ser finitas e SI.');
  const p = ref.posicaoPorArcoM(c.arcoM, c.altitudeM);
  const v = ref.vetorParaGlobal(new Vetor3(c.velocidadeTangencialMps, c.velocidadeRadialMps, 0), p);
  return {
    posicaoM: p, velocidadeMps: v,
    orientacaoRad: new Vetor3(0, 0, ref.atitudeInercialRad(c.atitudeLocalRad, p)),
    velocidadeAngularRadps: new Vetor3(0, 0, c.taxaAtitudeLocalRadps - ref.taxaAtitudeLocalRadps(0, p, v)),
  };
}
