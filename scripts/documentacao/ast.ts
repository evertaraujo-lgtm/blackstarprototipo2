import ts from 'typescript';

export interface Fonte { readonly caminho: string; readonly texto: string }
export interface Funcao {
  readonly id: string; readonly arquivo: string; readonly linha: number; readonly inicio: number;
  readonly nome: string; readonly categoria: 'producao' | 'callback' | 'teste' | 'contrato';
  readonly especie: string; readonly assinatura: string; readonly parametros: readonly string[];
  readonly retorno: string; readonly documento: string; readonly chamadas: readonly string[];
  readonly escritas: readonly string[]; readonly retornos: readonly string[];
  readonly condicoes: readonly string[]; readonly excecoes: readonly string[];
  readonly corpo: string; readonly modificadores: readonly string[];
}
export interface Modulo {
  readonly arquivo: string; readonly imports: readonly { destino: string; somenteTipo: boolean }[];
  readonly tipos: readonly { nome: string; especie: string; bases: readonly string[] }[];
}
export interface Analise { readonly funcoes: readonly Funcao[]; readonly modulos: readonly Modulo[] }

type Declaracao = ts.SignatureDeclaration & { body?: ts.ConciseBody; name?: ts.PropertyName };

/** Reconhece implementações e assinaturas explícitas, incluindo acessores/overloads; não executa a AST. */
function eFuncao(no: ts.Node): no is Declaracao {
  return ts.isFunctionDeclaration(no) || ts.isFunctionExpression(no) || ts.isArrowFunction(no)
    || ts.isMethodDeclaration(no) || ts.isConstructorDeclaration(no) || ts.isGetAccessor(no)
    || ts.isSetAccessor(no) || ts.isMethodSignature(no) || ts.isCallSignatureDeclaration(no)
    || ts.isConstructSignatureDeclaration(no) || ts.isFunctionTypeNode(no) || ts.isConstructorTypeNode(no);
}

/** Usa nomes sintáticos de declaração/atribuição; callbacks sem nome recebem ordinal lexical. */
function nomeDeclaracao(no: Declaracao, fonte: ts.SourceFile): string | undefined {
  if (ts.isConstructorDeclaration(no)) return 'constructor';
  if (no.name) return no.name.getText(fonte);
  if (ts.isCallSignatureDeclaration(no)) return '[call]';
  if (ts.isConstructSignatureDeclaration(no)) return '[construct]';
  let pai = no.parent;
  while (ts.isParenthesizedExpression(pai) || ts.isAsExpression(pai) || ts.isSatisfiesExpression(pai) || ts.isConditionalExpression(pai)) pai = pai.parent;
  if (ts.isTypeAliasDeclaration(pai) || ts.isPropertySignature(pai) || ts.isParameter(pai)) return `${pai.name.getText(fonte)}[tipo]`;
  if (ts.isVariableDeclaration(pai) || ts.isPropertyDeclaration(pai) || ts.isPropertyAssignment(pai)) return pai.name.getText(fonte);
  if (ts.isBinaryExpression(pai) && pai.operatorToken.kind === ts.SyntaxKind.EqualsToken) return pai.left.getText(fonte);
  return undefined;
}

/** Obtém JSDoc da declaração ou do statement que hospeda uma função atribuída a constante. */
export function documentoDaDeclaracao(no: ts.Node, fonte: ts.SourceFile): string {
  let alvo = no;
  if ((ts.isArrowFunction(no) || ts.isFunctionExpression(no)) && ts.isVariableDeclaration(no.parent)) {
    alvo = ts.isVariableDeclarationList(no.parent.parent) ? no.parent.parent.parent : no.parent;
  } else if ((ts.isArrowFunction(no) || ts.isFunctionExpression(no))
    && (ts.isPropertyAssignment(no.parent) || ts.isPropertyDeclaration(no.parent))) alvo = no.parent;
  const documentos = (alvo as ts.Node & { jsDoc?: readonly ts.JSDoc[] }).jsDoc ?? [];
  if (documentos.length) return documentos.map(doc => doc.getText(fonte)).join('\n');
  return [...(ts.getLeadingCommentRanges(fonte.text, alvo.getFullStart()) ?? []),
    ...(ts.getTrailingCommentRanges(fonte.text, alvo.getFullStart()) ?? [])]
    .filter((r, i, todos) => todos.findIndex(t => t.pos === r.pos) === i).map(r => fonte.text.slice(r.pos, r.end))
    .filter(t => t.startsWith('/**')).join('\n');
}

/** Percorre apenas o corpo corrente: efeitos de closures pertencem às próprias entradas do inventário. */
function fatosCorpo(no: Declaracao, fonte: ts.SourceFile): Pick<Funcao, 'chamadas' | 'escritas' | 'retornos' | 'condicoes' | 'excecoes'> {
  const chamadas = new Set<string>(), escritas = new Set<string>(), retornos = new Set<string>();
  const condicoes = new Set<string>(), excecoes = new Set<string>();
  const texto = (n: ts.Node) => n.getText(fonte).replace(/\s+/g, ' ');
  const visitar = (n: ts.Node): void => {
    if (eFuncao(n) && n !== no) return;
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) chamadas.add(texto(n.expression));
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) escritas.add(texto(n.left));
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)) escritas.add(texto(n.operand));
    if (ts.isReturnStatement(n) && n.expression) retornos.add(texto(n.expression));
    if (ts.isIfStatement(n)) condicoes.add(texto(n.expression));
    if (ts.isThrowStatement(n)) excecoes.add(texto(n.expression));
    ts.forEachChild(n, visitar);
  };
  if (ts.isConstructorDeclaration(no)) for (const parametro of no.parameters) {
    if (parametro.modifiers?.some(m => [ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(m.kind))) escritas.add(`this.${parametro.name.getText(fonte)}`);
  }
  if (no.body) {
    visitar(no.body);
    if (!ts.isBlock(no.body)) retornos.add(texto(no.body));
  }
  return { chamadas: [...chamadas], escritas: [...escritas], retornos: [...retornos], condicoes: [...condicoes], excecoes: [...excecoes] };
}

