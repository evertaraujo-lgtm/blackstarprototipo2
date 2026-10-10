# Plano de melhorias para o Codex — Black Star, Protótipo 2 / BSS-005

**Data da revisão:** 2026-10-10  
**Repositório:** `evertaraujo-lgtm/blackstarprototipo2`  
**Commit-base analisado:** `72b6666700ee5410fb254f2d32647dfe59ef345b` (`Improve BSS05 flight and descent physics`)  
**Status:** planejamento; nenhuma correção de código está implementada por este documento.  
**Prioridade geral:** consistência física antes de adicionar recursos visuais ou aumentar o alcance da missão.

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