# RE-002 — decisões tomadas sob autonomia excepcional

Registrar aqui somente escolhas em que normalmente seria necessária consulta
ao operador. A autorização excepcional permite prosseguir nesta execução;
hipóteses de engenharia continuam experimentais e não qualificam o veículo.

Decisões já expressas no STEER e no consolidado P01–P12 não são reabertas.
Nenhum deploy, merge na main ou hardware fictício é autorizado.

## Registro

A preencher conforme os resultados exigirem escolhas adicionais. Rotina de
implementação, nomes de arquivos e comandos de validação não são decisões
pendentes de engenharia.

### R01 — Lei de transferência térmica nesta campanha

- **Consulta normalmente necessária:** substituir o limite térmico por uma nova lei física sem propriedades de parede/TPS validadas.
- **Decisão:** conservar `min(indicador×área,D·V)` como calibração experimental explicitamente identificada, expor potência indicada versus recebida e estudar sua sensibilidade. Não tratá-lo como teto universal nem inserir TPS ideal.
- **Alternativas:** remover imediatamente o limite; adotar novo balanço com entalpia do gás/parede; implementar TPS em camadas. As duas últimas requerem dados/subprojeto ausentes.
- **Justificativa:** preservar comparação do efeito angular e não trocar uma hipótese por outra não qualificada. Sutton–Graves é relação local de estagnação; multiplicá-la por área e compará-la a D·V do componente é hipótese adicional deste software.
- **Risco:** o limite pode subestimar aquecimento; divergência é mostrada, não corrigida para obter sobrevivência. O teste de sensibilidade com Cd nulo evidencia essa dependência algébrica.
- **Arquivos:** modelo, corpo/flaps, EnsaioReentrada, painel, testes e relatório térmico.
- **Estado:** adotada provisoriamente nesta execução; lei substituta depende de revisão posterior do operador.

### R02 — Retenção explícita dos registros interativos

- **Consulta normalmente necessária:** política de retenção de telemetria científica em ensaios longos.
- **Decisão:** padrão RE-002 mantém inicial + janela de até 3.600 amostras e até 20.000 eventos, configuráveis; informa descartes. Agenda operacional completa, configuração/modelo e extremos globais permanecem para reexecução. Outros consumidores de RegistroMissao conservam o comportamento histórico sem limite.
- **Alternativas:** memória ilimitada; exportação incremental para armazenamento externo; amostragem progressivamente mais espaçada. A persistência externa não foi introduzida neste marco.
- **Justificativa:** limitar crescimento automático de amostras/eventos sem perda silenciosa e preservar a reconstrução determinística.
- **Risco:** JSON não contém todas as amostras antigas quando a janela é excedida; reconstrução requer mesma versão/runtime. Agenda/histórico de comandos ainda crescem com comandos, devendo ser persistidos em segmentos em uma etapa futura.
- **Arquivos:** RegistroMissao, RegistroExtremos, EnsaioReentrada, configuração/interface e testes.
- **Estado:** adotada provisoriamente, para revisão do operador; não altera arquivos históricos.
