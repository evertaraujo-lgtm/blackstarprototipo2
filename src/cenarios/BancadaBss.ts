import { MundoFisico, type RajadaVento } from '../physics/MundoFisico';
import { Objeto } from '../physics/objetos/base/Objeto';
import { SuperficiePlano } from '../physics/SuperficiePlano';
import { VeiculoComposto } from '../physics/objetos/veiculos/VeiculoComposto';
import { criarPernasFixasBss04 } from '../physics/objetos/veiculos/Bss04';
import { PropulsorVetorizado } from '../physics/objetos/propulsao/PropulsorVetorizado';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { Bateria } from '../physics/objetos/fontes-de-energia/Bateria';
import { PainelSolar } from '../physics/objetos/fontes-de-energia/PainelSolar';
import { ValvulaPropelente } from '../physics/objetos/propulsao/alimentacao/ValvulaPropelente';
import { LinhaDePropelente } from '../physics/objetos/propulsao/alimentacao/LinhaDePropelente';
import { BombaPropelente } from '../physics/objetos/propulsao/alimentacao/BombaPropelente';
import { CamaraCombustao } from '../physics/objetos/propulsao/combustao/CamaraCombustao';
import { Bocal, GRAVIDADE_PADRAO_MPS2 } from '../physics/objetos/propulsao/combustao/Bocal';
import { FixadorEstrutural } from '../physics/conexoes/FixadorEstrutural';
import { AletaAerodinamica } from '../physics/objetos/componentes/AletaAerodinamica';
import { ControladorAletasAerodinamicas } from '../physics/sistemas de controle/ControladorAletasAerodinamicas';
import { ControladorGuiaPousoBss06 } from '../physics/sistemas de controle/ControladorGuiaPousoBss06';
import { Vetor3 } from '../physics/Vetor3';
import { CorpoDeCilindroEletrico, HasteDeCilindroEletrico } from '../physics/objetos/atuadores/CilindroEletrico';
import { GuiaLinear } from '../physics/conexoes/GuiaLinear';
import { obterTelemetriaMissaoBss } from './TelemetriaMissaoBss';

export interface ConfiguracaoBancadaDecolagem {
  id: string;
  nome: string;
  descricao: string;
  controleDeInclinacaoPid: boolean;
  inclinacaoInicialRad: number;
  energiaInicialDaBateriaJ: number;
  deslocamentoLateralDoPainelM: number;
  painelMovel: boolean;
  incluirPainelSolar: boolean;
  incluirPernasFixas?: boolean;
  incluirAletasAerodinamicas?: boolean;
  incluirGuiaPousoPorAlvo?: boolean;
  fatorTanques?: number;
  fatorPropulsor?: number;
  capacidadeBateriaJ?: number;
  impulsoEspecificoNominalS?: number;
  velocidadeArMps?: Vetor3;
  rajadasVento?: readonly RajadaVento[];
  densidadeAtmosfericaKgM3?: number;
}