/**
 * Extrai funções e contratos de fontes próprias. IDs usam escopo lexical e espécie,
 * independentes de linhas/comentários; overloads/callbacks usam ordinal por escopo.
 * @param fontes Arquivos UTF-8, caminhos relativos à raiz do repositório.
 * @param checker Resolução de tipos do programa; fixtures podem omiti-la.
 * @returns Inventário sem executar as fontes. Efeitos transitivos não são inferidos.
 */
export function analisarFontes(fontes: readonly ts.SourceFile[], checker?: ts.TypeChecker, normalizar: (arquivo: string) => string = a => a): Analise {
  const funcoes: Funcao[] = [], modulos: Modulo[] = [];
  for (const fonte of fontes) {
    const arquivo = normalizar(fonte.fileName).replaceAll('\\', '/');
    const contagens = new Map<string, number>();
    const imports: Modulo['imports'][number][] = [], tipos: Modulo['tipos'][number][] = [];
    const visitar = (no: ts.Node, escopo: readonly string[]): void => {
      let proximo = escopo;
      if (ts.isVariableDeclaration(no) && no.initializer && ts.isObjectLiteralExpression(no.initializer)) proximo = [...escopo, no.name.getText(fonte)];
      if (ts.isClassDeclaration(no) || ts.isClassExpression(no) || ts.isInterfaceDeclaration(no) || ts.isModuleDeclaration(no)) {
        const nome = no.name?.getText(fonte) ?? '[classe-anonima]';
        proximo = [...escopo, nome];
        if ('heritageClauses' in no) tipos.push({ nome: proximo.join('.'), especie: ts.SyntaxKind[no.kind],
          bases: no.heritageClauses?.flatMap(h => h.types.map(t => t.getText(fonte))) ?? [] });
      }
      if (ts.isImportDeclaration(no) && ts.isStringLiteral(no.moduleSpecifier)) imports.push({ destino: no.moduleSpecifier.text,
        somenteTipo: !!no.importClause?.isTypeOnly || !!(no.importClause?.namedBindings && ts.isNamedImports(no.importClause.namedBindings)
          && !no.importClause.name && no.importClause.namedBindings.elements.every(e => e.isTypeOnly)) });
      if (ts.isExportDeclaration(no) && no.moduleSpecifier && ts.isStringLiteral(no.moduleSpecifier)) imports.push({ destino: no.moduleSpecifier.text,
        somenteTipo: no.isTypeOnly || !!(no.exportClause && ts.isNamedExports(no.exportClause) && no.exportClause.elements.every(e => e.isTypeOnly)) });
      if (eFuncao(no)) {
        const nome = nomeDeclaracao(no, fonte), especie = ts.SyntaxKind[no.kind];
        const base = [...escopo, nome ?? '[callback]'].join('.');
        const chave = `${base}:${especie}`, ordinal = (contagens.get(chave) ?? 0) + 1; contagens.set(chave, ordinal);
        const id = `${arquivo}::${chave}${ordinal > 1 || !nome ? `#${ordinal}` : ''}`;
        const assinaturaTipo = checker?.getSignatureFromDeclaration(no);
        const assinatura = assinaturaTipo ? checker!.signatureToString(assinaturaTipo, no, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope)
          : `(${no.parameters.map(p => p.getText(fonte)).join(', ')}): ${no.type?.getText(fonte) ?? 'inferido'}`;
        const retorno = assinaturaTipo ? checker!.typeToString(checker!.getReturnTypeOfSignature(assinaturaTipo), no, ts.TypeFormatFlags.NoTruncation)
          : no.type?.getText(fonte) ?? 'inferido';
        const categoria = /\.(test|spec)\.[cm]?[jt]sx?$/.test(arquivo) ? 'teste' : !no.body ? 'contrato' : nome ? 'producao' : 'callback';
        funcoes.push({ id, arquivo, inicio: no.getStart(fonte), linha: fonte.getLineAndCharacterOfPosition(no.getStart(fonte)).line + 1,
          nome: base, categoria, especie, assinatura, parametros: no.parameters.map(p => p.getText(fonte)), retorno,
          modificadores: ts.canHaveModifiers(no) ? ts.getModifiers(no)?.map(m => m.getText(fonte)) ?? [] : [],
          documento: documentoDaDeclaracao(no, fonte), corpo: no.body?.getText(fonte) ?? '', ...fatosCorpo(no, fonte) });
        proximo = [...escopo, `${nome ?? '[callback]'}${ordinal > 1 || !nome ? `#${ordinal}` : ''}`];
      }
      ts.forEachChild(no, filho => visitar(filho, proximo));
    };
    visitar(fonte, []); modulos.push({ arquivo, imports, tipos });
  }
  return { funcoes, modulos };
}
