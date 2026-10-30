import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { FixadorEstrutural } from '../physics/conexoes/FixadorEstrutural';
import { Bateria } from '../physics/objetos/fontes-de-energia/Bateria';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { BombaPropelente } from '../physics/objetos/propulsao/alimentacao/BombaPropelente';
import { LinhaDePropelente } from '../physics/objetos/propulsao/alimentacao/LinhaDePropelente';
import { ValvulaPropelente } from '../physics/objetos/propulsao/alimentacao/ValvulaPropelente';
import { Bocal, GRAVIDADE_PADRAO_MPS2 } from '../physics/objetos/propulsao/combustao/Bocal';
import { CamaraCombustao } from '../physics/objetos/propulsao/combustao/CamaraCombustao';
import { PropulsorVetorizado } from '../physics/objetos/propulsao/PropulsorVetorizado';
import { VeiculoComposto } from '../physics/objetos/veiculos/VeiculoComposto';
import { MundoFisico } from '../physics/MundoFisico';
import { SuperficieEsferica } from '../physics/SuperficieEsferica';
import { Vetor3 } from '../physics/Vetor3';
import { ControladorAproximacao } from '../physics/sistemas de controle/ControladorAproximacao';

const EMPUXO_MAXIMO_N = 2_400_000;
const IMPULSO_ESPECIFICO_S = 350;
const FATOR_PROPULSOR_BSS005 = EMPUXO_MAXIMO_N / 40_000;
const FATOR_TANQUE = 30;
const VAZAO_COMBUSTIVEL_KGS = EMPUXO_MAXIMO_N / (IMPULSO_ESPECIFICO_S * GRAVIDADE_PADRAO_MPS2 * 5);
const VAZAO_OXIDANTE_KGS = VAZAO_COMBUSTIVEL_KGS * 4;
const MASSA_PROPULSOR_KG = 90 * FATOR_PROPULSOR_BSS005;
const MASSA_BASE_TANQUE_KG = 180 * FATOR_TANQUE ** (2 / 3);
const LADO_ESCALA_TANQUE = Math.cbrt(FATOR_TANQUE);

/** Cria montagem isolada para frenagem terminal: casco BSS-RE de 78,9 t,
 * motor bipropelente vetorizado e tanque/reserva dimensionados por vazão.
 * Geometria/empuxo são escalas de estudo ancoradas no modelo interno BSS-005,
 * não hardware certificado nem clonagem de veículo real. A variante manual
 * pode usar montagem axial e declarar atitude inicial própria; sem opções
 * mantém a receita RE-002E usada na campanha automática.
 * @contract f-94de1681a4c81541
 * @reviewed RE-002E: objetos, vínculos, permissivos e unidades conferidos.
 */
