# M11-P — Desempenho sem mudança do modelo físico

## Escopo e ambiente

Base: `a309ae2`, `main` inicialmente limpa e sincronizada com `origin/main`.
Processador real disponível: Intel Core i3-4005U, 1,70 GHz, 2 núcleos/4 threads; memória física 8.261.316.608 bytes (8 GB nominal). Linux, Node/V8; versões exatas em cada resumo JSON. A memória disponível inicial era aproximadamente 1,4 GB: há aplicações externas ativas, não encerradas pelo benchmark. Resultados representam esta máquina e sua carga, sem equivalência prometida para todo i3.

Auditoria: instruções AGENTS.md, mundo, hidrodinâmica, geometria submersa, ilha estrutural, missão, diário, executor temporal, cena, renderer e HUD. Não há módulo de benchmark/hidrodinâmica reutilizável no Protótipo 1. O núcleo e suas constantes permanecem a autoridade física.

## Método reproduzível

`node --cpu-prof --cpu-prof-dir=/tmp node_modules/vite-node/vite-node.mjs scripts/benchmark-missao.ts --segundos 171 --saida /tmp/benchmark.json --diario /tmp/diario.json`

Mesma configuração histórica Node M11-2: inclinação 0,005 rad, velocidade descendente 0,5 m/s, altitude inicial 5 m; motores desligados. Passo externo 1/240 s, diário a cada 240 passos, consulta de apresentação a cada oito passos (30 Hz simulados). Tempo de CPU via process.cpuUsage, duração monotônica externa, memória RSS/heap a cada dez segundos simulados e eventos de GC. Exportação/serialização medidas separadamente. Canvas/DOM são medidos no navegador, não estimados pelo ensaio Node.

`--instrumentar --segundos 8` mede chamadas e custo inclusivo/exclusivo de métodos por decoradores temporários de protótipos no adaptador CLI, incluindo operações vetoriais e reconstruções efetivas do cache geométrico. Isso adiciona custo: nunca comparar sua duração com uma execução sem instrumentação. Os decoradores não alteram entradas/saídas ou relógio físico. Somente o processo de benchmark os utiliza.

Janelas de fase comuns às duas versões: seco [0;0,15), entrada [0,15;4,1), tombamento/oscilação [4,1;169,7), equilíbrio [169,7;171]. São recortes para medição, não condições de controle/conclusão. O estado real final e os eventos são registrados mesmo se a janela de equilíbrio não coincidir exatamente com um evento.

Hashes SHA-256 de todas as observações completas a 30 Hz e do diário completo permitem equivalência exata através da trajetória, abrangendo todos os campos físicos expostos, energia dissipada, forças, momentos, centros, sensores, integridade, contatos e eventos. Dados integrais temporários ficam em /tmp; o Git recebe apenas resumos. O replay estrito continua sendo outra verificação independente.

## Diagnóstico inicial

Diagnóstico instrumentado de 8 s: 1.920 passos externos, 3.919 internos (2,041 por passo), 170.148 chamadas hidrodinâmicas completas, 487.838 consultas geométricas e 121.051 reconstruções; 275.185 consultas de centro de massa, 339.507 de inércia e 136.448 aplicações de impulso na ilha. Operações vetoriais instrumentadas: 102.335.202, um limite inferior de alocações, não uma contagem exata de todos os objetos V8. Resumo: `2026-10-14-m11-p-instrumentacao-inicial.json`.

A execução instrumentada consumiu 247,618 s de CPU; esse valor contém overhead dos decoradores e NÃO estima a velocidade da interface. O custo exclusivo acumulado foi 51,896 s em geometria, 24,525 s na aplicação de impulso à ilha e 16,256 s no cálculo hidrodinâmico. O profiler conta dois subpassos em média nesta fase, não centenas; o cálculo adaptativo não é o alvo inicial de relaxamento.

