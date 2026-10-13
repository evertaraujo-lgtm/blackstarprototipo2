import type { MundoFisico } from '../physics/MundoFisico';
import type { SuperficieFisica } from '../physics/SuperficieFisica';
import { montarVeiculoBss, type ParametrosMontagemBss } from './MontagemBss';

/** Hipótese de estudo histórica, sem correção de pressão ambiente. */
export const IMPULSO_ESPECIFICO_NOMINAL_BSS005_S = 350;
/** Parâmetros de veículo; não incluem terreno, clima, UI ou objetivos de missão. */
export const PARAMETROS_BSS005 = Object.freeze({
  controleDeInclinacaoPid: true, inclinacaoInicialRad: 0,
  energiaInicialDaBateriaJ: 1_000_000, capacidadeBateriaJ: 1_000_000,
  deslocamentoLateralDoPainelM: 0.8, painelMovel: false, incluirPainelSolar: true,
  incluirPernasFixas: true, fatorTanques: 5, fatorPropulsor: 3,
  impulsoEspecificoNominalS: IMPULSO_ESPECIFICO_NOMINAL_BSS005_S,
} satisfies Omit<ParametrosMontagemBss, 'id'>);
export const PARAMETROS_BSS006 = Object.freeze({ ...PARAMETROS_BSS005,
  incluirAletasAerodinamicas: true, incluirGuiaPousoPorAlvo: true,
});

export const DEFINICAO_BSS006 = Object.freeze({
  id: 'bss-006', revisao: 'bss006-m9-parametros-m10-montagem',
  montar: (mundo: MundoFisico, solo: SuperficieFisica, arcoBaseM = 0) =>
    montarVeiculoBss(mundo, solo, { ...PARAMETROS_BSS006, id: 'bss-006', arcoBaseM }),
});
