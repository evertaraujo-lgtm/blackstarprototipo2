# Convenções do Protótipo 2

## 1. Objetivo e escopo deste documento

Este documento define os princípios arquiteturais, convenções de domínio e capacidades pretendidas para o Protótipo 2.

As regras aqui descritas representam o **escopo arquitetural final pretendido**, e não a obrigação de implementar todas as capacidades simultaneamente. A implementação deve ocorrer de forma incremental, por marcos funcionais e testáveis, preservando desde o início as fronteiras de responsabilidade necessárias para evolução futura.

O Protótipo 2 tem como primeira aplicação a engenharia e simulação de missões espaciais, mas sua arquitetura deve favorecer o reaproveitamento futuro do núcleo genérico de objetos, sistemas, controle, telemetria e física em outros domínios de simulação, como automação industrial, máquinas, CNC e sistemas mecatrônicos.

Não se deve, porém, generalizar antecipadamente funcionalidades específicas sem necessidade concreta. Abstrações genéricas devem surgir quando representarem responsabilidades efetivamente compartilhadas.

---

## 2. Relação com o Protótipo 1

O Protótipo 1 está em `../Starship` e é a referência de módulos, convenções e comportamentos já validados. Antes de criar lógica nova, verifique se há um módulo focado no Protótipo 1 que possa ser reutilizado, adaptado ou migrado.

- Reutilize módulos existentes quando atenderem ao requisito, em vez de recriar a mesma responsabilidade no Protótipo 2.
- Preserve créditos de origem e adapte apenas o necessário para a arquitetura do Protótipo 2.
- Não altere o Protótipo 1 para implementar funcionalidade solicitada para o Protótipo 2, salvo solicitação explícita.
- A equivalência entre protótipos é funcional, não uma cópia da implementação JavaScript existente.
- Todo código novo do Protótipo 2 deve ser escrito em TypeScript.

---

## 3. Validação obrigatória

Toda mudança deve ser validada antes de ser considerada concluída.

- Execute ou crie testes automatizados adequados à lógica alterada.
- Para módulos físicos migrados ou adaptados, mantenha testes de regressão.
- Confirme unidades SI e limites aceitáveis de `dt` para lógica física.
- Execute a verificação de build aplicável.
- Quando houver interface, realize teste de fumaça da tela afetada.
- Mudanças no core físico devem possuir casos determinísticos reproduzíveis.
- Relate claramente quais validações foram executadas e seus resultados.

Todo cenário ou capacidade física nova deve ser validado também nos limites
relevantes, não apenas em operação nominal: comando ausente, perda de sistema,
ruptura de vínculo, contato com superfície, excesso de velocidade e demais
falhas previsíveis do domínio. Em particular, uma queda ou colisão cuja energia
exceda a resistência estrutural declarada deve produzir dano mensurável no
`Objeto`; não pode ser tratada somente como efeito visual ou repouso artificial.
Ensaios de propulsão devem expor a integridade dos objetos participantes e
incluir ao menos um cenário de impacto destrutivo movido por empuxo, para que
dano estrutural seja verificável junto de ignição, consumo e vínculos.

---

# Parte I — Princípios fundamentais

## 4. Fonte única da verdade física

O core de física é a única fonte de verdade para movimento, posição, orientação, velocidade, aceleração, torque, colisões, gravidade, vínculos físicos e demais estados cinemáticos dos objetos.

- Sistemas, controladores, componentes, missões, sensores, atuadores e interfaces podem solicitar ações, produzir forças, estabelecer restrições ou disponibilizar informações, mas não podem alterar diretamente o estado cinemático.
- Um comando como acelerar uma nave não altera sua velocidade diretamente. Ele solicita ou produz forças; o core calcula a resultante e a evolução física.
- Peso, vento, propulsão, sustentação, atrito, contato, colisões e demais forças aplicáveis determinam o movimento efetivo.
- A renderização é exclusivamente uma apresentação do estado da simulação e nunca sua fonte de verdade.
- Classes de domínio fornecem propriedades e efeitos físicos ao core sem duplicar ou contornar suas leis.

### 4.1 Separação de dependências

Classes de domínio não devem depender diretamente de:

- Canvas ou DOM;
- Firestore;
- APIs específicas do navegador;
- modo de jogo;
- relógio real;
- estado global.

Dependências externas devem ser fornecidas por interfaces, adaptadores, repositórios ou serviços injetados.

---

## 5. Unidades e tempo

- Preserve unidades SI nas propriedades e cálculos físicos: kg, m, s, N, Pa, rad etc.
- Unidades alternativas podem existir apenas para apresentação ou entrada do usuário, com conversão explícita nas fronteiras do domínio.
- O tempo da missão é independente do tempo real.
- Nenhuma regra física deve depender diretamente de `Date.now()`, relógio de interface ou taxa de renderização.

---

## 6. Determinismo e simulação temporal

O core deve produzir resultados determinísticos quando executado com os mesmos:

- estados iniciais;
- parâmetros;
- sequência de comandos;
- valores de `dt`;
- semente aleatória.

Toda fonte de aleatoriedade da simulação deve derivar de uma semente reproduzível registrada na configuração da missão e persistida na telemetria.

O mecanismo temporal deve:

- suportar diferentes escalas de tempo sem alterar as leis físicas;
- subdividir intervalos maiores em passos internos menores quando necessário para estabilidade numérica;
- validar limites de `dt` conforme a fase e o modelo físico utilizado;
- permitir avanço acelerado em fases de longa duração quando a precisão requerida permitir;
- evitar processamento contínuo em tempo real quando não houver necessidade física.

### 6.1 Encerramento de cenários na bancada de testes

Uma simulação visual da bancada não deve encerrar por um limite arbitrário de
tempo, nem apenas porque um evento intermediário (como uma colisão) ocorreu.
Ela permanece em execução até que todos os corpos relevantes atinjam repouso
físico dentro da tolerância declarada pelo cenário. Se o cenário não puder
atingir repouso — por exemplo, por possuir propulsão contínua, queda sem
superfície ou trajetória aberta — ele permanece disponível para observação e
somente avança quando o operador utilizar a ação **Pular teste atual**.

### 6.1.1 Atmosfera padrão nos testes

Todo `MundoFisico` de teste ou cenário deve considerar, por padrão, atmosfera
terrestre padrão ao nível do mar (`1,225 kg/m³`). Vácuo é uma condição física
especial e deve ser declarado explicitamente com densidade atmosférica zero,
inclusive na descrição do cenário. Nenhum teste pode depender silenciosamente
da ausência de arrasto atmosférico.

### 6.2 Bancada como regressão do core compartilhado

A bancada de testes é um consumidor do mesmo `MundoFisico` utilizado pelos
objetos da simulação real; ela não pode manter regras físicas paralelas ou
correções exclusivas de interface.

Toda correção de física identificada e validada em um cenário da bancada deve:

- ser implementada no core ou componente de domínio compartilhado;
- receber teste determinístico de regressão que reproduza o caso corrigido;
- valer automaticamente para os mesmos objetos quando forem inseridos em uma
  missão ou cena do jogo;
- ser registrada na descrição do teste quando esclarecer a regra física
  validada.

Exemplos incluem colisões de todas as faces orientadas, pontos reais de
contato, dissipação, tração, frenagem, massa instantânea e interação com
superfícies. A renderização e os controles da bancada apenas observam e
solicitam ações; nunca substituem o comportamento do core.

### 6.3 Apoio, rodas e aderência de veículos terrestres

Veículos terrestres devem declarar separadamente a geometria de seu chassi e
de suas rodas. A posição visual e física das rodas deve respeitar seu raio: o
ponto inferior do pneu toca uma superfície por tangência; o assoalho/chassi
mantém vão livre acima do solo enquanto o veículo estiver em pé.

O conjunto de pontos de contato com superfícies deve incluir tanto o perímetro
das rodas quanto a geometria do chassi. Portanto, o veículo apoia nas rodas
quando elas forem a parte mais baixa, mas teto, assoalho e demais faces do
chassi também devem impedir interpenetração quando ele tombar ou inverter.

Tração e frenagem longitudinal só podem produzir força quando os pontos de
aderência das rodas estiverem apoiados em uma superfície física. Contato pelo
chassi, teto ou lateral não autoriza tração. Um veículo no ar, tombado ou
invertido não pode acelerar artificialmente por manter um comando de tração;
o comando pode continuar solicitado, mas a força efetiva deve ser nula até que
as rodas voltem a ter contato válido. O core pode usar uma tolerância espacial
pequena e documentada para estabilidade numérica do contato, sem transformá-la
em aderência à distância.

