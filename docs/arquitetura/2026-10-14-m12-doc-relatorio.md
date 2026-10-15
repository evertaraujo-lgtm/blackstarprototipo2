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

### C4 — Montagem, cenários, missão, diário e executor

21 módulos, 155 declarações documentadas. Contratos descrevem instância e
comandos, observação copiada, amostragem e agenda de replay, separando ciclo
operacional do tempo físico. A amerissagem classifica medidas e acumula janela
de equilíbrio; esses eventos não aplicam torque nem encerram o mundo.
AST executável preservada em cada arquivo. Não foram criadas missões/veículos.

### C5 — Apresentação, bancada visual e adaptadores

Cabeçalhos junto às funções de câmera, renderer, entrada, HUD, carrossel,
bancada e scripts existentes. A cena consulta snapshots e mantém relógio,
Canvas/DOM e exportação no adaptador; não existe nova autoridade física.
A documentação não foi confundida com qualificação de gameplay.

O lote de trabalho possui 20 arquivos/408 pontos, dos quais cinco módulos da
ferramenta documental serão registrados na etapa D junto aos seus testes e
correções de extração. Fontes existentes da aplicação mantêm AST executável.
Comentários de funções cuja interpretação de domínio não foi confirmada
continuam sinalizados para revisão, em vez de simular certificação técnica.

### D — Complemento do contrato de impacto antes das correções do extrator

A auditoria exigiu distinguir inicializadores de campos de instância de
inicializadores estáticos, e modificadores da função de modificadores da
constante/propriedade hospedeira. Será acrescentada a função de ferramenta
`modificadoresDeclaracao(no: ts.Node): readonly string[]`: consulta AST,
sem efeitos fora de memória. `fatosCorpo` passará a incluir inicializações do
construtor (sem executar closures nem campos estáticos); `nomeDeclaracao`
distinguirá tipo funcional de valor padrão de parâmetro. A alteração afeta
metadados/âncoras documentais, nunca assinatura ou execução do simulador.

Testes adicionais: campos de instância versus estáticos/closures, arrow privada
estática/exportada, valor padrão funcional, falso contrato com sufixo e texto de
funções em comentários/strings. A emissão de JS inválido será rejeitada na
prova de preservação. Novos auxiliares desta ferramenta também recebem JSDoc.

O conjunto de validação da ferramenta agora possui **18 testes aprovados**
(2 arquivos); typecheck geral também aprovado. A extração inclui campos de
instância/parameter properties no construtor, exclui inicialização estática e
não executa callbacks de campos. Evidências usam Printer para preservar espaços
de literais; comentários/strings com código de exemplo não viram funções.
O CI fará auditoria AST antes da suíte física, sem executar simulação para
verificar documentação. A presença textual de contratos nunca será descrita
como certificação semântica.

A integração de gerar/verificar também foi exercitada em diretório temporário:
rejeita mapa sem delimitadores únicos/ordenados e detecta catálogo alterado.
**19 testes documentais aprovados**, typecheck geral aprovado. O comando
`npm run docs:verificar -- --base-executavel` confirmou **zero arquivos com AST
executável divergente** contra `555635b`, incluindo scripts e testes existentes.
A consulta Git usa NUL para não perder caminhos Unicode.

