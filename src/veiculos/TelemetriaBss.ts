import { CampoCentral } from '../physics/ambiente/CampoGravitacional';
import { obterTelemetriaOrbital } from '../physics/ambiente/TelemetriaOrbital';
import { ReferencialEsferico } from '../physics/ambiente/ReferencialFisico';
import { MundoFisico } from '../physics/MundoFisico';
import { VeiculoComposto } from '../physics/objetos/veiculos/VeiculoComposto';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { Propulsor } from '../physics/objetos/propulsao/Propulsor';
import { GRAVIDADE_PADRAO_MPS2 } from '../physics/objetos/propulsao/combustao/Bocal';

/** Leituras e estimativas de engenharia; não solicita ações nem modifica a física. */
export const obterTelemetriaMissaoBss = (
  mundo: MundoFisico, veiculo: VeiculoComposto, motor: Propulsor, tanques: readonly TanquePropelente[],
) => {
  const membros = veiculo.obterObjetosFisicosConectados();
  const massaKg = veiculo.massaInstantaneaDoConjuntoKg;
  const combustivelKg = tanques.filter((t) => membros.includes(t)).reduce((s, t) => s + t.massaPropelenteKg, 0);
  // Apenas a parcela em razão de mistura 4:1 pode reagir no BSS bipropelente.
  const ch4 = tanques.find((t) => t.tipoPropelente === 'metano');
  const o2 = tanques.find((t) => t.tipoPropelente === 'oxigenio');
  const reagivelKg = ch4 && o2 && membros.includes(ch4) && membros.includes(o2)
    ? Math.min(ch4.massaPropelenteKg, o2.massaPropelenteKg / 4) * 5 : 0;
  const conectado = membros.includes(motor);
  const isp = conectado ? motor.impulsoEspecificoNominalS : undefined;
  const massaFinalIdealKg = massaKg - reagivelKg;
  const deltaVIdealMps = isp !== undefined && massaFinalIdealKg > 0
    ? isp * GRAVIDADE_PADRAO_MPS2 * Math.log(massaKg / massaFinalIdealKg) : undefined;
  const ambiente = mundo.obterCondicoesAtmosfericas(veiculo);
  const vRel = veiculo.getEstadoFisico().velocidadeMps.subtrair(ambiente.velocidadeArMps);
  const estado = veiculo.getEstadoFisico();
  const ref = mundo.ambiente.referencial;
  const velocidadeLocal = ref.vetorParaLocal(estado.velocidadeMps, estado.posicaoM);
  return {
    modeloFisico: mundo.obterConfiguracaoFisica(),
    altitudeGeometricaM: ref.altitudeGeometricaM(estado.posicaoM),
    velocidadeRadialMps: velocidadeLocal.y, velocidadeTangencialMps: velocidadeLocal.x,
    atitudeLocalRad: ref.atitudeLocalRad(estado.orientacaoRad.z, estado.posicaoM),
    atitudeInercialRad: estado.orientacaoRad.z,
    gravidadeLocalMps2: mundo.obterGravidadeMps2(estado.posicaoM).magnitude,
    orbital: mundo.ambiente.campo instanceof CampoCentral && ref instanceof ReferencialEsferico
      ? obterTelemetriaOrbital(estado.posicaoM, estado.velocidadeMps, mundo.ambiente.campo, ref.raioM) : undefined,
    massaKg, combustivelKg, reagivelKg, deltaVIdealMps,
    impulsoEspecificoEfetivoS: motor.impulsoEspecificoEfetivoS,
    densidadeArKgM3: ambiente.densidadeArKgM3,
    pressaoDinamicaPa: 0.5 * ambiente.densidadeArKgM3 * vRel.magnitude ** 2,
    diagnosticoMotor: [
      ...(!conectado ? ['motor sem vínculo estrutural'] : []),
      ...(motor.estaEstruturalmenteInoperante ? ['motor destruído'] : []),
      ...motor.diagnosticoOperacional,
    ],
    hipoteseDeltaV: 'Tsiolkovsky ideal; Isp nominal constante; mistura CH4/O2 1:4; sem perdas por gravidade/arrasto, dano ou reserva de pouso',
  };
};
