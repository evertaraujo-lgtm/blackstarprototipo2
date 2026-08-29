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
- tanques de propelente e baterias físicas com recursos finitos;
- cadeia operacional elétrica → hidráulica → combustível → controle, com bateria de 28 V e cabo físico;
- alimentação bipropelente por válvulas, linhas, bombas elétricas, câmara de combustão e bocal;
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
 ├── tanques e bateria            (Objetos)
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

A bancada mantém os ensaios de regressão no código e destaca os cenários
integrados. O cenário ativo de propulsão monta uma bancada chumbada ao solo
com propulsor, tanques de metano e oxigênio, bateria, fixadores, válvulas,
linhas, bombas, câmara e bocal.

Os comandos da tela chamam operações públicas do domínio. Por exemplo, a
partida de um propulsor respeita elétrica → hidráulica → combustível → controle
→ ignição, tanto no modo manual quanto no automático.

A tensão nominal de alimentação é declarada por propulsor, em volts (28 V por
padrão). O propulsor só produz empuxo, calor e jato quando sua ignição está
confirmada e a cadeia entrega os recursos necessários. Perda de bateria, cabo,
linha, válvula, propelente ou integridade interrompe a operação no passo físico
correspondente.

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
