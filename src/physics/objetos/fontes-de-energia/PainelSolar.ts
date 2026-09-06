import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

export interface DefinicaoPainelSolar extends DefinicaoObjeto {
  readonly areaAtivaM2: number;
  readonly irradianciaWPorM2: number;
  readonly eficiencia: number;
  readonly destino: Objeto & { receberEnergia(energiaJ: number): number };
  readonly obterFatorIluminacao?: () => number;
}

/** Fonte CC solar simplificada, preparada para uma futura geometria do Sol. */
export class PainelSolar extends Objeto {
  public readonly tipoCorrente = 'CC' as const;
  public readonly conexaoCarga: ConexaoEletrica;
  private energiaDisponivelNoPassoCalculadaJ = 0;
  private energiaGeradaCalculadaJ = 0;
  private potenciaAtualCalculadaW = 0;

  public constructor(private readonly config: DefinicaoPainelSolar) {
    super(config);
    if (![config.areaAtivaM2, config.irradianciaWPorM2, config.eficiencia].every(Number.isFinite) ||
      config.areaAtivaM2 <= 0 || config.irradianciaWPorM2 < 0 || config.eficiencia <= 0 || config.eficiencia > 1) {
      throw new Error('Definição de painel solar inválida.');
    }
    this.conexaoCarga = new ConexaoEletrica({
      id: `cabo-${config.id}-carga`, fonte: this, destino: config.destino,
      comprimentoMaximoM: 20, correnteMaximaA: config.irradianciaWPorM2 * config.areaAtivaM2 * config.eficiencia / 24,
      resistenciaCaboOhm: 0.05, inicialmenteLigada: true,
    });
  }
  public get tensaoNominalV(): number { return 24; }
  public get energiaArmazenadaJ(): number { return Infinity; }
  public get estaDescarregada(): boolean { return false; }
  public get energiaDisponivelNoPassoJ(): number { return this.energiaDisponivelNoPassoCalculadaJ; }
  public get energiaGeradaJ(): number { return this.energiaGeradaCalculadaJ; }
  public get potenciaAtualW(): number { return this.potenciaAtualCalculadaW; }
  public get fatorIluminacao(): number { return Math.max(0, Math.min(1, this.config.obterFatorIluminacao?.() ?? 1)); }
  public override prepararPassoEnergetico(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt do painel solar inválido.');
    this.potenciaAtualCalculadaW = this.config.irradianciaWPorM2 * this.config.areaAtivaM2 * this.config.eficiencia * this.fatorIluminacao;
    this.energiaDisponivelNoPassoCalculadaJ = this.potenciaAtualCalculadaW * dtS;
  }
  public fornecerEnergia(energiaSolicitadaJ: number): number {
    if (!Number.isFinite(energiaSolicitadaJ) || energiaSolicitadaJ < 0) throw new Error('Energia solicitada inválida.');
    const entregue = Math.min(energiaSolicitadaJ, this.energiaDisponivelNoPassoCalculadaJ);
    this.energiaDisponivelNoPassoCalculadaJ -= entregue;
    this.energiaGeradaCalculadaJ += entregue;
    return entregue;
  }
  public override prepararPassoOperacional(dtS: number): void {
    this.conexaoCarga.prepararPasso(dtS);
    this.conexaoCarga.transferirEnergiaParaDestino(this.energiaDisponivelNoPassoCalculadaJ);
  }
}
