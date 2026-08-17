import './style.css';
import { MundoFisico } from './physics/MundoFisico';
import { Objeto } from './physics/objetos/base/Objeto';
import { ObjetoTriangularRetangulo } from './physics/objetos/base/ObjetoTriangularRetangulo';
import { SuperficiePlano } from './physics/SuperficiePlano';
import { VeiculoTerrestre } from './physics/objetos/veiculos/VeiculoTerrestre';
import { VeiculoAlado } from './physics/objetos/veiculos/VeiculoAlado';
import { VeiculoComposto } from './physics/objetos/veiculos/VeiculoComposto';
import { Propulsor, type IdSistemaPropulsor } from './physics/objetos/propulsao/Propulsor';
import { PropulsorVetorizado } from './physics/objetos/propulsao/PropulsorVetorizado';
import { TanquePropelente } from './physics/objetos/propulsao/TanquePropelente';
import { FixadorEstrutural } from './physics/conexoes/FixadorEstrutural';
import { Paraquedas } from './physics/objetos/componentes/Paraquedas';
import { EstadoOperacional } from './physics/SistemaOperacional';
import { Vetor3 } from './physics/Vetor3';

const canvas = document.querySelector<HTMLCanvasElement>('#test-canvas');
const playButton = document.querySelector<HTMLButtonElement>('#play-tests');
const scenarioSelector = document.querySelector<HTMLSelectElement>('#scenario-selector');
const skipButton = document.querySelector<HTMLButtonElement>('#skip-test');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-tests');
const scenarioName = document.querySelector<HTMLElement>('#scenario-name');
const scenarioDescription = document.querySelector<HTMLElement>('#scenario-description');
const simulationTime = document.querySelector<HTMLElement>('#sim-time');
const testStatus = document.querySelector<HTMLElement>('#test-status');
const testResult = document.querySelector<HTMLElement>('#test-result');
const vehicleSpeed = document.querySelector<HTMLElement>('#vehicle-speed');
const scenarioData = document.querySelector<HTMLElement>('#scenario-data');
const throttleControl = document.querySelector<HTMLLabelElement>('#throttle-control');
const throttleInput = document.querySelector<HTMLInputElement>('#throttle-input');
const throttleValue = document.querySelector<HTMLOutputElement>('#throttle-value');
const gimbalControl = document.querySelector<HTMLLabelElement>('#gimbal-control');
const gimbalInput = document.querySelector<HTMLInputElement>('#gimbal-input');
const gimbalValue = document.querySelector<HTMLOutputElement>('#gimbal-value');
const parachuteSettings = document.querySelector<HTMLFieldSetElement>('#parachute-settings');
const parachuteAreaInput = document.querySelector<HTMLInputElement>('#parachute-area');
const parachuteCalculatedValues = document.querySelector<HTMLElement>('#parachute-calculated-values');
const toggleElectric = document.querySelector<HTMLButtonElement>('#toggle-electric');
const toggleHydraulic = document.querySelector<HTMLButtonElement>('#toggle-hydraulic');
const toggleFuel = document.querySelector<HTMLButtonElement>('#toggle-fuel');
const toggleControl = document.querySelector<HTMLButtonElement>('#toggle-control');
const igniteButton = document.querySelector<HTMLButtonElement>('#ignite-engine');
const deployParachuteButton = document.querySelector<HTMLButtonElement>('#deploy-parachute');
const propulsionControls = document.querySelector<HTMLElement>('.propulsion-controls');

if (!canvas || !playButton || !scenarioSelector || !skipButton || !resetButton || !scenarioName || !scenarioDescription || !simulationTime || !testStatus || !testResult || !vehicleSpeed || !scenarioData || !throttleControl || !throttleInput || !throttleValue || !gimbalControl || !gimbalInput || !gimbalValue || !parachuteSettings || !parachuteAreaInput || !parachuteCalculatedValues || !toggleElectric || !toggleHydraulic || !toggleFuel || !toggleControl || !igniteButton || !deployParachuteButton || !propulsionControls) {
  throw new Error('A bancada de testes não encontrou os elementos obrigatórios.');
}

const contexto = canvas.getContext('2d');
if (!contexto) throw new Error('Canvas 2D indisponível.');

type ModalidadeTeste = 'mecânica' | 'térmica';

interface CenárioVisual {
  readonly nome: string;
  readonly descricao: string;
  readonly mundo: MundoFisico;
  readonly objetos: readonly Objeto[];
  readonly superficies: readonly SuperficiePlano[];
  readonly velocidadeTempo: number;
  /** Modalidade apresentada e agrupada pela bancada; não altera o core. */
  readonly modalidade?: ModalidadeTeste;
  readonly limiteVerticalM: number;
  readonly limiteHorizontalM?: number;
  readonly deveEncerrar: () => boolean;
  readonly validar: () => string;
  readonly atualizarControle?: () => void;
  readonly seguirObjeto?: Objeto;
  readonly telemetria?: () => string;
  readonly mangueira?: { readonly tanque: TanquePropelente; readonly propulsor: Propulsor };
  readonly fixadores?: readonly FixadorEstrutural[];
  /** Linha de ação de uma força, usada apenas para tornar o ensaio observável. */
  readonly linhaDeEmpuxo?: () => { readonly origemM: Vetor3; readonly direcao: Vetor3 };
  readonly propulsorControlavel?: Propulsor;
  readonly propulsorVetorizadoControlavel?: PropulsorVetorizado;
  /** Corpo que recebe o comando operacional de abertura na bancada. */
  readonly objetoComParaquedasControlavel?: Objeto;
  /** Expõe parâmetros do paraquedas exclusivamente no cenário de calibração. */
  readonly objetoComParaquedasConfiguravel?: Objeto;
  readonly permiteAjustarThrottle?: boolean;
  readonly cameraX?: () => number;
  readonly cameraY?: () => number;
  readonly dados?: () => string;
}

interface OpcoesQueda {
  readonly nome?: string;
  readonly descricao?: string;
  readonly orientacaoInicialRad?: number;
  readonly velocidadeHorizontalInicialMps?: number;
  readonly limiteHorizontalM?: number;
}

/** A bancada só conclui um cenário quando os corpos já não evoluem visivelmente. */
const objetosEmRepouso = (mundo: MundoFisico, objetos: readonly Objeto[]): boolean => mundo.tempoS >= 0.1 && objetos.every((objeto) => {
  const estado = objeto.getEstadoFisico();
  return estado.velocidadeMps.magnitude <= 0.05 && estado.velocidadeAngularRadps.magnitude <= 0.05;
});

const criarCuboEmQueda = (alturaM: number, massaKg = 10, opcoes: OpcoesQueda = {}): CenárioVisual => {
  // Este grupo declara vácuo para comparar a queda com a equação clássica.
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
  let instanteDoImpactoS: number | undefined;
  let velocidadeDeRetornoMps: number | undefined;
  const cubo = new Objeto({
    id: `cubo-${massaKg}kg-${alturaM}m`, massaBaseKg: massaKg, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    estadoInicial: {
      posicaoM: new Vetor3(0, alturaM, 0),
      velocidadeMps: new Vetor3(opcoes.velocidadeHorizontalInicialMps ?? 0, 0, 0),
      orientacaoRad: new Vetor3(0, 0, opcoes.orientacaoInicialRad ?? 0),
    },
  });
  const solo = new SuperficiePlano(`solo-concreto-${massaKg}kg-${alturaM}m`, 'concreto', 0, 100_000);
  mundo.registrarObjeto(cubo);
  mundo.registrarSuperficie(solo);
  const g = Math.abs(MundoFisico.gravidadeTerrestreMps2.y);
  const alturaDaBaseM = (Math.abs(Math.sin(opcoes.orientacaoInicialRad ?? 0)) + Math.abs(Math.cos(opcoes.orientacaoInicialRad ?? 0))) / 2;
  const distanciaDeQuedaM = alturaM - alturaDaBaseM;
  const velocidadeEsperada = Math.sqrt(2 * g * distanciaDeQuedaM);
  const energiaImpactoJ = 0.5 * massaKg * velocidadeEsperada ** 2;
  return {
    nome: opcoes.nome ?? `Queda livre — ${massaKg} kg de ${alturaM.toLocaleString('pt-BR')} m`,
    descricao: opcoes.descricao ?? `Cubo de ${massaKg} kg e 1 × 1 × 1 m em vácuo, caindo sobre uma superfície de concreto. Compara a velocidade de queda com a equação clássica e mostra a resposta ao impacto.`,
    mundo,
    objetos: [cubo],
    superficies: [solo],
    velocidadeTempo: alturaM >= 10_000 ? 30 : 2,
    limiteVerticalM: alturaM,
    limiteHorizontalM: opcoes.limiteHorizontalM,
    deveEncerrar: () => {
      const velocidadeVerticalMps = cubo.getEstadoFisico().velocidadeMps.y;
      if (instanteDoImpactoS === undefined && velocidadeVerticalMps > 0) {
        instanteDoImpactoS = mundo.tempoS;
        velocidadeDeRetornoMps = velocidadeVerticalMps;
      }
      const estado = cubo.getEstadoFisico();
      const emRepousoSobreSolo = estado.posicaoM.y <= solo.alturaM + cubo.dimensoesM.y / 2 + 0.01
        && Math.abs(estado.velocidadeMps.y) <= 0.05;
      return instanteDoImpactoS !== undefined && emRepousoSobreSolo;
    },
    validar: () => {
      const velocidade = velocidadeDeRetornoMps ?? 0;
      const deveDanificar = energiaImpactoJ > cubo.resistenciaColisaoJ;
      const dissipacaoCombinada = 1 - ((1 - cubo.dissipacaoImpacto) * (1 - solo.dissipacaoImpacto));
      const quiqueEsperadoMps = velocidadeEsperada
        * Math.min(1, Math.min(cubo.resistenciaColisaoJ, solo.resistenciaColisaoJ) / energiaImpactoJ)
        * (1 - dissipacaoCombinada);
      const aprovado = Math.abs(velocidade - quiqueEsperadoMps) < 0.2
        && (!deveDanificar || cubo.integridadeEstrutural === 0);
      const resultadoEstrutural = deveDanificar
        ? `integridade ${Math.round(cubo.integridadeEstrutural * 100)}% (dano esperado)`
        : 'sem dano esperado';
      return `${aprovado ? 'APROVADO' : 'DIVERGENTE'} · velocidade de quique ${velocidade.toFixed(2)} m/s; chegada ${velocidadeEsperada.toFixed(2)} m/s; quique previsto ${quiqueEsperadoMps.toFixed(2)} m/s; energia ${energiaImpactoJ.toFixed(1)} J; ${resultadoEstrutural}`;
    },
  };
};

const criarColisaoFrontal = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const esquerdo = new Objeto({
    id: 'colisor-esquerdo', massaBaseKg: 2, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 1_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(-3, 1, 0), velocidadeMps: new Vetor3(5, 0, 0) },
  });
  const direito = new Objeto({
    id: 'colisor-direito', massaBaseKg: 2, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 1_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(3, 1, 0), velocidadeMps: new Vetor3(-5, 0, 0) },
  });
  mundo.registrarObjeto(esquerdo);
  mundo.registrarObjeto(direito);
  return {
    nome: 'Colisão frontal elástica',
    descricao: 'Dois cubos resistentes de mesma massa devolvem impulso. O quique é calculado pela energia do impacto e resistência estrutural.',
    mundo,
    objetos: [esquerdo, direito],
    superficies: [],
    velocidadeTempo: 1,
    limiteVerticalM: 5,
    deveEncerrar: () => objetosEmRepouso(mundo, [esquerdo, direito]),
    validar: () => `${esquerdo.getEstadoFisico().velocidadeMps.x < 0 && direito.getEstadoFisico().velocidadeMps.x > 0 ? 'APROVADO' : 'DIVERGENTE'} · velocidades x: ${esquerdo.getEstadoFisico().velocidadeMps.x.toFixed(2)} / ${direito.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s`,
  };
};

const criarTesteQuadradosEmpilhados = (tipo: 'queda-conjunta' | 'queda-conjunta-superior-leve' | 'queda-sobre-apoio' | 'leve-sobre-pesado-apoiado' | 'quase-igual-sobre-apoiado'): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const solo = new SuperficiePlano(`solo-quadrados-${tipo}`, 'concreto', 0, 100_000);
  const quedaConjunta = tipo === 'queda-conjunta' || tipo === 'queda-conjunta-superior-leve';
  const superiorLeve = tipo === 'queda-conjunta-superior-leve';
  const leveSobrePesado = tipo === 'leve-sobre-pesado-apoiado';
  const quaseIgual = tipo === 'quase-igual-sobre-apoiado';
  const inferior = new Objeto({
    id: `quadrado-inferior-${tipo}`, massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(0, quedaConjunta ? 10.5 : 0.5, 0) },
  });
  const superior = new Objeto({
    id: `quadrado-superior-${tipo}`, massaBaseKg: superiorLeve || leveSobrePesado ? 0.5 : quaseIgual ? 0.99 : 1, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(0, quedaConjunta ? 11.5 : 10.5, 0) },
  });
  mundo.registrarSuperficie(solo);
  mundo.registrarObjeto(inferior);
  mundo.registrarObjeto(superior);
  return {
    nome: quaseIgual ? 'Quadrado de 0,99 kg sobre 1 kg apoiado — queda de 10 m' : leveSobrePesado ? 'Quadrado leve sobre pesado apoiado — queda de 10 m' : tipo === 'queda-sobre-apoio' ? 'Quadrado sobre quadrado apoiado — queda de 10 m' : superiorLeve ? 'Quadrados empilhados — superior de 0,5 kg' : 'Dois quadrados empilhados — queda de 10 m',
    descricao: quaseIgual
      ? 'Um quadrado de 1 kg está em repouso no concreto; outro de 0,99 kg cai de 10 m sobre ele. Compare este resultado com a variação de massas idênticas: a resposta deve mudar continuamente.'
      : leveSobrePesado
      ? 'Um quadrado de 1 kg está em repouso no concreto; outro de 0,5 kg cai de 10 m diretamente sobre ele. A reação do solo e o impulso entre as massas devem resultar da física de contato.'
      : tipo === 'queda-sobre-apoio'
      ? 'Um quadrado de 1 kg está em repouso no concreto; outro, idêntico, cai de 10 m diretamente sobre ele. O impacto deve atravessar a cadeia de contatos sem interpenetração.'
      : superiorLeve
        ? 'Quadrado inferior de 1 kg e quadrado superior de 0,5 kg, encostados verticalmente, caem juntos de 10 m sobre concreto. A massa distinta deve alterar a resposta ao impacto sem romper o apoio físico.'
        : 'Dois quadrados de 1 kg, encostados verticalmente, caem juntos de 10 m sobre concreto. O contato entre eles e com o solo deve permanecer físico.',
    mundo, objetos: [inferior, superior], superficies: [solo], velocidadeTempo: 2, limiteVerticalM: 12,
    deveEncerrar: () => objetosEmRepouso(mundo, [inferior, superior])
      && inferior.getEstadoFisico().posicaoM.y >= 0.5 - 1e-8
      && superior.getEstadoFisico().posicaoM.y >= 1.5 - 1e-8,
    validar: () => {
      const distanciaM = superior.getEstadoFisico().posicaoM.y - inferior.getEstadoFisico().posicaoM.y;
      return `${distanciaM >= 1 - 1e-8 ? 'APROVADO' : 'DIVERGENTE'} · separação vertical ${distanciaM.toFixed(3)} m; integridade ${Math.round(inferior.integridadeEstrutural * 100)}% / ${Math.round(superior.integridadeEstrutural * 100)}%`;
    },
  };
};

