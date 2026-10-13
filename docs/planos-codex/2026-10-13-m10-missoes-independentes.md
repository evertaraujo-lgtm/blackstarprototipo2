# M10 — Missões independentes e primeira cena do jogo

Data: 2026-10-13. Base auditada: 00db5fe, main limpa e sincronizada. Complexidade estimada 8/10. Execução autônoma A–G; sem deploy. Mesmos parâmetros da M9, sem BSS-007.

## M10-A — Diagnóstico e decisões

| Módulo atual | Responsabilidade / dependência | Decisão |
|---|---|---|
| MundoFisico / Objeto | Estado cinemático, gravidade, integração, danos, contato; sem navegador | Preservar integralmente |
| VeiculoComposto / ComputadorDeVoo | Composição, sensores, controladores e arbitragem; interfaces dos motores | Preservar APIs e ordem de registro |
| Propulsor / alimentação / fontes / fixadores | Permissivos, consumo, força e vínculos reais | Reutilizar, sem novos parâmetros |
| BancadaBss | Monta casco, CH4/O2, bateria, painel, motor, pernas, grid fins; também cria mundo/solo e formata UI/trace | Extrair montagem/coordenação operacional; manter adaptador experimental |
| BSS-005 / BSS-006 | Duplicam configuração de tanques, motor, energia, pernas; 006 acrescenta fins/guiagem | Uma configuração compartilhada, fábricas de domínio |
| EnsaioMissaoBss005 | Executor determinístico consome fábrica da bancada, guarda classificação histórica M5/M7 | Preservar relatório antigo, compatibilidade pela mesma montagem |
| TelemetriaMissaoBss | Consulta somente core, mas localizada na pasta de cenários | Mover para domínio; reexportar caminho antigo |
| EnsaioOrbitalInerte | Factory independente, condições iniciais, mundo, metadados | Referência de isolamento, preservar testes inertes |
| ExecutorPassoFixo | Converte tempo externo em dt constante, sem DOM | Reutilizar apenas no adaptador de apresentação; executor automatizado por contagem de passos |
| src/testes.ts | Renderer e controles experimentais grandes | Não refatorar por tamanho; continuar consumindo BancadaBss |

Protótipo 1 inspecionado: mission_state.js, mission_runtime.js, mission_simulation.js. Separação de serviços/telemetria é referência funcional; uso de window, DOM, estado global, Math.random e cinemática paralela impede migração direta. Nenhum arquivo do P1 será modificado.

Nova direção de dependências: apresentação → missão → montagem de veículo / ambiente → core. A montagem recebe mundo e superfície já construídos (para consultas dos controladores), não depende de missão/cenário/UI. Bancada → mesma montagem. Telemetria é snapshot derivado, não segundo estado físico.

Missão: definição/configuração imutável; instância privada com mundo e veículo; porta tipada de comandos, avanço fixo, snapshots de observação e eventos. Interfaces pequenas, sem framework de entidades. Não expor objetos mutáveis à UI. Objetivos separados da física: observar subida, transição aos 300m e tentativa de retorno, sem fabricar sucesso. Pausa e início pertencem à instância; relógio real/RAF só na apresentação.

Ambiente de lançamento: AmbienteTerrestre XY sem rotação, atmosfera padrão M9, uma superfície esférica existente com material histórico do solo. Plataforma inicial é a região demarcada desse terreno, não outra superfície sobreposta. Torre visual sem massa/colisão. Solo físico curvo, câmera local; cenário costeiro decorativo não declara água física.

Contato inicial, contato de retorno, repouso geométrico, apoio bilateral sustentado e segurança estrutural devem ter estados separados. Proximidade/emApoio ou um impulso positivo isolado não comprovam sustentação contínua. Critérios M9 preservados; apoio bilateral não homologado. Não encerrar voo por horizonte do executor; horizonte é orçamento de observação, não resultado físico.

## Sequência e validação prevista

A: auditoria/documentação. B: montagem independente/configuração BSS-005/006 e adaptador. C: portas de missão/executor genérico. D: voo BSS006_VOO_EXPERIMENTAL e observação. E: campanha determinística, equivalência bancada/missão em comandos idênticos, alvos 0/±34,7m, vento ±5m/s, sem ignição e perdas de alimentação. F: registro/reexecução versionados e expansão por interfaces. G: missao.html, entrada/render/câmera separados; smoke desktop/mobile e regressões das quatro páginas.

