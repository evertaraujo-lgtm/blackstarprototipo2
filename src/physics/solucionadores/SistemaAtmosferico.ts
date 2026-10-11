import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

/** Modelo atmosférico determinístico para o passo físico atual. */
export class SistemaAtmosferico {
  private static readonly densidadeReferenciaKgM3 = 1.225;
  private static readonly temperaturaNivelMarK = 288.15;
  private static readonly gradienteTermicoTroposferaKPorM = 0.0065;
  private static readonly constanteArSecoJPorKgK = 287.05287;
  private static readonly gravidadeMps2 = 9.80665;
  private static readonly altitudeTropopausaM = 11_000;
  private static readonly temperaturaTropopausaK = 216.65;
  public constructor(
    public readonly densidadeArNivelMarKgM3: number,
    public readonly velocidadeArMps: Vetor3,
  ) {
    if (!Number.isFinite(densidadeArNivelMarKgM3) || densidadeArNivelMarKgM3 < 0) {
      throw new Error('Densidade atmosférica deve ser finita e não negativa.');
    }
  }

  /** Densidade atmosférica padrão terrestre pela altitude geométrica, escalada pela densidade configurada ao nível do mar. */
  public obterDensidadeArKgM3(altitudeM: number): number {
    if (!Number.isFinite(altitudeM)) throw new Error('Altitude atmosférica deve ser finita.');
    if (this.densidadeArNivelMarKgM3 === 0) return 0;
    const altitude = Math.max(0, altitudeM);
    const densidadePadrao = SistemaAtmosferico.calcularDensidadePadrao(altitude);
    return densidadePadrao * (this.densidadeArNivelMarKgM3 / SistemaAtmosferico.densidadeReferenciaKgM3);
  }

  /** Arrasto em N, sempre oposto à velocidade relativa ao ar. */
  public calcularArrasto(objeto: Objeto, velocidadeMps: Vetor3): Vetor3 {
    const densidadeArKgM3 = this.obterDensidadeArKgM3(objeto.getEstadoFisico().posicaoM.y);
    if (densidadeArKgM3 === 0) return Vetor3.zero;
    const velocidadeRelativa = velocidadeMps.subtrair(this.velocidadeArMps);
    const moduloVelocidade = velocidadeRelativa.magnitude;
    if (moduloVelocidade === 0) return Vetor3.zero;
    const areaFrontalM2 = objeto.getAreaArrastoEfetivaM2(velocidadeRelativa);
    if (areaFrontalM2 === 0) return Vetor3.zero;
    const magnitudeArrastoN = 0.5 * densidadeArKgM3
      * objeto.getCoeficienteArrastoEfetivo(velocidadeRelativa) * areaFrontalM2 * moduloVelocidade ** 2;
    return velocidadeRelativa.multiplicar(-magnitudeArrastoN / moduloVelocidade);
  }

  private static calcularDensidadePadrao(altitudeM: number): number {
    const altitude = Math.max(0, altitudeM);
    const constante = SistemaAtmosferico.constanteArSecoJPorKgK;
    const gravidade = SistemaAtmosferico.gravidadeMps2;
    const temperaturaNivelMar = SistemaAtmosferico.temperaturaNivelMarK;
    const gradiente = SistemaAtmosferico.gradienteTermicoTroposferaKPorM;
    const altitudeTropopausa = SistemaAtmosferico.altitudeTropopausaM;
    const temperaturaTropopausa = SistemaAtmosferico.temperaturaTropopausaK;

    if (altitude <= altitudeTropopausa) {
      const temperatura = temperaturaNivelMar - gradiente * altitude;
      const expoente = gravidade / (constante * gradiente) - 1;
      return SistemaAtmosferico.densidadeReferenciaKgM3 * (temperatura / temperaturaNivelMar) ** expoente;
    }

    const pressaoRelativaNaTropopausa = (temperaturaTropopausa / temperaturaNivelMar)
      ** (gravidade / (constante * gradiente));
    const taxaDecaimento = gravidade / (constante * temperaturaTropopausa);
    return SistemaAtmosferico.densidadeReferenciaKgM3 * pressaoRelativaNaTropopausa
      * Math.exp(-taxaDecaimento * (altitude - altitudeTropopausa))
      * (temperaturaNivelMar / temperaturaTropopausa);
  }
}
