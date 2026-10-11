# Plano de melhorias para o Codex — Black Star, Protótipo 2 / BSS-005 e BSS-006

**Data da revisão:** 2026-10-10  
**Repositório:** `evertaraujo-lgtm/blackstarprototipo2`  
**Commit-base analisado:** `72b6666700ee5410fb254f2d32647dfe59ef345b` (`Improve BSS05 flight and descent physics`)  
**Status atual (11/10/2026):** os marcos M0–M4 e M6 foram entregues e aprovados no escopo ensaiado; **a missão de 15 km com retorno permanece NÃO QUALIFICADA**. As seções 2–7 são registros históricos de diagnóstico e backlog, e os estados mais recentes prevalecem conforme a seção 8.
**Prioridade geral:** consistência física antes de adicionar recursos visuais ou aumentar o alcance da missão.

**Atualização de 10/10/2026:** a seção 7 revisa o commit `c699ea8b082ee2f7ce1f8778d3cb7d38c91443ff` e prevalece sobre diagnósticos antigos **apenas quando indicar expressamente uma correção já realizada**. As seções 2–6 preservam o histórico e o backlog original do BSS-005.

**Atualização de 11/10/2026:** a seção 8 consolida a auditoria após M0–M4; a seção 8.5 registra M6. Essas seções substituem a leitura dos itens antigos ainda marcados como pendentes quando a correção já foi comprovada. Não reescreva o histórico como se o código antigo ainda estivesse vigente.

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

| Alvo X (m) | X no toque (m) | Erro absoluto (m) | Módulo V vertical no toque (m/s) | Módulo V horizontal no toque (m/s) |
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
## 8. Auditoria consolidada dos marcos M0–M4

