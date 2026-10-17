import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import ts from 'typescript';
import { analisarFontes } from './ast';
import type { Analise } from './ast';

/** Enumera fontes próprias; dependências, build e arquivos históricos não entram no inventário.
 * @remarks Enumera TypeScript próprio em src, scripts, site (quando presente) e raiz, ordenando caminhos relativos; ignora dependências e build por delimitação de escopo.
 * @contract f-c9f0da8192b66f4e
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function listarFontes(raiz: string): readonly string[] {
  const arquivos: string[] = [];
  /** Percorre diretório de fontes próprias e coleta arquivos TypeScript; só consulta o sistema de arquivos. @contract f-c7e5a38e4d6a0c66 @reviewed M12-DOC: implementação lida. */
  const percorrer = (pasta: string): void => {
    for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
      const caminho = resolve(pasta, entrada.name);
      if (entrada.isDirectory()) percorrer(caminho);
      else if (/\.[cm]?tsx?$/.test(entrada.name)) arquivos.push(relative(raiz, caminho).replaceAll('\\', '/'));
    }
  };
  percorrer(resolve(raiz, 'src')); percorrer(resolve(raiz, 'scripts'));
  if (existsSync(resolve(raiz, 'site'))) percorrer(resolve(raiz, 'site'));
  for (const entrada of readdirSync(raiz)) if (/\.[cm]?tsx?$/.test(entrada)) arquivos.push(entrada);
  return arquivos.sort();
}

/**
 * Carrega tsconfig e tipos reais do projeto sem emitir JavaScript ou executar módulos.
 * @param raiz Diretório absoluto; deve ser o cwd para manter IDs relativos portáveis.
 * @returns Programa e inventário AST. Lê FS; falhas de configuração lançam Error.
 * @remarks Lê tsconfig e fontes, cria programa/TypeChecker sem emissão e entrega análise com caminhos relativos portáveis; configuração inválida lança Error.
 * @contract f-2e439b007813b382
 * @reviewed M12-DOC: contrato confrontado com implementação.
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
