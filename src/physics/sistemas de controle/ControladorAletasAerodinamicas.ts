import { AletaAerodinamica } from '../objetos/componentes/AletaAerodinamica';

/** Amortece atitude e rotação usando superfícies móveis durante a descida. */
export class ControladorAletasAerodinamicas {
  /** Exige ao menos uma aleta, ganhos e limiar de velocidade finitos não negativos; guarda portas dos atuadores e de energização. @contract f-63d060f8a840b02f @reviewed M12-DOC: implementação lida. */
  public constructor(
    private readonly aletas: readonly AletaAerodinamica[],
    private readonly estaEnergizado: /** Consulta permissivo elétrico/controle antes de calcular/aplicar solicitações do controlador; seleção operacional continua separada da alimentação. @contract f-b36a1b76ce28fe27 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => boolean = /** Devolve `true`. Efeitos indiretos seguem as dependências chamadas. @contract f-4600f6df1f57af59 */
                                                     () => true,
    private readonly ganhoAtitude = 1.8,
    private readonly ganhoVelocidadeAngular = 0.65,
    private readonly velocidadeMinimaDeAcionamentoMps = 8,
  ) {
    if (aletas.length === 0) throw new Error('Controlador requer ao menos uma aleta.');
    if (![ganhoAtitude, ganhoVelocidadeAngular, velocidadeMinimaDeAcionamentoMps].every((v) => Number.isFinite(v) && v >= 0)) {
      throw new Error('Ganhos e limiar de acionamento devem ser finitos e não negativos.');
    }
  }

  /** Valida atitude rad, taxa rad/s e velocidade vertical m/s; se energizado, solicita deflexão proporcional à atitude/taxa somente na descida acima do limiar de fluxo, senão solicita zero. Sem energia retorna sem novo comando; não produz torque diretamente. @contract f-e96f09b928457ac3 @reviewed M12-DOC: implementação lida. */
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