### 6.4 Continuidade em colisões empilhadas

Em uma cadeia de contatos — por exemplo, objeto caindo sobre outro objeto
apoiado no solo — a resposta deve resultar dos impulsos entre todos os corpos
e da reação da superfície, sem ancoragem artificial do objeto apoiado.

Variações pequenas e contínuas de massa, velocidade, geometria, resistência ou
dissipação devem produzir variações igualmente contínuas no resultado. Não
deve existir salto qualitativo por uma diferença numérica pequena, como trocar
um objeto de 1 kg por outro de 0,99 kg. Cenários de contatos empilhados devem
ter regressões comparativas para massas idênticas, próximas e distintas,
verificando repouso, não interpenetração e continuidade da resposta dinâmica.

---

# Parte II — Modelo físico e objetos

## 7. `Objeto`

Tudo que possuir existência física relevante na simulação deve ser modelado prioritariamente como um `Objeto`. Tudo que puder colidir deve derivar dessa classe.

`Objeto` concentra atributos físicos compartilhados, incluindo no mínimo:

- identidade;
- dimensões;
- massa base;
- resistência a colisão;
- resistência ao calor;
- vida útil;
- propriedades necessárias à participação uniforme no core físico.

A posição, orientação, velocidade e demais estados cinemáticos são mantidos sob autoridade do core e expostos aos demais sistemas apenas para consulta.

### 7.1 Representação visual

Todo `Objeto` implantado em cena deve possuir ou disponibilizar uma representação visual consultável pelo renderer.

- A representação visual deve ser atributo ou componente separado da lógica física.
- Ela não deve alterar o core nem o estado físico.
- Pode possuir partes móveis e efeitos animados, como flaps, braços, trem de pouso, rodas, asas, antenas, RCS e chamas.
- A animação consulta o estado real do objeto e seus componentes.
- Quando uma parte visual também produzir efeito físico, o efeito é calculado pelo core.
- Convenção obrigatória de coordenadas: o core físico usa Y positivo para cima
  e rotação positiva conforme a regra da mão direita. O Canvas 2D usa Y
  positivo para baixo; portanto, ao desenhar uma orientação física no Canvas,
  o ângulo deve ter o sinal invertido (`rotate(-orientacaoRad.z)`). Essa
  conversão pertence exclusivamente à camada de renderização e nunca ao core.
  Exemplo: um impacto vindo da esquerda acima do centro de massa aplica torque
  físico horário e deve inclinar visualmente o topo do objeto para a direita.

### 7.2 Resistência a colisão

`resistenciaColisao` deve existir em todo `Objeto`, encapsulada por acessores ou métodos com validação de intervalo e unidade.

O core utiliza essa propriedade para resolver impactos, integridade e danos.

O core não deve escolher categorias artificiais como colisão "elástica" ou
"inelástica". Absorção, deformação, dano e devolução de impulso devem ser
calculados continuamente a partir da energia do impacto e das propriedades
físicas dos materiais envolvidos, incluindo sua resistência estrutural.

Todo objeto e toda superfície de contato devem possuir também uma
`dissipacaoImpacto` (fração entre 0 e 1, acessada por método ou propriedade
encapsulada). Ela representa a parcela de energia mecânica convertida em
deformação reversível, vibração, som e calor a cada contato. A dissipação
combinada dos dois materiais impede restituição perfeita sem depender de uma
categoria artificial de colisão; os quiques devem reduzir até o repouso, salvo
quando uma configuração física explícita declarar dissipação nula.

O mesmo princípio se aplica a contatos e colisões com o solo, plataformas,
água quando modelada como meio físico e demais superfícies. Não deve existir
uma regra especial de "pouso": o core usa as propriedades físicas do objeto e
da superfície para determinar apoio, quique, absorção, deslizamento,
deformação, dano ou tombamento.

Em cenários de teste, um objeto "disparado" recebe somente velocidade inicial
como resultado de um impulso externo. Ele não possui motor, força contínua ou
reposição de energia própria, salvo quando tais sistemas forem declarados
explicitamente no cenário.

### 7.3 Resistência ao calor

`resistenciaCalor` deve existir em todo `Objeto`, igualmente encapsulada e validada.

O core utiliza essa propriedade ao calcular aquecimento ambiental, aerodinâmico, reentrada e dano térmico.

---

## 8. Massa e composição física

Todo `Objeto` deve possuir uma `massaBase`, correspondente à sua massa própria sem cargas variáveis, combustível, fluidos consumíveis, cargas transportadas ou objetos temporariamente associados.

O atributo físico `massa` representa a massa instantânea total utilizada pelo core.

A massa instantânea deve considerar:

- massa base;
- componentes físicos integrados;
- combustíveis e fluidos;
- cargas;
- módulos;
- objetos transportados;
- vínculos estruturais e acoplamentos que integrem o conjunto físico.

Ela pode variar por:

- consumo ou transferência de combustível;
- abastecimento;
- carregamento e descarregamento;
- deploy;
- separação de estágios;
- desacoplamento e acoplamento;
- perda estrutural;
- demais processos que alterem a matéria associada ao conjunto.

O core deve usar sempre a massa instantânea nos cálculos de gravidade, movimento, inércia, torque, aceleração, colisão, flutuação e demais interações físicas.

Objetos podem possuir massas de referência, como:

- massa estrutural;
- massa seca;
- massa operacional;
- massa nominal.

Essas massas servem para configuração, engenharia, validação, documentação e telemetria, mas não substituem a massa instantânea.

Alterações de massa devem afetar coerentemente:

- centro de massa;
- momento de inércia;
- desempenho de propulsão;
- estabilidade;
- aceleração e frenagem;
- flutuação;
- acoplamento;
- resposta a colisões.

---

## 9. Forças, torques e vínculos

O core deve considerar o ponto de aplicação de cada força.

Forças aplicadas fora do centro de massa devem produzir torque e resposta angular coerentes, inclusive em:

- propulsores;
- RCS;
- sustentação;
- superfícies aerodinâmicas;
- contatos;
- colisões;
- atuadores mecânicos.

### 9.1 Ponto físico de contato em colisões

O resolvedor de colisões deve calcular o ponto de contato pela geometria real
da região de sobreposição ou da superfície de contato, e não pela média das
posições dos centros dos objetos. Para caixas alinhadas, isso significa usar o
centro da interseção nos eixos tangenciais e o ponto médio entre as faces em
contato no eixo normal.

Esta regra é obrigatória para preservar a distribuição correta de impulso e
torque. Usar o meio dos centros pode aplicar torque espúrio ao objeto atingido,
consumir indevidamente o impulso de retorno e fazer uma colisão fora do centro
parecer não devolver energia. A validação deve incluir impactos acima, abaixo
e exatamente no centro de massa, verificando simultaneamente quique e rotação.

No contato com uma `Superficie`, o core deve transformar os vértices da
geometria do objeto pela sua orientação atual e usar a quina, aresta ou face
mais baixa como contato efetivo. Nunca deve usar uma base vertical fixa após o
objeto girar. Essa regra é essencial para foguetes, boosters, naves, torres e
qualquer objeto alto: eles devem apoiar, tombar ou tocar o solo pelas partes
reais de sua geometria, sem flutuação visual ou impulso de solo incompatível.

### 9.2 Atrito de apoio entre objetos independentes

Objetos sem conexão estrutural ainda podem transferir esforço quando estiverem
em contato físico. Um propulsor apenas apoiado sobre um veículo, por exemplo,
não passa a integrar sua massa nem a receber vínculo artificial: o empuxo pode
ser transmitido somente pelo atrito tangencial no contato de apoio.

Esse atrito deve ser declarado por ambos os materiais por uma propriedade
específica de contato entre objetos; a ausência de declaração representa
superfície sem aderência entre corpos. O core limita o impulso tangencial pela
reação normal e pelos coeficientes declarados. A implementação inicial cobre
faces de apoio quase horizontais; contatos inclinados continuam no modelo de
impacto até que o atrito estático/dinâmico orientado seja implementado.

Objetos podem ser ligados por conexões físicas ou estruturais. Enquanto a conexão existir, suas propriedades devem participar da dinâmica do conjunto. Quando uma conexão for liberada ou falhar, os objetos continuam existindo e passam a evoluir conforme suas próprias condições físicas.