const criarTestePilhaDezQuadradosAtingida = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const solo = new SuperficiePlano('solo-pilha-dez-quadrados', 'concreto', 0, 100_000);
  const xDaPilhaM = 3;
  const pilha = Array.from({ length: 10 }, (_, indice) => new Objeto({
    id: `pilha-quadrado-${indice + 1}`,
    massaBaseKg: 1,
    dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 10_000,
    resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(xDaPilhaM, 0.5 + indice, 0) },
  }));
  const projetil = new Objeto({
    id: 'projetil-2kg-contra-pilha',
    massaBaseKg: 2,
    dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 10_000,
    resistenciaCalorK: 1_000,
    // O centro está na altura do segundo quadrado contado de baixo para cima.
    estadoInicial: { posicaoM: new Vetor3(-1, 1.5, 0), velocidadeMps: new Vetor3(10, 0, 0) },
  });
  mundo.registrarSuperficie(solo);
  for (const quadrado of pilha) mundo.registrarObjeto(quadrado);
  mundo.registrarObjeto(projetil);

  const segundoQuadrado = pilha[1];
  return {
    nome: 'Pilha de 10 quadrados — impacto no segundo elemento',
    descricao: 'Dez quadrados independentes, cada um com 1 kg e 1 × 1 m, estão apenas encostados sobre concreto: não há fixadores entre eles. Um quadrado de 2 kg vem pela esquerda a 10 m/s e atinge o segundo elemento contado de baixo para cima. O impulso deve atravessar somente os contatos físicos e a pilha pode tombar ou se dispersar.',
    mundo,
    objetos: [...pilha, projetil],
    superficies: [solo],
    velocidadeTempo: 1,
    limiteVerticalM: 12,
    limiteHorizontalM: 14,
    deveEncerrar: () => objetosEmRepouso(mundo, [...pilha, projetil]),
    telemetria: () => `projetil ${projetil.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s · segundo quadrado x=${segundoQuadrado.getEstadoFisico().posicaoM.x.toFixed(2)} m`,
    dados: () => `Pilha: 10 corpos soltos de 1 kg\nProjétil: 2 kg, 1 × 1 m\nImpacto: segundo quadrado (altura 1,5 m)\nVelocidade inicial: 10,0 m/s\nFixadores: nenhum\nDeslocamento do segundo: ${(segundoQuadrado.getEstadoFisico().posicaoM.x - xDaPilhaM).toFixed(3)} m`,
    validar: () => {
      const deslocamentoSegundoM = segundoQuadrado.getEstadoFisico().posicaoM.x - xDaPilhaM;
      const houveTransferencia = Math.abs(deslocamentoSegundoM) > 0.05 || Math.abs(segundoQuadrado.getEstadoFisico().velocidadeMps.x) > 0.05;
      return `${houveTransferencia ? 'APROVADO' : 'AGUARDANDO IMPACTO'} · segundo quadrado deslocou ${deslocamentoSegundoM.toFixed(3)} m; projétil ${projetil.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s; sem vínculos estruturais`;
    },
  };
};

const criarColisaoPorResistencia = (resistenciaJ: number): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const criarColisor = (id: string, x: number, velocidadeX: number) => new Objeto({
    id, massaBaseKg: 2, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: resistenciaJ, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(x, 1, 0), velocidadeMps: new Vetor3(velocidadeX, 0, 0) },
  });
  const esquerdo = criarColisor(`resistencia-${resistenciaJ}-esquerdo`, -3, 10);
  const direito = criarColisor(`resistencia-${resistenciaJ}-direito`, 3, -10);
  mundo.registrarObjeto(esquerdo);
  mundo.registrarObjeto(direito);
  return {
    nome: `Resistência a colisão — ${resistenciaJ} J`,
    descricao: 'Colisão com energia aproximada de 200 J. Compare a integridade resultante com o limite estrutural de cada objeto.',
    mundo,
    objetos: [esquerdo, direito],
    superficies: [],
    velocidadeTempo: 1,
    limiteVerticalM: 5,
    deveEncerrar: () => objetosEmRepouso(mundo, [esquerdo, direito]),
    validar: () => `INTEGRIDADE · ${Math.round(esquerdo.integridadeEstrutural * 100)}% / ${Math.round(direito.integridadeEstrutural * 100)}%`,
  };
};

const criarColisaoComTorque = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const esquerdo = new Objeto({
    id: 'retangulo-esquerdo', massaBaseKg: 10, dimensoesM: new Vetor3(3, 1, 1),
    resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(-3, 1.05, 0), velocidadeMps: new Vetor3(5, 0, 0) },
  });
  const direito = new Objeto({
    id: 'retangulo-direito', massaBaseKg: 10, dimensoesM: new Vetor3(3, 1, 1),
    resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(3, 1, 0), velocidadeMps: new Vetor3(-5, 0, 0) },
  });
  mundo.registrarObjeto(esquerdo);
  mundo.registrarObjeto(direito);
  return {
    nome: 'Colisão com torque — base tripla',
    descricao: 'Retângulos de 3 × 1 m colidem fora do centro de massa. O impulso cria velocidade angular.',
    mundo,
    objetos: [esquerdo, direito],
    superficies: [],
    velocidadeTempo: 1,
    limiteVerticalM: 5,
    deveEncerrar: () => objetosEmRepouso(mundo, [esquerdo, direito]),
    validar: () => {
      const giro = Math.abs(esquerdo.getEstadoFisico().velocidadeAngularRadps.z) + Math.abs(direito.getEstadoFisico().velocidadeAngularRadps.z);
      return `${giro > 0.01 ? 'APROVADO' : 'DIVERGENTE'} · velocidade angular total ${giro.toFixed(3)} rad/s`;
    },
  };
};

const criarTesteImpactoNoRetangulo = (nomeDoImpacto: string, alturaDeImpactoM: number, indice: number): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const solo = new SuperficiePlano(`solo-impacto-retangulo-${indice}`, 'concreto', 0, 100_000);
  const retangulo = new Objeto({
    id: `retangulo-vertical-${indice}`, massaBaseKg: 10, dimensoesM: new Vetor3(1, 10, 1),
    resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(0, 5.001, 0) },
  });
  const quadrado = new Objeto({
    id: `quadrado-impacto-${indice}`, massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    // A velocidade inicial é o impulso externo do disparo. Não há propulsor,
    // força programada ou reposição de energia depois do lançamento.
    estadoInicial: { posicaoM: new Vetor3(-4, alturaDeImpactoM, 0), velocidadeMps: new Vetor3(20, 0, 0) },
  });
  mundo.registrarSuperficie(solo);
  mundo.registrarObjeto(retangulo);
  mundo.registrarObjeto(quadrado);

  return {
    nome: `Retângulo — ${nomeDoImpacto}`,
    descricao: `Retângulo de 1 × 10 m e 10 kg sobre concreto. Um quadrado passivo de 1 × 1 m e 1 kg é disparado horizontalmente a ${alturaDeImpactoM.toFixed(2)} m; após o impulso inicial, atua apenas a física do mundo.`,
    mundo,
    objetos: [retangulo, quadrado],
    superficies: [solo],
    velocidadeTempo: 2,
    limiteVerticalM: 12,
    deveEncerrar: () => [retangulo, quadrado].every((objeto) => {
      const estado = objeto.getEstadoFisico();
      const apoiado = estado.posicaoM.y <= solo.alturaM + objeto.dimensoesM.y / 2 + 0.01;
      return apoiado && estado.velocidadeMps.magnitude <= 0.05 && estado.velocidadeAngularRadps.magnitude <= 0.05;
    }),
    validar: () => {
      const giroRadps = retangulo.getEstadoFisico().velocidadeAngularRadps.z;
      const velocidadeDoQuadradoMps = quadrado.getEstadoFisico().velocidadeMps.x;
      const impactoCentral = alturaDeImpactoM === 5;
      const aprovado = impactoCentral
        ? Math.abs(giroRadps) < 0.01 && velocidadeDoQuadradoMps < 0
        : Math.abs(giroRadps) > 0.01 && velocidadeDoQuadradoMps < 0;
      const efeitoEsperado = impactoCentral
        ? 'impacto central: retorno do quadrado sem torque ideal.'
        : 'impacto fora do centro: há quique e parte da energia torna-se rotação do retângulo.';
      return `${aprovado ? 'APROVADO' : 'DIVERGENTE'} · rotação ${giroRadps.toFixed(3)} rad/s; velocidade final do quadrado ${velocidadeDoQuadradoMps.toFixed(2)} m/s; ${efeitoEsperado}`;
    },
  };
};

const criarTesteParaquedas = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const solo = new SuperficiePlano('solo-paraquedas', 'concreto', 0, 1_000_000, 0.02, 0.9);
  const quadrado = new Objeto({
    id: 'quadrado-com-paraquedas', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    areaFrontalM2: 1, coeficienteArrasto: 1, estadoInicial: { posicaoM: new Vetor3(0, 1_000, 0) },
  });
  quadrado.acoplarParaquedas(new Paraquedas({ id: 'paraquedas-quadrado', areaFrontalM2: 25 }));
  mundo.registrarObjeto(quadrado); mundo.registrarSuperficie(solo);
  let alturaDeAberturaM: number | undefined;
  let velocidadeAntesDaAberturaMps: number | undefined;
  return {
    nome: 'Paraquedas — queda de 1.000 m, abertura a 200 m',
    descricao: 'Quadrado de 10 kg cai em atmosfera padrão. Ao atingir 200 m acima do solo, o paraquedas de 25 m² é acionado; ele aumenta o arrasto efetivo e reduz a velocidade vertical de descida.',
    mundo, objetos: [quadrado], superficies: [solo], velocidadeTempo: 10, limiteVerticalM: 1_000,
    objetoComParaquedasControlavel: quadrado, objetoComParaquedasConfiguravel: quadrado,
    atualizarControle: () => {
      const estado = quadrado.getEstadoFisico();
      if (!quadrado.paraquedasEstaAberto && estado.posicaoM.y <= 200) {
        alturaDeAberturaM = estado.posicaoM.y;
        velocidadeAntesDaAberturaMps = estado.velocidadeMps.y;
        quadrado.acionarParaquedas();
      }
    },
    telemetria: () => `velocidade vertical ${quadrado.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s`,
    dados: () => `Altura: ${quadrado.getEstadoFisico().posicaoM.y.toFixed(1)} m\nVelocidade vertical: ${quadrado.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s\nParaquedas: ${quadrado.paraquedasEstaAberto ? 'ABERTO' : 'fechado'}\nAbertura: ${alturaDeAberturaM?.toFixed(1) ?? 'aguardando'} m\nVelocidade na abertura: ${velocidadeAntesDaAberturaMps?.toFixed(2) ?? '—'} m/s`,
    deveEncerrar: () => objetosEmRepouso(mundo, [quadrado]),
    validar: () => `${quadrado.paraquedasEstaAberto && (velocidadeAntesDaAberturaMps ?? 0) < -5 ? 'APROVADO' : 'DIVERGENTE'} · abertura a ${(alturaDeAberturaM ?? 0).toFixed(1)} m; velocidade vertical final ${quadrado.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s`,
  };
};

const criarTesteAreaDeContato = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const criarObjetoComArea = (id: string, x: number, areaFrontalM2: number, dimensoesM: Vetor3) => new Objeto({
    id, massaBaseKg: 10, dimensoesM, resistenciaColisaoJ: 10_000, resistenciaCalorK: 1_000,
    areaFrontalM2, coeficienteArrasto: 1,
    estadoInicial: { posicaoM: new Vetor3(x, 100, 0) },
  });
  const areaGrande = criarObjetoComArea('area-100m2', -20, 100, new Vetor3(10, 10, 1));
  const areaPequena = criarObjetoComArea('area-1m2', 20, 1, new Vetor3(1, 1, 1));
  mundo.registrarObjeto(areaGrande);
  mundo.registrarObjeto(areaPequena);
  return {
    nome: 'Arrasto atmosférico — 100 m² × 1 m²',
    descricao: 'Dois objetos de 10 kg caem no ar a 1,225 kg/m³. O retângulo roxo tem 100 m² de área frontal; o azul, 1 m².',
    mundo,
    objetos: [areaGrande, areaPequena],
    superficies: [],
    velocidadeTempo: 1,
    limiteVerticalM: 100,
    deveEncerrar: () => objetosEmRepouso(mundo, [areaGrande, areaPequena]),
    validar: () => {
      const velocidadeGrande = Math.abs(areaGrande.getEstadoFisico().velocidadeMps.y);
      const velocidadePequena = Math.abs(areaPequena.getEstadoFisico().velocidadeMps.y);
      return `${velocidadeGrande < velocidadePequena ? 'APROVADO' : 'DIVERGENTE'} · 100 m²: ${velocidadeGrande.toFixed(2)} m/s · 1 m²: ${velocidadePequena.toFixed(2)} m/s`;
    },
  };
};

const criarVeiculoTerrestre = (id: string, x: number, velocidadeX = 0, coeficienteAtritoEntreObjetos = 0): VeiculoTerrestre => new VeiculoTerrestre({
  id,
  massaBaseKg: 1_500,
  dimensoesM: new Vetor3(4, 1.5, 1.8),
  // Aproximação para um carro médio no modelo contínuo de dano do core.
  resistenciaColisaoJ: 50_000,
  resistenciaCalorK: 1_000,
  quantidadeRodas: 4,
  forcaTracaoMaximaN: 4_500,
  forcaFrenagemMaximaN: 9_000,
  coeficienteAderenciaPneus: 0.9,
  coeficienteResistenciaRolamento: 0.01,
  coeficienteAtritoEntreObjetos,
  estadoInicial: { posicaoM: new Vetor3(x, 0.75, 0), velocidadeMps: new Vetor3(velocidadeX, 0, 0) },
});

