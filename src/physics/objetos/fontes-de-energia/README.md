# Fontes de energia

Área reservada para objetos físicos que fornecem energia aos sistemas da
simulação, como tanques de propelente, baterias, geradores, células a
combustível e barramentos.

As futuras fontes deverão declarar e fornecer energia por interfaces públicas;
um consumidor, como um `Propulsor`, não deve depender da classe concreta da
fonte nem alterar seu estado diretamente. Enquanto não existir uma fonte
conectável, propulsores permanecem sem alimentação elétrica e não podem gerar
empuxo.

`Bateria` já é uma fonte elétrica física: declara tensão nominal, capacidade e
carga inicial em joules. Ela entrega somente a energia armazenada. O propulsor
exige uma bateria conectada por cabo, com tensão compatível e dentro do alcance
declarado; ao descarregar ou romper o cabo, a cadeia operacional é interrompida.
Sua movimentação conjunta com tanque, propulsor ou veículo depende de
`FixadorEstrutural`, como para os demais objetos do mundo.