A conexão pode possuir propriedades como resistência a força, torque, geometria e pontos de vínculo.

### 9.3 Fixadores estruturais

Um `FixadorEstrutural` representa uma conexão física entre dois `Objeto`s. Ele
declara uma resistência de tração em N e o esforço que deve transmitir. Enquanto
íntegro, o core reúne todos os objetos alcançáveis pela cadeia de fixadores em
uma única **ilha estrutural rígida**. No modelo planar atual, a ilha calcula
uma só massa, centro de massa, inércia composta e momento angular antes de
projetar posição, velocidade e rotação comuns para todos os membros. Portanto,
propulsores simétricos não podem adquirir giro por ordem de resolução; uma
força fora do centro de massa do conjunto deve gerar o torque físico
correspondente, mantendo as posições e orientações relativas. Quando o esforço
solicitado excede a resistência, o fixador rompe de forma determinística antes
da integração do passo e a topologia é reconstruída: os objetos separados
voltam a evoluir independentemente. Um fixador não é um atalho de interface nem
uma ancoragem visual.

Em um impacto contra superfície enquanto o vínculo estiver íntegro, a energia
usada para dano na peça que tocou deve considerar a massa efetiva do conjunto,
incluindo sua inércia composta. Não é aceitável calcular o dano como se apenas
o motor, tanque ou outro componente isolado tivesse atingido o solo.

---

# Parte III — Veículos, naves e propulsão

## 10. `Veiculo`

`Veiculo` deve estender `Objeto` e representar objetos capazes de mobilidade controlada.

Ele concentra capacidades comuns de operação e mobilidade, incluindo, conforme seus sistemas instalados:

- propulsão;
- tração;
- frenagem;
- manobra;
- geração ou solicitação de forças destinadas ao movimento.

Não se deve pressupor que todo veículo possua o mesmo tipo de motor ou mecanismo de mobilidade.

---

## 11. Veículos terrestres

Veículos terrestres especializam `Veiculo`.

Exemplos:

- `Rebocador`;
- `PlataformaMovel`.

Tração, frenagem, contato com o solo, massa transportada e colisões obedecem às mesmas regras uniformes do core.

Veículos terrestres podem transportar ou rebocar naves por conexões físicas. O movimento somente deve ocorrer quando potência, tração, capacidade de carga e resistência estrutural forem suficientes diante de:

- massa transportada;
- inclinação;
- atrito;
- resistência ao rolamento;
- demais forças do cenário.

---

### 11.1 Veículo composto

Um veículo pode possuir um corpo físico central e módulos físicos por
composição, como tanques, propulsores, cargas, paraquedas e atuadores. Esses
módulos continuam sendo `Objeto`s independentes no `MundoFisico`; o veículo
composto não deve criar uma cópia concorrente de suas posições, velocidades ou
massas.

O agregado é responsável por declarar pertencimento, instalar vínculos e
oferecer sua API operacional. O mundo registra cada corpo e cada
`FixadorEstrutural` separadamente. Enquanto a cadeia de fixadores estiver
íntegra, a massa instantânea, o centro de massa e os diagnósticos do conjunto
devem considerar somente os objetos fisicamente conectados ao corpo central.
Quando um vínculo romper, o módulo correspondente permanece no mundo, mas deixa
de compor o veículo e passa a evoluir como corpo independente.

Computadores de voo e outros controladores internos não devem navegar pela
instância proprietária. Eles recebem somente interfaces públicas dos módulos
que controlam. A sequência automática de propulsores deve chamar as mesmas
operações semânticas usadas pelo operador, respeitando ordem, permissivos e
ignição explícita.

---

## 12. `Nave`

`Nave` deve estender `Veiculo` e modelar, conforme aplicável:

- decolagem vertical;
- capacidade de carga;
- combustível;
- resistência à força G;
- RCS;
- propulsores;
- superfícies aerodinâmicas;
- portas de acoplamento;
- escudo térmico;
- demais sistemas de voo.

Nenhuma capacidade deve ser presumida universalmente. As operações disponíveis dependem dos componentes, sistemas e características reais daquela nave.

---

## 13. Sustentação aerodinâmica e voo sustentado

Algumas naves podem possuir superfícies ou geometria capazes de gerar sustentação aerodinâmica, como:

- asas;
- elevons;
- estabilizadores;
- corpos sustentadores;
- outras superfícies equivalentes.

O core deve calcular sustentação e arrasto a partir de fatores como:

- densidade atmosférica;
- velocidade relativa ao ar;
- orientação;
- ângulo de ataque;
- geometria;
- área aerodinâmica;
- coeficientes aplicáveis;
- configuração e integridade das superfícies.

Uma nave pode permanecer em voo atmosférico sustentado, inclusive em baixa altitude, quando as forças aerodinâmicas e demais forças disponíveis forem suficientes para equilibrar seu peso e manter a trajetória.

Não deve existir um estado artificial de `voando` que suspenda as leis físicas. A permanência em voo é consequência das forças calculadas.

Quando velocidade, ângulo de ataque, densidade, configuração ou integridade deixarem de produzir sustentação suficiente, a nave deve responder fisicamente à perda de sustentação.

Superfícies aerodinâmicas podem ser modeladas como componentes ou objetos físicos conforme sua relevância para colisão, dano, separação e dinâmica.

### 13.1 Paraquedas

Uma `Nave` ou outro `Objeto` pode possuir um ou mais paraquedas por composição
para auxiliar a reduzir sua velocidade em pousos, descidas ou recuperações
atmosféricas. O paraquedas não cria um estado artificial de pouso seguro: ao
ser acionado, ele aumenta a área frontal e o arrasto aerodinâmico efetivos do
objeto; o core continua calculando gravidade, velocidade, forças e contato com
a superfície normalmente.

O comportamento aerodinâmico e a representação visual do paraquedas devem
respeitar sempre o fluxo relativo do ar (`velocidade do objeto - velocidade do
ar`), independentemente da orientação da nave ou do estágio ao qual ele esteja
acoplado. O arrasto aponta no sentido oposto a essa velocidade relativa; o
dossel visual fica a sotavento do objeto. Na ausência de fluxo mensurável, sua
orientação visual pode permanecer neutra, mas não deve ser derivada da atitude
do veículo.

O acionamento pode ser manual ou vir de um controlador autorizado. Depois de
aberto, o paraquedas reduz a velocidade somente pela força de arrasto que o
`MundoFisico` calcula; nunca por alteração direta de velocidade. Em conjuntos
unidos por fixadores, ele pode ser acoplado ao corpo estrutural designado e o
efeito é transmitido fisicamente pelos vínculos enquanto estes estiverem
íntegros. A telemetria da bancada deve expor o fluxo relativo e a força de
arrasto para tornar essa validação observável.

O componente deve declarar pelo menos área frontal, coeficiente de arrasto,
estado de abertura e integridade. Sua abertura deve ocorrer por comando
operacional ou controlador autorizado, e sua representação visual deve apenas
consultar esse estado — nunca alterar a física diretamente.

O paraquedas possui massa própria, resistência de tração e integridade
estrutural. Esses atributos e o estado de abertura são internos e somente
podem ser consultados por métodos; consumidores externos não recebem acesso
mutável ao componente. Ao ser acoplada, sua massa integra a massa instantânea
do objeto portador.

Na bancada, a área frontal é a única calibração solicitada ao operador. Massa,
coeficiente de arrasto e resistência de tração são derivados por um modelo de
paraquedas padrão e apresentados como valores calculados; a interface não deve
exigir que o usuário ajuste parâmetros correlatos independentemente.

---

## 14. `Propulsor`

`Propulsor` deve estender `Objeto` e representar um equipamento físico capaz de gerar empuxo.

Ele deve expor dados e operações relacionados a:

- empuxo;
- throttle quando aplicável;
- fluxo de combustível;
- compatibilidade de combustíveis;
- ignição e desligamento;
- estado operacional;
- integridade;
- desgaste;
- efeitos físicos associados.

Uma `Nave` pode possuir quantidade variável e mais de um tipo de `Propulsor`, por composição.

Tipos como `Raptor` e `Merlin` podem especializar `Propulsor` quando houver comportamento próprio relevante. Diferenças exclusivamente paramétricas devem preferencialmente ser configuradas por dados.

O fato de um propulsor estar instalado em uma nave não elimina sua identidade física. Caso seja separado, arrancado ou implantado independentemente, ele continua sendo o mesmo `Objeto`, agora com outro vínculo físico.

