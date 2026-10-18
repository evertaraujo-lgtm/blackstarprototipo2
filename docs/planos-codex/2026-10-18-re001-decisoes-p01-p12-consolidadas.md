# BLACK STAR | RE-001
## Registro consolidado das decisões P01–P12

**Versão:** 1.0 — consolidação para revisão do operador  
**Data:** 18/10/2026  
**Origem:** relatório `RE-001 — decisões para revisão do operador`, execução de 17/10/2026, base `55083ae`, e decisões expressas do operador nesta conversa.  
**Estado:** 12 de 12 decisões aprovadas **provisoriamente, com condições**. Nenhuma está homologada como especificação definitiva do orbitador.  
**Natureza:** registro de decisões, **não** ordem de execução, autorização de alterações, commit ou deploy.

### Regras de governança

- Trabalhar apenas no repositório ativo `evertaraujo-lgtm/blackstarprototipo2`. Não envolver o legado.
- Preservar `AGENTS.md`, as fronteiras do núcleo físico XY e os compromissos já estabelecidos.
- A autorização temporária de autonomia da execução original expirou. **Nenhuma implementação adicional está autorizada por este documento.** Apresentar plano e solicitar aprovação antes de alterar código.
- Não fazer deploy.
- Distinguir **hipótese operacional provisória**, **condição para futura validação**, **nova exigência arquitetural** e **correção de defeito demonstrado**.
- Os valores atuais não qualificam o veículo real nem tornam seguro qualquer regime de voo.

## Síntese das aprovações

| ID | Assunto | Situação | Ressalva principal |
|---|---|---|---|
| P01 | Geometria, montagem e massa | Provisória com condições | Combustível, tanques opostos ao propulsor e CG físico |
| P02 | Atmosfera 0–200 km | Provisória com condições | Sinalizar extrapolação; validar órbitas em vácuo |
| P03 | Coeficientes aerodinâmicos e CP | Provisória com condições | Parâmetros editáveis e exportáveis |
| P04 | Mach e rarefação | Provisória com condições | Comprimento característico configurável; limites de validade |
| P05 | Aquecimento e capacidades térmicas | Provisória com condições | Preparação para escudo térmico físico (TPS) |
| P06 | Energia e atuadores | Provisória com condições | Limites por torque/carga e falhas reais |
| P07 | Rolagem virtual | Provisória com condições | Distinguir variável XY de rotação física |
| P08 | Controle PD e corredor | Provisória com condições | Sem autoridade fictícia; guiar sem mascarar erros |
| P09 | Transferência de controle | Provisória com mudança arquitetural | **Reentrada → Aproximação → Pouso** |
| P10 | Resistências e fixadores | Provisória com condições | Rupturas resultantes de solicitações reais |
| P11 | Passo físico e replay | Provisória com condições | Testes de convergência e conservação |
| P12 | Visualização e telemetria | Provisória com condições | Detectar extremos em passo físico e estados terminais |

## P01 — Geometria, montagem e massa total

**Base aprovada provisoriamente:** corpo de 78.900 kg, dimensões 40 × 8 × 16 m; dois flaps de 500 kg (4 × 2 × 8 m, nas posições locais x=±16 m e y=−5 m); bateria de 100 kg e 0,5 m de lado; massa conectada total de **80.000 kg**. Centro de massa e momento de inércia calculados pela montagem física do núcleo.

**Condições aprovadas e observação do operador:**
1. Os 80.000 kg caracterizam somente a configuração experimental RE-001, **não** a massa definitiva do orbitador no cânone.
2. A futura modelagem deverá incluir tanques e combustível, com consumo, deslocamento do centro de massa e variação do momento de inércia durante o voo.
3. **Intenção de projeto do operador:** posicionar os tanques na região oposta ao propulsor, deslocando o centro de massa em direção à região dos tanques. A magnitude e o sentido do deslocamento devem resultar das massas e posições efetivas, inclusive após consumo de propelente; não impor um CG artificial.
4. A geometria, o CG, a inércia e a colisão precisam ser rastreáveis à montagem e permanecer editáveis/evolutivos; a silhueta ilustrativa não substitui geometria física validada.

**Estado:** aprovada provisoriamente. Tanques, combustível e veículo definitivo são **evolução futura**, não autorização de implementação imediata.

## P02 — Atmosfera aproximada e extrapolação