export function criarEnsaioPropulsivoOrbitadorRe002(opcoes: {
  readonly atitudeInicialLocalRad?: number;
  readonly montagemPropulsorAxial?: boolean;
} = {}) {
  const ambiente = new AmbienteTerrestre();
  const mundo = new MundoFisico(1 / 240, { ambiente, densidadeAtmosfericaKgM3: 1.225 });
  const referencial = ambiente.referencial, arcoInicialM = 0, altitudeInicialM = 6_755.82917311425;
  const velocidadeHorizontalInicialMps = 7.3797283675, velocidadeVerticalInicialMps = -250.5257888502;
  const montagemAxial = opcoes.montagemPropulsorAxial ?? false;
  const anguloInicialRad = opcoes.atitudeInicialLocalRad ?? (montagemAxial ? Math.PI / 2 : Math.PI);
  if (!Number.isFinite(anguloInicialRad)) throw new Error('Atitude inicial do ensaio deve ser finita em radianos.');
  const ancora = referencial.posicaoPorArcoM(arcoInicialM, altitudeInicialM);
  const velocidadeInicial = referencial.vetorParaGlobal(
    new Vetor3(velocidadeHorizontalInicialMps, velocidadeVerticalInicialMps, 0), ancora);
  const orientacaoInicialRad = referencial.atitudeInercialRad(anguloInicialRad, ancora);
  /** Transforma offset local pela atitude inicial e compartilha a velocidade inicial sem alterar o estado do mundo. @contract f-97e33d95c5a465e7 @reviewed RE-002E: transformação local/global conferida. */
  const estado = (offsetLocalM: Vetor3, orientacaoRelativaRad = 0): { posicaoM: Vetor3; orientacaoRad: Vetor3; velocidadeMps: Vetor3 } => {
    const offsetRotacionado = new Vetor3(offsetLocalM.x * Math.cos(anguloInicialRad) - offsetLocalM.y * Math.sin(anguloInicialRad),
      offsetLocalM.x * Math.sin(anguloInicialRad) + offsetLocalM.y * Math.cos(anguloInicialRad), 0);
    return { posicaoM: ancora.adicionar(referencial.vetorParaGlobal(offsetRotacionado, ancora)),
      orientacaoRad: new Vetor3(0, 0, orientacaoInicialRad + orientacaoRelativaRad), velocidadeMps: velocidadeInicial };
  };
  const veiculo = new VeiculoComposto({ id: 'orbitador-re002e', massaBaseKg: 78_900,
    dimensoesM: new Vetor3(40, 8, 16), resistenciaColisaoJ: 100_000_000, dissipacaoImpacto: 0.25,
    limiteTermicoC: 1_100, capacidadeTermicaJPorC: 78_900 * 800,
    areaTermicaM2: 80, areaFrontalM2: 250, coeficienteArrasto: 0.18,
    estadoInicial: estado(Vetor3.zero) });
  const alturaTanqueM = 1.5 * LADO_ESCALA_TANQUE;
  const tanqueMetano = new TanquePropelente({ id: 'tanque-metano-re002e', massaBaseKg: MASSA_BASE_TANQUE_KG,
    dimensoesM: new Vetor3(2 * LADO_ESCALA_TANQUE, alturaTanqueM, 1.8 * LADO_ESCALA_TANQUE),
    resistenciaColisaoJ: 20_000_000, limiteTermicoC: 500, tipoPropelente: 'metano',
    capacidadePropelenteKg: 120 * FATOR_TANQUE, massaPropelenteInicialKg: 120 * FATOR_TANQUE,
    estadoInicial: estado(montagemAxial ? new Vetor3(-10, 0, 0) : new Vetor3(0, 6.5, 0)) });
  const tanqueOxidante = new TanquePropelente({ id: 'tanque-oxidante-re002e', massaBaseKg: MASSA_BASE_TANQUE_KG,
    dimensoesM: new Vetor3(2 * LADO_ESCALA_TANQUE, alturaTanqueM, 1.8 * LADO_ESCALA_TANQUE),
    resistenciaColisaoJ: 20_000_000, limiteTermicoC: 500, tipoPropelente: 'oxigenio',
    capacidadePropelenteKg: 480 * FATOR_TANQUE, massaPropelenteInicialKg: 480 * FATOR_TANQUE,
    estadoInicial: estado(montagemAxial ? new Vetor3(-3, 0, 0) : new Vetor3(0, 12.8, 0)) });
  const bateria = new Bateria({ id: 'bateria-re002e', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 1_000_000, limiteTermicoC: 80, tensaoNominalV: 24,
    capacidadeEnergiaJ: 20_000_000, energiaInicialJ: 20_000_000,
    estadoInicial: estado(montagemAxial ? new Vetor3(5, 0, 0) : new Vetor3(0, 0, 0)) });
  const fatorVazaoEletrica = VAZAO_COMBUSTIVEL_KGS / (0.8 * FATOR_PROPULSOR_BSS005);
  const propulsor = new PropulsorVetorizado({ id: 'propulsor-re002e', massaBaseKg: MASSA_PROPULSOR_KG,
    dimensoesM: new Vetor3(1.6, 1.4, 1.4).multiplicar(LADO_ESCALA_TANQUE), resistenciaColisaoJ: 10_000_000,
    limiteTermicoC: 1_000, tensaoAlimentacaoNominalV: 24,
    potenciaEletricaMaximaW: 1_200 * FATOR_PROPULSOR_BSS005 * fatorVazaoEletrica,
    potenciaTermicaMaximaW: 2_000_000 * FATOR_PROPULSOR_BSS005,
    empuxoMaximoN: EMPUXO_MAXIMO_N, vazaoMaximaKgS: VAZAO_COMBUSTIVEL_KGS,
    propelenteCompativel: 'metano', estadoInicial: estado(
      montagemAxial ? new Vetor3(-18, 0, 0) : new Vetor3(0, -7, 0), montagemAxial ? 0 : Math.PI / 2),
    vetorizacao: { limiteAngularRad: Math.PI / 12, velocidadeAngularMaximaRadps: Math.PI / 2 } });
  const comprimentoLinhasM = 32;
  propulsor.conectarTanque(tanqueMetano, comprimentoLinhasM);
  propulsor.conectarBateria(bateria, comprimentoLinhasM);
  const valvulaCombustivel = new ValvulaPropelente({ id: 'valvula-metano-re002e', vazaoMaximaKgS: VAZAO_COMBUSTIVEL_KGS });
  const valvulaOxidante = new ValvulaPropelente({ id: 'valvula-oxidante-re002e', vazaoMaximaKgS: VAZAO_OXIDANTE_KGS });
  valvulaCombustivel.definirAbertura(1); valvulaOxidante.definirAbertura(1);
  propulsor.configurarCadeiaBipropelente({
    linhaCombustivel: new LinhaDePropelente({ id: 'linha-metano-re002e', tanque: tanqueMetano,
      tipoPropelente: 'metano', comprimentoMaximoM: comprimentoLinhasM, vazaoMaximaKgS: VAZAO_COMBUSTIVEL_KGS,
      valvula: valvulaCombustivel }),
    linhaOxidante: new LinhaDePropelente({ id: 'linha-oxidante-re002e', tanque: tanqueOxidante,
      tipoPropelente: 'oxigenio', comprimentoMaximoM: comprimentoLinhasM, vazaoMaximaKgS: VAZAO_OXIDANTE_KGS,
      valvula: valvulaOxidante }),
    bombaCombustivel: new BombaPropelente({ id: 'bomba-metano-re002e', tensaoNominalV: 24,
      vazaoMaximaKgS: VAZAO_COMBUSTIVEL_KGS, potenciaEletricaMaximaW: 400 * FATOR_PROPULSOR_BSS005 * fatorVazaoEletrica }),
    bombaOxidante: new BombaPropelente({ id: 'bomba-oxidante-re002e', tensaoNominalV: 24,
      vazaoMaximaKgS: VAZAO_OXIDANTE_KGS, potenciaEletricaMaximaW: 600 * FATOR_PROPULSOR_BSS005 * fatorVazaoEletrica }),
    camara: new CamaraCombustao({ razaoMisturaOxidanteCombustivel: 4, toleranciaRazaoMistura: 0.1 }),
    bocal: new Bocal({ empuxoMaximoN: EMPUXO_MAXIMO_N, eficienciaNominal: 1, impulsoEspecificoNominalS: IMPULSO_ESPECIFICO_S }),
  });

  veiculo.adicionarModulo(tanqueMetano); veiculo.adicionarModulo(tanqueOxidante);
  veiculo.adicionarModulo(bateria); veiculo.adicionarModulo(propulsor);
  veiculo.instalarPropulsor(propulsor);
  const modulos = [tanqueMetano, tanqueOxidante, bateria, propulsor];
  for (const modulo of modulos) veiculo.adicionarFixador(new FixadorEstrutural({
    id: `fixador-re002e-${modulo.id}`, objetoA: veiculo, objetoB: modulo,
    resistenciaTracaoN: 10_000_000, resistenciaCompressaoN: 10_000_000,
    /** Expõe empuxo do motor como esforço axial solicitado ao vínculo; os demais módulos não solicitam tração. @contract f-6254b0d3c01e6986 @reviewed RE-002E: esforço e identidade do módulo conferidos. */
    obterEsforcoSolicitadoN: () => modulo === propulsor ? propulsor.empuxoAtualN : 0,
  }));
  mundo.registrarSuperficie(new SuperficieEsferica('superficie-terrestre-re002e', ambiente.campo.centroM,
    referencial.raioM, 100_000_000, 0.25, 0.8));
  veiculo.registrarNoMundo(mundo);
  const controladorAproximacao = new ControladorAproximacao({ alvoArcoM: 100_000,
    aceleracaoHorizontalMaximaMps2: 5, aceleracaoVerticalMaximaMps2: 8,
    velocidadeHorizontalMaximaMps: 250, velocidadeVerticalMaximaMps: 100,
    ganhoVelocidadePorS: 1, propulsores: [{ id: propulsor.id,
      empuxoMaximoN: propulsor.empuxoMaximoN, gimbalMaximoRad: Math.PI / 12 }] });
  veiculo.registrarControlador(controladorAproximacao);
  return { mundo, ambiente, veiculo, propulsor, tanqueMetano, tanqueOxidante, bateria,
    controladorAproximacao, massaInicialKg: veiculo.massaInstantaneaDoConjuntoKg,
    parametrosPropulsivos: { empuxoMaximoN: EMPUXO_MAXIMO_N, impulsoEspecificoNominalS: IMPULSO_ESPECIFICO_S,
      razaoMisturaOxidanteCombustivel: 4, vazaoCombustivelMaximaKgS: VAZAO_COMBUSTIVEL_KGS,
      vazaoOxidanteMaximaKgS: VAZAO_OXIDANTE_KGS, limiteGimbalRad: Math.PI / 12,
      fatorPropulsorBss005: FATOR_PROPULSOR_BSS005, fatorTanqueBss005: FATOR_TANQUE,
      massaBaseCascoKg: 78_900, massaPropulsorKg: MASSA_PROPULSOR_KG,
      massaBasePorTanqueKg: MASSA_BASE_TANQUE_KG, propelenteTotalInicialKg: tanqueMetano.massaPropelenteKg + tanqueOxidante.massaPropelenteKg } };
}
