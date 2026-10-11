import { criarTesteBss005 } from './BancadaBss';
import type { Objeto } from '../physics/objetos/base/Objeto';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { MundoFisico } from '../physics/MundoFisico';
import { TOLERANCIA_CONTATO_SUPERFICIE_M } from '../physics/solucionadores/ResolvedorContatoSuperficie';
import { Vetor3 } from '../physics/Vetor3';

type CenarioBss005 = ReturnType<typeof criarTesteBss005>;
export type FalhaEnsaioBss005 = 'nenhuma' | 'sem-reserva-no-corte' | 'perda-controle-no-corte' | 'sem-combustivel-inicial';
export type FaseEnsaioBss005 = 'solo' | 'decolagem' | 'subida' | 'corte' | 'descida' | 'frenagem' | 'contato' | 'repouso' | 'falha-pouso';
export interface ConfiguracaoEnsaioBss005 {
  readonly altitudeTrocaParaPousoM?: number;
  readonly throttleDecolagem?: number;
  readonly falha?: FalhaEnsaioBss005;
  readonly dtS?: number;
  readonly limiteEnsaioS?: number;
  readonly intervaloAmostraS?: number;
  readonly registrarAmostras?: boolean;
}

/** Critérios de qualificação, sem intervenção na resposta de contato do core. */
export const CRITERIOS_POUSO_BSS005 = {
  velocidadeVerticalToqueMaxMps: 0.7,
  velocidadeHorizontalToqueMaxMps: 0.5,
  inclinacaoMaxRad: 0.01,
  velocidadeAngularMaxRadps: 0.01,
  velocidadeRepousoCascoMaxMps: 0.05,
  velocidadeRepousoComponentesMaxMps: 0.1,
  toleranciaVelocidadeNormalContatoMps: MundoFisico.velocidadeDeRepousoMps,
  toleranciaContatoCoreM: TOLERANCIA_CONTATO_SUPERFICIE_M,
  limiteContatoUnilateralS: 0.5,
  duracaoRepousoS: 3,
} as const;

export interface LeituraMissaoBss005 {
  readonly tempoS: number;
  readonly fase: FaseEnsaioBss005;
  readonly altitudeM: number;
  readonly posicaoXM: number;
  readonly velocidadeXMps: number;
  readonly velocidadeYMps: number;
  readonly orientacaoRad: number;
  readonly velocidadeAngularRadps: number;
  readonly massaConectadaKg: number;
  readonly massaTotalObjetosKg: number;
  readonly metanoKg: number;
  readonly oxidanteKg: number;
  readonly empuxoN: number;
  readonly motorConectadoAoCasco: boolean;
  readonly empuxoPeso: number;
  readonly empuxoPesoMaximo: number;
  readonly vazaoTotalKgS: number;
  readonly throttle: number;
  readonly gimbalRad: number;
  readonly gimbalAlvoRad: number;
  readonly densidadeArKgM3: number;
  readonly pressaoDinamicaPa: number;
  readonly arrastoN: { readonly x: number; readonly y: number };
  readonly energiaEletricaJ: number;
  readonly sistemas: Readonly<Record<'elétrico' | 'hidráulico' | 'combustível' | 'controle', boolean>>;
  readonly ignitado: boolean;
  readonly diagnosticoMotor: readonly string[];
  readonly faseControlador: string;
  readonly integridadeMinima: number;
  readonly fixadoresRompidos: readonly string[];
  readonly contatosFisicos: readonly { readonly objetoId: string; readonly superficieId: string; readonly emApoio: boolean;
    readonly penetracaoM: number; readonly velocidadeNormalAntesMps: number; readonly velocidadeNormalDepoisMps: number;
    readonly energiaImpactoJ: number }[];
  readonly objetos: readonly { readonly id: string; readonly massaKg: number; readonly integridade: number; readonly temperaturaC: number;
    readonly velocidadeXMps: number; readonly velocidadeYMps: number; readonly velocidadeAngularRadps: number; readonly menorAlturaGeometriaM: number }[];
  readonly contatos: readonly string[];
  readonly sapatasApoiadas: readonly string[];
  readonly menorAlturaGeometriaM: number;
  readonly velocidadeMaximaComponentesMps: number;
  readonly velocidadeAngularMaximaComponentesRadps: number;
}

