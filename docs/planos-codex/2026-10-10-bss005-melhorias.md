# Plano de melhorias para o Codex — Black Star, Protótipo 2 / BSS-005 e BSS-006

**Data da revisão:** 2026-10-10  
**Repositório:** `evertaraujo-lgtm/blackstarprototipo2`  
**Commit-base analisado:** `72b6666700ee5410fb254f2d32647dfe59ef345b` (`Improve BSS05 flight and descent physics`)  
**Status:** plano incremental; o BSS-006 possui validação integrada de baixa altitude no commit `c699ea8`. Este documento não implementa correções de código.  
**Prioridade geral:** consistência física antes de adicionar recursos visuais ou aumentar o alcance da missão.

**Atualização de 10/10/2026:** a seção 7 revisa o commit `c699ea8b082ee2f7ce1f8778d3cb7d38c91443ff` e prevalece sobre diagnósticos antigos **apenas quando indicar expressamente uma correção já realizada**. As seções 2–6 preservam o histórico e o backlog original do BSS-005.

## 1. Instruções para o Codex

Este documento é uma lista de trabalho incremental, **não** uma autorização para implementar todos os itens num único commit. Trabalhe por etapas, começando pela P0, e reporte diagnósticos e decisões de engenharia antes de avançar para mudanças que alterem significativamente os parâmetros da missão.

1. Leia e respeite o `AGENTS.md`, especialmente: fonte única da verdade física, unidades SI, determinismo, controle separado de objetos/atuadores, teste de regressão e partida manual na bancada.
2. Antes de modificar qualquer coisa, execute `npm test`, `npm run typecheck` e `npm run build`. Registre o resultado real; não presuma que a versão-base passa.
3. Não ajuste números arbitrariamente apenas para um teste passar. Quando houver incompatibilidade física, apresente o diagnóstico, corrija o modelo e, se necessário, redimensione a configuração do veículo **com justificativa**.
4. Toda correção deve valer no core compartilhado, nunca como regra especial em `src/testes.ts`. A interface deve observar o estado físico, não corrigi-lo.
5. Não introduza ignição automática ou sequenciamento temporizado no cenário visual sem autorização explícita do operador. Testes automatizados podem invocar as operações públicas de partida como ações de ensaio.
6. Prefira commits pequenos por marco, cada qual com testes e um resumo de decisões, resultados e limitações. Não modifique o Protótipo 1.
7. Mantenha compatibilidade de cenários BSS-002, BSS-003 e BSS-004, exceto por alterações de comportamento justificadas como correção física; documente eventuais diferenças de resultado.
8. Em cada entrega: liste arquivos alterados, equações/hipóteses, testes executados (com resultado), riscos, pontos ainda não validados e SHA do commit. Não afirme validação de voo real só por testes da simulação.

## 2. Diagnóstico verificado na revisão

### D-01 — Empuxo e vazão são fisicamente inconsistentes para um motor químico

No BSS-005, o motor nominal é configurado com:

| Parâmetro | Valor |
|---|---:|
| Empuxo máximo | 120.000 N |
| Vazão de metano | 2,4 kg/s |
| Vazão de oxigênio | 9,6 kg/s |
| Vazão total nominal | 12,0 kg/s |
| Razão oxidante/combustível | 4:1 |
| Propelente inicial total | 3.000 kg |

Com o modelo idealizado `F = m_dot * Isp * g0`, tais números implicam `Isp ≈ 1.020 s` e velocidade efetiva de exaustão `≈ 10.000 m/s`. São incompatíveis com a ordem de grandeza esperada para um motor químico metano/oxigênio. A referência aproximada de `Isp` para estudos preliminares é da ordem de 300–380 s, variando com pressão ambiente, ciclo e projeto; **não trate essa faixa como especificação universal obrigatória**.

