# Black Star Space — Protótipo 2

O foco atual é a simulação dos foguetes BSS-001 a BSS-006:
decolagem manual, controle de inclinação e operação de subida e pouso.
Outros ensaios físicos continuam no código para regressão e evolução futura,
mas não aparecem na bancada principal.

Núcleo físico determinístico e bancada visual para experimentar objetos,
veículos e sistemas espaciais. O projeto é uma base TypeScript independente:
a bancada é apenas uma interface de observação e comando; o mesmo
`MundoFisico` será usado pela simulação do jogo.

## O que já é simulado

- gravidade local uniforme, integração temporal com subpassos e unidades SI;
- colisões, contatos com superfícies, atrito, dissipação, dano e rotação;
- atmosfera padrão, vento e arrasto relativo ao ar;
- densidade por altitude (troposfera até 11 km e camada isotérmica até 20 km);
- rodas, aderência, tração e frenagem condicionadas ao contato real;
- tanques de propelente e baterias físicas com recursos finitos;
- cadeia operacional elétrica → hidráulica → combustível → controle, com bateria de 28 V e cabo físico;
- alimentação bipropelente por válvulas, linhas, bombas elétricas, câmara de combustão e bocal;
- paraquedas físicos com massa, arrasto e orientação pelo fluxo de ar;
- fixadores estruturais que rompem por esforço;
- controle automático de pouso por altitude, velocidades e inclinação medidas;
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
 ├── registros, tempo e ordem do passo
 ├── IntegradorFisico
 ├── SistemaAtmosferico / SistemaTermico
 ├── ResolvedorColisoes
 ├── ResolvedorContatoSuperficie
 ├── ResolvedorEsforcoEstrutural
 ├── SistemaSensores
 └── ilhas rígidas de módulos conectados
```

O mundo coordena o ciclo determinístico e mantém a fonte única dos registros;
os solucionadores encapsulam a matemática dos fenômenos. A geometria de
contato é compartilhada por colisões e sensores, sem regra paralela na
interface.

Cada módulo físico continua existindo individualmente no mundo. Enquanto os
fixadores estão íntegros, os módulos conectados formam uma ilha rígida: o core
calcula massa, centro de massa, inércia e momento angular do conjunto. Quando
um fixador rompe, a topologia é recalculada e o módulo separado evolui por suas
próprias forças.

O computador de voo recebe interfaces de comando dos propulsores, sem navegar
pela estrutura interna do veículo. A automação chama a mesma sequência pública
usada pela manutenção manual; não há ignição implícita ou alteração direta de
velocidade, posição ou orientação.

O BSS-003 usa um gimbal PID de subida no par de decolagem e, durante o pouso,
arma um **gimbal de descida** independente no par de pouso. Junto dele atuam a
desaceleração PID quando a queda ultrapassa a velocidade configurada e o pouso
PID na faixa final de altitude. Os dois últimos fecham a malha pela
velocidade vertical medida; o pouso calcula ainda o perfil de velocidade seguro
para a altura restante. A partida dos propulsores continua exigindo sistemas
disponíveis e ignição explícita.

O computador de voo compõe controladores registrados, em vez de herdá-los. Um
controlador declara suas solicitações normalizadas por atuador (`throttle` ou
`gimbal`) e uma prioridade. Controles independentes podem ficar ativos ao mesmo
tempo; somente uma disputa sobre o mesmo atuador e recurso é arbitrada pela
prioridade. Assim, novos controles — RCS, paraquedas, térmico ou aproximação —
entram por registro, sem ampliar a hierarquia de classes.

O cenário BSS-003 não possui sequenciador automático. O operador escolhe o par
de motores, aciona cada sistema e a ignição e ajusta o throttle. Um único
checkbox é o comando explícito de transferência para pouso: ele só corta a
decolagem após preparar e ignitar o par de pouso pelos permissivos normais e
entrega seu throttle ao controlador. Ao desmarcar, corta o par de pouso e
retorna ao PID de inclinação. A nave mantém um
tanque dedicado para cada par. Os quatro motores ficam externos sob o casco;
tanques centralizados e sapatas externas a ±2,8 m preservam equilíbrio e apoio.

## Bancada de testes

Execute o servidor e abra `http://localhost:5173/tests.html`.

```bash
npm install
npm run dev
```

A bancada principal mostra os seis cenários de foguetes BSS. Os ensaios de
outros componentes permanecem no código para regressão e evolução futura.

Os comandos da tela chamam operações públicas do domínio. Por exemplo, a
partida de um propulsor respeita elétrica → hidráulica → combustível → controle
→ ignição, tanto no modo manual quanto no automático.

