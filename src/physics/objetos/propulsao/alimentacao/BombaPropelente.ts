import { Bateria } from '../../fontes-de-energia/Bateria';
import { Vetor3 } from '../../../Vetor3';
import { LinhaDePropelente } from './LinhaDePropelente';

export interface DefinicaoBombaPropelente { readonly id: string; readonly tensaoNominalV: number; readonly vazaoMaximaKgS: number; readonly potenciaEletricaMaximaW: number; }

/** Bomba elétrica que converte energia da bateria em vazão limitada pela linha. */
export class BombaPropelente {
  public constructor(private readonly definicao: DefinicaoBombaPropelente) {
    if (!definicao.id || !Number.isFinite(definicao.tensaoNominalV) || definicao.tensaoNominalV <= 0 || !Number.isFinite(definicao.vazaoMaximaKgS) || definicao.vazaoMaximaKgS <= 0 || !Number.isFinite(definicao.potenciaEletricaMaximaW) || definicao.potenciaEletricaMaximaW < 0) throw new Error('Definição de bomba inválida.');
  }
  public bombear(linha: LinhaDePropelente, bateria: Bateria, massaSolicitadaKg: number, dtS: number, posicaoM: Vetor3): number {
    if (!Number.isFinite(massaSolicitadaKg) || massaSolicitadaKg < 0 || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Solicitação de bomba inválida.');
    if (bateria.tensaoNominalV !== this.definicao.tensaoNominalV || bateria.estaDescarregada) return 0;
    const massaLimitadaKg = Math.min(massaSolicitadaKg, this.definicao.vazaoMaximaKgS * dtS);
    const energiaNecessariaJ = this.definicao.potenciaEletricaMaximaW * dtS * (massaLimitadaKg / (this.definicao.vazaoMaximaKgS * dtS));
    const energiaFornecidaJ = bateria.fornecerEnergia(energiaNecessariaJ);
    const disponibilidadeEletrica = energiaNecessariaJ === 0 ? 1 : energiaFornecidaJ / energiaNecessariaJ;
    return linha.fornecerMassa(massaLimitadaKg * disponibilidadeEletrica, dtS, posicaoM);
  }
}
