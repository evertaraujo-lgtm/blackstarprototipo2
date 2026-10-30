import { normalizarAngulo } from '../ambiente/ReferencialFisico';
import type { AmostraAtmosferaReentrada } from '../ambiente/PerfilAtmosfericoReentrada';
import type { CondicoesAtmosfericas, EstadoFisico } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

export const MODELO_REENTRADA = Object.freeze({ revisao: 'RE-002-r4', areaReferenciaM2: 250,
  comprimentoM: 40, alturaM: 8, raioNarizM: 2, areaAquecidaM2: 80,
  massaCorpoKg: 78_900, massaFlapKg: 500, massaBateriaKg: 100,
  resistenciaCorpoJ: 1e8, resistenciaFlapJ: 1e6, resistenciaFixadorN: 1e8,
  areaFlapM2: 16, clFlapPorRad: 1.2, cdFlapBase: 0.06, cdFlapDeflexao: 0.4,
  cursoFlapRad: Math.PI / 6, taxaFlapRadps: Math.PI / 9, bracoFlapM: 16,
  potenciaFlapW: 300, potenciaRepousoFlapW: 6, tensaoBateriaV: 28, energiaBateriaJ: 20e6,
  ganhoAlpha: 0.008, ganhoTaxa: 0.18, torqueMinimoAutoridadeNm: 100,
  taxaRolagemRadps: Math.PI / 18,
  coeficienteSuttonGravesSI: 1.7415e-4,
  larguraM: 16, clCorpo: 0.9, fatorMachBase: 0.85, fatorMachVariacao: 0.15,
  cdCorpoBase: 0.12, cdCorpoAlpha: 1.6, cdMachGauss: 0.08,
  cpBaseM: -0.15, cpVariacaoM: -0.35, deslocamentoVerticalFlapM: -5,
  raioNarizFlapM: 0.5, areaAquecidaFlapM2: 2, calorEspecificoCorpoJPorKgC: 800,
  calorEspecificoFlapJPorKgC: 500, comprimentoCaracteristicoCorpoM: 8,
  comprimentoCaracteristicoFlapM: 2, cursoRolagemRad: Math.PI / 2,
  conveccaoCorpoWPorM2C: 10, condutanciaFlapWPorC: 100, fracaoCargaInicialBateria: 1 });

export type ParametrosReentrada = { readonly [K in Exclude<keyof typeof MODELO_REENTRADA, 'revisao'>]: number };

/** Copia parâmetros SI conhecidos e valida finitude, sinal e domínio mecânico.
 * São calibrações de ensaio, não especificações certificadas. Nenhuma alteração
 * afeta o objeto padrão global nem modifica corpos já em voo.
 * Rejeições mecânicas identificam chave, valor e limite; não arredondam nem
 * toleram entradas fora do domínio. Cursos em rad, taxas em rad/s, carga [0,1].
 * @contract f-e334f1718df02bee
   */
export function configurarParametrosReentrada(entrada: Partial<ParametrosReentrada> = {}): ParametrosReentrada {
  const { revisao: _revisao, ...padroes } = MODELO_REENTRADA;
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)
    || Object.keys(entrada).some(k => !Object.hasOwn(padroes, k))) throw new Error('Parâmetro RE desconhecido.');
  const p = { ...padroes, ...entrada };
  const assinados = ['cpBaseM', 'cpVariacaoM', 'deslocamentoVerticalFlapM'];
  const podemZerar = ['clCorpo', 'cdCorpoBase', 'cdCorpoAlpha', 'cdMachGauss', 'fatorMachBase', 'fatorMachVariacao',
    'ganhoAlpha', 'ganhoTaxa', 'potenciaRepousoFlapW', 'cdFlapDeflexao', 'conveccaoCorpoWPorM2C', 'condutanciaFlapWPorC', 'fracaoCargaInicialBateria'];
  for (const [k, v] of Object.entries(p)) if (!Number.isFinite(v) || Math.abs(v) > 1e12
    || (!assinados.includes(k) && (podemZerar.includes(k) ? v < 0 : v <= 0))) throw new Error(`Parâmetro RE inválido: ${k}`);
  if (p.cursoFlapRad >= Math.PI / 2) throw new Error(`cursoFlapRad: ${p.cursoFlapRad} rad; deve ser menor que ${Math.PI / 2} rad.`);
  if (p.cursoRolagemRad > Math.PI / 2) throw new Error(`cursoRolagemRad: ${p.cursoRolagemRad} rad; deve ser menor ou igual a ${Math.PI / 2} rad.`);
  if (p.fracaoCargaInicialBateria > 1) throw new Error(`fracaoCargaInicialBateria: ${p.fracaoCargaInicialBateria}; deve ser menor ou igual a 1 (100%).`);
  if (p.taxaFlapRadps > 10) throw new Error(`taxaFlapRadps: ${p.taxaFlapRadps} rad/s; deve ser menor ou igual a 10 rad/s.`);
  if (p.taxaRolagemRadps > 10) throw new Error(`taxaRolagemRadps: ${p.taxaRolagemRadps} rad/s; deve ser menor ou igual a 10 rad/s.`);
  return Object.freeze(p);
}

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
  readonly foraDominioAtmosferico: boolean;
  readonly modeloEscoamentoEfetivo: string;
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
export function calcularFluxoTermicoIndicador(rho: number, velocidadeMps: number, raioM: number, coeficienteSI: number = MODELO_REENTRADA.coeficienteSuttonGravesSI): number {
  if (![rho, velocidadeMps, raioM, coeficienteSI].every(Number.isFinite) || rho < 0 || velocidadeMps < 0 || raioM <= 0 || coeficienteSI <= 0) {
    throw new Error('Parâmetros térmicos inválidos.');
  }
  return Math.min(coeficienteSI * Math.sqrt(rho / raioM) * velocidadeMps ** 3,
    0.5 * rho * velocidadeMps ** 3);
}