A tensão nominal de alimentação é declarada por propulsor, em volts (28 V por
padrão). O propulsor só produz empuxo, calor e jato quando sua ignição está
confirmada e a cadeia entrega os recursos necessários. Perda de bateria, cabo,
linha, válvula, propelente ou integridade interrompe a operação no passo físico
correspondente.

O BSS-004 acrescenta duas pernas fixas e modos Decolagem/Pouso com controle
vertical fuzzy-PID. O BSS-005 amplia os tanques para 600 kg de CH4 e 2.400 kg
de O2, com motor idealizado de 120 kN e Isp de 350 s: a vazão nominal total é
34,96 kg/s. O Isp permanece constante com altitude; os 6 MW indicam um efeito
térmico simplificado, sem representar potência química total.

O BSS-006 acrescenta grid fins alimentadas pela elétrica e autorizadas pelo
controle. Antes da decolagem, um clique no solo define o alvo horizontal.
Durante a descida, gimbal e aletas solicitam forças e torque ao mesmo core;
o computador arbitra uma única autoridade por recurso. Sem motor há apenas
autoridade aerodinâmica disponível, dependente do fluxo de ar.

Os ensaios M2/M3 demonstram pousos de baixa altitude. **A missão de retorno de
15 km continua reprovada:** o perfil vertical esgota a reserva antes da
aproximação. Atingir 15 km na subida não qualifica o pouso. Resultados e
limitações estão em [M2](docs/validacoes/2026-10-11-bss005-m2.md),
[M3](docs/validacoes/2026-10-11-bss005-m3.md) e
[M4](docs/validacoes/2026-10-11-bss005-m4.md).

O trace dos BSS-004/005/006 mostra throttle, empuxo, efeito térmico, gimbal,
massa, altitude, velocidades, atitude e pressão dinâmica. Motores químicos
também mostram Isp efetivo (zero no gráfico indica ausência de vazão) e
delta-v **ideal restante**. A estimativa usa Tsiolkovsky, Isp nominal constante
e somente a massa que pode reagir em mistura CH4/O2 1:4; ignora perdas,
integridade e reserva de pouso. Não é uma previsão da altitude ou do retorno.
Os dados físicos mostram os bloqueios atuais do motor; não são um histórico
de causas de falha.

**Registrar trace** controla apenas o histórico de sinais. **Exportar ensaio**
salva JSON com configuração inicial, estados, entradas operacionais em ordem,
índice do passo de aplicação e `dt = 1/240 s`. O diário de entradas permanece
completo mesmo com trace desligado; sinais possuem janela de 6.000 amostras.
Para reproduzir, use a mesma revisão e fábrica do cenário, aplique as entradas
antes do passo indicado e avance o total de passos exportado. Cliques nos
botões são identificados pelo ID do controle; o alvo clicado é armazenado em
metros. O arquivo é um registro para ensaios, sem importador automático na
tela. Reset e seleção de cenário iniciam um novo diário; Play preserva os
comandos feitos antes da partida. Os cenários BSS não usam aleatoriedade.

## Desenvolvimento e validação

```bash
npm test
npm run typecheck
npm run build
```

Os testes são determinísticos e cobrem o núcleo físico, os vínculos, veículos,
propulsores, paraquedas e os cenários de regressão. A renderização não é fonte
de verdade física.

## Limites atuais

O núcleo atual resolve dinâmica estrutural no plano XY: usa rotação em torno do
eixo Z e inércia planar. A evolução para corpo rígido espacial completo exige
orientação 3D e tensor de inércia. Superfícies de contato ainda são planos; o
modelo atmosférico aproxima altitude geométrica por geopotencial e usa duas
camadas da atmosfera padrão, com densidade de referência configurável
(1,225 kg/m³ por padrão; zero declara vácuo). Acima de 20 km, o trecho
isotérmico é extrapolação sem qualificação; vento e gravidade são uniformes.

Arrasto, aletas e aquecimento por arrasto consultam a mesma densidade local.
A convecção ambiente usa `h_local = h_referencia × rho_local / 1,225` e
`Q = h_local × area × (T_objeto - T_ambiente) × dt`, limitada à energia de
equilíbrio térmico. O coeficiente é uma calibração concentrada, sem correlação
de Reynolds, Mach ou convecção forçada; a temperatura ambiente é um reservatório
uniforme configurável em °C (20 °C por padrão), independente da temperatura
usada no perfil hidrostático de densidade. O fluxo relativo entra no
aquecimento aerodinâmico pela parcela declarada de `-arrasto · velocidade_relativa`.
Vácuo elimina essas trocas com o ar ambiente; calor interno e jatos de gases
do próprio motor continuam possíveis. Radiação, distribuição espacial de calor,
química de alta temperatura e balanço energético integral dos jatos permanecem
fora deste modelo. A M4 não qualifica um modelo de reentrada.

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
