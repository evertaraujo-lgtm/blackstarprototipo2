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

/** Encontra componentes fortemente conexos dos imports locais, mantendo ordem determinística. */
export function ciclosImportacao(analise: Analise, incluirTipos: boolean): readonly (readonly string[])[] {
  const modulos = new Map(analise.modulos.filter(m => !/\.(test|spec)\./.test(m.arquivo)).map(m => [m.arquivo, m]));
  const grafo = new Map([...modulos].map(([a, m]) => [a, m.imports.filter(i => i.destino.startsWith('.') && (incluirTipos || !i.somenteTipo))
    .map(i => posix.normalize(`${posix.dirname(a)}/${i.destino}.ts`)).filter(a => modulos.has(a))]));
  const indices = new Map<string, number>(), menores = new Map<string, number>(), pilha: string[] = [], ativos = new Set<string>();
  const ciclos: string[][] = [];
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

/** Renderiza índice estrutural de módulos e ciclos; não substitui o mapa escrito tecnicamente. */
export function gerarIndiceModulos(analise: Analise): string {
  const ciclos = ciclosImportacao(analise, false), comTipos = ciclosImportacao(analise, true);
  const linhas = ['## Índice de módulos próprios (AST)', '',
    `Ciclos de imports executáveis: ${ciclos.length ? ciclos.map(c => c.join(' → ')).join('; ') : '**nenhum encontrado**'}. Incluindo tipos: ${comTipos.length ? comTipos.map(c => c.join(' → ')).join('; ') : '**nenhum encontrado**'}.`, '',
    'Escopo: imports/exportações estáticos locais das fontes próprias; chamadas dinâmicas e pacotes externos não são inferidos. A tabela inclui entradas sem funções.', '',
    '| Módulo | Classes/interfaces e bases | Imports (T = somente tipo) |', '|---|---|---|'];
  for (const m of analise.modulos.filter(m => !/\.(test|spec)\./.test(m.arquivo))) {
    const nomes = m.tipos.map(t => t.nome + (t.bases.length ? `: ${t.bases.join(', ')}` : '')).join(', ') || 'funções/entrada';
    const deps = m.imports.map(i => `${i.somenteTipo ? 'T: ' : ''}${i.destino}`).join(', ') || '—';
    linhas.push(`| [${m.arquivo}](../../${m.arquivo.replaceAll(' ', '%20')}) | ${nomes.replaceAll('|', '&#124;')} | ${deps} |`);
  }
  return linhas.join('\n');
}

/** Emite JavaScript sem comentários, preservando execução; hash permite comparar uma revisão documental com sua base. */
export function hashExecutavel(texto: string, arquivo: string): string {
  const emitido = ts.transpileModule(texto, { fileName: arquivo, compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, removeComments: true, useDefineForClassFields: true } }).outputText;
  return createHash('sha256').update(emitido).digest('hex');
}

/**
 * Comprova que arquivos de produção/testes existentes não mudaram execução na revisão documental.
 * @param raiz Raiz do Git; revisão fixa M11-P aprovada, nunca alterada para esconder regressão.
 * @returns Arquivos divergentes. Executa somente consultas Git; não executa o simulador.
 */
export function verificarBaseExecutavel(raiz: string): readonly string[] {
  const base = '555635b';
  const arquivos = execFileSync('git', ['ls-tree', '-r', '--name-only', base], { cwd: raiz, encoding: 'utf8' }).trim().split('\n').filter(a => /\.[cm]?tsx?$/.test(a));
  return arquivos.filter(a => {
    const anterior = execFileSync('git', ['show', `${base}:${a}`], { cwd: raiz, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    let atual: string; try { atual = readFileSync(resolve(raiz, a), 'utf8'); } catch { return true; }
    return hashExecutavel(anterior, a) !== hashExecutavel(atual, a);
  });
}

/**
 * Gera ou verifica artefatos AST em modo explícito; nunca escreve fontes do simulador.
 * @param raiz Cwd absoluto do repositório.
 * @param modo `gerar` grava catálogo/inventário e índice do mapa; `verificar` só lê.
 * @returns Cobertura e divergências; CLI falha se verificação encontrar lacunas/deriva.
 */
export function executarAuditoria(raiz: string, modo: 'gerar' | 'verificar') {
  const { analise } = carregarProjeto(raiz);
  const pasta = resolve(raiz, 'docs/arquitetura'), inventario = resolve(pasta, 'inventario-funcoes.json');
  const catalogo = gerarCatalogo(analise), atual = estrutura(analise.funcoes);
  const caminhoMapa = resolve(pasta, 'MAPA_DO_SISTEMA.md');
  const mapa = readFileSync(caminhoMapa, 'utf8');
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

