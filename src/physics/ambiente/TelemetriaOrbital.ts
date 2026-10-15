import { Vetor3 } from '../Vetor3';
import { CampoCentral, TERRA } from './CampoGravitacional';

/** Elementos osculadores de dois corpos: ignora empuxo/arrasto/contacto futuros.
 * @contract f-f08ef7862a1cdb97
 */
export function obterTelemetriaOrbital(p: Vetor3, v: Vetor3, campo: CampoCentral, raioSuperficieM: number = TERRA.raioM) {
  if (p.z !== 0 || v.z !== 0 || campo.centroM.z !== 0) throw new Error('Telemetria orbital M9 restrita ao plano XY.');
  const r = p.subtrair(campo.centroM);
  const raioM = r.magnitude;
  campo.aceleracaoEm(p); // valida domínio sem duplicar a política de singularidade
  const mu = campo.muM3S2;
  const energiaEspecificaJPorKg = v.magnitude ** 2 / 2 - mu / raioM;
  const h = r.produtoVetorial(v);
  const momentoAngularEspecificoM2S = h.z;
  const excentricidade = v.produtoVetorial(h).multiplicar(1 / mu).subtrair(r.multiplicar(1 / raioM)).magnitude;
  const perigeuRaioM = h.magnitude ** 2 / (mu * (1 + excentricidade));
  const limiteParabolico = 1e-12 * mu / raioM;
  const ligada = energiaEspecificaJPorKg < -limiteParabolico;
  const semiEixoMaiorM = ligada ? -mu / (2 * energiaEspecificaJPorKg) : undefined;
  const apogeuRaioM = semiEixoMaiorM === undefined ? undefined : 2 * semiEixoMaiorM - perigeuRaioM;
  return {
    raioM, altitudeM: raioM - raioSuperficieM, velocidadeInercialMps: v.magnitude,
    velocidadeCircularMps: Math.sqrt(mu / raioM), velocidadeEscapeMps: Math.sqrt(2 * mu / raioM),
    energiaEspecificaJPorKg, momentoAngularEspecificoM2S, excentricidade,
    perigeuM: perigeuRaioM - raioSuperficieM,
    apogeuM: apogeuRaioM === undefined ? undefined : apogeuRaioM - raioSuperficieM,
    periodoS: semiEixoMaiorM === undefined ? undefined : 2 * Math.PI * Math.sqrt(semiEixoMaiorM ** 3 / mu),
    interceptaSuperficie: perigeuRaioM <= raioSuperficieM,
    estado: ligada ? (perigeuRaioM > raioSuperficieM ? 'orbital' : 'suborbital')
      : Math.abs(energiaEspecificaJPorKg) <= limiteParabolico ? 'limite-de-escape' : 'escape',
  } as const;
}
