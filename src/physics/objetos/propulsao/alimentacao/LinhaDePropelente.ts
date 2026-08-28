import { TanquePropelente } from '../../fontes-de-energia/TanquePropelente';
import { Vetor3 } from '../../../Vetor3';
import { ValvulaPropelente } from './ValvulaPropelente';

export interface DefinicaoLinhaDePropelente { readonly id: string; readonly tanque: TanquePropelente; readonly tipoPropelente: string; readonly comprimentoMaximoM: number; readonly vazaoMaximaKgS: number; readonly valvula: ValvulaPropelente; }

/** Conexão material entre tanque e bomba; rompe se a geometria exceder o alcance. */
export class LinhaDePropelente {
  private rompida = false;
  private vazaoAtualCalculadaKgS = 0;
  public constructor(private readonly definicao: DefinicaoLinhaDePropelente) {
    if (!definicao.id || definicao.tanque.tipoPropelente !== definicao.tipoPropelente || !Number.isFinite(definicao.comprimentoMaximoM) || definicao.comprimentoMaximoM <= 0 || !Number.isFinite(definicao.vazaoMaximaKgS) || definicao.vazaoMaximaKgS <= 0) throw new Error('Definição de linha de propelente inválida.');
  }
  public get estaRompida(): boolean { return this.rompida; }
  public get vazaoAtualKgS(): number { return this.vazaoAtualCalculadaKgS; }
  public fornecerMassa(massaSolicitadaKg: number, dtS: number, posicaoConsumidorM: Vetor3): number {
    this.vazaoAtualCalculadaKgS = 0;
    if (!Number.isFinite(massaSolicitadaKg) || massaSolicitadaKg < 0 || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Solicitação de linha inválida.');
    const distanciaM = this.definicao.tanque.getEstadoFisico().posicaoM.subtrair(posicaoConsumidorM).magnitude;
    if (this.rompida || distanciaM > this.definicao.comprimentoMaximoM) { this.rompida = true; return 0; }
    const limiteKg = Math.min(this.definicao.vazaoMaximaKgS, this.definicao.valvula.obterVazaoMaximaKgS()) * dtS;
    const fornecida = this.definicao.tanque.fornecerPropelente(Math.min(massaSolicitadaKg, limiteKg));
    this.vazaoAtualCalculadaKgS = fornecida / dtS;
    return fornecida;
  }
}
