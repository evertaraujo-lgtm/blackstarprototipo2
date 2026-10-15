import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { analisarFontes } from './ast';
import { compararInventarios, estrutura } from './catalogo';
import { verificarDocumentacao } from './auditoria';

const extrair = (texto: string, caminho = 'src/exemplo.ts') => analisarFontes([
  ts.createSourceFile(caminho, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
]);

describe('Inventário AST de funções', () => {
  it('inclui construtor, acessores, métodos privados/estáticos, local e constante', () => {
    const a = extrair(`class C { constructor(private v: number) {} get valor(): number { return this.v; }
      set valor(x: number) { this.v = x; } private static operar(x: number): number {
        function local(y: number): number { return y * 2; } const dobro = (z: number) => local(z); return dobro(x);
      } } export const externa = (x: number): number => x + 1;`);
    expect(a.funcoes.map(f => f.nome)).toEqual(['C.constructor', 'C.valor', 'C.valor', 'C.operar', 'C.operar.local', 'C.operar.dobro', 'externa']);
    expect(a.funcoes.find(f => f.nome === 'C.operar')?.modificadores).toEqual(['private', 'static']);
    expect(a.funcoes[0].escritas).toContain('this.v');
    expect(a.funcoes[1].id).not.toBe(a.funcoes[2].id);
  });
  it('separa contratos, overloads, callbacks e funções em testes', () => {
    const a = extrair(`interface I { executar(x: number): void; f: (x: number) => string; }
      type F = (x: number) => boolean;
      function f(x: number): number; function f(x: number) { [x].map(v => v + 1); return x; }`);
    expect(a.funcoes.filter(f => f.categoria === 'contrato')).toHaveLength(4);
    expect(a.funcoes.filter(f => f.categoria === 'callback')).toHaveLength(1);
    expect(a.funcoes.filter(f => f.categoria === 'producao')).toHaveLength(1);
    expect(new Set(a.funcoes.map(f => f.id)).size).toBe(a.funcoes.length);
    expect(extrair('const f = () => 1; it("ok", () => f());', 'src/exemplo.test.ts').funcoes.every(f => f.categoria === 'teste')).toBe(true);
  });
  it('mantém identidades ao inserir comentários e captura namespaces de objetos/condicionais', () => {
    const codigo = 'const o = { operar: (x: number) => x }; const f = true ? (() => 1) : (() => 2);';
    const a = extrair(codigo), b = extrair('/** Contrato. */\n\n' + codigo);
    expect(a.funcoes.map(f => f.id)).toEqual(b.funcoes.map(f => f.id));
    expect(a.funcoes.map(f => f.nome)).toEqual(['o.operar', 'f', 'f']);
    expect(a.funcoes.every(f => f.categoria === 'producao')).toBe(true);
  });
  it('atribui efeitos a cada closure e não à função que a define', () => {
    const a = extrair('function criar() { const agir = () => { objeto.valor = 1; registrar(); }; return agir; }');
    expect(a.funcoes[0].escritas).toEqual([]); expect(a.funcoes[0].chamadas).toEqual([]);
    expect(a.funcoes[1].escritas).toEqual(['objeto.valor']); expect(a.funcoes[1].chamadas).toEqual(['registrar']);
  });
  it('lê JSDoc de constantes e propriedades sem atribuir documentação da classe aos métodos', () => {
    const a = extrair('/** Classe. */ class C { operar() {} } /** Função. */ const f = () => 1; const o = { /** Porta. */ p: () => 2 };');
    expect(a.funcoes[0].documento).toBe(''); expect(a.funcoes[1].documento).toContain('Função.'); expect(a.funcoes[2].documento).toContain('Porta.');
  });
  it('reporta adição, remoção, assinatura e visibilidade; ordem/linhas não causam deriva', () => {
    const a = estrutura(extrair('class C { public f(x: number): number { return x; } } function retirar() {}').funcoes);
    const b = estrutura(extrair('class C { private f(x: string): string { return x; } } function adicionar() {}').funcoes);
    const d = compararInventarios(b, a);
    expect(d.adicionadas).toHaveLength(1); expect(d.removidas).toHaveLength(1); expect(d.alteradas).toHaveLength(1);
    expect(compararInventarios([...a].reverse(), a)).toEqual({ adicionadas: [], removidas: [], alteradas: [] });
  });
  it('detecta ausência de contrato e mantém callbacks/testes fora da obrigação de produção', () => {
    const a = extrair('function semContrato() {} [1].map(x => x);');
    const c = verificarDocumentacao(a);
    expect(c.producao).toBe(1); expect(c.callbacks).toBe(1); expect(c.faltantes).toEqual([a.funcoes[0].id]);
    expect(verificarDocumentacao(extrair('function helper() {}', 'x.test.ts')).faltantes).toEqual([]);
  });
  it('inclui reexportações de tipos e executáveis no grafo', () => {
    const a = extrair('export type { I } from "./a"; export { f } from "./b";');
    expect(a.modulos[0].imports).toEqual([{ destino: './a', somenteTipo: true }, { destino: './b', somenteTipo: false }]);
  });
});

it('inclui inicializadores de instância do construtor sem executar estáticos/closures', () => {
  const a = extrair(`class C { static global = prepararGlobal(); valor = criarLocal(); tarefa = () => operarDepois(); constructor() {} }`);
  const f = a.funcoes.find(f => f.nome === 'C.constructor')!;
  expect(f.escritas).toEqual(['this.valor', 'this.tarefa']);
  expect(f.chamadas).toEqual(['criarLocal']);
});
it('preserva espaços de literais nas evidências e ignora funções em strings/comentários', () => {
  const a = extrair(`// function falsa() {}\nconst texto = '() => 1'; function f() { return 'a  b'; }`);
  expect(a.funcoes).toHaveLength(1); expect(a.funcoes[0].retornos).toEqual(["'a  b'"]);
});
it('registra modificadores da propriedade/constante que recebe arrow function', () => {
  const a = extrair('class C { private static readonly f = async () => 1; } export const g = () => 2;');
  expect(a.funcoes[0].modificadores).toEqual(['private', 'static', 'readonly', 'async']);
  expect(a.funcoes[1].modificadores).toEqual(['export']);
});
it('distingue assinatura de parâmetro funcional e implementação padrão e captura JSDoc por wrappers', () => {
  const a = extrair('/** Função condicional documentada. */ const f = true ? (() => 1) : (() => 2); function g(normalizar: (x: string) => string = x => x) {}');
  expect(a.funcoes.filter(f => f.nome === 'f').every(f => f.documento.includes('Função condicional'))).toBe(true);
  expect(a.funcoes.find(f => f.nome === 'g.normalizar')?.categoria).toBe('producao');
  expect(a.funcoes.find(f => f.nome === 'g.normalizar[tipo]')?.categoria).toBe('contrato');
});