/** Limites do veículo no instante anterior à resposta do core ao primeiro contato. */
export function atendeLimitesDeToqueBss005(leitura: Pick<LeituraMissaoBss005,
  'velocidadeXMps' | 'velocidadeYMps' | 'orientacaoRad' | 'velocidadeAngularRadps'>): boolean {
  return Math.abs(leitura.velocidadeYMps) < CRITERIOS_POUSO_BSS005.velocidadeVerticalToqueMaxMps
    && Math.abs(leitura.velocidadeXMps) < CRITERIOS_POUSO_BSS005.velocidadeHorizontalToqueMaxMps
    && Math.abs(leitura.orientacaoRad) < CRITERIOS_POUSO_BSS005.inclinacaoMaxRad
    && Math.abs(leitura.velocidadeAngularRadps) < CRITERIOS_POUSO_BSS005.velocidadeAngularMaxRadps;
}

export const menorAlturaDoObjetoM = (objeto: Objeto): number => {
  const e = objeto.getEstadoFisico();
  return Math.min(...objeto.getPontosDeContatoLocaisM().map((ponto) => e.posicaoM.y
    + ponto.x * Math.sin(e.orientacaoRad.z) + ponto.y * Math.cos(e.orientacaoRad.z)));
};

/** Observação somente por consultas públicas; pressão dinâmica é grandeza derivada, em Pa. */
export function lerMissaoBss005(cenario: CenarioBss005, fase: FaseEnsaioBss005): LeituraMissaoBss005 {
  const casco = cenario.seguirObjeto;
  const motor = cenario.propulsorControlavel;
  const e = casco.getEstadoFisico();
  const ambiente = cenario.mundo.obterCondicoesAtmosfericas(casco);
  const relativo = e.velocidadeMps.subtrair(ambiente.velocidadeArMps);
  const massa = casco.massaInstantaneaDoConjuntoKg;
  const motorConectadoAoCasco = casco.obterObjetosFisicosConectados().includes(motor);
  const gravidade = Math.abs(MundoFisico.gravidadeTerrestreMps2.y);
  const arrasto = cenario.objetos.reduce((soma, objeto) => soma.adicionar(cenario.mundo.obterForcaArrastoAtmosferico(objeto)), Vetor3.zero);
  const solo = cenario.superficies[0]!;
  const soloM = solo.alturaM;
  const altura = (objeto: Objeto) => menorAlturaDoObjetoM(objeto) - soloM;
  const tanques = cenario.objetos.filter((objeto): objeto is TanquePropelente => objeto instanceof TanquePropelente);
  const kg = (tipo: string) => tanques.filter((tanque) => tanque.tipoPropelente === tipo).reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0);
  const gimbal = motor.obterEstadoDaVetorizacao();
  return {
    tempoS: cenario.mundo.tempoS, fase, altitudeM: e.posicaoM.y, posicaoXM: e.posicaoM.x,
    velocidadeXMps: e.velocidadeMps.x, velocidadeYMps: e.velocidadeMps.y,
    orientacaoRad: Math.atan2(Math.sin(e.orientacaoRad.z), Math.cos(e.orientacaoRad.z)),
    velocidadeAngularRadps: e.velocidadeAngularRadps.z,
    massaConectadaKg: massa, massaTotalObjetosKg: cenario.objetos.reduce((soma, objeto) => soma + objeto.massaKg, 0),
    metanoKg: kg('metano'), oxidanteKg: kg('oxigenio'), empuxoN: motor.empuxoAtualN, motorConectadoAoCasco,
    empuxoPeso: motorConectadoAoCasco ? motor.empuxoAtualN / (massa * gravidade) : 0,
    empuxoPesoMaximo: motorConectadoAoCasco ? motor.empuxoMaximoN * motor.integridadeEstrutural / (massa * gravidade) : 0,
    vazaoTotalKgS: motor.vazaoAtualKgS, throttle: motor.throttleAtual,
    gimbalRad: gimbal.anguloAtualRad, gimbalAlvoRad: gimbal.anguloAlvoRad,
    densidadeArKgM3: ambiente.densidadeArKgM3, pressaoDinamicaPa: 0.5 * ambiente.densidadeArKgM3 * relativo.magnitude ** 2,
    arrastoN: { x: arrasto.x, y: arrasto.y }, energiaEletricaJ: motor.bateriaConectada!.energiaArmazenadaJ,
    sistemas: { 'elétrico': motor.sistemaEstaOperacional('elétrico'), 'hidráulico': motor.sistemaEstaOperacional('hidráulico'),
      'combustível': motor.sistemaEstaOperacional('combustível'), 'controle': motor.sistemaEstaOperacional('controle') },
    ignitado: motor.estaIgnitado, diagnosticoMotor: [...motor.diagnosticoOperacional],
    faseControlador: casco.obterUltimoComandoDeDescidaFuzzyPid().fase,
    integridadeMinima: Math.min(...cenario.objetos.map((objeto) => objeto.integridadeEstrutural)),
    fixadoresRompidos: cenario.fixadores.filter((fixador) => fixador.estaRompido).map((fixador) => fixador.id),
    objetos: cenario.objetos.map((objeto) => {
      const estado = objeto.getEstadoFisico();
      return { id: objeto.id, massaKg: objeto.massaKg, integridade: objeto.integridadeEstrutural, temperaturaC: objeto.temperaturaC,
        velocidadeXMps: estado.velocidadeMps.x, velocidadeYMps: estado.velocidadeMps.y,
        velocidadeAngularRadps: estado.velocidadeAngularRadps.z, menorAlturaGeometriaM: altura(objeto) };
    }),
    contatos: cenario.mundo.obterContatosComSuperficie().filter((contato) => contato.superficieId === solo.id
      && contato.penetracaoM >= 0 && (contato.emApoio || contato.velocidadeNormalAntesMps < 0)).map((contato) => contato.objetoId),
    sapatasApoiadas: cenario.objetos.filter((objeto) => objeto.id.includes('sapata')
      && cenario.mundo.obterContatosDoObjeto(objeto, solo).some((contato) => contato.emApoio)).map((objeto) => objeto.id),
    contatosFisicos: cenario.mundo.obterContatosComSuperficie().filter((contato) => contato.superficieId === solo.id).map((contato) => ({
      objetoId: contato.objetoId, superficieId: contato.superficieId, emApoio: contato.emApoio,
      penetracaoM: contato.penetracaoM,
      velocidadeNormalAntesMps: contato.velocidadeNormalAntesMps, velocidadeNormalDepoisMps: contato.velocidadeNormalDepoisMps,
      energiaImpactoJ: contato.energiaImpactoJ,
    })),
    menorAlturaGeometriaM: Math.min(...cenario.objetos.map(altura)),
    velocidadeMaximaComponentesMps: Math.max(...cenario.objetos.map((objeto) => objeto.getEstadoFisico().velocidadeMps.magnitude)),
    velocidadeAngularMaximaComponentesRadps: Math.max(...cenario.objetos.map((objeto) => objeto.getEstadoFisico().velocidadeAngularRadps.magnitude)),
  };
}

