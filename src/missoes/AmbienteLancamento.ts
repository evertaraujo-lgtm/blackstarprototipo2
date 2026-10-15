import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { MundoFisico } from '../physics/MundoFisico';
import { SuperficieEsferica } from '../physics/SuperficieEsferica';
import { Vetor3 } from '../physics/Vetor3';

export const PASSO_MISSAO_BSS_S = 1 / 240;
/** Plataforma demarcada no solo existente: um único material, sem contatos sobrepostos.
 * @remarks Cria Terra central XY, vento tangencial prescrito e solo esférico único; plataforma demarcada não acrescenta contatos duplicados. Valida arco m/vento m/s finitos e usa dt externo 1/240 s.
 * @contract f-8091c7d8f7b297f8
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function criarAmbienteLancamento(arcoBaseM: number, ventoTangencialMps: number) {
  if (![arcoBaseM, ventoTangencialMps].every(Number.isFinite)) throw new Error('Local/vento devem ser finitos em SI.');
  const ambiente = new AmbienteTerrestre();
  const ancoraM = ambiente.referencial.posicaoPorArcoM(arcoBaseM, 0);
  const mundo = new MundoFisico(PASSO_MISSAO_BSS_S, { ambiente,
    velocidadeArMps: ambiente.referencial.vetorParaGlobal(new Vetor3(ventoTangencialMps, 0, 0), ancoraM),
    densidadeAtmosfericaKgM3: 1.225,
  });
  const solo = new SuperficieEsferica('solo-decolagem-solar', ambiente.campo.centroM,
    ambiente.referencial.raioM, 1_000_000, 0.04, 0.9);
  mundo.registrarSuperficie(solo);
  return { mundo, solo, ancoraM };
}
