import { Objeto, type EstadoFisico } from '../objetos/base/Objeto';

export interface DefinicaoChumbadorAoSolo {
  readonly id: string;
  /** Corpo preso ao concreto/solo modelado pela superfície estática do mundo. */
  readonly objeto: Objeto;
  /** Esforço de cisalhamento ou tração que rompe o chumbador, em N. */
  readonly resistenciaN: number;
  /** @deprecated A ruptura é calculada pela reação física da junta. */
  readonly obterEsforcoSolicitadoN?: () => number;
}

/**
 * Conexão física rígida entre um Objeto e a superfície estática do solo.
 * Não é um estado global do objeto: possui resistência declarada e rompe
 * deterministicamente quando o esforço transmitido a excede.
 */
export class ChumbadorAoSolo {
  private rompido = false;
  private readonly estadoDeMontagem: EstadoFisico;
  private esforcoFisicoAtualN = 0;
  private maiorEsforcoFisicoN = 0;

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
  /** Reação mecânica calculada no passo atual, em N. */
  public get esforcoFisicoSolicitadoN(): number { return this.esforcoFisicoAtualN; }
  public get picoEsforcoFisicoN(): number { return this.maiorEsforcoFisicoN; }

  /** Avaliado antes da integração; uma ruptura libera o corpo no mesmo passo. */
  public prepararPasso(): void {
    if (this.rompido) return;
    this.esforcoFisicoAtualN = 0;
  }

  /**
   * Resolve uma junta fixa contra a fundação: a reação anula o momento linear
   * e angular produzido no passo e só então projeta a pequena deriva numérica
   * para o ponto de montagem. Se a reação exceder a resistência, o corpo é
   * liberado no próprio passo, sem reposição de estado.
   */
  public resolverRestricao(dtS: number): void {
    if (this.rompido) return;
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo temporal do chumbador inválido.');
    const estado = this.objeto.getEstadoFisico();
    const impulsoLinearNs = estado.velocidadeMps.magnitude * this.objeto.massaKg;
    const inercia = this.objeto.getMomentoInerciaKgM2();
    const impulsoAngularNsM = Math.abs(estado.velocidadeAngularRadps.x) * inercia.x
      + Math.abs(estado.velocidadeAngularRadps.y) * inercia.y
      + Math.abs(estado.velocidadeAngularRadps.z) * inercia.z;
    const bracoCaracteristicoM = Math.max(this.objeto.dimensoesM.x, this.objeto.dimensoesM.y, this.objeto.dimensoesM.z) / 2;
    const reacaoN = (impulsoLinearNs + impulsoAngularNsM / bracoCaracteristicoM) / dtS;
    this.esforcoFisicoAtualN = reacaoN;
    this.maiorEsforcoFisicoN = Math.max(this.maiorEsforcoFisicoN, reacaoN);
    if (reacaoN > this.resistenciaN) {
      this.rompido = true;
      return;
    }
    this.objeto.atualizarEstadoPeloCore({
      ...this.estadoDeMontagem,
      velocidadeMps: estado.velocidadeMps.multiplicar(0),
      velocidadeAngularRadps: estado.velocidadeAngularRadps.multiplicar(0),
    });
  }

  public get estadoDeAncoragem(): EstadoFisico { return this.estadoDeMontagem; }
}
