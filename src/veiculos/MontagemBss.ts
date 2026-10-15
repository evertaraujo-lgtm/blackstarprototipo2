import { MundoFisico } from '../physics/MundoFisico';
import { Objeto } from '../physics/objetos/base/Objeto';
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
import { obterTelemetriaMissaoBss } from './TelemetriaBss';

import type { SuperficieFisica } from '../physics/SuperficieFisica';

export interface ParametrosMontagemBss {
  /** Somente condição inicial de ensaio ADM; não é comando cinemático de voo. */
  estadoInicialEnsaio?: { readonly centroCascoLocalM: Vetor3; readonly velocidadeLocalMps: Vetor3;
    readonly inclinacaoRad: number; readonly velocidadeAngularRadps: number };
  /** Arco do sítio de lançamento no plano orbital; não é latitude/longitude. */
  arcoBaseM?: number;
  id: string;
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
}


/** Montagem física compartilhada; ambiente e superfície são fornecidos pelo consumidor.
 * @contract f-fd616459b962f64d
 */
export function montarVeiculoBss(mundo: MundoFisico, solo: SuperficieFisica, configuracao: ParametrosMontagemBss) {
  const ref = mundo.ambiente.referencial;
  const ancora = ref.posicaoPorArcoM(configuracao.arcoBaseM ?? 0, 0);
  const deslocamentoVerticalInicialM = configuracao.incluirPernasFixas ? 0.3 : 0;
  const alturaInicialDoCascoM = 4.5 + deslocamentoVerticalInicialM;
  /** Converte montagem local para global; variante de ensaio gira peças em torno do casco e distribui v+ω×r, preservando pose relativa inicial. Valida grandezas angulares; não atualiza corpos já integrados. @contract f-65edae0a6d02c533 @reviewed M12-DOC: implementação lida. */
  const estadoInicial = (p: Vetor3, theta = 0) => {
    const ensaio = configuracao.estadoInicialEnsaio;
    if (!ensaio) return { posicaoM: ref.localParaGlobal(p, ancora), orientacaoRad: new Vetor3(0, 0, ref.atitudeInercialRad(theta, ancora)) };
    if (![ensaio.inclinacaoRad, ensaio.velocidadeAngularRadps].every(Number.isFinite)) throw new Error('Condição inicial angular inválida.');
    const q = p.subtrair(new Vetor3(0, alturaInicialDoCascoM, 0)), c = Math.cos(ensaio.inclinacaoRad), s = Math.sin(ensaio.inclinacaoRad);
    const braco = new Vetor3(q.x * c - q.y * s, q.x * s + q.y * c, 0);
    return { posicaoM: ref.localParaGlobal(ensaio.centroCascoLocalM.adicionar(braco), ancora),
      orientacaoRad: new Vetor3(0, 0, ref.atitudeInercialRad(theta + ensaio.inclinacaoRad, ancora)),
      velocidadeMps: ref.vetorParaGlobal(ensaio.velocidadeLocalMps.adicionar(new Vetor3(0, 0, ensaio.velocidadeAngularRadps).produtoVetorial(braco)), ancora),
      velocidadeAngularRadps: new Vetor3(0, 0, ensaio.velocidadeAngularRadps) };
  };
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
  /** Cria definição comum SI com resistência 500 kJ/limite 1000 °C e estado transformado, incorporando deslocamento vertical inicial declarado. @contract f-29c573fab3c95107 @reviewed M12-DOC: implementação lida. */
  const base = (id: string, massaBaseKg: number, dimensoesM: Vetor3, posicaoM: Vetor3) => ({
    id, massaBaseKg, dimensoesM, resistenciaColisaoJ: 500_000, limiteTermicoC: 1_000,
    estadoInicial: estadoInicial(posicaoM.adicionar(new Vetor3(0, deslocamentoVerticalInicialM, 0))),
  });
  const veiculo = new VeiculoComposto({
    ...base(configuracao.id, 800, new Vetor3(3.2, 6, 2.4), new Vetor3(0, alturaInicialDoCascoM, 0)),
    estadoInicial: estadoInicial(new Vetor3(0, alturaInicialDoCascoM, 0), configuracao.inclinacaoInicialRad),
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
    /** Devolve `1`. Efeitos indiretos seguem as dependências chamadas. @contract f-209951e3f470fe6e */
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
      /** Devolve `cilindroPainel!.forcaNaHasteN`. Efeitos indiretos seguem as dependências chamadas. @contract f-3a4f01c7d556607a */
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
    estadoInicial: estadoInicial(new Vetor3(0, 0.8 + deslocamentoVerticalInicialM, 0), Math.PI / 2),
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
    ? criarPernasFixasBss04(new Vetor3(0, alturaInicialDoCascoM, 0), configuracao.id === 'bss-005' ? 'bss05' : 'bss04', estadoInicial)
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
    /** Devolve `propulsor.sistemaEstaOperacional('elétrico') && propulsor.sistemaEstaOperacional('controle')`. Dependências diretas: `propulsor.sistemaEstaOperacional`. Efeitos indiretos seguem as dependências chamadas. @contract f-378732a2348d4c39 */
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
    /** Devolve `propulsor.empuxoAtualN`. Efeitos indiretos seguem as dependências chamadas. @contract f-d732a358ed22749d */
    obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN,
  }));
  for (const fixador of fixadores) veiculo.adicionarFixador(fixador);
  // O painel entra antes dos consumidores para a energia percorrer a instalação no mesmo passo físico.
  veiculo.registrarNoMundo(mundo);
  if (configuracao.incluirPainelSolar && configuracao.painelMovel && hastePainel && fixadorPainelHaste && guiaPainel) {
    mundo.registrarObjeto(hastePainel);
    mundo.registrarObjeto(painel);
    mundo.registrarFixador(fixadorPainelHaste);
    mundo.registrarGuiaLinear(guiaPainel);
  }
  /** Consulta X do painel e limites com tolerância 1 mm; limpa selo ao atingir fim e envia entradas ao cilindro. Este painel móvel de bancada usa eixo X global, sem conversão geral radial. @contract f-91b1b8d5cb264877 @reviewed M12-DOC: implementação lida. */
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

  const alturaInicialM = ref.altitudeGeometricaM(veiculo.getEstadoFisico().posicaoM);
  /** Devolve `veiculo.massaInstantaneaDoConjuntoKg * mundo.obterGravidadeMps2(veiculo.getEstadoFisico().posicaoM).magnitude`. Dependências diretas: `mundo.obterGravidadeMps2`, `veiculo.getEstadoFisico`. Efeitos indiretos seguem as dependências chamadas. @contract f-75d31f7dd71b5b26 */
  const pesoAtualN = (): number => veiculo.massaInstantaneaDoConjuntoKg * mundo.obterGravidadeMps2(veiculo.getEstadoFisico().posicaoM).magnitude;
  /** Autoriza controle das aletas com bateria carregada/íntegra e sistemas elétrico/controle do motor operacionais. @contract f-cd5e42939c301cd0 @reviewed M12-DOC: implementação lida. */
  const controleAletasEnergizado = (): boolean => !bateria.estaDescarregada && bateria.integridadeEstrutural > 0
    && propulsor.sistemaEstaOperacional('elétrico') && propulsor.sistemaEstaOperacional('controle');
  const controladorAletas = aletasAerodinamicas.length > 0
    ? new ControladorAletasAerodinamicas(aletasAerodinamicas, controleAletasEnergizado)
    : undefined;
  let alvoPousoXM = configuracao.arcoBaseM ?? 0;
  let jaDecolou = false;
  const controladorGuiaPouso = configuracao.incluirGuiaPousoPorAlvo
    ? new ControladorGuiaPousoBss06(aletasAerodinamicas, propulsor, controleAletasEnergizado, () => {
      const estado = veiculo.getEstadoFisico();
      if (ref.altitudeGeometricaM(estado.posicaoM) > alturaInicialM + 0.5) jaDecolou = true;
      const conectados = veiculo.obterObjetosFisicosConectados();
      const centroMassaM = veiculo.centroDeMassaDoConjuntoM;
      const cargas = mundo.obterCargasAerodinamicas(conectados, centroMassaM);
      const bracoM = propulsor.getEstadoFisico().posicaoM.subtrair(centroMassaM);
      const c = Math.cos(estado.orientacaoRad.z), s = Math.sin(estado.orientacaoRad.z);
      return {
        gravidadeLocalMps2: mundo.obterGravidadeMps2(estado.posicaoM).magnitude,
        forcaAerodinamicaXN: cargas.forcaN.produtoEscalar(ref.tangencial(estado.posicaoM)), torqueAerodinamicoNm: cargas.torqueNm.z,
        bracoPropulsorLocalM: new Vetor3(bracoM.x * c + bracoM.y * s, -bracoM.x * s + bracoM.y * c, 0),
        erroHorizontalM: ref.erroHorizontalM(alvoPousoXM, estado.posicaoM),
        velocidadeHorizontalMps: ref.vetorParaLocal(estado.velocidadeMps, estado.posicaoM).x, velocidadeVerticalMps: ref.vetorParaLocal(estado.velocidadeMps, estado.posicaoM).y,
        orientacaoRad: ref.atitudeLocalRad(estado.orientacaoRad.z, estado.posicaoM), velocidadeAngularRadps: ref.taxaAtitudeLocalRadps(estado.velocidadeAngularRadps.z, estado.posicaoM, estado.velocidadeMps),
        massaKg: veiculo.massaInstantaneaDoConjuntoKg, empuxoN: propulsor.empuxoAtualN,
        densidadeArKgM3: mundo.obterCondicoesAtmosfericas(veiculo).densidadeArKgM3,
        velocidadeArMps: ref.vetorParaLocal(mundo.velocidadeDoArMps, estado.posicaoM),
        emModoPouso: modoBss04 === 'pouso' && jaDecolou,
        atuadoresConectados: [propulsor, ...aletasAerodinamicas].every((atuador) => conectados.includes(atuador)),
      };
    })
    : undefined;
  if (controladorGuiaPouso) {
    veiculo.registrarControlador(controladorGuiaPouso);
    controladorGuiaPouso.habilitar();
  }
  /** Registra decolagem por altitude radial acima de inicial+0,5 m; sem guiagem por alvo atualiza aletas usando atitude/taxa locais e velocidade radial relativa ao ar. Não aplica rotação diretamente. @contract f-42ae0febce41ba45 @reviewed M12-DOC: implementação lida. */
  const atualizarControleAletas = (): void => {
    const estado = veiculo.getEstadoFisico();
    if (ref.altitudeGeometricaM(estado.posicaoM) > alturaInicialM + 0.5) jaDecolou = true;
    if (!configuracao.incluirGuiaPousoPorAlvo) {
      controladorAletas?.atualizar(ref.atitudeLocalRad(estado.orientacaoRad.z, estado.posicaoM), ref.taxaAtitudeLocalRadps(estado.velocidadeAngularRadps.z, estado.posicaoM, estado.velocidadeMps), ref.vetorParaLocal(estado.velocidadeMps.subtrair(mundo.velocidadeDoArMps), estado.posicaoM).y);
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
      /** Exige duas sapatas com observação emApoio no solo selecionado e retém confirmação após primeira ocorrência; não prova apoio bilateral contínuo. @contract f-fb341cea057240b3 @reviewed M12-DOC: implementação lida. */
      obterContatoComSolo: () => {
        const sapatas = pernasFixas.filter((perna) => perna.id.includes('sapata'));
        const apoioBilateral = sapatas.length === 2 && sapatas.every((sapata) =>
          mundo.obterContatosDoObjeto(sapata, solo).some((contato) => contato.emApoio));
        contatoDePousoConfirmado ||= apoioBilateral;
        return contatoDePousoConfirmado;
      },
    } : {}),
  };
  /** Devolve `obterTelemetriaMissaoBss(mundo, veiculo, propulsor, [tanqueCombustivel, tanqueOxidante])`. Dependências diretas: `obterTelemetriaMissaoBss`. Efeitos indiretos seguem as dependências chamadas. @contract f-918543f1d71adc01 */
  const obterDadosMissao = () => obterTelemetriaMissaoBss(mundo, veiculo, propulsor, [tanqueCombustivel, tanqueOxidante]);
  /** Registra modo e habilita Fuzzy-PID no pouso; ao voltar à decolagem desabilita Fuzzy-PID e solicita throttle zero, sem ignição automática. @contract f-ab7b56e553ea101b @reviewed M12-DOC: implementação lida. */
  const ativarModo = (modo: 'decolagem' | 'pouso'): void => {
    modoBss04 = modo;
    if (modo === 'pouso') veiculo.habilitarControleDeDescidaFuzzyPid(configuracaoPousoBss04, [propulsor.id]);
    else { veiculo.desabilitarControleDeDescidaFuzzyPid(); veiculo.definirThrottleDoPropulsor(propulsor.id, 0); }
  };
  /** Aceita alvo finito em m somente antes da decolagem observada e abaixo do limiar inicial+0,5 m; registra alvo ou retorna false. @contract f-f67c4a96b3d7ea5e @reviewed M12-DOC: implementação lida. */
  const selecionarAlvo = (xM: number): boolean => {
    if (!Number.isFinite(xM) || jaDecolou || ref.altitudeGeometricaM(veiculo.getEstadoFisico().posicaoM) > alturaInicialM + 0.5) return false;
    alvoPousoXM = xM; return true;
  };
  return { veiculo, propulsor, tanqueCombustivel, tanqueOxidante, bateria, painel, pernasFixas, aletasAerodinamicas,
    linhaCombustivel, linhaOxidante, fixadores, cilindroPainel, hastePainel, guiaPainel, fixadorPainelHaste,
    controladorAletas, controladorGuiaPouso, atualizarControleAletas, atualizarControlePainel,
    alturaInicialM, pesoAtualN, obterDadosMissao, ativarModo, selecionarAlvo,
    /** Devolve `modoBss04`. Efeitos indiretos seguem as dependências chamadas. @contract f-8f01637e749d5ead */
    obterModo: () => modoBss04, /** Devolve `alvoPousoXM`. Efeitos indiretos seguem as dependências chamadas. @contract f-89da056e4336bb78 */
                                obterAlvo: () => alvoPousoXM, /** Devolve `jaDecolou`. Efeitos indiretos seguem as dependências chamadas. @contract f-a1df9c4915553b9f */
                                                              obterJaDecolou: () => jaDecolou,
    /** Devolve `comandoPainel`. Efeitos indiretos seguem as dependências chamadas. @contract f-25edd5deba3c2b21 */
    obterComandoPainel: () => comandoPainel,
    /** Registra pedido de avanço/recuo/parada e reavalia entradas do cilindro; deslocamento depende de força/energia reais. @contract f-def29dca4b27c7ee @reviewed M12-DOC: implementação lida. */
    comandarPainel: (comando: 'avancar' | 'recuar') => { comandoPainel = comando; atualizarControlePainel(); },
    objetos: [veiculo, ...veiculo.modulosFisicos, ...(configuracao.incluirPainelSolar && configuracao.painelMovel && hastePainel ? [hastePainel, painel] : [])],
  };
}
export type MontagemBss = ReturnType<typeof montarVeiculoBss>;
