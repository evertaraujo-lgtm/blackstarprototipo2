import { Vetor3 } from '../Vetor3';

/** Constantes de referência; g0 de Isp não é a gravidade superficial μ/R². */
export const TERRA = Object.freeze({ raioM: 6_371_000, muM3S2: 3.986004418e14, g0Mps2: 9.80665 });

export interface CampoGravitacional {
  readonly modelo: 'uniforme' | 'central';
  aceleracaoEm(posicaoM: Vetor3): Vetor3;
  obterConfiguracao(): object;
}

export class CampoUniforme implements CampoGravitacional {
  public readonly modelo = 'uniforme';
  public constructor(public readonly aceleracaoMps2 = new Vetor3(0, -TERRA.g0Mps2, 0)) {}
  public aceleracaoEm(_posicaoM: Vetor3): Vetor3 { return this.aceleracaoMps2; }
  public obterConfiguracao(): object { return { modelo: this.modelo, aceleracaoMps2: this.aceleracaoMps2 }; }
}

/** Campo pontual exterior. Não regulariza o centro nem modela o interior planetário. */
export class CampoCentral implements CampoGravitacional {
  public readonly modelo = 'central';
  public constructor(
    public readonly centroM = new Vetor3(0, -TERRA.raioM, 0),
    public readonly muM3S2: number = TERRA.muM3S2,
  ) {
    if (!Number.isFinite(muM3S2) || muM3S2 <= 0) throw new Error('μ deve ser positivo e finito em m³/s².');
  }
  public aceleracaoEm(posicaoM: Vetor3): Vetor3 {
    const r = posicaoM.subtrair(this.centroM);
    const distanciaM = r.magnitude;
    if (distanciaM === 0 || !Number.isFinite(distanciaM)) throw new Error('Posição singular ou não finita no campo central.');
    // Normalização antes do produto evita formar |r|³, que pode transbordar.
    const intensidade = this.muM3S2 / distanciaM / distanciaM;
    if (!Number.isFinite(intensidade)) throw new Error('Aceleração central fora do domínio numérico.');
    return r.multiplicar(1 / distanciaM).multiplicar(-intensidade);
  }
  public obterConfiguracao(): object { return { modelo: this.modelo, centroM: this.centroM, muM3S2: this.muM3S2 }; }
}
