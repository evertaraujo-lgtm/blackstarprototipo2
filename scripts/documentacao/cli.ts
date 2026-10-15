import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { carregarProjeto } from './projeto';
import type { Analise } from './ast';
import { compararInventarios, estrutura, gerarCatalogo } from './catalogo';
import type { EntradaEstrutural } from './catalogo';
import { verificarDocumentacao } from './auditoria';

/** Encontra componentes fortemente conexos dos imports locais, mantendo ordem determinística.
 * @remarks Constrói grafo de imports/exportações locais e encontra componentes fortemente conexos por Tarjan, podendo incluir tipos. Não infere dependências dinâmicas ou de pacotes externos.
 * @contract f-461456c555c8385b
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function ciclosImportacao(analise: Analise, incluirTipos: boolean): readonly (readonly string[])[] {
  const modulos = new Map(analise.modulos.filter(m => !/\.(test|spec)\./.test(m.arquivo)).map(m => [m.arquivo, m]));
  const grafo = new Map([...modulos].map(([a, m]) => [a, m.imports.filter(i => i.destino.startsWith('.') && (incluirTipos || !i.somenteTipo))
    .map(i => posix.normalize(`${posix.dirname(a)}/${i.destino}.ts`)).filter(a => modulos.has(a))]));
  const indices = new Map<string, number>(), menores = new Map<string, number>(), pilha: string[] = [], ativos = new Set<string>();
  const ciclos: string[][] = [];
  /** Visita vértice do grafo, atualiza índices/lowlinks e extrai componentes da pilha local; não altera módulos de produção. @contract f-66616dc3ac376eaa @reviewed M12-DOC: implementação lida. */
  const visitar = (a: string): void => {
    const indice = indices.size; indices.set(a, indice); menores.set(a, indice); pilha.push(a); ativos.add(a);
    for (const b of grafo.get(a) ?? []) {
      if (!indices.has(b)) { visitar(b); menores.set(a, Math.min(menores.get(a)!, menores.get(b)!)); }
      else if (ativos.has(b)) menores.set(a, Math.min(menores.get(a)!, indices.get(b)!));
    }
    if (menores.get(a) === indices.get(a)) {
      const componente: string[] = []; let b: string;
      do { b = pilha.pop()!; ativos.delete(b); componente.push(b); } while (b !== a);
      if (componente.length > 1 || grafo.get(a)?.includes(a)) ciclos.push(componente.sort());
    }
  };
  for (const a of grafo.keys()) if (!indices.has(a)) visitar(a);
  return ciclos;
}

/** Renderiza índice estrutural de módulos e ciclos; não substitui o mapa escrito tecnicamente.
 * @remarks Renderiza ciclos, classes/interfaces/bases e imports no trecho gerado do mapa; não reescreve o diagnóstico arquitetural manual.
 * @contract f-7d9bf51d9d25d94b
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function gerarIndiceModulos(analise: Analise): string {
  const ciclos = ciclosImportacao(analise, false), comTipos = ciclosImportacao(analise, true);
  const linhas = ['## Índice de módulos próprios (AST)', '',
    `Ciclos de imports executáveis: ${ciclos.length ? ciclos.map(c => c.join(' → ')).join('; ') : '**nenhum encontrado**'}. Incluindo tipos: ${comTipos.length ? comTipos.map(c => c.join(' → ')).join('; ') : '**nenhum encontrado**'}.`, '',
    'Escopo: imports/exportações estáticos locais das fontes próprias; chamadas dinâmicas e pacotes externos não são inferidos. A tabela inclui entradas sem funções.', '',
    '| Módulo | Classes/interfaces e bases | Imports (T = somente tipo) |', '|---|---|---|'];
  for (const m of analise.modulos.filter(m => !/\.(test|spec)\./.test(m.arquivo))) {
    const nomes = m.tipos.map(t => t.nome + (t.bases.length ? `: ${t.bases.join(', ')}` : '')).join(', ') || 'funções/entrada';
    const deps = m.imports.map(i => `${i.somenteTipo ? 'T: ' : ''}${i.destino}`).join(', ') || '—';
    linhas.push(`| [${m.arquivo}](../../${m.arquivo.replaceAll(' ', '%20')}) | ${nomes.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;')} | ${deps} |`);
  }
  return linhas.join('\n');
}

/** Compara AST do JavaScript emitido sem comentários; ignora só apresentação, preservando tokens, literais e estrutura executável.
 * @remarks Emite JavaScript sem comentários, serializa sua AST/tokenização e calcula SHA-256; ignora apresentação, preservando operadores, literais e estrutura.
 * @contract f-501a3751afa9af00
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function hashExecutavel(texto: string, arquivo: string): string {
  const resultado = ts.transpileModule(texto, { fileName: arquivo, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, removeComments: true, useDefineForClassFields: true } });
  if (resultado.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error(`Fonte sintaticamente inválida: ${arquivo}`);
  const emitido = resultado.outputText;
  const fonte = ts.createSourceFile('emitido.js', emitido, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  /** Codifica recursivamente espécie AST e texto dos tokens terminais; não inclui offsets ou quebras de linha entre tokens. @contract f-c6ca5417b996119a @reviewed M12-DOC: implementação lida. */
  const codificar = (no: ts.Node): unknown => {
    const filhos = no.getChildren(fonte);
    return filhos.length ? [no.kind, filhos.map(codificar)] : [no.kind, no.getText(fonte)];
  };
  return createHash('sha256').update(JSON.stringify(codificar(fonte))).digest('hex');
}