/**
 * Script de bancada: somente partida pública e troca de modo, sem piloto novo.
 * Cede a cada 2400 passos para o executor poder processar mensagens externas;
 * a pausa não usa relógio real nem modifica dt, comandos ou estados físicos.
 */
export function* avancarEnsaioMissaoBss005(configuracao: ConfiguracaoEnsaioBss005 = {}) {
  const config = {
    altitudeTrocaParaPousoM: configuracao.altitudeTrocaParaPousoM ?? 15000,
    throttleDecolagem: configuracao.throttleDecolagem ?? 1,
    falha: configuracao.falha ?? 'nenhuma', dtS: configuracao.dtS ?? 1 / 240,
    limiteEnsaioS: configuracao.limiteEnsaioS ?? 350,
    intervaloAmostraS: configuracao.intervaloAmostraS ?? 5,
    registrarAmostras: configuracao.registrarAmostras ?? true,
  };
  if (!Number.isFinite(config.altitudeTrocaParaPousoM) || config.altitudeTrocaParaPousoM <= 4.8
    || !Number.isFinite(config.throttleDecolagem) || config.throttleDecolagem <= 0 || config.throttleDecolagem > 1
    || !Number.isFinite(config.dtS) || config.dtS <= 0 || config.dtS > 1 / 240
    || !Number.isFinite(config.limiteEnsaioS) || config.limiteEnsaioS <= 0
    || !Number.isFinite(config.intervaloAmostraS) || config.intervaloAmostraS <= 0
    || !['nenhuma', 'sem-reserva-no-corte', 'perda-controle-no-corte', 'sem-combustivel-inicial'].includes(config.falha)) throw new Error('Configuração de ensaio BSS-005 inválida.');
  const cenario = criarTesteBss005();
  const motor = cenario.propulsorControlavel;
  const tanques = cenario.objetos.filter((objeto): objeto is TanquePropelente => objeto instanceof TanquePropelente);
  let fase: FaseEnsaioBss005 = 'solo';
  const ler = () => lerMissaoBss005(cenario, fase);
  const inicial = ler();
  const amostras: LeituraMissaoBss005[] = config.registrarAmostras ? [inicial] : [];
  const eventos: { tipo: string; leitura: LeituraMissaoBss005 }[] = [];
  const comandos: { tempoS: number; operacao: string; aceito: boolean; valor?: string | number }[] = [];
  const evento = (tipo: string) => eventos.push({ tipo, leitura: ler() });
  let massaRetiradaNaFalhaKg = 0;
  const retirarReserva = () => {
    for (const tanque of tanques) massaRetiradaNaFalhaKg += tanque.fornecerPropelente(tanque.massaPropelenteKg);
  };
  if (config.falha === 'sem-combustivel-inicial') { retirarReserva(); evento('falha-sem-combustivel-inicial'); }
  for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) {
    comandos.push({ tempoS: 0, operacao: 'ligar-sistema', valor: sistema, aceito: motor.ligarSistema(sistema) });
  }
  motor.definirThrottle(config.throttleDecolagem);
  comandos.push({ tempoS: 0, operacao: 'throttle', valor: config.throttleDecolagem, aceito: true });
  const partidaAceita = motor.solicitarIgnicao();
  comandos.push({ tempoS: 0, operacao: 'ignicao', aceito: partidaAceita });
  evento('partida');
  let decolou = false, modoPousoSelecionado = false, cortou = false, desceu = false, iniciouFrenagem = false;
  let esgotou = false, danificou = false, perdeuControle = false;
  let toque: { antes: LeituraMissaoBss005; depois: LeituraMissaoBss005 } | undefined;
  let pousoSeguro = false, falhouPouso = false, contatoUnilateralS = 0, tempoAposPrimeiroContatoS = 0;
  let apogeu = inicial, repousoContinuoS = 0, consumoMotorKg = 0, maxPressaoDinamicaPa = 0;
  let maiorPenetracaoContatoM = 0, objetoComMaiorPenetracaoId: string | undefined;
  let erroBalancoMaxKg = 0, proximaAmostraS = config.intervaloAmostraS;
  let ultimoEstado = ler();
  const numeroPassos = Math.ceil(config.limiteEnsaioS / config.dtS);
  for (let passo = 0; passo < numeroPassos; passo++) {
    let antes = ultimoEstado;
    if (!modoPousoSelecionado && antes.altitudeM >= config.altitudeTrocaParaPousoM && antes.velocidadeYMps > 0) {
      cenario.ativarModoBss04!('pouso');
      comandos.push({ tempoS: antes.tempoS, operacao: 'modo', valor: 'pouso', aceito: true });
      modoPousoSelecionado = true;
      evento('troca-para-pouso');
      if (config.falha === 'sem-reserva-no-corte') { retirarReserva(); evento('falha-sem-reserva'); }
      if (config.falha === 'perda-controle-no-corte') {
        motor.desligarSistema('controle');
        perdeuControle = true;
        comandos.push({ tempoS: antes.tempoS, operacao: 'desligar-sistema', valor: 'controle', aceito: true });
        evento('falha-perda-controle');
      }
      // A retirada deliberada de reserva é contabilizada separadamente, nunca como consumo do motor.
      antes = ler();
    }
    cenario.atualizarControle?.();
    cenario.mundo.avancar(config.dtS);
    let depois = ler();
    for (const contato of depois.contatosFisicos) {
      if (contato.penetracaoM > maiorPenetracaoContatoM) {
        maiorPenetracaoContatoM = contato.penetracaoM;
        objetoComMaiorPenetracaoId = contato.objetoId;
      }
    }
    consumoMotorKg += motor.vazaoAtualKgS * config.dtS;
    erroBalancoMaxKg = Math.max(erroBalancoMaxKg,
      Math.abs(inicial.massaTotalObjetosKg - depois.massaTotalObjetosKg - consumoMotorKg - massaRetiradaNaFalhaKg));
    maxPressaoDinamicaPa = Math.max(maxPressaoDinamicaPa, depois.pressaoDinamicaPa);
    if (depois.altitudeM > apogeu.altitudeM) apogeu = depois;
    if (!decolou && depois.altitudeM > inicial.altitudeM + 0.5) { decolou = true; fase = 'decolagem'; evento('decolagem'); }
    else if (decolou && !modoPousoSelecionado) fase = 'subida';
    if (modoPousoSelecionado && !cortou && depois.empuxoN === 0) { cortou = true; fase = 'corte'; evento('corte'); }
    if (decolou && !desceu && antes.velocidadeYMps >= 0 && depois.velocidadeYMps < 0) {
      desceu = true; fase = 'descida'; evento('apogeu'); evento('descida');
    }
    if (desceu && !toque) fase = depois.empuxoN > 0 ? 'frenagem' : 'descida';
    if (desceu && !iniciouFrenagem && depois.empuxoN > 0) { iniciouFrenagem = true; fase = 'frenagem'; evento('inicio-da-frenagem'); }
    if (!esgotou && partidaAceita && (depois.metanoKg === 0 || depois.oxidanteKg === 0)) { esgotou = true; evento('esgotamento-propelente'); }
    if (desceu && !toque && depois.contatos.length > 0) {
      fase = 'contato'; toque = { antes, depois: ler() }; evento('primeiro-contato');
      const velocidadesSeguras = atendeLimitesDeToqueBss005(antes);
      if (!velocidadesSeguras || depois.integridadeMinima < 1 || depois.fixadoresRompidos.length > 0) {
        falhouPouso = true; fase = 'falha-pouso'; evento('pouso-falhou');
      }
    }
    if (toque && !pousoSeguro && !falhouPouso) {
      tempoAposPrimeiroContatoS += config.dtS;
      const apoiadas = depois.sapatasApoiadas.length === 2;
      contatoUnilateralS = apoiadas ? 0 : contatoUnilateralS + config.dtS;
      const atitudeEstavel = Math.abs(depois.orientacaoRad) < CRITERIOS_POUSO_BSS005.inclinacaoMaxRad
        && depois.velocidadeAngularMaximaComponentesRadps < CRITERIOS_POUSO_BSS005.velocidadeAngularMaxRadps;
      if (depois.integridadeMinima < 1 || depois.fixadoresRompidos.length > 0
        || tempoAposPrimeiroContatoS > CRITERIOS_POUSO_BSS005.limiteContatoUnilateralS && (!apoiadas || !atitudeEstavel)) {
        falhouPouso = true; fase = 'falha-pouso'; evento('pouso-falhou');
      } else if (apoiadas && atitudeEstavel) {
        pousoSeguro = true; evento('toque-seguro');
      }
    }
    if (toque && pousoSeguro && !falhouPouso) {
      const apoiadas = depois.sapatasApoiadas.length === 2;
      contatoUnilateralS = apoiadas ? 0 : contatoUnilateralS + config.dtS;
      if (!atendeLimitesDeToqueBss005(depois) || depois.integridadeMinima < 1
        || depois.fixadoresRompidos.length > 0
        || contatoUnilateralS > CRITERIOS_POUSO_BSS005.limiteContatoUnilateralS) {
        falhouPouso = true; fase = 'falha-pouso'; evento('pouso-falhou');
      }
    }
    if (!danificou && depois.integridadeMinima < 1) { danificou = true; evento('dano-estrutural'); }
    depois = { ...depois, fase };
    const repousou = ((toque !== undefined && pousoSeguro) || !partidaAceita) && depois.empuxoN === 0
      && Math.hypot(depois.velocidadeXMps, depois.velocidadeYMps) <= CRITERIOS_POUSO_BSS005.velocidadeRepousoCascoMaxMps
      && depois.velocidadeMaximaComponentesMps <= CRITERIOS_POUSO_BSS005.velocidadeRepousoComponentesMaxMps
      && depois.velocidadeAngularMaximaComponentesRadps <= CRITERIOS_POUSO_BSS005.velocidadeAngularMaxRadps
      && (!toque || depois.sapatasApoiadas.length === 2);
    repousoContinuoS = repousou ? repousoContinuoS + config.dtS : 0;
    ultimoEstado = depois;
    if (config.registrarAmostras && depois.tempoS >= proximaAmostraS) { amostras.push(depois); proximaAmostraS += config.intervaloAmostraS; }
    if (repousoContinuoS >= CRITERIOS_POUSO_BSS005.duracaoRepousoS) { fase = 'repouso'; evento('repouso-estavel'); ultimoEstado = ler(); break; }
    if ((passo + 1) % 2400 === 0) yield;
  }
  if (config.registrarAmostras) amostras.push(ultimoEstado);
  const motivos: string[] = [];
  if (!partidaAceita) motivos.push('ignicao-negada');
  if (!modoPousoSelecionado) motivos.push('altitude-de-troca-nao-atingida');
  if (esgotou) motivos.push('propelente-esgotado');
  if (perdeuControle) motivos.push('controle-perdido');
  if (!toque) motivos.push('sem-contato-final');
  if (toque && !pousoSeguro) motivos.push('toque-nao-seguro');
  if (toque && pousoSeguro && falhouPouso) motivos.push('instabilidade-apos-toque');
  if (toque && Math.abs(toque.antes.velocidadeYMps) > CRITERIOS_POUSO_BSS005.velocidadeVerticalToqueMaxMps) motivos.push('velocidade-vertical-no-toque');
  if (toque && Math.abs(toque.antes.velocidadeXMps) > CRITERIOS_POUSO_BSS005.velocidadeHorizontalToqueMaxMps) motivos.push('velocidade-horizontal-no-toque');
  if (toque && (Math.abs(toque.antes.orientacaoRad) > CRITERIOS_POUSO_BSS005.inclinacaoMaxRad
    || Math.abs(toque.antes.velocidadeAngularRadps) > CRITERIOS_POUSO_BSS005.velocidadeAngularMaxRadps)) motivos.push('atitude-ou-rotacao-no-toque');
  if (danificou) motivos.push('dano-estrutural');
  if (ultimoEstado.fixadoresRompidos.length > 0) motivos.push('vinculos-rompidos');
  if (ultimoEstado.sapatasApoiadas.length !== 2) motivos.push('apoio-final-das-sapatas');
  if (repousoContinuoS < CRITERIOS_POUSO_BSS005.duracaoRepousoS) motivos.push('sem-repouso-continuo');
  if (Math.abs(ultimoEstado.orientacaoRad) > CRITERIOS_POUSO_BSS005.inclinacaoMaxRad) motivos.push('atitude-final');
  const falhaConfirmada = !partidaAceita || esgotou || perdeuControle || danificou || falhouPouso
    || motivos.some((motivo) => ['velocidade-vertical-no-toque', 'velocidade-horizontal-no-toque',
      'atitude-ou-rotacao-no-toque', 'vinculos-rompidos'].includes(motivo))
    || (repousoContinuoS >= CRITERIOS_POUSO_BSS005.duracaoRepousoS && motivos.length > 0);
  return {
    configuracao: config, criterios: CRITERIOS_POUSO_BSS005, inicial, final: ultimoEstado,
    decolou, modoPousoSelecionado, apogeu, toque, pousoSeguro, repousoContinuoS,
    consumoMotorKg, massaRetiradaNaFalhaKg, erroBalancoMaxKg, maxPressaoDinamicaPa,
    maiorPenetracaoContatoM, objetoComMaiorPenetracaoId,
    resultado: motivos.length === 0 ? 'pouso-seguro' as const : falhaConfirmada ? 'falha' as const : 'inconclusivo' as const,
    encerramento: repousoContinuoS >= CRITERIOS_POUSO_BSS005.duracaoRepousoS ? 'repouso-fisico' as const : 'watchdog' as const,
    motivos, comandos, eventos, amostras,
  };
}

/** Executor síncrono para coletores sem um loop de mensagens. */
export function executarEnsaioMissaoBss005(configuracao: ConfiguracaoEnsaioBss005 = {}) {
  const ensaio = avancarEnsaioMissaoBss005(configuracao);
  let passo = ensaio.next();
  while (!passo.done) passo = ensaio.next();
  return passo.value;
}
