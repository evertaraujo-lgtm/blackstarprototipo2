# Black Star Space — Protótipo 2

Núcleo físico determinístico e bancada visual para experimentar objetos,
veículos e sistemas espaciais. O projeto é uma base TypeScript independente:
a bancada é apenas uma interface de observação e comando; o mesmo
`MundoFisico` será usado pela simulação do jogo.

## O que já é simulado

- gravidade local uniforme, integração temporal com subpassos e unidades SI;
- colisões, contatos com superfícies, atrito, dissipação, dano e rotação;
- atmosfera padrão, vento e arrasto relativo ao ar;
- rodas, aderência, tração e frenagem condicionadas ao contato real;
- tanques de propelente com massa variável e propulsores com ignição;
- cadeia operacional elétrica → hidráulica → combustível → controle;
- paraquedas físicos com massa, arrasto e orientação pelo fluxo de ar;
- fixadores estruturais que rompem por esforço;
- veículos compostos, com módulos físicos e ilhas rígidas estruturais.

## Arquitetura

```text
Interface / Bancada / Controle de voo
                │ solicita comandos públicos
                ▼
Veículo composto e seus controladores
 ├── corpo central                (Objeto)
 ├── tanque                      (Objeto)
 ├── propulsores                 (Objetos)
 ├── paraquedas                  (componente)
 ├── computador de voo           (componente operacional)
 └── fixadores estruturais       (vínculos)
                │ solicita forças e vínculos
                ▼
MundoFisico
 ├── integração, gravidade e atmosfera
 ├── colisões, contato e dano
 └── ilhas rígidas de módulos conectados
```

Cada módulo físico continua existindo individualmente no mundo. Enquanto os
fixadores estão íntegros, os módulos conectados formam uma ilha rígida: o core
calcula massa, centro de massa, inércia e momento angular do conjunto. Quando
um fixador rompe, a topologia é recalculada e o módulo separado evolui por suas
próprias forças.

O computador de voo recebe interfaces de comando dos propulsores, sem navegar
pela estrutura interna do veículo. A automação chama a mesma sequência pública
usada pela manutenção manual; não há ignição implícita ou alteração direta de
velocidade, posição ou orientação.

## Bancada de testes

Execute o servidor e abra `http://localhost:5173/tests.html`.

```bash
npm install
npm run dev
```

A bancada agrupa cenários de gravidade, arrasto, colisões, veículos e
propulsão. Entre os ensaios estão pilhas de quadrados livres, impacto e dano,
veículos com rodas, paraquedas, propulsores, vetorização e o veículo composto
com tanque, dois propulsores, computador de voo e paraquedas.

Os comandos da tela chamam operações públicas do domínio. Por exemplo, a
partida de um propulsor respeita elétrica → hidráulica → combustível → controle
→ ignição, tanto no modo manual quanto no automático.

### Registro — bancada térmica: propulsor contra parede

Não existe estado de objeto “ancorado ao mundo”. Uma montagem só pode permanecer
de pé por mecanismos físicos declarados: geometria em contato com uma
`Superficie`, peso, reação normal, atrito, massa, inércia e
`FixadorEstrutural`s entre objetos reais. Portanto, uma estrutura sem apoio
físico cai; uma força ou torque suficiente pode deslocar, tombar, danificar ou
romper seus vínculos. Essa regra vale para bancada, propulsor, paredes e pilhas
de cubos; a renderização não pode congelá-los nem corrigir seu movimento.

O cenário `Propulsor térmico — chama contra parede` usa fundação, bancada,
tanque e motor como corpos físicos ligados por fixadores e apoiados no concreto.
O cenário de duas paredes coloca duas paredes idênticas a 6 m do propulsor,
também apoiadas no concreto: somente a parede no cone da exaustão deve aquecer.
Em atitude nula, empuxo é +X e exaustão/jato térmico é −X.

`Pilha estrutural — 10 cubos de 1 m apoiada no solo` tem dez cubos de
1 × 1 × 1 m e 1 kg, unidos por nove `FixadorEstrutural`s. O cubo inferior
apoia fisicamente no concreto. A variante `Pilha estrutural térmica — jato no
sexto cubo` monta propulsor e tanque em um suporte físico lateral apoiado no
solo, a 6 m do alvo. O cubo recebe calor e pode degradar; qualquer movimento
da pilha ou do suporte é resultado do core físico.

Uma futura representação de chumbadores, estacas, sapatas ou parafusos ao solo
deve ser modelada como conexão física com resistência, geometria e condição de
ruptura — nunca como bloqueio direto de posição ou rotação.

## Desenvolvimento e validação

```bash
npm test
npm run build
```

Os testes são determinísticos e cobrem o núcleo físico, os vínculos, veículos,
propulsores, paraquedas e os cenários de regressão. A renderização não é fonte
de verdade física.

## Limites atuais

O núcleo atual resolve dinâmica estrutural no plano XY: usa rotação em torno do
eixo Z e inércia planar. A evolução para corpo rígido espacial completo exige
orientação 3D e tensor de inércia. Superfícies de contato ainda são planos; o
modelo de atmosfera usa densidade constante configurável.

Esses limites são deliberados para o marco atual e não mudam a separação entre
domínio, core físico e interface.

## Publicação no Firebase Hosting

```bash
npx firebase login
npx firebase use --add
npm run deploy
```

O vínculo com o projeto Firebase é feito por `firebase use --add` para não
registrar no repositório um identificador de projeto inexistente.