/**
 * Comprova que arquivos de produção/testes existentes não mudaram execução na revisão documental.
 * @param raiz Raiz do Git; revisão fixa M11-P aprovada, nunca alterada para esconder regressão.
 * @returns Arquivos divergentes. Executa somente consultas Git; não executa o simulador.
 * @remarks Compara fontes TypeScript existentes em 555635b com árvore atual pela AST do JavaScript emitido; consulta Git (NUL para Unicode) e retorna divergentes, sem executar a simulação.
 * @contract f-b136148a38cc4263
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function verificarBaseExecutavel(raiz: string): readonly string[] {
  const base = '555635b';
  const arquivos = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', base], { cwd: raiz, encoding: 'utf8' }).split('\0').filter(a => /\.[cm]?tsx?$/.test(a));
  return arquivos.filter(a => {
    const anterior = execFileSync('git', ['show', `${base}:${a}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    let atual: string; try { atual = readFileSync(resolve(raiz, a), 'utf8'); } catch { return true; }
    return hashExecutavel(anterior, a) !== hashExecutavel(atual, a);
  });
}

/**
 * Gera ou verifica artefatos AST em modo explícito; nunca escreve fontes do simulador.
 * @param raiz Cwd absoluto do repositório.
 * @throws Se o mapa não possuir um par único e ordenado de delimitadores do índice gerado.
 * @param modo `gerar` grava catálogo/inventário e índice do mapa; `verificar` só lê.
 * @returns Cobertura e divergências; CLI falha se verificação encontrar lacunas/deriva.
 * @remarks Orquestra leitura AST e comparação com catálogo/inventário/mapa. Só modo gerar grava os artefatos documentais explícitos; verificar é somente leitura e reporta lacunas/deriva.
 * @contract f-dea53a3b872cb690
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function executarAuditoria(raiz: string, modo: 'gerar' | 'verificar') {
  const { analise } = carregarProjeto(raiz);
  const pasta = resolve(raiz, 'docs/arquitetura'), inventario = resolve(pasta, 'inventario-funcoes.json');
  const catalogo = gerarCatalogo(analise), atual = estrutura(analise.funcoes);
  const caminhoMapa = resolve(pasta, 'MAPA_DO_SISTEMA.md');
  const mapa = readFileSync(caminhoMapa, 'utf8');
  if (mapa.split('<!-- INDICE_AST_INICIO -->').length !== 2 || mapa.split('<!-- INDICE_AST_FIM -->').length !== 2
    || mapa.indexOf('<!-- INDICE_AST_INICIO -->') > mapa.indexOf('<!-- INDICE_AST_FIM -->'))
    throw new Error('Mapa deve conter um par único e ordenado de delimitadores INDICE_AST.');
  const indice = `<!-- INDICE_AST_INICIO -->\n${gerarIndiceModulos(analise)}\n<!-- INDICE_AST_FIM -->`;
  const mapaAtual = mapa.replace(/<!-- INDICE_AST_INICIO -->[\s\S]*?<!-- INDICE_AST_FIM -->/, indice);
  if (modo === 'gerar') {
    mkdirSync(dirname(inventario), { recursive: true });
    writeFileSync(inventario, JSON.stringify(atual, null, 2) + '\n');
    writeFileSync(resolve(pasta, 'CATALOGO_DE_FUNCOES.md'), catalogo); writeFileSync(caminhoMapa, mapaAtual);
  }
  const anterior = JSON.parse(readFileSync(inventario, 'utf8')) as EntradaEstrutural[];
  const divergencias = compararInventarios(atual, anterior), cobertura = verificarDocumentacao(analise);
  const catalogoDesatualizado = readFileSync(resolve(pasta, 'CATALOGO_DE_FUNCOES.md'), 'utf8') !== catalogo;
  const mapaDesatualizado = mapaAtual !== (modo === 'gerar' ? mapaAtual : mapa);
  return { cobertura, divergencias, catalogoDesatualizado, mapaDesatualizado };
}

