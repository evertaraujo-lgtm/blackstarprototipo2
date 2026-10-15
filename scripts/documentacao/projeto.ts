import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import ts from 'typescript';
import { analisarFontes } from './ast';
import type { Analise } from './ast';

/** Enumera fontes próprias; dependências, build e arquivos históricos não entram no inventário. */
export function listarFontes(raiz: string): readonly string[] {
  const arquivos: string[] = [];
  const percorrer = (pasta: string): void => {
    for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
      const caminho = resolve(pasta, entrada.name);
      if (entrada.isDirectory()) percorrer(caminho);
      else if (/\.[cm]?tsx?$/.test(entrada.name)) arquivos.push(relative(raiz, caminho).replaceAll('\\', '/'));
    }
  };
  percorrer(resolve(raiz, 'src')); percorrer(resolve(raiz, 'scripts'));
  for (const entrada of readdirSync(raiz)) if (/\.[cm]?tsx?$/.test(entrada)) arquivos.push(entrada);
  return arquivos.sort();
}

/**
 * Carrega tsconfig e tipos reais do projeto sem emitir JavaScript ou executar módulos.
 * @param raiz Diretório absoluto; deve ser o cwd para manter IDs relativos portáveis.
 * @returns Programa e inventário AST. Lê FS; falhas de configuração lançam Error.
 */
export function carregarProjeto(raiz: string): { programa: ts.Program; analise: Analise } {
  const config = ts.readConfigFile(resolve(raiz, 'tsconfig.json'), p => readFileSync(p, 'utf8'));
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const opcoes = ts.parseJsonConfigFileContent(config.config, ts.sys, raiz).options;
  const arquivos = listarFontes(raiz);
  const programa = ts.createProgram(arquivos, opcoes);
  const fontes = arquivos.map(a => programa.getSourceFile(a)!);
  return { programa, analise: analisarFontes(fontes, programa.getTypeChecker(), a => relative(raiz, resolve(raiz, a))) };
}
