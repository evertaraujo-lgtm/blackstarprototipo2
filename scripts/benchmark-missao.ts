import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus, totalmem } from 'node:os';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { criarMissaoBss006Registrada } from '../src/missoes/ReplayMissaoBss006';
import { MundoFisico } from '../src/physics/MundoFisico';
import { SistemaHidrodinamico } from '../src/physics/agua/SistemaHidrodinamico';
import { ConjuntoEstruturalRigido } from '../src/physics/estruturas/ConjuntoEstruturalRigido';
import { MissaoBss006 } from '../src/missoes/MissaoBss006';
import { Vetor3 } from '../src/physics/Vetor3';

// Instrumentação exclusivamente no adaptador Node: nenhum relógio no domínio.
const { values } = parseArgs({ options: { segundos: { type: 'string', default: '171' },
  saida: { type: 'string' }, diario: { type: 'string' }, instrumentar: { type: 'boolean' }, contar: { type: 'boolean' }, vetores: { type: 'boolean' },
  'observacao-passos': { type: 'string', default: '8' }, terra: { type: 'boolean' } } });
const segundos = Number(values.segundos), frequencia = Number(values['observacao-passos']);
if (!(segundos > 0 && Number.isFinite(segundos)) || !Number.isSafeInteger(frequencia) || frequencia < 1) throw new Error('Parâmetros inválidos.');
const medidas: Record<string, { chamadas: number; totalMs: number; proprioMs: number }> = {};
const pilha: { filhosMs: number }[] = [], restaurar: (/** Tipo de operação síncrona usado pela instrumentação Node; wrappers devem preservar argumentos, retorno, this e exceções. Restauração de métodos é efeito explícito do callback correspondente, sem relógio no domínio. @contract f-b9550c1caa980d1d @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => void)[] = [];
let reconstrucoes = 0;
let faseAtual = 'inicializacao';
const chamadasPorFase: Record<string, Record<string, number>> = {};
/** Instala wrappers opt-in de contagem/tempo em métodos de protótipo no processo Node e agenda restauração; conserva this, argumentos, retorno e exceções. Relógio de CPU fica fora do domínio. @contract f-a02c5abbe5cdcfea @reviewed M12-DOC: implementação lida. */
function instrumentar(prototipo: object, nomes: string[], prefixo: string) {
  const p = prototipo as Record<string, /** Tipo de operação síncrona usado pela instrumentação Node; wrappers devem preservar argumentos, retorno, this e exceções. Restauração de métodos é efeito explícito do callback correspondente, sem relógio no domínio. @contract f-156cf81e3abe130b @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ (...args: unknown[]) => unknown>;
  for (const nome of nomes) {
    const chave = `${prefixo}.${nome}`, original = p[nome], medida = medidas[chave] = { chamadas: 0, totalMs: 0, proprioMs: 0 };
    p[nome] = /** Conta chamadas por fase e reconstruções geométricas; opcionalmente mede tempos inclusivo/próprio com pilha e finally, delegando ao método original sem mudar parâmetros físicos. @contract f-e5e1ebd39074c6bc @reviewed M12-DOC: implementação lida. */
              function (this: unknown, ...args: unknown[]) {
      const contagens = chamadasPorFase[faseAtual] ??= {};
      contagens[chave] = (contagens[chave] ?? 0) + 1;
      if (!values.instrumentar) {
        medida.chamadas++;
        const anterior = nome === 'geometrias' ? (this as { cache: Map<unknown, { geometria: unknown }> }).cache.get(args[0])?.geometria : undefined;
        const r = original.apply(this, args);
        if (nome === 'geometrias' && r !== anterior) reconstrucoes++;
        return r;
      }
      const frame = { filhosMs: 0 }, inicio = performance.now(); pilha.push(frame); medida.chamadas++;
      let anterior: unknown;
      if (nome === 'geometrias') anterior = (this as { cache: Map<unknown, { geometria: unknown }> }).cache.get(args[0])?.geometria;
      try {
        const r = original.apply(this, args);
        if (nome === 'geometrias' && r !== anterior) reconstrucoes++;
        return r;
      } finally {
        const duracao = performance.now() - inicio; pilha.pop(); medida.totalMs += duracao; medida.proprioMs += duracao - frame.filhosMs;
        if (pilha.length) pilha[pilha.length - 1].filhosMs += duracao;
      }
    };
    restaurar.push(() => { p[nome] = original; });
  }
}
if (values.instrumentar || values.contar) {
  instrumentar(MundoFisico.prototype, ['avancar', 'integrarPasso', 'integrarCorpos', 'sincronizarConjuntosEstruturais', 'aplicarKickGravitacional', 'aplicarKickHidrostatico'], 'mundo');
  instrumentar(SistemaHidrodinamico.prototype, ['calcular', 'geometrias', 'limitePassoS', 'atualizarCarregamento'], 'agua');
  instrumentar(ConjuntoEstruturalRigido.prototype, ['aplicarImpulsoNoPonto', 'aplicarImpulsosSequenciais', 'obterCentroDeMassaAtual', 'obterInerciaCompostaZ', 'sincronizar', 'integrar'], 'ilha');
  instrumentar(MissaoBss006.prototype, ['avancarPasso', 'observar', 'medidasAquaticas'], 'missao');
  if (values.instrumentar || values.vetores) instrumentar(Vetor3.prototype, ['adicionar', 'subtrair', 'multiplicar', 'produtoVetorial'], 'vetor');
}
let gcMs = 0, gcEventos = 0;
const gc = new PerformanceObserver(lista => { for (const e of lista.getEntries()) { gcMs += e.duration; gcEventos++; } });
gc.observe({ entryTypes: ['gc'] });
const m = criarMissaoBss006Registrada(values.terra ? {} : { ensaioAquatico: { inclinacaoInicialRad: 0.005, velocidadeInicialMps: 0.5, altitudeInicialM: 5 } });
if (values.terra) {
  for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) m.receberComando({ tipo: 'sistema', sistema, ligar: true });
  m.receberComando({ tipo: 'ignicao' });
}
m.iniciar();
const fases = new Map<string, { passos: number; avancoMs: number; observacaoMs: number }>();
const memoria: object[] = [], hash = createHash('sha256');
const passos = Math.round(segundos / m.passoS), cpuInicial = process.cpuUsage(), inicio = performance.now();
for (let i = 1; i <= passos; i++) {
  // Janelas fixas comuns às duas implementações; não controlam o voo.
  const t = (i - 1) * m.passoS, fase = t < 0.15 ? 'seca' : t < 4.1 ? 'entrada' : t < 169.7 ? 'tombamento-oscilacao' : 'equilibrio';
  faseAtual = fase;
  let f = fases.get(fase); if (!f) { f = { passos: 0, avancoMs: 0, observacaoMs: 0 }; fases.set(fase, f); }
  const a = performance.now(); if (!m.avancarPasso()) throw new Error('Missão não avançou.'); f.avancoMs += performance.now() - a; f.passos++;
  if (i % frequencia === 0) { const a = performance.now(), o = m.observar(); f.observacaoMs += performance.now() - a; hash.update(JSON.stringify(o)); }
  if (i % 2400 === 0) { memoria.push({ tempoS: i * m.passoS, ...process.memoryUsage() }); await new Promise<void>(r => setImmediate(r)); }
}
const duracaoMs = performance.now() - inicio, cpu = process.cpuUsage(cpuInicial);
const e = performance.now(), diario = m.exportar(), exportarMs = performance.now() - e;
const s = performance.now(), serializado = JSON.stringify(diario), serializarMs = performance.now() - s;
await new Promise<void>(r => setImmediate(r)); gc.disconnect(); for (const r of restaurar) r();
const resultado = { formato: 'blackstar-benchmark-m11-p-1', ambiente: { cpu: cpus()[0].model, ramBytes: totalmem(), node: process.version, plataforma: process.platform },
  parametros: { segundos, passoS: m.passoS, observacaoCadaPassos: frequencia, replayCadaPassos: diario.intervaloAmostraPassos, instrumentado: !!values.instrumentar, contagemSemRelogio: !!values.contar, vetores: !!values.vetores, terra: !!values.terra },
  duracaoMs, cpuMs: (cpu.user + cpu.system) / 1000, cpuMsPorSegundoSimulado: (cpu.user + cpu.system) / 1000 / segundos,
  fases: Object.fromEntries(fases), exportarMs, serializarMs, diarioBytes: Buffer.byteLength(serializado), memoria, gcMs, gcEventos,
  contadores: medidas, chamadasPorFase, reconstrucoes, hashObservacoes: hash.digest('hex'), hashDiario: createHash('sha256').update(serializado).digest('hex'),
  final: { tempoS: diario.final.tempoS, atitudeRad: diario.final.atitudeLocalRad, volumeM3: diario.final.aquatico?.volumeSubmersoM3,
    estado: diario.final.aquatico?.estado, integridade: diario.final.integridadeMinima }, eventos: diario.eventos };
if (values.diario) writeFileSync(values.diario, serializado);
if (values.saida) writeFileSync(values.saida, JSON.stringify(resultado, null, 2) + '\n');
console.log(JSON.stringify(resultado, null, 2));