const criarTesteVeiculoTerrestre = (tipo: 'aceleracao' | 'frenagem' | 'colisao'): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const pista = new SuperficiePlano(`pista-${tipo}`, 'outro', 0, 1_000_000, 0.02, 0.9);
  const veiculo = criarVeiculoTerrestre(`veiculo-1500kg-${tipo}`, 0, tipo === 'frenagem' ? 12 : 0);
  mundo.registrarSuperficie(pista);
  mundo.registrarObjeto(veiculo);

  if (tipo === 'aceleracao') {
    veiculo.definirComandoTracao(1);
    return {
      nome: 'Veículo com rodas — aceleração',
      descricao: 'Veículo terrestre de 1.500 kg, quatro rodas e tração máxima de 4.500 N. A aderência dos pneus limita a força; o core integra o deslocamento sobre a pista.',
      mundo, objetos: [veiculo], superficies: [pista], velocidadeTempo: 1, limiteVerticalM: 4, limiteHorizontalM: 12,
      deveEncerrar: () => objetosEmRepouso(mundo, [veiculo]),
      validar: () => {
        const estado = veiculo.getEstadoFisico();
        return `${estado.velocidadeMps.x > 5 ? 'APROVADO' : 'DIVERGENTE'} · velocidade ${estado.velocidadeMps.x.toFixed(2)} m/s; deslocamento ${estado.posicaoM.x.toFixed(2)} m; massa ${veiculo.massaKg.toLocaleString('pt-BR')} kg`;
      },
    };
  }

  if (tipo === 'frenagem') {
    veiculo.definirComandoFreio(1);
    return {
      nome: 'Veículo com rodas — frenagem',
      descricao: 'O mesmo veículo de 1.500 kg inicia a 12 m/s. Os freios geram uma força oposta ao movimento, também limitada pela aderência dos pneus.',
      mundo, objetos: [veiculo], superficies: [pista], velocidadeTempo: 1, limiteVerticalM: 4, limiteHorizontalM: 12,
      deveEncerrar: () => objetosEmRepouso(mundo, [veiculo]),
      validar: () => {
        const velocidade = veiculo.getEstadoFisico().velocidadeMps.x;
        return `${velocidade >= 0 && velocidade < 6 ? 'APROVADO' : 'DIVERGENTE'} · velocidade inicial 12,00 m/s; final ${velocidade.toFixed(2)} m/s`;
      },
    };
  }

  const parede = new Objeto({
    id: 'parede-retangulo-4000kg', massaBaseKg: 4_000, dimensoesM: new Vetor3(1, 3, 3),
    resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(16, 1.5, 0) },
  });
  mundo.registrarObjeto(parede);
  veiculo.definirComandoTracao(1);
  return {
    nome: 'Veículo com rodas — colisão contra parede de 4.000 kg',
    descricao: 'Veículo de 1.500 kg acelera pela própria tração em direção a uma parede retangular móvel de 4.000 kg. A colisão deve transferir impulso à parede; ela não é um obstáculo estático.',
    mundo, objetos: [veiculo, parede], superficies: [pista], velocidadeTempo: 1, limiteVerticalM: 5, limiteHorizontalM: 22,
    deveEncerrar: () => objetosEmRepouso(mundo, [veiculo, parede]),
    validar: () => {
      const velocidadeParede = parede.getEstadoFisico().velocidadeMps.x;
      const velocidadeVeiculo = veiculo.getEstadoFisico().velocidadeMps.x;
      return `${velocidadeParede > 0.05 ? 'APROVADO' : 'DIVERGENTE'} · parede: ${velocidadeParede.toFixed(2)} m/s; veículo após impacto: ${velocidadeVeiculo.toFixed(2)} m/s; parede deslocada ${(parede.getEstadoFisico().posicaoM.x - 16).toFixed(3)} m`;
    },
  };
};

const criarTesteVeiculoContraRampa30Graus = (velocidadeInicialMps: number): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const pista = new SuperficiePlano('pista-rampa-30-graus', 'outro', 0, 1_000_000, 0.02, 0.9);
  const veiculo = criarVeiculoTerrestre(`veiculo-rampa-30-graus-${velocidadeInicialMps}`, 0, velocidadeInicialMps);
  const baseRampaM = 6;
  const alturaRampaM = baseRampaM * Math.tan(Math.PI / 6);
  const rampa = new ObjetoTriangularRetangulo({
    id: 'rampa-triangular-30-graus', massaBaseKg: 4_000, dimensoesM: new Vetor3(baseRampaM, alturaRampaM, 3),
    inclinacaoRad: Math.PI / 6, resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(12, alturaRampaM / 3, 0) },
  });
  mundo.registrarSuperficie(pista);
  mundo.registrarObjeto(veiculo);
  mundo.registrarObjeto(rampa);
  veiculo.definirComandoTracao(1);
  return {
    nome: `Veículo com rodas — rampa triangular a 30° (${velocidadeInicialMps} m/s)`,
    descricao: `Veículo de 1.500 kg parte de ${velocidadeInicialMps} m/s e continua acelerando pela pista até uma rampa triangular reta de 4.000 kg. A hipotenusa possui 30° de inclinação em relação ao solo e participa diretamente da colisão.`,
    mundo, objetos: [veiculo, rampa], superficies: [pista], velocidadeTempo: 1, limiteVerticalM: 7, limiteHorizontalM: 22,
    deveEncerrar: () => objetosEmRepouso(mundo, [veiculo, rampa]),
    validar: () => {
      const velocidadeRampa = rampa.getEstadoFisico().velocidadeMps.x;
      return `${velocidadeRampa > 0.05 ? 'APROVADO' : 'DIVERGENTE'} · inclinação 30°; rampa ${velocidadeRampa.toFixed(2)} m/s; veículo ${veiculo.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s; integridade ${Math.round(veiculo.integridadeEstrutural * 100)}%`;
    },
  };
};

const criarTesteVeiculoAlado = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const pista = new SuperficiePlano('pista-veiculo-alado', 'outro', 0, 1_000_000, 0.02, 0.9);
  const veiculo = new VeiculoAlado({
    id: 'veiculo-alado-1500kg', massaBaseKg: 1_500, dimensoesM: new Vetor3(4, 1.5, 1.8),
    resistenciaColisaoJ: 50_000, resistenciaCalorK: 1_000, areaFrontalM2: 2.5, coeficienteArrasto: 0.35,
    quantidadeRodas: 4, forcaTracaoMaximaN: 4_500, forcaFrenagemMaximaN: 9_000, coeficienteAderenciaPneus: 0.9,
    coeficienteResistenciaRolamento: 0.01, raioRodaM: 0.35,
    areaAsaM2: 24, anguloIncidenciaRad: 0.12, coeficienteSustentacaoPorRad: 5.7, coeficienteArrastoAsa: 0.04, anguloEstolRad: 0.35,
    estadoInicial: { posicaoM: new Vetor3(0, 0.75, 0) },
  });
  mundo.registrarSuperficie(pista);
  mundo.registrarObjeto(veiculo);
  veiculo.definirComandoTracao(1);
  let tracaoDesligada = false;
  let pousou = false;
  return {
    nome: 'Veículo alado — decolagem a 1 m e retorno',
    descricao: 'Veículo de 1.500 kg acelera progressivamente; a asa gera sustentação. Ao ultrapassar 1 m de altura, a tração é desligada. Ao retornar à pista, inicia frenagem pelas rodas.',
    mundo, objetos: [veiculo], superficies: [pista], velocidadeTempo: 3, limiteVerticalM: 25, limiteHorizontalM: 20,
    seguirObjeto: veiculo,
    atualizarControle: () => {
      const estado = veiculo.getEstadoFisico();
      if (!tracaoDesligada && estado.posicaoM.y >= 1) {
        tracaoDesligada = true;
        veiculo.definirComandoTracao(0);
      }
      if (tracaoDesligada && estado.posicaoM.y <= 0.77 && estado.velocidadeMps.y <= 0) {
        pousou = true;
        veiculo.definirComandoFreio(1);
      }
    },
    deveEncerrar: () => pousou && objetosEmRepouso(mundo, [veiculo]),
    telemetria: () => `${(veiculo.getEstadoFisico().velocidadeMps.magnitude * 3.6).toFixed(1)} km/h`,
    validar: () => `${tracaoDesligada && pousou ? 'APROVADO' : 'DIVERGENTE'} · tração desligada a 1 m; frenagem no retorno; integridade ${Math.round(veiculo.integridadeEstrutural * 100)}%`,
  };
};

/**
 * Orquestração de missão da partida básica. Cada etapa chama a mesma API que
 * a bancada manual usa; não há alteração direta de estado nem atalho de
 * ignição. Os comandos são emitidos uma única vez para preservar o histórico
 * operacional que também seria visto em manutenção.
 */
const criarPartidaAutomaticaBasica = (mundo: MundoFisico, propulsor: Propulsor): (() => void) => {
  let eletricaComandada = false;
  let hidraulicaComandada = false;
  let combustivelComandado = false;
  let controleComandado = false;
  let ignicaoComandada = false;
  return () => {
    const tempoS = mundo.tempoS;
    if (!eletricaComandada && tempoS >= 0) {
      eletricaComandada = true;
      propulsor.ligarSistema('elétrico');
    }
    if (!hidraulicaComandada && tempoS >= 0.1) {
      hidraulicaComandada = true;
      propulsor.ligarSistema('hidráulico');
    }
    if (!combustivelComandado && tempoS >= 0.2) {
      combustivelComandado = true;
      propulsor.ligarSistema('combustível');
    }
    if (!controleComandado && tempoS >= 0.3) {
      controleComandado = true;
      propulsor.ligarSistema('controle');
    }
    if (!ignicaoComandada && tempoS >= 1) {
      ignicaoComandada = true;
      propulsor.solicitarIgnicao();
    }
  };
};

