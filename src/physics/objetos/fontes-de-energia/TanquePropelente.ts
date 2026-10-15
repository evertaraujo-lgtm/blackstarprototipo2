import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

export interface DefinicaoTanquePropelente extends DefinicaoObjeto {
  readonly tipoPropelente: string;
  readonly capacidadePropelenteKg: number;
  readonly massaPropelenteInicialKg: number;
}

/** Tanque físico: o propelente compõe sua massa instantânea. */
export class TanquePropelente extends Objeto {
  private massaPropelenteAtualKg: number;
  /** Cria tanque com substância declarada, capacidade kg positiva e carga inicial dentro da capacidade; integra propelente à massa variável do Objeto. @contract f-5e48dc8f6370a867 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicaoTanque: DefinicaoTanquePropelente) {
    super(definicaoTanque);
    if (!definicaoTanque.tipoPropelente || definicaoTanque.capacidadePropelenteKg <= 0 || definicaoTanque.massaPropelenteInicialKg < 0 || definicaoTanque.massaPropelenteInicialKg > definicaoTanque.capacidadePropelenteKg) throw new Error('Definição de tanque inválida.');
    this.massaPropelenteAtualKg = definicaoTanque.massaPropelenteInicialKg;
    this.definirMassaVariavelKg(this.massaPropelenteAtualKg);
  }
  /** Consulta identificador da substância, utilizado na compatibilidade de alimentação. @contract f-3dfaa0164fd71bf8 @reviewed M12-DOC: implementação lida. */
  public get tipoPropelente(): string { return this.definicaoTanque.tipoPropelente; }
  /** Consulta reserva física atual de propelente em kg. @contract f-546ec33c9af0b032 @reviewed M12-DOC: implementação lida. */
  public get massaPropelenteKg(): number { return this.massaPropelenteAtualKg; }
  /** Consulta referência da carga inicial em kg. @contract f-bf62d1198fab053a @reviewed M12-DOC: implementação lida. */
  public get massaPropelenteInicialKg(): number { return this.definicaoTanque.massaPropelenteInicialKg; }
  /** Calcula diferença entre massa inicial e reserva atual em kg. @contract f-fe1efc22215c4396 @reviewed M12-DOC: implementação lida. */
  public get massaPropelenteConsumidaKg(): number { return this.massaPropelenteInicialKg - this.massaPropelenteAtualKg; }
  /** Valida pedido kg finito/não negativo, retira até reserva disponível e atualiza massa variável do corpo; retorna kg efetivamente fornecidos. @contract f-97139e57f56d9e7f @reviewed M12-DOC: implementação lida. */
  public fornecerPropelente(massaSolicitadaKg: number): number {
    if (!Number.isFinite(massaSolicitadaKg) || massaSolicitadaKg < 0) throw new Error('Massa solicitada inválida.');
    const fornecida = Math.min(massaSolicitadaKg, this.massaPropelenteAtualKg);
    this.massaPropelenteAtualKg -= fornecida;
    this.definirMassaVariavelKg(this.massaPropelenteAtualKg);
    return fornecida;
  }
}
