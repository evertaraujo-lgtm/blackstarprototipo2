# Catálogo — integração dos cadernos HTML RE-004

Complexidade: **2/10**. Durante o pedido de atualização do Git foi encontrado
o commit remoto `2e6b034`. A atualização documental anterior foi registrada em
`acaf816`; a integração ocorreu sem conflitos em `7420bff`, na própria branch
`codex/re-002`, preservando o histórico. Nenhuma integração na main ou deploy.

## CONTRATO DE IMPACTO FUNCIONAL

Registrado antes das edições documentais desta integração. Base executável:
`7420bff`. O conversor Markdown chegou pelo remoto; não é implementado nem
refatorado nesta execução. Acrescentar JSDoc e contratos às oito funções
recebidas, atualizar as descrições dos consumidores e regenerar o catálogo.
Nenhuma implementação, assinatura ou regra física será alterada.

| Identificador e assinatura | Responsabilidade, dependências e efeitos existentes |
|---|---|
| `site/build/markdownEstudos.ts::escapar(s: string): string` | Substitui caracteres especiais de HTML; depende de String.replace, sem efeitos externos. |
| `site/build/markdownEstudos.ts::inline(texto: string): string` | Reconhece links HTTP(S), negrito e código do subconjunto; chama escapar e a si mesma para negrito. Constrói string sem DOM/FS. |
| `site/build/markdownEstudos.ts::cols(line: string): string[]` | Remove bordas da linha de tabela e separa colunas por barra vertical; consulta strings, sem efeitos externos. |
| `site/build/markdownEstudos.ts::tableDivider(line: string): boolean` | Reconhece separador de tabela com duas ou mais células válidas; depende de cols e regex, sem efeitos externos. |
| `site/build/markdownEstudos.ts::listType(line: string): 'ul' \| 'ol' \| null` | Identifica marcador de lista; consulta regex, sem efeitos externos. |
| `site/build/markdownEstudos.ts::beginsBlock(lines: string[], i: number): boolean` | Detecta início de bloco no índice válido fornecido; consulta listType/tableDivider e linhas, sem mutação. |
| `site/build/markdownEstudos.ts::converterMarkdownSeguro(source: string): string` | Converte blocos do subconjunto em fragmento HTML escapado. Depende dos seis auxiliares, usa somente acumuladores locais; lança em bloco de código ou tabela inconsistente. |
| `site/build/markdownEstudos.ts::paginaEstudoMarkdown(source: string, name: string): string` | Valida nome cadastrado e título, compõe HTML com navegação e download .md; depende de escapar/converterMarkdownSeguro e catálogo local de nomes. Sem IO; lança em nome/título inválido. |
| `site/build/pluginInstitucional.ts::pluginInstitucional(raiz: string): Plugin` | Somente comentário atualizado para incluir HTML derivado do Markdown; hooks e dependências preservados. |
| `site/build/pluginInstitucional.ts::pluginInstitucional.atenderInstitucional(req: IncomingMessage, res: ServerResponse, next: (erro?: unknown) => void): void` | Somente comentário atualizado: no dev também lê Markdown e responde HTML derivado via paginaEstudoMarkdown; no preview usa arquivos estáticos. Efeitos HTTP existentes preservados. |
| `site/build/pluginInstitucional.ts::pluginInstitucional.generateBundle(_opcoes: NormalizedOutputOptions, bundle: OutputBundle): void` | Somente comentário atualizado: emite fontes Markdown e artigos HTML derivados, além dos HTMLs institucionais e PDFs. Leitura FS, emissão Rollup e erros existentes preservados. |
| `scripts/site/verificar.ts::verificarDistribuicao(raiz: string): { paginas: number; imagens: number; referencias: number; pdfIdentico: boolean }` | Somente comentário atualizado: também confere presença do artigo HTML e link de download. Dependências e comportamento existentes preservados. |

Reutilizar sem alteração as funções de auditoria e geração, resolução de
recursos, enumeração, hash de arquivo e hooks de servidor já individualizadas
no [contrato anterior](2026-10-18-catalogo-pos-publicacao-re004.md).
O comparador `scripts/documentacao/cli.ts::hashExecutavel(texto: string,
arquivo: string): string` comprovará preservação em relação à base integrada.

Invariantes: manter as fontes canônicas e o subconjunto Markdown existente;
nenhuma promessa de suporte a Markdown completo, certificação de segurança ou
qualificação física. Não acrescentar revisão semântica aprovada por geração.
Callbacks/testes são apenas inventariados; não modificar testes recebidos.

Aceite: catálogo/inventário e mapa atualizados pelo gerador oficial, auditoria
sem lacunas/divergências, tipos e build aprovados, código emitido preservado.
Sem executar testes ou smoke, conforme a dispensa mantida nesta atualização.

## Resultados

- `npm run docs:gerar`: aprovado; 1.661 funções de produção, todas com JSDoc
  e contrato, 147 contratos declarativos, 792 callbacks e 1.372 funções de
  testes inventariadas. Nenhum teste foi executado pela geração.
- As 924 marcas de revisão anteriores foram preservadas; nenhuma acrescentada.
- `npm run docs:verificar`: aprovado, sem lacunas nem divergências; catálogo
  e mapa atualizados. A checagem de presença não certifica revisão semântica.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; artigos HTML presentes na saída local.
- `npm run site:verificar`: aprovado; sete páginas principais, dez imagens,
  169 referências, PDFs idênticos; inclui conferência das fontes Markdown e
  dos artigos derivados. Trata-se de consulta estática, sem smoke de navegador.
- `git diff --check`: aprovado.
- Código emitido dos três arquivos TypeScript comentados preservado segundo
  `hashExecutavel`, comparado à base integrada `7420bff`.

SHA-256 da AST emitida sem comentários, idêntico antes/depois:

| Arquivo | SHA-256 |
|---|---|
| `scripts/site/verificar.ts` | `545ae9d86ad34589d95f07696ddf55b16a06e3334711792b86e993f7556a1b22` |
| `site/build/markdownEstudos.ts` | `9327e4972fd1e0a4682df1b5dbb5b3b8b26f966a2c05422d9efeaac7d6987494` |
| `site/build/pluginInstitucional.ts` | `e76c40d73532d937af8ebbb2f44e1fd65dc4a6c895e8c47704d158b534d143fa` |