const criarTesteVeiculoComposto = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const veiculo = new VeiculoComposto({
    id: 'veiculo-composto-corpo', massaBaseKg: 120, dimensoesM: new Vetor3(4, 1, 1),
    resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000, areaFrontalM2: 2, coeficienteArrasto: 0.8,
    estadoInicial: { posicaoM: new Vetor3(0, 15, 0) },
  });
  const tanque = new TanquePropelente({
    id: 'veiculo-composto-tanque', massaBaseKg: 100, capacidadePropelenteKg: 800, massaPropelenteInicialKg: 800, tipoPropelente: 'metano',
    dimensoesM: new Vetor3(2, 3, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(0, 18, 0) },
  });
  const criarPropulsor = (id: string, x: number) => new Propulsor({
    id, massaBaseKg: 50, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 8_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano',
    estadoInicial: { posicaoM: new Vetor3(x, 13, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  const propulsorA = criarPropulsor('veiculo-composto-propulsor-a', -1.3);
  const propulsorB = criarPropulsor('veiculo-composto-propulsor-b', 1.3);
  propulsorA.conectarTanque(tanque, 8);
  propulsorB.conectarTanque(tanque, 8);
  veiculo.acoplarParaquedas(new Paraquedas({ id: 'veiculo-composto-paraquedas', areaFrontalM2: 10 }));
  for (const modulo of [tanque, propulsorA, propulsorB]) veiculo.adicionarModulo(modulo);
  veiculo.instalarPropulsor(propulsorA);
  veiculo.instalarPropulsor(propulsorB);
  const fixadores = [
    new FixadorEstrutural({ id: 'veiculo-composto-fixador-tanque', objetoA: veiculo, objetoB: tanque, resistenciaTracaoN: 30_000, obterEsforcoSolicitadoN: () => propulsorA.empuxoAtualN + propulsorB.empuxoAtualN }),
    new FixadorEstrutural({ id: 'veiculo-composto-fixador-a', objetoA: veiculo, objetoB: propulsorA, resistenciaTracaoN: 12_000, obterEsforcoSolicitadoN: () => propulsorA.empuxoAtualN }),
    new FixadorEstrutural({ id: 'veiculo-composto-fixador-b', objetoA: veiculo, objetoB: propulsorB, resistenciaTracaoN: 12_000, obterEsforcoSolicitadoN: () => propulsorB.empuxoAtualN }),
  ];
  for (const fixador of fixadores) veiculo.adicionarFixador(fixador);
  veiculo.registrarNoMundo(mundo);
  veiculo.definirThrottleDeTodosOsPropulsores(0.8);
  let partidaComandada = false;
  let massaInicialKg = veiculo.massaInstantaneaDoConjuntoKg;
  return {
    nome: 'Veículo composto — tanque, dois propulsores e paraquedas',
    descricao: 'O corpo central, tanque e dois propulsores são Objetos físicos independentes unidos por três fixadores. O computador de voo solicita a partida dos dois propulsores após 1 s, executando a mesma sequência elétrica → hidráulica → combustível → controle → ignição. O paraquedas está acoplado ao corpo central e pode ser acionado manualmente.',
    mundo, objetos: [veiculo, ...veiculo.modulosFisicos], superficies: [], velocidadeTempo: 1, limiteVerticalM: 30, limiteHorizontalM: 12,
    seguirObjeto: veiculo, fixadores, objetoComParaquedasControlavel: veiculo, objetoComParaquedasConfiguravel: veiculo,
    atualizarControle: () => {
      if (!partidaComandada && mundo.tempoS >= 1) {
        partidaComandada = true;
        veiculo.solicitarIgnicaoDosPropulsores();
      }
    },
    telemetria: () => `massa conectada ${veiculo.massaInstantaneaDoConjuntoKg.toFixed(1)} kg · velocidade vertical ${veiculo.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s`,
    dados: () => `Massa conectada: ${veiculo.massaInstantaneaDoConjuntoKg.toFixed(1)} / ${massaInicialKg.toFixed(1)} kg\nCentro de massa: (${veiculo.centroDeMassaDoConjuntoM.x.toFixed(2)}, ${veiculo.centroDeMassaDoConjuntoM.y.toFixed(2)}) m\nMódulos ligados: ${veiculo.obterObjetosFisicosConectados().length}\nTanque: ${tanque.massaPropelenteKg.toFixed(1)} / ${tanque.massaPropelenteInicialKg.toFixed(1)} kg\nEmpuxo A / B: ${propulsorA.empuxoAtualN.toFixed(0)} / ${propulsorB.empuxoAtualN.toFixed(0)} N\nIgnição A / B: ${propulsorA.estaIgnitado ? 'OK' : 'pendente'} / ${propulsorB.estaIgnitado ? 'OK' : 'pendente'}\nParaquedas: ${veiculo.paraquedasEstaAberto ? 'ABERTO' : 'fechado'}\nFixadores: ${fixadores.map((fixador) => fixador.estaRompido ? 'ROMPIDO' : 'íntegro').join(' · ')}`,
    deveEncerrar: () => false,
    validar: () => `${partidaComandada && propulsorA.empuxoAtualN > 0 && propulsorB.empuxoAtualN > 0 ? 'APROVADO' : 'AGUARDANDO PARTIDA'} · massa conectada ${veiculo.massaInstantaneaDoConjuntoKg.toFixed(1)} kg; empuxo total ${(propulsorA.empuxoAtualN + propulsorB.empuxoAtualN).toFixed(0)} N`,
  };
};

const criarTestePropulsorContraParede = (throttle: number): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const pista = new SuperficiePlano(`pista-propulsor-${throttle}`, 'outro', 0, 1_000_000, 0.02, 0.9);
  const tanque = new TanquePropelente({
    id: `tanque-metano-${throttle}`, massaBaseKg: 200, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'metano', capacidadePropelenteKg: 20, massaPropelenteInicialKg: 20, estadoInicial: { posicaoM: new Vetor3(-7, 0.5, 0) },
  });
  const propulsor = new Propulsor({
    id: `propulsor-${throttle}`, massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano', estadoInicial: { posicaoM: new Vetor3(2, 0.5, 0) },
  });
  const parede = new Objeto({
    id: `parede-10000kg-${throttle}`, massaBaseKg: 10_000, dimensoesM: new Vetor3(1, 3, 3), resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(3, 1.5, 0) },
  });
  propulsor.conectarTanque(tanque, 10);
  propulsor.definirThrottle(throttle);
  const atualizarPartida = criarPartidaAutomaticaBasica(mundo, propulsor);
  mundo.registrarSuperficie(pista);
  mundo.registrarObjeto(tanque);
  mundo.registrarObjeto(propulsor);
  mundo.registrarObjeto(parede);
  let picoVelocidadeParedeMps = 0;
  return {
    nome: `Propulsor horizontal — parede de 10.000 kg (${Math.round(throttle * 100)}%)`,
    descricao: `Propulsor de 20.000 N recebe metano de tanque conectado a 9 m e empurra horizontalmente, por contato, uma parede livre de 10.000 kg. A mangueira suporta até 10 m, deixando 1 m de folga. Throttle ${Math.round(throttle * 100)}%; não há fixação à parede. O controlador de bancada comanda elétrica, hidráulica, combustível e controle em sequência; a ignição é solicitada após 1 s.`,
    mundo, objetos: [tanque, propulsor, parede], superficies: [pista], velocidadeTempo: 2, limiteVerticalM: 5,
    mangueira: { tanque, propulsor },
    propulsorControlavel: propulsor,
    atualizarControle: atualizarPartida,
    cameraX: () => (tanque.getEstadoFisico().posicaoM.x + parede.getEstadoFisico().posicaoM.x) / 2,
    dados: () => `Empuxo: ${propulsor.empuxoAtualN.toFixed(0)} N\nVazão: ${propulsor.vazaoAtualKgS.toFixed(2)} kg/s\nMetano: ${tanque.massaPropelenteKg.toFixed(2)} / ${tanque.massaPropelenteInicialKg.toFixed(2)} kg\nConsumido: ${tanque.massaPropelenteConsumidaKg.toFixed(2)} kg\nIntegridade do propulsor: ${(propulsor.integridadeEstrutural * 100).toFixed(0)}%\nIntegridade da parede: ${(parede.integridadeEstrutural * 100).toFixed(0)}%\nMangueira: ${propulsor.mangueiraEstaRompida ? 'ROMPIDA' : '9,00 / 10,00 m — íntegra'}\nElétrica: ${propulsor.obterEstadoDoSistema('elétrico')}\nHidráulica: ${propulsor.obterEstadoDoSistema('hidráulico')}\nCombustível: ${propulsor.obterEstadoDoSistema('combustível')}\nControle: ${propulsor.obterEstadoDoSistema('controle')}\nIgnição: ${propulsor.estaIgnitado ? 'confirmada' : 'pendente'}\nDiagnóstico: ${propulsor.diagnosticoOperacional.length === 0 ? 'operacional' : propulsor.diagnosticoOperacional.join(', ')}`,
    deveEncerrar: () => {
      picoVelocidadeParedeMps = Math.max(picoVelocidadeParedeMps, parede.getEstadoFisico().velocidadeMps.x);
      return false;
    },
    validar: () => `${picoVelocidadeParedeMps > 0 ? 'APROVADO' : 'DIVERGENTE'} · empuxo ${propulsor.empuxoAtualN.toFixed(0)} N; propelente ${tanque.massaPropelenteKg.toFixed(2)} kg; pico da parede ${picoVelocidadeParedeMps.toFixed(2)} m/s`,
  };
};

const criarTesteTermicoDoPropulsor = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { temperaturaAmbienteC: 20 });
  const solo = new SuperficiePlano('solo-termico', 'concreto', 0, 1_000_000);
  const fundacao = new Objeto({ id: 'fundacao-termica', massaBaseKg: 500_000, dimensoesM: new Vetor3(12, 4, 2), resistenciaColisaoJ: 10_000_000, resistenciaCalorK: 873.15, limiteTermicoC: 600, capacidadeTermicaJPorC: 10_000_000, estadoInicial: { posicaoM: new Vetor3(0, 2, 0) } });
  const bancada = new Objeto({ id: 'bancada-termica-2000kg', massaBaseKg: 2_000, dimensoesM: new Vetor3(6, 4, 1), resistenciaColisaoJ: 1_000_000, resistenciaCalorK: 873.15, limiteTermicoC: 600, capacidadeTermicaJPorC: 1_000_000, areaTermicaM2: 12, estadoInicial: { posicaoM: new Vetor3(0, 2, 0) } });
  const propulsor = new Propulsor({ id: 'propulsor-termico', massaBaseKg: 150, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_073.15, limiteTermicoC: 800, capacidadeTermicaJPorC: 500_000, areaTermicaM2: 2, coeficienteConveccaoWPorM2C: 30, empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, potenciaTermicaMaximaW: 3_000_000, propelenteCompativel: 'metano', estadoInicial: { posicaoM: new Vetor3(0, 2, 0) } });
  const tanque = new TanquePropelente({ id: 'tanque-termico', massaBaseKg: 300, capacidadePropelenteKg: 100, massaPropelenteInicialKg: 100, tipoPropelente: 'metano', dimensoesM: new Vetor3(1, 2, 1), resistenciaColisaoJ: 500_000, resistenciaCalorK: 473.15, limiteTermicoC: 200, capacidadeTermicaJPorC: 400_000, areaTermicaM2: 4, estadoInicial: { posicaoM: new Vetor3(2, 2, 0) } });
  const parede = new Objeto({ id: 'parede-termica', massaBaseKg: 5_000, dimensoesM: new Vetor3(1, 4, 1), resistenciaColisaoJ: 1_000_000, resistenciaCalorK: 573.15, limiteTermicoC: 300, capacidadeTermicaJPorC: 15_000, areaTermicaM2: 4, coeficienteConveccaoWPorM2C: 20, taxaDanoTermicoPorSegundo: 0.08, estadoInicial: { posicaoM: new Vetor3(-6, 2, 0) } });
  propulsor.conectarTanque(tanque, 8); propulsor.definirThrottle(0.5);
  const fixadorMotor = new FixadorEstrutural({ id: 'fixador-termico-motor', objetoA: bancada, objetoB: propulsor, resistenciaTracaoN: 50_000, limiteTermicoC: 350, capacidadeTermicaJPorC: 10_000, condutanciaTermicaWPorC: 500, obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN });
  const fixadorTanque = new FixadorEstrutural({ id: 'fixador-termico-tanque', objetoA: bancada, objetoB: tanque, resistenciaTracaoN: 50_000, limiteTermicoC: 250, capacidadeTermicaJPorC: 10_000, condutanciaTermicaWPorC: 200, obterEsforcoSolicitadoN: () => 0 });
  const fixadorFundacao = new FixadorEstrutural({ id: 'fixador-termico-fundacao', objetoA: fundacao, objetoB: bancada, resistenciaTracaoN: 1_000_000, limiteTermicoC: 500, capacidadeTermicaJPorC: 100_000, condutanciaTermicaWPorC: 300, obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN });
  mundo.registrarSuperficie(solo); for (const objeto of [fundacao, bancada, propulsor, tanque, parede]) mundo.registrarObjeto(objeto); for (const fixador of [fixadorFundacao, fixadorMotor, fixadorTanque]) mundo.registrarFixador(fixador);
  const partida = criarPartidaAutomaticaBasica(mundo, propulsor);
  return {
    nome: 'Propulsor térmico — chama contra parede',
    descricao: 'Propulsor fixado a uma bancada de 2.000 kg, chumbada por fixador a uma fundação física de 500.000 kg, aponta a exaustão para uma parede térmica. O throttle controla simultaneamente empuxo, consumo e potência térmica. A chama transfere calor por convecção modelada no cone de exaustão; a parede perde integridade progressivamente ao exceder 300 °C.',
    mundo, objetos: [fundacao, bancada, propulsor, tanque, parede], superficies: [solo], velocidadeTempo: 5, limiteVerticalM: 8, limiteHorizontalM: 10, cameraX: () => -2, modalidade: 'térmica',
    propulsorControlavel: propulsor, permiteAjustarThrottle: true, atualizarControle: partida, fixadores: [fixadorFundacao, fixadorMotor, fixadorTanque],
    telemetria: () => `parede ${parede.temperaturaC.toFixed(1)} °C · integridade ${(parede.integridadeEstrutural * 100).toFixed(0)}%`,
    dados: () => `MODALIDADE: TÉRMICA\nAmbiente: 20 °C\nPotência térmica: ${(propulsor.potenciaTermicaAtualW / 1_000_000).toFixed(2)} MW\nTemperatura motor / bancada / tanque / parede: ${propulsor.temperaturaC.toFixed(1)} / ${bancada.temperaturaC.toFixed(1)} / ${tanque.temperaturaC.toFixed(1)} / ${parede.temperaturaC.toFixed(1)} °C\nLimites térmicos: ${propulsor.limiteTermicoC} / ${bancada.limiteTermicoC} / ${tanque.limiteTermicoC} / ${parede.limiteTermicoC} °C\nIntegridade da parede: ${(parede.integridadeEstrutural * 100).toFixed(1)}%\nFixador motor: ${fixadorMotor.temperaturaC.toFixed(1)} / ${fixadorMotor.limiteTermicoC} °C; ${fixadorMotor.resistenciaTracaoEfetivaN.toFixed(0)} N\nFixador tanque: ${fixadorTanque.temperaturaC.toFixed(1)} / ${fixadorTanque.limiteTermicoC} °C; ${fixadorTanque.resistenciaTracaoEfetivaN.toFixed(0)} N\nResistência mecânica parede: ${parede.resistenciaColisaoJ.toFixed(0)} J`,
    deveEncerrar: () => parede.integridadeEstrutural === 0,
    validar: () => `${parede.integridadeEstrutural < 1 ? 'APROVADO' : 'AQUECENDO'} · parede ${parede.temperaturaC.toFixed(1)} °C; integridade ${(parede.integridadeEstrutural * 100).toFixed(1)}%`,
  };
};

const criarTesteImpactoDestrutivoDoPropulsor = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240);
  const pista = new SuperficiePlano('pista-impacto-destrutivo-propulsor', 'concreto', 0, 1_000_000, 0.02, 0.9);
  const tanque = new TanquePropelente({
    id: 'tanque-impacto-destrutivo', massaBaseKg: 200, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'metano', capacidadePropelenteKg: 20, massaPropelenteInicialKg: 20, estadoInicial: { posicaoM: new Vetor3(-2, 0.5, 0) },
  });
  const propulsor = new Propulsor({
    id: 'propulsor-impacto-destrutivo', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano', estadoInicial: { posicaoM: new Vetor3(0, 0.5, 0) },
  });
  const parede = new Objeto({
    id: 'barreira-impacto-destrutivo', massaBaseKg: 100_000_000, dimensoesM: new Vetor3(1, 4, 3), resistenciaColisaoJ: 10_000_000, resistenciaCalorK: 1_000,
    estadoInicial: { posicaoM: new Vetor3(70, 2, 0) },
  });
  propulsor.conectarTanque(tanque, 3);
  propulsor.definirThrottle(1);
  const fixador = new FixadorEstrutural({
    id: 'fixador-impacto-destrutivo', objetoA: tanque, objetoB: propulsor, resistenciaTracaoN: 1_000_000,
    obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN,
  });
  const atualizarPartida = criarPartidaAutomaticaBasica(mundo, propulsor);
  mundo.registrarSuperficie(pista);
  mundo.registrarObjeto(tanque);
  mundo.registrarObjeto(propulsor);
  mundo.registrarObjeto(parede);
  mundo.registrarFixador(fixador);
  return {
    nome: 'Propulsor horizontal — impacto destrutivo',
    descricao: 'Conjunto tanque–propulsor preso por fixador acelera com 20.000 N contra uma barreira de 100.000.000 kg. O impacto é resolvido pelo core e excede a resistência de colisão declarada do propulsor; a integridade deve cair para tornar dano estrutural observável.',
    mundo, objetos: [tanque, propulsor, parede], superficies: [pista], velocidadeTempo: 3, limiteVerticalM: 5, limiteHorizontalM: 85,
    mangueira: { tanque, propulsor }, fixadores: [fixador], propulsorControlavel: propulsor, atualizarControle: atualizarPartida,
    cameraX: () => (propulsor.getEstadoFisico().posicaoM.x + parede.getEstadoFisico().posicaoM.x) / 2,
    telemetria: () => `integridade do propulsor ${(propulsor.integridadeEstrutural * 100).toFixed(0)}%`,
    dados: () => `Empuxo: ${propulsor.empuxoAtualN.toFixed(0)} N\nVelocidade do propulsor: ${propulsor.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s\nIntegridade do propulsor: ${(propulsor.integridadeEstrutural * 100).toFixed(1)}%\nIntegridade da barreira: ${(parede.integridadeEstrutural * 100).toFixed(1)}%\nFixador tanque–propulsor: ${fixador.estaRompido ? 'ROMPIDO' : 'íntegro'}\nResultado esperado: dano estrutural mensurável no propulsor`,
    deveEncerrar: () => propulsor.integridadeEstrutural < 1,
    validar: () => `${propulsor.integridadeEstrutural < 1 ? 'APROVADO' : 'DIVERGENTE'} · integridade final do propulsor ${(propulsor.integridadeEstrutural * 100).toFixed(1)}%`,
  };
};

const criarTestePropulsorSobreVeiculoPassivo = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const pista = new SuperficiePlano('pista-propulsor-sobre-veiculo', 'concreto', 0, 1_000_000, 0.02, 0.9);
  const veiculo = criarVeiculoTerrestre('veiculo-passivo-com-propulsor', 0, 0, 0.65);
  const tanque = new TanquePropelente({
    id: 'tanque-sobre-veiculo', massaBaseKg: 200, dimensoesM: new Vetor3(1, 0.6, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'metano', capacidadePropelenteKg: 20, massaPropelenteInicialKg: 20,
    // O tanque fica à frente do propulsor; o escape segue para fora do conjunto,
    // sem atravessar visualmente a alimentação de combustível.
    estadoInicial: { posicaoM: new Vetor3(1, 1.8, 0) },
  });
  const propulsor = new Propulsor({
    id: 'propulsor-sobre-veiculo', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano', coeficienteAtritoEntreObjetos: 0.65, estadoInicial: { posicaoM: new Vetor3(-0.75, 2, 0) },
  });
  propulsor.conectarTanque(tanque, 10);
  // 70% mantém 14.000 N abaixo do limite do fixador; assim o conjunto ganha
  // velocidade e o paraquedas pode exercer arrasto observável. Acima de 75%,
  // o mesmo ensaio continua validando a ruptura estrutural.
  propulsor.definirThrottle(0.7);
  veiculo.acoplarParaquedas(new Paraquedas({
    id: 'paraquedas-conjunto-sobre-veiculo', areaFrontalM2: 8,
  }));
  const atualizarPartida = criarPartidaAutomaticaBasica(mundo, propulsor);
  const fixador = new FixadorEstrutural({
    id: 'fixador-veiculo-propulsor', objetoA: veiculo, objetoB: propulsor, resistenciaTracaoN: 15_000,
    obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN,
  });
  const fixadorTanque = new FixadorEstrutural({
    id: 'fixador-veiculo-tanque', objetoA: veiculo, objetoB: tanque, resistenciaTracaoN: 50_000,
    obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN,
  });
  mundo.registrarSuperficie(pista);
  mundo.registrarObjeto(veiculo);
  mundo.registrarObjeto(tanque);
  mundo.registrarObjeto(propulsor);
  mundo.registrarFixador(fixador);
  mundo.registrarFixador(fixadorTanque);
  let picoVelocidadeVeiculoMps = 0;
  return {
    nome: 'Propulsor sobre veículo — paraquedas e ruptura a 15.000 N',
    descricao: 'Veículo de 1.500 kg repousa sobre rodas, sem tração própria. O teste inicia a 70%: 14.000 N mantêm propulsor e tanque fixados ao chassi e aceleram o conjunto. Acione o paraquedas para observar o arrasto. Eleve o throttle acima de 75% para exceder 15.000 N e romper o fixador do propulsor; o fixador do tanque suporta 50.000 N.',
    mundo, objetos: [veiculo, tanque, propulsor], superficies: [pista], velocidadeTempo: 2, limiteVerticalM: 5, limiteHorizontalM: 20,
    seguirObjeto: veiculo,
    mangueira: { tanque, propulsor }, propulsorControlavel: propulsor, objetoComParaquedasControlavel: veiculo, objetoComParaquedasConfiguravel: veiculo,
    fixadores: [fixador, fixadorTanque],
    permiteAjustarThrottle: true,
    atualizarControle: atualizarPartida,
    telemetria: () => `veículo ${(veiculo.getEstadoFisico().velocidadeMps.x * 3.6).toFixed(2)} km/h`,
    dados: () => `Tração própria: 0 N\nEmpuxo: ${propulsor.empuxoAtualN.toFixed(0)} N\nParaquedas do conjunto: ${veiculo.paraquedasEstaAberto ? 'ABERTO — arrasto ativo quando houver fluxo' : 'fechado'}\nArrasto no chassi: ${mundo.obterForcaArrastoAtmosferico(veiculo).magnitude.toFixed(0)} N\nFixador do propulsor: ${fixador.estaRompido ? 'ROMPIDO' : 'íntegro'} (${fixador.resistenciaTracaoN.toFixed(0)} N)\nFixador do tanque: ${fixadorTanque.estaRompido ? 'ROMPIDO' : 'íntegro'} (${fixadorTanque.resistenciaTracaoN.toFixed(0)} N)\nVelocidade do veículo: ${veiculo.getEstadoFisico().velocidadeMps.x.toFixed(3)} m/s\nDeslocamento do veículo: ${veiculo.getEstadoFisico().posicaoM.x.toFixed(3)} m\nVelocidade do propulsor: ${propulsor.getEstadoFisico().velocidadeMps.x.toFixed(3)} m/s\nPico do veículo: ${picoVelocidadeVeiculoMps.toFixed(3)} m/s`,
    deveEncerrar: () => {
      picoVelocidadeVeiculoMps = Math.max(picoVelocidadeVeiculoMps, veiculo.getEstadoFisico().velocidadeMps.x);
      return false;
    },
    validar: () => `${fixador.estaRompido ? 'APROVADO' : 'OPERACIONAL'} · fixador de 15.000 N ${fixador.estaRompido ? 'rompeu acima do limite' : 'permanece íntegro a 14.000 N'}`,
  };
};

