import { normalizarAngulo } from '../ambiente/ReferencialFisico';
import type { AmostraAtmosferaReentrada } from '../ambiente/PerfilAtmosfericoReentrada';
import type { CondicoesAtmosfericas, EstadoFisico } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

export const MODELO_REENTRADA = Object.freeze({ revisao: 'RE-001-r1', areaReferenciaM2: 250,
  comprimentoM: 40, alturaM: 8, raioNarizM: 2, areaAquecidaM2: 80,
  massaCorpoKg: 78_900, massaFlapKg: 500, massaBateriaKg: 100,
  resistenciaCorpoJ: 1e8, resistenciaFlapJ: 1e6, resistenciaFixadorN: 1e8,
  areaFlapM2: 16, clFlapPorRad: 1.2, cdFlapBase: 0.06, cdFlapDeflexao: 0.4,
  cursoFlapRad: Math.PI / 6, taxaFlapRadps: Math.PI / 9, bracoFlapM: 16,
  potenciaFlapW: 300, potenciaRepousoFlapW: 6, tensaoBateriaV: 28, energiaBateriaJ: 20e6,
  ganhoAlpha: 0.008, ganhoTaxa: 0.18, torqueMinimoAutoridadeNm: 100,
  taxaRolagemRadps: Math.PI / 18,
  coeficienteSuttonGravesSI: 1.7415e-4 });

export interface CargasReentrada {
  readonly velocidadeRelativaMps: number;
  readonly anguloAtaqueRad: number;
  readonly mach: number;
  readonly pressaoDinamicaPa: number;
  readonly cl: number;
  readonly cd: number;
  readonly sustentacaoN: number;
  readonly sustentacaoXYN: number;
  readonly sustentacaoLateralOmitidaN: number;
  readonly arrastoN: number;
  readonly forcaSustentacaoN: Vetor3;
  readonly forcaArrastoN: Vetor3;
  readonly centroPressaoLocalM: number;
  readonly fluxoTermicoIndicadorWm2: number;
  readonly knudsen: number;
  readonly regime: 'continuo' | 'deslizamento' | 'transicao' | 'molecular' | 'vacuo';
  readonly modeloContinuoAplicavel: boolean;
}

/** Projeção puramente algébrica L*cos(phi), inclusive em rolagem negativa;
 * lateral L*sin(phi) não é integrada. Não produz arrasto ou integração.
 * @contract f-b963603558db9e7b
   */
export function projetarSustentacao(sustentacaoN: number, phiRad: number): number {
  if (![sustentacaoN, phiRad].every(Number.isFinite)) throw new Error('Projeção não finita.');
  return sustentacaoN * Math.cos(phiRad);
}

/** Indicador Sutton–Graves SI, limitado pelo fluxo cinético molecular incidente.
 * rho kg/m³, V m/s e raio m; retorna W/m². Não é previsão qualificada de TPS,
 * especialmente no rarefeito, fora do hipersônico ou com química/composição variáveis.
 * @contract f-5b99eb90d683a84a
   */
export function calcularFluxoTermicoIndicador(rho: number, velocidadeMps: number, raioM: number): number {
  if (![rho, velocidadeMps, raioM].every(Number.isFinite) || rho < 0 || velocidadeMps < 0 || raioM <= 0) {
    throw new Error('Parâmetros térmicos inválidos.');
  }
  return Math.min(MODELO_REENTRADA.coeficienteSuttonGravesSI * Math.sqrt(rho / raioM) * velocidadeMps ** 3,
    0.5 * rho * velocidadeMps ** 3);
}

/** Modelo analítico preliminar XY, eixo longitudinal local +X. Cl=0,9*sin(2α)
 * com correção Mach suave; Cd=0,12+1,6*sin²α+termo Mach. Não usa tabela validada.
 * CP levemente a ré produz momento real; lift normal ao fluxo é projetado por phi.
 * Condições SI finitas fornecidas pelo mundo; função pura, dt não se aplica.
 * @contract f-1ed66fedcef47f81
   */
export function avaliarAerodinamica(estado: EstadoFisico, condicoes: CondicoesAtmosfericas,
  atmosfera: AmostraAtmosferaReentrada, integridade: number, phiRad: number): CargasReentrada {
  const v = estado.velocidadeMps.subtrair(condicoes.velocidadeArMps), V = v.magnitude;
  const alpha = V < 1e-6 ? 0 : normalizarAngulo(estado.orientacaoRad.z - Math.atan2(v.y, v.x));
  const mach = V / atmosfera.velocidadeSomMps;
  const fatorMach = 0.85 + 0.15 * mach / (1 + mach);
  const cl = 0.9 * Math.sin(2 * alpha) * fatorMach * integridade;
  const cd = 0.12 + 1.6 * Math.sin(alpha) ** 2 + 0.08 * Math.exp(-(((mach - 1) / 0.7) ** 2));
  const q = 0.5 * condicoes.densidadeArKgM3 * V ** 2;
  const L = q * MODELO_REENTRADA.areaReferenciaM2 * cl;
  const D = q * MODELO_REENTRADA.areaReferenciaM2 * cd;
  const Lxy = projetarSustentacao(L, phiRad);
  const n = V > 1e-6 ? new Vetor3(-v.y / V, v.x / V, 0) : Vetor3.zero;
  const kn = condicoes.densidadeArKgM3 === 0 ? Number.MAX_VALUE : atmosfera.caminhoLivreMedioM / MODELO_REENTRADA.alturaM;
  const regime = condicoes.densidadeArKgM3 === 0 ? 'vacuo'
    : kn < 0.01 ? 'continuo' : kn < 0.1 ? 'deslizamento' : kn < 10 ? 'transicao' : 'molecular';
  return { velocidadeRelativaMps: V, anguloAtaqueRad: alpha, mach, pressaoDinamicaPa: q, cl, cd,
    sustentacaoN: L, sustentacaoXYN: Lxy, sustentacaoLateralOmitidaN: L * Math.sin(phiRad), arrastoN: D,
    forcaSustentacaoN: n.multiplicar(Lxy), forcaArrastoN: V > 1e-6 ? v.multiplicar(-D / V) : Vetor3.zero,
    centroPressaoLocalM: -0.15 - 0.35 * Math.sin(alpha) ** 2,
    fluxoTermicoIndicadorWm2: calcularFluxoTermicoIndicador(condicoes.densidadeArKgM3, V, MODELO_REENTRADA.raioNarizM),
    knudsen: kn, regime, modeloContinuoAplicavel: kn < 0.01 && atmosfera.dentroDominio };
}
