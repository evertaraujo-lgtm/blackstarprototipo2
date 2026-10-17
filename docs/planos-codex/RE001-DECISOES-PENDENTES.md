# RE-001 — decisões para revisão do operador

Execução de 17/10/2026, base `55083ae`. A autorização de autonomia é
temporária e exclusiva desta execução. Não altera `AGENTS.md`, não autoriza
deploy e não vale para tarefas futuras. Commit, testes e ausência do operador
não significam aprovação técnica. Os itens P01–P12 aguardam decisão individual:
**aprovar, rejeitar ou solicitar ajustes**.

## Já aprovadas

### A01 — Escopo e fronteiras

- **Classificação:** já aprovadas, pelo pedido original.
- **Problema:** criar laboratório de reentrada sem alterar a dimensionalidade ou experiências anteriores.
- **Solução:** `/reentrada.html`, mesmo MundoFisico XY/KDK, modelos específicos opt-in, flaps/energia/sensores/arbitragem/diário compartilhados; nenhum acesso ao legado e nenhum deploy.
- **Alternativas:** segundo integrador, 3D ou vista XZ foram expressamente excluídos.
- **Justificativa:** requisitos explícitos do operador.
- **Riscos:** fidelidade dos novos modelos permanece sujeita aos itens provisórios.
- **Arquivos:** `reentrada.html`, `src/cenarios/EnsaioReentrada.ts`, `src/physics/MundoFisico.ts`, `vite.config.ts` e navegação.

### A02 — Limiares do orbitador e dos flaps

- **Classificação:** já aprovadas, pela resposta expressa do operador.
- **Problema:** definir início de degradação sem atribuir qualificação a materiais.
- **Solução:** corpo 1.100 °C e flaps 900 °C, editáveis no avançado, registrados no diário, dano progressivo existente.
- **Alternativas:** valor obrigatório a cada ensaio ou dados de materiais reais; operador escolheu padrões provisórios.
- **Justificativa:** comando explícito; valores não representam temperaturas internas admissíveis ou qualificação.
- **Riscos:** proteção térmica, estrutura e atuadores ainda não são camadas térmicas separadas.
- **Arquivos:** `EnsaioReentrada.ts`, `OrbitadorReentrada.ts`, `FlapReentrada.ts`, `reentrada.html`, `src/reentrada.ts`.

### A03 — Bateria interna

- **Classificação:** já aprovadas, pela resposta expressa do operador.
- **Problema:** não herdar 1.100/900 °C como limite da bateria interna.
- **Solução:** limite independente 60 °C, editável/registrado, sem convecção externa, arrasto ou condução através da fixação; degradação progressiva pelo mecanismo existente de Objeto quando recebe energia térmica de ensaio.
- **Alternativas:** limite compartilhado ou transferência térmica ainda não modelada; ambos descartados pelo operador.
- **Justificativa:** instrução explícita de isolamento neste marco.
- **Riscos:** não modela fuga térmica, calor de descarga ou temperatura certificada de operação.
- **Arquivos:** `EnsaioReentrada.ts`, `reentrada.html`, `src/reentrada.ts`, `EnsaioReentrada.test.ts`.

## Provisórias aguardando aprovação

### P01 — Geometria, massa e montagem de engenharia

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** não foram fornecidos CAD, massa ou distribuição física do orbitador.
- **Solução escolhida:** corpo 78.900 kg e 40×8×16 m; dois flaps de 500 kg e 4×2×8 m, a x=±16 m/y=−5 m; bateria 100 kg e 0,5 m de lado. Total conectado 80.000 kg, com CM e inércia da ilha real do core.
- **Alternativas:** impedir criação até obter CAD; reutilizar geometria de BSS vertical; corpo pontual sem módulos.
- **Justificativa:** hipótese reversível, explícita e suficiente para ensaiar interfaces/cargas XY sem inventar geometria validada.
- **Riscos:** inércia, torque, trajetória, balística e contatos não representam veículo qualificado; geometria de colisão permanece a caixa dos objetos, enquanto a silhueta é ilustrativa.
- **Arquivos afetados:** `ModeloAerodinamicoReentrada.ts`, `OrbitadorReentrada.ts`, `EnsaioReentrada.ts`, renderer e testes.