const criarTesteFogueteComParaquedasManual = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const solo = new SuperficiePlano('solo-foguete-paraquedas', 'concreto', 0, 1_000_000, 0.04, 0.9);
  const propulsor = new Propulsor({
    id: 'propulsor-foguete-recuperacao', massaBaseKg: 120, dimensoesM: new Vetor3(1.4, 1.2, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano', estadoInicial: { posicaoM: new Vetor3(0, 998.6, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  const tanque = new TanquePropelente({
    id: 'tanque-foguete-recuperacao', massaBaseKg: 180, dimensoesM: new Vetor3(2.2, 1.4, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'metano', capacidadePropelenteKg: 30, massaPropelenteInicialKg: 30, areaFrontalM2: 1.2, coeficienteArrasto: 0.7,
    estadoInicial: { posicaoM: new Vetor3(0, 1000.5, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  propulsor.conectarTanque(tanque, 3);
  tanque.acoplarParaquedas(new Paraquedas({ id: 'paraquedas-foguete', areaFrontalM2: 28 }));
  const uniaoDoEstagio = new FixadorEstrutural({
    id: 'uniao-estagio-foguete', objetoA: propulsor, objetoB: tanque, resistenciaTracaoN: 80_000,
    obterEsforcoSolicitadoN: () => 0,
  });
  mundo.registrarSuperficie(solo);
  mundo.registrarObjeto(propulsor);
  mundo.registrarObjeto(tanque);
  mundo.registrarFixador(uniaoDoEstagio);
  return {
    nome: 'Foguete básico — paraquedas manual na descida',
    descricao: 'Conjunto de propulsor e tanque cai de 1.000 m com ambos unidos por fixador estrutural. O paraquedas fica acoplado ao tanque; ao ser acionado manualmente, seu arrasto é aplicado no tanque e transmitido ao conjunto pelo vínculo físico.',
    mundo, objetos: [propulsor, tanque], superficies: [solo], velocidadeTempo: 10, limiteVerticalM: 1_000,
    mangueira: { tanque, propulsor }, fixadores: [uniaoDoEstagio], objetoComParaquedasControlavel: tanque, objetoComParaquedasConfiguravel: tanque,
    telemetria: () => `velocidade vertical ${tanque.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s`,
    dados: () => `Altitude do conjunto: ${tanque.getEstadoFisico().posicaoM.y.toFixed(1)} m\nVelocidade vertical: ${tanque.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s\nParaquedas: ${tanque.paraquedasEstaAberto ? 'ABERTO — arrasto ativo' : 'fechado — comando manual disponível'}\nUnião do estágio: ${uniaoDoEstagio.estaRompido ? 'ROMPIDA' : 'íntegra'} (${uniaoDoEstagio.resistenciaTracaoN.toFixed(0)} N)`,
    deveEncerrar: () => objetosEmRepouso(mundo, [propulsor, tanque]),
    validar: () => `${tanque.paraquedasEstaAberto ? 'APROVADO' : 'PENDENTE'} · paraquedas ${tanque.paraquedasEstaAberto ? 'acionado manualmente' : 'não acionado'}; velocidade vertical ${tanque.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s`,
  };
};

const criarTesteFogueteHorizontalComParaquedasManual = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const solo = new SuperficiePlano('solo-foguete-horizontal', 'concreto', 0, 1_000_000, 0.04, 0.9);
  const propulsor = new Propulsor({
    id: 'propulsor-foguete-horizontal', massaBaseKg: 120, dimensoesM: new Vetor3(1.6, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano',
    estadoInicial: { posicaoM: new Vetor3(-0.9, 100, 0), velocidadeMps: new Vetor3(60, 0, 0) },
  });
  const tanque = new TanquePropelente({
    id: 'tanque-foguete-horizontal', massaBaseKg: 180, dimensoesM: new Vetor3(1.6, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'metano', capacidadePropelenteKg: 30, massaPropelenteInicialKg: 30, areaFrontalM2: 1.2, coeficienteArrasto: 0.7,
    estadoInicial: { posicaoM: new Vetor3(0.9, 100, 0), velocidadeMps: new Vetor3(60, 0, 0) },
  });
  propulsor.conectarTanque(tanque, 3);
  tanque.acoplarParaquedas(new Paraquedas({ id: 'paraquedas-foguete-horizontal', areaFrontalM2: 8 }));
  const uniaoDoEstagio = new FixadorEstrutural({
    id: 'uniao-estagio-foguete-horizontal', objetoA: propulsor, objetoB: tanque, resistenciaTracaoN: 80_000,
    obterEsforcoSolicitadoN: () => 0,
  });
  mundo.registrarSuperficie(solo);
  mundo.registrarObjeto(propulsor);
  mundo.registrarObjeto(tanque);
  mundo.registrarFixador(uniaoDoEstagio);
  return {
    nome: 'Foguete horizontal — paraquedas manual',
    descricao: 'Foguete básico inicia voo horizontal a 60 m/s, em atmosfera padrão. O paraquedas de 8 m² pode ser acionado manualmente; seu dossel fica a sotavento e o arrasto calculado pelo core reduz a velocidade horizontal do conjunto.',
    mundo, objetos: [propulsor, tanque], superficies: [solo], velocidadeTempo: 2, limiteVerticalM: 110, limiteHorizontalM: 300,
    seguirObjeto: tanque, mangueira: { tanque, propulsor }, fixadores: [uniaoDoEstagio], objetoComParaquedasControlavel: tanque, objetoComParaquedasConfiguravel: tanque,
    telemetria: () => `velocidade horizontal ${tanque.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s`,
    dados: () => `Velocidade horizontal: ${tanque.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s\nAltitude: ${tanque.getEstadoFisico().posicaoM.y.toFixed(1)} m\nParaquedas: ${tanque.paraquedasEstaAberto ? 'ABERTO — arrasto ativo' : 'fechado — comando manual disponível'}\nÁrea do paraquedas: 8,0 m²\nFluxo relativo: ${(tanque.getEstadoFisico().velocidadeMps.subtrair(mundo.velocidadeDoArMps).magnitude).toFixed(2)} m/s\nArrasto atmosférico: ${mundo.obterForcaArrastoAtmosferico(tanque).magnitude.toFixed(0)} N`,
    deveEncerrar: () => objetosEmRepouso(mundo, [propulsor, tanque]),
    validar: () => `${tanque.paraquedasEstaAberto && tanque.getEstadoFisico().velocidadeMps.x < 60 ? 'APROVADO' : 'PENDENTE'} · velocidade horizontal ${tanque.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s`,
  };
};

const criarTestePropulsorVerticalComParaquedas = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const solo = new SuperficiePlano('solo-propulsor-vertical', 'concreto', 0, 1_000_000, 0.04, 0.9);
  const propulsor = new Propulsor({
    id: 'propulsor-vertical', massaBaseKg: 120, dimensoesM: new Vetor3(1.4, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano',
    estadoInicial: { posicaoM: new Vetor3(0, 0.9, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  const tanque = new TanquePropelente({
    id: 'tanque-vertical', massaBaseKg: 180, dimensoesM: new Vetor3(2.2, 1.4, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'metano', capacidadePropelenteKg: 30, massaPropelenteInicialKg: 30, areaFrontalM2: 1.2, coeficienteArrasto: 0.7,
    estadoInicial: { posicaoM: new Vetor3(0, 2.9, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  propulsor.conectarTanque(tanque, 3);
  propulsor.definirThrottle(0.7);
  tanque.acoplarParaquedas(new Paraquedas({ id: 'paraquedas-propulsor-vertical', areaFrontalM2: 8 }));
  const fixadorDoEstagio = new FixadorEstrutural({
    id: 'fixador-tanque-propulsor-vertical', objetoA: tanque, objetoB: propulsor, resistenciaTracaoN: 30_000,
    obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN,
  });
  const atualizarPartida = criarPartidaAutomaticaBasica(mundo, propulsor);
  mundo.registrarSuperficie(solo);
  mundo.registrarObjeto(propulsor);
  mundo.registrarObjeto(tanque);
  mundo.registrarFixador(fixadorDoEstagio);
  return {
    nome: 'Propulsor vertical — tanque, fixador e paraquedas',
    descricao: 'Conjunto vertical na ordem paraquedas, tanque e propulsor. O propulsor decola a 70% e é preso diretamente ao tanque por fixador estrutural de 30.000 N; o paraquedas é um componente do tanque e pode ser acionado manualmente. Os comandos de sistemas, ignição e throttle são os mesmos do ensaio sobre rodas.',
    mundo, objetos: [propulsor, tanque], superficies: [solo], velocidadeTempo: 2, limiteVerticalM: 40,
    mangueira: { tanque, propulsor }, fixadores: [fixadorDoEstagio], propulsorControlavel: propulsor,
    objetoComParaquedasControlavel: tanque, objetoComParaquedasConfiguravel: tanque, permiteAjustarThrottle: true, atualizarControle: atualizarPartida,
    cameraY: () => tanque.getEstadoFisico().posicaoM.y,
    telemetria: () => `velocidade vertical ${tanque.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s`,
    dados: () => `Altitude: ${tanque.getEstadoFisico().posicaoM.y.toFixed(1)} m\nVelocidade vertical: ${tanque.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s\nThrottle: ${(propulsor.throttleAtual * 100).toFixed(0)}%\nEmpuxo: ${propulsor.empuxoAtualN.toFixed(0)} N\nParaquedas: ${tanque.paraquedasEstaAberto ? 'ABERTO — arrasto ativo' : 'fechado'}\nFixador tanque–propulsor: ${fixadorDoEstagio.estaRompido ? 'ROMPIDO' : 'íntegro'} (${fixadorDoEstagio.resistenciaTracaoN.toFixed(0)} N)\nArrasto no tanque: ${mundo.obterForcaArrastoAtmosferico(tanque).magnitude.toFixed(0)} N`,
    deveEncerrar: () => false,
    validar: () => `${fixadorDoEstagio.estaRompido ? 'DIVERGENTE' : 'OPERACIONAL'} · conjunto ${fixadorDoEstagio.estaRompido ? 'separado' : 'íntegro'}; velocidade vertical ${tanque.getEstadoFisico().velocidadeMps.y.toFixed(2)} m/s`,
  };
};

const criarTesteMerlinVetorizado = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const solo = new SuperficiePlano('solo-merlin-vetorizado', 'concreto', 0, 1_000_000, 0.04, 0.9);
  const merlin = new PropulsorVetorizado({
    id: 'merlin-1d-vetorizado', massaBaseKg: 470, dimensoesM: new Vetor3(1.2, 1, 1), resistenciaColisaoJ: 150_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 845_000, vazaoMaximaKgS: 250, propelenteCompativel: 'rp-1',
    vetorizacao: { limiteAngularRad: 5 * Math.PI / 180, velocidadeAngularMaximaRadps: 10 * Math.PI / 180 },
    estadoInicial: { posicaoM: new Vetor3(0, 1, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  const tanque = new TanquePropelente({
    id: 'tanque-merlin-vetorizado', massaBaseKg: 15_000, dimensoesM: new Vetor3(2.4, 3.6, 1), resistenciaColisaoJ: 200_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'rp-1', capacidadePropelenteKg: 5_000, massaPropelenteInicialKg: 5_000,
    estadoInicial: { posicaoM: new Vetor3(0, 3.8, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  merlin.conectarTanque(tanque, 4);
  merlin.definirThrottle(0.6);
  const fixador = new FixadorEstrutural({
    id: 'fixador-merlin-vetorizado', objetoA: tanque, objetoB: merlin, resistenciaTracaoN: 1_000_000,
    obterEsforcoSolicitadoN: () => merlin.empuxoAtualN,
  });
  mundo.registrarSuperficie(solo);
  mundo.registrarObjeto(tanque);
  mundo.registrarObjeto(merlin);
  mundo.registrarFixador(fixador);
  const atualizarPartida = criarPartidaAutomaticaBasica(mundo, merlin);
  const rotacaoInicialRad = tanque.getEstadoFisico().orientacaoRad.z;
  const obterGimbalGraus = (): number => merlin.obterEstadoDaVetorizacao().anguloAtualRad * 180 / Math.PI;
  const obterRotacaoGraus = (): number => (tanque.getEstadoFisico().orientacaoRad.z - rotacaoInicialRad) * 180 / Math.PI;
  return {
    nome: 'Merlin 1D — vetorização manual',
    descricao: 'Modelo de bancada inspirado no Merlin 1D: propulsor RP-1 com 845 kN máximos e gimbal planar limitado a ±5°. A ignição segue a mesma cadeia automática; após ela, mova o controle de gimbal. O atuador alcança o ângulo gradualmente e o empuxo desviado produz força lateral e torque no conjunto rígido.',
    mundo, objetos: [tanque, merlin], superficies: [solo], velocidadeTempo: 1, limiteVerticalM: 60, limiteHorizontalM: 25,
    seguirObjeto: tanque, cameraY: () => tanque.getEstadoFisico().posicaoM.y,
    linhaDeEmpuxo: () => ({ origemM: merlin.getEstadoFisico().posicaoM, direcao: new Vetor3(Math.cos(merlin.getEstadoFisico().orientacaoRad.z + merlin.obterEstadoDaVetorizacao().anguloAtualRad), Math.sin(merlin.getEstadoFisico().orientacaoRad.z + merlin.obterEstadoDaVetorizacao().anguloAtualRad), 0) }),
    mangueira: { tanque, propulsor: merlin }, fixadores: [fixador], propulsorControlavel: merlin, propulsorVetorizadoControlavel: merlin,
    permiteAjustarThrottle: true, atualizarControle: atualizarPartida,
    telemetria: () => `gimbal ${obterGimbalGraus().toFixed(2)}° · inclinação ${obterRotacaoGraus().toFixed(2)}°`,
    dados: () => `Empuxo: ${merlin.empuxoAtualN.toFixed(0)} N\nThrottle: ${(merlin.throttleAtual * 100).toFixed(0)}%\nEficiência por integridade: ${(merlin.eficienciaPorIntegridade * 100).toFixed(1)}%\nGimbal alvo: ${(merlin.obterEstadoDaVetorizacao().anguloAlvoRad * 180 / Math.PI).toFixed(2)}°\nGimbal atual: ${obterGimbalGraus().toFixed(2)}°\nAtuador: ${merlin.obterEstadoDaVetorizacao().estaHabilitado ? 'habilitado' : 'bloqueado por sistemas'}\nInclinação do conjunto: ${obterRotacaoGraus().toFixed(2)}°\nIntegridade Merlin: ${(merlin.integridadeEstrutural * 100).toFixed(1)}%\nIntegridade tanque: ${(tanque.integridadeEstrutural * 100).toFixed(1)}%\nPropelente: ${tanque.massaPropelenteKg.toFixed(0)} kg\nFixador: ${fixador.estaRompido ? 'ROMPIDO' : 'íntegro'}`,
    deveEncerrar: () => false,
    validar: () => `${merlin.estaIgnitado ? 'OPERACIONAL' : 'AGUARDANDO IGNIÇÃO'} · gimbal ${obterGimbalGraus().toFixed(2)}°; conjunto ${fixador.estaRompido ? 'separado' : 'íntegro'}`,
  };
};

const normalizarAnguloRad = (anguloRad: number): number => Math.atan2(Math.sin(anguloRad), Math.cos(anguloRad));

const criarTesteMerlinDesalinhadoComCorrecao = (deslocamentoMotorXM: number, nome: string): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const merlin = new PropulsorVetorizado({
    id: 'merlin-desalinhado', massaBaseKg: 470, dimensoesM: new Vetor3(1.2, 0.8, 1), resistenciaColisaoJ: 150_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 845_000, vazaoMaximaKgS: 250, propelenteCompativel: 'rp-1',
    vetorizacao: { limiteAngularRad: 5 * Math.PI / 180, velocidadeAngularMaximaRadps: 10 * Math.PI / 180 },
    estadoInicial: { posicaoM: new Vetor3(deslocamentoMotorXM, 28, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  const tanque = new TanquePropelente({
    id: 'tanque-merlin-desalinhado', massaBaseKg: 30_000, dimensoesM: new Vetor3(2.5, 4, 1), resistenciaColisaoJ: 1_000_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'rp-1', capacidadePropelenteKg: 10_000, massaPropelenteInicialKg: 10_000,
    estadoInicial: { posicaoM: new Vetor3(0, 30, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  merlin.conectarTanque(tanque, 3);
  merlin.definirThrottle(0.6);
  const fixador = new FixadorEstrutural({
    id: 'fixador-merlin-desalinhado', objetoA: tanque, objetoB: merlin, resistenciaTracaoN: 1_000_000,
    obterEsforcoSolicitadoN: () => merlin.empuxoAtualN,
  });
  mundo.registrarObjeto(tanque);
  mundo.registrarObjeto(merlin);
  mundo.registrarFixador(fixador);
  const partida = criarPartidaAutomaticaBasica(mundo, merlin);
  const orientacaoInicialTanqueRad = tanque.getEstadoFisico().orientacaoRad.z;
  const obterCentroMassa = (): Vetor3 => {
    const massaTotal = tanque.massaKg + merlin.massaKg;
    return tanque.getEstadoFisico().posicaoM.multiplicar(tanque.massaKg / massaTotal)
      .adicionar(merlin.getEstadoFisico().posicaoM.multiplicar(merlin.massaKg / massaTotal));
  };
  const obterCorrecaoNecessariaRad = (): number => {
    const posicaoMotor = merlin.getEstadoFisico().posicaoM;
    const centroMassa = obterCentroMassa();
    const anguloAteCentroMassa = Math.atan2(centroMassa.y - posicaoMotor.y, centroMassa.x - posicaoMotor.x);
    return normalizarAnguloRad(anguloAteCentroMassa - merlin.getEstadoFisico().orientacaoRad.z);
  };
  const atualizarControle = () => {
    partida();
    const estado = merlin.obterEstadoDaVetorizacao();
    const comandoLimitado = Math.max(-estado.limiteAngularRad, Math.min(estado.limiteAngularRad, obterCorrecaoNecessariaRad()));
    merlin.solicitarVetorizacao(comandoLimitado);
  };
  const obterGraus = (angulo: number): string => `${(angulo * 180 / Math.PI).toFixed(2)}°`;
  const rotacaoGraus = (): number => (tanque.getEstadoFisico().orientacaoRad.z - orientacaoInicialTanqueRad) * 180 / Math.PI;
  return {
    nome,
    descricao: `Conjunto de ${(tanque.massaKg + merlin.massaKg).toFixed(0)} kg tanque–motor desalinhado: o Merlin está ${deslocamentoMotorXM.toFixed(3)} m ao lado do tanque. A 60% de throttle, o empuxo vertical permanece maior que o peso. O controlador calcula a direção que faz a linha de empuxo atravessar o centro de massa e envia o comando pela API de vetorização antes da ignição. O motor possui gimbal máximo de ±5°; a telemetria mostra se esse curso elimina o torque.`,
    mundo, objetos: [tanque, merlin], superficies: [], velocidadeTempo: 1, limiteVerticalM: 30, limiteHorizontalM: 8,
    seguirObjeto: tanque, cameraY: () => tanque.getEstadoFisico().posicaoM.y,
    linhaDeEmpuxo: () => ({ origemM: merlin.getEstadoFisico().posicaoM, direcao: new Vetor3(Math.cos(merlin.getEstadoFisico().orientacaoRad.z + merlin.obterEstadoDaVetorizacao().anguloAtualRad), Math.sin(merlin.getEstadoFisico().orientacaoRad.z + merlin.obterEstadoDaVetorizacao().anguloAtualRad), 0) }),
    mangueira: { tanque, propulsor: merlin }, fixadores: [fixador], propulsorControlavel: merlin, atualizarControle,
    telemetria: () => `correção ${obterGraus(merlin.obterEstadoDaVetorizacao().anguloAtualRad)} · rotação ${rotacaoGraus().toFixed(2)}°`,
    dados: () => `Correção necessária: ${obterGraus(obterCorrecaoNecessariaRad())}\nLimite do Merlin: ±${obterGraus(merlin.obterEstadoDaVetorizacao().limiteAngularRad)}\nGimbal efetivo: ${obterGraus(merlin.obterEstadoDaVetorizacao().anguloAtualRad)}\nTorque residual: ${Math.abs(obterCorrecaoNecessariaRad()) > merlin.obterEstadoDaVetorizacao().limiteAngularRad ? 'SIM — curso insuficiente' : 'não'}\nRotação do conjunto: ${rotacaoGraus().toFixed(3)}°\nEmpuxo: ${merlin.empuxoAtualN.toFixed(0)} N\nEstado: ${merlin.estaIgnitado ? 'ignitado' : 'aguardando ignição'}`,
    deveEncerrar: () => false,
    validar: () => `${Math.abs(obterCorrecaoNecessariaRad()) <= merlin.obterEstadoDaVetorizacao().limiteAngularRad ? 'CORREÇÃO VIÁVEL' : 'LIMITADO PELO GIMBAL'} · requerido ${obterGraus(obterCorrecaoNecessariaRad())}; limite ±${obterGraus(merlin.obterEstadoDaVetorizacao().limiteAngularRad)}`,
  };
};

const criarTesteEmpuxoExcentricoEmConjunto = (): CenárioVisual => {
  const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
  const propulsor = new Propulsor({
    id: 'propulsor-excentrico', massaBaseKg: 200, dimensoesM: new Vetor3(1.2, 0.8, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    empuxoMaximoN: 20_000, vazaoMaximaKgS: 1, propelenteCompativel: 'metano',
    estadoInicial: { posicaoM: new Vetor3(1, 28, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  const tanque = new TanquePropelente({
    id: 'tanque-excentrico', massaBaseKg: 700, dimensoesM: new Vetor3(2, 1.5, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000,
    tipoPropelente: 'metano', capacidadePropelenteKg: 100, massaPropelenteInicialKg: 100,
    estadoInicial: { posicaoM: new Vetor3(0, 30, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  propulsor.conectarTanque(tanque, 3);
  propulsor.definirThrottle(0.7);
  const fixador = new FixadorEstrutural({
    id: 'fixador-excentrico', objetoA: tanque, objetoB: propulsor, resistenciaTracaoN: 30_000,
    obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN,
  });
  mundo.registrarObjeto(tanque);
  mundo.registrarObjeto(propulsor);
  mundo.registrarFixador(fixador);
  const atualizarPartida = criarPartidaAutomaticaBasica(mundo, propulsor);
  const orientacaoInicialTanqueRad = tanque.getEstadoFisico().orientacaoRad.z;
  const obterRotacaoObservadaGraus = (): number => (tanque.getEstadoFisico().orientacaoRad.z - orientacaoInicialTanqueRad) * 180 / Math.PI;
  const obterTorqueEsperadoNm = (): number => {
    const massaTotal = tanque.massaKg + propulsor.massaKg;
    const centroMassaX = (tanque.getEstadoFisico().posicaoM.x * tanque.massaKg + propulsor.getEstadoFisico().posicaoM.x * propulsor.massaKg) / massaTotal;
    return Math.abs(propulsor.getEstadoFisico().posicaoM.x - centroMassaX) * propulsor.empuxoAtualN;
  };
  return {
    nome: 'Propulsor excêntrico — torque no conjunto',
    descricao: 'O propulsor está 1 m ao lado do tanque e aplica empuxo vertical. A linha amarela mostra a ação do empuxo; como ela não atravessa o centro de massa do conjunto, o fixador rígido transmite o momento angular e o conjunto gira. O ensaio compara o torque esperado com a rotação calculada pelo mesmo núcleo físico.',
    mundo, objetos: [tanque, propulsor], superficies: [], velocidadeTempo: 1, limiteVerticalM: 20, limiteHorizontalM: 6,
    seguirObjeto: tanque, cameraY: () => tanque.getEstadoFisico().posicaoM.y,
    linhaDeEmpuxo: () => ({ origemM: propulsor.getEstadoFisico().posicaoM, direcao: new Vetor3(0, 1, 0) }),
    mangueira: { tanque, propulsor }, fixadores: [fixador], propulsorControlavel: propulsor, permiteAjustarThrottle: true, atualizarControle: atualizarPartida,
    telemetria: () => `rotação desde o início ${obterRotacaoObservadaGraus().toFixed(2)}°`,
    dados: () => `Empuxo: ${propulsor.empuxoAtualN.toFixed(0)} N\nMassa do conjunto: ${(tanque.massaKg + propulsor.massaKg).toFixed(0)} kg\nTorque físico esperado: ${obterTorqueEsperadoNm().toFixed(0)} N·m\nRotação observada desde o início: ${obterRotacaoObservadaGraus().toFixed(3)}°\nFixador: ${fixador.estaRompido ? 'ROMPIDO' : 'íntegro'}\nDiagnóstico: momento angular transmitido ao conjunto`,
    deveEncerrar: () => false,
    validar: () => `${obterTorqueEsperadoNm() > 0 && Math.abs(obterRotacaoObservadaGraus()) > 0.001 ? 'APROVADO' : 'AGUARDANDO EMPUXO'} · torque esperado ${obterTorqueEsperadoNm().toFixed(0)} N·m; rotação observada ${obterRotacaoObservadaGraus().toFixed(3)}°`,
  };
};

const construirCenarios = (): CenárioVisual[] => {
  return [
  criarCuboEmQueda(10),
  criarCuboEmQueda(10, 10, {
    nome: 'Queda livre — cubo rotacionado a 46°',
    descricao: 'Cubo de 10 kg e 1 × 1 × 1 m cai de 10 m com orientação inicial de 46°. O solo encontra a quina mais baixa da geometria rotacionada.',
    orientacaoInicialRad: 46 * Math.PI / 180,
  }),
  criarCuboEmQueda(10, 10, {
    nome: 'Queda livre — trajetória a 45° com o solo',
    descricao: 'Cubo de 10 kg e 1 × 1 × 1 m permanece reto e cai de 10 m. A velocidade horizontal inicial é igual à velocidade vertical prevista na chegada, produzindo trajetória de 45° com o solo em vácuo.',
    velocidadeHorizontalInicialMps: Math.sqrt(2 * Math.abs(MundoFisico.gravidadeTerrestreMps2.y) * 9.5),
    limiteHorizontalM: 25,
  }),
  criarCuboEmQueda(50, 1),
  criarCuboEmQueda(50, 100),
  criarCuboEmQueda(100),
  criarCuboEmQueda(10_000),
  criarTesteParaquedas(),
  criarTesteAreaDeContato(),
  criarTesteQuadradosEmpilhados('queda-conjunta'),
  criarTesteQuadradosEmpilhados('queda-conjunta-superior-leve'),
  criarTesteQuadradosEmpilhados('queda-sobre-apoio'),
  criarTesteQuadradosEmpilhados('leve-sobre-pesado-apoiado'),
  criarTesteQuadradosEmpilhados('quase-igual-sobre-apoiado'),
  criarTestePilhaDezQuadradosAtingida(),
  criarTesteVeiculoTerrestre('aceleracao'),
  criarTesteVeiculoTerrestre('frenagem'),
  criarTesteVeiculoTerrestre('colisao'),
  criarTesteVeiculoAlado(),
  criarTesteVeiculoComposto(),
  criarTestePropulsorContraParede(0.25),
  criarTestePropulsorContraParede(0.5),
  criarTestePropulsorContraParede(1),
  criarTesteTermicoDoPropulsor(),
  criarTesteImpactoDestrutivoDoPropulsor(),
  criarTestePropulsorSobreVeiculoPassivo(),
  criarTesteFogueteComParaquedasManual(),
  criarTesteFogueteHorizontalComParaquedasManual(),
  criarTestePropulsorVerticalComParaquedas(),
  criarTesteMerlinVetorizado(),
  criarTesteMerlinDesalinhadoComCorrecao(1, 'Merlin desalinhado — limite de correção'),
  criarTesteMerlinDesalinhadoComCorrecao(2 * Math.tan(5 * Math.PI / 180), 'Merlin desalinhado — correção a 5°'),
  criarTesteEmpuxoExcentricoEmConjunto(),
  criarTesteVeiculoContraRampa30Graus(0),
  criarTesteVeiculoContraRampa30Graus(5),
  criarTesteVeiculoContraRampa30Graus(10),
  criarTesteVeiculoContraRampa30Graus(20),
  criarColisaoFrontal(),
  criarColisaoPorResistencia(100),
  criarColisaoPorResistencia(150),
  criarColisaoPorResistencia(200),
  criarColisaoPorResistencia(400),
  criarColisaoComTorque(),
    criarTesteImpactoNoRetangulo('impacto acima do centro', 8, 1),
    criarTesteImpactoNoRetangulo('impacto abaixo do centro', 2, 2),
    criarTesteImpactoNoRetangulo('impacto no centro de massa', 5, 3),
  ];
};

let cenarios = construirCenarios();
let indiceAtual = 0;
let emExecucao = false;
let ultimoQuadroMs = 0;

const cenarioAtual = (): CenárioVisual => cenarios[indiceAtual];

const obterGrupoDoCenario = (cenario: CenárioVisual): string => {
  if (cenario.modalidade === 'térmica') return 'Testes térmicos';
  if (cenario.nome.startsWith('Propulsor') || cenario.nome.startsWith('Foguete') || cenario.nome.startsWith('Merlin')) return 'Propulsão e sistemas';
  if (cenario.nome.startsWith('Veículo')) return 'Veículos e mobilidade';
  if (cenario.nome.startsWith('Queda livre') || cenario.nome.startsWith('Arrasto') || cenario.nome.startsWith('Contato')) {
    return 'Gravidade, arrasto e apoio';
  }
  return 'Colisões, resistência e torque';
};

const preencherSeletorDeCenarios = (): void => {
  scenarioSelector.replaceChildren();
  const grupos = new Map<string, Array<{ cenario: CenárioVisual; indice: number }>>();
  cenarios.forEach((cenario, indice) => {
    const grupo = obterGrupoDoCenario(cenario);
    const itens = grupos.get(grupo) ?? [];
    itens.push({ cenario, indice });
    grupos.set(grupo, itens);
  });
  grupos.forEach((itens, nomeGrupo) => {
    const grupo = document.createElement('optgroup');
    grupo.label = nomeGrupo;
    itens.forEach(({ cenario, indice }) => {
      const opcao = document.createElement('option');
      opcao.value = String(indice);
      opcao.textContent = cenario.nome;
      grupo.append(opcao);
    });
    scenarioSelector.append(grupo);
  });
  scenarioSelector.value = String(indiceAtual);
};

const desenhar = (): void => {
  const cenário = cenarioAtual();
  const largura = canvas.width;
  const altura = canvas.height;
  contexto.clearRect(0, 0, largura, altura);
  contexto.fillStyle = '#071126';
  contexto.fillRect(0, 0, largura, altura);

  const escalaVertical = (altura - 80) / cenário.limiteVerticalM;
  const escalaHorizontal = cenário.limiteHorizontalM === undefined ? 70 : (largura - 80) / (cenário.limiteHorizontalM * 2);
  const escala = Math.min(70, escalaVertical, escalaHorizontal);
  // Cenários com trajetória horizontal começam à esquerda para que o impacto
  // permaneça visível antes do meio do canvas, sem alterar a física.
  const origemX = cenário.cameraX !== undefined
    ? largura / 2 - cenário.cameraX() * escala
    : cenário.seguirObjeto === undefined
    ? cenário.limiteHorizontalM === undefined ? largura / 2 : 70
    : largura / 2 - (cenário.seguirObjeto.getEstadoFisico().posicaoM.x * escala);
  const soloY = cenário.cameraY === undefined
    ? altura - 40
    : altura * 0.65 + cenário.cameraY() * escala;
  if (cenário.superficies.length > 0) {
    contexto.fillStyle = '#475569';
    contexto.fillRect(0, soloY, largura, altura - soloY);
    // Marcos pertencem ao mundo, não à câmera. Eles evidenciam deslocamento
    // mesmo nos cenários em que a câmera acompanha o veículo.
    const passoMarcoM = escala >= 35 ? 5 : 10;
    const primeiroMarcoM = Math.floor((-origemX / escala) / passoMarcoM) * passoMarcoM;
    const ultimoMarcoM = Math.ceil(((largura - origemX) / escala) / passoMarcoM) * passoMarcoM;
    contexto.strokeStyle = '#94a3b8';
    contexto.fillStyle = '#cbd5e1';
    contexto.lineWidth = 1;
    contexto.font = '10px ui-monospace, monospace';
    for (let marcoM = primeiroMarcoM; marcoM <= ultimoMarcoM; marcoM += passoMarcoM) {
      const xMarco = origemX + marcoM * escala;
      contexto.beginPath();
      contexto.moveTo(xMarco, soloY);
      contexto.lineTo(xMarco, soloY + 12);
      contexto.stroke();
      contexto.fillText(`${marcoM} m`, xMarco + 3, soloY + 29);
    }
    contexto.fillStyle = '#cbd5e1';
    contexto.font = '12px ui-monospace, monospace';
    contexto.fillText(`SUPERFÍCIE: ${cenário.superficies[0].tipoMaterial.toUpperCase()}`, 14, soloY + 22);
  } else {
    contexto.strokeStyle = '#334155';
    contexto.lineWidth = 2;
    contexto.beginPath();
    contexto.moveTo(0, soloY);
    contexto.lineTo(largura, soloY);
    contexto.stroke();
  }

  if (cenário.linhaDeEmpuxo) {
    const linha = cenário.linhaDeEmpuxo();
    const comprimentoM = 12;
    const direcaoNormalizada = linha.direcao.multiplicar(1 / linha.direcao.magnitude);
    const fim = linha.origemM.adicionar(direcaoNormalizada.multiplicar(comprimentoM));
    const inicioX = origemX + linha.origemM.x * escala;
    const inicioY = soloY - linha.origemM.y * escala;
    const fimX = origemX + fim.x * escala;
    const fimY = soloY - fim.y * escala;
    contexto.save();
    contexto.strokeStyle = '#facc15';
    contexto.fillStyle = '#facc15';
    contexto.lineWidth = 2;
    contexto.setLineDash([7, 5]);
    contexto.beginPath();
    contexto.moveTo(inicioX, inicioY);
    contexto.lineTo(fimX, fimY);
    contexto.stroke();
    contexto.setLineDash([]);
    contexto.beginPath();
    contexto.moveTo(fimX, fimY);
    contexto.lineTo(fimX - 6, fimY + 12);
    contexto.lineTo(fimX + 6, fimY + 12);
    contexto.closePath();
    contexto.fill();
    contexto.restore();
  }

  if (cenário.mangueira) {
    const tanqueEstado = cenário.mangueira.tanque.getEstadoFisico();
    const propulsorEstado = cenário.mangueira.propulsor.getEstadoFisico();
    contexto.save();
    contexto.strokeStyle = cenário.mangueira.propulsor.mangueiraEstaRompida ? '#ef4444' : '#facc15';
    contexto.lineWidth = 4;
    contexto.setLineDash([8, 6]);
    contexto.beginPath();
    contexto.moveTo(origemX + tanqueEstado.posicaoM.x * escala, soloY - tanqueEstado.posicaoM.y * escala);
    contexto.lineTo(origemX + propulsorEstado.posicaoM.x * escala, soloY - propulsorEstado.posicaoM.y * escala);
    contexto.stroke();
    contexto.restore();
  }

  if (cenário.fixadores) {
    for (const fixador of cenário.fixadores) {
      const estadoA = fixador.objetoA.getEstadoFisico();
      const estadoB = fixador.objetoB.getEstadoFisico();
      const inicioX = origemX + estadoA.posicaoM.x * escala;
      const inicioY = soloY - estadoA.posicaoM.y * escala;
      const fimX = origemX + estadoB.posicaoM.x * escala;
      const fimY = soloY - estadoB.posicaoM.y * escala;
      contexto.save();
      contexto.strokeStyle = fixador.estaRompido ? '#ef4444' : '#38bdf8';
      contexto.fillStyle = contexto.strokeStyle;
      contexto.lineWidth = 5;
      if (fixador.estaRompido) contexto.setLineDash([7, 6]);
      contexto.beginPath();
      contexto.moveTo(inicioX, inicioY);
      contexto.lineTo(fimX, fimY);
      contexto.stroke();
      contexto.setLineDash([]);
      for (const [x, y] of [[inicioX, inicioY], [fimX, fimY]]) {
        contexto.beginPath();
        contexto.arc(x, y, 5, 0, Math.PI * 2);
        contexto.fill();
      }
      if (fixador.estaRompido) {
        const meioX = (inicioX + fimX) / 2;
        const meioY = (inicioY + fimY) / 2;
        contexto.lineWidth = 3;
        contexto.beginPath();
        contexto.moveTo(meioX - 6, meioY - 6);
        contexto.lineTo(meioX + 6, meioY + 6);
        contexto.moveTo(meioX + 6, meioY - 6);
        contexto.lineTo(meioX - 6, meioY + 6);
        contexto.stroke();
      }
      contexto.restore();
    }
  }

  for (const objeto of cenário.objetos) {
    const estado = objeto.getEstadoFisico();
    const x = origemX + estado.posicaoM.x * escala;
    const y = soloY - estado.posicaoM.y * escala;
    // Em escalas orbitais, preservar o tamanho físico produziria menos de um
    // pixel. O mínimo é apenas símbolo visual e permanece constante no cenário.
    const larguraObjeto = Math.max(10, objeto.dimensoesM.x * escala);
    const alturaObjeto = Math.max(10, objeto.dimensoesM.y * escala);
    contexto.save();
    contexto.translate(x, y);
    // O mundo físico usa Y positivo para cima; o canvas usa Y positivo para
    // baixo. Inverter a rotação mantém o sentido visual coerente com o torque.
    contexto.rotate(-estado.orientacaoRad.z);
    contexto.fillStyle = objeto.integridadeEstrutural === 0
      ? '#ef4444'
      : objeto.integridadeEstrutural < 1
        ? '#f59e0b'
        : objeto.id.startsWith('fundacao-')
          ? '#475569'
          : objeto.id.startsWith('bancada-termica')
            ? '#64748b'
            : objeto.id.startsWith('parede-termica')
              ? '#f97316'
        : objeto instanceof Propulsor
          ? '#94a3b8'
          : objeto instanceof TanquePropelente
            ? '#34d399'
            : objeto.dimensoesM.x > 1 ? '#a78bfa' : '#22d3ee';
    contexto.strokeStyle = '#e2e8f0';
    if (objeto instanceof Propulsor) {
      // A força do propulsor aponta para +X local; portanto o escape e a chama
      // aparecem no lado oposto (-X), somente quando há empuxo calculado pelo core.
      const intensidadeChama = Math.min(1, objeto.empuxoAtualN / 20_000);
      if (intensidadeChama > 0) {
        const comprimentoChama = larguraObjeto * (0.7 + intensidadeChama * 1.4);
        const raioChama = alturaObjeto * (0.18 + intensidadeChama * 0.22);
        const gradiente = contexto.createLinearGradient(-larguraObjeto * 0.42, 0, -larguraObjeto * 0.42 - comprimentoChama, 0);
        gradiente.addColorStop(0, '#fef3c7');
        gradiente.addColorStop(0.25, '#f59e0b');
        gradiente.addColorStop(0.7, '#f97316');
        gradiente.addColorStop(1, 'rgba(239, 68, 68, 0)');
        contexto.fillStyle = gradiente;
        contexto.beginPath();
        contexto.moveTo(-larguraObjeto * 0.4, -raioChama);
        contexto.quadraticCurveTo(-larguraObjeto * 0.42 - comprimentoChama * 0.42, -raioChama * 1.15, -larguraObjeto * 0.42 - comprimentoChama, 0);
        contexto.quadraticCurveTo(-larguraObjeto * 0.42 - comprimentoChama * 0.42, raioChama * 1.15, -larguraObjeto * 0.4, raioChama);
        contexto.closePath();
        contexto.fill();

        contexto.fillStyle = '#fff7ed';
        contexto.beginPath();
        contexto.moveTo(-larguraObjeto * 0.4, -raioChama * 0.38);
        contexto.lineTo(-larguraObjeto * 0.42 - comprimentoChama * 0.56, 0);
        contexto.lineTo(-larguraObjeto * 0.4, raioChama * 0.38);
        contexto.closePath();
        contexto.fill();
      }

      // Carcaça, câmara e bocal: somente uma representação visual do objeto físico.
      contexto.fillStyle = '#64748b';
      contexto.beginPath();
      contexto.moveTo(-larguraObjeto * 0.08, -alturaObjeto * 0.3);
      contexto.lineTo(larguraObjeto * 0.35, -alturaObjeto * 0.3);
      contexto.lineTo(larguraObjeto * 0.5, -alturaObjeto * 0.14);
      contexto.lineTo(larguraObjeto * 0.5, alturaObjeto * 0.14);
      contexto.lineTo(larguraObjeto * 0.35, alturaObjeto * 0.3);
      contexto.lineTo(-larguraObjeto * 0.08, alturaObjeto * 0.3);
      contexto.closePath();
      contexto.fill();
      contexto.stroke();

      contexto.fillStyle = '#334155';
      contexto.beginPath();
      contexto.moveTo(-larguraObjeto * 0.08, -alturaObjeto * 0.2);
      contexto.lineTo(-larguraObjeto * 0.48, -alturaObjeto * 0.38);
      contexto.lineTo(-larguraObjeto * 0.48, alturaObjeto * 0.38);
      contexto.lineTo(-larguraObjeto * 0.08, alturaObjeto * 0.2);
      contexto.closePath();
      contexto.fill();
      contexto.stroke();

      contexto.fillStyle = objeto.empuxoAtualN > 0 ? '#22c55e' : '#ef4444';
      contexto.beginPath();
      contexto.arc(larguraObjeto * 0.26, 0, Math.max(3, alturaObjeto * 0.075), 0, Math.PI * 2);
      contexto.fill();
      contexto.stroke();
      contexto.strokeStyle = '#cbd5e1';
      contexto.beginPath();
      contexto.moveTo(larguraObjeto * 0.03, -alturaObjeto * 0.18);
      contexto.lineTo(larguraObjeto * 0.03, alturaObjeto * 0.18);
      contexto.moveTo(larguraObjeto * 0.14, -alturaObjeto * 0.22);
      contexto.lineTo(larguraObjeto * 0.14, alturaObjeto * 0.22);
      contexto.stroke();
    } else if (objeto instanceof ObjetoTriangularRetangulo) {
      const vertices = objeto.getVerticesColisaoLocais2D();
      contexto.beginPath();
      contexto.moveTo(vertices[0].x * escala, -vertices[0].y * escala);
      for (const vertice of vertices.slice(1)) contexto.lineTo(vertice.x * escala, -vertice.y * escala);
      contexto.closePath();
      contexto.fill();
      contexto.stroke();
    } else {
      const centroCorpoY = objeto instanceof VeiculoTerrestre ? -objeto.getCentroChassiLocalM().y * escala : 0;
      const alturaCorpo = objeto instanceof VeiculoTerrestre ? objeto.alturaChassiM * escala : alturaObjeto;
      contexto.fillRect(-larguraObjeto / 2, centroCorpoY - alturaCorpo / 2, larguraObjeto, alturaCorpo);
      contexto.strokeRect(-larguraObjeto / 2, centroCorpoY - alturaCorpo / 2, larguraObjeto, alturaCorpo);
    }
    if (objeto.id.startsWith('fundacao-')) {
      contexto.fillStyle = '#cbd5e1';
      contexto.font = '10px ui-monospace, monospace';
      contexto.textAlign = 'center';
      contexto.fillText('FUNDAÇÃO · 500 t', 0, 4);
      contexto.textAlign = 'start';
    }
    if (objeto.id.startsWith('parede-termica')) {
      contexto.fillStyle = '#fff7ed';
      contexto.font = '10px ui-monospace, monospace';
      contexto.textAlign = 'center';
      contexto.fillText('PAREDE', 0, 4);
      contexto.textAlign = 'start';
    }
    if (objeto instanceof VeiculoAlado) {
      contexto.strokeStyle = '#fbbf24';
      contexto.lineWidth = 5;
      contexto.beginPath();
      contexto.moveTo(-larguraObjeto * 0.9, 0);
      contexto.lineTo(larguraObjeto * 0.9, 0);
      contexto.stroke();
      contexto.lineWidth = 1;
    }
    if (objeto instanceof TanquePropelente) {
      contexto.strokeStyle = '#064e3b';
      contexto.beginPath();
      contexto.moveTo(-larguraObjeto / 2, -alturaObjeto * 0.2);
      contexto.lineTo(larguraObjeto / 2, -alturaObjeto * 0.2);
      contexto.moveTo(-larguraObjeto / 2, alturaObjeto * 0.2);
      contexto.lineTo(larguraObjeto / 2, alturaObjeto * 0.2);
      contexto.stroke();
    }
    if (objeto instanceof VeiculoTerrestre) {
      const raioRoda = Math.max(4, objeto.raioRodaM * escala);
      contexto.fillStyle = '#0f172a';
      for (const posicaoLocal of objeto.getPosicoesRodasLocaisM()) {
        contexto.beginPath();
        // A conversão de Y físico para Canvas ocorre somente no renderer.
        contexto.arc(posicaoLocal.x * escala, -posicaoLocal.y * escala, raioRoda, 0, Math.PI * 2);
        contexto.fill();
        contexto.stroke();
      }
    }
    if (objeto.paraquedasEstaAberto) {
      // Ilustração independente da área física: o componente já informa o
      // arrasto ao core; aqui mostramos dossel, linhas e arnês de forma legível.
      // O dossel se orienta pelo fluxo relativo do ar, não pela orientação do estágio.
      contexto.save();
      contexto.rotate(estado.orientacaoRad.z);
      const velocidadeRelativaAoAr = estado.velocidadeMps.subtrair(cenário.mundo.velocidadeDoArMps);
      if (velocidadeRelativaAoAr.magnitude > 0.05) {
        // O dossel fica a sotavento do corpo: oposto à sua velocidade relativa.
        const direcaoX = -velocidadeRelativaAoAr.x / velocidadeRelativaAoAr.magnitude;
        const direcaoY = velocidadeRelativaAoAr.y / velocidadeRelativaAoAr.magnitude;
        contexto.rotate(Math.atan2(direcaoY, direcaoX) + Math.PI / 2);
      }
      const baseY = -alturaObjeto / 2;
      const estadoParaquedas = objeto.obterEstadoDoParaquedas();
      // No cenário de calibração, a área altera também o desenho; nos demais,
      // o tamanho visual permanece padronizado para legibilidade.
      const escalaVisual = cenário.objetoComParaquedasConfiguravel === objeto
        ? Math.sqrt((estadoParaquedas?.areaFrontalM2 ?? 25) / 25)
        : 1;
      const larguraDossel = Math.max(12, 32 * escalaVisual);
      const alturaDossel = larguraDossel * 0.48;
      const topoY = baseY - alturaDossel - 38;
      const bordaY = topoY + alturaDossel * 0.72;
      const pontosDossel = [-0.92, -0.58, -0.2, 0.2, 0.58, 0.92];
      const oscilacao = Math.sin(cenário.mundo.tempoS * 2.4) * 2;

      // Linhas de sustentação, desenhadas antes do tecido para entrarem nele.
      contexto.strokeStyle = 'rgba(226, 232, 240, 0.9)';
      contexto.lineWidth = 1.25;
      for (const proporcao of pontosDossel) {
        const origemX = proporcao * larguraDossel / 2 + oscilacao;
        contexto.beginPath();
        contexto.moveTo(origemX, bordaY - Math.abs(proporcao) * 4);
        contexto.quadraticCurveTo(origemX * 0.35, baseY - 20, 0, baseY - 2);
        contexto.stroke();
      }

      // Dossel com perfil curvo e borda inferior recortada por gomos.
      const gradiente = contexto.createLinearGradient(0, topoY, 0, bordaY);
      gradiente.addColorStop(0, '#fff7b2');
      gradiente.addColorStop(0.42, '#fbbf24');
      gradiente.addColorStop(1, '#d97706');
      contexto.fillStyle = gradiente;
      contexto.strokeStyle = '#92400e';
      contexto.lineWidth = 2;
      contexto.beginPath();
      contexto.moveTo(-larguraDossel / 2 + oscilacao, bordaY - 4);
      contexto.bezierCurveTo(-larguraDossel * 0.43 + oscilacao, topoY + 8, -larguraDossel * 0.2 + oscilacao, topoY - 5, oscilacao, topoY);
      contexto.bezierCurveTo(larguraDossel * 0.2 + oscilacao, topoY - 5, larguraDossel * 0.43 + oscilacao, topoY + 8, larguraDossel / 2 + oscilacao, bordaY - 4);
      for (let indice = 5; indice >= 0; indice -= 1) {
        const x = pontosDossel[indice] * larguraDossel / 2 + oscilacao;
        contexto.quadraticCurveTo(x, bordaY + 7, (indice === 0 ? -larguraDossel / 2 : pontosDossel[indice - 1] * larguraDossel / 2) + oscilacao, bordaY - 4);
      }
      contexto.closePath();
      contexto.fill();
      contexto.stroke();

      // Costuras radiais e pequena abertura de ventilação no topo.
      contexto.strokeStyle = 'rgba(120, 53, 15, 0.5)';
      contexto.lineWidth = 1;
      for (const proporcao of [-0.6, -0.3, 0, 0.3, 0.6]) {
        contexto.beginPath();
        contexto.moveTo(oscilacao, topoY + 4);
        contexto.quadraticCurveTo(proporcao * larguraDossel * 0.28 + oscilacao, topoY + alturaDossel * 0.45, proporcao * larguraDossel / 2 + oscilacao, bordaY - Math.abs(proporcao) * 4);
        contexto.stroke();
      }
      contexto.fillStyle = '#78350f';
      contexto.beginPath();
      contexto.ellipse(oscilacao, topoY + 4, 6, 2.5, 0, 0, Math.PI * 2);
      contexto.fill();

      // Um único engate central prende o paraquedas ao objeto.
      contexto.strokeStyle = '#94a3b8';
      contexto.lineWidth = 2;
      contexto.beginPath();
      contexto.moveTo(0, baseY - 2);
      contexto.lineTo(0, baseY + 5);
      contexto.stroke();
      contexto.fillStyle = '#e2e8f0';
      contexto.beginPath();
      contexto.arc(0, baseY - 2, 3, 0, Math.PI * 2);
      contexto.fill();
      contexto.lineWidth = 1;
      contexto.restore();
    }
    contexto.restore();
  }

  scenarioName.textContent = cenário.nome;
  simulationTime.textContent = `t = ${cenário.mundo.tempoS.toFixed(3)} s`;
  vehicleSpeed.textContent = cenário.telemetria?.() ?? '—';
  scenarioData.textContent = cenário.dados?.() ?? '—';
};

const carregarCenarioAtual = (): void => {
  const cenário = cenarioAtual();
  scenarioDescription.textContent = cenário.descricao;
  testStatus.textContent = emExecucao ? 'EXECUTANDO' : 'PRONTO';
  testStatus.className = emExecucao ? 'running' : '';
  testResult.textContent = '—';
  atualizarControlesDoPropulsor();
  desenhar();
};

const atualizarControlesDoPropulsor = (): void => {
  const cenário = cenarioAtual();
  const propulsor = cenário.propulsorControlavel;
  const propulsorVetorizado = cenário.propulsorVetorizadoControlavel;
  const permiteAjustarThrottle = cenário.permiteAjustarThrottle === true;
  const objetoComParaquedas = cenário.objetoComParaquedasControlavel;
  const objetoComParaquedasConfiguravel = cenário.objetoComParaquedasConfiguravel;
  propulsionControls.hidden = propulsor === undefined;
  const controles: Array<[HTMLButtonElement, string, IdSistemaPropulsor]> = [
    [toggleElectric, 'elétrica', 'elétrico'],
    [toggleHydraulic, 'hidráulica', 'hidráulico'],
    [toggleFuel, 'combustível', 'combustível'],
    [toggleControl, 'controle', 'controle'],
  ];
  controles.forEach(([botao, nome, id]) => {
    const combustivelIndisponivel = id === 'combustível' && propulsor?.mangueiraEstaRompida;
    const estado = propulsor?.obterEstadoDoSistema(id);
    botao.disabled = estado === undefined || combustivelIndisponivel;
    botao.textContent = combustivelIndisponivel
      ? 'Combustível indisponível'
      : estado === EstadoOperacional.Operacional ? `Desligar ${nome}` : `Ligar ${nome}`;
  });
  igniteButton.disabled = propulsor === undefined || propulsor.estaIgnitado;
  igniteButton.textContent = propulsor?.estaIgnitado ? '✓ Ignição confirmada' : '⚡ Realizar ignição';
  throttleControl.hidden = !permiteAjustarThrottle;
  throttleInput.disabled = !permiteAjustarThrottle || propulsor === undefined;
  gimbalControl.hidden = propulsorVetorizado === undefined;
  gimbalInput.disabled = propulsorVetorizado === undefined;
  if (propulsorVetorizado) {
    const estadoVetorizacao = propulsorVetorizado.obterEstadoDaVetorizacao();
    const limiteGraus = estadoVetorizacao.limiteAngularRad * 180 / Math.PI;
    const anguloGraus = estadoVetorizacao.anguloAtualRad * 180 / Math.PI;
    gimbalInput.min = String(-limiteGraus);
    gimbalInput.max = String(limiteGraus);
    gimbalInput.value = String(anguloGraus);
    gimbalValue.value = `${anguloGraus.toFixed(1)}°`;
    gimbalValue.textContent = `${anguloGraus.toFixed(1)}°`;
  }
  parachuteSettings.hidden = objetoComParaquedasConfiguravel === undefined;
  const estadoParaquedas = objetoComParaquedasConfiguravel?.obterEstadoDoParaquedas();
  parachuteAreaInput.disabled = estadoParaquedas === undefined;
  if (estadoParaquedas) {
    parachuteAreaInput.value = String(estadoParaquedas.areaFrontalM2);
    parachuteCalculatedValues.textContent = `Massa calculada: ${estadoParaquedas.massaKg.toFixed(1)} kg\nCoeficiente de arrasto: ${estadoParaquedas.coeficienteArrasto.toFixed(2)}\nResistência calculada: ${estadoParaquedas.resistenciaTracaoN.toFixed(0)} N`;
  }
  deployParachuteButton.hidden = objetoComParaquedas === undefined;
  deployParachuteButton.disabled = objetoComParaquedas === undefined || objetoComParaquedas.paraquedasEstaAberto;
  deployParachuteButton.textContent = objetoComParaquedas?.paraquedasEstaAberto
    ? '✓ Paraquedas aberto'
    : '◖ Acionar paraquedas';
  if (propulsor) {
    const porcentagem = Math.round(propulsor.throttleAtual * 100);
    throttleInput.value = String(porcentagem);
    throttleValue.value = `${porcentagem}%`;
    throttleValue.textContent = `${porcentagem}%`;
  }
};

const alternarSistema = (id: IdSistemaPropulsor): void => {
  const propulsor = cenarioAtual().propulsorControlavel;
  if (!propulsor) return;
  if (propulsor.sistemaEstaOperacional(id)) propulsor.desligarSistema(id);
  else propulsor.ligarSistema(id);
  atualizarControlesDoPropulsor();
  desenhar();
};

toggleElectric.addEventListener('click', () => alternarSistema('elétrico'));
toggleHydraulic.addEventListener('click', () => alternarSistema('hidráulico'));
toggleFuel.addEventListener('click', () => alternarSistema('combustível'));
toggleControl.addEventListener('click', () => alternarSistema('controle'));
igniteButton.addEventListener('click', () => {
  cenarioAtual().propulsorControlavel?.solicitarIgnicao();
  atualizarControlesDoPropulsor();
  desenhar();
});
deployParachuteButton.addEventListener('click', () => {
  const objeto = cenarioAtual().objetoComParaquedasControlavel;
  if (!objeto || objeto.paraquedasEstaAberto) return;
  objeto.acionarParaquedas();
  atualizarControlesDoPropulsor();
  desenhar();
});
throttleInput.addEventListener('input', () => {
  const propulsor = cenarioAtual().propulsorControlavel;
  if (!propulsor || !cenarioAtual().permiteAjustarThrottle) return;
  propulsor.definirThrottle(Number(throttleInput.value) / 100);
  atualizarControlesDoPropulsor();
  desenhar();
});
gimbalInput.addEventListener('input', () => {
  const propulsor = cenarioAtual().propulsorVetorizadoControlavel;
  if (!propulsor) return;
  propulsor.solicitarVetorizacao(Number(gimbalInput.value) * Math.PI / 180);
  atualizarControlesDoPropulsor();
  desenhar();
});
const configurarParaquedasDaBancada = (entrada: HTMLInputElement): void => {
  const objeto = cenarioAtual().objetoComParaquedasConfiguravel;
  const valor = Number(entrada.value);
  if (!objeto || !Number.isFinite(valor) || valor <= 0) return;
  objeto.configurarAreaDoParaquedas(valor);
  atualizarControlesDoPropulsor();
  desenhar();
};
parachuteAreaInput.addEventListener('input', () => configurarParaquedasDaBancada(parachuteAreaInput));

const executar = (agoraMs: number): void => {
  if (!emExecucao) return;
  const cenário = cenarioAtual();
  const deltaRealS = Math.min((agoraMs - ultimoQuadroMs) / 1000, 0.05);
  ultimoQuadroMs = agoraMs;
  cenário.mundo.avancar(Math.max(deltaRealS * cenário.velocidadeTempo, 1 / 240));
  cenário.atualizarControle?.();
  // Controladores automáticos usam a mesma API dos botões; refletir no mesmo
  // quadro a ação atualmente disponível evita inverter a leitura operacional.
  atualizarControlesDoPropulsor();
  desenhar();

  if (cenário.deveEncerrar()) {
    testStatus.textContent = 'CONCLUÍDO';
    testStatus.className = 'approved';
    testResult.textContent = cenário.validar();
    indiceAtual += 1;
    emExecucao = false;
    if (indiceAtual >= cenarios.length) {
      playButton.textContent = '▶ Executar novamente';
      return;
    }
    scenarioSelector.value = String(indiceAtual);
    playButton.textContent = '▶ Iniciar próximo teste';
    return;
  }
  window.requestAnimationFrame(executar);
};

playButton.addEventListener('click', () => {
  if (emExecucao) return;
  if (indiceAtual >= cenarios.length) {
    cenarios = construirCenarios();
    indiceAtual = 0;
    preencherSeletorDeCenarios();
  }
  emExecucao = true;
  playButton.textContent = 'Teste em execução…';
  carregarCenarioAtual();
  ultimoQuadroMs = performance.now();
  window.requestAnimationFrame(executar);
});

scenarioSelector.addEventListener('change', () => {
  emExecucao = false;
  const novoIndice = Number(scenarioSelector.value);
  cenarios = construirCenarios();
  indiceAtual = Number.isInteger(novoIndice) && novoIndice >= 0 && novoIndice < cenarios.length ? novoIndice : 0;
  playButton.textContent = '▶ Iniciar teste selecionado';
  preencherSeletorDeCenarios();
  carregarCenarioAtual();
});

skipButton.addEventListener('click', () => {
  if (!emExecucao) return;
  emExecucao = false;
  indiceAtual += 1;
  if (indiceAtual >= cenarios.length) {
    indiceAtual = 0;
    cenarios = construirCenarios();
  }
  scenarioSelector.value = String(indiceAtual);
  playButton.textContent = '▶ Iniciar próximo teste';
  carregarCenarioAtual();
});

resetButton.addEventListener('click', () => {
  emExecucao = false;
  cenarios = construirCenarios();
  indiceAtual = 0;
  preencherSeletorDeCenarios();
  playButton.textContent = '▶ Iniciar teste';
  carregarCenarioAtual();
});

preencherSeletorDeCenarios();
carregarCenarioAtual();
