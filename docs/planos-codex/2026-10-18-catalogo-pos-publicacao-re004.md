# Catálogo após publicação documental do RE-004

Complexidade: **2/10**. Base: `f709b6a`. Atualizar documentação e inventário
oficial após as mudanças remotas, sem alterar o comportamento do programa.

## CONTRATO DE IMPACTO FUNCIONAL

Registrado antes das alterações de comentários nas fontes. Subsistemas:
documentação AST e integração do site institucional. Nenhuma função criada,
removida ou modificada em sua implementação ou assinatura nesta execução.
Cinco funções recebem somente atualização de JSDoc:

| Identificador e assinatura | Responsabilidade, dependências e efeitos existentes |
|---|---|
| `site/build/pluginInstitucional.ts::pluginInstitucional(raiz: string): Plugin` | Configura o plugin Vite para HTML, PDF e Markdown; depende dos catálogos canônicos e dos hooks de servidor/build. Mantém o indicador local de desenvolvimento. |
| `site/build/pluginInstitucional.ts::pluginInstitucional.atenderInstitucional(req: IncomingMessage, res: ServerResponse, next: (erro?: unknown) => void): void` | Resolve rotas cadastradas; altera `req.url` ou escreve cabeçalhos/bytes HTTP. Depende de URL, catálogos, leitura FS e `next`; encaminha falhas de leitura. |
| `site/build/pluginInstitucional.ts::pluginInstitucional.generateBundle(_opcoes: NormalizedOutputOptions, bundle: OutputBundle): void` | Realoca HTMLs cadastrados e emite documentos canônicos pelo Rollup. Lê FS, altera bundle e recusa ausência/colisão dos HTMLs. |
| `scripts/site/verificar.ts::resolverRecurso(dist: string, caminho: string): string` | Resolve URLs e rotas institucionais explícitas dentro de dist; depende de path/FS; somente leitura, lança erro em escape ou ausência. |
| `scripts/site/verificar.ts::verificarDistribuicao(raiz: string): { paginas: number; imagens: number; referencias: number; pdfIdentico: boolean }` | Confere páginas, referências, PDFs, Markdown e Hosting. Depende de FS/path e auxiliares abaixo; somente leitura, lança erro em inconsistência. |

Funções reutilizadas sem alteração, inclusive documental:

| Identificador e assinatura | Responsabilidade, dependências e efeitos |
|---|---|
| `site/build/pluginInstitucional.ts::pluginInstitucional.configureServer(server: ViteDevServer): void` | Ativa modo de desenvolvimento e registra middleware no Vite. |
| `site/build/pluginInstitucional.ts::pluginInstitucional.configurePreviewServer(server: PreviewServer): void` | Registra middleware no preview; consulta a saída compilada. |
| `scripts/site/verificar.ts::listarArquivos(pasta: string): string[]` | Enumera arquivos por FS de forma recursiva e ordenada; somente leitura. |
| `scripts/site/verificar.ts::hashArquivo(caminho: string): string` | Lê bytes e retorna SHA-256, sem normalização nem escrita. |
| `scripts/documentacao/cli.ts::executarAuditoria(raiz: string, modo: 'gerar' \| 'verificar'): { cobertura: Cobertura; divergencias: Divergencias; catalogoDesatualizado: boolean; mapaDesatualizado: boolean }` | Orquestra AST/TypeChecker e comparação dos artefatos; somente o modo gerar escreve catálogo, inventário e índice do mapa. |
| `scripts/documentacao/cli.ts::hashExecutavel(texto: string, arquivo: string): string` | Referência existente de comparação do JavaScript emitido sem comentários; depende do compilador TypeScript e SHA-256. |

Invariantes: preservar código executável, assinaturas, âncoras `@contract`,
marcas de revisão existentes e evidências históricas. Não acrescentar
`@reviewed` pela geração. Nenhuma unidade física ou passo temporal é afetado.
Catálogo/inventário e índice AST serão produzidos exclusivamente por
`npm run docs:gerar`; a seção manual do mapa descreverá as rotas/documentos.

Diagnóstico inicial: 1.653 funções de produção, todas com JSDoc e contrato;
catálogo desatualizado e divergências em callbacks de produção/testes recebidos
no commit remoto. O índice AST do mapa já estava estruturalmente atualizado.

Critérios de aceite: auditoria oficial sem divergências/lacunas; verificação de
tipos e build válidos; JavaScript emitido pelos arquivos comentados idêntico ao
da base. Manter a dispensa de testes solicitada pelo operador: sem suíte nem
smoke nesta execução; a verificação documental é estática.

## Resultados

- `npm run docs:gerar`: concluído pelo gerador oficial.
- `npm run docs:verificar`: aprovado, sem lacunas nem divergências;
  catálogo e mapa atualizados.
- Cobertura: 1.653 funções de produção, 1.653 com JSDoc e contrato;
  147 contratos declarativos, 786 callbacks e 1.363 funções de testes
  inventariadas. Inventariar testes não significa executá-los.
- As 924 marcas de revisão anteriores foram preservadas; nenhuma acrescentada.
  A auditoria de presença não certifica aprovação semântica dos contratos.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; saída local atualizada.
- `git diff --check`: aprovado.
- Comparação estática pelo `hashExecutavel` oficial: JavaScript emitido dos dois
  arquivos com comentários alterados preservado em relação a `f709b6a`.
  A primeira tentativa foi impedida por `spawnSync git EPERM` no sandbox;
  a mesma consulta somente leitura foi reexecutada com permissão e aprovada.
- Sem testes automatizados, smoke, alteração de lógica, commit ou deploy.

SHA-256 da AST do JavaScript emitido sem comentários, idêntico antes/depois:

| Arquivo | SHA-256 |
|---|---|
| `scripts/site/verificar.ts` | `8bdeb6ae411562b3d4a3a50731e0ac5f2a452a6e526edade00644a7e9b3804a1` |
| `site/build/pluginInstitucional.ts` | `0a4ad592eb810560af66e117058928528be254c3fc639b370428ad8002da22ef` |
