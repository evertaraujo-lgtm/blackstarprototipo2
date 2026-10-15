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
  /** Valida geometria finita da baía (m), profundidade e larguras positivas; congela uma cópia da configuração. @contract f-75cb7b00f89bfaba @reviewed M12-DOC: implementação lida. */
  public constructor(public readonly referencial: ReferencialFisico, c: ConfiguracaoCosta) {
    if (!Object.values(c).every(Number.isFinite) || c.profundidadeM <= 0 || c.larguraRampaM <= 0 || c.larguraFundoM <= 0)
      throw new Error('Geografia costeira inválida.');
    this.configuracao = Object.freeze({ ...c });
  }
  /** Calcula o fim da baía em m pela soma de início, duas rampas e fundo. @contract f-cd31d25897943ac5 @reviewed M12-DOC: implementação lida. */
  public get fimArcoM(): number { const c = this.configuracao; return c.inicioArcoM + 2 * c.larguraRampaM + c.larguraFundoM; }
  /** Devolve nível do solo radial em m: terra fora da baía, rampas lineares e fundo de profundidade declarada; não representa interface líquida rígida. @contract f-001cab4cccd76098 @reviewed M12-DOC: implementação lida. */
  public alturaSoloM(arcoM: number): number {
    const c = this.configuracao, s = arcoM - c.inicioArcoM;
    const f = Math.max(0, Math.min(1, s / c.larguraRampaM, (this.fimArcoM - arcoM) / c.larguraRampaM));
    return c.nivelMarM - c.profundidadeM * f;
  }
  /** Devolve declive dh/ds adimensional: negativo na primeira praia, positivo na última e zero fora das rampas. @contract f-4fb10a1eda3dde35 @reviewed M12-DOC: implementação lida. */
  public derivadaSolo(arcoM: number): number {
    const c = this.configuracao;
    if (arcoM > c.inicioArcoM && arcoM < c.inicioArcoM + c.larguraRampaM) return -c.profundidadeM / c.larguraRampaM;
    if (arcoM > this.fimArcoM - c.larguraRampaM && arcoM < this.fimArcoM) return c.profundidadeM / c.larguraRampaM;
    return 0;
  }
  /** Classifica ponto pelos limites abertos de arco, fundo e nível livre radial; não usa somente centro de massa para volumes de corpos. @contract f-1416282648fc5dc9 @reviewed M12-DOC: implementação lida. */
  public contemAgua(p: Vetor3): boolean {
    const s = this.referencial.posicaoHorizontalM(p), h = this.referencial.altitudeGeometricaM(p);
    return s > this.configuracao.inicioArcoM && s < this.fimArcoM
      && h < this.configuracao.nivelMarM && h > this.alturaSoloM(s);
  }
  /** Converte arco m e altura física do terreno em posição global m, pelo referencial compartilhado. @contract f-66a30d0996b2125a @reviewed M12-DOC: implementação lida. */
  public pontoSoloM(s: number): Vetor3 { return this.referencial.posicaoPorArcoM(s, this.alturaSoloM(s)); }
}