**Data:** 11/10/2026 (horário de Brasília).  
**Commit analisado da M4:** [`18e7ec4`](https://github.com/evertaraujo-lgtm/blackstarprototipo2/commit/18e7ec4d3de59ed5cde4f0ad8f91ac013242b246).  
**Evidências:** `docs/validacoes/2026-10-11-bss005-m0.md`, `2026-10-11-bss005-m1.md`, `2026-10-11-bss005-m2.md`, `2026-10-11-bss005-m3.md` e `2026-10-11-bss005-m4.md`, conforme disponíveis; os respectivos testes e JSONs são a referência quantitativa.  
**Método da auditoria:** inspeção de commits, código, asserts, documentos de validação e resultados de GitHub Actions. **Não foram executados testes locais independentes por esta revisão.** Aprovação se restringe ao escopo e às hipóteses declaradas.

### 8.1 Aprovações dos marcos

- [x] **M0 — Diagnóstico:** [`e639f34`](https://github.com/evertaraujo-lgtm/blackstarprototipo2/commit/e639f34923ee5be94416faa5ad8a997f44fa270b). Inconsistência inicial de `F / m_dot / Isp`, combustível e limites da missão quantificados. **Aprovado como diagnóstico**, não correção física.
- [x] **M1 — Consistência da propulsão:** [`01e603c`](https://github.com/evertaraujo-lgtm/blackstarprototipo2/commit/01e603c5374b57acbbc7534be3ed351d53a3886a). Modelo químico idealizado de `120 kN`, `Isp = 350 s` como hipótese, `m_dot ≈ 34,9617 kg/s`, mistura O2/CH4 4:1 e balanço de massa, com casos de falha; CI concluído com sucesso. **Aprovado no escopo do modelo químico simplificado.** Não constitui qualificação de motor real ou balanço completo de potência.
- [x] **M2 — Ensaio, perdas e observabilidade:** [`231e6f2`](https://github.com/evertaraujo-lgtm/blackstarprototipo2/commit/231e6f2cbcbfa3448c8c8f41d625d5b3747c4807). Ensaio determinístico com subida, corte, apogeu, descida, contato, balanço de massa e falhas; CI concluído com sucesso. **Aprovado como instrumentação e diagnóstico**, **não aprovado como missão de 15 km**. Referência de 300 m pousa com `Vy ≈ −0,444 m/s`; tentativa que seleciona Pouso a 15 km consome reserva e impacta com `Vy ≈ −91,876 m/s`.
- [x] **M3 — Guiagem lateral e gimbal:** [`e724d0b`](https://github.com/evertaraujo-lgtm/blackstarprototipo2/commit/e724d0b44429469aa9de91495dc3833b1927d85e). Corrigidos arrasto **duplicado** das grid fins, sinal do controle lateral, disputa de autoridade do gimbal e transientes do PID. Seis pousos integrados de baixa altitude, incluindo vento constante ±5 m/s, dentro dos critérios declarados, e regressões de saturação/falhas; [CI verde](https://github.com/evertaraujo-lgtm/blackstarprototipo2/actions/runs/38114903816). **Aprovado nas condições ensaiadas**, sem extrapolação para voo 3D ou 15 km.
- [x] **M4 — Atmosfera, térmica e registros:** [`18e7ec4`](https://github.com/evertaraujo-lgtm/blackstarprototipo2/commit/18e7ec4d3de59ed5cde4f0ad8f91ac013242b246). Verificados pontos de densidade em 0/11/15 km e continuidade; convecção ambiente ajustada por densidade local, inclusive vácuo; instrumentação de `q`, `Isp` efetivo, delta-v **ideal**, diagnósticos e diário de entradas por passo. Relatório apresenta **39 testes pertinentes** e reprodução de voo BSS-006 via exportação da tela, diferença máxima `2,8194 × 10^-11`; [CI verde](https://github.com/evertaraujo-lgtm/blackstarprototipo2/actions/runs/38115380693). **Aprovado como correção térmica simplificada e rastreabilidade.** O JSON exige a mesma revisão do código e não é importado automaticamente pela interface.

**Distinção obrigatória:** `marco implementado` ≠ `CI verde` ≠ `missão fisicamente qualificada`. As cinco aprovações acima não autorizam afirmar sucesso de retorno de 15 km.

### 8.2 Itens antes pendentes que mudaram de estado

- [x] **P0-A — Balanço propulsivo:** corrigido na M1, sob a hipótese explícita de Isp constante de 350 s.
- [x] **P0-B — Arrasto duplicado das grid fins:** corrigido na M3, com ensaios de arrasto único, sustentação perpendicular ao fluxo, vácuo e vento relativo.
- [x] **P1-A (parte concluída) — Arbitragem do gimbal:** um vencedor por motor/recurso em cada passo, com identificação do controlador e regressões de transição na M3. **A máquina de estados completa de missão e as políticas de contingência não estão concluídas.**
- [x] **P1-B (parte coberta) — Guiagem lateral:** corrigidos sinais, cálculo com cargas aerodinâmicas existentes e robustez nos casos M3. Permanecem limitações de ângulo de ataque, Mach, vento por altitude e sensores.
- [x] **P2 — Referências atmosféricas e convecção por densidade:** verificadas na M4 dentro de 0–20 km, com tratamento de vácuo. Temperatura ambiente uniforme, convecção parametrizada, sem correlação completa de Reynolds/Mach, radiação ou balanço energético completo.
- [x] **P2 — Telemetria, registro de entradas e replay:** ampliados na M4; reprodução integral demonstrada em uma missão BSS-006, não em todos os cenários ou falhas possíveis.
- [ ] **P0-C / R2 — Intertravamento físico de toque seguro:** a consulta geométrica de sapatas e o desligamento do motor não equivalem a detecção completa de apoio estável.
- [ ] **P1-C / R3 — Sensores, rajadas, falhas por fase e contingências:** permanecem sem qualificação abrangente.

### 8.3 Problemas abertos e próximos marcos sugeridos

**M5 — Perfil de missão e reserva de pouso a 15 km [PRIORIDADE ALTA].**

- [ ] Reproduzir, via API pública e diário de comandos da M4, um procedimento **manual** representativo: decolagem, throttle/corte documentados, trecho balístico e ativação do controle de pouso **na descida, aproximadamente a 1 km**, como relatado pelo operador. O momento exato de corte da subida e a velocidade na aproximação devem ser registrados, não supostos.
- [ ] Separar `altura alvo da subida`, `corte do motor`, `apogeu`, `início da frenagem` e `toque`, calculando orçamento de propelente, `Δv`, margem de frenagem e riscos, sem inventar combustível.
- [ ] Conservar cenários de falha: sem reserva, motor desligado, controle indisponível; classificar impacto e não apenas presença de contato.
- [ ] **Não** ativar automaticamente pouso na interface sem autorização. Primeiro reproduzir como script de ensaio; se a missão for inviável, registrar o diagnóstico antes de redimensionar motor, tanques ou ganhos.
- [ ] Só declarar sucesso de 15 km quando um voo de **subida + retorno** preservar integridade, contatos/repouso e margem documentada.

**M6 — Aerodinâmica do veículo completo [PRIORIDADE ALTA, independente de M5]. Entregue em 11/10/2026; detalhes na seção 8.5.**

- [x] Rever a área aerodinâmica **projetada em função da orientação do corpo em relação ao fluxo**. O casco BSS agora escala os 7 m² de referência pela projeção da geometria retangular XY.
- [x] Auditar componentes expostos e superfície de controle conforme a geometria do veículo, centro de pressão, momentos e efeito de velocidade relativa; arrasto de casco e grid fins é integrado uma vez, sem reintroduzir a duplicação eliminada em M3.
- [x] Comparar queda longitudinal, lateral e girando com **mesma massa/atmosfera**, avaliar força, torque e velocidade descendente. A comparação não reutiliza o pico amostrado de `≈207 m/s` na M2 como velocidade terminal.
- [x] Registrar hipótese de `Cd` constante e limitações do modelo planar, sem atribuir precisão aerodinâmica real à geometria simplificada. Evidências: [relatório M6](../validacoes/2026-10-11-bss005-m6-aerodinamica.md).

**M7 — Contato, pouso seguro e consequências do impacto [PRIORIDADE ALTA].**

- [ ] Separar primeiro contato geométrico, reação do resolvedor, apoio de ambas as sapatas, toque dentro dos limites, repouso estável e pouso seguro.
- [ ] Investigar penetração geométrica residual de aproximadamente **34 mm** e movimento persistente dos componentes danificados nos ensaios M2 após ruptura; preservar conservação e resposta de contatos, sem congelar destroços para atingir tolerâncias.

**M8 — Contingências e sensoriamento [PRIORIDADE POSTERIOR].**

- [ ] Injetar sensores congelados, erros/atrasos, perda elétrica, falha do atuador e rajadas de vento; definir política por fase e regressões de não recuperação.
- [ ] Estender o modelo atmosférico, gravidade e vento em altitude quando houver exigência concreta de missão acima da faixa hoje testada.

### 8.4 Regra para a próxima auditoria

Preservar as evidências M0–M4 e M6 e verificar tanto o comportamento nominal quanto os casos adversos. Recolher as entradas reais do operador quando disponíveis; não adivinhar o corte da subida a partir de um pouso relatado. M5 permanece prioritário e não qualificado; M7 e M8 permanecem backlog.

### 8.5 Entrega M6 — projeção e cargas aerodinâmicas

- **[Implementado]** Área do casco BSS projetada conforme atitude e fluxo relativo, com área de referência mantida para a atitude longitudinal.
- **[Implementado]** Centro de pressão local opcional transformado pelo core; o ponto de aplicação do arrasto participa do torque de corpos independentes e ilhas estruturais.
- **[Auditado]** O arrasto das grid fins continua vindo uma vez da área efetiva da classe-base; sustentação permanece como força separada, sem duplicar arrasto.
- **[Testado]** Casco longitudinal, lateral e girando sob mesma massa e atmosfera; força, área projetada, torque e resposta angular. Regressões: 9 cenários BSS-006, subida BSS-005 a 15 km, 16 testes M3, 50 testes do core físico e 13 testes M4.
- **[Limitação]** Geometria retangular planar e `Cd` constante; não representa CFD, variação com Mach/Reynolds, oclusão de componentes ou precisão aerodinâmica real. M5 continua pendente.
- Relatório: [`docs/validacoes/2026-10-11-bss005-m6-aerodinamica.md`](../validacoes/2026-10-11-bss005-m6-aerodinamica.md).

### 8.6 Auditoria independente da entrega combinada M5/M6 (11/10/2026)

**Commit revisado:** [`32fb563`](https://github.com/evertaraujo-lgtm/blackstarprototipo2/commit/32fb5631c71596921cb4eb97ff34f30a22334461) (`feat: adiciona replay M5 e aerodinamica M6`). **Método:** comparação do diff com os requisitos, inspeção de implementações/testes e [CI da entrega](https://github.com/evertaraujo-lgtm/blackstarprototipo2/actions/runs/38152147183). **A CI executou `npm test -- --run`, `npm run typecheck` e `npm run build` e terminou com sucesso.** Não houve execução local independente do simulador nesta auditoria.

- [x] **M6 — APROVADA COMO MODELO GEOMÉTRICO PLANAR SIMPLIFICADO.** O casco BSS-005/BSS-006 passou a usar projeção da área em função de atitude e direção do fluxo relativo. Para `dimX = 3,2 m`, `dimY = 6 m`, `A_ref = 7 m²`, a área longitudinal é `7 m²` e a lateral é `13,125 m²` (razão `1,875`). O arrasto continua calculado uma única vez no core; a resultante pode atuar em centro de pressão configurável e gerar torque em corpo isolado ou ilha estrutural. Há quatro testes M6 específicos e regressões dos cenários/controles. O teste de subida BSS-005 agora registra cruzamento de 15 km em `72,74583 s` e propelente restante `456,6821 kg`. Essas mudanças substituem os números antigos da subida para a revisão atual do modelo.
- [x] **M5-A — MECANISMO DE REPLAY IMPLEMENTADO E TESTADO.** Lê diário compatível com a fábrica BSS-005, confere `dt`, configuração e estado inicial, reproduz comandos pela API pública, registra corte/apogeu/contato e mede erro de massa. Cinco testes unitários passam; o replay determinístico criado no teste usa somente **24 passos de 1/240 s = 0,1 s**, não uma missão orbital ou retorno.
- [ ] **M5-B — REPRODUÇÃO DO VOO MANUAL DE 15 KM: PENDENTE.** O arquivo original com os comandos efetivamente aplicados pelo operador ainda não está presente. Não foram determinados os instantes de corte da subida, reserva, velocidade na aproximação e acionamento do pouso durante a descida perto de 1 km. Não é correto afirmar que o replay já reproduziu ou validou esse pouso. O teste M2 acionava o modo pouso *na subida*, em 15 km: missão distinta.
- [ ] **M5-C — ORÇAMENTO VERTICAL E QUALIFICAÇÃO DO RETORNO: PENDENTE.** Reexecutar o perfil integral com a aerodinâmica M6 vigente, registrar consumo e margem de frenagem; distinguir eventos de primeiro contato, toque seguro e repouso. Uma regressão de subida a 15 km não qualifica a descida.

**Ressalvas para a evolução aerodinâmica:** o BSS declara `centroPressaoLocalM = Vetor3.zero` para o casco, portanto o modelo **não presume torque restaurador próprio do casco** por deslocamento entre centro de pressão e centro de massa; os módulos aerodinâmicos expostos podem gerar outros momentos. O modelo usa `Cd = 0,65` constante, contorno retangular planar e não resolve Mach, ângulo de ataque real em 3D, oclusão ou CFD. A velocidade máxima descendente de `≈ 207 m/s` vem da M2 **anterior à M6**: não reaproveitar como resultado do voo atualizado sem reexecutar a missão.

**Próximo trabalho:** obter um diário BSS-005 real, versioná-lo preservando a revisão necessária à reprodução e executar M5-B/M5-C. Após isso, prosseguir com M7 (contato e pouso seguro) e M8 (sensores/contingências) em commits independentes; não ajustar limites para fabricar um pouso bem-sucedido.
