# M12-DOC-FIX — Reprodutibilidade do catálogo

Referência: `09e7a4ec4ea3564b64a606e2b8b090ec9fcd15dc`. `main` limpa e
sincronizada com `origin/main` no início. Escopo: infraestrutura documental,
seus testes/artefatos e qualificação da CI; nenhum módulo do simulador será editado.

## CONTRATO DE IMPACTO FUNCIONAL

Objetivo: tornar tipos inferidos do catálogo independentes do caminho absoluto
do checkout, preservando detecção de divergências reais e identidade funcional.

| Função / assinatura | Ação, responsabilidade, dependências e efeitos |
|---|---|
| `scripts/documentacao/ast.ts::analisarFontes(fontes: readonly ts.SourceFile[], checker?: ts.TypeChecker, normalizar: (arquivo: string) => string = a => a): Analise` | Modificar somente formatação de tipos de retorno pelo TypeChecker, preservando aliases no contexto lexical. Leitura AST/tipos, resultado em memória; não executa fontes nem escreve arquivos. Assinatura pública preservada. |
| `scripts/documentacao/projeto.ts::listarFontes(raiz: string): readonly string[]` | Reutilizar enumeração ordenada de fontes próprias. Leitura FS; sem mudança. |
| `scripts/documentacao/projeto.ts::carregarProjeto(raiz: string): { programa: ts.Program; analise: Analise }` | Reutilizar programa/TypeChecker do tsconfig e relativização dos IDs. Leitura FS, cwd deve ser a raiz; sem mudança. |
| `scripts/documentacao/catalogo.ts::gerarCatalogo(analise: Analise): string` | Reutilizar renderização integral, inclusive limites de tamanho e categorias; retorna Markdown sem escrita. |
| `scripts/documentacao/catalogo.ts::estrutura(funcoes: readonly Funcao[]): readonly EntradaEstrutural[]` | Reutilizar comparação de IDs/assinaturas/modificadores/categoria; sem mudança. |
| `scripts/documentacao/catalogo.ts::compararInventarios(atual: readonly EntradaEstrutural[], anterior: readonly EntradaEstrutural[]): Divergencias` | Reutilizar detecção de adições/remoções/alterações reais, sem aceitar deriva automaticamente. |
| `scripts/documentacao/catalogo.ts::ancoraFuncao(id: string): string` | Reutilizar SHA-256 truncado dos IDs lexicais; todas as âncoras existentes serão preservadas. |
| `scripts/documentacao/auditoria.ts::verificarDocumentacao(analise: Analise): Cobertura` | Reutilizar exigência de JSDoc/âncora e distinção presença/revisão; nenhuma redução de exigência. |
| `scripts/documentacao/cli.ts::executarAuditoria(raiz: string, modo: 'gerar' \| 'verificar')` | Reutilizar gerar/verificar; somente modo explícito gerar escreve catálogo/inventário/mapa. Verificar continua somente leitura e falha por artefatos divergentes. |
| `scripts/documentacao/cli.ts::hashExecutavel(texto: string, arquivo: string): string` | Reutilizar evidência de preservação executável; emite/analisa JavaScript sem executar simulação. |
| `scripts/documentacao/cli.ts::gerarIndiceModulos(analise: Analise): string` | Reutilizar atualização do índice do mapa, sem reescrever diagnóstico manual. |

Novas funções de produção propostas: nenhuma. Funções removidas: nenhuma.
Entry point `scripts/auditar-documentacao.ts` e workflow mantêm a verificação
antes dos testes, sem geração automática. Auxiliares novos de testes criarão
fixtures isoladas e executarão a CLI em subprocessos, com limpeza restrita às
pastas temporárias próprias; serão inventariados na categoria de testes.

Invariantes: simulador integralmente preservado, contratos públicos e IDs estáveis,
Unicode/UTF-8 e LF preservados, categorias completas, nenhuma normalização cega
sobre valores literais, igualdade de catálogo em checkouts equivalentes e
`docs:verificar` sem escrita. Unidades/modelos físicos não entram nesta correção.

Testes: tipos importados inferidos em dois caminhos de checkout distintos com
Unicode/espaços; geração repetida; IDs/âncoras estáveis; assinatura alterada e
catálogo adulterado detectados; ausência de escrita em verificar. Executar todos
os comandos do workflow, incluindo suíte determinística completa, e confirmar CI
remota do commit enviado, conforme autorização desta solicitação.

## A — Reprodução preservando a falha

