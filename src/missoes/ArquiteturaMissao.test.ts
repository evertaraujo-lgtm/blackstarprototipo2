import { expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import ts from 'typescript';

it('grafo transitivo do domínio não depende de bancada, apresentação ou APIs externas', () => {
  const visitados = new Set<string>();
  const visitar = (arquivo: string): void => {
    if (visitados.has(arquivo)) return; visitados.add(arquivo);
    const nome = relative(process.cwd(), arquivo).replaceAll('\\', '/');
    expect(nome, `Dependência fora do domínio: ${nome}`).toMatch(/^src\/(missoes|veiculos|physics)\//);
    const ast = ts.createSourceFile(arquivo, readFileSync(arquivo, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const no of ast.statements) {
      if (!ts.isImportDeclaration(no) || !ts.isStringLiteral(no.moduleSpecifier)) continue;
      const caminho = no.moduleSpecifier.text;
      expect(caminho.startsWith('.'), `Serviço externo importado pelo domínio: ${caminho}`).toBe(true);
      const destino = resolve(dirname(arquivo), `${caminho}.ts`);
      expect(existsSync(destino), `Import não resolvido: ${destino}`).toBe(true); visitar(destino);
    }
  };
  for (const arquivo of ['src/missoes/MissaoBss006.ts', 'src/missoes/ReplayMissaoBss006.ts',
    'src/missoes/ExecutorMissao.ts', 'src/veiculos/DefinicaoBss006.ts']) visitar(resolve(arquivo));
  expect(visitados.size).toBeGreaterThan(30);
});
