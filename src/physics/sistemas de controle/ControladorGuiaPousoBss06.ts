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
    // Com o motor cortado, a atitude desejada continua limitada pela gravidade;
    // dividir por empuxo quase zero saturava o gimbal na aproximação final.
    const empuxoDisponivelN = Math.max(leituras.empuxoN, leituras.massaKg * 9.80665, 1);
    const razaoEmpuxo = limitar(aceleracaoHorizontalAlvoMps2 * leituras.massaKg / empuxoDisponivelN, -0.25, 0.25);
    const gimbal = this.propulsor.obterEstadoDaVetorizacao();
    // Rotação positiva inclina o topo para -X. Para acelerar em +X, o
    // casco precisa de uma atitude negativa. O gimbal inferior e as aletas
    // superiores devem produzir torque no mesmo sentido para atingir essa
    // atitude; comandar somente a força lateral do motor invertia a resposta
    // após a rotação do conjunto e realimentava a deriva durante a descida.
    const atitudeAlvoRad = -Math.asin(razaoEmpuxo);
    const erroAtitudeRad = leituras.orientacaoRad - atitudeAlvoRad;
    const comandoGimbalRad = limitar(
      erroAtitudeRad * 1.4 + leituras.velocidadeAngularRadps * 0.55,
      -gimbal.limiteAngularRad,
      gimbal.limiteAngularRad,
    );
    this.propulsor.solicitarVetorizacao(comandoGimbalRad);

    // Escalar toda a correção pela pressão dinâmica preserva a autoridade
    // angular em altas velocidades, sem saturar o curso das grid fins.
    const velocidadeRelativaMps = Math.hypot(leituras.velocidadeHorizontalMps, leituras.velocidadeVerticalMps);
    const fatorPressaoDinamica = Math.min(1, (80 / Math.max(80, velocidadeRelativaMps)) ** 2);
    this.controladorAletas.atualizar(
      erroAtitudeRad * fatorPressaoDinamica,
      leituras.velocidadeAngularRadps * fatorPressaoDinamica,
      leituras.velocidadeVerticalMps,
    );
  }
}

const limitar = (valor: number, minimo: number, maximo: number): number => Math.max(minimo, Math.min(maximo, valor));