Para 120 kN e `Isp = 350 s`, por exemplo, a vazão total necessária seria aproximadamente `34,96 kg/s`. Na configuração atual, `Bocal` e `CamaraCombustao` calculam empuxo a partir de eficiência e fração de vazão, sem fechar explicitamente essa relação energética/cinemática.

**Importante:** os `6 MW` declarados em `potenciaTermicaMaximaW` também precisam de definição clara (efeito térmico simplificado versus potência química total), para não serem apresentados como balanço energético validado.

### D-02 — O novo teste BSS-005 demonstra subida, não missão completa

`src/physics/objetos/veiculos/Bss05Missao.test.ts` exige ultrapassar 15 km, consumir propelente e manter fixadores íntegros. Não valida apogeu, reserva para frenagem, retorno, reacendimento, controle de aproximação ou toque no solo.

O cenário visual oferece seleção manual entre decolagem e pouso, mas isso não constitui validação automática de um perfil completo de voo.

### D-03 — Controle lateral foi melhorado, mas tem cobertura limitada

`ControladorInclinacaoDePropulsores` agora altera a referência de atitude conforme velocidade horizontal na descida, com introdução gradual do ganho. É um avanço, mas precisa ser exercitado com vento, perturbações, saturação do gimbal, variações do centro de massa e casos de motor desligado. Evitar concluir que existe guiagem horizontal completa apenas porque houve amortecimento de deriva em um teste.

### D-04 — A nova atmosfera é útil para 15 km, mas ainda simplificada

`SistemaAtmosferico` agora varia densidade com altitude, usando a troposfera até 11 km e um trecho isotérmico acima. Manter este comportamento para a fase de 15 km; para voos mais altos, ampliar por camadas atmosféricas apropriadas, com referência e testes. Vento ainda é uniforme na configuração atual. Em `SistemaTermico`, o coeficiente de convecção configurado não varia com a densidade atmosférica; avaliar a coerência física dessa simplificação antes de afirmar fidelidade térmica em altitude.

## 3. Backlog priorizado

### P0 — Fechar a consistência da propulsão (primeiro marco obrigatório)

**Objetivo:** o empuxo não deve contradizer o consumo total de propelente no modelo de missão.

**Arquivos a estudar:** 
- `src/physics/objetos/propulsao/Propulsor.ts`
- `src/physics/objetos/propulsao/combustao/Bocal.ts`
- `src/physics/objetos/propulsao/combustao/CamaraCombustao.ts`
- `src/physics/objetos/propulsao/alimentacao/`
- `src/physics/objetos/veiculos/Bss05Missao.test.ts`
- `src/testes.ts`

**Tarefas:**
- [ ] Identificar a cadeia completa: comando de throttle → válvulas/bombas → massas efetivamente entregues → combustão → empuxo → perda de massa.
- [ ] Definir um modelo simples, explícito e testável de `Isp` ou velocidade efetiva de exaustão para **motores químicos de missão**, respeitando integridade, proporção de mistura, alimentação disponível e desligamentos.
- [ ] Decidir e documentar como a pressão ambiente afetará o empuxo. Se a variação com altitude ficar para outro marco, registrar claramente o empuxo como idealizado e em qual condição é calibrado.
- [ ] Preservar a API genérica do `Propulsor` quando necessário para outros ensaios; não impor sem discussão um `Isp` de foguete químico a todo tipo de propulsão futura.
- [ ] Auditar `potenciaTermicaMaximaW` e a exposição na telemetria: distinguir potência química, aquecimento estrutural e efeito térmico simplificado; não alegar conservação energética total sem modelá-la.
- [ ] Depois de corrigido o modelo, reavaliar empuxo/peso, vazões, massa seca, consumo, tempo de queima e margem propulsiva do BSS-005. Reprojetar parâmetros da missão se necessário, mantendo limites fisicamente justificáveis.

