# Conexões elétricas

`ConexaoEletrica` implementa o ciclo operacional da ligação elétrica, como
`LinhaDePropelente` faz para a alimentação de fluidos. Não herda da linha:
corrente/energia e massa/vazão possuem leis diferentes.

```ts
const cabo = new ConexaoEletrica({
  id: 'alimentacao-motor', fonte: bateria, destino: suporteDoMotor,
  comprimentoMaximoM: 8, correnteMaximaA: 20,
  resistores: [new Resistor('serie', 0.1)],
  interruptores: [new Interruptor('manutencao', true)],
});
cabo.fecharInterruptor();
cabo.prepararPasso(dtS); // uma vez por subpasso, pelo proprietário
const entregueJ = cabo.fornecerEnergia(energiaSolicitadaJ);
```

O interruptor principal começa aberto. Todos os interruptores em série devem
estar fechados. A desconexão abre o principal; reconectar não o fecha. Um cabo
rompido exige substituição por outra instância. O comprimento inicial usa a
distância entre os centros dos corpos, como a linha de propelente atual; o
traçado dos condutores no Canvas é uma apresentação desses terminais.

O consumidor solicita potência regulada (`energiaSolicitada / dt`). A conexão
resolve `P = I(V - RI)` no ramo de maior tensão e limita `I` à capacidade
declarada, à energia restante da bateria e ao máximo transferível `V/(2R)`.
Resistores em série somam suas resistências à resistência configurável do cabo.
São registrados energia entregue, energia retirada e perdas por efeito Joule.
Não há energia negativa, restituição artificial de carga ou restituição de
integridade na reconexão.

Solicitações sucessivas das bombas de um propulsor compartilham o orçamento
do passo: cada bomba recebe a capacidade restante na ordem declarada. Esse
modelo não resolve redes arbitrárias, AC, capacitância, temperatura de fios ou
fusíveis. As perdas são energia dissipada contabilizada na conexão; um corpo
com propriedades térmicas será necessário para simular a temperatura do cabo.

A porta declara cabo de 8 m e limite de 200 A, com resistência inicial de 0 Ω.
Os adaptadores dos ensaios antigos de cilindros criam cabos de 10 m, ideais,
com corrente dimensionada pela potência nominal de força/velocidade. O método
`Propulsor.conectarBateria` dimensiona o limite pela potência elétrica nominal
dividida pela tensão; `instalarConexaoEletrica` permite uma especificação
explícita. Todos eles usam a mesma classe para fornecer energia.

Alterações de resistência ou limite entram no próximo `prepararPasso`, que
valida dt positivo e finito. A bancada usa subpassos de até 1/240 s. O painel e
o desenho consultam a conexão real, incluindo desconexão e ruptura, sem criar
uma segunda fonte de verdade elétrica.