Dano estrutural deve afetar a operação do propulsor progressivamente: a
integridade restante reduz o empuxo efetivo para a mesma vazão de propelente.
Quando a integridade chega a zero, o propulsor torna-se inoperante, corta o
empuxo, invalida a ignição e não pode receber nova partida. A telemetria deve
expor integridade e eficiência operacional restante.

### 14.1 Vetorização de empuxo

Vetorização é uma capacidade opcional. Um `Propulsor` básico mantém o eixo de
empuxo fixo; `PropulsorVetorizado` especializa-o quando o bocal e seus
mecanismos possuírem comportamento próprio relevante.

O propulsor vetorizado deve compor um `SistemaDeVetorizacao` por interfaces de
comando, leitura e atuador. O controlador de voo solicita um ângulo-alvo, mas
o atuador aplica somente a posição efetivamente atingida, limitada por curso e
velocidade angular. A direção real do empuxo resulta dessa posição e deve gerar
força lateral e torque no `MundoFisico`, sem alterar diretamente velocidade ou
orientação do veículo.

Atuadores hidráulicos, elétricos ou eletromecânicos podem especializar a mesma
interface. Disponibilidade elétrica, hidráulica e de controle deve condicionar
a atuação; sensores, retorno à posição neutra, folgas, limites mecânicos e
falhas permanecem extensões previstas do mesmo componente.

### 14.1 Partida, intertravamentos e ignição de propulsores

O comportamento descrito nesta seção corresponde ao **Propulsor Básico**: o
modelo de referência inicial para ensaios, manutenção e integração física. Ele
não pretende ainda representar todos os subsistemas, transientes, redundâncias
ou particularidades de motores de voo reais. Especializações futuras podem
acrescentar etapas e permissivos próprios, preservando as garantias de cadeia
de dependências, ignição explícita, diagnóstico e interrupção segura aqui
definidas.

No Propulsor Básico, o equipamento calcula empuxo e vazão somente quando seus
permissivos estão válidos e solicita a força correspondente ao core. O
`MundoFisico` é quem combina essa força com gravidade, contatos, atrito e
colisões para calcular aceleração, velocidade e posição; o propulsor nunca
altera diretamente o estado cinemático.

As seguintes simplificações são conscientes nesta etapa e não devem ser
confundidas com comportamento final de um motor de voo:

- empuxo máximo e vazão são parâmetros, ainda não derivados de pressão de
  câmara, razão de mistura, pressão ambiente ou geometria do bocal;
- a força é aplicada sem ponto de montagem ou bocal explícito e, portanto,
  ainda não produz torque de instalação;
- tanque e propulsor podem existir como objetos físicos independentes; a
  composição automática de massa, centro de massa e inércia exige vínculo
  estrutural apropriado;
- a mangueira modela compatibilidade, alcance, alimentação e ruptura, mas não
  pressão, válvulas, vazamentos ou dinâmica interna de fluidos;
- a ignição confirmada não possui nesta versão transiente de partida, rampa de
  empuxo ou falha de ignição.

Um `Propulsor` não passa a produzir empuxo apenas porque possui throttle,
combustível e sistemas disponíveis. A partida deve preservar etapas explícitas,
consultáveis e registráveis, pois elas também representam ações de manutenção e
diagnóstico durante o jogo.

- Os sistemas necessários devem possuir uma ordem declarada de partida. No
  modelo inicial do propulsor: elétrico → hidráulico → combustível → controle.
- Um sistema dependente só pode ser ligado se a sua dependência estiver
  operacional. Por exemplo, o sistema hidráulico não pode ser ativado sem a
  alimentação elétrica válida.
- Depois dos permissivos de partida, a ignição é uma operação explícita e
  distinta. Somente uma ignição confirmada autoriza fluxo de propelente e
  empuxo.
- A queda, falha, desligamento ou indisponibilidade de qualquer sistema
  obrigatório deve cancelar imediatamente a ignição vigente e interromper o
  empuxo no passo físico correspondente.
- A indisponibilidade deve propagar-se para os estágios posteriores que dela
  dependem. Assim, uma queda elétrica desliga hidráulica, combustível e
  controle; uma queda hidráulica desliga combustível e controle. Sistemas
  dependentes são interrompidos, e não marcados automaticamente como a causa
  primária da falha.
- A ruptura ou indisponibilidade física da mangueira de alimentação deve
  desligar o sistema de combustível; por consequência, o controle dependente
  também é interrompido e a ignição é cancelada. Reconectar ou reparar a linha
  não pode restaurar empuxo sem rearmar a cadeia e realizar nova ignição. A
  simples tentativa de ligar o sistema de combustível enquanto a mangueira
  permanecer rompida deve ser negada com diagnóstico explícito.
- Restaurar um sistema não religa o propulsor por si só: é obrigatória uma nova
  ignição após todos os permissivos voltarem a ser satisfeitos e a cadeia ser
  novamente armada na ordem correta.
- O controlador local ou de missão pode coordenar automaticamente a sequência
  durante a operação normal, mas deve fazê-lo invocando as mesmas operações
  públicas, na mesma ordem e com os mesmos permissivos do modo manual. A
 automação não pode alterar estados internos diretamente, pular etapas ou
 tornar a ignição implícita; seus comandos, transições e bloqueios devem
 permanecer observáveis. A bancada e as interfaces de manutenção devem poder
 comandá-los e observá-los individualmente.

Os comandos de interface, bancada, controlador automático e aplicação real
devem convergir nas mesmas operações semânticas públicas do domínio — por
exemplo, ligar sistema, desligar sistema e solicitar ignição. Uma interface
não deve enviar uma atribuição genérica de estado operacional para representar
um comando do operador; estados de falha permanecem resultado de sistemas ou
eventos físicos, não comandos de apresentação.

Diagnósticos de partida e ignição devem reutilizar os mesmos permissivos que
autorizam a operação, informando qual etapa ou dependência bloqueou o comando.
Os eventos de tentativa, sucesso, cancelamento e nova ignição futura devem ser
telemetrizados de forma determinística.

### 14.2 Sincronização operacional de automação e interface

Quando um controlador automático executar uma transição que também pode ser
solicitada manualmente, a interface deve refletir o novo estado no mesmo passo
de simulação ou atualização visual. Um botão representa a **ação atualmente
disponível**, e não uma intenção anterior: sistema operacional apresenta
“Desligar”; sistema desligado ou em falha apresenta “Ligar”; ignição confirmada
não pode continuar apresentada como ação pendente. Essa sincronização deve usar
o estado operacional real e não uma cópia ou estado exclusivo da interface.

---

## 15. Combustíveis e fluidos

O sistema de combustível deve suportar:

- diferentes substâncias;
- estados físicos distintos;
- combustível sólido;
- capacidade individual por tipo;
- consumo e transferência;
- alteração da massa instantânea.

Cada propulsor declara quais combustíveis ou combinações são compatíveis.

O core calcula consumo, empuxo e efeitos de massa remanescente a partir da configuração e do estado dos sistemas envolvidos.

---

## 16. Escudo térmico

Naves podem possuir `EscudoTermico` por composição.

Ele deve declarar:

- regiões protegidas;
- capacidade ou resistência térmica;
- integridade;
- desgaste.

O core calcula exposição e aquecimento e aplica a proteção enquanto houver capacidade disponível. Quando a proteção for excedida, o dano térmico correspondente deve atingir os objetos ou regiões expostas.

---

## 17. Hot-staging e separações

O anel de hot-staging é um `Objeto` físico próprio, com massa, dimensões, resistências e representação visual.

Enquanto integrado, liga-se aos demais objetos por conexões estruturais e participa da dinâmica do conjunto.

Quando liberado, torna-se um objeto independente na cena, sujeito às mesmas leis de:

- gravidade;
- colisão;
- aerodinâmica;
- aquecimento;
- movimento.

O mesmo princípio deve orientar outras separações físicas.

---

# Parte IV — Plataformas e ambiente físico

## 18. `Plataforma`

`Plataforma` deve estender `Objeto` e representar estruturas físicas de apoio.

Exemplos:

- `Torre`;
- `Pad`;
- `Balsa`;
- `EstacaoEspacial`.

Uma plataforma não é estática por definição.

Sua estabilidade resulta de:

- massa;
- centro de massa;
- geometria;
- resistência estrutural;
- contatos;
- apoios;
- ancoragem;
- vínculos;
- forças aplicadas.

