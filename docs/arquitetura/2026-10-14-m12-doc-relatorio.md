# M12-DOC — Auditoria e contratos funcionais

Base estável: `555635b` (M11-P-D); `main` limpa e sincronizada no início.
Escopo: documentação e análise estática; nenhum parâmetro físico, algoritmo de
produção, contrato público ou teste histórico será alterado. Sem push/deploy.

## CONTRATO DE IMPACTO FUNCIONAL

**Objetivo técnico:** tornar módulos e funções consultáveis e detectar deriva do
inventário com o compilador TypeScript já instalado.

**Subsistemas afetados:** todos os módulos TypeScript próprios, somente por
comentários; ferramentas de desenvolvimento, documentação e CI.

**Funções existentes reutilizadas:** todas as declarações serão inventariadas,
sem chamadas novas no simulador. Na ferramenta: `ts.createProgram`,
`ts.createSourceFile`, `ts.forEachChild`, `TypeChecker.getSignatureFromDeclaration`,
`signatureToString`, `getSymbolAtLocation`, `ts.resolveModuleName` e JSDoc AST.
O compilador fornece sintaxe/tipos; não substitui avaliação técnica.

**Funções existentes a modificar:** somente JSDoc das funções de produção
identificadas no catálogo. Construtores, acessores, métodos, funções locais e
closures nomeadas fazem parte desse conjunto. A lista exata e as assinaturas
serão registradas no catálogo; o diff por lote delimita as alterações.

**Funções novas propostas (ferramenta, fora da simulação):**

| Função | Responsabilidade / assinatura | Dependências e efeitos |
|---|---|---|
| `analisarFontes(fontes, checker?)` | AST → inventário, chamadas, escritas e imports | TypeScript; consulta, não executa código analisado |
| `carregarProjeto(raiz)` | configurações/fontes → programa e análise | FS/TypeScript; leitura local |
| `compararInventarios(atual, anterior)` | funções → adições/remoções/assinaturas divergentes | estruturas em memória; sem escrita |
| `gerarCatalogo(analise)` | análise → Markdown consultável | contratos extraídos e referências; sem escrita |
| `verificarDocumentacao(analise)` | contratos → cobertura/lacunas | AST; não comprova qualidade semântica |
| `executarAuditoria(raiz, modo)` | orquestra gerar/verificar | FS; grava somente artefatos documentais em modo explícito |

Auxiliares adicionais serão incluídos nesta seção antes da conclusão.
**Funções removidas:** nenhuma.

**Invariantes:** cinemática pertence ao core; SI; determinismo; comentários não
alteram JavaScript emitido; domínio sem DOM; nenhuma cobertura textual será
apresentada como revisão semântica. Descrições ambíguas serão marcadas
**REVISÃO NECESSÁRIA**. Testes associados são evidência estática de referência,
não afirmação de cobertura de execução de todas as ramificações.

**Validação:** fixtures AST (construtores, getters/setters, privados/estáticos,
funções locais, constantes, callbacks, overloads e assinaturas); detecção de
adição/remoção/deriva e documentação faltante; comparação do JavaScript emitido
antes/depois dos comentários; typechecks geral e headless; auditoria e build.
Não repetir a campanha física de 20 minutos sem alteração executável (§65).

## Execução

### A — Mapa arquitetural

Leitura integral de AGENTS.md/README.md, entradas, configurações, núcleo,
referenciais, integração, hidrodinâmica, missão e composição compartilhada.
O primeiro levantamento AST inclui 209 arquivos (incluindo ferramentas ainda
em construção): 1.437 funções nomeadas de produção, 533 callbacks, 53 contratos
e 1.051 funções em testes. Apenas 182 funções de produção tinham JSDoc.
Nenhum ciclo de importação estática local encontrado, com/sem tipos.
Sobreposições e autoridade por convenção foram registradas no mapa, sem refatorar.
Os números finais serão recalculados após a própria ferramenta estar concluída.