Antes de qualquer geração, `npm run docs:verificar` passou na árvore original.
Uma cópia limpa de `git archive HEAD` em `/tmp/blackstar-m12fix-limpo.Z7JBJ7`,
com `npm ci` usando o package-lock, reproduziu exatamente a falha: cobertura
1.461/1.461 e nenhuma divergência estrutural, mas catálogo desatualizado.
Nenhum `docs:gerar` foi executado antes dessas verificações.

Ambiente local: Linux Mint 22.3 (base Ubuntu noble), kernel 6.14.0-37,
Node 20.20.0, npm 10.8.2, TypeScript 5.9.3, Vite 7.3.6, Vitest 3.2.7.
CI original: Ubuntu 24.04.5, Node 20.20.2, npm 10.8.2. A diferença de patch de
Node é registrada; a reprodução local já ocorre somente mudando o checkout.
A execução remota final qualificará o ambiente exato do workflow.

A [execução original 38703475896](https://github.com/evertaraujo-lgtm/blackstarprototipo2/actions/runs/38703475896)
foi consultada: auditoria falhou e testes/tipos/build foram pulados. Logs do job
`116317024355` confirmam o diagnóstico fornecido pelo operador.

## B — Evidência da divergência original

O gerador foi chamado apenas em memória, salvando candidato em `/tmp`, sem
substituir artefatos versionados. Primeira diferença: **byte 87.308 (base zero),
linha 797**. O tipo de saída de `executarAuditoria` contém
`import("/media/everton/.../scripts/documentacao/auditoria").Cobertura` na referência,
mas `import("/tmp/blackstar-m12fix-limpo.Z7JBJ7/scripts/documentacao/auditoria").Cobertura`
na cópia limpa.

| Arquivo original / candidato | Bytes | SHA-256 |
|---|---:|---|
| Versionado | 4.333.503 | `32fb147efb0e547c363f4dbe90f8c38fcb53647e931fe700afbf74a2b25ece20` |
| Gerado no checkout limpo | 4.329.667 | `1e6457b6981cedc961bc026e5c4da1f3122f4976988b20142090e56e604162cb` |

A diferença de tamanho é -3.836 bytes. Há **26 trechos de uma linha**, todos no campo **Saídas** e todos contendo
prefixos de checkout diferentes. Ambos os arquivos são UTF-8/LF (zero CRLF).
Não houve alteração de ordem, IDs ou assinaturas. A renderização em
`gerarCatalogo` passa `f.retorno` para `evidencias`; o limite de exibição de tipos
longos também desloca a abreviação quando o tamanho do caminho muda. É efeito
secundário da mesma dependência de checkout, sem mudança nas fontes/tipos.
Esses tamanhos/hashes referem-se ao nome concreto do diretório limpo acima.

## C — Correção proposta na origem

Em `analisarFontes`, `signatureToString` já recebia a declaração como contexto,
e a flag `UseAliasDefinedOutsideCurrentScope`, mas `typeToString` do retorno
recebia apenas `NoTruncation` (também já recebia a declaração). A flag explícita
substituía o padrão do compilador, que inclui aliases. Sem ela, tipos importados
indiretamente viram `import("/caminho/absoluto/modulo").Tipo`; com ela, o mesmo
TypeChecker usa o alias simbólico, consistente com a assinatura já inventariada.
Uma fixture mínima em dois diretórios mostrou `{ dado: import("/tmp/.../medição").Medida; }`
antes e `{ dado: Medida; }` em ambos depois. Restaurar a flag no único ponto de
formatação resolve na origem, sem regex sobre caminhos/literais ou perda de tipos.

## D — Regressões adicionadas

Arquivo `scripts/documentacao/reprodutibilidade.test.ts`: dois testes de regressão
com programas TypeScript e CLI reais, sem mocks do carregador. O primeiro expõe
a saída problemática com as flags antigas em duas raízes e exige igualdade com
a extração corrigida, preservando Unicode, valor literal com dois espaços,
nomes dos tipos, IDs e âncoras. O segundo gera/verifica/regera em dois checkouts,
compara bytes e todos os arquivos por SHA-256/mtime; adulteração de catálogo e
assinatura deve falhar com código 1 sem escrever nada.

Auxiliares de teste efetivamente introduzidos:

| Função (no novo arquivo de testes) | Assinatura / responsabilidade / efeitos |
|---|---|
| `novaRaiz` | `(nome: string): string`; cria checkout temporário próprio e registra limpeza. |
| `observar` | `(parametro?: string): string`; produz texto-fonte de fixture, sem executar simulador. |
| `escreverFontes` | `(raiz: string): void`; grava fontes, tsconfig e mapa mínimos só em /tmp. |
| `analisar` | `(raiz: string): { programa; fontes; checker; analise }`; cria TypeChecker real e extrai AST relativa, somente leitura das fixtures. |
| `executar` | `(raiz: string, modo: 'gerar' \| 'verificar'): string`; executa CLI real em subprocesso Node e captura saída. Gerar escreve artefatos da fixture; verificar não escreve. |
| `lerArtefatos` | `(raiz: string): string[]`; lê os três artefatos documentais para igualdade integral. |
| `estadoArquivos` | `(raiz: string): object`; captura SHA-256/mtime de todos os arquivos da fixture, sem alterá-los. |
| `original` (local ao teste) | `(p: ReturnType<typeof analisar>): string`; reproduz formatação antiga do TypeChecker para comprovar causa; não é caminho de execução da ferramenta. |

Callbacks de teste também são inventariados. São 21 entradas AST novas,
exclusivamente na categoria `teste`; **zero IDs removidos ou assinaturas
preexistentes alteradas**. Nenhuma função de produção nova.

Os 21 testes documentais (19 existentes + 2 novos) passaram. A primeira execução
no sandbox recusou `spawnSync` por EPERM; a execução autorizada fora do sandbox
passou, sem remover a verificação por subprocesso. O teste de integração tem
orçamento de 60 s para sete partidas reais do Node/CLI, independente do tempo
simulado e sem alterar qualquer duração ou tolerância física histórica.

A alteração executável da ferramenta limita-se à inclusão de uma flag no
formatador de retorno de `analisarFontes`; seu JSDoc foi atualizado. Não houve
alteração em `projeto`, `catalogo`, `cli`, `auditoria`, entrypoint, workflow,
package.json ou package-lock. O mapa foi complementado e artefatos regenerados.

## E — Qualificação final

A cópia instalada por `npm ci` já passou em `docs:verificar` com a correção,
sem gerar antes dessa verificação. Estão preservadas 1.461 funções de produção,
137 contratos, 577 callbacks e 936 revisões explícitas. A categoria de testes
passou de 1.098 para 1.119 entradas AST; esses números não são contagens de casos
executados pelo Vitest.

A geração foi repetida após a correção: SHA-256 dos três artefatos idênticos e
`git diff` dos artefatos idêntico antes/depois da segunda geração. Os bytes também
coincidem entre árvore original e checkout limpo; a verificação de catálogo na
cópia limpa passou sem regeneração prévia.

| Artefato | SHA-256 comum aos dois checkouts |
|---|---|
| Catálogo | `c5cc86a35fd94043a40666374adf82bf2352c2181d9c8c9f9523efd71654da6a` |
| Inventário | `c350a1b4575d8c78b79fb995e1483fa0725fc3331b0f044bd7d93ecbc099bbb6` |
| Mapa | `ee4620f6a83506ce13067f215bf354f82eb88d7050ff2dbf4d71ddac0b7db9ba` |

`git diff --quiet 09e7a4e -- src` confirmou preservação byte a byte de todo o
simulador, controles, missões, hidrodinâmica, telemetria, replay e apresentação.
Nenhum teste histórico foi editado. Não há novas dependências nem deploy.

### Resultado local completo (checkout instalado com npm ci)

| Verificação | Resultado |
|---|---|
| Auditoria AST, sem geração anterior à verificação limpa | Aprovada |
| `npm run test:documentacao` | 21 casos aprovados em 3 arquivos |
| `npm test -- --run --maxWorkers=1` | **547 casos aprovados em 83 arquivos**, 1.241,81 s |
| `npm run typecheck` | Aprovado |
| `npm run typecheck:missoes` | Aprovado |
| `npm run build` | Aprovado (2,53 s), assets da aplicação preservados |
| Segunda geração / hashes / diff | Idênticos |
| Preservação dos arquivos src e testes históricos | Integral, sem alterações |

A suíte incluiu missão/bancada, controles, sensores, contatos/dano, órbitas inertes,
hidrodinâmica, amerissagem passiva, replay e equivalência da trajetória M11-P.
Nenhuma falha preexistente foi encontrada nesta execução. Nenhum teste foi
removido, ignorado, encurtado ou enfraquecido.

### Commit e CI remota

Commit funcional a registrar com a mensagem solicitada:
`fix(M12-DOC): estabiliza geracao do catalogo e auditoria CI`.
A CI remota será acompanhada para esse SHA após o envio autorizado. A tarefa
permanece sem aprovação final até todos os estágios remotos terminarem com sucesso.

### Limites

Qualificação local em Linux/Node 20 com dependências travadas; a CI confirma
Ubuntu/Node 20 do workflow. Não se promete igualdade entre versões distintas do
TypeScript; uma atualização do compilador exige regeneração e revisão dos tipos.
O auditor continua verificando estrutura/presença, sem certificar a qualidade
semântica de todos os contratos ou homologar modelos físicos.