**Critérios de aceite:**
- [ ] Teste unitário demonstra `Isp_efetivo = F / (m_dot_total * g0)` para uma condição nominal documentada, dentro da tolerância numérica escolhida.
- [ ] Testes com 0%, 50% e 100% de throttle, mistura correta e incorreta, falta de oxidante/combustível e dano de motor.
- [ ] Balanço de massa fechado por passo (massa consumida por cada tanque e vazão real informada); jamais há empuxo sem consumo, ignição confirmada ou sistema operacional.
- [ ] Não esconder falha na missão: se o BSS-005 não decolar ou não chegar a 15 km com parâmetros corrigidos, o teste informa a inviabilidade em vez de contornar a física.
- [ ] Regressões dos propulsores existentes continuam passando ou recebem revisão tecnicamente justificada.

### P1 — Ensaio completo e reproduzível da missão BSS-005

**Objetivo:** validar uma trajetória de subida e retorno com recursos limitados.

**Tarefas:**
- [ ] Criar ensaio determinístico da missão que registre estados/fases: solo, decolagem, subida, corte, apogeu, descida, frenagem e contato final.
- [ ] Distinguir altitude-alvo de 15 km, apogeu efetivo e altitude de início da frenagem. Não confundir atingir altitude com completar missão.
- [ ] Registrar ao longo do tempo altitude, velocidades X/Y, orientação, velocidade angular, massa, CH4/O2 restante, T/W, arrasto, pressão dinâmica, throttle, gimbal, energia elétrica, estados operacionais e integridade.
- [ ] Testar ausência de combustível/reserva de pouso e deixar o motor se comportar conforme recursos e comandos reais. Não criar combustível nem forçar repouso.
- [ ] Definir limites de sucesso justificados para velocidade vertical e horizontal no toque, atitude, integridade, contato das sapatas e manutenção dos vínculos.
- [ ] Separar teste de capacidade de subida de teste de pouso. Adicionar teste integrado apenas quando ambos forem observáveis e reproduzíveis.
- [ ] Se for necessário sequenciamento de comandos para teste automatizado, implementá-lo como **script de ensaio que chama a API pública**, não como um piloto automático implícito na interface visual.

**Critérios de aceite:**
- [ ] Testes cobrem uma missão nominal e pelo menos falhas de combustível e controle.
- [ ] No ensaio nominal, sucesso depende de toque físico calculado pelo core e tolerâncias documentadas.
- [ ] Falha de pouso por impacto, tombamento ou falta de empuxo é reportada como falha com telemetria, não mascarada.
- [ ] Repetição com mesmas condições e `dt` produz resultados equivalentes e determinísticos.

### P1 — Robustez do controle lateral e de atitude

**Arquivos a estudar:** `ControladorInclinacaoDePropulsores.ts`, `ControladorInclinacaoPid.ts`, `ControladorDescidaFuzzyPidDePropulsores.ts`, `ComputadorDeVoo.ts` e testes correspondentes.

**Tarefas:**
- [ ] Validar sinais, unidades, orientação, força lateral e torque produzido pelo gimbal com velocidade X positiva/negativa e atitude inicial positiva/negativa.
- [ ] Testar a passagem subida → apogeu → descida, inclusive a troca da referência de atitude e a reinicialização/integral do PID.
- [ ] Testar gimbal saturado, limitação de velocidade angular, motor apagado, inércia/centro de massa variável, perturbação horizontal e vento constante.
- [ ] Distinguir amortecimento de deriva (velocidade horizontal) de guiagem a um alvo de posição X. Não declarar controle de posição sem modelá-lo.
- [ ] Garantir que controle de throttle e controle de gimbal continuem independentes e que o gerenciador arbitre conflitos sem comandos contraditórios.
- [ ] Verificar se a prioridade/lógica de ativação deixa o amortecimento habilitado quando o controle correspondente estiver inativo; corrigir qualquer persistência indevida.

**Critérios de aceite:**
- [ ] Testes determinísticos demonstram redução real da velocidade horizontal nas condições onde há autoridade de controle, sem violar limites do atuador.
- [ ] Sem empuxo, o controlador não cria movimento lateral artificial.
- [ ] Falhas e condições não recuperáveis preservam o comportamento físico, diagnóstico e integridade estrutural.

