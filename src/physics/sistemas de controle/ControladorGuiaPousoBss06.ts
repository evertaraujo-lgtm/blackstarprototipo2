import { AletaAerodinamica } from '../objetos/componentes/AletaAerodinamica';
import { PropulsorVetorizado } from '../objetos/propulsao/PropulsorVetorizado';
import { ControladorAletasAerodinamicas } from './ControladorAletasAerodinamicas';

export interface LeiturasGuiaPousoBss06 {
  readonly erroHorizontalM: number;
  readonly velocidadeHorizontalMps: number;
  readonly velocidadeVerticalMps: number;
  readonly orientacaoRad: number;
  readonly velocidadeAngularRadps: number;
  readonly massaKg: number;
  readonly empuxoN: number;
}

/** Coordena gimbal e grid fins para reduzir erro horizontal durante a descida. */
export class ControladorGuiaPousoBss06 {
  private readonly controladorAletas: ControladorAletasAerodinamicas;

  public constructor(
    aletas: readonly AletaAerodinamica[],
    private readonly propulsor: PropulsorVetorizado,
    private readonly estaEnergizado: () => boolean,
  ) {
    this.controladorAletas = new ControladorAletasAerodinamicas(aletas, estaEnergizado);
  }

  public atualizar(leituras: LeiturasGuiaPousoBss06): void {
    if (!Object.values(leituras).every(Number.isFinite)) throw new Error('Leituras de guia do BSS-006 devem ser finitas.');
    if (!this.estaEnergizado() || leituras.velocidadeVerticalMps >= -0.1) return;

    const velocidadeLateralAlvoMps = limitar(leituras.erroHorizontalM * 0.12 - leituras.velocidadeHorizontalMps * 1.4, -18, 18);
    const aceleracaoHorizontalAlvoMps2 = limitar(velocidadeLateralAlvoMps * 0.18, -3, 3);
    const empuxoDisponivelN = Math.max(leituras.empuxoN, 1);
    const razaoEmpuxo = limitar(aceleracaoHorizontalAlvoMps2 * leituras.massaKg / empuxoDisponivelN, -0.25, 0.25);
    const gimbal = this.propulsor.obterEstadoDaVetorizacao();
    const comandoGimbalRad = limitar(
      -Math.asin(razaoEmpuxo) + leituras.orientacaoRad * 1.4 + leituras.velocidadeAngularRadps * 0.55,
      -gimbal.limiteAngularRad,
      gimbal.limiteAngularRad,
    );
    this.propulsor.solicitarVetorizacao(comandoGimbalRad);

    // A força das aletas cresce com o quadrado da velocidade do ar. Ganhos
    // grandes saturavam o curso e faziam as grid fins dominarem o gimbal,
    // provocando overshoot lateral. Elas dão uma correção menor; o gimbal
    // fornece a maior parte da aceleração horizontal comandada.
    const velocidadeRelativaMps = Math.hypot(leituras.velocidadeHorizontalMps, leituras.velocidadeVerticalMps);
    const fatorPressaoDinamica = Math.min(1, (80 / Math.max(80, velocidadeRelativaMps)) ** 2);
    const correçãoHorizontalRad = limitar(
      (leituras.erroHorizontalM * 0.0005 - leituras.velocidadeHorizontalMps * 0.0035) * fatorPressaoDinamica,
      -0.1,
      0.1,
    );
    this.controladorAletas.atualizar(
      leituras.orientacaoRad + correçãoHorizontalRad,
      leituras.velocidadeAngularRadps,
      leituras.velocidadeVerticalMps,
    );
  }
}

const limitar = (valor: number, minimo: number, maximo: number): number => Math.max(minimo, Math.min(maximo, valor));