Uma colisão ou carga suficientemente intensa pode deslocar, inclinar, tombar ou danificar uma plataforma.

Toda `Plataforma` deve disponibilizar sua posição e pelo menos um ponto de aproximação por API pública, como `getPosicao()` e `getPontoAproximacao()`.

---

## 19. Torre e captura

A `Torre` possui automação e deve receber controladores e sistemas internos por composição.

O controlador local da torre observa sensores, recebe objetivos operacionais e comanda seus atuadores.

Em uma captura, nenhuma restrição deve estabilizar artificialmente a plataforma. O core considera:

- massa da nave;
- massa da plataforma;
- centros de massa;
- pontos de contato ou captura;
- forças e torques;
- apoios e ancoragens;
- resistência estrutural.

Uma nave suficientemente pesada pode deslocar, deformar, inclinar ou tombar uma estrutura se as condições físicas permitirem.

---

## 20. Água e `Balsa`

`Balsa` deve especializar `Plataforma` para representar estrutura de apoio flutuante.

A água é um meio fluido dinâmico com movimento próprio e interação física com objetos.

O core deve ser capaz de considerar, conforme o estágio de implementação:

- empuxo hidrostático;
- densidade média;
- deslocamento de fluido;
- arrasto;
- correntes;
- estabilidade;
- posição e orientação;
- afundamento.

Uma nave deve flutuar quando suas condições físicas permitirem. Se sua densidade média e geometria não fornecerem sustentação suficiente, deve afundar.

Após pouso vertical na água e desligamento dos motores, uma nave não deve permanecer artificialmente vertical. Inclinação, centro de massa, geometria, empuxo e demais forças devem produzir o comportamento correspondente, incluindo tombamento.

---

## 21. Contato e estabilidade em terra

O solo é uma superfície física, não um `Objeto`. Superfícies podem possuir
material e propriedades próprias, como areia, água, terra ou concreto,
incluindo resistência, integridade e comportamento de contato. Elas devem ser
consultadas pelo core ao resolver contatos, sem criar uma lógica artificial de
"pouso" separada.

Em pousos sobre terra, uma nave inclinada pode permanecer em pé quando a projeção do centro de massa estiver dentro da região de apoio e as forças de contato puderem equilibrar seu peso e torques.

Fora dessa condição, o core deve calcular tombamento, deslizamento ou demais movimentos resultantes.

---

# Parte V — Sistemas internos e falhas

## 22. Sistemas internos

Todo equipamento operacional complexo pode possuir sistemas internos por composição.

Sistemas representam subsistemas físicos ou lógicos, incluindo:

- elétrico;
- hidráulico;
- pneumático;
- combustível;
- térmico;
- comunicação;
- aviônica;
- controle;
- lubrificação;
- segurança;
- outros domínios pertinentes.

Cada sistema pode possuir:

- estado operacional;
- integridade;
- vida útil;
- desgaste;
- consumo de recursos;
- permissivos;
- dependências;
- diagnóstico.

Falhas, degradação, desgaste e danos devem afetar inicialmente os sistemas envolvidos antes de impactarem capacidades globais do objeto.

Todo `Objeto` danificado deve degradar progressivamente as capacidades que
presta, de acordo com seu domínio, até o colapso total de sua integridade. Dano
não pode permanecer somente como telemetria ou efeito visual. Exemplos: um
propulsor perde empuxo efetivo; uma torre de captura pode mover atuadores mais
lentamente, perder precisão, operar de modo intermitente ou falhar; uma
superfície aerodinâmica perde sustentação e controle. O comportamento específico
deve decorrer dos sistemas e componentes afetados, de forma determinística e
observável pela telemetria e diagnóstico operacional.

### 22.1 Estados operacionais

Os sistemas devem utilizar uma convenção comum de estados operacionais. A enumeração concreta pode evoluir, mas deve distinguir no mínimo conceitos equivalentes a:

- desligado;
- inicializando;
- operacional;
- degradado;
- falha;
- inoperante.

Estados adicionais devem ser adicionados apenas quando representarem distinções reais do domínio.

---

## 23. Coordenação interna dos objetos

Sistemas e componentes pertencentes a um mesmo objeto não devem manter referência à classe proprietária apenas para navegar por sua estrutura interna.

Componentes não devem depender de conhecimento desnecessário sobre outros sistemas.

Exemplo: um `Propulsor` não deve percorrer uma `Nave` para localizar sistema elétrico ou sistema de combustível.

A coordenação interna é responsabilidade do objeto agregador e, quando aplicável, de seu `GerenciadorDeSistemas`.

O componente recebe explicitamente apenas:

- dados;
- recursos;
- permissões;
- dependências;

necessários à sua operação.

Instâncias mutáveis de sistemas internos não devem ser expostas como atributos
públicos do objeto proprietário. Consumidores externos — interface, bancada,
controladores e testes — consultam seus estados por métodos ou snapshots
imutáveis do agregado e solicitam transições por comandos semânticos do mesmo
agregado. Assim, nenhum consumidor pode alterar diretamente um subsistema,
nem um subsistema precisa conhecer seu objeto proprietário para operar.

---

## 24. `GerenciadorDeSistemas`

Objetos complexos podem possuir um `GerenciadorDeSistemas` por composição.

Ele coordena exclusivamente os sistemas internos do mesmo objeto.

Responsabilidades possíveis:

- consultar estado dos sistemas;
- verificar dependências;
- verificar permissivos e intertravamentos;
- consolidar disponibilidade operacional;
- distribuir recursos e informações necessários aos componentes;
- informar operação normal, degradada ou indisponível;
- coordenar sequências internas quando apropriado.

Ele não deve:

- substituir o `ControladorMissao`;
- substituir controladores locais;
- alterar diretamente estados físicos;
- assumir responsabilidades do core.

### 24.1 Dependências, falhas e modos degradados

Uma operação pode depender de múltiplos sistemas.

Exemplo: fechar braços de uma torre pode exigir:

- alimentação elétrica disponível;
- hidráulica dentro dos limites;
- sensores válidos;
- atuadores disponíveis;
- integridade estrutural;
- permissivos de segurança.

O gerenciador deve ser capaz de informar se uma operação está:

- autorizada;
- autorizada em modo degradado;
- bloqueada;

incluindo os motivos e restrições pertinentes.

A arquitetura deve suportar futuramente redundância, votação, fallback e tolerância a falhas sem exigir sua implementação completa nos primeiros marcos.

---

### 24.2 Diagnóstico operacional e explicabilidade

Todo objeto que possua sistemas, componentes operacionais, controladores ou capacidades sujeitas a falhas deve ser capaz de fornecer diagnóstico operacional explicável.

O objetivo do diagnóstico não é apenas informar que uma operação falhou, mas explicar de forma objetiva quais condições impediram sua execução ou conclusão.

Uma falha operacional deve poder ser compreendida por operadores, pela Engenharia de Missão, pela telemetria e por ferramentas futuras de análise e depuração.

### Diagnóstico de operações

Operações podem possuir requisitos, permissivos, intertravamentos, recursos e condições de sucesso.

Exemplos:

- fechar braço da torre;
- iniciar ignição;
- realizar captura;
- executar docking;
- liberar carga;
- acionar trem de pouso;
- abrir válvula;
- iniciar sequência automática.

Sempre que uma operação:

- for negada;
- for bloqueada;
- falhar durante a execução;
- não atingir o resultado esperado dentro do tempo previsto;

o sistema responsável deve disponibilizar diagnóstico detalhado.

---

### Estrutura conceitual do diagnóstico

O diagnóstico deve informar:

- operação solicitada;
- estado da operação;
- motivo principal da falha quando identificável;
- lista dos requisitos avaliados;
- resultado individual de cada requisito.

Cada requisito deve indicar, quando aplicável:

- descrição;
- estado atendido ou não atendido;
- valor atual;
- valor esperado;
- origem da informação.

---

### Exemplo conceitual

Solicitação:

```text
Fechar braço da torre
```

Resultado:

```text
Falha operacional

Braço da torre não fechou após comando.
```

Diagnóstico:

```text
Condições necessárias:

[OK] Alimentação elétrica disponível
[FALHA] Pressão hidráulica mínima atingida
[OK] Atuador operacional
[FALHA] Sensor de posição válido
[OK] Integridade estrutural
[OK] Intertravamentos liberados
```

Quando existir interface gráfica, requisitos atendidos e não atendidos devem ser destacados visualmente de forma distinta, preferencialmente utilizando convenções equivalentes a:

