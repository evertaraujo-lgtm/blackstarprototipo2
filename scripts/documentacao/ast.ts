import ts from 'typescript';

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

/** Reconhece implementações e assinaturas explícitas, incluindo acessores/overloads; não executa a AST.
 * @remarks Reconhece nós de implementação e assinaturas explícitas do compilador, incluindo acessores, overloads e tipos funcionais; não procura funções em strings/comentários.
 * @contract f-cbeed1bbced45284
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
function eFuncao(no: ts.Node): no is Declaracao {
  return ts.isFunctionDeclaration(no) || ts.isFunctionExpression(no) || ts.isArrowFunction(no)
    || ts.isMethodDeclaration(no) || ts.isConstructorDeclaration(no) || ts.isGetAccessor(no)
    || ts.isSetAccessor(no) || ts.isMethodSignature(no) || ts.isCallSignatureDeclaration(no)
    || ts.isConstructSignatureDeclaration(no) || ts.isFunctionTypeNode(no) || ts.isConstructorTypeNode(no);
}

/** Usa nomes sintáticos de declaração/atribuição; callbacks sem nome recebem ordinal lexical.
 * @remarks Obtém nome sintático da declaração, propriedade ou atribuição, incluindo wrappers; ausência de nome fica para identificação ordinal de callback. Não deduz responsabilidade de domínio.
 * @contract f-e6665d7f99e9b59d
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
function nomeDeclaracao(no: Declaracao, fonte: ts.SourceFile): string | undefined {
  if (ts.isConstructorDeclaration(no)) return 'constructor';
  if (no.name) return no.name.getText(fonte);
  if (ts.isCallSignatureDeclaration(no)) return '[call]';
  if (ts.isConstructSignatureDeclaration(no)) return '[construct]';
  let pai = no.parent;
  while (ts.isParenthesizedExpression(pai) || ts.isAsExpression(pai) || ts.isSatisfiesExpression(pai) || ts.isConditionalExpression(pai)) pai = pai.parent;
  if (ts.isParameter(pai) && no.body) return pai.name.getText(fonte);
  if (ts.isTypeAliasDeclaration(pai) || ts.isPropertySignature(pai) || ts.isParameter(pai)) return `${pai.name.getText(fonte)}[tipo]`;
  if (ts.isVariableDeclaration(pai) || ts.isPropertyDeclaration(pai) || ts.isPropertyAssignment(pai)) return pai.name.getText(fonte);
  if (ts.isBinaryExpression(pai) && pai.operatorToken.kind === ts.SyntaxKind.EqualsToken) return pai.left.getText(fonte);
  return undefined;
}

/** Registra modificadores explícitos da função e da constante/propriedade que a hospeda; não infere acesso por nome.
 * @remarks Combina modificadores explícitos da função e da declaração hospedeira (export/private/static/readonly/async), distinguindo contexto de constante/propriedade sem inferir acesso por nome.
 * @contract f-6ca8ede078057b93
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
function modificadoresDeclaracao(no: ts.Node): readonly string[] {
  const diretos = ts.canHaveModifiers(no) ? ts.getModifiers(no)?.map(m => m.getText()) ?? [] : [];
  let alvo = no;
  if (ts.isArrowFunction(no) || ts.isFunctionExpression(no)) {
    let pai = no.parent;
    while (ts.isParenthesizedExpression(pai) || ts.isAsExpression(pai) || ts.isSatisfiesExpression(pai) || ts.isConditionalExpression(pai)) pai = pai.parent;
    if (ts.isVariableDeclaration(pai)) alvo = ts.isVariableDeclarationList(pai.parent) ? pai.parent.parent : pai;
    else if (ts.isPropertyDeclaration(pai)) alvo = pai;
  }
  const hospedeiro = ts.canHaveModifiers(alvo) ? ts.getModifiers(alvo)?.map(m => m.getText()) ?? [] : [];
  return [...new Set([...hospedeiro, ...diretos])];
}

/** Obtém JSDoc da declaração ou do statement que hospeda uma função atribuída a constante.
 * @remarks Lê JSDoc do nó ou declaração hospedeira de constante/propriedade; considera comentários imediatos pelos ranges do compilador e evita herdar cabeçalho da classe.
 * @contract f-11d6a0064dde5daa
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function documentoDaDeclaracao(no: ts.Node, fonte: ts.SourceFile): string {
  let alvo = no;
  if (ts.isArrowFunction(no) || ts.isFunctionExpression(no)) {
    let pai = no.parent;
    while (ts.isParenthesizedExpression(pai) || ts.isAsExpression(pai) || ts.isSatisfiesExpression(pai) || ts.isConditionalExpression(pai)) pai = pai.parent;
    if (ts.isVariableDeclaration(pai)) alvo = ts.isVariableDeclarationList(pai.parent) ? pai.parent.parent : pai;
    else if (ts.isPropertyAssignment(pai) || ts.isPropertyDeclaration(pai)) alvo = pai;
  }
  const documentos = (alvo as ts.Node & { jsDoc?: readonly ts.JSDoc[] }).jsDoc ?? [];
  if (documentos.length) return documentos.map(doc => doc.getText(fonte)).join('\n');
  return [...(ts.getLeadingCommentRanges(fonte.text, alvo.getFullStart()) ?? []),
    ...(ts.getTrailingCommentRanges(fonte.text, alvo.getFullStart()) ?? [])]
    .filter((r, i, todos) => todos.findIndex(t => t.pos === r.pos) === i).map(r => fonte.text.slice(r.pos, r.end))
    .filter(t => t.startsWith('/**')).join('\n');
}

/** Extrai corpo e inicializações de instância do construtor, sem expandir efeitos de closures.
 * @remarks Extrai chamadas, escritas, retornos, condições e throws do corpo corrente; separa closures filhas e registra campos/parameter properties de construtores, excluindo estáticos/declare/abstract. Não infere efeitos transitivos.
 * @contract f-cb2d6c5f0a0853ad
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
function fatosCorpo(no: Declaracao, fonte: ts.SourceFile, impressor: ts.Printer): Pick<Funcao, 'chamadas' | 'escritas' | 'retornos' | 'condicoes' | 'excecoes'> {
  const chamadas = new Set<string>(), escritas = new Set<string>(), retornos = new Set<string>();
  const condicoes = new Set<string>(), excecoes = new Set<string>();
  /** Formata nó pelo Printer, preservando literais e removendo comentários da evidência; não escreve fontes. @contract f-bf548e51ccbb3b24 @reviewed M12-DOC: implementação lida. */
  const texto = (n: ts.Node) => impressor.printNode(ts.EmitHint.Unspecified, n, fonte);
  /** Percorre corpo corrente e acumula evidências em conjuntos locais, interrompendo em declarações funcionais filhas; não executa os nós. @contract f-85856e7d2c456faf @reviewed M12-DOC: implementação lida. */
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
  if (ts.isConstructorDeclaration(no) && (ts.isClassDeclaration(no.parent) || ts.isClassExpression(no.parent))) {
    for (const membro of no.parent.members) {
      if (!ts.isPropertyDeclaration(membro) || membro.modifiers?.some(m =>
        [ts.SyntaxKind.StaticKeyword, ts.SyntaxKind.DeclareKeyword, ts.SyntaxKind.AbstractKeyword].includes(m.kind))) continue;
      const nome = membro.name.getText(fonte);
      escritas.add(ts.isComputedPropertyName(membro.name) ? `this${nome}`
        : ts.isStringLiteral(membro.name) || ts.isNumericLiteral(membro.name) ? `this[${nome}]` : `this.${nome}`);
      if (membro.initializer) visitar(membro.initializer);
    }
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
 * @remarks Percorre fontes próprias e emite inventário de funções/contratos, módulos, herança e imports. IDs usam escopo/espécie/ordinal; TypeChecker fornece assinaturas inferidas quando disponível. Não executa fontes nem aprova semântica.
 * @contract f-252d75a79d2738ad
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function analisarFontes(fontes: readonly ts.SourceFile[], checker?: ts.TypeChecker, normalizar: /** Porta de normalização de caminhos da análise AST: devolve caminho textual para IDs portáveis, sem executar fonte analisada. @contract f-ec30189f53efb391 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ (arquivo: string) => string = /** Normalizador padrão de caminho: devolve o argumento intacto quando o adaptador não fornece relativização. @contract f-d90e311d87e6f37b @reviewed M12-DOC: implementação lida. */
                                                                                                                                     a => a): Analise {
  const funcoes: Funcao[] = [], modulos: Modulo[] = [];
  const impressor = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  for (const fonte of fontes) {
    const arquivo = normalizar(fonte.fileName).replaceAll('\\', '/');
    const contagens = new Map<string, number>();
    const imports: Modulo['imports'][number][] = [], tipos: Modulo['tipos'][number][] = [];
    /** Mantém escopo lexical, classifica nós, identifica wrappers/propriedades/contratos/callbacks e acumula inventário do arquivo; callbacks de teste permanecem em categoria própria. @contract f-715853e05bf0994f @reviewed M12-DOC: implementação lida. */
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
          modificadores: modificadoresDeclaracao(no),
          documento: documentoDaDeclaracao(no, fonte), corpo: no.body?.getText(fonte) ?? '', ...fatosCorpo(no, fonte, impressor) });
        proximo = [...escopo, `${nome ?? '[callback]'}${ordinal > 1 || !nome ? `#${ordinal}` : ''}`];
      }
      ts.forEachChild(no, filho => visitar(filho, proximo));
    };
    visitar(fonte, []); modulos.push({ arquivo, imports, tipos });
  }
  return { funcoes, modulos };
}
