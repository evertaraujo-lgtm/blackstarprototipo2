# Black Star Space — Protótipo 2

O foco atual é a simulação dos foguetes BSS-001 a BSS-006:
decolagem manual, controle de inclinação e operação de subida e pouso.
Outros ensaios físicos continuam no código para regressão e evolução futura,
mas não aparecem na bancada principal.

Núcleo físico determinístico, bancada visual e primeira missão independente
para experimentar objetos, veículos e sistemas espaciais. O projeto é uma base TypeScript independente:
a bancada é apenas uma interface de observação e comando; o mesmo
`MundoFisico` é usado pela primeira cena do jogo.

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

## Terra esférica e ensaios orbitais M9

A bancada BSS-001–006 mantém o ambiente legado por padrão. O ambiente esférico
é explícito: `new MundoFisico(dt, { ambiente: new AmbienteTerrestre() })`.
Ele usa Terra estática, dinâmica estritamente XY, gravidade `-μr/|r|³`,
R=6.371.000 m e μ=3,986004418×10¹⁴ m³/s². O centro está em (0,-R,0);
posição/velocidade são inerciais e as leituras operacionais usam vertical e
tangente locais. g0=9,80665 m/s² continua sendo referência de Isp e não é
substituído pela gravidade superficial calculada (9,820250487 m/s²).

O link **Órbitas** na bancada abre `/orbitas.html`: corpo de prova inerte,
circular a 400 km ou elíptico e=0,1, em vácuo explícito. Clique Iniciar e
escolha 600× para observar uma volta em poucos segundos. Câmera/zoom só mudam
a apresentação; Exportar ensaio preserva condições iniciais e modelo.
É uma inicialização ADM para validar dois corpos, sem lançador, propulsão,
manobra de inserção ou BSS-007.

KDK gravitacional é opt-in no ambiente central; o legado conserva Euler.
Passos de até 1 s foram qualificados para os corpos inertes exteriores em
vácuo; sistemas ativos e contato da bancada continuam usando 1/240 s.
Forças operacionais/dissipativas mantêm discretização explícita. A suíte
mede energia, momento angular, apsides, período e dependência de dt; os
resultados estão no plano M9 e em `docs/validacoes/2026-10-12-m9-orbitas.json`.

`ReferencialFisico` centraliza altitude, velocidades, atitude/taxa locais,
transformações de âncora e arco no plano. `criarEstadoInicialLocal` gera
somente condições iniciais de ensaio; não reposiciona corpos em voo.
`FixadorEstrutural.liberar()` separa a topologia sem impulso artificial,
preservando os corpos no mundo; liberação e ruptura têm estados distintos.

Novos diários registram modelo, constantes, integração e atmosfera. Replay
rejeita modelo diferente; arquivos antigos sem versão física exigem
`permitirDiarioLegadoSemModelo: true` e são identificados como reexecuções
legadas, sem promessa de equivalência exata à revisão histórica.

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
orientação 3D e tensor de inércia. O ambiente central rejeita dinâmica fora de
XY e solo plano infinito; usa secção circular terrestre ou plataforma local
finita. Laboratórios legados preservam SuperficiePlano. Não há mudança de
inclinação orbital, longitude geográfica completa ou latitude real da base.

O perfil atmosférico de duas camadas permanece validado em 0–20 km, com
1,225 kg/m³ ao nível do mar por padrão (zero declara vácuo). No ambiente central
usa altitude radial e transição simplificada ao vácuo entre 20–25 km: não é
modelo da alta atmosfera. Legado preserva a extrapolação histórica. Ar/solo
são estáticos; vento/rajadas são vetores inerciais explícitos. Rotação terrestre
exige fase futura própria com superfície, fundações, ar e velocidades iniciais
coerentes, sem Coriolis fictício no inercial.

A campanha M9 compara os seis BSS sem mudar parâmetros. BSS-006 preserva o
repouso geométrico da bancada no perfil ensaiado, mas apoio bilateral contínuo
por 3 s permanece não qualificado nos dois ambientes. A penetração histórica
de ~34 mm, contingências M8-B e o retorno manual de 15 km continuam pendentes.
Não há qualificação de reentrada orbital, CFD ou lançador real.

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

## Primeira missão do jogo — M10

`/missao.html` opera **BSS006_VOO_EXPERIMENTAL**, sem carregar a bancada.
Prepare os sistemas, solicite ignição e inicie o avanço. O perfil seleciona
Pouso automaticamente aos 300 m; alvo lateral pode ser escolhido antes da
decolagem. Pausa, reinício, câmera, escalas, telemetria e exportação do diário
consultam a mesma missão que os testes automatizados. Torre visual e costa
não criam colisões; a plataforma é demarcada na superfície esférica existente.

A construção compartilhada está em `src/veiculos/DefinicaoBss006.ts` e
`MontagemBss.ts`. A bancada antiga e a missão usam os mesmos parâmetros,
objetos, sistemas e controladores. A missão mantém seu mundo privado e
oferece snapshots copiados/congelados à apresentação.

Execução sem navegador com as ferramentas TypeScript já instaladas:

```bash
npm run missao:executar -- --segundos 90 --alvo=34.7 --vento=5 --saida /tmp/bss006.json
npm run missao:executar -- --segundos 2 --sem-ignicao --saida /tmp/bss006-sem-ignicao.json
npm run missao:executar -- --replay /tmp/bss006.json --saida /tmp/bss006-replay.json
npm run typecheck:missoes
```

O orçamento de segundos encerra a coleta do CLI; não declara o voo encerrado
nem classifica o pouso. O executor genérico recebe uma porta de missão,
sem conhecer o veículo. `RegistroMissao` registra comandos por passo,
amostras e eventos; `reproduzirDiarioBss006` valida revisão, modelo físico,
condições iniciais e resultados antes de aceitar equivalência técnica.
A checagem `typecheck:missoes` compila o domínio sem tipos DOM/Node.

Repouso geométrico e apoio bilateral sustentado são observações separadas.
A experiência não homologa retorno de 15 km, reentrada ou missão orbital.
O plano e as evidências estão em
[docs/planos-codex/2026-10-13-m10-missoes-independentes.md](docs/planos-codex/2026-10-13-m10-missoes-independentes.md).

O replay estrito foi validado em voos completos no mesmo runtime Node. Na
comparação Chrome/Node, os estados físicos e eventos coincidiram, mas uma
amostra do período orbital estimado diferiu em cerca de 4,55 × 10⁻¹³ s.
A comparação estrita rejeita essa diferença; igualdade bit a bit entre
engines JavaScript distintas permanece fora da qualificação atual.