### P02 — Perfil de atmosfera estendido

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** o perfil central existente transiciona ao vácuo aos 25 km e não serve a 120 km.
- **Solução escolhida:** perfil C0 por interpolação de log(rho) e temperatura em âncoras arredondadas inspiradas na USSA-1976; domínio 0–200 km; cauda exponencial explícita H=50 km acima do domínio, temperatura constante; condição de nível do mar abaixo de zero.
- **Alternativas:** implementação completa de USSA-1976/NRLMSISE; extrapolação do perfil legado; corte em altitude arbitrária.
- **Justificativa:** mantém densidade positiva e continuidade, registra tabela/revisão e identifica extrapolação, preservando padrões antigos.
- **Riscos:** aproxima geometria/geopotencial, ignora composição e atividade solar; não é atmosfera superior validada.
- **Arquivos afetados:** `PerfilAtmosfericoReentrada.ts`, `SistemaAtmosferico.ts`, `MundoFisico.ts`, fábrica, testes e documentação.

### P03 — Polar analítica, CP e flaps

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** inexistem polares ou dados experimentais do orbitador fornecidos ao ensaio.
- **Solução escolhida:** S=250 m²; Cl=0,9 sin(2α)(0,85+0,15 M/(1+M))×integridade; Cd=0,12+1,6 sin²α+termo Mach gaussiano. CP entre −0,15 e −0,5 m. Cada flap usa S=16 m², Cl=1,2 sin(delta)×integridade e Cd=0,06+0,4 sin²(delta). Forças aplicadas nos CPs pelo core, arrasto único.
- **Alternativas:** apenas arrasto balístico; aguardar CFD/túnel de vento; atribuir tabelas não existentes ao veículo.
- **Justificativa:** fórmulas suaves e identificadas como hipóteses permitem testar o encadeamento força/torque/controle.
- **Riscos:** não há fidelidade demonstrada em qualquer regime, incluindo Mach baixo/estol; não se devem interpretar os coeficientes como dados reais.
- **Arquivos afetados:** `ModeloAerodinamicoReentrada.ts`, `OrbitadorReentrada.ts`, `FlapReentrada.ts`, controlador, fábrica e testes.

### P04 — Identificação de rarefação e Mach

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** é necessário mostrar quando o contínuo deixa de ser apropriado, sem solver rarefeito disponível.
- **Solução escolhida:** som ideal com γ=1,4 e R=287,05287 J/(kg·K); lambda*rho constante a partir de 6,6e−8 m no nível do mar; Kn=lambda/8 m; limites 0,01/0,1/10 para contínuo, deslizamento, transição e molecular.
- **Alternativas:** DSMC/composição variável; omitir indicador; desligar aerodinâmica em altitude fixa.
- **Justificativa:** identifica regime/limitação sem corte artificial, inclusive em 120 km.
- **Riscos:** forças continuam sendo extrapolação analítica não qualificada no rarefeito; Mach/Kn não substituem solução de escoamento.
- **Arquivos afetados:** perfil, modelo aerodinâmico, telemetria, interface, testes e relatório.

### P05 — Aquecimento e capacidade térmica concentrada

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** não há propriedades de TPS, malha térmica ou calorimetria do veículo.
- **Solução escolhida:** indicador de forma Sutton–Graves, k=1,7415e−4 SI, limitado ao fluxo cinético incidente. Corpo Rn=2 m/área aquecida 80 m²/c=800 J/(kg·°C); flaps Rn=0,5 m/área 2 m²/c padrão 500 J/(kg·°C). Transferência min(fluxo×área,D·V), substituindo a fração antiga uma vez. Convecção ambiente padrão com reservatório uniforme 20 °C. Bateria isolada, sem calor de descarga modelado.
- **Alternativas:** apenas fração de potência de arrasto; modelo TPS/estrutura/radiação/ablação completo; indicador térmico sem evoluir temperatura.
- **Justificativa:** separa dissipação, calor recebido, temperatura e dano, preservando o SistemaTermico e Objeto existentes.
- **Riscos:** indicador não validado em escoamento rarefeito, distribuição superficial ou temperaturas internas. Dano usa o mecanismo existente acionado pelas trocas de energia; bateria previamente aquecida e isolada sem nova troca não é um ensaio térmico qualificado deste marco.
- **Resultado observado:** com as hipóteses atuais, o ensaio nominal de 600 s excede o limiar dos flaps perto de 369 s e chega a integridade zero cerca de 405 s. O controle perde autoridade; o resultado reprova qualquer interpretação de reentrada segura/qualificada desse conjunto de parâmetros.
- **Arquivos afetados:** `Objeto.ts`, `SistemaTermico.ts`, modelo, corpo, flap, fábrica, testes e documentação.