Suspeitas verificáveis: reduções repetidas de massa/centro/inércia em cada impulso; repetição da hidrodinâmica no mesmo estado; construção de células mesmo quando todos os recortes são rejeitados; cópias repetidas de snapshots e atualizações integrais do DOM a cada quadro. A estabilidade adaptativa será contada antes de qualquer decisão; seus limites físicos não serão relaxados para obter velocidade.

## Referência longa antes da otimização

171 s simulados (41.040 passos externos): 579,962 s de parede, 632,258 s de CPU, **3,697 s CPU/s simulado**. Este ensaio usa o profiler nativo por amostragem (overhead incluído também na comparação final); os decoradores detalhados estão desligados. Avanço da missão: 560,539 s; observações de apresentação: 13,848 s. Exportação 114,9 ms, serialização 56,9 ms. GC observado: 15.885 eventos, 18,006 s. Resumo completo pequeno: `2026-10-14-m11-p-baseline.json`.

| Janela | Avanço (s) | Observação (s) | Passos externos |
|---|---:|---:|---:|
| Seca | 0,583 | 0,013 | 36 |
| Entrada | 25,353 | 0,358 | 948 |
| Tombamento/oscilação | 531,482 | 13,406 | 39.744 |
| Intervalo final | 3,120 | 0,071 | 312 |

A amostragem nativa atribuiu 45,595 s ao recorte, 44,895 s à cópia getEstadoFisico, 43,916 s à aplicação de impulso na ilha e 37,962 s ao módulo vetorial (custos próprios). Centros, velocidades e inércias repetidos também são relevantes. O resultado exige reduzir trabalho repetido, além de desacoplar a interface.

Estado final real Node: t=170,99999999992679 s; V=5,221196173099905 m³; atitude=1,5836483003343742 rad; flutuação estável; integridade 1. Esse endpoint difere da coleta Chrome de 170,49 s e da perturbação em graus; não é ajustado para coincidir com ela.

Hash de observações a 30 Hz: `661d91b657477fab3a34abb91a47facad9751323b1f9b6719db5c933b0887714`. Hash do diário: `b1e6cd0046eb33fe3e64137e31c059dd5dd736eb0ca87a509f08d5860c636019`.

## Qualificação

Concluída localmente, com evidências e resultados finais na seção M11-P-D. A CI remota dos novos commits aguarda o push do operador.

