import { Objeto, type EstadoFisico } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

/**
 * Guia linear planar fixada à bancada. Permite somente curso no eixo X;
 * reações em Y, Z e rotação são transmitidas à guia, que pode romper.
 */
export class GuiaLinear {
  private rompida = false;
  private esforcoAtualN = 0;
  private readonly estadoDeMontagemInicial: EstadoFisico;

  public constructor(
    public readonly id: string,
    public readonly objeto: Objeto,
    public readonly resistenciaN: number,
    public readonly eixoDeCurso: 'x' | 'y' = 'x',
  ) {
    if (!id || !Number.isFinite(resistenciaN) || resistenciaN <= 0) throw new Error('Definição de guia linear inválida.');
    this.estadoDeMontagemInicial = objeto.getEstadoFisico();
  }

  public get estaRompida(): boolean { return this.rompida; }
  public get esforcoFisicoSolicitadoN(): number { return this.esforcoAtualN; }
  public get estadoDeMontagem(): EstadoFisico { return this.estadoDeMontagemInicial; }

  /** Reação ideal da guia, após integração e contatos: somente o eixo declarado permanece livre. */
  public resolverRestricao(dtS: number): void {
    if (this.rompida) return;
    const estado = this.objeto.getEstadoFisico();
    const velocidadeBloqueadaMps = this.eixoDeCurso === 'x'
      ? Math.hypot(estado.velocidadeMps.y, estado.velocidadeMps.z)
      : Math.hypot(estado.velocidadeMps.x, estado.velocidadeMps.z);
    const inercia = this.objeto.getMomentoInerciaKgM2();
    const impulsoAngularNsM = Math.abs(estado.velocidadeAngularRadps.x) * inercia.x
      + Math.abs(estado.velocidadeAngularRadps.y) * inercia.y
      + Math.abs(estado.velocidadeAngularRadps.z) * inercia.z;
    this.esforcoAtualN = ((velocidadeBloqueadaMps * this.objeto.massaKg) + (impulsoAngularNsM / Math.max(this.objeto.dimensoesM.x / 2, 1e-6))) / dtS;
    if (this.esforcoAtualN > this.resistenciaN) { this.rompida = true; return; }
    this.objeto.atualizarEstadoPeloCore({
      ...estado,
      posicaoM: this.eixoDeCurso === 'x'
        ? new Vetor3(estado.posicaoM.x, this.estadoDeMontagemInicial.posicaoM.y, this.estadoDeMontagemInicial.posicaoM.z)
        : new Vetor3(this.estadoDeMontagemInicial.posicaoM.x, estado.posicaoM.y, this.estadoDeMontagemInicial.posicaoM.z),
      orientacaoRad: this.estadoDeMontagemInicial.orientacaoRad,
      velocidadeMps: this.eixoDeCurso === 'x' ? new Vetor3(estado.velocidadeMps.x, 0, 0) : new Vetor3(0, estado.velocidadeMps.y, 0),
      velocidadeAngularRadps: Vetor3.zero,
    });
  }
}
