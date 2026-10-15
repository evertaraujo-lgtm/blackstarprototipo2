import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

export interface DefinicaoBateria extends DefinicaoObjeto {
  /** Tensão nominal entregue aos consumidores, em V. */
  readonly tensaoNominalV: number;
  /** Energia máxima armazenável, em J. */
  readonly capacidadeEnergiaJ: number;
  /** Energia disponível no início da simulação, em J. */
  readonly energiaInicialJ: number;
}

/** Fonte elétrica física com carga finita; sua massa e integridade pertencem ao mundo. */
export class Bateria extends Objeto {
  public readonly tipoCorrente = 'CC' as const;
  private energiaAtualJ: number;

  /** Cria corpo-fonte CC com tensão V/capacidade J positivas e carga inicial J dentro da capacidade; configura energia armazenada real. @contract f-b8dcea8c991456f9 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicaoBateria: DefinicaoBateria) {
    super(definicaoBateria);
    if (!Number.isFinite(definicaoBateria.tensaoNominalV) || definicaoBateria.tensaoNominalV <= 0 ||
      !Number.isFinite(definicaoBateria.capacidadeEnergiaJ) || definicaoBateria.capacidadeEnergiaJ <= 0 ||
      !Number.isFinite(definicaoBateria.energiaInicialJ) || definicaoBateria.energiaInicialJ < 0 ||
      definicaoBateria.energiaInicialJ > definicaoBateria.capacidadeEnergiaJ) {
      throw new Error('Definição de bateria inválida.');
    }
    this.energiaAtualJ = definicaoBateria.energiaInicialJ;
  }

  /** Consulta tensão nominal CC em V. @contract f-d9085251e42f3bf4 @reviewed M12-DOC: implementação lida. */
  public get tensaoNominalV(): number { return this.definicaoBateria.tensaoNominalV; }
  /** Consulta capacidade máxima armazenável em J. @contract f-c3590d9bb62388dd @reviewed M12-DOC: implementação lida. */
  public get capacidadeEnergiaJ(): number { return this.definicaoBateria.capacidadeEnergiaJ; }
  /** Consulta reserva atual em J. @contract f-56179655f481d8b5 @reviewed M12-DOC: implementação lida. */
  public get energiaArmazenadaJ(): number { return this.energiaAtualJ; }
  /** Calcula carga inicial menos reserva atual em J; recarga pode tornar diferença negativa, não é contador cumulativo de retirada. @contract f-5d67befcdd4f7e14 @reviewed M12-DOC: implementação lida. */
  public get energiaConsumidaJ(): number { return this.capacidadeEnergiaInicialJ - this.energiaAtualJ; }
  /** Devolve reserva/capacidade como fração adimensional, não percentual de 0 a 100. @contract f-03ab47176bda2fa3 @reviewed M12-DOC: implementação lida. */
  public get percentualDeCarga(): number { return this.energiaAtualJ / this.capacidadeEnergiaJ; }
  /** Verifica energia armazenada exatamente zero. @contract f-d7a03d6e0a98e6ae @reviewed M12-DOC: implementação lida. */
  public get estaDescarregada(): boolean { return this.energiaAtualJ === 0; }

  /** Entrega somente a energia efetivamente armazenada, em J.
   * @remarks Valida pedido J não negativo/finito, retira min(pedido,reserva) e devolve J fornecidos; a limitação por circuito/integridade pertence à porta consumidora.
   * @contract f-5222e0ea22c8fb11
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public fornecerEnergia(energiaSolicitadaJ: number): number {
    if (!Number.isFinite(energiaSolicitadaJ) || energiaSolicitadaJ < 0) throw new Error('Energia solicitada inválida.');
    const fornecida = Math.min(energiaSolicitadaJ, this.energiaAtualJ);
    this.energiaAtualJ -= fornecida;
    return fornecida;
  }

  /** Armazena energia recebida por uma conexão de carga, em J.
   * @remarks Valida aporte J não negativo/finito e armazena até capacidade restante; devolve J aceitos, sem ultrapassar capacidade.
   * @contract f-73dcc4f9baa55b2f
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public receberEnergia(energiaRecebidaJ: number): number {
    if (!Number.isFinite(energiaRecebidaJ) || energiaRecebidaJ < 0) throw new Error('Energia recebida inválida.');
    const armazenada = Math.min(energiaRecebidaJ, this.capacidadeEnergiaJ - this.energiaAtualJ);
    this.energiaAtualJ += armazenada;
    return armazenada;
  }

  /** Consulta referência inicial configurada em J para cálculo de diferença de carga. @contract f-0c25e782081f9c8e @reviewed M12-DOC: implementação lida. */
  private get capacidadeEnergiaInicialJ(): number { return this.definicaoBateria.energiaInicialJ; }
}
