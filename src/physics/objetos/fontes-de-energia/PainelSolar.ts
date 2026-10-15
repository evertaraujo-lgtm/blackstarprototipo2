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

  /** Inicializa objeto, valida área m²/irradiância W/m²/eficiência e estado de abertura; cria conexão de carga de 20 m com resistência 0,05 Ω e corrente dimensionada para 24 V. @contract f-d2af793969491d0e @reviewed M12-DOC: implementação lida. */
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
  /** Muda abertura operacional; dobrar zera imediatamente potência/orçamento do passo. Não modifica massa nem integridade. @contract f-27389102f08cbd7e @reviewed M12-DOC: implementação lida. */
  public definirStatus(status: StatusPainelSolar): void {
    this.statusAtual = status;
    if (status === 'dobrado') {
      this.potenciaAtualCalculadaW = 0;
      this.energiaDisponivelNoPassoCalculadaJ = 0;
    }
  }
  /** Para dt positivo s calcula potência por irradiância×área×eficiência×iluminação se desdobrado, e energia disponível em J; sobrescreve orçamento do passo. @contract f-457240864bf92686 @reviewed M12-DOC: implementação lida. */
  public override prepararPassoEnergetico(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt do painel solar inválido.');
    this.potenciaAtualCalculadaW = this.estaDesdobrado
      ? this.config.irradianciaWPorM2 * this.config.areaAtivaM2 * this.config.eficiencia * this.fatorIluminacao
      : 0;
    this.energiaDisponivelNoPassoCalculadaJ = this.potenciaAtualCalculadaW * dtS;
  }
  /** Entrega no máximo pedido válido e orçamento solar atual; desconta disponibilidade e acumula energia efetivamente entregue, sem reserva oculta. @contract f-0fa9889c284193a4 @reviewed M12-DOC: implementação lida. */
  public fornecerEnergia(energiaSolicitadaJ: number): number {
    if (!Number.isFinite(energiaSolicitadaJ) || energiaSolicitadaJ < 0) throw new Error('Energia solicitada inválida.');
    const entregue = Math.min(energiaSolicitadaJ, this.energiaDisponivelNoPassoCalculadaJ);
    this.energiaDisponivelNoPassoCalculadaJ -= entregue;
    this.energiaGeradaCalculadaJ += entregue;
    return entregue;
  }
  /** Prepara conexão e transfere orçamento do passo ao destino pelo circuito, respeitando perdas/limites da conexão. @contract f-76648f7c5d24d674 @reviewed M12-DOC: implementação lida. */
  public override prepararPassoOperacional(dtS: number): void {
    this.conexaoCarga.prepararPasso(dtS);
    this.conexaoCarga.transferirEnergiaParaDestino(this.energiaDisponivelNoPassoCalculadaJ);
  }
}
