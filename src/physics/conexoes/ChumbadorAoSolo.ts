import { Objeto, type EstadoFisico } from '../objetos/base/Objeto';

export interface DefinicaoChumbadorAoSolo {
  readonly id: string;
  /** Corpo preso ao concreto/solo modelado pela superfície estática do mundo. */
  readonly objeto: Objeto;
  /** Esforço de cisalhamento ou tração que rompe o chumbador, em N. */
  readonly resistenciaN: number;
  /** Esforço físico transmitido ao chumbador no passo atual. */
  readonly obterEsforcoSolicitadoN: () => number;
}

/**
 * Conexão física rígida entre um Objeto e a superfície estática do solo.
 * Não é um estado global do objeto: possui resistência declarada e rompe
 * deterministicamente quando o esforço transmitido a excede.
 */
export class ChumbadorAoSolo {
  private rompido = false;
  private readonly estadoDeMontagem: EstadoFisico;

  public constructor(private readonly definicao: DefinicaoChumbadorAoSolo) {
    if (!definicao.id || !Number.isFinite(definicao.resistenciaN) || definicao.resistenciaN <= 0) {
      throw new Error('Definição de chumbador ao solo inválida.');
    }
    this.estadoDeMontagem = definicao.objeto.getEstadoFisico();
  }

  public get id(): string { return this.definicao.id; }
  public get objeto(): Objeto { return this.definicao.objeto; }
  public get resistenciaN(): number { return this.definicao.resistenciaN; }
  public get estaRompido(): boolean { return this.rompido; }

  /** Avaliado antes da integração; uma ruptura libera o corpo no mesmo passo. */
  public prepararPasso(): void {
    if (this.rompido) return;
    if (Math.abs(this.definicao.obterEsforcoSolicitadoN()) > this.resistenciaN) this.rompido = true;
  }

  /** Reação rígida do concreto enquanto o chumbador permanece íntegro. */
  public restringirObjetoAoSolo(): void {
    if (!this.rompido) this.objeto.atualizarEstadoPeloCore(this.estadoDeMontagem);
  }
}