/** Modelo analítico preliminar XY, eixo longitudinal local +X. Cl=0,9*sin(2α)
 * com correção Mach suave; Cd=0,12+1,6*sin²α+termo Mach. Não usa tabela validada.
 * CP levemente a ré produz momento real; lift normal ao fluxo é projetado por phi.
 * Condições SI finitas fornecidas pelo mundo; função pura, dt não se aplica.
 * @contract f-1ed66fedcef47f81
   */
export function avaliarAerodinamica(estado: EstadoFisico, condicoes: CondicoesAtmosfericas,
  atmosfera: AmostraAtmosferaReentrada, integridade: number, phiRad: number, p: ParametrosReentrada = MODELO_REENTRADA): CargasReentrada {
  const v = estado.velocidadeMps.subtrair(condicoes.velocidadeArMps), V = v.magnitude;
  const alpha = V < 1e-6 ? 0 : normalizarAngulo(estado.orientacaoRad.z - Math.atan2(v.y, v.x));
  const mach = V / atmosfera.velocidadeSomMps;
  const fatorMach = p.fatorMachBase + p.fatorMachVariacao * mach / (1 + mach);
  const cl = p.clCorpo * Math.sin(2 * alpha) * fatorMach * integridade;
  const cd = p.cdCorpoBase + p.cdCorpoAlpha * Math.sin(alpha) ** 2 + p.cdMachGauss * Math.exp(-(((mach - 1) / 0.7) ** 2));
  const q = 0.5 * condicoes.densidadeArKgM3 * V ** 2;
  const L = q * p.areaReferenciaM2 * cl;
  const D = q * p.areaReferenciaM2 * cd;
  const Lxy = projetarSustentacao(L, phiRad);
  const n = V > 1e-6 ? new Vetor3(-v.y / V, v.x / V, 0) : Vetor3.zero;
  const kn = condicoes.densidadeArKgM3 === 0 ? Number.MAX_VALUE : atmosfera.caminhoLivreMedioM / p.comprimentoCaracteristicoCorpoM;
  const regime = condicoes.densidadeArKgM3 === 0 ? 'vacuo'
    : kn < 0.01 ? 'continuo' : kn < 0.1 ? 'deslizamento' : kn < 10 ? 'transicao' : 'molecular';
  return { velocidadeRelativaMps: V, anguloAtaqueRad: alpha, mach, pressaoDinamicaPa: q, cl, cd,
    sustentacaoN: L, sustentacaoXYN: Lxy, sustentacaoLateralOmitidaN: L * Math.sin(phiRad), arrastoN: D,
    forcaSustentacaoN: n.multiplicar(Lxy), forcaArrastoN: V > 1e-6 ? v.multiplicar(-D / V) : Vetor3.zero,
    centroPressaoLocalM: p.cpBaseM + p.cpVariacaoM * Math.sin(alpha) ** 2,
    fluxoTermicoIndicadorWm2: calcularFluxoTermicoIndicador(condicoes.densidadeArKgM3, V, p.raioNarizM, p.coeficienteSuttonGravesSI),
    knudsen: kn, regime, foraDominioAtmosferico: !atmosfera.dentroDominio, modeloEscoamentoEfetivo: 'polar-continua-analitica-extrapolada', modeloContinuoAplicavel: kn < 0.01 && atmosfera.dentroDominio };
}
