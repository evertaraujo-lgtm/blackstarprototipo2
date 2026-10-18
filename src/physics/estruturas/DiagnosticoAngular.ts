import type { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

/** Diagnóstico SI de corpos selecionados, sem integração ou propriedade do estado. */
export interface DiagnosticoAngular {
  readonly massaKg: number;
  readonly centroM: Vetor3;
  readonly velocidadeCentroMps: Vetor3;
  readonly inerciaKgM2: number;
  readonly momentoIntrinsecoKgM2ps: number;
  readonly momentoOrbitalKgM2ps: number;
  readonly momentoTotalKgM2ps: number;
  readonly omegaInercialRadps: number;
  readonly torqueGravitacionalNm: number;
}

/** Consulta G/Vg por diferenças a uma âncora para reduzir cancelamento em escala
 * planetária. L intrínseco usa r×m(v−Vg)+Iω; orbital usa (G−C)×MVg.
 * Gravidade atua nos centros dos membros: o torque de gradiente é desse modelo,
 * não da distribuição interna de cada caixa. Posições m, velocidades m/s,
 * massas kg e aceleração m/s²; exige membros não vazios. Não escreve corpos.
 * @contract f-62f73b2d7d2e4053
   */
export function diagnosticarMomentoAngular(membros: readonly Objeto[], centroAtratorM: Vetor3,
  gravidade: (posicaoM: Vetor3) => Vetor3): DiagnosticoAngular {
  if (!membros.length) throw new Error('Diagnóstico angular exige membros.');
  const ancora = membros[0].getEstadoFisico(), massaKg = membros.reduce((s, o) => s + o.massaKg, 0);
  let centroM = ancora.posicaoM, velocidadeCentroMps = ancora.velocidadeMps;
  for (const o of membros) {
    const e = o.getEstadoFisico(), peso = o.massaKg / massaKg;
    centroM = centroM.adicionar(e.posicaoM.subtrair(ancora.posicaoM).multiplicar(peso));
    velocidadeCentroMps = velocidadeCentroMps.adicionar(e.velocidadeMps.subtrair(ancora.velocidadeMps).multiplicar(peso));
  }
  let inerciaKgM2 = 0, momentoIntrinsecoKgM2ps = 0, torqueGravitacionalNm = 0;
  const gCentro = gravidade(centroM);
  for (const o of membros) {
    const e = o.getEstadoFisico(), r = e.posicaoM.subtrair(centroM), I = o.getMomentoInerciaKgM2().z;
    inerciaKgM2 += I + o.massaKg * (r.x ** 2 + r.y ** 2);
    momentoIntrinsecoKgM2ps += r.produtoVetorial(e.velocidadeMps.subtrair(velocidadeCentroMps).multiplicar(o.massaKg)).z
      + I * e.velocidadeAngularRadps.z;
    torqueGravitacionalNm += r.produtoVetorial(gravidade(e.posicaoM).subtrair(gCentro).multiplicar(o.massaKg)).z;
  }
  const momentoOrbitalKgM2ps = centroM.subtrair(centroAtratorM).produtoVetorial(velocidadeCentroMps.multiplicar(massaKg)).z;
  return { massaKg, centroM, velocidadeCentroMps, inerciaKgM2, momentoIntrinsecoKgM2ps,
    momentoOrbitalKgM2ps, momentoTotalKgM2ps: momentoOrbitalKgM2ps + momentoIntrinsecoKgM2ps,
    omegaInercialRadps: momentoIntrinsecoKgM2ps / inerciaKgM2, torqueGravitacionalNm };
}

/** Quadratura diagnóstica, não integrador: compara ΔL medido com impulso de
 * torque gravitacional trapezoidal e torque não gravitacional fornecido.
 * Contato/ruptura/massa variável tornam o balanço incompleto e são sinalizados,
 * sem apagar resíduos ou atribuir torques não medidos. dt em s positivo.
 */
export class BalancoAngular {
  private impulsoTorqueNmS = 0;
  private residuoAcumuladoKgM2ps = 0;
  private residuoMaximoPassoKgM2ps = 0;
  private residuoPassoKgM2ps = 0;
  private passosIncompletos = 0;

  /** Acumula somente grandezas observadas; quadratura aero explícita pode ter
   * erro O(dt²) no passo com atuação variável. Não corrige rotação ou energia.
   * @contract f-22a29b5a950e9118
   */
  public registrar(antes: DiagnosticoAngular, depois: DiagnosticoAngular, dtS: number,
    torqueNaoGravitacionalNm: number, completo: boolean): void {
    if (!Number.isFinite(dtS) || dtS <= 0 || !Number.isFinite(torqueNaoGravitacionalNm)) throw new Error('Balanço angular inválido.');
    const impulso = dtS * ((antes.torqueGravitacionalNm + depois.torqueGravitacionalNm) / 2 + torqueNaoGravitacionalNm);
    this.residuoPassoKgM2ps = depois.momentoIntrinsecoKgM2ps - antes.momentoIntrinsecoKgM2ps - impulso;
    this.impulsoTorqueNmS += impulso;
    this.residuoAcumuladoKgM2ps += this.residuoPassoKgM2ps;
    this.residuoMaximoPassoKgM2ps = Math.max(this.residuoMaximoPassoKgM2ps, Math.abs(this.residuoPassoKgM2ps));
    if (!completo) this.passosIncompletos++;
  }

  /** Snapshot escalar de resíduo e quadratura; não equivale a qualificação de
   * conservação quando há fontes impulsivas ou distribuição de massa não medidas.
   * @contract f-77917d37205da563
   */
  public observar() {
    return { impulsoTorqueNmS: this.impulsoTorqueNmS, residuoPassoKgM2ps: this.residuoPassoKgM2ps,
      residuoAcumuladoKgM2ps: this.residuoAcumuladoKgM2ps,
      residuoMaximoPassoKgM2ps: this.residuoMaximoPassoKgM2ps, passosIncompletos: this.passosIncompletos };
  }
}