**Base aprovada provisoriamente:** perfil de densidade com interpolação logarítmica e temperatura linear por âncoras inspiradas na USSA-1976; domínio principal de 0–200 km; cauda exponencial acima de 200 km com altura de escala H=50 km e temperatura constante, sem composição variável ou atividade solar.

**Condições aprovadas:**
1. Manter o perfil atual apenas como aproximação experimental, com versão, hipóteses e limitações identificadas.
2. Acima de 200 km, indicar explicitamente a condição **fora do domínio principal** e a extrapolação utilizada, sem atribuir validade de previsão de arrasto orbital.
3. Validar órbitas elípticas/circulares com casos de referência em **vácuo explícito**, comparando energia, momento angular orbital, perigeu e apogeu.

**Evolução posterior possível:** modelo de atmosfera superior com composição/atividade solar. Não é pré-requisito desta aprovação provisória.

## P03 — Coeficientes aerodinâmicos, centro de pressão e flaps

**Base aprovada provisoriamente:** área de referência S=250 m²; Cl analítico dependente de α, Mach e integridade; Cd analítico dependente de α e Mach; CP local entre −0,15 e −0,50 m; flaps com 16 m² cada e coeficientes analíticos em função de deflexão/integridade. Forças são aplicadas nos respectivos centros de pressão.

**Condições aprovadas:**
1. Cl, Cd, CP e coeficientes/áreas dos flaps são **hipóteses de teste**, não polares reais do orbitador.
2. **Exigência expressa do operador:** tornar editáveis os parâmetros aerodinâmicos (inclusive CP, coeficientes e dados dos flaps). Registrar seus valores e versões no JSON do ensaio.
3. Recalcular o CP e calibrar as polares quando geometria e distribuição de massa forem desenvolvidas, preferencialmente por dados verificáveis e dependentes de Mach, α e regime do escoamento.
4. Identificar ausência de validação em regime rarefeito, Mach baixo/estol e outras condições não qualificadas.
5. **Não** ajustar artificialmente Cl/Cd/CP para compensar a deriva angular anormal observada nos ensaios orbitais.

## P04 — Mach, rarefação e validade do modelo

**Base aprovada provisoriamente:** som ideal com γ=1,4 e R=287,05287 J/(kg·K); aproximação para caminho livre médio a partir de 6,6×10⁻⁸ m no nível do mar; Kn=λ/L com L inicial de 8 m; faixas de Kn 0,01, 0,1 e 10 para contínuo, deslizamento, transição e molecular.

**Três condições aprovadas:**
1. Identificar claramente os **limites de validade** dos indicadores e das equações aerodinâmicas.
2. Tornar o comprimento característico **configurável, documentado e passível de definição por componente** (corpo, nariz, flap etc.).
3. Exibir separadamente **regime estimado** e **modelo físico efetivamente empregado**. Não apresentar coeficientes contínuos extrapolados como solução molecular validada.

**Restrição:** não desligar a aerodinâmica em uma altitude arbitrária apenas para simplificar o resultado; tampouco inventar um solucionador molecular sem fundamentação.

## P05 — Aquecimento, capacidades térmicas e escudo térmico

**Base aprovada provisoriamente:** indicador de aquecimento do tipo Sutton–Graves com k=1,7415×10⁻⁴ SI; corpo com raio característico de 2 m, área aquecida de 80 m², c=800 J/(kg·°C); flaps com raio 0,5 m, área aquecida de 2 m², c=500 J/(kg·°C); transferência atual `min(fluxo × área, D × V)`; reservatório ambiente uniforme a 20 °C; bateria isolada, sem calor interno de descarga. Limiares já aprovados em A02/A03: corpo 1.100 °C, flaps 900 °C, bateria 60 °C.

**Cinco condições aprovadas:**
1. Manter Sutton–Graves como **indicador preliminar**, sem considerá-lo distribuição térmica validada em toda a superfície ou no regime molecular.
2. Tornar editáveis e exportáveis raios de referência, áreas aquecidas, capacidades térmicas e demais hipóteses de calibração.
3. **Revisar tecnicamente a limitação `min(fluxo×área, D×V)`**, demonstrando balanço energético e evitando supor que D×V seja teto universal do aquecimento convectivo.
4. Separar no diário **fluxo térmico externo, energia transferida, temperatura dos componentes e integridade**.
5. Preparar a evolução para arquitetura térmica em camadas, com transferência de calor, radiação e eventual ablação, sem exigir um solver completo neste marco.

