import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { analisarFontes } from './ast';
import { ancoraFuncao, gerarCatalogo, estrutura } from './catalogo';

const temporarios: string[] = [];
const cli = resolve('scripts/auditar-documentacao.ts');
const viteNode = resolve('node_modules/vite-node/vite-node.mjs');
const arquivos = ['src/conexões/medição.ts', 'src/observação.ts'];
const artefatos = ['CATALOGO_DE_FUNCOES.md', 'inventario-funcoes.json', 'MAPA_DO_SISTEMA.md'];

const novaRaiz = (nome: string) => {
  const pasta = mkdtempSync(join(tmpdir(), 'blackstar-reprod-'));
  temporarios.push(pasta);
  const raiz = join(pasta, nome); mkdirSync(raiz, { recursive: true });
  return raiz;
};
const observar = (parametro = '') => `import { ler } from './conexões/medição';
export function observar(${parametro}) { return { dado: ler(), literal: '/media/exemplo/a  b' as const }; }`;

const escreverFontes = (raiz: string) => {
  mkdirSync(join(raiz, 'src/conexões'), { recursive: true });
  mkdirSync(join(raiz, 'scripts'));
  for (const [arquivo, texto] of [[arquivos[0], 'export interface Medida { alturaM: number }; export function ler(): Medida { return { alturaM: 1 }; }'],
    [arquivos[1], observar()]]) {
    // Contratos pertencem à fixture, com os mesmos IDs relativos nos dois checkouts.
    const fonte = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true);
    const funcao = analisarFontes([fonte]).funcoes.find(f => f.categoria === 'producao')!;
    writeFileSync(join(raiz, arquivo), texto.replace('export function',
      `/** Consulta medida física da fixture sem integrar estado. @contract ${ancoraFuncao(funcao.id)} */\nexport function`));
  }
  writeFileSync(join(raiz, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noLib: true, types: [], noEmit: true,
  }, include: ['src', 'scripts'] }));
  mkdirSync(join(raiz, 'docs/arquitetura'), { recursive: true });
  writeFileSync(join(raiz, 'docs/arquitetura/MAPA_DO_SISTEMA.md'),
    '# Medições — texto manual\n<!-- INDICE_AST_INICIO -->\n<!-- INDICE_AST_FIM -->\n');
};

const analisar = (raiz: string) => {
  const programa = ts.createProgram(arquivos.map(a => join(raiz, a)), { noLib: true, types: [], strict: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler });
  const fontes = arquivos.map(a => programa.getSourceFile(join(raiz, a))!);
  const checker = programa.getTypeChecker();
  return { programa, fontes, checker, analise: analisarFontes(fontes, checker, a => relative(raiz, a).replaceAll('\\', '/')) };
};

const executar = (raiz: string, modo: 'gerar' | 'verificar') => execFileSync(process.execPath,
  [viteNode, cli, ...(modo === 'gerar' ? ['--gerar'] : [])], { cwd: raiz, encoding: 'utf8' });
const lerArtefatos = (raiz: string) => artefatos.map(a => readFileSync(join(raiz, 'docs/arquitetura', a), 'utf8'));
const estadoArquivos = (raiz: string): object => Object.fromEntries(readdirSync(raiz, { recursive: true, withFileTypes: true })
  .filter(e => e.isFile()).map(e => {
    const arquivo = join(e.parentPath, e.name), bytes = readFileSync(arquivo);
    return [relative(raiz, arquivo), { hash: createHash('sha256').update(bytes).digest('hex'), mtimeMs: statSync(arquivo).mtimeMs }];
  }));

afterEach(() => { for (const pasta of temporarios.splice(0)) rmSync(pasta, { recursive: true, force: true }); });

describe('Reprodutibilidade documental em checkouts independentes', () => {
  it('reproduz o import absoluto original e conserva aliases, Unicode, literais e IDs após a correção', () => {
    const a = novaRaiz('checkout curto'), b = novaRaiz('outro checkout — caminho maior');
    escreverFontes(a); escreverFontes(b);
    const x = analisar(a), y = analisar(b);
    const original = (p: ReturnType<typeof analisar>) => {
      const no = p.fontes[1].statements.find(ts.isFunctionDeclaration)!;
      const assinatura = p.checker.getSignatureFromDeclaration(no)!;
      return p.checker.typeToString(p.checker.getReturnTypeOfSignature(assinatura), no, ts.TypeFormatFlags.NoTruncation);
    };
    expect(original(x)).not.toBe(original(y)); // Falha histórica: diretório absoluto.
    expect(original(x)).toContain('import(');
    expect(estrutura(x.analise.funcoes)).toEqual(estrutura(y.analise.funcoes));
    expect(x.analise.funcoes.map(f => f.retorno)).toEqual(y.analise.funcoes.map(f => f.retorno));
    const catalogo = gerarCatalogo(x.analise);
    expect(catalogo).toBe(gerarCatalogo(y.analise));
    expect(catalogo).toBe(gerarCatalogo(x.analise));
    expect(catalogo).toContain('src/conexões/medição.ts');
    expect(catalogo).toContain('Medida');
    expect(catalogo).toContain('/media/exemplo/a  b'); // Valor literal não é normalizado.
    expect(catalogo).not.toContain(a); expect(catalogo).not.toContain(b);
    expect(catalogo).not.toContain('\r\n');
    for (const f of x.analise.funcoes) expect(catalogo).toContain(ancoraFuncao(f.id));
  });

  it('gera igual em duas raízes, não escreve ao verificar e rejeita catálogo e assinatura alterados', () => {
    const a = novaRaiz('lançamento A'), b = novaRaiz('checkout B — lançamento');
    escreverFontes(a); escreverFontes(b);
    executar(a, 'gerar'); const inicial = lerArtefatos(a), estado = estadoArquivos(a);
    expect(JSON.parse(executar(a, 'verificar')).catalogoDesatualizado).toBe(false);
    expect(estadoArquivos(a)).toEqual(estado);
    executar(a, 'gerar'); expect(lerArtefatos(a)).toEqual(inicial);
    executar(b, 'gerar'); expect(lerArtefatos(b)).toEqual(inicial);
    appendFileSync(join(a, 'docs/arquitetura/CATALOGO_DE_FUNCOES.md'), 'Divergência real.');
    const adulterado = estadoArquivos(a);
    const r = spawnSync(process.execPath, [viteNode, cli], { cwd: a, encoding: 'utf8' });
    expect(r.status).toBe(1); expect(JSON.parse(r.stdout).catalogoDesatualizado).toBe(true);
    expect(estadoArquivos(a)).toEqual(adulterado);
    executar(a, 'gerar');
    const caminho = join(a, arquivos[1]);
    writeFileSync(caminho, readFileSync(caminho, 'utf8').replace('function observar()', 'function observar(valor: number)'));
    const mudado = estadoArquivos(a);
    const s = spawnSync(process.execPath, [viteNode, cli], { cwd: a, encoding: 'utf8' });
    expect(s.status).toBe(1);
    const divergencias = JSON.parse(s.stdout).divergencias;
    expect(divergencias.adicionadas).toEqual([]); expect(divergencias.removidas).toEqual([]);
    expect(divergencias.alteradas).toEqual(['src/observação.ts::observar:FunctionDeclaration']);
    expect(estadoArquivos(a)).toEqual(mudado);
  }, 60_000);
});
