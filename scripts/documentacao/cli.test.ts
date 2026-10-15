import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { analisarFontes } from './ast';
import { ancoraFuncao, estrutura, compararInventarios } from './catalogo';
import { ciclosImportacao, hashExecutavel, executarAuditoria } from './cli';
import { verificarDocumentacao } from './auditoria';

vi.mock('./projeto', () => ({ carregarProjeto: () => ({ analise: { funcoes: [], modulos: [] } }) }));

const fonte = (arquivo: string, texto: string) => ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true);

describe('Qualificação documental independente da física', () => {
  it('ignora apenas apresentação na AST emitida: comentário dentro de objeto pode mudar quebras de linha', () => {
    expect(hashExecutavel('const o = { x: 1, f: () => 2 };', 'x.ts'))
      .toBe(hashExecutavel('const o = { x: 1,\n/** Consulta. */\nf: () => 2 };', 'x.ts'));
  });
  it('recusa alteração de operação, constante ou estrutura por inserção automática de semicolon', () => {
    const base = hashExecutavel('function f() { return 1 + 2; }', 'x.ts');
    expect(base).not.toBe(hashExecutavel('function f() { return 1 - 2; }', 'x.ts'));
    expect(base).not.toBe(hashExecutavel('function f() { return 1 + 3; }', 'x.ts'));
    expect(base).not.toBe(hashExecutavel('function f() { return\n1 + 2; }', 'x.ts'));
  });
  it('distingue ciclo executável de ciclo exclusivamente de tipos', () => {
    const a = analisarFontes([fonte('src/a.ts', 'import { b } from "./b"; export const a = () => b();'),
      fonte('src/b.ts', 'import type { a } from "./a"; export const b = () => 1;')]);
    expect(ciclosImportacao(a, false)).toEqual([]); expect(ciclosImportacao(a, true)).toEqual([['src/a.ts', 'src/b.ts']]);
  });
  it('exige âncora correta e separa presença documental de revisão semântica', () => {
    const codigo = 'function f() { return 1; }', inicial = analisarFontes([fonte('src/a.ts', codigo)]);
    const ancora = ancoraFuncao(inicial.funcoes[0].id);
    const a = analisarFontes([fonte('src/a.ts', `/** Devolve a constante da implementação. @contract ${ancora} */\n${codigo}`)]);
    expect(verificarDocumentacao(a).faltantes).toEqual([]); expect(verificarDocumentacao(a).revisadas).toBe(0);
    const b = analisarFontes([fonte('src/a.ts', `/** Descrição suficientemente longa. @contract f-incorreta */\n${codigo}`)]);
    expect(verificarDocumentacao(b).faltantes).toHaveLength(1);
  });
  it('captura assinatura inferida pelo TypeChecker, sem depender só de anotações explícitas', () => {
    const analisar = (texto: string) => {
      const arquivo = 'memoria.ts', arquivoFonte = fonte(arquivo, texto), host = ts.createCompilerHost({ noLib: true });
      host.getSourceFile = nome => nome === arquivo ? arquivoFonte : undefined;
      const programa = ts.createProgram([arquivo], { noLib: true }, host);
      return estrutura(analisarFontes([arquivoFonte], programa.getTypeChecker()).funcoes);
    };
    const a = analisar('export const f = () => 1;'), b = analisar('export const f = () => "x";');
    expect(compararInventarios(b, a).alteradas).toHaveLength(1);
  });
});

it('rejeita âncora com sufixo e fonte inválida em vez de certificar contrato/execução', () => {
  const codigo = 'function f() { return 1; }';
  const a = analisarFontes([fonte('src/a.ts', codigo)]), ancora = ancoraFuncao(a.funcoes[0].id);
  const b = analisarFontes([fonte('src/a.ts', `/** Descrição suficientemente longa. @contract ${ancora}-incorreta */\n${codigo}`)]);
  expect(verificarDocumentacao(b).faltantes).toHaveLength(1);
  expect(() => hashExecutavel('function f( {', 'invalido.ts')).toThrow('sintaticamente inválida');
});


it('gera/verifica artefatos e rejeita mapa sem delimitadores, preservando texto manual', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'blackstar-doc-fixture-'));
  try {
    const pasta = join(raiz, 'docs/arquitetura'); mkdirSync(pasta, { recursive: true });
    const mapa = join(pasta, 'MAPA_DO_SISTEMA.md');
    writeFileSync(mapa, 'Texto manual.');
    expect(() => executarAuditoria(raiz, 'gerar')).toThrow('delimitadores');
    writeFileSync(mapa, 'Texto manual.\n<!-- INDICE_AST_INICIO -->\n<!-- INDICE_AST_FIM -->\n');
    expect(executarAuditoria(raiz, 'gerar').catalogoDesatualizado).toBe(false);
    expect(executarAuditoria(raiz, 'verificar').mapaDesatualizado).toBe(false);
    appendFileSync(join(pasta, 'CATALOGO_DE_FUNCOES.md'), 'Divergência manual.');
    expect(executarAuditoria(raiz, 'verificar').catalogoDesatualizado).toBe(true);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});