Cada marco: testes pertinentes, typecheck e build; commit específico. Suíte completa ao concluir, mantendo regressões M9. Comparação exige igualdade de estados/consumo/integridade/controladores/contatos, não só resultado visual. Registrar parâmetros, passo 1/240s, comandos por índice de passo, vento determinístico e revisão. Nenhum ajuste de tolerância/veículo para aprovar.

## Pendências anteriores preservadas

Apoio bilateral contínuo M9/M7 não qualificado, penetração histórica ~34mm, diário manual 15km M5-B/C e contingências M8-B incompletos. Atmosfera acima de 20km simplificada, vácuo a 25km, Terra sem rotação, sem reentrada/inclinação 3D. M10 não qualifica veículo real, 15km ou órbita.

## Evidências e estado

M10-A: auditoria concluída; fontes examinadas acima. Validação: 5 testes (ExecutorPassoFixo/TelemetriaMissaoBss) aprovados; typecheck e build aprovados. Base pré-extração adicional coletada em 00db5fe com 1 teste, quatro montagens e 480 passos cada (2s), para comparação exata na M10-B. CI remoto será consultado se disponível; execução local não equivale a aprovação do CI.

### M10-B — Montagem independente

MontagemBss (src/veiculos) recebe MundoFisico/SuperficieFisica e monta os mesmos objetos/controladores, sem criar ambiente ou UI. DefinicaoBss006 concentra configuração histórica compartilhada com BSS-005; TelemetriaBss é domínio e o caminho antigo reexporta. BancadaBss mantém descrição, trace e controles experimentais e delega montagem/coordenação. Ordem dos objetos/fontes/sensores e fórmulas preservadas. Sem mudança no core físico.

14 testes em três arquivos aprovados (160,39s), incluindo voos da bancada com alvo/vento, sem ignição, falha elétrica e regressão exata dos snapshots pré-extração de 00db5fe. Referência imutável em docs/validacoes/2026-10-13-m10-base-m9.json. Typecheck e build aprovados. Parâmetros: 600kg CH4/2400kg O2, 120kN, Isp350s, bateria1MJ, duas grid fins e pernas históricas.

### M10-C — Portas e execução

ContratoMissao separa definição, instância, comandos, eventos e objetivos. CicloMissao mantém apenas execução/pausa e índice; tempo pertence ao core. ExecutorMissao agenda comandos na fronteira do passo e opera qualquer InstanciaMissao<C,O>, sem conhecimento de veículo/ambiente. Rejeita orçamento/ordem inválidos antes de avançar; pausa não fabrica tempo. Horizonte do executor não encerra fisicamente uma missão.

Dois testes com corpo orbital inerte (outro consumidor da mesma porta), retomada e agenda aprovados; typecheck e build aprovados. Nenhuma dependência de DOM/Canvas/Firebase/RAF/data real na camada.

### M10-D — BSS006_VOO_EXPERIMENTAL

AmbienteLancamento cria Terra XY estática, atmosfera M9, vento local projetado e uma única superfície esférica, com material da bancada. MissaoBss006 mantém mundo/montagem privados; aceita sistemas, ignição explícita com permissivos, corte elétrico do motor conforme API histórica, throttle manual, alvo local (bloqueado após decolagem), modo/atitude e falhas reais de cabos/linhas. Perfil automático observa altitude física e seleciona Pouso aos 300m; não altera cinemática. Objetivos e eventos são observações das ações/core.

ObservacaoBss006 inclui corpos/geometry, telemetria, atuadores/arbitragem, energia/consumo, integridade, contatos/normal/impulso e classificações separadas. SnapshotMissao copia e congela dados para não ceder referências do core à UI. Sem encerramento artificial; reinício cria instância nova. Apoio bilateral exige reação normal positiva em ambas as sapatas no mesmo passo por 3s, quietude e motor cortado; proximidade isolada não é aprovação. Segurança estrutural exige também limites de toque e ausência de dano/ruptura.

Quatro testes aprovados: preparação/ignição negada, voo com empuxo/vazão/consumo positivos, pausa/reinicialização, isolamento de snapshots e sítio em outro ponto terrestre. Typecheck/build aprovados. Primeira execução do teste de metadados usava chave ambiente inexistente; corrigida a expectativa para a API real achatada do MundoFisico (nenhuma mudança física).
