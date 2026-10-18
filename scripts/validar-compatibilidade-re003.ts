import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { criarEnsaioReentrada, reproduzirEnsaioReentrada, type DiarioReentrada } from '../src/cenarios/EnsaioReentrada';

/** Compara agenda de 480 passos no código arquivado 9db1ef9 e atual, no mesmo
 * Node/V8. Precondição: RE004_BASE_LEGADA aponta à extração de git archive dessa
 * revisão. Não altera arquivos RE-003. Separa incompatibilidade numérica entre
 * runtimes (já existente) de regressão introduzida pelo modelo regional.
 * @contract f-f9128c669cbe52ff
   */
async function validarCompatibilidadeLegada(): Promise<void> {
  const raiz = process.env.RE004_BASE_LEGADA;
  if (!raiz) throw new Error('Informe snapshot git archive 9db1ef9 em RE004_BASE_LEGADA.');
  const antigo = await import(resolve(raiz, 'src/cenarios/EnsaioReentrada.ts'));
  const diario = JSON.parse(readFileSync('docs/validacoes/re003/interface/17-F-depois-1440-false.json', 'utf8')) as DiarioReentrada;
  let resultadoBrowserLegado = 'OK';
  try { antigo.reproduzirEnsaioReentrada(diario); }
  catch (e) { resultadoBrowserLegado = e instanceof Error ? e.message : String(e); }
  /** Executa a mesma agenda na fábrica fornecida; usa comandos/portas existentes,
   * sem editar estados térmicos/cinemáticos ou tolerar diferenças de resultados.
   * @contract f-c794be49d1420031
   */
  function executar(fabrica: typeof criarEnsaioReentrada): DiarioReentrada {
    const e = fabrica((diario.identificacao as { configuracao: Parameters<typeof criarEnsaioReentrada>[0] }).configuracao);
    let indice = 0;
    while (e.passosExecutados <= diario.passosExecutados) {
      while (indice < diario.entradas.length && diario.entradas[indice].passo === e.passosExecutados) {
        const entrada = diario.entradas[indice++];
        if (entrada.tipo === 'iniciar') e.iniciar(); else if (entrada.tipo === 'pausar') e.pausar(); else e.receberComando(entrada.comando);
      }
      if (e.passosExecutados === diario.passosExecutados) break;
      assert(e.avancarPasso(), 'Agenda deve autorizar avanço.');
    }
    return e.exportar();
  }
  const referencia = JSON.parse(JSON.stringify(executar(antigo.criarEnsaioReentrada))) as DiarioReentrada;
  const atual = JSON.parse(JSON.stringify(executar(criarEnsaioReentrada))) as DiarioReentrada;
  assert.deepEqual(atual, referencia);
  assert.deepEqual(JSON.parse(JSON.stringify(reproduzirEnsaioReentrada(referencia).exportar())), referencia);
  const pasta = resolve('docs/validacoes/re004');
  writeFileSync(resolve(pasta, 'diario-legado-re003-node.json'), JSON.stringify(referencia, null, 2));
  const resultado = { base: '9db1ef9', runtime: process.version, v8: process.versions.v8, passos: diario.passosExecutados,
    resultadoBrowserNoLegado: resultadoBrowserLegado, mesmoRuntimeAntigoAtual: 'idênticos, sem tolerância',
    replayNodeLegadoNoAtual: 'OK', energiaPicoBrowserJ: diario.final.extremos.globais.energiaTermicaCorpoJ.maximo.valor,
    energiaPicoNodeJ: referencia.final.extremos.globais.energiaTermicaCorpoJ.maximo.valor,
    restricao: 'Replay exato exige mesmo modelo/runtime. Não se relaxou comparação nem se regravou diário RE-003.' };
  writeFileSync(resolve(pasta, 'compatibilidade-legada.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado));
}
void validarCompatibilidadeLegada();