- verde para condição atendida;
- vermelho para condição não atendida;
- amarelo para condição degradada ou parcialmente atendida.

---

### Falha de conclusão

Mesmo quando uma operação for autorizada, o sistema deve ser capaz de diagnosticar falhas de conclusão.

Exemplo:

```text
Comando aceito.
Objetivo: fechar braço da torre.
Resultado esperado não alcançado.
```

Diagnóstico:

```text
Braço da torre não atingiu posição fechada no tempo permitido.

Condições avaliadas:

[OK] Elétrica operacional
[OK] Hidráulica operacional
[FALHA] Atuador travado
[OK] Sensor válido
```

O diagnóstico deve refletir o estado real observado após a tentativa de execução.

---

### Integração com alarmes

Alarmes operacionais podem referenciar um diagnóstico associado.

Exemplo:

```text
ALARME

Braço da torre não fechou após comando.
```

Ao consultar o alarme, deve ser possível visualizar os requisitos avaliados e os motivos identificados para a falha.

Alarmes não devem conter apenas códigos genéricos quando houver informações suficientes para explicar a ocorrência.

---

### Integração com telemetria

Eventos de falha, bloqueio, degradação ou operação negada devem registrar, quando aplicável:

- operação solicitada;
- instante da ocorrência;
- diagnóstico produzido;
- requisitos avaliados;
- condição individual de cada requisito.

Essas informações devem permanecer disponíveis para:

- análise pós-missão;
- replay;
- investigação de falhas;
- depuração;
- validação de protocolos.

---

### Integração com pré-condições operacionais

As pré-condições definidas para uma operação devem ser reutilizadas pelo sistema de diagnóstico sempre que possível.

Uma condição utilizada para autorizar ou bloquear uma operação não deve ser reimplementada separadamente apenas para gerar mensagens de erro.

O mesmo conjunto de regras deve servir para:

- validação;
- autorização;
- intertravamentos;
- diagnóstico;
- apresentação ao usuário.

Isso garante consistência entre o motivo real da falha e sua explicação operacional.

---

### Responsabilidades

O diagnóstico não é responsabilidade do core físico.

O core continua responsável por:

- movimento;
- forças;
- colisões;
- vínculos;
- estados físicos.

A explicação de por que uma operação foi autorizada, negada ou não concluída pertence aos:

- sistemas;
- componentes;
- controladores locais;
- gerenciadores de sistemas;
- protocolos coordenados pelo `ControladorMissao`.

O objetivo é que toda operação relevante do sistema possa responder não apenas **"falhou"**, mas também **"por que falhou"**, de forma rastreável, determinística e utilizável tanto por operadores quanto por ferramentas automatizadas de análise.

---

## 25. Pré-condições operacionais

Operações complexas podem declarar pré-condições verificáveis.

Uma pré-condição deve representar uma exigência objetiva para que determinada ação possa ser executada.

Exemplos:

- pressão hidráulica mínima;
- alimentação elétrica válida;
- sensor disponível;
- posição segura;
- velocidade relativa dentro do envelope;
- sistema estrutural íntegro.

As regras não devem ser espalhadas arbitrariamente pela interface ou pelo core físico.

---

# Parte VI — Sensores, controladores e camadas de coordenação

## 26. Sensores e atuadores

Controladores devem operar a partir das leituras dos sensores e estados disponibilizados pelos sistemas.

- Sensores observam o estado físico ou interno e fornecem medições.
- Atuadores recebem comandos e produzem efeitos físicos ou operacionais.
- Controladores não alteram diretamente posição, velocidade ou orientação.
- Ruído, erro, atraso, falha e degradação podem ser incorporados aos sensores e atuadores conforme a evolução do projeto.

---

## 27. Controladores locais

Controladores locais coordenam objetivos operacionais específicos de um objeto por meio de seus sensores, sistemas e atuadores.

Exemplos:

- controlador de voo da nave;
- controlador da torre;
- controlador de plataforma móvel.

Eles devem respeitar estados, permissivos e limitações fornecidos pelos sistemas internos.

---

## 28. `ControladorMissao`

Deve existir um `ControladorMissao` responsável por coordenar operações, protocolos e regras entre objetos independentes da simulação.

Participantes podem incluir:

- naves;
- plataformas;
- estações espaciais;
- sondas;
- veículos terrestres;
- outros objetos operacionais independentes.

Objetos independentes não devem manter referências diretas uns aos outros para operações de missão.

Naves consultam o controlador para obter dados ou solicitar operações relacionadas a plataformas. Plataformas fazem o mesmo para operações relacionadas a naves.

O `ControladorMissao`:

- conhece os participantes registrados;
- consulta cada participante por sua API pública;
- coordena protocolos;
- fornece dados, comandos e regras necessários;
- não duplica estado físico.

Essa mediação se aplica ao domínio operacional. O core físico continua podendo processar diretamente todos os `Objeto`s registrados, pois integração, colisões e vínculos exigem visão comum da cena.

---

## 29. Camadas de coordenação

As responsabilidades devem permanecer separadas:

### Core de física
Coordena forças, movimento, colisões, vínculos, restrições mecânicas e demais interações físicas.

### `GerenciadorDeSistemas`
Coordena subsistemas pertencentes ao mesmo objeto.

### Controlador local
Coordena objetivos operacionais daquele objeto utilizando sensores e atuadores.

### `ControladorMissao`
Coordena protocolos e operações entre objetos independentes.

Nenhuma camada deve duplicar ou assumir responsabilidade pertencente a outra.

---

# Parte VII — Protocolos de comunicação

## 30. Princípio geral

Operações entre objetos independentes devem utilizar protocolos de domínio padronizados coordenados pelo `ControladorMissao`.

Um protocolo define, conforme aplicável:

- participantes;
- estados válidos;
- dados de processo;
- comandos;
- confirmações;
- pré-condições;
- permissivos;
- timeouts;
- falhas;
- critérios de conclusão.

A implementação lógica do protocolo não deve depender do mecanismo de transporte.

Chamadas locais, objetos TypeScript, filas de eventos ou mecanismos futuros devem poder preservar o mesmo contrato lógico.

---

## 31. Comunicação cíclica e acíclica

A arquitetura deve suportar dois padrões conceituais de comunicação, inspirados em sistemas de automação industrial.

### 31.1 Dados cíclicos

Destinados a informações continuamente atualizadas, como:

- posição;
- velocidade;
- atitude;
- pressões;
- temperaturas;
- estados de sistemas;
- permissivos;
- comandos contínuos;
- setpoints.

Podem ser representados por imagens de processo fixas e tipadas.

### 31.2 Operações acíclicas

Destinadas a ações ou transações eventuais, como:

- solicitar docking;
- iniciar sequência;
- carregar plano;
- consultar diagnóstico detalhado;
- resetar falha;
- alterar parâmetro;
- solicitar deploy.

A distinção é lógica e não exige implementação de protocolo de rede real.

---

## 32. Palavras padronizadas

Interfaces operacionais podem adotar estruturas padronizadas equivalentes a:

- `ControlWord`: intenções, comandos e autorizações;
- `StatusWord`: estado e resultado operacional;
- `FaultWord`: falhas e diagnósticos;
- `CapabilityWord`: capacidades suportadas pelo objeto;
- `InterlockWord`: permissivos e intertravamentos.

Bits e campos devem possuir significado documentado e estável dentro da versão do protocolo.

A presença de uma capacidade deve preferencialmente ser consultada por contrato ou `CapabilityWord`, evitando lógica baseada em nomes concretos de veículos.

Exemplo proibido como regra de domínio:

```ts
if (ship.name === "Starship") {
  // habilita captura
}
```

A operação deve depender da capacidade declarada e dos sistemas instalados.

---

## 33. Estrutura lógica de mensagens

Quando mensagens forem necessárias, uma estrutura padronizada pode incluir:

- identificador;
- versão do protocolo;
- tipo;
- origem;
- destino;
- contador de sequência;
- identificador de correlação quando aplicável;
- tempo de missão;
- status/flags;
- payload tipado.

O identificador de correlação deve permitir relacionar solicitações, respostas e operações concorrentes.

Falhas de protocolo podem incluir conceitos como:

- timeout;
- dado inválido;
- participante indisponível;
- operação negada;
- mensagem fora de sequência;
- modo degradado.

---

## 34. Exemplo conceitual: captura por torre

Uma captura pode seguir conceitualmente:

