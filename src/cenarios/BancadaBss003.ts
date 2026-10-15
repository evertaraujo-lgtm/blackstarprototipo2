import { MundoFisico } from '../physics/MundoFisico';
import { Objeto } from '../physics/objetos/base/Objeto';
import { SuperficiePlano } from '../physics/SuperficiePlano';
import { SuperficieEsferica } from '../physics/SuperficieEsferica';
import { ReferencialEsferico } from '../physics/ambiente/ReferencialFisico';
import { Bss03 } from '../physics/objetos/veiculos/Bss03';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { Bateria } from '../physics/objetos/fontes-de-energia/Bateria';
import { PropulsorVetorizado } from '../physics/objetos/propulsao/PropulsorVetorizado';
import { FixadorEstrutural } from '../physics/conexoes/FixadorEstrutural';
import { Vetor3 } from '../physics/Vetor3';
import type { AmbienteBancadaBss } from './BancadaBss';

/** Montagem original de src/testes.ts; extraída para campanha M9-F sem alterar parâmetros.
 * @contract f-222b829569202826
 */
export const criarTesteBss003 = (configuracao: AmbienteBancadaBss = {}) => {
  const mundo = new MundoFisico(1 / 240, { ambiente: configuracao.ambienteFisico, densidadeAtmosfericaKgM3: configuracao.densidadeAtmosfericaKgM3 ?? 1.225, velocidadeArMps: configuracao.velocidadeArMps, rajadasVento: configuracao.rajadasVento });
  const ref = mundo.ambiente.referencial;
  const ancora = ref.posicaoPorArcoM(configuracao.arcoBaseM ?? 0, 0);
  /** Devolve `({ posicaoM: ref.localParaGlobal(p, ancora), orientacaoRad: new Vetor3(0, 0, ref.atitudeInercialRad(theta, ancora)) })`. Dependências diretas: `ref.localParaGlobal`, `Vetor3`, `ref.atitudeInercialRad`. Efeitos indiretos seguem as dependências chamadas. @contract f-5bab94d42b4fc0a5 */
  const estadoInicial = (p: Vetor3, theta = 0) => ({ posicaoM: ref.localParaGlobal(p, ancora), orientacaoRad: new Vetor3(0, 0, ref.atitudeInercialRad(theta, ancora)) });
  /** Dependências diretas: `estadoInicial`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-92a3f1dc54f50636 */
  const base = (id: string, massaBaseKg: number, dimensoesM: Vetor3, posicaoM: Vetor3) => ({
    id, massaBaseKg, dimensoesM, resistenciaColisaoJ: 2_000_000, dissipacaoImpacto: 0.35,
    limiteTermicoC: 1_000, estadoInicial: estadoInicial(posicaoM),
  });
  const idsDecolagem = ['bss03-motor-decolagem-e', 'bss03-motor-decolagem-d'] as const;
  const idsPouso = ['bss03-motor-pouso-e', 'bss03-motor-pouso-d'] as const;
  const altitudeDeApoioDoCascoM = 4;
  const controlePouso = {
    altitudeAlvoM: altitudeDeApoioDoCascoM,
    altitudeInicioFrenagemM: 40,
    velocidadeAproximacaoMps: 8,
    velocidadeMaximaToqueMps: 0.7,
    desaceleracaoPlanejadaMps2: 5,
    throttleSustentacao: 0.6,
    ganhoThrottlePorErroVelocidade: 0.1,
    taxaMaximaThrottlePorS: 2,
    ganhoGimbalVelocidadeHorizontalRadPorMps: 0,
    limiteGimbalRad: 3 * Math.PI / 180,
    usarGatilhoAltitude: true,
    controlarGimbal: false,
  };
  const controleDesaceleracao = {
    velocidadeInicioMps: 10,
    velocidadeVerticalAlvoMps: -7,
    altitudeMinimaM: 40,
    throttleSustentacao: 0.6,
    ganhoProporcional: 0.12,
    ganhoIntegral: 0.02,
    ganhoDerivativo: 0.01,
    taxaMaximaThrottlePorS: 2,
  };
  const nave = new Bss03({
    ...base('bss-003', 900, new Vetor3(5, 5.6, 3), new Vetor3(0, altitudeDeApoioDoCascoM, 0)),
    areaFrontalM2: 14, coeficienteArrasto: 0.72,
    idsPropulsoresDecolagem: idsDecolagem,
    idsPropulsoresPouso: idsPouso,
    controlePouso,
    controleDesaceleracao,
  });
  const tanqueDecolagem = new TanquePropelente({
    ...base('bss03-tanque-decolagem', 120, new Vetor3(2.6, 1.2, 1.5), new Vetor3(0, 5.2, 0)),
    tipoPropelente: 'metano', capacidadePropelenteKg: 250, massaPropelenteInicialKg: 250,
  });
  const tanquePouso = new TanquePropelente({
    ...base('bss03-tanque-pouso', 120, new Vetor3(2.6, 1.2, 1.5), new Vetor3(0, 3.8, 0)),
    tipoPropelente: 'metano', capacidadePropelenteKg: 500, massaPropelenteInicialKg: 500,
  });
  const bateria = new Bateria({
    ...base('bss03-bateria', 60, new Vetor3(1.2, 0.6, 1), new Vetor3(0, 2.6, 0)),
    tensaoNominalV: 28, capacidadeEnergiaJ: 500_000, energiaInicialJ: 500_000,
  });
  /** Devolve `motor`. Dependências diretas: `PropulsorVetorizado`, `base`, `Vetor3`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-6d1a598a90fa3d6e */
  const criarMotor = (id: string, xM: number, tanque: TanquePropelente): PropulsorVetorizado => {
    const motor = new PropulsorVetorizado({
      ...base(id, 70, new Vetor3(0.8, 1, 1), new Vetor3(xM, 0.8, 0)),
      estadoInicial: estadoInicial(new Vetor3(xM, 0.8, 0), Math.PI / 2),
      tensaoAlimentacaoNominalV: 28, potenciaEletricaMaximaW: 1_500,
      empuxoMaximoN: 20_000, vazaoMaximaKgS: 0.5, potenciaTermicaMaximaW: 5_000_000, propelenteCompativel: 'metano',
      vetorizacao: { limiteAngularRad: 15 * Math.PI / 180, velocidadeAngularMaximaRadps: 45 * Math.PI / 180 },
    });
    motor.conectarTanque(tanque, 8);
    motor.conectarBateria(bateria, 8);
    return motor;
  };
  const motoresDecolagem = [
    criarMotor(idsDecolagem[0], -1.35, tanqueDecolagem),
    criarMotor(idsDecolagem[1], 1.35, tanqueDecolagem),
  ];
  const motoresPouso = [
    criarMotor(idsPouso[0], -0.45, tanquePouso),
    criarMotor(idsPouso[1], 0.45, tanquePouso),
  ];
  const tremDePouso = [
    new Objeto({ ...base('bss03-trem-esquerdo', 70, new Vetor3(0.5, 1.8, 1.2), new Vetor3(-2.8, 1.1, 0)), coeficienteAtrito: 0.9 }),
    new Objeto({ ...base('bss03-trem-direito', 70, new Vetor3(0.5, 1.8, 1.2), new Vetor3(2.8, 1.1, 0)), coeficienteAtrito: 0.9 }),
    new Objeto({ ...base('bss03-sapata-esquerda', 40, new Vetor3(1.8, 0.4, 1.8), new Vetor3(-2.8, 0.2, 0)), coeficienteAtrito: 0.95 }),
    new Objeto({ ...base('bss03-sapata-direita', 40, new Vetor3(1.8, 0.4, 1.8), new Vetor3(2.8, 0.2, 0)), coeficienteAtrito: 0.95 }),
  ];
  const modulos: Objeto[] = [tanqueDecolagem, tanquePouso, bateria, ...tremDePouso, ...motoresDecolagem, ...motoresPouso];
  for (const modulo of modulos) nave.adicionarModulo(modulo);
  for (const motor of [...motoresDecolagem, ...motoresPouso]) nave.instalarPropulsor(motor);
  // Estabilidade de subida é uma capacidade permanente, não uma sequência de
  // missão: fica armada antes da ignição, com todos os atuadores em repouso.
  nave.ativarControleDeInclinacao();
  const fixadores = modulos.map((modulo) => new FixadorEstrutural({
    id: `fixador-bss03-${modulo.id}`, objetoA: nave, objetoB: modulo,
    resistenciaTracaoN: 500_000, resistenciaCompressaoN: 500_000,
    /** Devolve `[...motoresDecolagem, ...motoresPouso].reduce((soma, motor) => soma + motor.empuxoAtualN, 0)`. Dependências diretas: `[...motoresDecolagem, ...motoresPouso].reduce`. Efeitos indiretos seguem as dependências chamadas. @contract f-db5f42d2a38ecc99 */
    obterEsforcoSolicitadoN: () => [...motoresDecolagem, ...motoresPouso].reduce((soma, motor) => soma + motor.empuxoAtualN, 0),
  }));
  for (const fixador of fixadores) nave.adicionarFixador(fixador);
  const solo = ref instanceof ReferencialEsferico ? new SuperficieEsferica('solo-bss03', ref.centroM, ref.raioM, 5_000_000, 0.3, 0.9) : new SuperficiePlano('solo-bss03', 'concreto', 0, 5_000_000, 0.3, 0.9);
  mundo.registrarSuperficie(solo);
  nave.registrarNoMundo(mundo);

  const objetos = [nave, ...nave.modulosFisicos];
  const gruposPropulsao = [
    { id: 'decolagem', nome: 'Motores de decolagem · tanque dedicado', propulsores: motoresDecolagem },
    { id: 'pouso', nome: 'Motores de pouso · tanque reservado', propulsores: motoresPouso },
  ] as const;
  let grupoAtivoId: 'decolagem' | 'pouso' = 'decolagem';
  /** Devolve `gruposPropulsao.find((grupo) => grupo.id === grupoAtivoId)!`. Dependências diretas: `gruposPropulsao.find`. Efeitos indiretos seguem as dependências chamadas. @contract f-9725613c9e53b521 */
  const grupoAtivo = () => gruposPropulsao.find((grupo) => grupo.id === grupoAtivoId)!;
  /** Devolve `Math.min(...objetos.map((objeto) => objeto.integridadeEstrutural))`. Dependências diretas: `objetos.map`. Efeitos indiretos seguem as dependências chamadas. @contract f-69769a4dab75862e */
  const integridadeMinima = (): number => Math.min(...objetos.map((objeto) => objeto.integridadeEstrutural));
  return {
    nome: 'BSS-003 — decolagem e pouso sob comando manual',
    /** Devolve `({ id: 'bss-003', arcoBaseM: configuracao.arcoBaseM ?? 0, modeloFisico: mundo.obterConfiguracaoFisica() })`. Dependências diretas: `mundo.obterConfiguracaoFisica`. Efeitos indiretos seguem as dependências chamadas. @contract f-063f3568b8e35d51 */
    obterConfiguracaoEnsaio: () => ({ id: 'bss-003', arcoBaseM: configuracao.arcoBaseM ?? 0, modeloFisico: mundo.obterConfiguracaoFisica() }),
    descricao: 'Não há sequência automática por altitude ou tempo. Decole manualmente com o par de decolagem. Ao marcar Modo de pouso, o comando explícito do operador prepara e ignita o par de pouso; somente se ambos estiverem prontos ele corta a decolagem e arma três controles: PID de verticalização no gimbal, PID de desaceleração em queda rápida e PID de pouso na faixa final. Ao desmarcar, corta o par de pouso e retorna ao PID de inclinação. Os quatro motores ficam completamente abaixo e fora do casco. Tanques centralizados e trem de pouso externo com sapatas separadas por 5,6 m mantêm massa e apoio simétricos.',
    mundo, objetos, superficies: [solo], velocidadeTempo: 3, limiteVerticalM: 55, limiteHorizontalM: 14,
    seguirObjeto: nave, /** Devolve `nave.getEstadoFisico().posicaoM.y`. Dependências diretas: `nave.getEstadoFisico`. Efeitos indiretos seguem as dependências chamadas. @contract f-47181300f92b310b */
                        cameraY: () => nave.getEstadoFisico().posicaoM.y,
    conexoesEletricas: [...motoresDecolagem, ...motoresPouso].flatMap((motor) => motor.conexaoEletrica ? [motor.conexaoEletrica] : []),
    fixadores, exibirNaBancada: true, gruposPropulsao,
    /** Devolve `grupoAtivo().propulsores[0]`. Dependências diretas: `grupoAtivo`. Efeitos indiretos seguem as dependências chamadas. @contract f-21e45131cdd3776c */
    get propulsorControlavel() { return grupoAtivo().propulsores[0]; },
    /** Devolve `grupoAtivo().propulsores[0]`. Dependências diretas: `grupoAtivo`. Efeitos indiretos seguem as dependências chamadas. @contract f-f3fb1c816516727e */
    get propulsorVetorizadoControlavel() { return grupoAtivo().propulsores[0]; },
    /** Devolve `grupoAtivoId`. Efeitos indiretos seguem as dependências chamadas. @contract f-b82e0b216aba750c */
    obterGrupoPropulsaoAtivo: () => grupoAtivoId,
    /** REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-226c23f267ef239d */
    selecionarGrupoPropulsao: (id: string) => { if (id === 'decolagem' || id === 'pouso') grupoAtivoId = id; },
    /** Dependências diretas: `nave.retornarAoControleDeInclinacao`, `nave.acionarModoDePouso`, `resultados.every`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-92746b577e7f712d */
    ativarControleBss03: (controle: 'inclinacao' | 'pouso' | 'manual') => {
      if (controle === 'inclinacao') nave.retornarAoControleDeInclinacao();
      else if (controle === 'pouso') {
        const resultados = nave.acionarModoDePouso();
        if (resultados.every((resultado) => resultado.aceito)) grupoAtivoId = 'pouso';
      }
      else nave.desativarControlesAutomaticos();
    },
    /** Devolve `nave.controleAtivoBss03`. Efeitos indiretos seguem as dependências chamadas. @contract f-2d8f573a41da9083 */
    obterControleAtivoBss03: () => nave.controleAtivoBss03,
    permiteAjustarThrottle: true,
    /** Devolve `false`. Efeitos indiretos seguem as dependências chamadas. @contract f-adc2cc705824c723 */
    deveEncerrar: () => false,
    /** Dependências diretas: `integridadeMinima`, `(integridadeMinima() * 100).toFixed`, `tanquePouso.massaPropelenteKg.toFixed`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-21067880911bf1d1 */
    validar: () => `${integridadeMinima() >= 0.999 ? 'ÍNTEGRO' : 'DANIFICADO'} · controle ${nave.controleAtivoBss03}; integridade mínima ${(integridadeMinima() * 100).toFixed(1)}%; reserva de pouso ${tanquePouso.massaPropelenteKg.toFixed(1)} kg`,
    /** Dependências diretas: `nave.obterLeiturasDosSensores`, `l.altitudeM.toFixed`, `l.velocidadeVerticalMps.toFixed`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-467615ffe4325938 */
    telemetria: () => { const l = nave.obterLeiturasDosSensores(); return `grupo ${grupoAtivoId} · controle ${nave.controleAtivoBss03} · altitude ${l.altitudeM.toFixed(1)} m · vy=${l.velocidadeVerticalMps.toFixed(2)} m/s · inclinação ${(l.inclinacaoRad * 180 / Math.PI).toFixed(1)}°`; },
    /** Dependências diretas: `nave.obterLeiturasDosSensores`, `nave.obterUltimoComandoDePouso`, `grupoAtivo`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-a2964316aee1051a */
    dados: () => { const l = nave.obterLeiturasDosSensores(); const comando = nave.obterUltimoComandoDePouso(); return `Sequência automática: inexistente\nGrupo selecionado: ${grupoAtivo().nome}\nControlador selecionado: ${nave.controleAtivoBss03}\nAltitude atual: ${l.altitudeM.toFixed(2)} m\nVelocidade vertical: ${l.velocidadeVerticalMps.toFixed(2)} m/s\nVelocidade horizontal: ${l.velocidadeHorizontalMps.toFixed(2)} m/s\nTanque de decolagem: ${tanqueDecolagem.massaPropelenteKg.toFixed(1)} kg\nTanque reservado ao pouso: ${tanquePouso.massaPropelenteKg.toFixed(1)} kg\nThrottle calculado no pouso: ${((comando?.throttle ?? 0) * 100).toFixed(1)}%\nGimbal calculado no pouso: ${((comando?.anguloGimbalRad ?? 0) * 180 / Math.PI).toFixed(2)}°\nMotores: quatro unidades externas sob o casco\nTrem de pouso: sapatas externas a ±2,8 m\nIntegridade mínima: ${(integridadeMinima() * 100).toFixed(1)}%`; },
  };
};

