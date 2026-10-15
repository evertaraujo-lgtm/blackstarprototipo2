import type { AmbienteFisico } from '../physics/ambiente/AmbienteFisico';
import { criarTesteBss005 } from './BancadaBss';
import { lerMissaoBss005, type FaseEnsaioBss005, type LeituraMissaoBss005 } from './EnsaioMissaoBss005';
import { PainelSolar } from '../physics/objetos/fontes-de-energia/PainelSolar';

export interface EntradaDiarioBss005 {
  readonly passo: number;
  readonly acao: string;
  readonly valor?: string | number | boolean;
}

export interface DiarioBss005 {
  readonly versao: number;
  readonly dtS: number;
  readonly passosExecutados: number;
  readonly configuracao: unknown;
  readonly entradas: readonly EntradaDiarioBss005[];
}

export interface EventoReplayBss005 {
  readonly tipo: string;
  readonly passo: number;
  readonly leitura: LeituraMissaoBss005;
}

export interface OpcoesReplayBss005 {
  readonly ambienteFisico?: AmbienteFisico;
  readonly arcoBaseM?: number;
  /** Reexecução identificada; não promete equivalência exata à revisão histórica. */
  readonly permitirDiarioLegadoSemModelo?: boolean;
}
export interface ResultadoReplayBss005 {
  readonly modeloFisico: object;
  readonly diarioLegadoSemModelo: boolean;
  readonly dtS: number;
  readonly passosExecutados: number;
  readonly inicial: LeituraMissaoBss005;
  readonly final: LeituraMissaoBss005;
  readonly eventos: readonly EventoReplayBss005[];
  readonly amostras: readonly LeituraMissaoBss005[];
  readonly comandos: readonly { readonly passo: number; readonly acao: string; readonly aceito: boolean }[];
  readonly erroBalancoMaxKg: number;
}

const DT_BANCADA_S = 1 / 240;
const PASSOS_POR_YIELD = 2_400;

/** Devolve `typeof valor === 'object' && valor !== null`. Efeitos indiretos seguem as dependências chamadas. @contract f-8eaee0207c980ead */
const ehRegistro = (valor: unknown): valor is Record<string, unknown> => typeof valor === 'object' && valor !== null;

/** Dependências diretas: `Array.isArray`, `valor.map`, `ehRegistro`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-fd493bfc9aba0ec7 */
function normalizarParaComparacao(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(normalizarParaComparacao);
  if (!ehRegistro(valor)) return valor;
  return Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, normalizarParaComparacao(valor[chave])]));
}

/** Devolve `diarioLegado`. Dependências diretas: `Array.isArray`, `Error`, `ehRegistro`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-dcaca9b45456e308 */
function validarDiario(diario: DiarioBss005, cenario: ReturnType<typeof criarTesteBss005>, opcoes: OpcoesReplayBss005): boolean {
  if (diario.versao !== 1 || diario.dtS !== DT_BANCADA_S
    || !Number.isSafeInteger(diario.passosExecutados) || diario.passosExecutados < 0
    || !Array.isArray(diario.entradas)) {
    throw new Error('Diário BSS-005 inválido: versão, dt ou quantidade de passos incompatível.');
  }
  const configuracao = ehRegistro(diario.configuracao) ? diario.configuracao : undefined;
  const parametros = configuracao && ehRegistro(configuracao.parametros) ? configuracao.parametros : undefined;
  const configuracaoAtual = cenario.obterConfiguracaoEnsaio?.();
  const diarioLegado = parametros?.modeloFisico === undefined;
  if (diarioLegado && !opcoes.permitirDiarioLegadoSemModelo) throw new Error('Diário histórico sem modelo físico: exige opção explícita de reexecução legada.');
  if (!diarioLegado && JSON.stringify(normalizarParaComparacao(parametros?.modeloFisico))
    !== JSON.stringify(normalizarParaComparacao(configuracaoAtual?.modeloFisico))) throw new Error('Modelo físico incompatível com o diário.');
  const compararAtual = diarioLegado && configuracaoAtual ? Object.fromEntries(Object.entries(configuracaoAtual).filter(([k]) => k !== 'modeloFisico')) : configuracaoAtual;
  if (!configuracao || configuracao.nome !== cenario.nome || !parametros || !configuracaoAtual
    || JSON.stringify(normalizarParaComparacao(parametros)) !== JSON.stringify(normalizarParaComparacao(compararAtual))) {
    throw new Error('Diário não corresponde à configuração atual do BSS-005.');
  }

  const estadoInicialAtual = cenario.objetos.map((objeto) => ({
    id: objeto.id,
    massaKg: objeto.massaKg,
    temperaturaC: objeto.temperaturaC,
    integridade: objeto.integridadeEstrutural,
    estado: objeto.getEstadoFisico(),
  }));
  if (!Array.isArray(configuracao.estadoInicial)
    || JSON.stringify(normalizarParaComparacao(configuracao.estadoInicial))
      !== JSON.stringify(normalizarParaComparacao(estadoInicialAtual))) {
    throw new Error('Diário não corresponde ao estado físico inicial atual do BSS-005.');
  }
  let passoAnterior = -1;
  for (const entrada of diario.entradas) {
    if (!Number.isSafeInteger(entrada.passo) || entrada.passo < passoAnterior || entrada.passo > diario.passosExecutados
      || typeof entrada.acao !== 'string' || !entrada.acao) {
      throw new Error('Diário BSS-005 contém entradas fora de ordem ou inválidas.');
    }
    if (typeof entrada.valor === 'number' && !Number.isFinite(entrada.valor)) {
      throw new Error('Diário BSS-005 contém valor não finito.');
    }
    passoAnterior = entrada.passo;
  }
  return diarioLegado;
}