1. a nave informa capacidade e estado para captura;
2. a torre informa seus permissivos e disponibilidade;
3. o `ControladorMissao` valida o protocolo e autoriza a operação;
4. o controlador local da torre recebe o objetivo;
5. o `GerenciadorDeSistemas` verifica elétrica, hidráulica, sensores, atuadores e intertravamentos;
6. os atuadores produzem forças para mover os braços;
7. o core calcula o movimento físico;
8. sensores observam o resultado;
9. estados e confirmações retornam pelo protocolo;
10. após contato/captura, o core aplica as restrições físicas correspondentes.

Nenhuma etapa operacional deve escrever diretamente a posição dos braços ou da nave.

---

# Parte VIII — Engenharia de Missão

## 35. Fluxo operacional único

O único fluxo operacional do Protótipo 2 é a **Engenharia de Missão**.

Controle de Voo e Engenharia de Missão devem ser apresentados em um único painel de controle, organizado em seções claras.

Devem ser preservados, quando aplicáveis, os recursos funcionais validados no Protótipo 1:

- seleção de veículo;
- seleção de plataforma;
- preparação;
- contagem regressiva;
- cronograma;
- parâmetros de voo;
- comandos;
- validações;
- telemetria;
- planejamento/mapa;
- status operacional.

---

## 36. Cronograma configurável

O cronograma deve permitir compor as fases necessárias da missão sem depender de perfis de voo rígidos por cenário.

Exemplos de fases:

- teste estático;
- abastecimento;
- decolagem;
- separação;
- manobras;
- inserção orbital;
- rendezvous;
- docking;
- deploy;
- entrada;
- belly-flop;
- retorno;
- captura;
- pouso.

A Engenharia de Missão depende da nave e dos demais objetos selecionados.

O painel deve montar e validar operações a partir de:

- capacidades;
- sistemas;
- componentes;
- restrições;
- protocolos disponíveis.

Uma Starship pode oferecer belly-flop e captura; um ônibus espacial pode oferecer voo planado e pouso em pista; uma bancada de testes pode oferecer ignição estática sem sequer existir uma nave completa.

---

## 37. Novas naves

Antes de criar uma nova nave, é obrigatório obter do usuário as etapas esperadas de sua Engenharia de Missão.

Sem esse cronograma e suas operações esperadas, a implementação deve aguardar esclarecimento.

Não se deve presumir fases a partir de outra nave apenas por semelhança.

---

## 38. Início das missões

Toda missão operacional de voo deve iniciar na Terra e evoluir pelas condições físicas correspondentes.

Não devem existir perfis artificiais de carreira que iniciem uma nave em queda apenas para testar pouso, nem perfis separados de decolagem ou belly-flop quando essas condições puderem ser alcançadas pelo cronograma normal.

Ferramentas internas de desenvolvimento e ADM podem criar estados arbitrários exclusivamente para teste, depuração e validação, sem serem tratadas como missões normais de carreira.

---

# Parte IX — Objetos orbitais, carga e docking

## 39. Sondas, satélites e telescópios

Sondas orbitais, satélites e telescópios devem ser modelados como `Objeto`s quando implantados em cena.

- Sondas podem possuir portas de acoplamento por composição quando aplicável.
- Satélites e telescópios não possuem portas de acoplamento por padrão.
- Naves compatíveis podem possuir uma ou mais portas de acoplamento.

---

## 40. Cargas antes do deploy

Antes do deploy, uma carga transportada deve existir como especificação de carga associada à nave, contendo dados suficientes para:

- massa;
- volume;
- limites;
- planejamento;
- validação da missão.

Ela não precisa existir como `Objeto` independente na cena enquanto permanecer fisicamente integrada e não for necessário simulá-la separadamente.

No deploy, o `ControladorMissao` coordena a criação ou ativação da instância apropriada, define seu estado inicial conforme o estado físico do conjunto e a registra no core e na cena.

A partir desse momento, participa de:

- renderização;
- colisões;
- dinâmica orbital;
- acoplamento quando aplicável.

---

## 41. `EstacaoEspacial`

`EstacaoEspacial` deve estender `Plataforma`.

Toda estação possui obrigatoriamente uma ou mais portas de acoplamento por composição e disponibiliza posição e pontos de aproximação.

---

## 42. Acoplamento automático

O acoplamento automático deve ser coordenado pelo `ControladorMissao` por protocolo explícito entre portas e participantes.

O protocolo pode contemplar:

1. disponibilidade;
2. compatibilidade;
3. autorização de aproximação;
4. alinhamento;
5. captura;
6. travamento;
7. confirmação.

Após o travamento, o core aplica a restrição física de acoplamento e seus efeitos sobre o conjunto.

---

## 43. Rendezvous manual

Deve existir modo de rendezvous manual para a nave selecionada.

A camada de entrada converte comandos do usuário, como:

- setas para manobra;
- `A` e `D` para giro;

em comandos enviados ao controlador ou sistema de manobra da nave.

Canvas e interface nunca alteram diretamente o estado físico.

---

# Parte X — Atmosfera, clima e térmica

## 44. Atmosfera e aerodinâmica

Durante voo atmosférico e reentrada, o core deve calcular forças aerodinâmicas a partir de:

- velocidade relativa ao ar;
- densidade local;
- geometria;
- orientação;
- propriedades aerodinâmicas.

O arrasto deve afetar:

- desaceleração;
- forças resultantes;
- torques;
- aquecimento.

A sustentação deve ser calculada quando as propriedades do objeto permitirem.

A Terra deve ser modelada como corpo em rotação. O core de física deve manter
um referencial explícito e considerar a rotação terrestre ao calcular posição
e velocidade de objetos ligados à superfície, velocidade relativa ao ar,
lançamentos, trajetórias atmosféricas e dinâmica orbital. A rotação não deve
ser tratada apenas como efeito visual: ela deve influenciar as condições
iniciais e as forças aparentes aplicáveis no referencial escolhido.

---

## 45. Ambiente e condições meteorológicas

As condições meteorológicas pertencem ao cenário ou ambiente da missão e são fornecidas explicitamente aos sistemas que delas necessitem.

Não deve existir estado meteorológico global implícito.

As condições podem ser geradas aleatoriamente com distribuição configurável e predominância de tempo limpo.

Deve ser possível:

- desativar completamente efeitos meteorológicos;
- definir condições manualmente;
- utilizar semente para reprodução exata.

Condições relevantes e seed devem ser persistidas junto à missão.

---

# Parte XI — Dano, vida útil e recuperação

## 46. Dano

Uma colisão que cause dano nunca deve interromper automaticamente a simulação.

O core continua evoluindo os objetos e disponibiliza o estado de dano para consulta e apresentação.

Danos podem afetar inicialmente componentes e sistemas específicos antes de comprometer capacidades globais.

Dano térmico, estrutural e decorrente de colisões deve permanecer sob as responsabilidades físicas correspondentes.

---

## 47. Vida útil e desgaste

Todo `Objeto` deve possuir vida útil mensurável, preferencialmente em horas quando aplicável ao domínio.

Devem ser consultáveis:

- horas consumidas;
- desgaste;
- integridade;
- disponibilidade.

Sistemas e componentes também podem possuir vida útil própria quando relevante.

No modo sandbox, a vida útil pode ser restaurada sem custo.

No modo carreira, recuperação ou renovação pode consumir pontos de P&D conforme as regras de progressão.

---

## 48. Recuperação

A missão deve permitir recuperar objetos danificados quando a operação e o cenário permitirem.

Ao ser recuperado, o objeto retorna ao inventário com seu estado persistente de:

- dano;
- integridade;
- desgaste;
- vida útil.

A recuperação não restaura artificialmente sua condição física.

---

# Parte XII — Inventário e persistência

## 49. `Inventario`

Deve existir um `Inventario` que funciona como depósito e registro dos objetos persistentes do jogador.

Cada objeto possui identidade e status operacional, por exemplo:

- disponível;
- armazenado;
- transportado;
- em missão;
- implantado em cena;
- danificado;
- recuperado.

O inventário é fonte de consulta para disponibilidade e status, mas não duplica o estado físico calculado pelo core.

Um objeto em cena pode permanecer simultaneamente registrado:

- no inventário, para identidade e persistência;
- no core, para física.

Cada camada mantém apenas sua própria responsabilidade.

---

## 50. Firestore

Inventário e dados persistentes devem ser armazenados no Firestore por meio de repositório injetado.

Classes de domínio não conhecem diretamente o Firestore.

Dados persistentes podem incluir:

