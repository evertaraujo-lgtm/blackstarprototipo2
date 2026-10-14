import type { ReferencialFisico } from './ReferencialFisico';
import { Vetor3 } from '../Vetor3';

export interface ConfiguracaoCosta {
  readonly inicioArcoM: number;
  readonly profundidadeM: number;
  readonly larguraRampaM: number;
  readonly larguraFundoM: number;
  readonly nivelMarM: number;
}
/** Baía radial finita: duas praias inclinadas e um fundo real. Unidades SI. */
export class GeografiaCosteira {
  public readonly configuracao: Readonly<ConfiguracaoCosta>;
  public constructor(public readonly referencial: ReferencialFisico, c: ConfiguracaoCosta) {
    if (!Object.values(c).every(Number.isFinite) || c.profundidadeM <= 0 || c.larguraRampaM <= 0 || c.larguraFundoM <= 0)
      throw new Error('Geografia costeira inválida.');
    this.configuracao = Object.freeze({ ...c });
  }
  public get fimArcoM(): number { const c = this.configuracao; return c.inicioArcoM + 2 * c.larguraRampaM + c.larguraFundoM; }
  public alturaSoloM(arcoM: number): number {
    const c = this.configuracao, s = arcoM - c.inicioArcoM;
    const f = Math.max(0, Math.min(1, s / c.larguraRampaM, (this.fimArcoM - arcoM) / c.larguraRampaM));
    return c.nivelMarM - c.profundidadeM * f;
  }
  public derivadaSolo(arcoM: number): number {
    const c = this.configuracao;
    if (arcoM > c.inicioArcoM && arcoM < c.inicioArcoM + c.larguraRampaM) return -c.profundidadeM / c.larguraRampaM;
    if (arcoM > this.fimArcoM - c.larguraRampaM && arcoM < this.fimArcoM) return c.profundidadeM / c.larguraRampaM;
    return 0;
  }
  public contemAgua(p: Vetor3): boolean {
    const s = this.referencial.posicaoHorizontalM(p), h = this.referencial.altitudeGeometricaM(p);
    return s > this.configuracao.inicioArcoM && s < this.fimArcoM
      && h < this.configuracao.nivelMarM && h > this.alturaSoloM(s);
  }
  public pontoSoloM(s: number): Vetor3 { return this.referencial.posicaoPorArcoM(s, this.alturaSoloM(s)); }
}
