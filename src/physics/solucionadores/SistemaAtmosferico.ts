import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

/** Modelo atmosférico determinístico para o passo físico atual. */
export class SistemaAtmosferico {
  public constructor(
    public readonly densidadeArKgM3: number,
    public readonly velocidadeArMps: Vetor3,
  ) {
    if (!Number.isFinite(densidadeArKgM3) || densidadeArKgM3 < 0) {
      throw new Error('Densidade atmosférica deve ser finita e não negativa.');
    }
  }

  /** Arrasto em N, sempre oposto à velocidade relativa ao ar. */
  public calcularArrasto(objeto: Objeto, velocidadeMps: Vetor3): Vetor3 {
    const areaFrontalM2 = objeto.getAreaArrastoEfetivaM2();
    if (this.densidadeArKgM3 === 0 || areaFrontalM2 === 0) return Vetor3.zero;
    const velocidadeRelativa = velocidadeMps.subtrair(this.velocidadeArMps);
    const moduloVelocidade = velocidadeRelativa.magnitude;
    if (moduloVelocidade === 0) return Vetor3.zero;
    const magnitudeArrastoN = 0.5 * this.densidadeArKgM3
      * objeto.getCoeficienteArrastoEfetivo() * areaFrontalM2 * moduloVelocidade ** 2;
    return velocidadeRelativa.multiplicar(-magnitudeArrastoN / moduloVelocidade);
  }
}
