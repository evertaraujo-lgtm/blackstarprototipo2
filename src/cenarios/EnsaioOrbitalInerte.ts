import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { TERRA } from '../physics/ambiente/CampoGravitacional';
import { criarEstadoInicialLocal } from '../physics/ambiente/EstadoInicialLocal';
import { obterTelemetriaOrbital } from '../physics/ambiente/TelemetriaOrbital';
import { MundoFisico } from '../physics/MundoFisico';
import { Objeto } from '../physics/objetos/base/Objeto';
import { Vetor3 } from '../physics/Vetor3';
import { SuperficieEsferica } from '../physics/SuperficieEsferica';

/** Ensaio/ADM de corpo padrão da bancada. Não é veículo ou missão de lançamento.
 * @contract f-b2090ed5afdb1862
 */
export function criarEnsaioOrbitalInerte(tipo: 'circular' | 'eliptica' = 'circular') {
  if (tipo !== 'circular' && tipo !== 'eliptica') throw new Error('Ensaio orbital desconhecido.');
  const ambiente = new AmbienteTerrestre();
  const mundo = new MundoFisico(1, { ambiente, densidadeAtmosfericaKgM3: 0 });
  const r = TERRA.raioM + 400_000;
  const velocidade = Math.sqrt(TERRA.muM3S2 / r) * Math.sqrt(tipo === 'eliptica' ? 1.1 : 1);
  // Reusa o material de corpo de prova declarado nos ensaios do core:
  // 10 kg, resistência 1 MJ, limite térmico 1000 °C; nenhum efeito ativo.
  const corpo = new Objeto({
    id: 'corpo-de-prova-orbital', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 1e6, limiteTermicoC: 1000,
    estadoInicial: criarEstadoInicialLocal(ambiente.referencial, {
      arcoM: 0, altitudeM: 400_000, velocidadeRadialMps: 0, velocidadeTangencialMps: velocidade,
      atitudeLocalRad: 0, taxaAtitudeLocalRadps: velocidade / r,
    }),
  });
  const solo = new SuperficieEsferica('terra', ambiente.campo.centroM);
  mundo.registrarSuperficie(solo); mundo.registrarObjeto(corpo);
  /** Devolve `obterTelemetriaOrbital(e.posicaoM, e.velocidadeMps, ambiente.campo)`. Dependências diretas: `corpo.getEstadoFisico`, `obterTelemetriaOrbital`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-283b09640d871e52 */
  const ler = () => {
    const e = corpo.getEstadoFisico();
    return obterTelemetriaOrbital(e.posicaoM, e.velocidadeMps, ambiente.campo);
  };
  const inicial = ler();
  const estadoInicial = corpo.getEstadoFisico();
  return { tipo, ambiente, mundo, corpo, solo, ler, inicial,
    /** Dependências diretas: `mundo.obterConfiguracaoFisica`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b386a16ed26e78ae */
    obterConfiguracao: () => ({ tipo, modeloFisico: mundo.obterConfiguracaoFisica(), estadoInicial,
      hipotese: 'Ensaio ADM de corpo inerte; condições orbitais iniciais prescritas; Terra estática XY e vácuo explícito.' }) };
}