**Sexta condição, acrescentada expressamente pelo operador:**
6. **Preparar um escudo térmico físico (TPS)** para proteger o corpo principal. O escudo deverá futuramente ter propriedades, massa, posição, temperatura, capacidade de absorção/radiação, condução e integridade próprias. A massa do TPS deve participar dos cálculos de centro de massa e momento de inércia. O escudo não elimina calor magicamente nem deve ser tratado como isolamento perfeito.

**Nota:** os testes existentes registraram falha térmica dos flaps; as temperaturas/tempos observados não são qualificação de materiais.

## P06 — Energia, potência e dinâmica dos atuadores

**Base aprovada provisoriamente:** flaps com curso ±30°, taxa máxima 20°/s, potência elétrica 300 W em movimento e 6 W em repouso; fonte de 28 V e 20 MJ; dois circuitos de atuação, com reutilização dos sistemas existentes de aletas e conexões elétricas.

**Quatro condições aprovadas:**
1. Tornar editáveis e exportáveis tensão, energia, potência, curso, velocidade e futuros parâmetros de torque/eficiência.
2. Preparar o mecanismo para limitar deflexão e velocidade **conforme torque disponível, inércia e cargas aerodinâmicas**, sem movimentação impossível por comando idealizado.
3. Distinguir perda de alimentação, travamento mecânico, sobrecarga, dano e superaquecimento, inclusive eventuais causas comuns aos circuitos.
4. Integrar futuramente dissipação de calor do atuador ao sistema térmico da P05.

**Nota:** 300 W não é especificação validada de potência mecânica ou capacidade de torque. O tempo/taxa prescritos devem ser confrontados com carga física quando houver modelo de atuação.

## P07 — Rolagem virtual e fragmentos separados

**Base aprovada provisoriamente:** variável de rolagem/bank virtual limitada a ±90° e taxa 10°/s; projeção `L_XY = L cos(φ)`, sem terceira rotação física. Flaps conectados seguem projeção prescrita; depois da separação continuam com dinâmica e forças próprias, conservando provisoriamente a última projeção virtual. Colapso do corpo torna a rolagem indisponível.

**Quatro condições aprovadas:**
1. Tornar editáveis e exportáveis curso, taxa e histórico de comandos da rolagem virtual.
2. Diferenciar claramente a variável cinemática/projeção **XY** de uma rotação espacial produzida por atuadores. Os 10°/s não certificam uma capacidade física de bank; não há RCS instalado.
3. Uma peça separada deixa de obedecer aos comandos virtuais do casco, mantendo forças e trajetória individuais. Sua projeção congelada será marcada como **hipótese provisória**, não atitude 3D resolvida.
4. Mudanças de bank virtual não podem injetar artificialmente momento, energia ou torque no conjunto. Mudanças de trajetória devem decorrer apenas da projeção de forças modeladas.

**Nota:** o problema de aceleração de rotação inercial em Z não deve ser confundido com a rolagem virtual.

## P08 — PD de atitude e limites do corredor

**Base aprovada provisoriamente:** PD de ângulo de ataque e taxa relativa ao fluxo, ganhos 0,008 e 0,18, limiar de autoridade 100 N·m/rad; pressão dinâmica limite 50 kPa; indicador térmico 500 kW/m²; carga 5 g₀. Ao violar o corredor, a regra atual solicita α ≥55° até 70° para esse ajuste, bank zero.

**Cinco condições aprovadas:**
1. Tornar editáveis e registráveis ganhos, limiar de autoridade, limites do corredor, ângulo solicitado e saturações.
2. Subordinar comandos PD à física e aos limites reais de flaps/atuadores, incluindo falhas e ausência de autoridade em ar rarefeito.
3. Separar **controle de atitude** da **estratégia de gerenciamento do corredor**; a regra 55°/70° permanece heurística experimental, não manobra universalmente segura.
4. Exibir estados de saturação, perda de autoridade e condições irrecuperáveis. O controlador não pode escrever diretamente orientação, velocidade angular ou trajetória para simular sucesso.
5. Validar resposta e estabilidade em perturbações, diferentes velocidades, densidades, ângulos e falhas, **após isolar/corrigir** a deriva angular numérica.

## P09 — Aproximação como fase autônoma e transferência exclusiva

**Base aprovada provisoriamente:** no modelo original, transferência direta reentrada→pouso com altitude 20–5.000 m, velocidade até 150 m/s, desvio da vertical até 15°, trajetória −90° a −5° e condições de sensores, integridade e propulsão. A transferência já está bloqueada no RE-001 por ausência de sistema propulsivo integrado.

