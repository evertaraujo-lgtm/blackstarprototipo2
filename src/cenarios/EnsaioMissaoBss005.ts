import type { AmbienteFisico } from '../physics/ambiente/AmbienteFisico';
import { criarTesteBss005 } from './BancadaBss';
import type { Objeto } from '../physics/objetos/base/Objeto';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { MundoFisico, type RajadaVento } from '../physics/MundoFisico';
import { TOLERANCIA_CONTATO_SUPERFICIE_M } from '../physics/solucionadores/ResolvedorContatoSuperficie';
import { Vetor3 } from '../physics/Vetor3';

type CenarioBss005 = ReturnType<typeof criarTesteBss005>;
export type FalhaEnsaioBss005 = 'nenhuma' | 'sem-reserva-no-corte' | 'perda-controle-no-corte' | 'sem-combustivel-inicial'
  | 'sensor-congelado-na-descida' | 'sensor-atrasado-na-descida';
export type FaseEnsaioBss005 = 'solo' | 'decolagem' | 'subida' | 'corte' | 'descida' | 'frenagem' | 'contato' | 'repouso' | 'falha-pouso';
export interface ConfiguracaoEnsaioBss005 {
  readonly ambienteFisico?: AmbienteFisico;
  readonly altitudeTrocaParaPousoM?: number;
  readonly throttleDecolagem?: number;
  readonly falha?: FalhaEnsaioBss005;
  readonly rajadasVento?: readonly RajadaVento[];
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
  readonly velocidadeArXMps: number;
  readonly velocidadeArYMps: number;
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
  readonly idadeLeituraSensorS: number;
  readonly sensoresValidos: boolean;
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

/** Limites do veículo no instante anterior à resposta do core ao primeiro contato.
 * @contract f-de6aadae2b4cd7e6
 */
export function atendeLimitesDeToqueBss005(leitura: Pick<LeituraMissaoBss005,
  'velocidadeXMps' | 'velocidadeYMps' | 'orientacaoRad' | 'velocidadeAngularRadps'>): boolean {
  return Math.abs(leitura.velocidadeYMps) < CRITERIOS_POUSO_BSS005.velocidadeVerticalToqueMaxMps
    && Math.abs(leitura.velocidadeXMps) < CRITERIOS_POUSO_BSS005.velocidadeHorizontalToqueMaxMps
    && Math.abs(leitura.orientacaoRad) < CRITERIOS_POUSO_BSS005.inclinacaoMaxRad
    && Math.abs(leitura.velocidadeAngularRadps) < CRITERIOS_POUSO_BSS005.velocidadeAngularMaxRadps;
}

/** Lista grandezas que atingem/excedem critérios históricos de toque: velocidades vertical/horizontal, inclinação e taxa angular. Não modifica limiares nem estado do ensaio. @contract f-0daf5806d1df6633 @reviewed M12-DOC: implementação lida. */
function causasLimitesDeToqueBss005(leitura: Pick<LeituraMissaoBss005,
  'velocidadeXMps' | 'velocidadeYMps' | 'orientacaoRad' | 'velocidadeAngularRadps'>): string[] {
  const causas: string[] = [];
  if (Math.abs(leitura.velocidadeYMps) >= CRITERIOS_POUSO_BSS005.velocidadeVerticalToqueMaxMps) causas.push('velocidade-vertical');
  if (Math.abs(leitura.velocidadeXMps) >= CRITERIOS_POUSO_BSS005.velocidadeHorizontalToqueMaxMps) causas.push('velocidade-horizontal');
  if (Math.abs(leitura.orientacaoRad) >= CRITERIOS_POUSO_BSS005.inclinacaoMaxRad) causas.push('inclinacao');
  if (Math.abs(leitura.velocidadeAngularRadps) >= CRITERIOS_POUSO_BSS005.velocidadeAngularMaxRadps) causas.push('velocidade-angular');
  return causas;
}

/** Calcula menor Y global dos pontos de contato orientados pela pose; consulta legado cartesiano, não altitude radial geral. @contract f-9053c7e543fe455e @reviewed M12-DOC: implementação lida. */
export const menorAlturaDoObjetoM = (objeto: Objeto): number => {
  const e = objeto.getEstadoFisico();
  return Math.min(...objeto.getPontosDeContatoLocaisM().map((ponto) => e.posicaoM.y
    + ponto.x * Math.sin(e.orientacaoRad.z) + ponto.y * Math.cos(e.orientacaoRad.z)));
};

/** Observação somente por consultas públicas; pressão dinâmica é grandeza derivada, em Pa.
 * @contract f-1d2ac94000dba1d0
 */
export function lerMissaoBss005(cenario: CenarioBss005, fase: FaseEnsaioBss005): LeituraMissaoBss005 {
  const casco = cenario.seguirObjeto;
  const motor = cenario.propulsorControlavel;
  const e = casco.getEstadoFisico();
  const ambiente = cenario.mundo.obterCondicoesAtmosfericas(casco);
  const relativo = e.velocidadeMps.subtrair(ambiente.velocidadeArMps);
  const massa = casco.massaInstantaneaDoConjuntoKg;
  const motorConectadoAoCasco = casco.obterObjetosFisicosConectados().includes(motor);
  const gravidade = cenario.mundo.obterGravidadeMps2(e.posicaoM).magnitude;
  const arrasto = cenario.objetos.reduce((soma, objeto) => soma.adicionar(cenario.mundo.obterForcaArrastoAtmosferico(objeto)), Vetor3.zero);
  const solo = cenario.superficies[0]!;
  const ref = cenario.mundo.ambiente.referencial;
  /** Devolve `cenario.mundo.obterMenorDistanciaSuperficieM(objeto, solo)`. Dependências diretas: `cenario.mundo.obterMenorDistanciaSuperficieM`. Efeitos indiretos seguem as dependências chamadas. @contract f-c7d307657a752f79 */
  const altura = (objeto: Objeto) => cenario.mundo.obterMenorDistanciaSuperficieM(objeto, solo);
  const velocidadeLocal = ref.vetorParaLocal(e.velocidadeMps, e.posicaoM);
  const arLocal = ref.vetorParaLocal(ambiente.velocidadeArMps, e.posicaoM);
  const tanques = cenario.objetos.filter((objeto): objeto is TanquePropelente => objeto instanceof TanquePropelente);
  /** Devolve `tanques.filter((tanque) => tanque.tipoPropelente === tipo).reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0)`. Dependências diretas: `tanques.filter((tanque) => tanque.tipoPropelente === tipo).reduce`, `tanques.filter`. Efeitos indiretos seguem as dependências chamadas. @contract f-172675eaf378e0c9 */
  const kg = (tipo: string) => tanques.filter((tanque) => tanque.tipoPropelente === tipo).reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0);
  const gimbal = motor.obterEstadoDaVetorizacao();
  const leiturasSensores = casco.obterLeiturasDosSensores();
  return {
    tempoS: cenario.mundo.tempoS, fase, altitudeM: ref.altitudeGeometricaM(e.posicaoM), posicaoXM: ref.posicaoHorizontalM(e.posicaoM),
    velocidadeXMps: velocidadeLocal.x, velocidadeYMps: velocidadeLocal.y,
    velocidadeArXMps: arLocal.x, velocidadeArYMps: arLocal.y,
    orientacaoRad: ref.atitudeLocalRad(e.orientacaoRad.z, e.posicaoM),
    velocidadeAngularRadps: ref.taxaAtitudeLocalRadps(e.velocidadeAngularRadps.z, e.posicaoM, e.velocidadeMps),
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
    idadeLeituraSensorS: leiturasSensores.idadeLeituraS ?? 0,
    sensoresValidos: leiturasSensores.sensoresValidos ?? true,
    integridadeMinima: Math.min(...cenario.objetos.map((objeto) => objeto.integridadeEstrutural)),
    fixadoresRompidos: cenario.fixadores.filter((fixador) => fixador.estaRompido).map((fixador) => fixador.id),
    objetos: cenario.objetos.map((objeto) => {
      const estado = objeto.getEstadoFisico();
      return { id: objeto.id, massaKg: objeto.massaKg, integridade: objeto.integridadeEstrutural, temperaturaC: objeto.temperaturaC,
        velocidadeXMps: ref.vetorParaLocal(estado.velocidadeMps, estado.posicaoM).x, velocidadeYMps: ref.vetorParaLocal(estado.velocidadeMps, estado.posicaoM).y,
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
 * @contract f-6cace55e6c0bde57
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
    || !['nenhuma', 'sem-reserva-no-corte', 'perda-controle-no-corte', 'sem-combustivel-inicial',
      'sensor-congelado-na-descida', 'sensor-atrasado-na-descida'].includes(config.falha)) throw new Error('Configuração de ensaio BSS-005 inválida.');
  const cenario = criarTesteBss005({ ambienteFisico: configuracao.ambienteFisico, rajadasVento: configuracao.rajadasVento });
  const motor = cenario.propulsorControlavel;
  // Colisão de carga/destroço é registrada, mas não substitui o toque do casco
  // ou do trem de pouso na avaliação de pouso da missão.
  const idsDosContatosDePouso = new Set(cenario.objetos
    .filter((objeto) => objeto.id === cenario.seguirObjeto.id
      || objeto.id.startsWith('bss05-perna-') || objeto.id.startsWith('bss05-sapata-'))
    .map((objeto) => objeto.id));
  const tanques = cenario.objetos.filter((objeto): objeto is TanquePropelente => objeto instanceof TanquePropelente);
  let fase: FaseEnsaioBss005 = 'solo';
  /** Devolve `lerMissaoBss005(cenario, fase)`. Dependências diretas: `lerMissaoBss005`. Efeitos indiretos seguem as dependências chamadas. @contract f-343cd371cf181d2c */
  const ler = () => lerMissaoBss005(cenario, fase);
  const inicial = ler();
  const amostras: LeituraMissaoBss005[] = config.registrarAmostras ? [inicial] : [];
  const eventos: { tipo: string; leitura: LeituraMissaoBss005 }[] = [];
  const comandos: { tempoS: number; operacao: string; aceito: boolean; valor?: string | number }[] = [];
  /** Devolve `eventos.push({ tipo, leitura: ler() })`. Dependências diretas: `eventos.push`, `ler`. Efeitos indiretos seguem as dependências chamadas. @contract f-4b676dcb51d939c6 */
  const evento = (tipo: string) => eventos.push({ tipo, leitura: ler() });
  let massaRetiradaNaFalhaKg = 0;
  /** Injeta falha prescrita retirando todo propelente disponível pelos métodos dos tanques e acumula massa kg retirada; não altera massa cinemática diretamente. @contract f-f83aae4aa6f46468 @reviewed M12-DOC: implementação lida. */
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
  let primeiroContatoFisicoRegistrado = false;
  let esgotou = false, danificou = false, perdeuControle = false, falhouSensores = false;
  let toque: { antes: LeituraMissaoBss005; depois: LeituraMissaoBss005 } | undefined;
  let pousoSeguro = false, falhouPouso = false, contatoUnilateralS = 0, tempoAposPrimeiroContatoS = 0;
  let apogeu = inicial, repousoContinuoS = 0, maiorRepousoContinuoS = 0, consumoMotorKg = 0, maxPressaoDinamicaPa = 0;
  let maiorPenetracaoContatoM = 0, objetoComMaiorPenetracaoId: string | undefined;
  let erroBalancoMaxKg = 0, proximaAmostraS = config.intervaloAmostraS;
  const causasFalhaPouso: string[] = [];
  let ultimoEstado = ler();
  /** Marca primeira falha, acumula causas, muda fase e registra evento uma única vez; evento observa critérios, sem impor trajetória. @contract f-6ab216b281a41730 @reviewed M12-DOC: implementação lida. */
  const registrarFalhaPouso = (causas: readonly string[]) => {
    if (falhouPouso) return;
    falhouPouso = true;
    causasFalhaPouso.push(...causas);
    fase = 'falha-pouso';
    evento('pouso-falhou');
  };
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
      if (config.falha === 'sensor-congelado-na-descida') {
        cenario.seguirObjeto.injetarFalhaNosSensores({ tipo: 'congelado', iniciarEmS: cenario.mundo.tempoS });
        evento('falha-sensor-injetada');
      } else if (config.falha === 'sensor-atrasado-na-descida') {
        cenario.seguirObjeto.injetarFalhaNosSensores({ tipo: 'atraso', iniciarEmS: cenario.mundo.tempoS, atrasoS: 0.5 });
        evento('falha-sensor-injetada');
      }
    }
    if (desceu && !toque) fase = depois.empuxoN > 0 ? 'frenagem' : 'descida';
    if (desceu && !iniciouFrenagem && depois.empuxoN > 0) { iniciouFrenagem = true; fase = 'frenagem'; evento('inicio-da-frenagem'); }
    if (!falhouSensores && depois.faseControlador === 'falha-de-sensores') {
      falhouSensores = true;
      evento('falha-de-sensores');
    }
    if (!esgotou && partidaAceita && (depois.metanoKg === 0 || depois.oxidanteKg === 0)) { esgotou = true; evento('esgotamento-propelente'); }
    if (desceu && !primeiroContatoFisicoRegistrado && depois.contatos.length > 0) {
      primeiroContatoFisicoRegistrado = true;
      fase = 'contato'; evento('primeiro-contato');
    }
    const houveContatoDePouso = depois.contatosFisicos.some((contato) => idsDosContatosDePouso.has(contato.objetoId)
      && contato.penetracaoM >= 0 && (contato.emApoio || contato.velocidadeNormalAntesMps < 0));
    if (desceu && !toque && houveContatoDePouso) {
      fase = 'contato'; toque = { antes, depois: ler() }; evento('toque-veiculo');
      const causas = causasLimitesDeToqueBss005(antes);
      if (depois.integridadeMinima < 1) causas.push('dano-estrutural');
      if (depois.fixadoresRompidos.length > 0) causas.push('vinculo-rompido');
      if (causas.length > 0) registrarFalhaPouso(causas);
    }
    if (toque && !pousoSeguro && !falhouPouso) {
      tempoAposPrimeiroContatoS += config.dtS;
      const apoiadas = depois.sapatasApoiadas.length === 2;
      contatoUnilateralS = apoiadas ? 0 : contatoUnilateralS + config.dtS;
      const atitudeEstavel = Math.abs(depois.orientacaoRad) < CRITERIOS_POUSO_BSS005.inclinacaoMaxRad
        && depois.velocidadeAngularMaximaComponentesRadps < CRITERIOS_POUSO_BSS005.velocidadeAngularMaxRadps;
      const causas: string[] = [];
      if (depois.integridadeMinima < 1) causas.push('dano-estrutural');
      if (depois.fixadoresRompidos.length > 0) causas.push('vinculo-rompido');
      if (tempoAposPrimeiroContatoS > CRITERIOS_POUSO_BSS005.limiteContatoUnilateralS && !apoiadas) causas.push('apoio-unilateral');
      if (tempoAposPrimeiroContatoS > CRITERIOS_POUSO_BSS005.limiteContatoUnilateralS && !atitudeEstavel) {
        causas.push(...causasLimitesDeToqueBss005(depois));
      }
      if (causas.length > 0) {
        registrarFalhaPouso(causas);
      } else if (apoiadas && atitudeEstavel) {
        pousoSeguro = true; evento('toque-seguro');
      }
    }
    if (toque && pousoSeguro && !falhouPouso) {
      const apoiadas = depois.sapatasApoiadas.length === 2;
      contatoUnilateralS = apoiadas ? 0 : contatoUnilateralS + config.dtS;
      const causas = causasLimitesDeToqueBss005(depois);
      if (depois.integridadeMinima < 1) causas.push('dano-estrutural');
      if (depois.fixadoresRompidos.length > 0) causas.push('vinculo-rompido');
      if (contatoUnilateralS > CRITERIOS_POUSO_BSS005.limiteContatoUnilateralS) causas.push('apoio-unilateral');
      if (causas.length > 0) {
        registrarFalhaPouso(causas);
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
    maiorRepousoContinuoS = Math.max(maiorRepousoContinuoS, repousoContinuoS);
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
  if (falhouSensores) motivos.push('falha-de-sensores');
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
    modeloFisico: cenario.mundo.obterConfiguracaoFisica(), configuracao: config, criterios: CRITERIOS_POUSO_BSS005, inicial, final: ultimoEstado,
    decolou, modoPousoSelecionado, apogeu, toque, pousoSeguro, repousoContinuoS, maiorRepousoContinuoS,
    causasFalhaPouso,
    consumoMotorKg, massaRetiradaNaFalhaKg, erroBalancoMaxKg, maxPressaoDinamicaPa,
    maiorPenetracaoContatoM, objetoComMaiorPenetracaoId,
    resultado: motivos.length === 0 ? 'pouso-seguro' as const : falhaConfirmada ? 'falha' as const : 'inconclusivo' as const,
    encerramento: repousoContinuoS >= CRITERIOS_POUSO_BSS005.duracaoRepousoS ? 'repouso-fisico' as const : 'watchdog' as const,
    motivos, comandos, eventos, amostras,
  };
}

/** Executor síncrono para coletores sem um loop de mensagens.
 * @contract f-9c2f792f44b85690
 */
export function executarEnsaioMissaoBss005(configuracao: ConfiguracaoEnsaioBss005 = {}) {
  const ensaio = avancarEnsaioMissaoBss005(configuracao);
  let passo = ensaio.next();
  while (!passo.done) passo = ensaio.next();
  return passo.value;
}