- identidade;
- status;
- dano;
- integridade;
- desgaste;
- vida útil consumida;
- configuração persistente.

Ao iniciar o jogo, um serviço de carregamento recupera inventário e estado de carreira e reconstrói instâncias de domínio antes de disponibilizá-las à missão e à interface.

O domínio deve continuar testável e executável sem conexão com Firestore.

---

# Parte XIII — Telemetria, previsão e replay

## 51. Telemetria

A telemetria de toda missão deve ser persistida para estudo posterior.

O registro deve incluir, conforme aplicável:

- amostras temporais dos estados relevantes;
- leituras de sensores;
- comandos;
- eventos físicos;
- eventos de missão;
- falhas;
- danos;
- mudanças de status;
- configuração da missão;
- condições meteorológicas;
- seed;
- versão relevante do modelo/protocolo.

---

## 52. Eventos físicos e eventos de missão

Deve existir distinção conceitual entre:

### Eventos físicos
Produzidos pelo core ou pelas interações físicas, como:

- colisão;
- separação estrutural;
- sobretemperatura;
- perda de contato;
- ruptura.

### Eventos de missão
Produzidos pelo domínio operacional, como:

- iniciar boostback;
- autorizar captura;
- iniciar sequência de docking;
- deploy de carga;
- mudança de fase.

O `ControladorMissao` pode reagir a eventos físicos, mas não deve fabricar artificialmente o evento físico que deveria ser determinado pelo core.

---

## 53. Replay

Deve ser possível reproduzir qualquer missão a partir dos dados registrados.

O replay deve reconstruir e apresentar a evolução registrada para análise sem alterar:

- inventário;
- carreira;
- vida útil;
- dados persistentes originais.

Quando possível, determinismo e seed devem permitir também reexecução técnica da simulação para comparação e regressão.

---

## 54. Simulação prévia

Antes de iniciar uma missão, deve ser possível simular sua trajetória prevista utilizando:

- configuração;
- carga;
- condições meteorológicas;
- parâmetros de manobra;
- cronograma;
- mesmo core físico e mesmas unidades da missão real.

A previsão não altera:

- inventário;
- vida útil;
- P&D;
- carreira;
- estado persistente.

A trajetória prevista deve ser apresentada em painel de planejamento, incluindo:

- posição inicial;
- rota estimada;
- órbita ou destino previsto;
- objetos relevantes.

A previsão não é garantia de resultado.

Na missão real, diferenças podem surgir por:

- ruído de sensores;
- erro de atuadores;
- falhas;
- degradação;
- condições meteorológicas;
- demais perturbações modeladas.

Os desvios e suas causas devem ser registrados para comparação posterior.

---

# Parte XIV — Modos de jogo e progressão

## 55. Sandbox

O modo sandbox permite experimentar as capacidades disponíveis sem as restrições econômicas ou de progressão da carreira.

Quando habilitado, pode permitir:

- restauração de objetos sem custo;
- renovação de vida útil;
- acesso ampliado a configurações.

A existência do suporte arquitetural a sandbox não obriga sua disponibilização pública em todas as versões.

---

## 56. Carreira

No modo carreira, progressão e recuperação utilizam pontos de pesquisa e desenvolvimento (P&D) conforme as regras do jogo.

P&D representa capacidade técnica e conhecimento, não simplesmente moeda financeira.

Pode ser utilizado para:

- qualificação de tecnologias;
- desenvolvimento de capacidades;
- recuperação e manutenção;
- renovação de vida útil;
- evolução técnica da organização.

A carreira deve permitir progressão desde operações experimentais simples até sistemas espaciais complexos.

Uma missão não precisa ser um lançamento. Ensaios de engenharia, como testes estáticos de propulsores, podem constituir missões completas com planejamento, execução, telemetria e resultado.

---

## 57. ADM e desenvolvimento

O modo ADM é ferramenta de desenvolvimento, teste e validação e deve permanecer conceitualmente separado do sandbox público.

Pode permitir, conforme a implementação:

- criar ou posicionar objetos;
- alterar condições iniciais;
- selecionar seed;
- injetar falhas;
- modificar estados de sistemas;
- alterar inventário;
- liberar tecnologias;
- alterar P&D;
- avançar fases;
- testar cenários arbitrários.

ADM pode iniciar objetos em estados artificiais exclusivamente para depuração e validação, mesmo quando tais estados não forem permitidos na carreira.

Ferramentas de ADM devem ser implementadas incrementalmente conforme necessárias ao desenvolvimento.

---

# Parte XV — Reutilização futura do engine

## 58. Separação entre engine e domínio

Sempre que uma responsabilidade for comprovadamente independente do domínio espacial, deve-se favorecer sua implementação em camada reutilizável.

Exemplos potencialmente genéricos:

- objetos físicos;
- massa e composição;
- forças e torques;
- sistemas internos;
- sensores e atuadores;
- controladores;
- dependências e permissivos;
- falhas e degradação;
- protocolos;
- telemetria;
- eventos;
- determinismo;
- persistência por interfaces.

Exemplos específicos do domínio espacial:

- mecânica orbital;
- RCS;
- escudo térmico de reentrada;
- docking espacial;
- hot-staging;
- operações específicas de lançamento.

Domínios futuros podem especializar o mesmo núcleo com sistemas próprios, como:

- automação industrial;
- máquinas CNC;
- robótica;
- máquinas e células mecatrônicas.

A possibilidade de reutilização futura não justifica criar abstrações sem necessidade atual. O Protótipo 2 continua sendo desenvolvido e validado primeiro pelo domínio espacial.

---

# Parte XVI — Convenções de implementação

## 59. Estado e encapsulamento

- Não utilize variáveis globais para estado, comunicação ou acesso a serviços.
- Dependências devem ser recebidas por construtores, atributos privados ou parâmetros de métodos.
- Estado encapsulado deve ser acessado e alterado por métodos ou acessores TypeScript (`get`/`set`).
- Invariantes devem ser validados nas fronteiras apropriadas.
- Diferencie explicitamente configuração imutável ou de referência de estado mutável da simulação.

---

## 60. Comunicação por consulta explícita

Nesta especificação, termos como "enviar" e "receber" dados descrevem disponibilização e consulta por APIs explícitas, salvo quando um protocolo de mensagens for intencionalmente utilizado.

Não se deve inferir:

- estado global;
- atribuição direta entre objetos independentes;
- entrega implícita;
- dependência escondida.

O consumidor consulta explicitamente o fornecedor ou utiliza o mediador/protocolo correspondente.

---

## 61. Herança e composição

Use herança para relações reais de **é um**:

- `Nave` é um `Veiculo`;
- `Veiculo` é um `Objeto`;
- `Torre` é uma `Plataforma`.

Use composição para relações de **tem um**:

- `Nave` possui propulsores;
- `Nave` possui sensores;
- `Nave` possui sistemas;
- `Torre` possui controlador;
- `Objeto` pode possuir representação visual.

Objetos físicos componentes continuam podendo derivar de `Objeto`. Composição define sua relação estrutural, não nega sua identidade física.

Evite hierarquias artificiais criadas apenas para reduzir duplicação de código.

---

## 62. Evolução incremental

A implementação deve ocorrer por etapas funcionais.

Este documento descreve capacidades que podem pertencer a diferentes marcos do Protótipo 2. A ausência temporária de uma capacidade não autoriza quebrar as fronteiras arquiteturais definidas para implementá-la rapidamente.

Ao mesmo tempo, não se deve implementar antecipadamente subsistemas complexos apenas porque estão previstos no escopo.

A regra prática é:

> projetar a arquitetura para permitir a evolução; implementar apenas o necessário para o marco atual; validar antes de avançar.

---

# 63. Princípio final

O Protótipo 2 deve representar um mundo composto por objetos físicos, sistemas, sensores, atuadores e controladores que interagem segundo regras explícitas.

O core de física determina o que fisicamente acontece.

Os sistemas determinam o que está operacionalmente disponível.

Os controladores determinam quais ações solicitar dentro de suas responsabilidades.

O `ControladorMissao` coordena a interação entre participantes independentes por protocolos padronizados.

A Engenharia de Missão organiza essas capacidades em operações compreensíveis para o jogador.

Nenhuma camada deve substituir artificialmente outra.

O objetivo é permitir que a mesma arquitetura represente desde um teste estático simples de um propulsor até uma missão espacial completa, preservando coerência física, rastreabilidade, testabilidade e capacidade de evolução futura.
