import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

export type StatusPainelSolar = 'dobrado' | 'desdobrado';

export interface DefinicaoPainelSolar extends DefinicaoObjeto {
  readonly areaAtivaM2: number;
  readonly irradianciaWPorM2: number;
  readonly eficiencia: number;
  readonly destino: Objeto & { receberEnergia(energiaJ: number): number };
  readonly obterFatorIluminacao?: () => number;
  readonly statusInicial?: StatusPainelSolar;
}

/** Fonte CC solar simplificada, preparada para uma futura geometria do Sol. */
export class PainelSolar extends Objeto {
  public readonly tipoCorrente = 'CC' as const;
  public readonly conexaoCarga: ConexaoEletrica;
  private energiaDisponivelNoPassoCalculadaJ = 0;
  private energiaGeradaCalculadaJ = 0;
  private potenciaAtualCalculadaW = 0;
  private statusAtual: StatusPainelSolar;

  /** Escritas diretas: `this.config`, `this.statusAtual`, `this.conexaoCarga`. Dependências diretas: `super`, `[config.areaAtivaM2, config.irradianciaWPorM2, config.eficiencia].every`, `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-d2af793969491d0e */
  public constructor(private readonly config: DefinicaoPainelSolar) {
    super(config);
    if (![config.areaAtivaM2, config.irradianciaWPorM2, config.eficiencia].every(Number.isFinite) ||
      config.areaAtivaM2 <= 0 || config.irradianciaWPorM2 < 0 || config.eficiencia <= 0 || config.eficiencia > 1) {
      throw new Error('Definição de painel solar inválida.');
    }
    this.statusAtual = config.statusInicial ?? 'desdobrado';
    this.conexaoCarga = new ConexaoEletrica({
      id: `cabo-${config.id}-carga`, fonte: this, destino: config.destino,
      comprimentoMaximoM: 20, correnteMaximaA: config.irradianciaWPorM2 * config.areaAtivaM2 * config.eficiencia / 24,
      resistenciaCaboOhm: 0.05, inicialmenteLigada: true,
    });
  }
  /** Devolve `24`. Efeitos indiretos seguem as dependências chamadas. @contract f-29c9251b5d1a10c1 */
  public get tensaoNominalV(): number { return 24; }
  /** Devolve `Infinity`. Efeitos indiretos seguem as dependências chamadas. @contract f-ad3490782cf330b7 */
  public get energiaArmazenadaJ(): number { return Infinity; }
  /** Devolve `false`. Efeitos indiretos seguem as dependências chamadas. @contract f-8d10b931f1ee6934 */
  public get estaDescarregada(): boolean { return false; }
  /** Devolve `this.energiaDisponivelNoPassoCalculadaJ`. Efeitos indiretos seguem as dependências chamadas. @contract f-0b551ed625568690 */
  public get energiaDisponivelNoPassoJ(): number { return this.energiaDisponivelNoPassoCalculadaJ; }
  /** Devolve `this.energiaGeradaCalculadaJ`. Efeitos indiretos seguem as dependências chamadas. @contract f-64949c003bbf6737 */
  public get energiaGeradaJ(): number { return this.energiaGeradaCalculadaJ; }
  /** Devolve `this.potenciaAtualCalculadaW`. Efeitos indiretos seguem as dependências chamadas. @contract f-7945df18e879ff21 */
  public get potenciaAtualW(): number { return this.potenciaAtualCalculadaW; }
  /** Devolve `this.statusAtual`. Efeitos indiretos seguem as dependências chamadas. @contract f-54fc132a98c992ee */
  public get status(): StatusPainelSolar { return this.statusAtual; }
  /** Devolve `this.statusAtual === 'desdobrado'`. Efeitos indiretos seguem as dependências chamadas. @contract f-143924efd765ee1d */
  public get estaDesdobrado(): boolean { return this.statusAtual === 'desdobrado'; }
  /** Devolve `Math.max(0, Math.min(1, this.config.obterFatorIluminacao?.() ?? 1))`. Dependências diretas: `this.config.obterFatorIluminacao`. Efeitos indiretos seguem as dependências chamadas. @contract f-a4c6ad839600ed42 */
  public get fatorIluminacao(): number { return Math.max(0, Math.min(1, this.config.obterFatorIluminacao?.() ?? 1)); }
  /** Escritas diretas: `this.statusAtual`, `this.potenciaAtualCalculadaW`, `this.energiaDisponivelNoPassoCalculadaJ`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-27389102f08cbd7e */
  public definirStatus(status: StatusPainelSolar): void {
    this.statusAtual = status;
    if (status === 'dobrado') {
      this.potenciaAtualCalculadaW = 0;
      this.energiaDisponivelNoPassoCalculadaJ = 0;
    }
  }
  /** Escritas diretas: `this.potenciaAtualCalculadaW`, `this.energiaDisponivelNoPassoCalculadaJ`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-457240864bf92686 */
  public override prepararPassoEnergetico(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt do painel solar inválido.');
    this.potenciaAtualCalculadaW = this.estaDesdobrado
      ? this.config.irradianciaWPorM2 * this.config.areaAtivaM2 * this.config.eficiencia * this.fatorIluminacao
      : 0;
    this.energiaDisponivelNoPassoCalculadaJ = this.potenciaAtualCalculadaW * dtS;
  }
  /** Devolve `entregue`. Escritas diretas: `this.energiaDisponivelNoPassoCalculadaJ`, `this.energiaGeradaCalculadaJ`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0fa9889c284193a4 */
  public fornecerEnergia(energiaSolicitadaJ: number): number {
    if (!Number.isFinite(energiaSolicitadaJ) || energiaSolicitadaJ < 0) throw new Error('Energia solicitada inválida.');
    const entregue = Math.min(energiaSolicitadaJ, this.energiaDisponivelNoPassoCalculadaJ);
    this.energiaDisponivelNoPassoCalculadaJ -= entregue;
    this.energiaGeradaCalculadaJ += entregue;
    return entregue;
  }
  /** Dependências diretas: `this.conexaoCarga.prepararPasso`, `this.conexaoCarga.transferirEnergiaParaDestino`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-76648f7c5d24d674 */
  public override prepararPassoOperacional(dtS: number): void {
    this.conexaoCarga.prepararPasso(dtS);
    this.conexaoCarga.transferirEnergiaParaDestino(this.energiaDisponivelNoPassoCalculadaJ);
  }
}
