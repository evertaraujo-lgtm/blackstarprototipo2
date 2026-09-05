# Atuadores de duas posições

## Convenção do Protótipo 2

Todo mecanismo cujo movimento físico possua duas posições operacionais bem
definidas deve usar `CilindroEletrico` como módulo de atuação padrão.

Exemplos: elevadores entre os andares inferior e superior, garras aberta e
fechada, portas aberta e fechada, travas estendida e recolhida, e mecanismos
equivalentes com componentes que realmente se deslocam.

O atuador recebe os comandos `avancar` e `recuar`, e as realimentações
`avancado` e `recuado`. As realimentações devem vir de `SwitchFimDeCurso`s
posicionados nos extremos físicos do curso. O comando não move diretamente a
haste: o cilindro consulta a bateria, calcula força eletromecânica limitada e
o `MundoFisico` integra o movimento e os contatos.

A haste deve possuir uma restrição física compatível com o mecanismo, como
`GuiaLinear` para curso retilíneo. A carcaça, os batentes e os sensores devem
ser fixados ou vinculados fisicamente conforme a montagem declarada; somente
os elementos que de fato podem se mover permanecem livres no eixo permitido.

Velocidades de avanço e recuo são parâmetros explícitos em m/s. Elas são
referências do acionamento, não alterações diretas de posição ou velocidade.

Não há cilindro hidráulico neste protótipo. Para movimentos binários novos,
não introduza bomba, válvula, tanque ou pressão de fluido sem requisito
específico que justifique outro modelo físico.

## Comportamento independente da geometria

`Cilindro` contém apenas comandos, fins de curso e referências de velocidade
em m/s. Não deriva de `Objeto`, não tem forma, massa, resistência ou posição.
`CilindroEletrico extends Cilindro` acrescenta a conversão elétrica em forças;
recebe os objetos de suporte e parte móvel, sem criar corpos adicionais.

TypeScript não permite estender duas classes simultaneamente. Para preservar
qualquer classe base, use o mixin `ComCilindro`:

```ts
class Porta extends ComCilindro(Objeto) {}
```

O construtor continua recebendo a configuração física de `Objeto`, inclusive
massa, dimensões, resistência e limite térmico explícitos. Instale o
comportamento com `instalarCilindro(new Cilindro(configuracaoDeMovimento))`.
A porta passa a expor `definirEntradas`, `configurarVelocidades` e a referência
`velocidadeSolicitadaMps`. Essa referência não move a porta sozinha: um
acionamento produz as forças que o mundo integra.

Para atuação elétrica, instale uma instância de `CilindroEletrico`, prepare-a
em `prepararPassoOperacional` e disponibilize suas forças nos corpos móvel e
de suporte. A reação deve sempre ser aplicada ao suporte físico declarado.
`CorpoDeCilindroEletrico` preserva a carcaça real das montagens existentes da
bancada; sua haste continua sendo um objeto independente. Esse adaptador é
opcional e não define a geometria de portas, plataformas ou outros consumidores.

O passo elétrico exige `dt` positivo e finito em segundos; o mundo subdivide
os intervalos pelo limite configurado. Bateria vazia não produz força, nem
mesmo quando o corpo está inicialmente parado.

## Ensaio de porta vertical

`Porta extends ComCilindro(Objeto)` usa o próprio corpo como parte móvel do
`CilindroEletrico`; o batente superior recebe a reação. As travessas e laterais
são corpos físicos, com chumbadores. A guia ideal da bancada restringe X/Z e
rotação, mantendo Y livre; sua resistência permite ruptura sob esforço.

A porta inicia fechada. Ligue alimentação e controle, nessa ordem, e use
**Abrir**/**Fechar**. Os LEDs abaixo dos botões consultam os dois switches nos
batentes. A atualização das entradas ocorre em cada subpasso físico, inclusive
quando vários subpassos cabem em um único quadro da interface.

Na configuração do ensaio: porta de 40 kg e 2 × 2 × 0,12 m, velocidades de
0,6/0,4 m/s, força máxima de 4000 N, bateria de 24 V. Retenção energizada com
rigidez equivalente de 100000 N/m e consumo de repouso de 12 W. A deformação
sob carga é física; não há teletransporte para uma posição final. Os switches
possuem curso de 5 cm e diferencial de liberação de 1 cm. Sem energia, a porta
cai e pode sofrer dano conforme sua resistência de 2000 J e o impacto real.

O operador definiu alumínio com dano acima de 150 °C e fusão a 700 °C para a
porta e o batente. O núcleo aplica dano progressivo e perda total de integridade
na fusão, sem simular o escoamento líquido. A bateria reutiliza a especificação
do ensaio elétrico anterior. A fonte e o controle iniciam desligados e devem
ser rearmados após interrupção; não há partida automática ao restaurar energia.

A montagem está em `../../cenarios/EnsaioPortaVertical.ts` e é compartilhada
pela tela e pelos testes determinísticos. Atmosfera de 1,225 kg/m³ e dt máximo
de 1/240 s. A bancada permanece disponível para vários ciclos manuais.

## Alimentação por conexão elétrica

O cilindro consome pela `ConexaoEletrica`, que limita corrente e entrega a
energia restante após perdas resistivas. A partida a partir de velocidade
zero inclui o trabalho de aceleração no passo; o servo considera a resposta
dos dois corpos durante dt para evitar oscilação numérica por ganho excessivo.

Na porta, o botão de alimentação comanda o interruptor principal da conexão.
Abrir o circuito, desconectar ou romper o cabo interrompe alimentação e controle.
Reconectar exige novo comando operacional para rearmar o equipamento. Cabos e
telemetria da bancada consultam essa mesma instância de domínio.