A [CI da base M11-P](https://github.com/evertaraujo-lgtm/blackstarprototipo2/actions/runs/38658867983)
foi confirmada como `success` para `555635bc61a40d6a17326d342be7c370282a9981`.
Os commits M12 não foram enviados por orientação do operador; sua CI remota
permanece pendente do push, sem declaração de aprovação remota desta revisão.

As chamadas diretas a `atualizarEstadoPeloCore` presentes na aplicação estão nos
módulos físicos de integração, colisão/contato, vínculos e ilha. Não foi encontrada
chamada direta na apresentação, missões ou controladores de voo. Isso é evidência
estática; não substitui os limites de autoridade por contrato documentados.

### E — Diretriz permanente

`AGENTS.md` §69 exige CONTRATO DE IMPACTO FUNCIONAL antes do código, incluindo
funções reutilizadas/modificadas/novas/removidas e seus contratos. Define JSDoc
proporcional, distinção entre geração e revisão, atualização do mapa/catálogo e
validações. O README indica a navegação e os comandos documentais.

Estado após A–E estrutural: 1.461 implementações nomeadas com JSDoc/âncora
(100%), 137 assinaturas declarativas, 577 callbacks e 1.098 funções em testes.
440 contratos foram confrontados com as implementações; 495 descrições ainda
exigem revisão semântica explícita. Esse inventário não será apresentado como
revisão técnica integral enquanto essas pendências não forem tratadas.

### C6 — Revisão semântica de superfícies, contatos e portas do mundo

Mais 81 cabeçalhos foram confrontados com seus corpos: normais/projeções,
contatos por arestas e bordas, SAT/recorte, impulsos, restituição, trabalho de
atrito, dano e transmissão a fixadores. Ficaram explícitos o centro representativo
por média de vértices (sem ponderação de área), a hipótese de solo estático,
a distinção proximidade/impulso e a limitação de esforços em malhas redundantes.
Nenhum desses limites foi corrigido nesta tarefa documental. A comparação de
AST executável por arquivo continuou idêntica.

### C7 — Controle, sensores e computador de voo

84 contratos adicionais descrevem validação de leituras, seleção de motores,
prioridades de atuação, memória dos PIDs, anti-windup e conversão de comandos.
A fase cinemática `toque` de um controlador não comprova contato/apoio seguro.
O autotune usa modelo auxiliar próprio, com custo e limites documentados, sem
ser apresentado como propagação equivalente do mundo. Sensores observam e
atualizam leituras; não aplicam forças. AST executável preservada por arquivo.

### C8 — Atuadores, mecanismos e cadeias de energia/propelentes

109 contratos adicionais descrevem cilindros/servos, porta/trava, juntas,
gerador/painel solar, alimentação química, bocal, paraquedas e veículos locais.
Foram diferenciados comando, orçamento energético, entrega, reação e integração.
Hipóteses cartesianas remanescentes em mecanismos locais ficaram registradas no
mapa e no código, sem refatoração. A prova por arquivo preservou AST executável.

### C9 — Missões, replay, ensaios e observação

60 contratos adicionais esclarecem identificação/validação dos replays,
condições iniciais, configuração reproduzível, portas aquáticas e traces.
A confirmação retida de contato bilateral não equivale a apoio continuamente
sustentado. TracePLC registra mudanças imediatamente e pode omitir sinais iguais
em intervalos menores que 0,05 s; não é replay integral. A UI orbital legada
limita delta real, diferentemente do acompanhamento de atraso da cena de missão.
Comentários e catálogo foram atualizados com AST executável preservada.

### C10 — Bancada: queda, impacto, mobilidade e ensaios térmicos

78 contratos da bancada foram revisados com as implementações: preparação de
corpos/vínculos, medições e critérios visuais. Limites históricos de critérios
legados (como altura não orientada em alguns encerramentos) estão explícitos,
sem modificar a execução. As funções `validar` descrevem exatamente os critérios
que verificam; aprovação visual local não foi ampliada para homologação física.
AST executável idêntica antes/depois do lote e catálogo regenerado.

### C11 — Bancada: recuperação, mecanismos, controles e renderer

84 contratos restantes foram confrontados com seus corpos, incluindo fábricas,
callbacks nomeados, manipulação de DOM, armazenamento local, trace, câmera e
loop temporal. Três cabeçalhos antigos duplicados junto a propriedades inline
foram removidos após verificar igualdade da AST executável. A pendência de eixo
temporal do trace e critérios de término arquivados foram registrada no mapa.
A aprovação visual da abertura do paraquedas, por exemplo, não comprova pouso.

#### Complemento do contrato de impacto — portas declarativas

As 137 assinaturas sem corpo já inventariadas também receberão comentários de
responsabilidade junto ao nó de tipo/método abstrato. A lista exata e as assinaturas
estão na categoria `contrato` do inventário/catalogo: portas de missão, ambiente,
superfície, sensores/atuadores, controladores, contextos de resolução, executor,
cenário visual e callbacks de instrumentação. Nenhuma assinatura será alterada;
os efeitos previstos serão descritos a partir dos consumidores/implementações
inspecionados. Não serão criadas funções executáveis nem regras físicas novas.

### C12 — Contratos declarativos de portas e callbacks tipados

As 137 assinaturas declarativas receberam descrição do papel esperado da porta,
unidades e limites relevantes, confrontados com consumidores/implementações
existentes: consulta versus comando, energia entregue versus solicitada, força
versus integração, leitura versus controlador. Tipos não criam implementações.
O cabeçalho fica junto ao nó de tipo/método abstrato e é associado pelo compilador.
A comparação por arquivo manteve a AST executável idêntica; nenhuma assinatura
ou fluxo foi alterado. Catálogo inclui esses contratos separadamente das funções
com corpo, dos callbacks anônimos de execução e dos testes.

## Qualificação final — 2026-10-15

| Escopo | Resultado |
|---|---:|
| Implementações nomeadas de produção | 1.461 |
| Cabeçalhos JSDoc com vínculo correto ao catálogo | 1.461 / 1.461 (100%) |
| Contratos de implementação com revisão explicitamente registrada | 936 |
| Descrições existentes/extraídas de operações simples, sem certificação semântica | 525 |
| Implementações marcadas REVISÃO NECESSÁRIA | 0 |
| Assinaturas declarativas de portas/tipos, documentadas separadamente | 137 |
| Callbacks anônimos de produção inventariados | 577 |
| Funções/callbacks de testes inventariados | 1.098 |
| Entradas totais do inventário | 3.273 |
| Adições, remoções ou assinaturas divergentes após geração | 0 |
| Arquivos preexistentes com AST executável divergente da M11-P | 0 |

`@reviewed` significa que a descrição foi confrontada com implementação/consumo;
não significa homologação física nem cobertura de execução de cada ramo. As 525
descrições sem essa marca continuam distinguíveis no catálogo. A associação de
arquivos de testes é estática por import direto; efeitos transitivos de chamadas,
qualidade das descrições e invariantes não são comprovados automaticamente.

### Validações executadas

- `npm run test:documentacao`: **19 testes aprovados**, em dois arquivos.
- `npm run typecheck`: aprovado.
- `npm run typecheck:missoes`: aprovado, preservando domínio sem APIs de navegador.
- `npm run build`: aprovado; mesmos nomes/hash dos assets JS da aplicação antes
  e depois do último lote de comentários.
- `npm run docs:verificar -- --base-executavel`: aprovado, sem catálogo/mapa
  desatualizado, deriva estrutural ou alteração executável contra `555635b`.
- `git diff --check`: sem erros de whitespace ao fechar os lotes.
- Smoke no Chrome headless sobre build local: landing, tests.html, orbitas.html
  e missao.html carregaram, sem overflow desktop nem exceção JavaScript; ensaio
  orbital avançou no navegador.
- Missão terrestre: 0,35 s simulados, empuxo de aproximadamente 78 kN, metano de
  600 para 598,4092427077585 kg, câmera acompanhando; reinício em 0 s, sem ignição
  ou consumo residual. Variante aquática: 0,220833 s, 0,0312 m³ submersos, zero
  contatos sólidos, integridade 1 e motor desligado; reinício seco confirmado.
- Os seis cenários BSS ativos da bancada avançaram. Nos BSS-001/002/004/005/006
  foram observados empuxo e fluxo não nulos e consumo. O painel BSS-003 não expõe
  empuxo/vazão numéricos; foram confirmadas ignições e queda da reserva de 250
  para 249,5 kg. O smoke não substitui ensaio completo de pouso.

Evidências resumidas: [m12-doc-smoke.json](../validacoes/m12-doc-smoke.json).
Não foram adicionados diários gigantes nem capturas de profiling. As falhas
iniciais dos scripts de smoke (espera de navegação/seletor/escopo de variável)
foram corrigidas no adaptador de teste temporário; nenhuma exigiu alteração da
aplicação. Preview e navegador próprios do ensaio foram encerrados.

A suíte física histórica não foi repetida nesta alteração documental, conforme
AGENTS.md §65. Nenhum teste histórico foi removido, ignorado ou enfraquecido; a
prova de preservação percorreu todos os TypeScript preexistentes, inclusive
scripts, testes e caminhos Unicode. Os 1.098 itens da tabela são funções AST em
testes, não quantidade de testes executados nesta rodada.

### Commits verificáveis

| Etapa/lote | Commit |
|---|---|
| A — mapa e contrato inicial | `d9f1c07` |
| B — inventário AST | `8226d14` |
| C1 — núcleo e interações | `e545901` |
| C2 — corpos/componentes | `a5b12a3` |
| C3 — sensores/controle | `6e818b1` |
| C4 — montagem/missão/replay | `c729de0` |
| C5 — apresentação/adaptadores | `c165f5d` |
| D — auditoria e testes de rastreabilidade | `fd9bee3` |
| E — diretriz permanente | `6611feb` |
| C6 — superfícies/contatos/esforços | `c2816e0` |
| C7 — revisão de sensores/controle | `b5bc087` |
| C8 — atuadores/mecanismos/energia | `659ad42` |
| C9 — revisão de missão/replay/observação | `5f5cbf2` |
| C10 — cenários históricos | `d7bcd14` |
| C11 — bancada/renderer/trace | `c6273d6` |
| C12 — portas declarativas e evidência visual | `5fa55cb` |

### Impacto e próximos trabalhos

O simulador mantém algoritmos, assinaturas, parâmetros físicos e resultados
executáveis. Foram introduzidas somente ferramentas de análise/documentação e
seus testes; a CI consulta o catálogo antes da campanha física. AGENTS.md §69
exige CONTRATO DE IMPACTO FUNCIONAL para implementações futuras, incluindo funções
reutilizadas e efeitos/invariantes, com atualização deste mapa/catálogo.

Os achados arquiteturais permanecem para marcos próprios: orientação/gravidade
fixas em mecanismos locais, precisão temporal visual do trace, critérios de
encerramento arquivados, contratos de imutabilidade superficial, limites do
modelo auxiliar de autotune, esforço em malhas estruturais redundantes e
convergência das duas famílias de replay/câmera. Não houve refatoração executável
para corrigir esses achados nesta tarefa.

A CI remota da base foi confirmada; a CI dos commits M12 depende do envio pelo
operador. Não foi realizado push nem deploy.
