/** Perfil opt-in: não substitui as atmosferas históricas dos outros ensaios. */
export interface PerfilAtmosferico {
  /** Densidade kg/m³ pela altitude geométrica m; zero somente se explicitamente configurado. */
  obterDensidadeKgM3(altitudeM: number): number;
  /** Identificação serializável do modelo e domínio, para reprodução. */
  obterConfiguracao(): object;
}

export interface AmostraAtmosferaReentrada {
  readonly densidadeKgM3: number;
  readonly temperaturaC: number;
  readonly velocidadeSomMps: number;
  readonly caminhoLivreMedioM: number;
  readonly dentroDominio: boolean;
}

// Âncoras de engenharia arredondadas, inspiradas na USSA-1976 (NASA-TM-X-74335).
// Não são implementação integral do padrão. Altitude geométrica aproximada m,
// densidade kg/m³ e temperatura cinética °C. Interpolação log(rho) e linear(T).
const CAMADAS = [
  [0, 1.225, 15], [11_000, 0.36391, -56.5], [20_000, 0.08891, -56.5],
  [32_000, 0.01322, -44.5], [47_000, 0.001427, -2.5], [51_000, 0.0008616, -2.5],
  [71_000, 0.00006421, -58.5], [86_000, 0.000006958, -86.2],
  [100_000, 0.0000005604, -78.15], [120_000, 0.00000002222, 86.85],
  [150_000, 0.000000002076, 360.85], [200_000, 0.0000000002541, 581.45],
] as const;

/** Atmosfera de engenharia contínua C0; fora de 0–200 km usa cauda explícita não qualificada. */
export class PerfilAtmosfericoReentrada implements PerfilAtmosferico {
  public readonly revisao = 're-atmosfera-log-1';

  /** Amostra SI, altitude geométrica finita; T em °C, som ideal com composição fixa.
   * A cauda acima de 200 km é exponencial (H=50 km), sem corte artificial de vácuo.
   * Caminho livre médio usa lambda*rho constante: indicador, sem DSMC/composição variável.
   * Não integra estado. Testes: EnsaioReentrada.test.ts (continuidade e rarefação).
   * @contract f-b99b389a507fa67b
   */
  public amostrar(altitudeM: number): AmostraAtmosferaReentrada {
    if (!Number.isFinite(altitudeM)) throw new Error('Altitude atmosférica não finita.');
    const h = Math.max(0, altitudeM);
    let densidadeKgM3: number;
    let temperaturaC: number;
    if (h >= 200_000) {
      densidadeKgM3 = CAMADAS[11][1] * Math.exp(-(h - 200_000) / 50_000);
      temperaturaC = CAMADAS[11][2];
    } else {
      let i = 0;
      while (h > CAMADAS[i + 1][0]) i++;
      const a = CAMADAS[i], b = CAMADAS[i + 1];
      const f = (h - a[0]) / (b[0] - a[0]);
      densidadeKgM3 = Math.exp(Math.log(a[1]) + f * Math.log(b[1] / a[1]));
      temperaturaC = a[2] + f * (b[2] - a[2]);
    }
    return { densidadeKgM3, temperaturaC,
      velocidadeSomMps: Math.sqrt(1.4 * 287.05287 * (temperaturaC + 273.15)),
      caminhoLivreMedioM: densidadeKgM3 > 0 ? 6.6e-8 * 1.225 / densidadeKgM3 : Number.MAX_VALUE,
      dentroDominio: altitudeM >= 0 && altitudeM <= 200_000 };
  }

  /** Consulta densidade kg/m³ do mesmo perfil usado pela telemetria de Mach/rarefação.  @contract f-68095744d9001721 */
  public obterDensidadeKgM3(altitudeM: number): number { return this.amostrar(altitudeM).densidadeKgM3; }

  /** Exporta todas as âncoras/hipóteses; não alega fidelidade integral à USSA-1976.  @contract f-fbb89557654b1c68 */
  public obterConfiguracao(): object {
    return { revisao: this.revisao, dominioM: [0, 200_000], camadas: CAMADAS,
      interpolacao: 'log-rho/linear-T; C0; geometria aproximada',
      cauda: 'acima de 200 km: H=50000 m e T constante; fora do domínio',
      fonte: 'https://ntrs.nasa.gov/citations/19770009539',
      limites: 'Âncoras arredondadas; sem atividade solar, composição variável ou rotação terrestre.' };
  }
}
