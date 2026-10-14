import { Vetor3 } from '../Vetor3';
import type { GeografiaCosteira } from '../ambiente/GeografiaCosteira';

export interface PlanoRecorte { readonly normal: Vetor3; readonly ancoraM: Vetor3 }
/** Água incompressível prescrita, sem ondas. Interface livre radial; fundo é sólido separado. */
export class RegiaoAquatica {
  public constructor(public readonly id: string, public readonly costa: GeografiaCosteira,
    public readonly densidadeKgM3: number, public readonly correnteTangencialMps = 0) {
    if (!id || !Number.isFinite(densidadeKgM3) || densidadeKgM3 <= 0 || !Number.isFinite(correnteTangencialMps)) throw new Error('Região aquática inválida.');
  }
  public velocidadeEm(p: Vetor3): Vetor3 { return this.costa.referencial.tangencial(p).multiplicar(this.correnteTangencialMps); }
  /** Três seções disjuntas; curva livre/fundo aproximados tangencialmente na escala de cada volume. */
  public recortesEm(p: Vetor3): readonly (readonly PlanoRecorte[])[] {
    const ref = this.costa.referencial, c = this.costa.configuracao, s = ref.posicaoHorizontalM(p);
    const intervalos = [[c.inicioArcoM, c.inicioArcoM + c.larguraRampaM],
      [c.inicioArcoM + c.larguraRampaM, this.costa.fimArcoM - c.larguraRampaM],
      [this.costa.fimArcoM - c.larguraRampaM, this.costa.fimArcoM]];
    return intervalos.map(([lo, hi]) => {
      const sc = Math.max(lo + 1e-6, Math.min(hi - 1e-6, s));
      const n = ref.radial(p), t = ref.tangencial(p);
      return [
        { normal: ref.tangencial(ref.posicaoPorArcoM(lo, 0)).multiplicar(-1), ancoraM: ref.posicaoPorArcoM(lo, 0) },
        { normal: ref.tangencial(ref.posicaoPorArcoM(hi, 0)), ancoraM: ref.posicaoPorArcoM(hi, 0) },
        { normal: n, ancoraM: ref.posicaoPorArcoM(s, c.nivelMarM) },
        { normal: n.multiplicar(-1).adicionar(t.multiplicar(this.costa.derivadaSolo(sc))), ancoraM: ref.posicaoPorArcoM(sc, this.costa.alturaSoloM(sc)) },
      ];
    });
  }
  public obterConfiguracao() {
    return { id: this.id, modelo: 'agua-incompressivel-prismas-m11-2', densidadeKgM3: this.densidadeKgM3,
      correnteTangencialMps: this.correnteTangencialMps, costa: this.costa.configuracao, ondas: false };
  }
}
