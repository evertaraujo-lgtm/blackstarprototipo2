import { DEFINICAO_BSS006 } from '../veiculos/DefinicaoBss006';
import { BSS006_VOO_EXPERIMENTAL } from './MissaoBss006';
import { RegistroMissao, type DiarioMissao } from './RegistroMissao';
import type { ComandoBss006, ConfiguracaoMissaoBss006, ObservacaoBss006 } from './TiposMissaoBss006';

/** Devolve `c !== null && typeof c === 'object' && !Array.isArray(c)`. Dependências diretas: `Array.isArray`. Efeitos indiretos seguem as dependências chamadas. @contract f-8da6d56d70ab70fd */
const objeto = (c: unknown): c is Record<string, unknown> => c !== null && typeof c === 'object' && !Array.isArray(c);
/** Dependências diretas: `objeto`, `somente`, `['elétrico', 'hidráulico', 'combustível', 'controle'].includes`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-26ac88fd2a26c0ac */
export function validarComandoBss006(c: unknown): c is ComandoBss006 {
  if (!objeto(c)) return false;
  /** Devolve `Object.keys(c).every(k => ['tipo', ...campos].includes(k))`. Dependências diretas: `Object.keys(c).every`, `Object.keys`. Efeitos indiretos seguem as dependências chamadas. @contract f-bf10058ae855df76 */
  const somente = (...campos: string[]) => Object.keys(c).every(k => ['tipo', ...campos].includes(k));
  switch (c.tipo) {
    case 'ignicao': case 'desligar-motor': return somente();
    case 'sistema': return somente('sistema', 'ligar') && typeof c.sistema === 'string' && ['elétrico', 'hidráulico', 'combustível', 'controle'].includes(c.sistema) && typeof c.ligar === 'boolean';
    case 'throttle': return somente('valor') && typeof c.valor === 'number' && Number.isFinite(c.valor);
    case 'alvo-pouso': return somente('deslocamentoM') && typeof c.deslocamentoM === 'number' && Number.isFinite(c.deslocamentoM);
    case 'modo': return somente('modo') && (c.modo === 'decolagem' || c.modo === 'pouso');
    case 'controle-atitude': return somente('habilitar') && typeof c.habilitar === 'boolean';
    case 'falha-alimentacao': return somente('alimentacao') && typeof c.alimentacao === 'string' && ['eletrica', 'metano', 'oxidante'].includes(c.alimentacao);
    default: return false;
  }
}
/** Dependências diretas: `Array.isArray`, `x.map(canonico).join`, `x.map`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-aa695e4429461bd5 */
function canonico(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonico).join(',')}]`;
  if (objeto(x)) return `{${Object.keys(x).filter(k => x[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonico(x[k])}`).join(',')}}`;
  return JSON.stringify(x);
}
/** Dependências diretas: `m.observar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-69293707bdab20bc */
function identificacao(m: ReturnType<typeof BSS006_VOO_EXPERIMENTAL.criar>) {
  return { id: m.id, revisaoMissao: m.configuracao.ensaioAquatico ? 'm11-amerissagem-2' : BSS006_VOO_EXPERIMENTAL.revisao, revisaoVeiculo: DEFINICAO_BSS006.revisao,
    configuracao: m.configuracao, modeloFisico: m.observar().cenario.modeloFisico,
    reproducao: 'Mesma revisão de código, modelo, parâmetros, comandos e dt; sem equivalência prometida entre revisões.' };
}
/** Devolve `new RegistroMissao(m, identificacao(m), validarComandoBss006, intervaloAmostraPassos)`. Dependências diretas: `BSS006_VOO_EXPERIMENTAL.criar`, `RegistroMissao`, `identificacao`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-d84de2b281d11400 */
export function criarMissaoBss006Registrada(configuracao: ConfiguracaoMissaoBss006 = {}, intervaloAmostraPassos = 240) {
  const m = BSS006_VOO_EXPERIMENTAL.criar(configuracao);
  return new RegistroMissao(m, identificacao(m), validarComandoBss006, intervaloAmostraPassos);
}
/** Reexecução técnica, nunca altera a instância/diário original nem dados persistentes.
 * @contract f-2be1430c0dadd281
 */
export function reproduzirDiarioBss006(valor: unknown): RegistroMissao<ComandoBss006, ObservacaoBss006> {
  if (!objeto(valor) || valor.formato !== 'blackstar-missao-1' || !objeto(valor.identificacao)
    || !objeto(valor.identificacao.configuracao) || !Array.isArray(valor.entradas)
    || !Number.isSafeInteger(valor.passosExecutados) || (valor.passosExecutados as number) < 0
    || !Number.isSafeInteger(valor.intervaloAmostraPassos) || (valor.intervaloAmostraPassos as number) <= 0)
    throw new Error('Diário de missão inválido.');
  const config = valor.identificacao.configuracao;
  if (Object.keys(config).some(k => !['arcoBaseM', 'ventoTangencialMps', 'alvoPousoLocalM', 'altitudeTransicaoM', 'transicaoAutomatica', 'ensaioAquatico'].includes(k))
    || ['arcoBaseM', 'ventoTangencialMps', 'alvoPousoLocalM', 'altitudeTransicaoM'].some(k => typeof config[k] !== 'number' || !Number.isFinite(config[k]))
    || typeof config.transicaoAutomatica !== 'boolean') throw new Error('Configuração do diário inválida.');
  if (config.ensaioAquatico !== undefined && (!objeto(config.ensaioAquatico)
    || Object.keys(config.ensaioAquatico).some(k => !['inclinacaoInicialRad', 'velocidadeInicialMps', 'altitudeInicialM'].includes(k))
    || ['inclinacaoInicialRad', 'velocidadeInicialMps', 'altitudeInicialM'].some(k => typeof (config.ensaioAquatico as Record<string, unknown>)[k] !== 'number'
      || !Number.isFinite((config.ensaioAquatico as Record<string, unknown>)[k])))) throw new Error('Condição aquática do diário inválida.');
  const original = valor as unknown as DiarioMissao<ComandoBss006, ObservacaoBss006>;
  const m = criarMissaoBss006Registrada(config, original.intervaloAmostraPassos);
  if (canonico(m.exportar().identificacao) !== canonico(original.identificacao)
    || m.passoS !== original.passoS || canonico(m.observar()) !== canonico(original.inicial))
    throw new Error('Revisão, modelo físico ou condições iniciais incompatíveis com o replay.');
  let anterior = 0;
  for (const [i, entrada] of original.entradas.entries()) {
    if (!objeto(entrada) || !Number.isSafeInteger(entrada.passo) || entrada.passo < anterior || entrada.passo > original.passosExecutados
      || entrada.sequencia !== i || !['iniciar', 'pausar', 'comando'].includes(entrada.tipo)
      || (entrada.tipo === 'comando' && (!validarComandoBss006(entrada.comando) || !objeto(entrada.resultado))))
      throw new Error('Agenda de comandos inválida.');
    anterior = entrada.passo;
  }
  let indice = 0;
  while (true) {
    while (original.entradas[indice]?.passo === m.passosExecutados) {
      const entrada = original.entradas[indice++]!;
      if (entrada.tipo === 'iniciar') m.iniciar();
      else if (entrada.tipo === 'pausar') m.pausar();
      else if (canonico(m.receberComando(entrada.comando)) !== canonico(entrada.resultado)) throw new Error('Resultado de comando divergiu no replay.');
    }
    if (m.passosExecutados === original.passosExecutados) break;
    if (!m.avancarPasso()) throw new Error('Agenda não permite avançar a missão.');
  }
  if (canonico(m.exportar()) !== canonico(original)) throw new Error('Estado, eventos ou telemetria divergem do diário.');
  return m;
}