### P06 — Energia e dinâmica dos atuadores

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** faltam especificações do acionamento real dos flaps.
- **Solução escolhida:** reutilizar AletaAerodinamica/ConexaoEletrica, curso ±30°, taxa 20°/s, 300 W em movimento e 6 W em repouso, fonte interna 28 V/20 MJ, dois circuitos independentes. Bateria/cabos internos omitidos visualmente, preservando sua física/massa.
- **Alternativas:** hidráulica completa; atuação instantânea sem energia; usar valores de um motor diferente sem justificativa.
- **Justificativa:** componentes existentes já oferecem taxa, energia finita e intertravamentos, sem criar controlador embutido no atuador.
- **Riscos:** potência/taxa são calibração de ensaio, sem prova de torque, rigidez ou mecanismo real; dissipação térmica dos atuadores não está modelada.
- **Arquivos afetados:** `MODELO_REENTRADA`, fábrica e `FlapReentrada.ts`; componentes compartilhados são reutilizados sem alterar seus padrões.

### P07 — Rolagem prescrita e peças separadas

- **Classificação:** provisórias aguardando aprovação quanto à calibração; a projeção Lcos(phi) e ausência de terceira rotação foram aprovadas no pedido.
- **Problema:** falta taxa operacional real de bank e dinâmica espacial de destroços.
- **Solução escolhida:** curso ±90° e taxa 10°/s; comandos históricos e falha de disponibilidade; colapso do corpo indisponibiliza a rolagem virtual. Lift dos flaps conectados recebe a mesma projeção; ao separar, mantém a última projeção e lift/drag próprios, sem transferir força para o casco.
- **Alternativas:** rolagem instantânea; dinâmica 3D; continuar controlando a peça separada pela variável do casco; remover suas cargas aerodinâmicas.
- **Justificativa:** preserva a aproximação XY, evita desaparecimento artificial de forças e não inventa autoridade RCS.
- **Riscos:** não representa torque real ou rolagem livre dos destroços; taxa limitada não qualifica manobra física.
- **Arquivos afetados:** `RolagemVirtual.ts`, `OrbitadorReentrada.ts`, `FlapReentrada.ts`, fábrica, renderer e testes.

### P08 — Controle de atitude e corredor

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** faltam lei de guiagem calibrada e requisitos quantitativos de corredor.
- **Solução escolhida:** PD de α/taxa relativa ao fluxo, ganhos 0,008/0,18, compensação de torque passivo e comandos opostos dos flaps via arbitragem; limiar numérico de autoridade 100 N·m por rad. Corredor padrão q≤50 kPa, indicador térmico≤500 kW/m² e carga≤5 g₀. Ao exceder, pede α pelo menos 55° (limitado a 70° para esse ajuste) e bank zero.
- **Alternativas:** controle manual apenas; PID com integral sem autoridade suficiente; guiagem ótima/modelo preditivo; RCS fictício.
- **Justificativa:** permite observar saturação e resposta física com uma lei simples sem windup ou escrita cinemática.
- **Riscos:** heurística sem garantia de estabilidade global, corredor seguro ou ótimo; sem RCS em baixa densidade a atitude pode divergir do pedido.
- **Arquivos afetados:** `ControladorReentrada.ts`, modelo, telemetria/fábrica, testes e interface.

### P09 — Critérios e posse de pouso

- **Classificação:** provisórias aguardando aprovação para os limites; bloqueio por falta de sistemas foi previsto no pedido.
- **Problema:** ControladorPouso existe, mas RE-001 não tem motores/instalação propulsiva compatível.
- **Solução escolhida:** adaptador existente registrado/desabilitado; critérios editáveis: altitude 20–5.000 m, velocidade≤150 m/s, desvio da vertical≤15°, trajetória entre −90°/−5°, sensores/integridade/propulsão/integração válidos. Transferência exclusiva pela arbitragem. Falha de sensores/integridade ou perda propulsiva em pouso retira ambos; fase de falha exige novo ensaio neste marco.
- **Alternativas:** habilitar pouso somente por altitude; fabricar sucesso; instalar RCS/motores fora do escopo; transferência sem exclusão de posse.
- **Justificativa:** oferece infraestrutura verificável e bloqueio explícito em vez de encaminhar comandos incompatíveis.
- **Riscos:** testes de portas simuladas comprovam lógica de posse, não pouso físico do orbitador; limites precisam ser revistos quando os sistemas forem instalados.
- **Arquivos afetados:** `SupervisorReentrada.ts`, `ControladorReentrada.ts`, `GerenciadorDeControladores.ts`, filtro do `ComputadorDeVoo.ts`, fábrica, testes e interface.