CI da base M11-H confirmado: [execução 38548986493](https://github.com/evertaraujo-lgtm/blackstarprototipo2/actions/runs/38548986493), conclusão success. Isso não qualifica os commits locais M11-P. Typechecks e build do adaptador de benchmark passaram.

Baseline visual Chrome headless 145, viewport 1280×1000, DPR=1, escala solicitada 1×: em 30,042 s reais avançou 11,5125 s simulados (**0,383×**). Canvas: 232 desenhos, 318,9 ms totais (1,06% da janela); HUD: 232 atualizações; 231 long tasks, máximo 391 ms; nenhum erro JS. Arquivo `2026-10-14-m11-p-browser-antes.json`. A lentidão vem predominantemente da física; worker não substituiria a remoção de desperdício, e não é escolhido nesta etapa. O relógio visual anterior ainda descartava deltas acima de 50 ms; o baseline registra tempo realmente simulado, não o tempo solicitado.

## M11-P-B — Alterações do núcleo

- Recorte: distâncias escalares mantêm subtração, soma e produto escalar na ordem original; offsets são calculados uma vez por plano. Região completamente rejeitada retorna volume zero antes de construir células. A resolução 2×8 e todos os limites adaptativos continuam iguais.
- Região: planos laterais constantes são pré-calculados; normal/tangente/topo da mesma pose são compartilhados entre as três seções. Não há redução de precisão/resolução.
- Vetor: validação finita sem array temporário; Math.hypot memoizado em campo privado não enumerável. Vetores têm contrato imutável; consulta também funciona nos snapshots congelados, sem alterar JSON.
- Objeto: estado cinemático readonly é congelado a cada escrita do core, permitindo consultas sem cópia redundante. Estados anteriores continuam válidos e não recebem escritas futuras. Inércia por corpo é invalidada pela massa e pelas três dimensões atuais.
- Ilha: reduções escalares mantêm a ordem dos produtos/somas; centro é reutilizado somente com as mesmas referências imutáveis de posição e mesmas massas por membro, incluindo redistribuição de massa sem alteração do total.
- Kicks conservativos: aplicação sequencial em lote calcula cada impulso e cada projeção, na ordem anterior, usando escalares temporários. Publica as velocidades dos membros ao fim. Não soma impulsos para trocar o algoritmo; colisões e impulsos externos mantêm sua API individual. Pose, massa e geometria não mudam entre kicks. Nenhuma força, torque ou subpasso foi desligado.
- Missão: uma única medida aquática por observar() alimenta telemetria e objetivos; a observação continua somente para leitura.

Equivalência: teste do lote versus aplicação individual usa 27 impulsos fora do centro, velocidades iniciais diferentes e três cargas, comparando todos os componentes exatamente. Entrada/tombamento de oito segundos preservou exatamente os hashes de 240 observações e do diário anterior: `bdbb0f5adc9974df4f0c0936d3d772440236ebf769270328ee512c4367c7c35b` / `4e6904667639118be5e9ce6f01262e8accf1b857678a20ae0fd86317a663f6a1`.

Validação dirigida final B: 35 testes aprovados (água, missão aquática, equivalência e caches); Objeto também aprovado na campanha anterior. Typechecks principal e sem navegador aprovados; build das quatro páginas aprovado. O teste novo de posição média usa 5×10⁻¹⁵ m de tolerância para a diferença de uma ULP entre 14/3 e 7×(20/30); nenhuma tolerância histórica foi alterada. As verificações de trajetória/replay permanecem estritas.

A medição longa final e as regressões completas estão registradas na seção M11-P-D.

## M11-P-C — Apresentação e relógio

Canvas com relógio de desenho próprio, alvo 30 FPS; HUD a 10 Hz. Comandos, reinício e resize pedem atualização imediata. Textos somente mudam quando necessário; listas de eventos/objetivos preservam seus elementos quando os dados são iguais. O relógio de desenho mantém sua fase para evitar cair para 20 FPS por arredondamentos do RAF.

A cena usa o modo explícito do ExecutorPassoFixo que acumula todo o tempo real. O orçamento cooperativo é 12 ms por quadro (ao menos um passo, máximo 240); ele limita trabalho da apresentação, sem mudar dt, resolução ou forças. O saldo permanece pendente, é exposto no HUD e é preservado ao pausar/continuar. Reiniciar cria uma missão nova. O modo legado do executor permanece disponível à bancada; sua API anterior é compatível. Replay mantém uma amostra a cada 240 passos. Escala inicial visual 1×; 3× e 10× continuam disponíveis, com atraso transparente se o hardware não acompanhar.

Benchmark visual final no mesmo Chrome/i3, 30,010 s reais: 29,979 s simulados (**0,999×**), 895 desenhos (**29,82 FPS**), 286 atualizações do relógio/HUD (**9,53 Hz**), zero long tasks e zero erros JS. Canvas consumiu 795,0 ms no total. A razão inclui referência inicial do RAF e defasagem de até um quadro do snapshot visual. Resumo em `2026-10-14-m11-p-browser-depois.json`. Worker não foi necessário para esse objetivo; não foi adicionada dependência.

Testes: os dois testes anteriores do executor e três novos passaram; estes verificam drenagem integral de atrasos, orçamento cooperativo, pausa sem perda de saldo e igualdade da sequência de dt sob cadências diferentes. Typechecks e build aprovados. Smoke de produção: missão terrestre com empuxo/vazão/consumo/subida, câmera, zoom sem alterar física, modo pouso, pausa e reinício; variante aquática com entrada, empuxo, ausência de contato rígido e reinício; seis BSS históricos com ignição e consumo; landing, bancada e página orbital carregadas, órbita avançada. Zero erros JS, inclusive no viewport móvel. Resumo: `2026-10-14-m11-p-smoke.json`. Ajuste visual final do indicador também teve build e smoke aquático aprovados.

## M11-P-D — Desempenho e equivalência longa

Mesmos parâmetros, Node, i3, frequência de observação e profiler nativo por amostragem. Processos separados; nenhum teste pesado ou navegador ativo concorria com a medição principal. A comparação não usa a duração do profiler de decoradores.

| Grandeza | Antes | Depois | Redução |
|---|---:|---:|---:|
| CPU / 171 s simulados | 632,258 s | 153,953 s | **75,65%** |
| CPU / segundo simulado | 3,697 s | 0,900 s | **75,65%** |
| Tempo de parede | 579,962 s | 138,492 s | **76,12%** |
| Avanço da missão, sem observações de apresentação | 560,539 s | 129,639 s | 76,87% |
| Consulta de observações completas a 30 Hz, incluindo snapshots | 13,848 s | 5,849 s | 57,76% |
| Exportação do snapshot do diário completo | 114,90 ms | 94,62 ms | 17,65% |
| Serialização JSON | 56,88 ms | 56,98 ms | sem ganho significativo |
| Tempo observado de GC | 18,006 s | 3,714 s | 79,37% |
| Eventos de GC | 15.885 | 5.530 | 65,19% |
| RSS máximo amostrado | 220,77 MB | 187,29 MB | 15,17% |
| Heap usado máximo amostrado | 90,75 MB | 72,00 MB | 20,66% |

MB decimais; memória amostrada a cada dez segundos simulados, não medida de pico instantâneo/alocação exata. O heap final variou de 61,25 para 68,99 MB, conforme a fase do coletor; não é apresentado como prova de redução da memória retida. O diário tem os mesmos bytes/amostras e continua crescendo com a duração. Não houve GC forçado, redução de frequência do replay ou exclusão de partes da missão.

| Fase | Avanço antes | Avanço depois | Observação antes/depois |
|---|---:|---:|---:|
| Seca | 0,583 s | 0,282 s | 12,58 / 11,86 ms |
| Entrada | 25,353 s | 6,243 s | 358,22 / 157,09 ms |
| Tombamento/oscilação | 531,482 s | 122,146 s | 13,406 / 5,636 s |
| Intervalo final | 3,120 s | 0,969 s | 70,68 / 44,58 ms |

Contagem separada, sem relógio por método: `--contar` registra chamadas por fase; `--contar --vetores --segundos 8` conta operações vetoriais. Não se comparam suas durações às medições principais. O caso de oito segundos manteve exatamente 3.919 passos internos e 121.051 reconstruções geométricas; as operações vetoriais caíram de 102.335.202 para 41.577.230 (**59,37% menos**). Reconstruções não foram omitidas quando a pose mudava. Na trajetória completa: 41.040 passos externos, 43.230 internos, 1.536.247 reconstruções. Não houve alteração do passo/resolução/tolerâncias. Resumos: `2026-10-14-m11-p-contadores{8,171}.json`.

Reprodução da contagem: `npm run missao:benchmark -- --contar --saida /tmp/contadores.json`. A instrumentação é isolada ao processo CLI; não adiciona relógio ou contadores ao estado do mundo. As consultas de física, missão e snapshots aparecem separadamente no profiler; o registro periódico mantém a chamada de observação a cada 240 passos e a exportação é medida fora do intervalo de integração.

Equivalência: os hashes completos a 30 Hz e do diário a 1 Hz permanecem idênticos. Comparação estrutural de 174 observações (incluindo repetições de inicial/final), **121.392 números**, erro máximo zero. Isso abrange posição, velocidade, orientação, taxa angular, volumes, centros, forças, momentos, potência dissipada, energia de entrada, contatos, massa, consumo, integridade, sensores e objetivos. Energia mecânica derivada e momento angular composto sobre G tiveram diferença **zero** em todas essas observações. Energia inclui cinética translacional/rotacional e potencial gravitacional relativo ao nível do mar; potencial hidrostático não exposto pelo modelo não foi inventado. Essa é uma comparação de regressão, não uma alegação de conservação total num meio dissipativo.

Comparador reproduzível: `node node_modules/vite-node/vite-node.mjs scripts/comparar-desempenho-missao.ts --diario-antes /tmp/m11-p-baseline-diario.json --diario-depois /tmp/m11-p-final-diario.json`. Sem os argumentos dos diários, verifica os hashes e as reduções usando os resumos versionados. Resultado: `2026-10-14-m11-p-equivalencia.json`.

Smoke longo de produção a 1× chegou ao equilíbrio passivo: entrada t=0,154166667 s, tombamento t=4,075 s, equilíbrio t=169,675 s. Captura final t=169,941666667 s, V=5,207179243 m³, atitude=1,583541667 rad, integridade 100%, sem contatos sólidos. O endpoint é o momento real da pausa, não foi ajustado ao benchmark Node de 171 s. Zoom não alterou física, partida/corte funcionaram, reinício não deixou resíduos, viewport móvel sem overflow e zero erros JS. Resumo pequeno: `2026-10-14-m11-p-missao-completa-smoke.json`; diário/capturas completos em /tmp.

## Limitações e próximos trabalhos

As medições qualificam este i3-4005U/8 GB com Linux/Node 20.20.0 e Chrome headless 145, na configuração descrita. Não qualificam outros navegadores, máquinas, muitas missões simultâneas ou sessões de horas. Frequência atingida é medida, não promessa universal. O indicador informa atrasos e mantém os passos quando houver carga adicional.

A serialização completa do diário não melhorou significativamente; persistência/streaming de longas sessões merece benchmark próprio. Os caches pressupõem os contratos de vetores/configuração imutáveis; alterações de configuração devem ocorrer pelas APIs de domínio ou construção de nova missão. As limitações físicas M9–M11 permanecem as mesmas; nenhuma hipótese de ondas, inundação, slamming detalhado ou qualificação de lançador real foi adicionada. Novas otimizações ou worker só devem ser escolhidos com medição de cargas que excedam o caso atual.

Qualificação final: **526 testes aprovados, 80 arquivos, exit 0**, em 1.207,43 s. Todos os 518 testes históricos preservados, oito novos; nenhum removido, ignorado ou enfraquecido. Fontes congelados durante a campanha: 214 arquivos, SHA-256 `37cfc68046b623c9e8bd1ba02222e884a5297f54cfb1191a901aa28a9c9550ff`, conferido antes/depois. Inclui regressões orbitais M9, terrestres, missão, hidro, contato, integridade, controles e replay histórico M10. Logs compactos `2026-10-14-m11-p-{testes,tipos,build}.log`; resumo `2026-10-14-m11-p-qualificacao.json`.

Typecheck principal, typecheck de missões sem navegador e build de produção aprovados com os fontes finais. Replay técnico do diário pré-otimização de 171 s aprovado no executor real, com comparação integral exata; resumo `2026-10-14-m11-p-replay.json`. Nenhuma tolerância de regressão foi necessária: houve igualdade exata no contrato JSON/diário, além da comparação por componentes do lote versus os impulsos individuais.

CI da base M11-H confirmada success. Consulta para o commit local C retornou zero execuções: **CI dos novos commits pendente do push do operador**, não declarada aprovada. Nenhum push ou deploy foi feito. M11-P-A/B/C/D concluídos e qualificados localmente; resta a verificação remota depois do push.

Commits: A `34f2999`, B `67c6178`, C `b0c5da2`; D é o commit de qualificação que contém este relatório e as evidências finais.
