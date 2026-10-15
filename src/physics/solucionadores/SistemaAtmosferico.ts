import { ReferencialPlano, type ReferencialFisico } from '../ambiente/ReferencialFisico';
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
  private velocidadeArAtualMps: Vetor3;
  /** Configura densidade de referência kg/m³ não negativa, vento m/s, referencial e política de altitude; densidade zero declara vácuo. @contract f-6538ff18b9c53fb0 @reviewed M12-DOC: implementação lida. */
  public constructor(
    public readonly densidadeArNivelMarKgM3: number,
    velocidadeArMps: Vetor3,
    private readonly referencial: ReferencialFisico = new ReferencialPlano(),
    public readonly politicaAltitude: 'extrapolacao-legada' | 'vacuo-simplificado-25km' = 'extrapolacao-legada',
    private readonly exposicaoAoAr: /** Consulta fração exposta ao ar do objeto, em [0,1], para evitar cargas atmosféricas/térmicas integrais sobre área imersa; padrão seco vale 1. @contract f-833d68305cbc6047 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ (o: Objeto) => number = /** Porta padrão de exposição: retorna fração 1 (totalmente no ar) quando mundo não fornece adaptação para imersão; não consulta nem aplica força. @contract f-e36b63fcec6139c0 @reviewed M12-DOC: implementação lida. */
                                                            () => 1,
  ) {
    if (!Number.isFinite(densidadeArNivelMarKgM3) || densidadeArNivelMarKgM3 < 0) {
      throw new Error('Densidade atmosférica deve ser finita e não negativa.');
    }
    this.velocidadeArAtualMps = velocidadeArMps;
  }

  /** Consulta vetor de vento inercial atual m/s, sem acrescentar rotação terrestre. @contract f-23e6578a21b8215b @reviewed M12-DOC: implementação lida. */
  public get velocidadeArMps(): Vetor3 { return this.velocidadeArAtualMps; }

  /** Atualiza o campo de vento calculado pelo MundoFisico no tempo de missão.
   * @contract f-2b119b7545bff7c0
   */
  public definirVelocidadeArPeloMundo(velocidadeArMps: Vetor3): void {
    this.velocidadeArAtualMps = velocidadeArMps;
  }

  /** Densidade atmosférica padrão terrestre pela altitude geométrica, escalada pela densidade configurada ao nível do mar.
   * @contract f-9f2bc0b195591180
   */
  public obterDensidadeArKgM3(altitudeM: number): number {
    if (!Number.isFinite(altitudeM)) throw new Error('Altitude atmosférica deve ser finita.');
    if (this.densidadeArNivelMarKgM3 === 0) return 0;
    const altitude = Math.max(0, altitudeM);
    const densidadePadrao = SistemaAtmosferico.calcularDensidadePadrao(altitude);
    // Faixa M4 preservada até 20 km. Transição C1 explicitamente simplificada,
    // não modelo da alta atmosfera nem fronteira física do espaço.
    const x = Math.max(0, Math.min(1, (altitude - 20_000) / 5_000));
    const fator = this.politicaAltitude === 'vacuo-simplificado-25km' ? 1 - x * x * (3 - 2 * x) : 1;
    return fator * densidadePadrao * (this.densidadeArNivelMarKgM3 / SistemaAtmosferico.densidadeReferenciaKgM3);
  }

  /** Converte posição global m em altitude geométrica pelo referencial antes de calcular densidade kg/m³. @contract f-71ad791fb42263b2 @reviewed M12-DOC: implementação lida. */
  public obterDensidadeNaPosicaoKgM3(p: Vetor3): number {
    return this.obterDensidadeArKgM3(this.referencial.altitudeGeometricaM(p));
  }

  /** Arrasto em N, sempre oposto à velocidade relativa ao ar.
   * @contract f-f2ba5ae908f4b022
   */
  public calcularArrasto(objeto: Objeto, velocidadeMps: Vetor3): Vetor3 {
    const densidadeArKgM3 = this.obterDensidadeNaPosicaoKgM3(objeto.getEstadoFisico().posicaoM);
    if (densidadeArKgM3 === 0) return Vetor3.zero;
    const velocidadeRelativa = velocidadeMps.subtrair(this.velocidadeArMps);
    const moduloVelocidade = velocidadeRelativa.magnitude;
    if (moduloVelocidade === 0) return Vetor3.zero;
    const areaFrontalM2 = objeto.getAreaArrastoEfetivaM2(velocidadeRelativa);
    if (areaFrontalM2 === 0) return Vetor3.zero;
    const magnitudeArrastoN = 0.5 * densidadeArKgM3
      * objeto.getCoeficienteArrastoEfetivo(velocidadeRelativa) * areaFrontalM2 * moduloVelocidade ** 2 * this.exposicaoAoAr(objeto);
    return velocidadeRelativa.multiplicar(-magnitudeArrastoN / moduloVelocidade);
  }

  /** Calcula perfil hidrostático de troposfera até 11 km e camada isotérmica acima; usa constantes atmosféricas de referência, sem representar alta atmosfera fielmente. @contract f-8e4e8dfbeab6ea7d @reviewed M12-DOC: implementação lida. */
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