### P2 — Atmosfera e efeitos térmicos coerentes

**Tarefas:**
- [ ] Adicionar testes com pontos de referência de densidade em 0, 11 e 15 km, continuidade nas fronteiras e vácuo explícito.
- [ ] Confirmar que arrasto, aquecimento aerodinâmico e eventuais forças de superfícies usam a **mesma** densidade local obtida pelo core.
- [ ] Avaliar dependência da convecção com densidade, fluxo e temperatura ambiente; documentar o modelo simplificado escolhido.
- [ ] Antes de estender missões acima da estratosfera baixa, introduzir perfil por camadas, gravidade variável com altitude e vento por altitude **apenas quando requerido por um cenário**, sem abstrações prematuras.

**Critérios de aceite:**
- [ ] Não há salto de densidade na tropopausa nem força de arrasto atmosférico em vácuo.
- [ ] Uma mesma configuração física apresenta arrasto coerentemente menor em altitude maior, respeitando velocidades e área.
- [ ] Limitações e faixa de validade ficam documentadas.

### P2 — Instrumentação, rastreabilidade e documentação

**Tarefas:**
- [ ] Expor na bancada de forma legível dados de missão, incluindo `Isp` efetivo quando aplicável, massa total, delta-v estimado **com hipótese identificada**, pressão dinâmica e causas de corte do motor.
- [ ] Fazer o trace permanecer ligado ao estado real e armazenar informação suficiente para reproduzir as entradas e o `dt` de um teste.
- [ ] Atualizar o `README.md` para refletir BSS-004/BSS-005 e a atmosfera por altitude; hoje há trechos de escopo e limitações desatualizados.
- [ ] Manter cenários/telemetria sem duplicar leis físicas em `src/testes.ts`.
- [ ] Realizar smoke test da bancada `tests.html` para BSS-002/003/004/005 e seus controles, com registro do que foi de fato testado.

**Critérios de aceite:**
- [ ] Build, typecheck e testes passam, com resultados informados.
- [ ] Instrumentação não altera a trajetória ao ser ligada/desligada.
- [ ] README e interface não apresentam como “validado” o que permanece idealizado.

## 4. Ordem de execução e entregas

| Marco | Escopo | Entrega esperada |
|---|---|---|
| **M0** | Verificação da base e diagnóstico quantitativo | Resultado de testes atuais, curva `F / m_dot / Isp`, inviabilidades encontradas |
| **M1** | P0: modelo propulsivo coerente | Código, testes unitários, dimensões recalibradas e justificativa |
| **M2** | P1: missão completa e perdas | Ensaios determinísticos de subida, retorno e falhas, com critérios explícitos |
| **M3** | P1: controle lateral robusto | Testes com perturbações, saturação, transições e diagnóstico |
| **M4** | P2: atmosfera/térmico + observabilidade | Testes físicos adicionais, traces e documentação atualizada |

**Regra de passagem:** cada marco só está concluído com teste/regressão e avaliação das limitações; se a física indicar que o veículo não alcança o objetivo, relatar o resultado antes de alterar requisitos ou metas.

## 5. Resposta que o Codex deve entregar ao fim de cada marco

- **O que foi alterado:** resumo técnico e caminhos dos arquivos.
- **O que foi medido:** resultados numéricos relevantes (especialmente massa, vazão, empuxo, `Isp`, apogeu e condições do toque).
- **Testes executados:** comandos, quantidade, aprovados/falhados, build e typecheck.
- **Riscos e simplificações restantes:** itens não comprovados e problemas conhecidos.
- **Commit:** SHA e link, mais sugestão do próximo marco a revisar.

## 6. Fluxo de trabalho combinado

