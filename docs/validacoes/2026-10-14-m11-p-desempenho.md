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

Pendente. Nenhum resultado deste documento aprova antecipadamente o marco.

CI da base M11-H confirmado: [execução 38548986493](https://github.com/evertaraujo-lgtm/blackstarprototipo2/actions/runs/38548986493), conclusão success. Isso não qualifica os commits locais M11-P. Typechecks e build do adaptador de benchmark passaram.

Baseline visual Chrome headless 145, viewport 1280×1000, DPR=1, escala solicitada 1×: em 30,042 s reais avançou 11,5125 s simulados (**0,383×**). Canvas: 232 desenhos, 318,9 ms totais (1,06% da janela); HUD: 232 atualizações; 231 long tasks, máximo 391 ms; nenhum erro JS. Arquivo `2026-10-14-m11-p-browser-antes.json`. A lentidão vem predominantemente da física; worker não substituiria a remoção de desperdício, e não é escolhido nesta etapa. O relógio visual anterior ainda descartava deltas acima de 50 ms; o baseline registra tempo realmente simulado, não o tempo solicitado.