### P10 — Resistência e qualificação dos vínculos

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** não foram fornecidos ensaios estruturais dos componentes/conexões.
- **Solução escolhida:** resistência a impacto do corpo 100 MJ, flaps/bateria 1 MJ; fixadores 100 MN. Manter o resolvedor real de impacto/ruptura e separação operacional sem impulso artificial. Não acrescentar solicitação operacional de esforço sem fonte física declarada.
- **Alternativas:** vínculo indestrutível; valores presumidos como certificados; novo resolvedor aeroestrutural paralelo.
- **Justificativa:** parâmetros provisórios permitem testes de integridade/colisão no core sem alterar o resolvedor legado.
- **Riscos:** esforços aerodinâmicos distribuídos dos vínculos e dano por sobrecarga sustentada não estão qualificados; os 100 MN não demonstram resistência aeroestrutural do veículo.
- **Arquivos afetados:** modelo, fábrica, testes e relatório; FixadorEstrutural/solucionadores são reutilizados.

### P11 — Domínio numérico e reprodução

- **Classificação:** provisórias aguardando aprovação para os limites de configuração/coleta.
- **Problema:** conciliar velocidades hipersônicas, estabilidade, execução visual e replay.
- **Solução escolhida:** passo fixo máximo 1/240 s, KDK gravitacional compartilhado e forças dissipativas explícitas; entrada ADM 10–200.000 m, 0–12.000 m/s, α=0–80°, trajetória±90°. Semente sem aleatoriedade neste marco. RegistroMissao exporta revisões/constantes/agenda; replay estrito síncrono no mesmo runtime.
- **Alternativas:** dt do render; segundo integrador adaptativo; prometer igualdade entre engines; qualificar todo o envelope de entrada com poucos testes.
- **Justificativa:** conserva infraestrutura e receita física existentes, oferecendo regressão determinística e comparação com dt refinado.
- **Riscos:** finitude/refinamento ensaiados não qualificam todo o envelope; replay tem custo proporcional à duração; diferenças de ponto flutuante entre engines podem exigir futura comparação com tolerância.
- **Arquivos afetados:** fábrica/replay, controladores, componente virtual, executor visual, testes e scripts de validação.

### P12 — Observação, retenção visual e evidências

- **Classificação:** provisórias aguardando aprovação.
- **Problema:** tornar observáveis escalas planetárias e veículo de dezenas de metros na mesma vista.
- **Solução escolhida:** câmera no orbitador, Terra/regras em escala física, símbolo ampliado quando necessário com fator indicado; bank muda projeção das asas, sem giro XY adicional. Gráficos a cada segundo, janela visual de 3.600 amostras; diário conserva coleta completa. Painéis a 10 Hz, eventos de condições a cada 24 passos; comandos e mudança de posse são registrados no passo efetivo. Validação headless coleta 600 s, sem encerrar o cenário visual.
- **Alternativas:** desenhar corpo invisível em escala planetária; câmera fixa; manter histórico gráfico ilimitado; finalizar automaticamente após prazo/colisão.
- **Justificativa:** observação legível e custo visual limitado sem escrever na física ou encerrar o ensaio.
- **Riscos:** símbolo ampliado não é geometria de colisão; condições muito breves podem não aparecer na coleta de eventos a 10 Hz, embora física/agenda continuem em 240 Hz; coleta de 600 s não demonstra reentrada completa.
- **Arquivos afetados:** `RenderizadorReentrada.ts`, `src/reentrada.ts`, HTML/CSS, fábrica/eventos e scripts de smoke/validação.

## Bloqueadas por falta de autorização

Nenhuma decisão crítica ou irreversível foi executada ou é necessária para
entregar esta bancada. **Deploy não é autorizado** e não foi realizado.
Não foi alterado `AGENTS.md` nem o repositório legado. Instalar propulsão/RCS,
redefinir o veículo real ou declarar qualificação física permanece fora do
escopo entregue; são pendências técnicas para planejamento posterior.

## Registro de encerramento

A exceção de autonomia termina com o encerramento desta execução. Os itens
P01–P12 continuam **provisórios aguardando aprovação** mesmo após commit e
validações aprovadas. O operador pode decidir cada item individualmente.