/** Decolagem integrada alimentada por painel solar e bateria física. */
export const criarTesteDecolagemComPainelSolar = (configuracao: ConfiguracaoBancadaDecolagem = {
  id: 'bss-001',
  nome: 'BSS-001 — primeiro lançamento de sucesso',
  descricao: 'BSS-001, primeiro foguete do protótipo a completar um lançamento de sucesso. Veículo composto físico com casco, tanques de metano e oxigênio, cadeia de alimentação bipropelente, bateria e painel solar. O Sol simulado incide verticalmente de cima para baixo por toda a atmosfera; a bateria acumula energia e o operador comanda manualmente os sistemas, o gimbal e a ignição.',
  controleDeInclinacaoPid: false,
  inclinacaoInicialRad: 0,
  // O cenário de lançamento deve aceitar a sequência elétrica imediatamente.
  energiaInicialDaBateriaJ: 10_000,
  deslocamentoLateralDoPainelM: 0,
  painelMovel: false,
  incluirPainelSolar: true,
}) => {
  const mundo = new MundoFisico(1 / 240, {
    densidadeAtmosfericaKgM3: configuracao.densidadeAtmosfericaKgM3 ?? 1.225,
    velocidadeArMps: configuracao.velocidadeArMps,
    rajadasVento: configuracao.rajadasVento,
  });
  const deslocamentoVerticalInicialM = configuracao.incluirPernasFixas ? 0.3 : 0;
  const alturaInicialDoCascoM = 4.5 + deslocamentoVerticalInicialM;
  const fatorTanques = configuracao.fatorTanques ?? 1;
  const fatorPropulsor = configuracao.fatorPropulsor ?? 1;
  const empuxoMaximoN = 40_000 * fatorPropulsor;
  const vazaoCombustivelMaximaKgS = configuracao.impulsoEspecificoNominalS === undefined
    ? 0.8 * fatorPropulsor
    : empuxoMaximoN / (configuracao.impulsoEspecificoNominalS * GRAVIDADE_PADRAO_MPS2 * 5);
  const vazaoOxidanteMaximaKgS = vazaoCombustivelMaximaKgS * 4;
  // Mantém o custo elétrico específico das bombas (J/kg) da configuração-base.
  const fatorVazaoEletrica = vazaoCombustivelMaximaKgS / (0.8 * fatorPropulsor);
  const alcanceConexoesLongasM = fatorTanques === 1 ? 12 : 16;
  const fatorLinearTanque = Math.cbrt(fatorTanques);
  const dimensoesTanque = new Vetor3(2 * fatorLinearTanque, 1.5 * fatorLinearTanque, 1.8 * fatorLinearTanque);
  const alturaTanqueM = dimensoesTanque.y;
  const topoCascoM = alturaInicialDoCascoM + 3;
  const centroTanqueCombustivelM = fatorTanques === 1
    ? 8.5
    : topoCascoM + alturaTanqueM / 2 + 0.15 - deslocamentoVerticalInicialM;
  const centroTanqueOxidanteM = fatorTanques === 1
    ? 10.3
    : centroTanqueCombustivelM + alturaTanqueM + 0.15;
  const centroBateriaM = fatorTanques === 1
    ? 12
    : centroTanqueOxidanteM + alturaTanqueM / 2 + 0.8;
  const centroPainelM = fatorTanques === 1
    ? 13.2
    : centroBateriaM + 0.725;
  const base = (id: string, massaBaseKg: number, dimensoesM: Vetor3, posicaoM: Vetor3) => ({
    id, massaBaseKg, dimensoesM, resistenciaColisaoJ: 500_000, limiteTermicoC: 1_000,
    estadoInicial: { posicaoM: posicaoM.adicionar(new Vetor3(0, deslocamentoVerticalInicialM, 0)) },
  });
  const veiculo = new VeiculoComposto({
    ...base(configuracao.id, 800, new Vetor3(3.2, 6, 2.4), new Vetor3(0, alturaInicialDoCascoM, 0)),
    estadoInicial: {
      posicaoM: new Vetor3(0, alturaInicialDoCascoM, 0),
      orientacaoRad: new Vetor3(0, 0, configuracao.inclinacaoInicialRad),
    },
    // 7 m² calibra a face de referência X×Z; tombado, a projeção usa a geometria XY.
    // A área e o centro de pressão representam o casco; os objetos expostos e as
    // grid fins contribuem separadamente quando declaram suas próprias áreas.
    areaFrontalM2: 7, coeficienteArrasto: 0.65, areaArrastoProjetadaPorOrientacao: true,
    centroPressaoLocalM: Vetor3.zero,
  });
  const tanqueCombustivel = new TanquePropelente({
    ...base('tanque-decolagem-metano', 180 * fatorTanques ** (2 / 3), dimensoesTanque, new Vetor3(0, centroTanqueCombustivelM, 0)),
    tipoPropelente: 'metano', capacidadePropelenteKg: 120 * fatorTanques, massaPropelenteInicialKg: 120 * fatorTanques,
  });
  const tanqueOxidante = new TanquePropelente({
    ...base('tanque-decolagem-oxidante', 160 * fatorTanques ** (2 / 3), dimensoesTanque, new Vetor3(0, centroTanqueOxidanteM, 0)),
    tipoPropelente: 'oxigenio', capacidadePropelenteKg: 480 * fatorTanques, massaPropelenteInicialKg: 480 * fatorTanques,
  });
  const bateria = new Bateria({
    ...base('bateria-decolagem-solar', fatorTanques === 1 ? 30 : 50, new Vetor3(1.2, 0.8, 1), new Vetor3(0, centroBateriaM, 0)),
    tensaoNominalV: 24, capacidadeEnergiaJ: configuracao.capacidadeBateriaJ ?? 30_000, energiaInicialJ: configuracao.energiaInicialDaBateriaJ,
  });
  const painel = new PainelSolar({
    ...base('painel-decolagem-solar', 35, new Vetor3(3, 0.25, 2), new Vetor3(configuracao.painelMovel ? 0 : configuracao.deslocamentoLateralDoPainelM, centroPainelM, 0)),
    areaAtivaM2: 10, irradianciaWPorM2: 1_000, eficiencia: 0.25, destino: bateria,
    obterFatorIluminacao: () => 1,
  });
  let cilindroPainel: CorpoDeCilindroEletrico | undefined;
  let hastePainel: HasteDeCilindroEletrico | undefined;
  let guiaPainel: GuiaLinear | undefined;
  let fixadorPainelHaste: FixadorEstrutural | undefined;
  let batentePainelRecuo: Objeto | undefined;
  let batentePainelAvanco: Objeto | undefined;
  let comandoPainel: 'parado' | 'avancar' | 'recuar' = 'parado';
  const limiteRecuoPainelM = 0;
  const limiteAvancoPainelM = 1.2;
  if (configuracao.painelMovel) {
    // A haste termina no centro do painel: o conjunto se desloca sem criar
    // um braço lateral que faria a placa tombar durante a extensão.
    hastePainel = new HasteDeCilindroEletrico(base('haste-painel-bss-003', 4, new Vetor3(0.35, 0.35, 0.35), new Vetor3(0, 13.2, 0)), () => cilindroPainel!);
    cilindroPainel = new CorpoDeCilindroEletrico({
      ...base('cilindro-painel-bss-003', 12, new Vetor3(0.7, 0.7, 0.7), new Vetor3(-0.7, 13.2, 0)),
      haste: hastePainel, bateria, velocidadeAvancoMps: 0.35, velocidadeRecuoMps: 0.35,
      forcaMaximaN: 1_000, direcaoDeCursoM: new Vetor3(1, 0, 0), rigidezRetencaoNPorM: 2_000,
    });
    guiaPainel = new GuiaLinear('guia-painel-bss-003', hastePainel, 1_000_000, 'x');
    fixadorPainelHaste = new FixadorEstrutural({
      id: 'fixador-painel-haste-bss-003', objetoA: hastePainel, objetoB: painel,
      resistenciaTracaoN: 20_000, resistenciaCompressaoN: 20_000,
      obterEsforcoSolicitadoN: () => cilindroPainel!.forcaNaHasteN,
    });
    batentePainelRecuo = new Objeto(base('batente-painel-recuo-bss-003', 18, new Vetor3(0.3, 1.2, 2), new Vetor3(-1.7, 13.2, 0)));
    batentePainelAvanco = new Objeto(base('batente-painel-avanco-bss-003', 18, new Vetor3(0.3, 1.2, 2), new Vetor3(2.9, 13.2, 0)));
  }
  const propulsor = new PropulsorVetorizado({
    // O motor nasce girado 90°: a altura física no eixo Y é metade da largura X (0,8 m).
    // Y = 0,8 m deixa o ponto inferior tangente ao solo, sem penetração inicial.
    ...base('propulsor-decolagem-solar', 90, new Vetor3(1.6, 1.4, 1.4), new Vetor3(0, 0.8, 0)),
    tensaoAlimentacaoNominalV: 24, potenciaEletricaMaximaW: 1_200 * fatorPropulsor * fatorVazaoEletrica, potenciaTermicaMaximaW: 2_000_000 * fatorPropulsor,
    massaBaseKg: 90 * fatorPropulsor,
    empuxoMaximoN, vazaoMaximaKgS: vazaoCombustivelMaximaKgS, propelenteCompativel: 'metano',
    vetorizacao: { limiteAngularRad: 15 * Math.PI / 180, velocidadeAngularMaximaRadps: 90 * Math.PI / 180 },
    estadoInicial: { posicaoM: new Vetor3(0, 0.8 + deslocamentoVerticalInicialM, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  const alcanceLinhasM = alcanceConexoesLongasM;
  const valvulaCombustivel = new ValvulaPropelente({ id: 'valvula-decolagem-metano', vazaoMaximaKgS: vazaoCombustivelMaximaKgS });
  const valvulaOxidante = new ValvulaPropelente({ id: 'valvula-decolagem-oxidante', vazaoMaximaKgS: vazaoOxidanteMaximaKgS });
  const linhaCombustivel = new LinhaDePropelente({
    id: 'linha-decolagem-metano', tanque: tanqueCombustivel, tipoPropelente: 'metano', comprimentoMaximoM: alcanceLinhasM, vazaoMaximaKgS: vazaoCombustivelMaximaKgS, valvula: valvulaCombustivel,
  });
  const linhaOxidante = new LinhaDePropelente({
    id: 'linha-decolagem-oxidante', tanque: tanqueOxidante, tipoPropelente: 'oxigenio', comprimentoMaximoM: alcanceLinhasM, vazaoMaximaKgS: vazaoOxidanteMaximaKgS, valvula: valvulaOxidante,
  });
  propulsor.conectarTanque(tanqueCombustivel, alcanceLinhasM);
  propulsor.conectarBateria(bateria, alcanceConexoesLongasM);
  propulsor.configurarCadeiaBipropelente({
    linhaCombustivel, linhaOxidante,
    bombaCombustivel: new BombaPropelente({ id: 'bomba-decolagem-metano', tensaoNominalV: 24, vazaoMaximaKgS: vazaoCombustivelMaximaKgS, potenciaEletricaMaximaW: 400 * fatorPropulsor * fatorVazaoEletrica }),
    bombaOxidante: new BombaPropelente({ id: 'bomba-decolagem-oxidante', tensaoNominalV: 24, vazaoMaximaKgS: vazaoOxidanteMaximaKgS, potenciaEletricaMaximaW: 600 * fatorPropulsor * fatorVazaoEletrica }),
    camara: new CamaraCombustao({ razaoMisturaOxidanteCombustivel: 4, toleranciaRazaoMistura: 0.1 }),
    bocal: new Bocal({ empuxoMaximoN, eficienciaNominal: 1, impulsoEspecificoNominalS: configuracao.impulsoEspecificoNominalS }),
  });
  propulsor.definirThrottle(0.65);
  const pernasFixas = configuracao.incluirPernasFixas
    ? criarPernasFixasBss04(new Vetor3(0, alturaInicialDoCascoM, 0), configuracao.id === 'bss-005' ? 'bss05' : 'bss04')
    : [];
  const aletasAerodinamicas = configuracao.incluirAletasAerodinamicas ? [-1, 1].map((lado) => new AletaAerodinamica({
    ...base(`bss06-grid-fin-${lado < 0 ? 'esquerda' : 'direita'}`, 30, new Vetor3(0.4, 1.5, 0.5), new Vetor3(lado * 1.8, centroPainelM + 1.1, 0)),
    areaEfetivaM2: 5,
    coeficienteSustentacaoPorRad: 2,
    coeficienteArrasto: 1.1,
    deflexaoMaximaRad: 25 * Math.PI / 180,
    velocidadeAngularMaximaRadps: 35 * Math.PI / 180,
    potenciaNominalAtuadorW: 1_000,
    potenciaEmRepousoW: 10,
    fonteEletrica: bateria,
    operacaoAutorizada: () => propulsor.sistemaEstaOperacional('elétrico') && propulsor.sistemaEstaOperacional('controle'),
  })) : [];
  const painelFazParteDoCasco = configuracao.incluirPainelSolar && !configuracao.painelMovel;
  const modulosDoVeiculo: Objeto[] = configuracao.painelMovel
    ? [bateria, tanqueCombustivel, tanqueOxidante, propulsor, cilindroPainel!, batentePainelRecuo!, batentePainelAvanco!, ...pernasFixas]
    : [ ...(painelFazParteDoCasco ? [painel] : []), bateria, tanqueCombustivel, tanqueOxidante, propulsor, ...pernasFixas, ...aletasAerodinamicas ];
  for (const modulo of modulosDoVeiculo) veiculo.adicionarModulo(modulo);
  veiculo.instalarPropulsor(propulsor);
  if (configuracao.incluirPernasFixas || configuracao.controleDeInclinacaoPid) veiculo.habilitarControleDeInclinacao();
  const modulosFixadosAoVeiculo: Objeto[] = configuracao.painelMovel
    ? [bateria, tanqueCombustivel, tanqueOxidante, propulsor, cilindroPainel!, batentePainelRecuo!, batentePainelAvanco!, ...pernasFixas]
    : [ ...(painelFazParteDoCasco ? [painel] : []), bateria, tanqueCombustivel, tanqueOxidante, propulsor, ...pernasFixas, ...aletasAerodinamicas ];
  const fixadores = modulosFixadosAoVeiculo.map((modulo) => new FixadorEstrutural({
    id: `fixador-decolagem-${modulo.id}`, objetoA: veiculo, objetoB: modulo,
    // O motor apoia o BSS-002; as sapatas apoiam o BSS-004. Ambos recebem
    // fixadores dimensionados para transmitir a reação do veículo ao tocar.
    resistenciaTracaoN: modulo === propulsor || modulo.id.startsWith('bss04-perna-') || modulo.id.startsWith('bss04-sapata-') || modulo.id.startsWith('bss05-perna-') || modulo.id.startsWith('bss05-sapata-') ? 1_000_000 : 300_000,
    resistenciaCompressaoN: modulo === propulsor || modulo.id.startsWith('bss04-perna-') || modulo.id.startsWith('bss04-sapata-') || modulo.id.startsWith('bss05-perna-') || modulo.id.startsWith('bss05-sapata-') ? 1_000_000 : 300_000,
    obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN,
  }));
  for (const fixador of fixadores) veiculo.adicionarFixador(fixador);
  const solo = new SuperficiePlano('solo-decolagem-solar', 'concreto', 0, 1_000_000, 0.04, 0.9);
  mundo.registrarSuperficie(solo);
  // O painel entra antes dos consumidores para a energia percorrer a instalação no mesmo passo físico.
  veiculo.registrarNoMundo(mundo);
  if (configuracao.incluirPainelSolar && configuracao.painelMovel && hastePainel && fixadorPainelHaste && guiaPainel) {
    mundo.registrarObjeto(hastePainel);
    mundo.registrarObjeto(painel);
    mundo.registrarFixador(fixadorPainelHaste);
    mundo.registrarGuiaLinear(guiaPainel);
  }
  const atualizarControlePainel = (): void => {
    if (!cilindroPainel) return;
    const xPainelM = painel.getEstadoFisico().posicaoM.x;
    const atingiuAvanco = xPainelM >= limiteAvancoPainelM - 1e-3;
    const atingiuRecuo = xPainelM <= limiteRecuoPainelM + 1e-3;
    if ((comandoPainel === 'avancar' && atingiuAvanco) || (comandoPainel === 'recuar' && atingiuRecuo)) {
      comandoPainel = 'parado';
      cilindroPainel.limparSelo();
    }
    cilindroPainel.definirEntradas({
      avancar: comandoPainel === 'avancar',
      recuar: comandoPainel === 'recuar',
      avancado: atingiuAvanco,
      recuado: atingiuRecuo,
    });
  };

  const alturaInicialM = veiculo.getEstadoFisico().posicaoM.y;
  const pesoAtualN = (): number => veiculo.massaInstantaneaDoConjuntoKg * Math.abs(MundoFisico.gravidadeTerrestreMps2.y);
  const controleAletasEnergizado = (): boolean => !bateria.estaDescarregada && bateria.integridadeEstrutural > 0
    && propulsor.sistemaEstaOperacional('elétrico') && propulsor.sistemaEstaOperacional('controle');
  const controladorAletas = aletasAerodinamicas.length > 0
    ? new ControladorAletasAerodinamicas(aletasAerodinamicas, controleAletasEnergizado)
    : undefined;
  let alvoPousoXM = 0;
  let jaDecolou = false;
  const controladorGuiaPouso = configuracao.incluirGuiaPousoPorAlvo
    ? new ControladorGuiaPousoBss06(aletasAerodinamicas, propulsor, controleAletasEnergizado, () => {
      const estado = veiculo.getEstadoFisico();
      if (estado.posicaoM.y > alturaInicialM + 0.5) jaDecolou = true;
      const conectados = veiculo.obterObjetosFisicosConectados();
      const centroMassaM = veiculo.centroDeMassaDoConjuntoM;
      const cargas = mundo.obterCargasAerodinamicas(conectados, centroMassaM);
      const bracoM = propulsor.getEstadoFisico().posicaoM.subtrair(centroMassaM);
      const c = Math.cos(estado.orientacaoRad.z), s = Math.sin(estado.orientacaoRad.z);
      return {
        forcaAerodinamicaXN: cargas.forcaN.x, torqueAerodinamicoNm: cargas.torqueNm.z,
        bracoPropulsorLocalM: new Vetor3(bracoM.x * c + bracoM.y * s, -bracoM.x * s + bracoM.y * c, 0),
        erroHorizontalM: alvoPousoXM - estado.posicaoM.x,
        velocidadeHorizontalMps: estado.velocidadeMps.x, velocidadeVerticalMps: estado.velocidadeMps.y,
        orientacaoRad: estado.orientacaoRad.z, velocidadeAngularRadps: estado.velocidadeAngularRadps.z,
        massaKg: veiculo.massaInstantaneaDoConjuntoKg, empuxoN: propulsor.empuxoAtualN,
        densidadeArKgM3: mundo.obterCondicoesAtmosfericas(veiculo).densidadeArKgM3,
        velocidadeArMps: mundo.velocidadeDoArMps,
        emModoPouso: modoBss04 === 'pouso' && jaDecolou,
        atuadoresConectados: [propulsor, ...aletasAerodinamicas].every((atuador) => conectados.includes(atuador)),
      };
    })
    : undefined;
  if (controladorGuiaPouso) {
    veiculo.registrarControlador(controladorGuiaPouso);
    controladorGuiaPouso.habilitar();
  }
  const atualizarControleAletas = (): void => {
    const estado = veiculo.getEstadoFisico();
    if (estado.posicaoM.y > alturaInicialM + 0.5) jaDecolou = true;
    if (!configuracao.incluirGuiaPousoPorAlvo) {
      controladorAletas?.atualizar(estado.orientacaoRad.z, estado.velocidadeAngularRadps.z, estado.velocidadeMps.y);
    }
  };
  let modoBss04: 'decolagem' | 'pouso' = 'decolagem';
  let contatoDePousoConfirmado = false;
  const configuracaoPousoBss04 = {
    altitudeAlvoM: alturaInicialDoCascoM,
    altitudeTransicaoM: 80,
    velocidadeDescidaMaximaMps: 12,
    velocidadeToqueMps: configuracao.incluirGuiaPousoPorAlvo ? 0.15 : 0.35,
    empuxoMaximoN: propulsor.empuxoMaximoN,
    ganhoProporcionalThrottlePorMps: 0.09,
    ganhoIntegralThrottlePorM: 0.004,
    ganhoDerivativoThrottleSegundosPorM: 0.015,
    taxaMaximaThrottlePorS: 10,
    erroParaEmpuxoMaximoMps: 2,
    // O BSS-006 tem um guia próprio de posição/velocidade e gimbal; manter o
    // amortecimento horizontal do PID de subida ativado cria um segundo
    // controlador concorrente durante a transição para a descida.
    ganhoAtitudePorVelocidadeHorizontalRadPorMps: configuracao.incluirGuiaPousoPorAlvo ? 0 : 0.01,
    ...(configuracao.incluirGuiaPousoPorAlvo ? {
      // O corte terminal usa apoio confirmado pelo resolvedor do MundoFisico.
      // A confirmação fica retida para não rearmar o throttle por oscilação de contato.
      obterContatoComSolo: () => {
        const sapatas = pernasFixas.filter((perna) => perna.id.includes('sapata'));
        const apoioBilateral = sapatas.length === 2 && sapatas.every((sapata) =>
          mundo.obterContatosDoObjeto(sapata, solo).some((contato) => contato.emApoio));
        contatoDePousoConfirmado ||= apoioBilateral;
        return contatoDePousoConfirmado;
      },
    } : {}),
  };
  const obterDadosMissao = () => obterTelemetriaMissaoBss(mundo, veiculo, propulsor, [tanqueCombustivel, tanqueOxidante]);
  const descricaoMissao = () => {
    const dados = obterDadosMissao();
    return `Ambiente local: ρ ${dados.densidadeArKgM3.toFixed(4)} kg/m³ · q ${(dados.pressaoDinamicaPa / 1_000).toFixed(3)} kPa\nDelta-v ideal restante: ${dados.deltaVIdealMps?.toFixed(1) ?? 'não aplicável'} m/s\nHipótese: ${dados.hipoteseDeltaV}\nMotor — diagnóstico atual: ${dados.diagnosticoMotor.join(' · ') || 'operacional'}\n`;
  };
  return {
    nome: configuracao.nome,
    obterDadosMissao,
    obterConfiguracaoEnsaio: () => ({ ...configuracao, dtS: 1 / 240, densidadeAtmosfericaKgM3: configuracao.densidadeAtmosfericaKgM3 ?? 1.225, velocidadeArMps: configuracao.velocidadeArMps ?? Vetor3.zero }),
    descricao: configuracao.descricao,
    mundo, objetos: [veiculo, ...veiculo.modulosFisicos, ...(configuracao.incluirPainelSolar && configuracao.painelMovel && hastePainel ? [hastePainel, painel] : [])], superficies: [solo], velocidadeTempo: 3, limiteVerticalM: 70, limiteHorizontalM: 12,
    seguirObjeto: veiculo, cameraY: () => veiculo.getEstadoFisico().posicaoM.y, conexoesEletricas: [...(configuracao.incluirPainelSolar ? [painel.conexaoCarga] : []), propulsor.conexaoEletrica!, ...(cilindroPainel ? [cilindroPainel.conexaoEletrica] : []), ...aletasAerodinamicas.map((aleta) => aleta.conexaoEletrica)],
    mangueira: { tanque: tanqueCombustivel, propulsor }, linhasComFalhaControlavel: { combustivel: linhaCombustivel, oxidante: linhaOxidante },
    fixadores: [...fixadores, ...(fixadorPainelHaste ? [fixadorPainelHaste] : [])], propulsorControlavel: propulsor, propulsorVetorizadoControlavel: propulsor, permiteAjustarThrottle: true,
    ...(configuracao.incluirPernasFixas ? {
      canaisTrace: [
        { nome: 'THROTTLE', cor: '#f97316', obterSinal: () => propulsor.throttleAtual * 100, escala: { minimo: 0, maximo: 100, unidade: '%' } },
        { nome: 'EMPUXO', cor: '#facc15', obterSinal: () => propulsor.empuxoAtualN / 1_000, escala: { minimo: 0, maximo: propulsor.empuxoMaximoN / 1_000, unidade: 'kN' } },
        { nome: 'EFEITO TÉRMICO', cor: '#fb7185', obterSinal: () => propulsor.potenciaTermicaAtualW / 1_000_000, escala: { minimo: 0, maximo: propulsor.potenciaTermicaMaximaW / 1_000_000, unidade: 'MW' } },
        { nome: 'GIMBAL', cor: '#22d3ee', obterSinal: () => propulsor.obterEstadoDaVetorizacao().anguloAtualRad * 180 / Math.PI, escala: { minimo: -15, maximo: 15, unidade: '°' } },
        ...(aletasAerodinamicas.length > 0 ? [{ nome: 'GRID FINS', cor: '#38bdf8', obterSinal: () => aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI, escala: { minimo: -25, maximo: 25, unidade: '°' } }] : []),
        { nome: 'MASSA', cor: '#c084fc', obterSinal: () => veiculo.massaInstantaneaDoConjuntoKg, escala: { minimo: 0, maximo: veiculo.massaInstantaneaDoConjuntoKg * 1.1, unidade: 'kg' } },
        { nome: 'ALTITUDE', cor: '#e2e8f0', obterSinal: () => veiculo.getEstadoFisico().posicaoM.y, escala: { minimo: 0, maximo: 20_000, unidade: 'm' } },
        { nome: 'VELOCIDADE Y', cor: '#a3e635', obterSinal: () => veiculo.getEstadoFisico().velocidadeMps.y, escala: { minimo: -120, maximo: 450, unidade: 'm/s' } },
        { nome: 'PRESSÃO DINÂMICA', cor: '#fbbf24', obterSinal: () => obterDadosMissao().pressaoDinamicaPa / 1_000, escala: { minimo: 0, maximo: 100, unidade: 'kPa' } },
        ...(configuracao.impulsoEspecificoNominalS === undefined ? [] : [
          { nome: 'ISP EFETIVO', cor: '#93c5fd', obterSinal: () => obterDadosMissao().impulsoEspecificoEfetivoS ?? 0, escala: { minimo: 0, maximo: configuracao.impulsoEspecificoNominalS, unidade: 's (0 sem vazão)' } },
          { nome: 'DELTA-V IDEAL', cor: '#d8b4fe', obterSinal: () => obterDadosMissao().deltaVIdealMps ?? 0, escala: { minimo: 0, maximo: 4_000, unidade: 'm/s' } },
        ]),
        { nome: 'VELOCIDADE X', cor: '#4ade80', obterSinal: () => veiculo.obterLeiturasDosSensores().velocidadeHorizontalMps, escala: { minimo: -20, maximo: 20, unidade: 'm/s' } },
        ...(configuracao.incluirGuiaPousoPorAlvo ? [
          { nome: 'ALVO X', cor: '#22d3ee', obterSinal: () => alvoPousoXM, escala: { minimo: -50, maximo: 50, unidade: 'm' } },
          { nome: 'ERRO X', cor: '#f472b6', obterSinal: () => alvoPousoXM - veiculo.getEstadoFisico().posicaoM.x, escala: { minimo: -50, maximo: 50, unidade: 'm' } },
        ] : []),
        { nome: 'ATITUDE', cor: '#e879f9', obterSinal: () => veiculo.getEstadoFisico().orientacaoRad.z * 180 / Math.PI, escala: { minimo: -180, maximo: 180, unidade: '°' } },
        { nome: 'VEL. ANGULAR', cor: '#fb7185', obterSinal: () => veiculo.getEstadoFisico().velocidadeAngularRadps.z * 180 / Math.PI, escala: { minimo: -90, maximo: 90, unidade: '°/s' } },
      ],
      ativarModoBss04: (modo: 'decolagem' | 'pouso') => {
        modoBss04 = modo;
        if (modo === 'pouso') veiculo.habilitarControleDeDescidaFuzzyPid(configuracaoPousoBss04, [propulsor.id]);
        else {
          veiculo.desabilitarControleDeDescidaFuzzyPid();
          veiculo.definirThrottleDoPropulsor(propulsor.id, 0);
        }
      },
      obterModoBss04: () => modoBss04,
      obterStatusControleBss04: () => {
        if (modoBss04 === 'decolagem') return 'Decolagem · controle de throttle manual · gimbal automático ativo';
        if (!propulsor.estaIgnitado) return 'Pouso automático selecionado · aguardando ignição do motor';
        const comando = veiculo.obterUltimoComandoDeDescidaFuzzyPid();
        return `Pouso · ${comando.fase} · alvo ${comando.velocidadeVerticalAlvoMps.toFixed(1)} m/s · throttle ${(comando.throttle * 100).toFixed(0)}%`;
      },
      ...(configuracao.incluirGuiaPousoPorAlvo ? {
        obterPontoPousoX: () => alvoPousoXM,
        pontoPousoSelecionavel: () => !jaDecolou && veiculo.getEstadoFisico().posicaoM.y <= alturaInicialM + 0.5,
        selecionarPontoPousoX: (xM: number) => {
          if (!Number.isFinite(xM) || jaDecolou || veiculo.getEstadoFisico().posicaoM.y > alturaInicialM + 0.5) return false;
          alvoPousoXM = xM;
          return true;
        },
      } : {}),
    } : {}),
    ...(configuracao.painelMovel && cilindroPainel && hastePainel && guiaPainel ? {
      guiasLineares: [guiaPainel],
      exibirGuiasLineares: false,
      comandarCilindro: (novoComando: 'avancar' | 'recuar') => {
        comandoPainel = novoComando;
        atualizarControlePainel();
      },
      configurarVelocidadesDoCilindro: (avancoMps: number, recuoMps: number) => cilindroPainel!.configurarVelocidades(avancoMps, recuoMps),
      velocidadesDoCilindro: () => ({ avancoMps: cilindroPainel!.velocidadeAvancoMps, recuoMps: cilindroPainel!.velocidadeRecuoMps }),
      obterEntradasCilindro: () => ({ avancar: comandoPainel === 'avancar', recuar: comandoPainel === 'recuar' }),
      atualizarControle: atualizarControlePainel,
    } : {}),
    ...(controladorAletas ? { atualizarControle: atualizarControleAletas } : {}),
    exibirNaBancada: true, deveEncerrar: () => false,
    ...(controladorGuiaPouso ? { obterDiagnosticoGuiaPouso: () => controladorGuiaPouso.obterDiagnostico() } : {}),
    telemetria: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `bateria ${(bateria.percentualDeCarga * 100).toFixed(1)}% · altitude GPS ${leituras.altitudeM.toFixed(1)} m · empuxo ${propulsor.empuxoAtualN.toFixed(0)} / peso ${pesoAtualN().toFixed(0)} N${configuracao.incluirGuiaPousoPorAlvo ? ` · alvo x ${alvoPousoXM.toFixed(1)} m` : ''}${aletasAerodinamicas.length ? ` · grid fins ${(aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI).toFixed(1)}°` : ''}`; },
    dados: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `${descricaoMissao()}${configuracao.incluirPainelSolar ? `Sol: irradiância vertical descendente · 1.000 W/m²\nPainel: ${painel.potenciaAtualW.toFixed(0)} W · energia gerada ${painel.energiaGeradaJ.toFixed(0)} J\n` : ''}${configuracao.incluirPernasFixas ? 'Trem de pouso: duas pernas fixas com sapatas laterais\n' : ''}${configuracao.incluirGuiaPousoPorAlvo ? `Ponto de pouso: X ${alvoPousoXM.toFixed(1)} m · ${jaDecolou ? 'seleção bloqueada após decolagem' : 'clique no solo antes da decolagem para alterar'}\n` : ''}${aletasAerodinamicas.length ? `Controle aerodinâmico: ${aletasAerodinamicas.length} grid fins físicas · deflexão ${(aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI).toFixed(1)}° · torque disponível somente com fluxo atmosférico\n` : ''}${cilindroPainel ? `Painel móvel: comando ${comandoPainel} · x ${painel.getEstadoFisico().posicaoM.x.toFixed(2)} m · velocidade ${painel.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s · força ${cilindroPainel.forcaNaHasteN.toFixed(0)} N\n` : ''}Bateria: ${bateria.energiaArmazenadaJ.toFixed(0)} / ${bateria.capacidadeEnergiaJ.toFixed(0)} J (${(bateria.percentualDeCarga * 100).toFixed(1)}%)\nFonte do propulsor: ${propulsor.fonteEletricaEstaConectada ? 'bateria conectada' : 'indisponível'} · cabo ${propulsor.conexaoEletrica?.interruptorPrincipalFechado ? 'fechado' : 'aberto'}\nPartida: comando manual pelos controles da bancada\nControle de inclinação: ${veiculo.controleDeInclinacaoEstaHabilitado ? 'PID automático' : 'manual'}\nGPS idealizado: X ${leituras.posicaoGpsM.x.toFixed(2)} m · Y ${leituras.posicaoGpsM.y.toFixed(2)} m\nAltitude derivada do GPS: ${leituras.altitudeM.toFixed(2)} m\nVelocidade derivada do GPS: vertical ${leituras.velocidadeVerticalMps.toFixed(2)} m/s · horizontal ${leituras.velocidadeHorizontalMps.toFixed(2)} m/s\nInclinação do sensor de nível: ${(leituras.inclinacaoRad * 180 / Math.PI).toFixed(2)}° · gimbal ${(propulsor.obterEstadoDaVetorizacao().anguloAtualRad * 180 / Math.PI).toFixed(2)}°\nAutoridade do gimbal: ${veiculo.obterSolicitacoesAplicadas().find((s) => s.recurso === 'gimbal')?.idControlador ?? 'sem comando alimentado'}\nMassa conectada: ${veiculo.massaInstantaneaDoConjuntoKg.toFixed(1)} kg · peso ${pesoAtualN().toFixed(0)} N\nTanques: CH4 ${tanqueCombustivel.massaPropelenteKg.toFixed(1)} kg · O2 ${tanqueOxidante.massaPropelenteKg.toFixed(1)} kg\nCadeia: ${linhaCombustivel.estaIndisponivel || linhaOxidante.estaIndisponivel ? 'INDISPONÍVEL' : 'íntegra'} · vazão ${propulsor.vazaoAtualKgS.toFixed(2)} kg/s\nEmpuxo: ${propulsor.empuxoAtualN.toFixed(0)} N · ignição ${propulsor.estaIgnitado ? 'ativa' : 'cortada'} · integridade ${Math.round(propulsor.integridadeEstrutural * 100)}%\n${propulsor.impulsoEspecificoNominalS === undefined ? 'Modelo propulsivo: ensaio paramétrico' : `Isp nominal: ${propulsor.impulsoEspecificoNominalS.toFixed(0)} s · efetivo: ${propulsor.impulsoEspecificoEfetivoS?.toFixed(1) ?? 'sem vazão'} s · referência ao nível do mar, constante com altitude`}\nFluxo reagido: ${propulsor.vazaoReagidaKgS.toFixed(2)} kg/s\nEfeito térmico simplificado: ${(propulsor.potenciaTermicaAtualW / 1e6).toFixed(2)} MW · carcaça ${(propulsor.potenciaTermicaNaCarcacaW / 1e6).toFixed(2)} MW · jato ${(propulsor.potenciaTermicaNoJatoW / 1e6).toFixed(2)} MW`; },
    validar: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `${propulsor.estaIgnitado && propulsor.empuxoAtualN > pesoAtualN() && Math.abs(leituras.inclinacaoRad) < 5 * Math.PI / 180 && leituras.altitudeM > alturaInicialM + 0.5 ? 'APROVADO' : 'AGUARDANDO DECOLAGEM'} · empuxo ${propulsor.empuxoAtualN.toFixed(0)} N; peso ${pesoAtualN().toFixed(0)} N; inclinação ${(leituras.inclinacaoRad * 180 / Math.PI).toFixed(2)}°`; },
  };
};

/** Hipótese de estudo fixa, sem correção de pressão ambiente; não é especificação de um motor real. */
export const IMPULSO_ESPECIFICO_NOMINAL_BSS005_S = 350;

/** BSS-004 com tanques ampliados e propulsão química idealizada coerente. */
export const criarTesteBss005 = (
  ambiente: Pick<ConfiguracaoBancadaDecolagem, 'velocidadeArMps' | 'rajadasVento' | 'densidadeAtmosfericaKgM3'> = {},
) => criarTesteDecolagemComPainelSolar({
  ...ambiente,
  id: 'bss-005',
  nome: 'BSS-005 — tanques ampliados · meta 15 km',
  descricao: 'Variante do BSS-004 com 600 kg de metano e 2.400 kg de oxigênio. Motor químico idealizado de 120 kN, Isp nominal de 350 s e vazão total nominal de 34,96 kg/s. Isp fixo na condição de referência ao nível do mar; sem correção por pressão ambiente. A meta de 15 km e a reserva para retorno devem ser verificadas com este modelo; os 6 MW são efeito térmico simplificado, não potência química total.',
  controleDeInclinacaoPid: true,
  inclinacaoInicialRad: 0,
  energiaInicialDaBateriaJ: 1_000_000,
  capacidadeBateriaJ: 1_000_000,
  deslocamentoLateralDoPainelM: 0.8,
  painelMovel: false,
  incluirPainelSolar: true,
  incluirPernasFixas: true,
  fatorTanques: 5,
  fatorPropulsor: 3,
  impulsoEspecificoNominalS: IMPULSO_ESPECIFICO_NOMINAL_BSS005_S,
});

/** BSS-005 com controle aerodinâmico ativo durante a descida atmosférica. */
export const criarTesteBss006 = (ambiente: Pick<ConfiguracaoBancadaDecolagem, 'velocidadeArMps' | 'densidadeAtmosfericaKgM3'> = {}) => criarTesteDecolagemComPainelSolar({
  ...ambiente,
  id: 'bss-006',
  nome: 'BSS-006 — pouso guiado por alvo',
  descricao: 'Variante do BSS-005 com duas grid fins físicas e gimbal coordenados para a descida. Antes da decolagem, clique no solo para escolher o ponto de pouso. No modo Pouso, a guia usa o gimbal com empuxo e as grid fins com fluxo atmosférico para reduzir o erro horizontal; o core continua calculando forças, torque e contato.',
  controleDeInclinacaoPid: true,
  inclinacaoInicialRad: 0,
  energiaInicialDaBateriaJ: 1_000_000,
  capacidadeBateriaJ: 1_000_000,
  deslocamentoLateralDoPainelM: 0.8,
  painelMovel: false,
  incluirPainelSolar: true,
  incluirPernasFixas: true,
  incluirAletasAerodinamicas: true,
  incluirGuiaPousoPorAlvo: true,
  fatorTanques: 5,
  fatorPropulsor: 3,
  impulsoEspecificoNominalS: IMPULSO_ESPECIFICO_NOMINAL_BSS005_S,
});
