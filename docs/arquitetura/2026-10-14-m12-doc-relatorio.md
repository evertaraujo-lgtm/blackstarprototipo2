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

### B — Inventário integral pelo compilador

Gerador TypeScript com AST e TypeChecker; inclui construtores, métodos,
acessores, funções internas/constantes/atribuições, overloads, tipos de função,
interfaces e callbacks separados. Testes possuem seção própria. IDs não usam
número de linha; visibilidade/estático e assinatura inferida são comparados.

Nesta revisão intermediária: 1.459 implementações nomeadas, 573 callbacks,
137 assinaturas declarativas e 1.074 funções em testes (inclui a ferramenta).
Os campos do catálogo registram fatos de implementação; ausência de propósito
confirmado aparece como **REVISÃO NECESSÁRIA**. Imports diretos de testes são
associações estáticas, não prova de cobertura específica.

Validação: 8 testes AST aprovados e typecheck aprovado. A ausência de contratos
JSDoc é o diagnóstico inicial, a tratar nos lotes C; o checker ainda não foi
adicionado ao CI. Nenhuma dependência nova. Não foi encontrado extrator AST
focado no Protótipo 1 para reutilizar.

#### Atualização do contrato de impacto — auxiliares efetivamente necessários

A lista completa e assinaturas destas funções ficam no catálogo em
`scripts/documentacao/`: `eFuncao`, `nomeDeclaracao`, `documentoDaDeclaracao`,
`fatosCorpo` e closures de visita (leitura AST); `listarFontes`/`percorrer`
(leitura FS); `estrutura`, `ancoraFuncao`, `escapar`, `evidencias`,
`descricaoDocumento`, `responsabilidadeExtraida` (projeção/renderização em memória);
`ciclosImportacao`/`visitar`, `gerarIndiceModulos` (grafo e índice);
`hashExecutavel`, `verificarBaseExecutavel` (emissão sem comentários e consultas
Git contra a base fixa `555635b`). Nenhuma executa o código do simulador.
O entrypoint `scripts/auditar-documentacao.ts` orquestra os modos explícitos.

Catálogo e inventário são gerados; o texto arquitetural é curado manualmente,
com somente o índice entre marcadores atualizado pela ferramenta.

### C1 — Núcleo, ambiente, geometria e solucionadores

25 módulos receberam contratos junto às declarações (243 pontos de edição).
Gravidade, referenciais, sequência do mundo, empuxo/arrasto, volume deslocado,
cache da ilha e integração têm descrições confrontadas com implementações.
Contratos complexos ainda não confirmados estão explicitamente marcados para
revisão, com chamadas, escritas, retornos e condições no catálogo.

JavaScript emitido com `removeComments` permaneceu idêntico em **cada arquivo**
antes/depois do lote; assinaturas permanecem no mesmo inventário. Catálogo e
linhas de navegação foram regenerados. Nenhuma constante/algoritmo foi alterado.

### C2 — Corpos, vínculos e componentes operacionais

37 módulos de objetos/conexões receberam cabeçalhos proporcionais à função.
As descrições de energia, propulsão, veículo composto e observação de integridade
foram confrontadas com os corpos das implementações. Getters simples e
encaminhamentos registram o valor/dependência efetivos; descrições complexas
não confirmadas conservam marcação de revisão.

O controle recusou inicialmente um arquivo cujo JavaScript emitido tinha apenas
uma quebra de linha nova dentro de um objeto. A inspeção do diff confirmou
igualdade de tokens/operações. A validação foi ampliada para AST do JavaScript
emitido: ignora apresentação, mas preserva tokens/literais/estrutura. Testes
adicionais rejeitam alteração de operador, constante e ASI após `return`.
Não houve alteração executável nos arquivos de produção deste lote.

Para manter catálogo e commits intermediários coerentes, os artefatos por lote
são gerados das fontes do índice Git, sem reverter comentários ainda em trabalho
nos demais subsistemas. A ferramenta final usa a árvore de trabalho normalmente.

### C3 — Sensores, controladores e instalação de mecanismos

18 módulos, 139 declarações documentadas. Descrições revisadas incluem sensores
com freeze/atraso/desvio/stale, PID de atitude, Fuzzy-PID de descida, guiagem
horizontal e arbitragem. Memória dos controladores é distinta da cinemática;
leituras locais vêm do referencial compartilhado. Demais hipóteses não
confirmadas permanecem identificadas no catálogo. AST executável preservada
por arquivo; sem mudanças de ganhos, dt, parâmetros ou lógica de atuação.
