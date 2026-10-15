import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { GeografiaCosteira } from '../physics/ambiente/GeografiaCosteira';
import { RegiaoAquatica } from '../physics/agua/RegiaoAquatica';
import { MundoFisico } from '../physics/MundoFisico';
import { SuperficieCosteira } from '../physics/SuperficieCosteira';
import { Vetor3 } from '../physics/Vetor3';
import { PASSO_MISSAO_BSS_S } from './AmbienteLancamento';

/** Cria Terra central XY com costa radial finita, água 1025 kg/m³ e terreno/fundo sólido único; vento local é transformado para inercial. Registra solo, sem piso no nível livre. @contract f-f44552b345a6763f @reviewed M12-DOC: implementação lida. */
export function criarAmbienteAmerissagem(arcoBaseM = 0, ventoTangencialMps = 0) {
  const ambiente = new AmbienteTerrestre(), ref = ambiente.referencial;
  const costa = new GeografiaCosteira(ref, { inicioArcoM: arcoBaseM + 60, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 2000, nivelMarM: 0 });
  const agua = new RegiaoAquatica('oceano-experimental', costa, 1025, 0);
  const ancoraM = ref.posicaoPorArcoM(arcoBaseM, 0);
  const mundo = new MundoFisico(PASSO_MISSAO_BSS_S, { ambiente, regioesAquaticas: [agua], densidadeAtmosfericaKgM3: 1.225,
    velocidadeArMps: ref.vetorParaGlobal(new Vetor3(ventoTangencialMps, 0, 0), ancoraM) });
  const solo = new SuperficieCosteira('solo-decolagem-solar', ambiente.campo.centroM, ref.raioM, costa);
  mundo.registrarSuperficie(solo); return { mundo, solo, ancoraM, agua, costa };
}