1. ChatGPT revisa o commit mais recente e registra achados verificáveis.
2. ChatGPT cria/atualiza um plano Markdown versionado no GitHub, priorizado para o Codex.
3. Codex implementa **um marco por vez**, testa e comita as alterações.
4. ChatGPT revisa o novo commit, compara com os critérios de aceite e gera o plano seguinte.
5. Nenhuma etapa declara “física validada” apenas porque a simulação executou ou atingiu um número-alvo.

**Observação:** esta revisão foi feita por leitura do código e diff do commit-base; a suíte de testes não foi executada nesta etapa.

## 7. Revisão técnica do BSS-006 após o voo completo

**Data:** 2026-10-10 (horário de Brasília).  
**Commit revisado:** [`c699ea8b082ee2f7ce1f8778d3cb7d38c91443ff`](https://github.com/evertaraujo-lgtm/blackstarprototipo2/commit/c699ea8b082ee2f7ce1f8778d3cb7d38c91443ff) — `Fix BSS06 landing guidance and validate complete flights`.  
**Evidências versionadas:** `src/cenarios/BancadaBss.test.ts`, `docs/validacoes/bss06-voo-completo.md`, `docs/validacoes/bss06-voo-completo.json`.  
**CI desse commit:** [GitHub Actions #38106615936](https://github.com/evertaraujo-lgtm/blackstarprototipo2/actions/runs/38106615936), concluído com sucesso (testes, `typecheck` e `build`).  
**Escopo desta revisão:** leitura do diff, implementações e evidências do repositório. Não executei localmente testes ou nova simulação; os resultados numéricos abaixo são os publicados no commit.

### 7.1 O que mudou e o que está comprovado no simulador

- **[Implementado]** Cenário extraído para `src/cenarios/BancadaBss.ts` e compartilhado entre interface e regressão. Os testes agora exercitam a mesma fábrica de montagem da bancada.
- **[Implementado]** A guiagem horizontal passou a calcular **atitude-alvo** e comandar gimbal e grid fins para persegui-la. A versão anterior podia gerar torque contraproducente: a validação relata toque cerca de 242 m fora do alvo, com deriva de 16,5 m/s e ruptura de vínculos.
- **[Implementado, heurístico]** Na conversão de aceleração lateral em referência angular, o denominador passou a ser `max(empuxoAtual, massa * g, 1)`, evitando divisão por empuxo próximo de zero. Isso limita a referência; **não representa empuxo disponível quando o motor está apagado**.
- **[Implementado]** BSS-006 fornece ao Fuzzy-PID um callback opcional de contato geométrico das sapatas; cenários antigos continuam com a lógica de altitude quando o callback não existe. A velocidade-alvo terminal do BSS-006 foi reduzida a 0,15 m/s.
- **[Testado]** Quatro casos de missão integrada (troca para modo Pouso a 80 m ou 300 m; alvos X = 0, +34,7 m e -34,7 m); partida manual simulada via API; apogeu, descida, contato, ausência de rompimento e ao menos 3 s de repouso.
- **[Testado]** Selecionar Pouso sem ignição não provoca decolagem nem consumo. A perda elétrica interrompe controle/empuxo; a queda resulta em dano e rompimento de fixadores.
- **[Testado na CI]** `npm test -- --run`, `npm run typecheck` e `npm run build` passaram no commit acima. Isso não valida fidelidade aeroespacial do modelo.

**Resultados publicados para troca de modo a 300 m; apogeu ~358,4 m:**

| Alvo X (m) | X no toque (m) | Erro absoluto (m) | |v vertical| no toque (m/s) | |v horizontal| no toque (m/s) |
|---:|---:|---:|---:|---:|
| 0 | 0,529 | 0,529 | 0,131 | 0,001 |
| +34,7 | +35,122 | 0,422 | 0,131 | 0,027 |
| -34,7 | -34,065 | 0,635 | 0,131 | 0,028 |

Os três terminaram com empuxo zero, integridade informada de 100%, sem fixadores rompidos e repouso monitorado. **Conclusão permitida:** sucesso de voo integrado **de baixa altitude**, no modelo idealizado e nas condições específicas testadas. **Não declarar** validação de missão a 15 km, de pouso com vento, de voo 3D ou de controlador adequado a foguete real. O teste `Bss05Missao.test.ts` demonstra subida a 15 km, não retorno completo.

### 7.2 Backlog atualizado: defeitos e riscos ainda abertos

#### P0-A — Fechar balanço de massa, empuxo e energia da propulsão

**Evidência:** `src/cenarios/BancadaBss.ts` mantém o BSS-006 com empuxo máximo nominal de 120 kN, metano 2,4 kg/s e oxigênio 9,6 kg/s, implicando `Isp = F / (m_dot_total * g0) ≈ 1.020 s`, incompatível com um motor químico CH4/O2 convencional. `Bocal.ts` multiplica empuxo nominal por eficiências/fração de vazão sem impor uma velocidade efetiva de exaustão fisicamente coerente. O resultado positivo de pouso **não** corrige essa inconsistência.

**Tarefas:**
- [ ] Executar o P0 da seção 3 antes de usar alcance, massa de propelente ou reserva de pouso como evidência de viabilidade.
- [ ] Implementar relação explícita entre fluxo mássico, `Isp`/velocidade de exaustão, empuxo e condição de operação, preservando a abstração genérica de propulsão.
- [ ] Auditar calor/potência declarados e massa consumida a cada passo; recalibrar combustível, oxidante, empuxo e perfil de voo **com justificativa**, sem alterar a física para manter testes artificialmente verdes.

**Aceite:** invariantes de massa e empuxo verificados em testes de mistura nominal/desbalanceada, throttle, ignição, falta de propelente e falha elétrica; repetir o voo BSS-006 com o **novo** modelo e reportar sucesso ou inviabilidade sem mascaramento.

#### P0-B — Remover contabilização duplicada de arrasto nas grid fins

**Evidência por inspeção:** `AletaAerodinamica.ts` configura `areaFrontalM2`/`coeficienteArrasto` na classe-base e também retorna um vetor de arrasto em `obterForcasAerodinamicas()`. `MundoFisico.ts` acumula **ambas** as forças no mesmo passo, pelo caminho `getAreaArrastoEfetivaM2() → SistemaAtmosferico.calcularArrasto()`. Isso indica arrasto duplicado da aleta.

**Tarefas:**
- [ ] Definir uma única autoridade para o arrasto de superfícies móveis e eliminar a duplicação no core/modelo compartilhado.
- [ ] Medir força aerodinâmica líquida com deflexão 0, positiva e negativa, sob velocidade/densidade controladas.
- [ ] Conferir se forças da aleta são aplicadas no ponto físico correto e produzem torque com sinal e magnitude plausíveis.
- [ ] Comparar os mesmos voos com e sem aletas, incluindo motor desligado, para medir a contribuição isolada de grid fins.

**Aceite:** um único termo de arrasto por componente, força nula com ar sem movimento relativo e densidade zero, força coerente com `q = 0,5 * rho * v_rel^2`, e regressões de toque sem ajustes arbitrários nos ganhos.

#### P0-C — Endurecer a detecção de toque e o intertravamento de corte

**Evidência:** no BSS-006, `obterContatoComSolo` verifica se **algum** ponto geométrico de **alguma** sapata alcançou `y_solo + 1e-6`; o Fuzzy-PID também exige apenas velocidade vertical maior que `-velocidadeToqueMps` para declarar `toque`. Não exige, nessa decisão, baixa velocidade lateral, atitude, rotação, apoio estável ou confirmação do resolvedor de contatos. Trata-se de uma aproximação geométrica ideal, **não** de sensor real.

**Tarefas:**
- [ ] Expor sinal físico explícito de contato/apoio por sapata a partir do sistema de colisão/contato; definir invariantes de confiabilidade, tolerância e histerese.
- [ ] Separar eventos `primeiro-contato`, `toque-seguro`, `repouso-estável` e `pouso-falhou`; definir critérios verificáveis para cada um.
- [ ] Testar contato com somente uma sapata, inclinação excessiva, alta velocidade lateral, velocidade angular e oscilações em torno do limiar; impedir falso sucesso e acionamentos repetidos.
- [ ] Preservar contato/física sob autoridade do core; o controlador apenas decide comandos, nunca fixa posição ou velocidade.

**Aceite:** toque não é classificado como **pouso seguro** sem limites de atitude, velocidades, integridade e apoio definidos; missões que tombam, derrapam ou rompem vínculos falham com diagnóstico reproduzível.

#### P1-A — Centralizar a propriedade do gimbal e a transição de estados

**Evidência:** `ControladorGuiaPousoBss06.ts` chama `propulsor.solicitarVetorizacao()` diretamente; o Fuzzy-PID de throttle percorre `ComputadorDeVoo → GerenciadorDeControladores`. O cenário desabilita o PID de subida ao detectar a descida. É funcional nas trajetórias testadas, mas depende da ordem das chamadas e de desativação manual de controlador concorrente.

**Tarefas:**
- [ ] Fazer o controlador de guiagem produzir solicitações de gimbal no fluxo de arbitragem existente, sem tocar diretamente no estado do atuador, conservando o comando das aletas pela interface apropriada.
- [ ] Definir máquina de estados de missão e dono de cada recurso: solo, decolagem, subida, apogeu, descida, frenagem, contato, estabilização e falha.
- [ ] Testar trocas de modo no apogeu, antes/depois da ignição, com motor apagado, atraso de atuador e comandos simultâneos; verificar PID integral/derivada ao habilitar/desabilitar.
- [ ] Garantir que perda elétrica e perda de controle não mantenham comando ativo **nem** criem força/correção artificial.

**Aceite:** o gimbal possui um único comando vencedor por passo (`idAtuador` + recurso), transições são determinísticas, sem sobrescritas silenciosas e com trace de quem tinha autoridade.

#### P1-B — Tornar a guiagem e a aerodinâmica fisicamente rastreáveis

**Evidência:** a referência de atitude `-asin(m * a_x / max(T, m*g))` é heurística e não modela explicitamente `T*cos(theta)`, autoridade real a throttle baixo, vento, saturação de gimbal ou `Isp`. A redução de comando das aletas usa principalmente velocidade, não pressão dinâmica local completa. `AletaAerodinamica` usa sustentação aproximadamente linear na deflexão, sem modelo explícito de ângulo de ataque efetivo e regimes trans/supersônicos.

**Tarefas:**
- [ ] Escrever convenções de sinais/unidades, derivar controle lateral e de atitude a partir das forças/torques efetivamente implementados e validar sinais nos quatro quadrantes de posição/velocidade horizontal.
- [ ] Separar guiagem (trajetória e atitude-alvo), controle de atitude (erro angular, rotação) e alocação de atuação (gimbal vs. superfícies).
- [ ] Usar `rho(h)` e velocidade **relativa ao ar** para modelar `q`; ensaiar densidade, vento, saturação, velocidade de atuador e motor apagado.
- [ ] Manter explícita a faixa de validade do modelo planar; não alegar capacidade 3D, controle de rolagem ou fidelidade de grid fins reais antes da implementação.

**Aceite:** comparação com/sobre grid fins para alvos positivos e negativos; ausência de força sem meio físico; estabilidade, saturação e erro de pouso documentados para perturbações e diferentes massas.

#### P1-C — Falhas, sensores e matriz de regressão

**Tarefas:**
- [ ] Adicionar ruído, atraso, dados congelados/inválidos e indisponibilidade do GPS/sensor de atitude e contato, com falhas injetadas de forma determinística (seed quando aplicável).
- [ ] Definir política de falha do controle de descida por **fase e risco**, não presumir que throttle zero é seguro em toda altitude.
- [ ] Variar alvo X, massa, combustível residual, coeficientes de arrasto, densidade, vento, deslocamento inicial, ganho PID e momento de transferência para pouso.
- [ ] Incluir comparações: sem grid fins; sem empuxo; gimbal travado/saturado; ausência de ignição; perda elétrica; contato unilateral; integridade comprometida.
- [ ] Conservar como **baseline** os quatro testes integrados recém-incluídos e os ensaios de falha; nunca atualizar tolerâncias apenas para esconder regressão.

**Aceite:** resultados por cenário com trajetória/telemetria, motivo de falha ou sucesso, parâmetros completos e limites definidos previamente; testes determinísticos não forçam estado físico.

#### P2 — Observabilidade, documentação e evidência de missão

- [ ] Expor em trace: posição/velocidade X/Y, atitude/alvo, velocidade angular, pressão dinâmica, empuxo, consumo, combustível residual, throttle, comando/ângulo real do gimbal, deflexões das duas grid fins, fase, estado de contato e causa do corte.
- [ ] Persistir versão de código, parâmetros, `dt`, cenários, falhas e amostras suficientes para replay/reexecução; declarar qual é simulação e qual é leitura idealizada.
- [ ] Atualizar README e documentação técnica para distinguir BSS-005 (subida a 15 km) de BSS-006 (pouso integrado a ~358 m de apogeu na validação corrente).
- [ ] Investigar o efeito de observabilidade e de taxa de renderização no determinismo: ligar/desligar trace não deve alterar os resultados físicos.

### 7.3 Ordem recomendada de execução a partir do commit revisado

| Marco | Objetivo | Entrega e critério de passagem |
|---|---|---|
| **R0 — Revisão da base** | Preservar `c699ea8` e resultados de 80/300 m | Baseline versionada com casos nominais e falhas; CI verde |
| **R1 — Integridade física** | P0-A + P0-B: propulsão e aerodinâmica consistentes | Provas de balanço e força; reexecução honesta das missões, mesmo que falhem |
| **R2 — Intertravamentos de pouso** | P0-C: contato físico e touchdown seguro | Ensaios com contato unilateral, deriva, inclinação, rotação e falha |
| **R3 — GNC e contingências** | P1-A + P1-B + P1-C | Arbitragem única, estados explícitos, injeções de falha e robustez |
| **R4 — Instrumentação e extensão** | P2; somente depois aumentar missão para 15 km | Trace, critérios, replay e missão longa com recursos finitos |

**Disciplina de entrega ao Codex:** implementar **um marco por commit**, explicar alterações de parâmetros e hipóteses, executar os testes pertinentes, `typecheck` e `build`, registrar riscos e o SHA. Não alterar o Protótipo 1 nem impor correções exclusivas a `src/testes.ts`. Separar rigorosamente **resultado de teste no simulador** de **validação física**.

### 7.4 Estado consolidado das observações

| Achado | Situação após `c699ea8` |
|---|---|
| Guiagem lateral anteriormente com sinal/torque incoerentes no ensaio nominal | **Corrigido para os casos cobertos**, sem prova de robustez geral |
| Corte antecipado baseado só em altitude | **Mitigado no BSS-006** por consulta geométrica opcional; intertravamento completo segue pendente |
| Testes de missão decolagem → apogeu → descida → pouso | **Implementados em baixa altitude**, não validados a 15 km |
| Perda elétrica e partida sem ignição | **Cobertas por testes integrados** |
| Balanço empuxo/vazão/`Isp` | **Pendente, P0-A** |
| Arrasto duplicado das grid fins | **Pendente, P0-B** |
| Contato seguro e estados de missão rigorosos | **Pendente, P0-C/P1-A** |
| Arbitragem central dos comandos do gimbal | **Pendente, P1-A** |
| Sensores realistas, vento e variação de parâmetros | **Pendente, P1-B/P1-C** |
