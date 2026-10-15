import { Vetor3 } from '../Vetor3';
import type { GeografiaCosteira } from '../ambiente/GeografiaCosteira';

export interface PlanoRecorte { readonly normal: Vetor3; readonly ancoraM: Vetor3 }
/** Água incompressível prescrita, sem ondas. Interface livre radial; fundo é sólido separado. */
export class RegiaoAquatica {
  private readonly secoes: readonly { lo: number; hi: number; esquerda: PlanoRecorte; direita: PlanoRecorte }[];
  /** Configura fluido incompressível prescrito, densidade kg/m³ positiva, corrente tangencial m/s e seções laterais fixas; valida finitude/identidade. @contract f-42624cfaf3e01aed @reviewed M12-DOC: implementação lida. */
  public constructor(public readonly id: string, public readonly costa: GeografiaCosteira,
    public readonly densidadeKgM3: number, public readonly correnteTangencialMps = 0) {
    if (!id || !Number.isFinite(densidadeKgM3) || densidadeKgM3 <= 0 || !Number.isFinite(correnteTangencialMps)) throw new Error('Região aquática inválida.');
    const c = costa.configuracao, ref = costa.referencial;
    this.secoes = [[c.inicioArcoM, c.inicioArcoM + c.larguraRampaM],
      [c.inicioArcoM + c.larguraRampaM, costa.fimArcoM - c.larguraRampaM],
      [costa.fimArcoM - c.larguraRampaM, costa.fimArcoM]].map(([lo, hi]) => ({ lo, hi,
      esquerda: { normal: ref.tangencial(ref.posicaoPorArcoM(lo, 0)).multiplicar(-1), ancoraM: ref.posicaoPorArcoM(lo, 0) },
      direita: { normal: ref.tangencial(ref.posicaoPorArcoM(hi, 0)), ancoraM: ref.posicaoPorArcoM(hi, 0) } }));
  }
  /** Devolve velocidade inercial m/s da corrente prescrita na tangente local da posição; não simula ondas ou escoamento resolvido. @contract f-907ec38dbdd628c4 @reviewed M12-DOC: implementação lida. */
  public velocidadeEm(p: Vetor3): Vetor3 { return this.costa.referencial.tangencial(p).multiplicar(this.correnteTangencialMps); }
  /** Três seções disjuntas; curva livre/fundo aproximados tangencialmente na escala de cada volume.
   * @contract f-59e8555bc3b19921
   */
  public recortesEm(p: Vetor3): readonly (readonly PlanoRecorte[])[] {
    const ref = this.costa.referencial, c = this.costa.configuracao, s = ref.posicaoHorizontalM(p);
    const n = ref.radial(p), t = ref.tangencial(p), topo = ref.posicaoPorArcoM(s, c.nivelMarM);
    return this.secoes.map(({ lo, hi, esquerda, direita }) => {
      const sc = Math.max(lo + 1e-6, Math.min(hi - 1e-6, s));
      return [
        esquerda, direita,
        { normal: n, ancoraM: topo },
        { normal: n.multiplicar(-1).adicionar(t.multiplicar(this.costa.derivadaSolo(sc))), ancoraM: ref.posicaoPorArcoM(sc, this.costa.alturaSoloM(sc)) },
      ];
    });
  }
  /** Exporta parâmetros do fluido, costa e ausência explícita de ondas para rastreabilidade do modelo. @contract f-3d4037cef4dd6847 @reviewed M12-DOC: implementação lida. */
  public obterConfiguracao() {
    return { id: this.id, modelo: 'agua-incompressivel-prismas-m11-2', densidadeKgM3: this.densidadeKgM3,
      correnteTangencialMps: this.correnteTangencialMps, costa: this.costa.configuracao, ondas: false };
  }
}
