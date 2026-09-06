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
declarada, à energia disponível da fonte e ao máximo transferível `V/(2R)`.
Resistores em série somam suas resistências à resistência configurável do cabo.
São registrados energia entregue, energia retirada e perdas por efeito Joule.
Não há energia negativa, restituição artificial de carga ou restituição de
integridade na reconexão.

Solicitações sucessivas das bombas de um propulsor compartilham o orçamento
do passo: cada bomba recebe a capacidade restante na ordem declarada. Esse
modelo não resolve redes arbitrárias, transientes CA, capacitância, temperatura de fios ou
fusíveis. As perdas são energia dissipada contabilizada na conexão; um corpo
com propriedades térmicas será necessário para simular a temperatura do cabo.

A porta usa comando CC de 24 V, cabo de 8 m / 2 A, e potência CA de 220 V,
cabo de 10 m / 20 A, ambos inicialmente ideais (0 Ω). K1 isola os circuitos.
A montagem CC anterior (200 A) permanece para regressão.
Os adaptadores dos ensaios antigos de cilindros criam cabos de 10 m, ideais,
com corrente dimensionada pela potência nominal de força/velocidade. O método
`Propulsor.conectarBateria` dimensiona o limite pela potência elétrica nominal
dividida pela tensão; `instalarConexaoEletrica` permite uma especificação
explícita. Todos eles usam a mesma classe para fornecer energia.

Alterações de resistência ou limite entram no próximo `prepararPasso`, que
valida dt positivo e finito. A bancada usa subpassos de até 1/240 s. O painel e
o desenho consultam a conexão real, incluindo desconexão e ruptura, sem criar
uma segunda fonte de verdade elétrica.

O gerador implementa `FonteEletrica` com tensão eficaz e frequência declarada.
Neste marco, CA é monofásica, em regime RMS e fator de potência unitário.
`MundoFisico` chama `prepararPassoEnergetico` antes de qualquer consumidor,
reservando uma única potência por fonte e subpasso. Vários circuitos não
multiplicam a capacidade do gerador. Reserva mecânica × eficiência limita
energia elétrica, e perdas do gerador alimentam o sistema térmico do core.
O `Contator` exige autorização, tensão CC compatível e energia para a bobina;
seus contatos entram em série no cabo CA sem misturar os orçamentos CC/CA.