/**
 * Reproduz entradas físicas exportadas pela bancada na montagem BSS-005 atual.
 * As entradas são aplicadas antes do passo indicado; a função não injeta estados.
 * @contract f-62b5d2e391bcfcfb
 */
export function* avancarReplayDiarioBss005(diario: DiarioBss005, intervaloAmostraS = 5, opcoes: OpcoesReplayBss005 = {}) {
  const cenario = criarTesteBss005({ ...(opcoes.ambienteFisico ? { ambienteFisico: opcoes.ambienteFisico } : {}), ...(opcoes.arcoBaseM !== undefined ? { arcoBaseM: opcoes.arcoBaseM } : {}) });
  const diarioLegadoSemModelo = validarDiario(diario, cenario, opcoes);
  if (!Number.isFinite(intervaloAmostraS) || intervaloAmostraS <= 0) throw new Error('Intervalo de amostragem inválido em s.');

  const motor = cenario.propulsorControlavel;
  let fase: FaseEnsaioBss005 = 'solo';
  /** Devolve `lerMissaoBss005(cenario, fase)`. Dependências diretas: `lerMissaoBss005`. Efeitos indiretos seguem as dependências chamadas. @contract f-977932fc8649ebf1 */
  const ler = () => lerMissaoBss005(cenario, fase);
  const inicial = ler();
  const eventos: EventoReplayBss005[] = [];
  const amostras: LeituraMissaoBss005[] = [inicial];
  const comandos: { passo: number; acao: string; aceito: boolean }[] = [];
  let proximaAmostraS = intervaloAmostraS;
  let proximaEntrada = 0;
  let empuxoAnteriorN = motor.empuxoAtualN;
  let erroBalancoMaxKg = 0;
  let consumoMotorKg = 0;
  /** Devolve `eventos.push({ tipo, passo, leitura: ler() })`. Dependências diretas: `eventos.push`, `ler`. Efeitos indiretos seguem as dependências chamadas. @contract f-80a704ecf90ed9bb */
  const registrarEvento = (tipo: string, passo: number) => eventos.push({ tipo, passo, leitura: ler() });

  /** Dependências diretas: `motor.sistemaEstaOperacional`, `motor.desligarSistema`, `motor.ligarSistema`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-2a710b27f7ccdfac */
  const aplicar = (entrada: EntradaDiarioBss005, passo: number): void => {
    let aceito = true;
    switch (entrada.acao) {
      case 'click:toggle-electric':
      case 'click:toggle-hydraulic':
      case 'click:toggle-fuel':
      case 'click:toggle-control': {
        const sistema = ({
          'click:toggle-electric': 'elétrico', 'click:toggle-hydraulic': 'hidráulico',
          'click:toggle-fuel': 'combustível', 'click:toggle-control': 'controle',
        } as const)[entrada.acao];
        if (motor.sistemaEstaOperacional(sistema)) {
          motor.desligarSistema(sistema);
          aceito = !motor.sistemaEstaOperacional(sistema);
        } else {
          motor.ligarSistema(sistema);
          aceito = motor.sistemaEstaOperacional(sistema);
        }
        break;
      }
      case 'click:ignite-engine':
        aceito = motor.solicitarIgnicao();
        break;
      case 'input:throttle-input': {
        const throttlePercentual = Number(entrada.valor);
        aceito = Number.isFinite(throttlePercentual) && throttlePercentual >= 0 && throttlePercentual <= 100;
        if (aceito) motor.definirThrottle(throttlePercentual / 100);
        break;
      }
      case 'input:gimbal-input': {
        const anguloGraus = Number(entrada.valor);
        aceito = Number.isFinite(anguloGraus) && cenario.propulsorVetorizadoControlavel !== undefined;
        if (aceito) cenario.propulsorVetorizadoControlavel!.solicitarVetorizacao(anguloGraus * Math.PI / 180);
        break;
      }
      case 'change:bss04-mode':
        aceito = entrada.valor === 'pouso' || entrada.valor === 'decolagem';
        if (aceito) cenario.ativarModoBss04?.(entrada.valor as 'pouso' | 'decolagem');
        else throw new Error(`Modo BSS-005 inválido no passo ${passo}.`);
        break;
      case 'click:disconnect-fuel-tank':
      case 'click:disconnect-oxidizer-tank': {
        const tipo = entrada.acao === 'click:disconnect-fuel-tank' ? 'combustivel' : 'oxidante';
        const linha = cenario.linhasComFalhaControlavel?.[tipo];
        aceito = linha !== undefined && !linha.estaRompida;
        if (aceito) {
          linha!.romper();
          motor.interromperPorAlimentacaoDePropelenteIndisponivel();
        }
        break;
      }
      case 'click:solar-panel-toggle': {
        const painel = cenario.objetos.find((objeto): objeto is PainelSolar => objeto instanceof PainelSolar);
        aceito = painel !== undefined;
        if (painel) painel.definirStatus(painel.estaDesdobrado ? 'dobrado' : 'desdobrado');
        break;
      }
      default:
        throw new Error(`Ação de diário BSS-005 ainda não suportada: ${entrada.acao}.`);
    }
    comandos.push({ passo, acao: entrada.acao, aceito });
    registrarEvento(`comando:${entrada.acao}`, passo);
  };

  for (let passo = 0; passo < diario.passosExecutados; passo++) {
    while (diario.entradas[proximaEntrada]?.passo === passo) aplicar(diario.entradas[proximaEntrada++]!, passo);
    const antes = ler();
    cenario.atualizarControle?.();
    cenario.mundo.avancar(diario.dtS);
    const depoisSemFase = ler();
    consumoMotorKg += motor.vazaoAtualKgS * diario.dtS;
    erroBalancoMaxKg = Math.max(erroBalancoMaxKg,
      Math.abs(inicial.massaTotalObjetosKg - depoisSemFase.massaTotalObjetosKg - consumoMotorKg));

    if (antes.velocidadeYMps >= 0 && depoisSemFase.velocidadeYMps < 0) {
      fase = 'descida';
      registrarEvento('apogeu', passo + 1);
    } else if (depoisSemFase.contatos.length > 0 && antes.contatos.length === 0) {
      fase = 'contato';
      registrarEvento('primeiro-contato', passo + 1);
    } else if (depoisSemFase.velocidadeYMps > 0 && depoisSemFase.altitudeM > 0.5) {
      fase = depoisSemFase.empuxoN > 0 ? 'subida' : 'corte';
    } else if (fase === 'descida' && depoisSemFase.empuxoN > 0) {
      fase = 'frenagem';
    }
    if (empuxoAnteriorN > 0 && depoisSemFase.empuxoN === 0) registrarEvento('corte-de-empuxo', passo + 1);
    empuxoAnteriorN = depoisSemFase.empuxoN;

    const depois = ler();
    if (depois.tempoS >= proximaAmostraS) {
      amostras.push(depois);
      proximaAmostraS += intervaloAmostraS;
    }
    if ((passo + 1) % PASSOS_POR_YIELD === 0) yield { passosConcluidos: passo + 1 };
  }
  while (diario.entradas[proximaEntrada]?.passo === diario.passosExecutados) {
    aplicar(diario.entradas[proximaEntrada++]!, diario.passosExecutados);
  }
  const final = ler();
  if (amostras.at(-1) !== final) amostras.push(final);
  return { modeloFisico: cenario.mundo.obterConfiguracaoFisica(), diarioLegadoSemModelo, dtS: diario.dtS, passosExecutados: diario.passosExecutados, inicial, final, eventos, amostras, comandos, erroBalancoMaxKg } satisfies ResultadoReplayBss005;
}

/** Executor síncrono útil para diários curtos e testes.
 * @contract f-ce87eaf7c160a0fd
 */
export function executarReplayDiarioBss005(diario: DiarioBss005, intervaloAmostraS = 5, opcoes: OpcoesReplayBss005 = {}): ResultadoReplayBss005 {
  const replay = avancarReplayDiarioBss005(diario, intervaloAmostraS, opcoes);
  let passo = replay.next();
  while (!passo.done) passo = replay.next();
  return passo.value;
}
