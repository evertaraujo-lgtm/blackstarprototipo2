import { AletaAerodinamica } from '../objetos/componentes/AletaAerodinamica';

/** Amortece atitude e rotação usando superfícies móveis durante a descida. */
export class ControladorAletasAerodinamicas {
  public constructor(
    private readonly aletas: readonly AletaAerodinamica[],
    private readonly estaEnergizado: () => boolean = () => true,
    private readonly ganhoAtitude = 1.8,
    private readonly ganhoVelocidadeAngular = 0.65,
    private readonly velocidadeMinimaDeAcionamentoMps = 8,
  ) {
    if (aletas.length === 0) throw new Error('Controlador requer ao menos uma aleta.');
    if (![ganhoAtitude, ganhoVelocidadeAngular, velocidadeMinimaDeAcionamentoMps].every((v) => Number.isFinite(v) && v >= 0)) {
      throw new Error('Ganhos e limiar de acionamento devem ser finitos e não negativos.');
    }
  }

  public atualizar(orientacaoRad: number, velocidadeAngularRadps: number, velocidadeVerticalMps: number): void {
    if (![orientacaoRad, velocidadeAngularRadps, velocidadeVerticalMps].every(Number.isFinite)) {
      throw new Error('Leituras do controlador devem ser finitas.');
    }
    if (!this.estaEnergizado()) return;
    const descendoComFluxo = velocidadeVerticalMps < -this.velocidadeMinimaDeAcionamentoMps;
    const comando = descendoComFluxo
      ? this.ganhoAtitude * orientacaoRad + this.ganhoVelocidadeAngular * velocidadeAngularRadps
      : 0;
    for (const aleta of this.aletas) aleta.solicitarDeflexaoRad(comando);
  }
}