**Cinco condições aprovadas:**
1. Tornar editáveis e exportáveis os critérios e limites de transição.
2. Preparar avaliação **energética e de capacidade real de frenagem**, considerando massa, velocidades horizontal/vertical, empuxo, combustível, reignição e distância disponível.
3. Garantir posse exclusiva/atômica dos atuadores e transições determinísticas, sem disputa de controladores ou alternância instável de estado.
4. Tratar falhas de propulsão, sensores e integridade por estados explícitos, sem congelamento ou correção artificial da nave.
5. Manter bloqueada a transferência para pouso enquanto não houver propulsão e integração reais. Testes de arbitragem simulada não equivalem à validação de pouso.

**Nova exigência expressa pelo operador, integrante desta aprovação:**
6. **É incorreto transferir diretamente da reentrada para o pouso. Introduzir uma fase e um controlador independentes de APROXIMAÇÃO:**
   - **Reentrada:** gerencia atitude e cargas aero/térmicas.
   - **Aproximação:** gerencia trajetória, energia, velocidade e preparação para a fase terminal, usando somente atuadores realmente disponíveis.
   - **Pouso:** assume a fase propulsiva terminal quando suas condições físicas forem verificadas.
   - Arquitetura obrigatória: **Reentrada → Aproximação → Pouso**, com supervisão e arbitragem exclusivas em cada transferência.
   - Os limiares antigos de entrada em pouso não podem ser automaticamente adotados como critérios de início da aproximação. Esses critérios deverão ser estudados e aprovados separadamente.

**Estado de implementação:** o **controlador de aproximação é requisito novo ainda não implementado**, e esta revisão não autoriza sua construção imediata.

## P10 — Resistências provisórias e integridade estrutural

**Base aprovada provisoriamente:** resistência energética de impacto do corpo 100 MJ; flaps e bateria 1 MJ cada; fixadores 100 MN. Uso do sistema existente de colisões, rupturas e separações, sem impulso artificial.

**Cinco condições aprovadas:**
1. Tornar parâmetros de impacto, forças e futuros momentos resistentes editáveis e exportáveis.
2. Preparar diferentes tipos de solicitação e resistência: tração, cisalhamento, flexão e torção; possível fadiga fica para outra etapa.
3. Transmitir cargas aerodinâmicas efetivamente calculadas aos vínculos, incluindo forças e momentos, sem cargas fictícias.
4. Após ruptura, cada peça deve persistir fisicamente, conservando o estado cinemático/momento apropriado ao instante da separação, sem desaparecer nem receber impulsos artificiais.
5. Adicionar verificações e testes de impacto, contatos com a superfície, sobrecargas, rupturas e integridade consistente. Não reportar integridade total diante de dano estrutural efetivamente reconhecido.

**Nota:** não reduzir resistências arbitrariamente para provocar destruição; 100 MN não é certificação de fixadores de flap.

## P11 — Integração numérica, domínio e reprodutibilidade

**Base aprovada provisoriamente:** passo máximo de referência 1/240 s; KDK/Verlet gravitacional compartilhado e forças dissipativas explícitas; configurações de entrada com altitude 10–200.000 m, velocidade 0–12.000 m/s, α 0–80°, trajetória ±90°; gravação de versões, condições e agenda de comandos; replay determinístico no mesmo runtime.

**Seis condições aprovadas:**
1. Passo configurável em testes, incluindo 1/120, 1/240, 1/480 e 1/960 s, com registro do valor efetivo.
2. **Testes de convergência numérica** para translação, rotação, forças, momentos e eventos.
3. Monitorar energia e momento angular **orbital** em casos conservativos; momento angular **intrínseco** do conjunto rígido e respectivos balanços de torques; balanços adequados quando houver dissipação.
4. Investigar resolução de eventos rápidos como impacto, ruptura, variações de carga e movimentos de flaps. Não aumentar frequência indiscriminadamente sem evidência.
5. Preservar reprodução com parâmetros, código/modelo, versões, passo, comandos e eventos; quando houver ambientes numéricos diferentes, comparar com tolerâncias justificadas, não presumir identidade bit a bit.
6. Distinguir velocidade de execução visual, tempo físico simulado e passo de integração. Aceleração visual não pode modificar silenciosamente o dt físico.

**Prioridade de diagnóstico:** a aceleração angular sem torque suficiente em ensaios de 120/200 km exige auditoria específica do conjunto rígido. **Não alterar o integrador translacional só para mascarar a anomalia rotacional.**

