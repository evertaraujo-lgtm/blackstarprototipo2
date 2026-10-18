# RE-002 — decisões tomadas sob autonomia excepcional

Registrar aqui somente escolhas em que normalmente seria necessária consulta
ao operador. A autorização excepcional permite prosseguir nesta execução;
hipóteses de engenharia continuam experimentais e não qualificam o veículo.

Decisões já expressas no STEER e no consolidado P01–P12 não são reabertas.
Nenhum deploy, merge na main ou hardware fictício é autorizado.

## Registro

Rotina de
implementação, nomes de arquivos e comandos de validação não são decisões
pendentes de engenharia.

### R01 — Lei de transferência térmica nesta campanha

- **Consulta normalmente necessária:** substituir o limite térmico por uma nova lei física sem propriedades de parede/TPS validadas.
- **Decisão:** conservar `min(indicador×área,D·V)` como calibração experimental explicitamente identificada, expor potência indicada versus recebida e estudar sua sensibilidade. Não tratá-lo como teto universal nem inserir TPS ideal.
- **Alternativas:** remover imediatamente o limite; adotar novo balanço com entalpia do gás/parede; implementar TPS em camadas. As duas últimas requerem dados/subprojeto ausentes.
- **Justificativa:** preservar comparação do efeito angular e não trocar uma hipótese por outra não qualificada. Sutton–Graves é relação local de estagnação; multiplicá-la por área e compará-la a D·V do componente é hipótese adicional deste software.
- **Risco:** o limite pode subestimar aquecimento; divergência é mostrada, não corrigida para obter sobrevivência. O teste de sensibilidade com Cd nulo evidencia essa dependência algébrica.
- **Arquivos:** modelo, corpo/flaps, EnsaioReentrada, painel, testes e relatório térmico.
- **Estado:** provisória aguardando aprovação; lei substituta depende de revisão posterior do operador.

### R02 — Retenção explícita dos registros interativos

- **Consulta normalmente necessária:** política de retenção de telemetria científica em ensaios longos.
- **Decisão:** padrão RE-002 mantém até 3.600 amostras no total (inicial + janela recente) e até 20.000 eventos, configuráveis; informa descartes. Agenda operacional completa, configuração/modelo e extremos globais permanecem para reexecução. Outros consumidores de RegistroMissao conservam o comportamento histórico sem limite.
- **Alternativas:** memória ilimitada; exportação incremental para armazenamento externo; amostragem progressivamente mais espaçada. A persistência externa não foi introduzida neste marco.
- **Justificativa:** limitar crescimento automático de amostras/eventos sem perda silenciosa e preservar a reconstrução determinística.
- **Risco:** JSON não contém todas as amostras antigas quando a janela é excedida; reconstrução requer mesma versão/runtime. Agenda/histórico de comandos ainda crescem com comandos, devendo ser persistidos em segmentos em uma etapa futura.
- **Arquivos:** RegistroMissao, RegistroExtremos, EnsaioReentrada, configuração/interface e testes.
- **Estado:** provisória aguardando aprovação; não altera arquivos históricos.

### R03 — Fronteira paramétrica sem região ou propulsão definidas

- **Consulta normalmente necessária:** região de destino, capacidade útil futura e tolerâncias de atitude para estudar a aproximação.
- **Decisão:** alvo padrão não definido (`null`); análise configurável com acelerações líquidas úteis hipotéticas de 1, 2 e 5 m/s², erro de alpha até 10° e |ω| até 0,02 rad/s. Estes são filtros exploratórios, não parâmetros de motor ou qualificações. Campanhas podem declarar alvo sintético por arco, sem inventar sítio geográfico.
- **Alternativas:** aguardar definição de hardware/local; supor sítio e motor reais; reaproveitar os antigos limites de pouso. As duas últimas criariam capacidade não demonstrada.
- **Justificativa:** estudar distância/tempo/velocidade admissível por hipóteses explícitas e necessárias; separar elegibilidade A da autorização B, esta sempre bloqueada por ausência real de propulsão e integração.
- **Riscos:** os limites de frenagem ideal não demonstram trajetória viável, alinhamento, propelente, ignição, reserva ou sobrevivência; o candidato não é autorização. Tolerâncias e hipóteses requerem revisão do operador e estudo propulsivo posterior.
- **Arquivos:** FronteiraAproximacao, SupervisorRecuperacao, ControladorAproximacao, EnsaioReentrada, painel, campanhas/testes e relatório.
- **Estado:** provisória aguardando aprovação. Hardware e fase propulsiva continuam fora do marco, conforme STEER.

### R04 — Referências históricas após correção física compartilhada

- **Consulta normalmente necessária:** requalificar oráculos byte a byte M10/M11 e substituir suas referências após mudar a receita angular compartilhada.
- **Decisão:** manter a correção física demonstrada e todas as referências antigas intactas; não afrouxar testes nem regenerar hashes apenas para obter verde. Documentar incompatibilidade/replay entre modelos, corrigir a divergência real de associatividade lote/individual e validar comparativamente consumidores atuais e gerar candidatos em pasta nova para revisão, sem promovê-los.
- **Alternativas:** desfazer a correção e reintroduzir deriva; manter dois núcleos concorrentes; substituir referências automaticamente; solicitar requalificação explícita. Os três primeiros não demonstram preservação/qualificação física.
- **Justificativa:** a revisão de engenharia é intencional e identificada; validade histórica não equivale a igualdade numérica após corrigir o modelo. A comparação funcional atual pode ser testada sem apagar oráculos.
- **Risco:** a suíte completa continua com falhas nas expectativas históricas; não declarar regressão integral aprovada nem requalificação dos voos anteriores. A migração de referências requer revisão específica do operador.
- **Arquivos:** ConjuntoEstruturalRigido, MundoFisico, relatório, novas regressões comparativas e evidências. Arquivos/testes históricos M10/M11 permanecem preservados.
- **Estado:** decisão provisória aguardando aprovação; substituição/requalificação dos oráculos bloqueada por falta de autorização, não executada.

## Revisão individual ao encerrar a execução

| Nº | Estado | Escolha submetida à revisão |
|---|---|---|
| R01 | Provisória aguardando aprovação | Conservar a lei térmica limitada como calibração explícita até o subprojeto de transferência/TPS |
| R02 | Provisória aguardando aprovação | Janela padrão de 3600 amostras/20000 eventos, configurável, com descartes e agenda declarados |
| R03 | Provisória aguardando aprovação | Alvo padrão ausente; hipóteses 1/2/5 m/s², erro alpha 10° e rotação 0,02 rad/s, sem certificação |
| R04 | Provisória; requalificação bloqueada por falta de autorização | Preservar oráculos antigos e correção compartilhada; candidatos separados, sem promover referências ou afirmar suíte integral verde |

O operador pode aprovar, rejeitar ou solicitar ajustes por número. A autonomia
excepcional termina com esta execução; não altera AGENTS.md nem aprova qualquer
uma dessas decisões por ausência, commit ou resultado de teste.