## P12 — Ampliação visual, amostragem e retenção

**Base aprovada provisoriamente:** câmera acompanha o orbitador; Terra e trajetória em escala física; símbolo visual da nave ampliável e identificado; gráficos a 1 Hz, janela de 3.600 amostras; diário completo; painéis a 10 Hz; condições verificadas a cada 24 passos; comandos e posse registrados no passo efetivo; smoke headless de 600 s sem encerramento do cenário visual.

**Seis condições aprovadas:**
1. Separar estritamente câmera, ampliação e desenho da geometria/estado físico; indicar escala ou fator de ampliação.
2. Detectar no passo físico **picos, mínimos, cruzamentos de limites e eventos críticos**, sem perdas por amostragem a 10 Hz ou 1 Hz. Registrar tempo e passo do evento.
3. Permitir ajustar frequência de coleta e janela visual para diagnóstico, mantendo 1 Hz como padrão visual razoável.
4. Manter diário rastreável e eficiente, com dados iniciais, comandos, eventos, extremos, amostras e seus respectivos intervalos de coleta, sem crescimento descontrolado de memória.
5. Preservar smoke de 600 s como teste rápido e acrescentar testes de regressão, missão completa e longa duração conforme o fenômeno observado.
6. Reconhecer eventos terminais físicos como pouso, impacto, ruptura/destruição e falha, sem encerrar arbitrariamente por tempo ou deixar contatos fisicamente inconsistentes se repetirem indefinidamente.

## Decisões A01–A03 anteriores, não reabertas nesta revisão

- **A01:** laboratório `/reentrada.html` em núcleo físico XY/KDK compartilhado, sem novo integrador 3D, sem alterar legado e sem deploy.
- **A02:** limiares experimentais de degradação: corpo 1.100 °C e flaps 900 °C, editáveis e registrados.
- **A03:** bateria interna com limiar independente 60 °C e isolamento térmico simplificado neste marco; sem alegação de qualificação real.

A inclusão futura de TPS e transferência de calor mais detalhada **não revoga automaticamente** a simplificação A03 vigente. Eventual revisão exige decisão separada.

## Pontos transversais e prioridades propostas para futura autorização

**T0 — Diagnóstico e correção demonstrada, sujeito a autorização própria:** auditar a deriva angular do conjunto rígido, conservar o momento angular em vácuo e verificar torques reais; criar testes de convergência e regressão (P11, apoiados em P12). Não adulterar aerodinâmica, bank ou controlador para disfarçar o defeito.

**T1 — Instrumentação e confiança nos resultados, sujeito a autorização própria:** registro por passo de extremos, eventos de falha e comparações físicas; sinalizar domínio atmosférico/aerodinâmico e manter reprodutibilidade (P02/P04/P11/P12).

**T2 — Parâmetros de engenharia configuráveis, sujeito a autorização própria:** aerodinâmica, térmica, elétrica/atuadores, rolagem, controle e resistências, com exportação e versionamento (P03–P08/P10).

**T3 — Nova arquitetura de voo, depende de projeto e aprovação específicos:** definir interfaces, estados, autoridade e critérios da fase **Aproximação** entre Reentrada e Pouso. Não instalar propulsão ou RCS por inferência (P09).

**T4 — Evolução de modelos, não aprovada para implementação agora:** tanques e combustível variável, escudo TPS em camadas, atuadores por torque/carga, aeroelasticidade e tensões de vínculos, atmosfera superior e polares calibradas (P01/P02/P03/P05/P06/P10).

As prioridades acima são **sugestões de organização**, não uma agenda autorizada nem uma instrução para o Codex iniciar trabalho.

## Critérios de aceite deste registro

1. Todas as **12 decisões P01–P12** constam como **aprovadas provisoriamente com condições**, sem homologação definitiva do veículo.
2. As observações explícitas do operador aparecem em destaque: **P01 tanques e combustível; P03 parâmetros editáveis; P05 escudo térmico; P09 controlador de aproximação**.
3. Condições já aceitas nas demais decisões estão preservadas, sem omissões deliberadas.
4. As novas funcionalidades arquiteturais são **requisitos aprovados conceitualmente**, não afirmações de que já existem no código.
5. Nenhuma alteração de repositório, commit, publicação ou deploy decorre automaticamente deste documento.

**Próxima ação, somente após revisão do operador:** aprovar o texto consolidado e preparar um plano de execução fatiado, com decisões e prioridades próprias, respeitando o `AGENTS.md`.