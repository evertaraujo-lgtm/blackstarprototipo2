# RE-001 — laboratório de reentrada atmosférica

## CONTRATO DE IMPACTO FUNCIONAL

Registro anterior à primeira alteração de produção. Complexidade: 9/10.
Objetivo: bancada ADM XY de orbitador, atmosfera até 120 km, aerodinâmica e
aquecimento preliminares, rolagem prescrita, controle e supervisão de pouso.
Não há deploy, dependência de outro checkout ou qualificação de voo.

### Contratos existentes reutilizados

- `src/physics/MundoFisico.ts`: `constructor(maxDtS?: number, configuracao?: ConfiguracaoMundoFisico)`, `registrarObjeto(objeto: Objeto): void`, `registrarFixador(fixador: FixadorEstrutural): void`, `registrarSuperficie(superficie: SuperficieFisica): void`, `avancar(deltaS: number): void`, `obterCondicoesAtmosfericas(objeto: Objeto): CondicoesAtmosfericas`, `obterCargasAerodinamicas(objetos: readonly Objeto[], referenciaM: Vetor3): {forcaN: Vetor3; torqueNm: Vetor3}`: único proprietário de cinemática, contatos, gravidade e integração.
- `src/physics/ambiente/AmbienteFisico.ts`: `AmbienteTerrestre.constructor(centroM?: Vetor3)`, referencial esférico e campo central. `src/physics/ambiente/EstadoInicialLocal.ts::criarEstadoInicialLocal(ref: ReferencialFisico, c: CondicoesIniciaisLocais): EstadoFisico`: somente inicialização ADM.
- `src/physics/objetos/componentes/AletaAerodinamica.ts`: construtor, `solicitarDeflexaoRad(valorRad: number): void`, `prepararPassoOperacional(dtS: number): void`, getters de comando/deflexão. Atuador elétrico real, energia finita e limites de taxa; especialização somente das cargas do flap.
- `src/physics/objetos/base/Objeto.ts`: `getEstadoFisico(): EstadoFisico`, propriedades de massa/inércia/integridade, `aplicarAquecimentoAerodinamicoPeloCore(energiaJ: number, dtS: number): void`: dano e balanço térmico concentrado compartilhados.
- `src/physics/conexoes/FixadorEstrutural.ts`: construtor, `liberar(): boolean`, `estaAtivo`: montagem rígida e separação física. `Bateria`, `ConexaoEletrica`: alimentação dos flaps sem fonte visual exposta.
- `src/physics/sensores/SensoresVeiculoComposto.ts`: sensores e leituras SI pelo referencial do mundo.
- `src/physics/sistemas de controle/GerenciadorDeControladores.ts`: registro/habilitação/desabilitação e `calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[]`: arbitragem única; ampliação apenas da união de recursos para flap/rolagem virtual.
- `ControladorPousoDePropulsores`/`ControladorPouso`: porta existente registrada e inicialmente desabilitada; só habilitada mediante todos os critérios do supervisor e integração propulsiva disponível. Nenhum motor fictício.
- `src/missoes/RegistroMissao.ts`: construtor/decorador, `receberComando`, `avancarPasso`, `exportar`: agenda de comandos, amostras e eventos reproduzíveis. `copiarSnapshot`, `InstanciaMissao`, `ExecutorPassoFixo`, `CameraFisica2D`: isolamento, tempo fixo e observação.

### Contratos existentes a alterar

- `SistemaAtmosferico.constructor(..., perfil?: PerfilAtmosferico)`: injetar perfil opcional; `obterDensidadeArKgM3(altitudeM: number): number`: delegar somente quando configurado. Casos anteriores conservam equações/ordem numérica.
- `MundoFisico.constructor(...)`: encaminhar perfil opcional; `obterConfiguracaoFisica(): object`: registrar revisão do perfil quando presente.
- `Objeto.obterPotenciaAquecimentoAerodinamicoW(condicoes: CondicoesAtmosfericas, potenciaDissipadaW: number): number`: novo hook puro com comportamento padrão idêntico à fração histórica. `SistemaTermico.atualizar(objetos: readonly Objeto[], dtS: number): void`: consumir hook uma vez e validar balanço `0 <= calor <= dissipação`; mantém aplicação pelo core.
- `vite.config.ts`: entrada MPA adicional; navegação HTML pública e verificação de recursos incluem `/reentrada.html`.
- `src/physics/objetos/veiculos/ComputadorDeVoo.ts::aplicarSolicitacoesDeControladores(dtS: number): void`: filtrar explicitamente recurso gimbal, para que o consumidor propulsivo não interprete novos recursos flap/rolagem como gimbal. Preservar throttle/gimbal e suas regressões.

### Funções novas previstas

As assinaturas completas, efeitos e dependências ficarão também nos JSDoc e no
catálogo AST gerado, incluindo auxiliares adicionados durante a implementação.

- `src/physics/ambiente/PerfilAtmosfericoReentrada.ts`: interface `PerfilAtmosferico.obterDensidadeKgM3(altitudeM: number): number`, `obterConfiguracao(): object`; `PerfilAtmosfericoReentrada.amostrar(altitudeM: number): AmostraAtmosferaReentrada`: perfil contínuo documentado, velocidade do som aproximada e indicador de rarefação, sem estado mutável.
- `src/physics/objetos/componentes/RolagemVirtual.ts::RolagemVirtual`: `solicitar(anguloRad: number, tempoS: number): void`, `avancar(dtS: number): void`, `definirDisponibilidade(disponivel: boolean): void`, `observar(): EstadoRolagemVirtual`. Muda somente variável prescrita, nunca atitude XY.
- `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::avaliarAerodinamica(...)`: coeficientes analíticos preliminares, L/D, CP e fluxo térmico indicador. Nenhuma integração.
- `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada`: hooks de arrasto/sustentação/CP/aquecimento e consulta do modelo. `FlapReentrada`: herda atuador Aleta e especializa força/arrasto/aquecimento, dependentes do fluxo e integridade.
- `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada`: habilitar/desabilitar, configurar alvos, calcular solicitações por telemetria, q e limites; anti-saturação sem escrita cinemática.
- `src/physics/sistemas de controle/SupervisorReentrada.ts::SupervisorReentrada`: avaliar critérios e transferir posse exclusivamente pela arbitragem, com diagnóstico por requisito; falhas bloqueiam transição.
- `src/cenarios/EnsaioReentrada.ts`: `criarEnsaioReentrada(configuracao?: Partial<ConfiguracaoReentrada>): EnsaioReentrada`, montagem de corpos e vínculos, `InstanciaMissao` com comandos/observações/eventos e `RegistroMissao`; `reproduzirEnsaioReentrada(diario: DiarioReentrada)`: valida configuração/revisão/agenda e compara resultado, sem relógio/DOM.
- `src/reentrada.ts` e `src/apresentacao/reentrada/RenderizadorReentrada.ts`: configuração, controles, gráficos, câmera/réguas e exportação/importação; estado físico somente consultado em snapshots. Arquivos de smoke e testes não integram física própria.

Nenhuma função removida. Não criar RCS, terceira rotação, integração paralela ou
correções de trajetória na interface. Pouso pode permanecer bloqueado por falta
de propulsão/RCS; continuidade da observação não depende de sucesso do ensaio.

### Invariantes e aceitação

SI internamente; temperatura dos materiais em °C. Passo fixo máximo 1/240 s;
gravidade central KDK compartilhada, forças dissipativas explícitas. Semente
registrada, sem aleatoriedade neste marco. Vácuo explícito. Sustentação normal
ao fluxo, projetada por cos(phi), sem compensação lateral. Arrasto aplicado
uma vez pelo core, aquecimento uma vez pelo SistemaTermico. Massa de cada
módulo é registrada no mundo e vínculos usam a ilha estrutural compartilhada.

Operador definiu início de degradação provisório: orbitador 1100 °C; flaps
900 °C. Ambos são padrão configurável avançado e registrados no diário.
Não representam qualificação de material nem limites internos de atuadores.
TPS, estrutura interna e componentes térmicos separados permanecem extensão.
Bateria: operador definiu 60 °C, independente e editável no painel avançado;
não é temperatura de fuga térmica, limite certificado ou falha catastrófica.
A bateria não recebe arrasto/convecção externa nem condução através da fixação;
seu consumo elétrico não é convertido em calor interno não modelado. O dano
por energia térmica recebida usa o mecanismo progressivo existente de Objeto.

Testes: os 12 grupos solicitados (inicialização, referencial, energia no vácuo,
L/D nulos, projeção 0/60/90 e simetria, taxa, autoridade, controle sem escrita,
balanço único, supervisor/falhas, hipersônico/replay), dano térmico/impacto,
perda elétrica e ruptura. Rodar regressões, typechecks, build, auditoria
documental, recursos e smoke desktop/mobile com avanço efetivo da simulação.

## Evidências e relatório final

### Funcionalidades e modelos

Página `/reentrada.html`, links dos simuladores e portal, configuração inicial
editável, painel avançado de limiares/corredor/transferência, controle manual ou
automático, pausa, avanço de 1 s, escala temporal com dívida preservada,
reinicialização, zoom, câmera acompanhando e escalas X/Y em metros.
Telemetria distingue estado, solicitação e variável virtual; gráficos exibem
altitude, velocidade, q, fluxo térmico e temperaturas. Exportação usa
RegistroMissao, incluindo comandos, eventos, amostras, semente, identificação
e revisão dos modelos. Replay estrito é fornecido em TypeScript, no mesmo
runtime; não há promessa de igualdade bit a bit entre engines distintas.

Um corpo de 78.900 kg, dois flaps de 500 kg e bateria interna de 100 kg formam
80.000 kg quando conectados. Geometria preliminar: corpo 40 × 8 × 16 m;
flaps 4 × 2 × 8 m, a ±16 m e −5 m locais. Esses valores são hipóteses do
ensaio, não especificações validadas do orbitador Black Star. Fixadores usam
resistência nominal de 100 MN; corpo 100 MJ e flaps 1 MJ de resistência ao
impacto. Massa, CM e inércia efetivos são os da ilha rígida existente.
Fonte e cabos internos são enclausurados, sem remoção física ou de massa.

Atmosfera `re-atmosfera-log-1`: âncoras arredondadas inspiradas na
[US Standard Atmosphere 1976, NASA-TM-X-74335](https://ntrs.nasa.gov/citations/19770009539).
Interpolação linear de log(rho) e temperatura cinética entre 0–200 km,
contínua C0. Não é reprodução integral do padrão: aproxima altitudes
geopotenciais por geométricas e ignora composição variável/atividade solar.
A cauda acima de 200 km usa H=50 km e temperatura constante e é identificada
como fora do domínio; abaixo do nível do mar usa condição do nível do mar.
Não há corte físico de atmosfera aos 25 km. Vácuo exige configuração explícita.

Mach usa gás ideal com γ=1,4/R=287,05287 J/(kg·K); temperatura cinética em °C
é convertida somente para esta relação do gás, nunca para limites materiais.
Kn usa lambda*rho=6,6e−8×1,225 kg/m² e comprimento 8 m: indicador aproximado,
com regimes contínuo (<0,01), deslizamento (<0,1), transição (<10), molecular.
Ao iniciar em 120 km o modelo identifica transição, sem alegar validade de
aerodinâmica contínua nessa condição. Não há DSMC ou correção rarefeita validada.

Coeficientes do corpo são hipóteses analíticas, sem tabela atribuída a dados
do veículo: `Cl=0,9 sin(2α)(0,85+0,15 M/(1+M))×integridade`;
`Cd=0,12+1,6 sin²α+0,08 exp(-((M-1)/0,7)²)`. S=250 m². CP varia de
−0,15 a −0,5 m longitudinalmente, e forças aplicadas nesse CP geram torque
pelo core. Flaps: `Cl=1,2 sin(delta)×integridade`, S=16 m² por flap;
`Cd=0,06+0,4 sin²(delta)`. O atuador Aleta conserva energia/curso/taxa reais.
Curso ±30°, taxa 20°/s, potência de movimento 300 W e repouso 6 W por flap;
bateria ideal 28 V/20 MJ, sem fonte infinita.

L e D usam qSCl/qSCd, q=ρV²/2, e fluxo relativo real. O core aplica D uma
única vez; o hook especializado retorna apenas lift. Todos os termos de lift,
inclusive dos flaps conectados, usam cos(phi). A componente lateral Lsin(phi)
é apenas informada e não entra na integração. Rolagem prescrita tem curso
±90°/taxa 10°/s, histórico e disponibilidade. Não é dinâmica de torque 3D.

O controlador PD calcula torque solicitado por erro de α e taxa relativa ao
fluxo, compensa torque passivo, converte em comandos opostos dos flaps e
declara saturação/perda de autoridade. O corredor é heurístico: excesso de
q/fluxo/carga pede α pelo menos 55° e bank zero; não garante corredor seguro.
Não existe RCS implementado. Em rarefação/vácuo, falta autoridade real para
manter atitude; nenhuma escrita de orientação compensa isso.

O supervisor verifica altitude, velocidade, atitude vertical, trajetória,
sensores/finitude, integridade, propulsão e integração com o pouso. Manual e
automático compartilham critérios e arbitragem. O adaptador existente de
ControladorPouso está registrado, desabilitado e sem motores. Assim, RE-001
declara bloqueio verificável por ausência de propulsão e integração compatível.
Testes com portas simuladas comprovam a exclusão de posse e falhas; não
constituem demonstração de pouso real do orbitador.

O indicador térmico usa a forma Sutton–Graves `k sqrt(rho/Rn) V³`, k adotado
1,7415e−4 SI, limitado ao fluxo cinético incidente `rho V³/2`.
A relação de ponto de estagnação é uma aproximação inspirada em
[Sutton e Graves, NASA TR R-376](https://ntrs.nasa.gov/citations/19720003329);
o uso distribuído/rarefeito e as áreas efetivas deste ensaio são hipóteses.
Rn=2 m/área aquecida 80 m² no corpo; 0,5 m/2 m² em cada flap.
Transferência efetiva é `min(fluxo×área, D·V)` para cada corpo, substituindo a
fração histórica, nunca somando a ela. SistemaTermico aplica energia uma vez,
e Objeto evolui temperatura/integridade. Calor específico do corpo 800 J/(kg·°C);
flaps/bateria usam a capacidade concentrada padrão de 500 J/(kg·°C).
A convecção ambiente mantém o reservatório uniforme existente de 20 °C,
escalado por densidade, com h=10 W/(m²·°C) de referência; não representa uma
camada limite hipersônica. A bateria tem h=0 e nenhuma exposição aero.

Dissipação D·V, potência recebida, parcela restante no ar e calor acumulado
são apresentados separadamente. A energia dissipada acumulada é quadratura
antes de cada passo, coerente com a amostragem térmica; não é um balanço
energético integral exato da integração dissipativa. Sem radiação, ablação,
química, distribuição térmica, calor dos atuadores ou TPS/estrutura separados.
Os limiares não certificam materiais nem temperaturas admissíveis internas.

### Validações executadas

| Verificação | Resultado observado |
|---|---|
| Suíte específica RE-001 | 36 testes aprovados; inicialização/referencial, vácuo/energia, projeção de bank, taxa, autoridade, controles sem escrita cinemática, aquecimento único, falhas, bateria, impacto e replay |
| Typecheck geral e sem DOM | Aprovados; `tsconfig.missoes.json` inclui a fábrica RE |
| Build MPA | Sete HTMLs compilados, incluindo `/reentrada.html` |
| Auditoria documental | Presença e vínculo de contratos em 1.573 funções de produção, sem lacunas; isso não certifica aprovação semântica |
| Smoke RE desktop/mobile | Aprovado em 1.440 e 390 px: avanço físico, pausa, manual, bank limitado, perda elétrica, bloqueio de pouso, dano, bateria/configuração e exportação; sem erros de console/HTTP ou overflow |
| Smoke anterior do site/simuladores | Aprovado: institucional, PDF, bancada, missão/amerissagem e órbitas, inclusive mobile; 404 reais preservados |
| Recursos da distribuição | Verificador anterior aprovado para seis páginas históricas e suas referências, incluindo link da nova bancada; smoke próprio cobre o sétimo HTML e seus módulos |
| Suíte completa de regressão | 589 casos executados em 86 arquivos: 586 aprovados na execução concorrente; três timeouts históricos passaram isoladamente, com um worker e os mesmos limites/expectativas. Todos os 589 casos têm resultado aprovado; a execução concorrente original permanece registrada com falhas de tempo |

O primeiro smoke detectou incompatibilidade min/step da altitude no HTML; a
configuração padrão foi corrigida e o smoke foi repetido com avanço real.
A tentativa inicial da suíte completa em ambiente restrito foi interrompida
após bloqueio de subprocessos; a execução com permissões locais apropriadas
é a referência final, sem modificação de testes históricos ou de expectativas.

A execução concorrente com permissões locais apresentou três timeouts. A
repetição serial selecionou somente esses três casos; os outros 22 casos dos
dois arquivos foram ignorados nessa repetição porque já haviam passado na
suíte completa. Nenhuma asserção, timeout ou teste histórico foi alterado.

| Caso repetido | Limite existente | Duração isolada | Resultado |
|---|---|---|---|
| BSS-005 — toque seguro versus repouso bilateral | 360 s | 124,69 s | Aprovado |
| Comparação M9 BSS-003 — decolagem/apogeu/retorno | 180 s | 50,52 s | Aprovado |
| Comparação M9 BSS-006 — falha elétrica/queda/dano | 120 s | 50,34 s | Aprovado |

A queda de duração ao remover concorrência indica contenção de recursos na
execução completa. Preservação das experiências anteriores foi verificada
pelos resultados dos 553 casos históricos e pelos smokes anteriores do site,
bancada, missão/amerissagem e órbitas. Isso não qualifica os modelos novos.

**Ensaio numérico nominal de 600 s (144.000 passos):** estados amostrados
finitos e calor absorvido não superior à dissipação integrada. Amostras a cada
10 s: q máximo 1.314,99 Pa; indicador térmico máximo 360.187,59 W/m²; carga
máxima 0,49163 g₀; temperatura máxima amostrada do corpo 138,95 °C.

O resultado **não é uma reentrada bem-sucedida**: os flaps excedem 900 °C perto
de 369 s, degradam progressivamente e atingem integridade zero por volta de
405 s. Aos 600 s, estão próximos de 1.504–1.505 °C e o controlador está em
falha/sem disponibilidade dos flaps. O corpo mantém integridade 1, a bateria
fica em 20 °C/integridade 1, e o supervisor permanece na fase reentrada, com
transferência para pouso bloqueada. O veículo está a 77.181,07 m e 7.247,17 m/s.
Não houve redução artificial de temperatura, recuperação de integridade ou
pouso fabricado. As condições nominais atuais precisam de revisão de engenharia.

Evidências: `docs/validacoes/reentrada/ensaio-600s.json`, `testes.json`,
`testes-reentrada.json`, `regressoes-isoladas.json`, `smoke.json`, diários do navegador e capturas desktop/mobile.
O ensaio de 600 s foi repetido após consolidar as revisões/limites e eventos.

### Decisões para revisão

O registro [RE001-DECISOES-PENDENTES.md](RE001-DECISOES-PENDENTES.md) separa
instruções expressamente aprovadas dos 12 itens provisórios de engenharia,
com alternativas, justificativas, riscos e arquivos afetados. A autonomia
excepcional termina nesta execução. Testes/commit não aprovam esses itens;
AGENTS.md permaneceu intacto e nenhum deploy foi executado.

### Limitações e próxima etapa

- Obter geometria, distribuição de massa, polar aerodinâmica e incertezas do veículo.
- Substituir forças fora do contínuo por modelo rarefeito apropriado e validar a atmosfera contra dados/tabelas de referência completos.
- Modelar RCS com propelente/energia/torques reais para autoridade de alta altitude.
- Qualificar esforços aerodinâmicos distribuídos e dano por sobrecarga dos vínculos; o marco usa as rupturas de contato do core e separação operacional, sem declarar resistência aeroestrutural validada. Flap separado conserva seu lift/drag e a última projeção virtual; rolagem própria de destroços permanece fora de XY.
- Separar TPS, estrutura, bateria e atuadores térmicos; obter propriedades materiais, radiação e ablação.
- Instalar cadeia propulsiva, sensores/atuadores de pouso e adaptar os limites antes de autorizar uma transferência física.
- Calibrar/avaliar a heurística de guiagem e o corredor; trajetória atual não é solução ótima ou segura demonstrada.
- Visualização amplia o símbolo do veículo quando necessário e identifica a ampliação; réguas e Terra conservam a escala do mundo.

O ensaio de 600 s é uma janela de coleta headless. Não encerra o cenário da
interface, não comprova reentrada completa e não declara sucesso/pouso.

### Arquivos desta entrega

Manifesto dos 43 arquivos alterados/adicionados nesta execução, incluindo
relatórios gerados e evidências locais. Nenhum arquivo do legado ou `AGENTS.md`.

- `README.md`
- `docs/arquitetura/CATALOGO_DE_FUNCOES.md`
- `docs/arquitetura/MAPA_DO_SISTEMA.md`
- `docs/arquitetura/inventario-funcoes.json`
- `docs/planos-codex/2026-10-17-reentrada.md`
- `docs/planos-codex/RE001-DECISOES-PENDENTES.md`
- `docs/validacoes/reentrada/diario-smoke-1440.json`
- `docs/validacoes/reentrada/diario-smoke-390.json`
- `docs/validacoes/reentrada/ensaio-600s.json`
- `docs/validacoes/reentrada/reentrada-1440.png`
- `docs/validacoes/reentrada/reentrada-390.png`
- `docs/validacoes/reentrada/regressoes-isoladas.json`
- `docs/validacoes/reentrada/smoke.json`
- `docs/validacoes/reentrada/testes-reentrada.json`
- `docs/validacoes/reentrada/testes.json`
- `missao.html`
- `orbitas.html`
- `package.json`
- `reentrada.html`
- `scripts/smoke-reentrada.ts`
- `scripts/validar-reentrada.ts`
- `site/pages/simulador.html`
- `src/apresentacao/reentrada/RenderizadorReentrada.ts`
- `src/cenarios/EnsaioReentrada.test.ts`
- `src/cenarios/EnsaioReentrada.ts`
- `src/physics/MundoFisico.ts`
- `src/physics/ambiente/PerfilAtmosfericoReentrada.ts`
- `src/physics/objetos/base/Objeto.ts`
- `src/physics/objetos/componentes/FlapReentrada.ts`
- `src/physics/objetos/componentes/RolagemVirtual.ts`
- `src/physics/objetos/veiculos/ComputadorDeVoo.ts`
- `src/physics/objetos/veiculos/OrbitadorReentrada.ts`
- `src/physics/reentrada/ModeloAerodinamicoReentrada.ts`
- `src/physics/sistemas de controle/ControladorReentrada.ts`
- `src/physics/sistemas de controle/GerenciadorDeControladores.ts`
- `src/physics/sistemas de controle/SupervisorReentrada.ts`
- `src/physics/solucionadores/SistemaAtmosferico.ts`
- `src/physics/solucionadores/SistemaTermico.ts`
- `src/reentrada.css`
- `src/reentrada.ts`
- `tests.html`
- `tsconfig.missoes.json`
- `vite.config.ts`

<!-- IMPACTO_FUNCOES_INICIO -->
## Inventário final de impacto por função

Complementa o contrato registrado antes da implementação. Assinaturas são as do inventário AST; retornos extensos de snapshots usam aliases equivalentes. Dependências/escritas abaixo são evidências estáticas, não certificação de cobertura ou aprovação de engenharia. Os contratos completos permanecem no catálogo e JSDoc. Nenhuma função foi removida.

### Alterada: `src/physics/MundoFisico.ts::MundoFisico.constructor:Constructor`

- **Assinatura:** `(maxDtS?: number, configuracao?: ConfiguracaoMundoFisico): MundoFisico`.
- **Responsabilidade, condições e efeitos:** Compõe registros, ambiente, integração e solucionadores determinísticos; configura água somente quando regiões são declaradas. maxDtS em s positivo/finito; densidade kg/m³ não negativa (zero = vácuo), vento m/s, temperatura °C. Legado plano/Euler por padrão; central usa KDK e restringe XY. Perfil atmosférico opcional é injetado no solucionador compartilhado, sem alterar padrões anteriores. Instala callbacks de consulta/reação, sem depender de relógio real.
- **Dependências diretas (AST):** `Map`, `IntegradorFisico`, `ResolvedorEsforcoEstrutural`, `Number.isFinite`, `Error`, `AmbientePlano`, `this.validarVetorPlanar`, `[...(configuracao.rajadasVento ?? [])].sort`, `[rajada.velocidadeAdicionalMps.x, rajada.velocidadeAdicionalMps.y, rajada.velocidadeAdicionalMps.z].every`, `SistemaAtmosferico`, `SistemaHidrodinamico`, `SistemaTermico`, `SistemaSensores`, `ResolvedorColisoes`, `ResolvedorContatoSuperficie`.
- **Escritas diretas (AST):** `this.maxDtS`, `this.ambiente`, `this.integracao`, `this.objetos`, `this.superficies`, `this.fixadores`, `this.chumbadoresAoSolo`, `this.guiasLineares`, `this.juntasRotacionaisDeBancada`, `this.conjuntosEstruturais`, `this.forcasPendentes`, `this.impulsosPendentes`, `this.tempoMissaoS`, `this.densidadeAtmosfericaNivelMarKgM3`, `this.velocidadeArBaseMps`, `this.rajadasVento`, `this.velocidadeArAtualMps`, `this.atmosfera`, `this.integrador`, `this.sistemaTermico`, `this.resolvedorEsforcoEstrutural`, `this.resolvedorColisoes`, `this.resolvedorContatoSuperficie`, `this.sistemaSensores`, `this.hidrodinamica`, `this.perfilAtmosferico`.
- **Contrato:** [f-518ff75ab4b7f057](../arquitetura/CATALOGO_DE_FUNCOES.md#f-518ff75ab4b7f057).

### Alterada: `src/physics/MundoFisico.ts::MundoFisico.obterConfiguracaoFisica:MethodDeclaration`

- **Assinatura:** `(): object`.
- **Responsabilidade, condições e efeitos:** Exporta identificação do ambiente, integração, dt máximo, atmosfera e água declarada para diários/replay; inclui a revisão completa do perfil atmosférico somente quando injetado. Não altera parâmetros.
- **Dependências diretas (AST):** `this.ambiente.obterConfiguracao`, `this.perfilAtmosferico.obterConfiguracao`, `this.hidrodinamica.obterConfiguracao`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-d3dca202d77d15ec](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d3dca202d77d15ec).

### Nova: `src/physics/objetos/base/Objeto.ts::Objeto.obterPotenciaAquecimentoAerodinamicoW:MethodDeclaration`

- **Assinatura:** `(_condicoes: CondicoesAtmosfericas, potenciaDissipadaW: number): number`.
- **Responsabilidade, condições e efeitos:** Potência W transferida ao corpo a partir da dissipação no ar W. O padrão preserva a fração histórica; especializações retornam uma única parcela, limitada à dissipação pelo SistemaTermico. Consulta pura; aplicação só pelo core.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-8a36fd8decc22230](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8a36fd8decc22230).

### Alterada: `src/physics/objetos/veiculos/ComputadorDeVoo.ts::ComputadorDeVoo.aplicarSolicitacoesDeControladores:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade, condições e efeitos:** Limpa diagnóstico aplicado e verifica alimentação elétrica/controle. Perda de energia reinicia memórias; leitura inválida/obsoleta reinicia controles, solicita throttle zero e mantém alvo do gimbal no ângulo atual. Caso válido arbitra pedidos, filtra motores operacionais, limita gimbal e registra apenas comandos aceitos. Consome explicitamente throttle/gimbal; demais recursos pertencem a outros consumidores. Não integra forças ou cinemática.
- **Dependências diretas (AST):** `[...this.propulsores.values()].some`, `this.propulsores.values`, `this.gerenciador.reiniciarControladores`, `this.telemetriaDoCasco.obterLeituras`, `this.gerenciador.calcularSolicitacoes`, `propulsor.definirThrottle`, `propulsor.obterEstadoDaVetorizacao`, `propulsor.solicitarVetorizacao`, `this.gerenciador.obterUltimaArbitragem`, `this.propulsores.get`, `propulsor?.sistemaEstaOperacional`, `propulsor.sistemaEstaOperacional`, `this.obterPropulsor(solicitacao.idAtuador).definirThrottle`, `this.obterPropulsor`, `aplicadas.push`, `this.solicitarGimbalLimitado`.
- **Escritas diretas (AST):** `this.solicitacoesAplicadas`, `this.estavaAlimentado`.
- **Contrato:** [f-2a19b873c05a47a3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2a19b873c05a47a3).

### Alterada: `src/physics/solucionadores/SistemaAtmosferico.ts::SistemaAtmosferico.constructor:Constructor`

- **Assinatura:** `(densidadeArNivelMarKgM3: number, velocidadeArMps: Vetor3, referencial?: ReferencialFisico, politicaAltitude?: "extrapolacao-legada" | "vacuo-simplificado-25km", exposicaoAoAr?: (o: Objeto) => number, perfil?: PerfilAtmosferico | undefined): SistemaAtmosferico`.
- **Responsabilidade, condições e efeitos:** Configura densidade de referência kg/m³ não negativa, vento m/s, referencial e política de altitude; densidade zero declara vácuo. Perfil injetado é opcional e substitui a equação de densidade somente nesse mundo; sua revisão deve ser exportada pelo consumidor.
- **Dependências diretas (AST):** `Number.isFinite`, `Error`.
- **Escritas diretas (AST):** `this.densidadeArNivelMarKgM3`, `this.referencial`, `this.politicaAltitude`, `this.exposicaoAoAr`, `this.perfil`, `this.velocidadeArAtualMps`.
- **Contrato:** [f-6538ff18b9c53fb0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6538ff18b9c53fb0).

### Alterada: `src/physics/solucionadores/SistemaAtmosferico.ts::SistemaAtmosferico.obterDensidadeArKgM3:MethodDeclaration`

- **Assinatura:** `(altitudeM: number): number`.
- **Responsabilidade, condições e efeitos:** Densidade kg/m³ pela altitude geométrica m, escalada pela referência ao nível do mar. Perfil opt-in substitui somente este cálculo; ausência preserva as equações/política históricas. Vácuo explícito tem precedência sobre o perfil.
- **Dependências diretas (AST):** `Number.isFinite`, `Error`, `this.perfil.obterDensidadeKgM3`, `Math.max`, `SistemaAtmosferico.calcularDensidadePadrao`, `Math.min`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-9f2bc0b195591180](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9f2bc0b195591180).

### Alterada: `src/physics/solucionadores/SistemaTermico.ts::SistemaTermico.atualizar:MethodDeclaration`

- **Assinatura:** `(objetos: readonly Objeto[], dtS: number): void`.
- **Responsabilidade, condições e efeitos:** Geração interna, convecção ambiente, aquecimento aero e jatos em ordem determinística, dt em s do core. O hook aero devolve uma única parcela W limitada à dissipação D·V; o padrão preserva a fração histórica. Especializações não aplicam calor por conta própria. Energia entra em Objeto uma vez por troca.
- **Dependências diretas (AST):** `objeto.obterPotenciaTermicaGeradaW`, `objeto.aplicarEnergiaTermicaPeloCore`, `this.atmosfera.obterDensidadeNaPosicaoKgM3`, `objeto.getEstadoFisico`, `this.exposicaoAoAr`, `Math.abs`, `Math.sign`, `Math.min`, `objeto.getEstadoFisico().velocidadeMps.subtrair`, `this.atmosfera.calcularArrasto`, `Math.max`, `forcaArrastoN.produtoEscalar`, `objeto.obterPotenciaAquecimentoAerodinamicoW`, `Number.isFinite`, `Error`, `objeto.aplicarAquecimentoAerodinamicoPeloCore`, `fonte.obterJatoTermico`, `fonte.getEstadoFisico`, `alvo.getEstadoFisico().posicaoM.subtrair`, `alvo.getEstadoFisico`, `vetor.produtoEscalar`, `Math.cos`, `alvo.aplicarEnergiaTermicaPeloCore`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-52ff1b5ad0ab53a2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-52ff1b5ad0ab53a2).

### Nova: `scripts/smoke-reentrada.ts::executarSmokeReentrada:FunctionDeclaration`

- **Assinatura:** `(): Promise<void>`.
- **Responsabilidade, condições e efeitos:** Exercita dist real em desktop/mobile: controles, avanço, pausa, modo manual, bank limitado, perda elétrica, bloqueio de pouso, dano térmico e exportação. Escreve evidências locais; sem deploy ou mutação direta da física no navegador.
- **Dependências diretas (AST):** `resolve`, `mkdirSync`, `preview`, `servidor.httpServer.address`, `chromium.launch`, `browser.newPage`, `page.on`, `assert.equal`, `(await page.goto(base + '/simulador', { waitUntil: 'networkidle' }))!.status`, `page.goto`, `page.locator('a[href="/reentrada.html"]').click`, `page.locator`, `page.waitForSelector`, `assert.match`, `page.title`, `page.locator('#re-limite-corpo').inputValue`, `page.locator('#re-limite-flaps').inputValue`, `page.locator('#re-limite-bateria').inputValue`, `page.locator('#re-altitude').inputValue`, `page.locator('#re-velocidade').inputValue`, `assert`, `page.locator('#re-config').evaluate`, `page.evaluate`, `page.click`, `page.waitForFunction`, `page.locator('#re-tempo-real').textContent`, `page.waitForTimeout`, `page.selectOption`, `page.fill`, `page.locator('#re-mensagem').textContent`, `page.screenshot`, `page.locator('summary').filter({ hasText: 'Falhas de ensaio' }).click`, `page.locator('summary').filter`, `Promise.all`, `page.waitForEvent`, `download.saveAs`, `JSON.parse`, `readFileSync`, `diario.entradas.some`, `page.locator('summary').filter({ hasText: 'Configuração avançada' }).click`, `verificacoes.push`, `page.close`, `assert.deepEqual`, `writeFileSync`, `JSON.stringify`, `console.log`, `browser.close`, `Promise`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-4fe97b4e82bb0961](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4fe97b4e82bb0961).

### Nova: `scripts/validar-reentrada.ts::validarReentrada:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Coleta 600 s do RE-001 nominal com o mesmo core/controle da tela. Verifica finitude e balanço térmico de quadratura; não qualifica aerodinâmica/reentrada. Escreve amostras/eventos e identificação em evidência JSON local, sem deploy.
- **Dependências diretas (AST):** `criarEnsaioReentrada`, `ensaio.iniciar`, `ensaio.observar`, `ensaio.avancarPasso`, `assert`, `[o.altitudeM, o.velocidadeMps, o.temperaturaC, o.cargaG, o.estado.orientacaoRad.z,
    o.estado.velocidadeAngularRadps.z, o.energiaAbsorvidaJ].every`, `amostras.push`, `console.log`, `o.tempoS.toFixed`, `o.altitudeM.toFixed`, `o.velocidadeMps.toFixed`, `ensaio.exportar`, `Math.max`, `amostras.map`, `ensaio.obterEventos`, `resolve`, `mkdirSync`, `writeFileSync`, `JSON.stringify`.
- **Escritas diretas (AST):** `i`.
- **Contrato:** [f-9e0ba414efcfb974](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9e0ba414efcfb974).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.constructor:Constructor`

- **Assinatura:** `(canvas: HTMLCanvasElement, graficos: HTMLCanvasElement): RenderizadorReentrada`.
- **Responsabilidade, condições e efeitos:** Recebe superfícies de desenho; nunca cria ou modifica um corpo físico.
- **Dependências diretas (AST):** `canvas.getContext`, `graficos.getContext`.
- **Escritas diretas (AST):** `this.canvas`, `this.graficos`, `this.ctx`, `this.grafico`.
- **Contrato:** [f-9bdbc3539c49fc5c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9bdbc3539c49fc5c).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.dimensionar:MethodDeclaration`

- **Assinatura:** `(canvas: HTMLCanvasElement): void`.
- **Responsabilidade, condições e efeitos:** Redimensiona pixels lógicos à tela; física e dimensões SI não são alteradas.
- **Dependências diretas (AST):** `Math.max`, `Math.round`.
- **Escritas diretas (AST):** `canvas.width`, `canvas.height`.
- **Contrato:** [f-06c59a50a7238277](../arquitetura/CATALOGO_DE_FUNCOES.md#f-06c59a50a7238277).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenhar:MethodDeclaration`

- **Assinatura:** `(o: ObservacaoReentrada, historico: readonly ObservacaoReentrada[], metrosPorPixel: number): void`.
- **Responsabilidade, condições e efeitos:** Câmera centrada no corpo, Terra curva e réguas graduadas globais em m. Atitude XY usa rotate(-theta). Bank altera só projeção da geometria. O símbolo tem ampliação mínima declarada; réguas mantêm escala física.
- **Dependências diretas (AST):** `this.dimensionar`, `CameraFisica2D`, `ctx.fillRect`, `camera.projetar`, `ctx.beginPath`, `ctx.arc`, `ctx.fill`, `ctx.stroke`, `ctx.setLineDash`, `historico.forEach`, `this.desenharReguas`, `Math.max`, `ctx.save`, `ctx.translate`, `ctx.rotate`, `Math.abs`, `Math.cos`, `ctx.moveTo`, `ctx.lineTo`, `ctx.closePath`, `o.flaps.entries`, `ctx.restore`, `fluxo.multiplicar`, `ctx.fillText`, `(o.rolagem.atualRad * 180 / Math.PI).toFixed`, `Math.max(1, pxM * metrosPorPixel).toFixed`, `metrosPorPixel.toFixed`.
- **Escritas diretas (AST):** `ctx.fillStyle`, `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.font`.
- **Contrato:** [f-c44fd749571b9cb8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c44fd749571b9cb8).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharReguas:MethodDeclaration`

- **Assinatura:** `(camera: CameraFisica2D): void`.
- **Responsabilidade, condições e efeitos:** Réguas X/Y em metros globais consultados da câmera, sem arredondar estado.
- **Dependências diretas (AST):** `Math.floor`, `Math.log10`, `[1, 2, 5, 10].map(v => v * base).find`, `[1, 2, 5, 10].map`, `ctx.beginPath`, `ctx.moveTo`, `ctx.lineTo`, `ctx.stroke`, `camera.desprojetar`, `ctx.fillText`, `Math.round`, `Math.max`.
- **Escritas diretas (AST):** `ctx.font`, `ctx.strokeStyle`, `ctx.fillStyle`, `x`, `y`.
- **Contrato:** [f-830ad3072d81596d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-830ad3072d81596d).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos:MethodDeclaration`

- **Assinatura:** `(historico: readonly ObservacaoReentrada[]): void`.
- **Responsabilidade, condições e efeitos:** Cinco gráficos temporais independentes, com limites e unidades explícitos. Gráficos leem amostras; não interpolam nem reexecutam a dinâmica.
- **Dependências diretas (AST):** `this.dimensionar`, `ctx.fillRect`, `Math.max`, `historico.at`, `canais.forEach`.
- **Escritas diretas (AST):** `ctx.fillStyle`.
- **Contrato:** [f-8485960587076615](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8485960587076615).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction`

- **Assinatura:** `(o: ObservacaoReentrada): number`.
- **Responsabilidade, condições e efeitos:** Consulta altitude radial m do snapshot para o canal visual.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-a4e96facd78790d5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a4e96facd78790d5).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction#2`

- **Assinatura:** `(o: ObservacaoReentrada): number`.
- **Responsabilidade, condições e efeitos:** Consulta velocidade inercial m/s, sem reexecutar física.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-e652f616f5e31ba6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e652f616f5e31ba6).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction#3`

- **Assinatura:** `(o: ObservacaoReentrada): number`.
- **Responsabilidade, condições e efeitos:** Consulta pressão dinâmica Pa já calculada no domínio.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-d0588f78abec3bc7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d0588f78abec3bc7).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction#4`

- **Assinatura:** `(o: ObservacaoReentrada): number`.
- **Responsabilidade, condições e efeitos:** Consulta indicador W/m², sem tratá-lo como temperatura ou qualificação.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-afbff7d4cef24d10](../arquitetura/CATALOGO_DE_FUNCOES.md#f-afbff7d4cef24d10).

### Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction#5`

- **Assinatura:** `(o: ObservacaoReentrada): number`.
- **Responsabilidade, condições e efeitos:** Consulta temperatura concentrada do corpo °C, sem integração visual.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-43e2920f305783b7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-43e2920f305783b7).

### Nova: `src/cenarios/EnsaioReentrada.ts::validarComandoReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada: unknown): entrada is ComandoReentrada`.
- **Responsabilidade, condições e efeitos:** Valida comando serializável por chaves exatas, finitude e limites; não executa.
- **Dependências diretas (AST):** `Array.isArray`, `Object.hasOwn`, `Object.keys`, `chaves[e.tipo].every`, `Number.isFinite`, `Math.abs`, `[e.dianteiroRad, e.traseiroRad].every`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-52a010df6b7f3e6e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-52a010df6b7f3e6e).

### Nova: `src/cenarios/EnsaioReentrada.ts::configurarReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada?: Partial<ConfiguracaoReentrada>): ConfiguracaoReentrada`.
- **Responsabilidade, condições e efeitos:** Cria configuração copiada, validada e congelada; os limiares térmicos padrão foram definidos pelo operador, não representam estrutura interna/qualificação.
- **Dependências diretas (AST):** `copiarSnapshot`, `[c.altitudeM, c.velocidadeMps, c.anguloAtaqueRad, c.trajetoriaRad, c.rolagemRad,
    c.limiteOrbitadorC, c.limiteFlapsC, c.limiteBateriaC, c.passoS].every`, `Math.abs`, `Number.isSafeInteger`, `[c.automatico, c.chaveamentoAutomatico, c.vacuo].every`, `Object.values(c.corredor).every`, `Object.values`, `Error`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-f88e23012b3ae8c3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f88e23012b3ae8c3).

### Nova: `src/cenarios/EnsaioReentrada.ts::estadoModulo:FunctionDeclaration`

- **Assinatura:** `(e: EstadoFisico, x: number, y: number): EstadoFisico`.
- **Responsabilidade, condições e efeitos:** Constrói somente estado inicial de módulo: pose relativa rígida e velocidade v+ω×r em SI. Não é usada para reposicionar objetos durante o ensaio.
- **Dependências diretas (AST):** `Vetor3`, `Math.cos`, `Math.sin`, `e.posicaoM.adicionar`, `e.velocidadeMps.adicionar`, `e.velocidadeAngularRadps.produtoVetorial`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-532e693d7fa63ff9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-532e693d7fa63ff9).

### Nova: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada?: Partial<ConfiguracaoReentrada>): CenarioReentrada`.
- **Responsabilidade, condições e efeitos:** Fábrica ADM de corpos reais e vínculos no mesmo MundoFisico. Vácuo é explícito; atmosfera RE é opt-in. Terra estática, XY, dt máximo 1/240 s. Fonte enclausurada.
- **Dependências diretas (AST):** `configurarReentrada`, `AmbienteTerrestre`, `PerfilAtmosfericoReentrada`, `MundoFisico`, `criarEstadoInicialLocal`, `Math.cos`, `Math.sin`, `OrbitadorReentrada`, `Bateria`, `Vetor3`, `[0, 1].map`, `mundo.registrarObjeto`, `FixadorEstrutural`, `fixadores.push`, `mundo.registrarFixador`, `SuperficieEsferica`, `mundo.registrarSuperficie`, `SensoresVeiculoComposto`, `mundo.registrarSensoresVeiculo`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-8fc45f499c16a562](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8fc45f499c16a562).

### Nova: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada.[callback]#2.operacaoAutorizada:ArrowFunction`

- **Assinatura:** `(): boolean`.
- **Responsabilidade, condições e efeitos:** Permissivo do atuador: vínculo íntegro e corpo vivo; não produz força.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-974c61344181bb4f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-974c61344181bb4f).

### Nova: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada.obterEsforcoSolicitadoN:ArrowFunction`

- **Assinatura:** `(): number`.
- **Responsabilidade, condições e efeitos:** Sem solicitação operacional extra; impactos são registrados pelo core. Esforço aerodinâmico distribuído de vínculos não é qualificado neste ensaio.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-f310bba164029a51](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f310bba164029a51).

### Nova: `src/cenarios/EnsaioReentrada.ts::geometriaConjunto:FunctionDeclaration`

- **Assinatura:** `(c: CenarioReentrada): { membros: Objeto[]; massaKg: number; centroM: Vetor3; inerciaKgM2: number; }`.
- **Responsabilidade, condições e efeitos:** Calcula massa/CM/inércia instantâneos somente dos módulos ainda conectados. Diagnóstico, não segunda cópia de posições nem um integrador.
- **Dependências diretas (AST):** `c.objetos.filter`, `membros.reduce`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-79e1834474e775f0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-79e1834474e775f0).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.constructor:Constructor`

- **Assinatura:** `(entrada?: Partial<ConfiguracaoReentrada>): EnsaioReentrada`.
- **Responsabilidade, condições e efeitos:** Monta controles por portas de leitura, registra adaptador de pouso desabilitado sem motores, e registra hipóteses/revisão. Não inicia execução ou ignição.
- **Dependências diretas (AST):** `GerenciadorDeControladores`, `Map`, `criarCenarioReentrada`, `ControladorReentrada`, `this.gerenciador.registrar`, `ControladorPousoDePropulsores`, `pouso.configurar`, `this.gerenciador.habilitar`, `SupervisorReentrada`, `this.supervisor.definirAutomatico`, `this.atualizarSupervisor`, `this.evento`.
- **Escritas diretas (AST):** `this.id`, `this.passoS`, `this.configuracao`, `this.passos`, `this.execucao`, `this.cenario`, `this.gerenciador`, `this.controlador`, `this.supervisor`, `this.eventos`, `this.condicoesRegistradas`, `this.energiaDissipadaJ`.
- **Contrato:** [f-34fba91cf8789bd5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-34fba91cf8789bd5).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.passosExecutados:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade, condições e efeitos:** Índice exato usado pela agenda reproduzível.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-675d2c66285d618a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-675d2c66285d618a).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.estadoExecucao:GetAccessor`

- **Assinatura:** `(): EstadoExecucaoMissao`.
- **Responsabilidade, condições e efeitos:** Consulta execução real; pausa não altera estado físico.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-a7a4e68b04548ca1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a7a4e68b04548ca1).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.iniciar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Autoriza passos simulados, sem alterar trajetória.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** `this.execucao`.
- **Contrato:** [f-cd5bce11227c4b08](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cd5bce11227c4b08).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.pausar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Suspende executor mantendo corpos e fila operacional.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** `this.execucao`.
- **Contrato:** [f-862b111fdbd503d8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-862b111fdbd503d8).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.obterEventos:MethodDeclaration`

- **Assinatura:** `(): readonly EventoMissao[]`.
- **Responsabilidade, condições e efeitos:** Eventos são copiados/congelados para consumidores.
- **Dependências diretas (AST):** `copiarSnapshot`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-6a94dcd54d1a0d5d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6a94dcd54d1a0d5d).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.receberComando:MethodDeclaration`

- **Assinatura:** `(comando: ComandoReentrada): ResultadoComandoMissao`.
- **Responsabilidade, condições e efeitos:** Aplica comandos públicos e registra aceitação/bloqueio. Comando manual exige seleção manual; pouso sempre verifica supervisor, não habilita motor implícito.
- **Dependências diretas (AST):** `validarComandoReentrada`, `this.supervisor.observar`, `['modo', 'alvos', 'flaps', 'rolagem'].includes`, `this.gerenciador.habilitar`, `this.gerenciador.desabilitar`, `c.flaps.forEach`, `this.controlador.configurarAlvos`, `c.flaps[0].solicitarDeflexaoRad`, `c.flaps[1].solicitarDeflexaoRad`, `c.orbitador.solicitarRolagem`, `this.supervisor.definirAutomatico`, `this.supervisor.solicitarPouso`, `this.atualizarSupervisor`, `this.supervisor.observar().requisitos.filter(r => !r.atendido).map(r => r.descricao).join`, `this.supervisor.observar().requisitos.filter(r => !r.atendido).map`, `this.supervisor.observar().requisitos.filter`, `c.orbitador.definirDisponibilidadeRolagem`, `c.fixadores[comando.indice].liberar`, `this.evento`.
- **Escritas diretas (AST):** `aceito`, `motivo`.
- **Contrato:** [f-ea3e069c929c0c05](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ea3e069c929c0c05).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.avancarPasso:MethodDeclaration`

- **Assinatura:** `(): boolean`.
- **Responsabilidade, condições e efeitos:** Consome solicitações arbitradas e avança um único passo no mundo compartilhado. Não encerra por tempo/evento intermediário. Falhas são observadas, sem correção UI.
- **Dependências diretas (AST):** `this.atualizarSupervisor`, `this.gerenciador.calcularSolicitacoes`, `c.sensores.obterLeituras`, `c.flaps.find(f => f.id === s.idAtuador)?.solicitarDeflexaoRad`, `c.flaps.find`, `c.orbitador.solicitarRolagem`, `c.objetos.reduce`, `c.mundo.avancar`, `this.registrarCondicoes`.
- **Escritas diretas (AST):** `this.passos`, `this.energiaDissipadaJ`.
- **Contrato:** [f-6c85c671f0b775b6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6c85c671f0b775b6).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.observar:MethodDeclaration`

- **Assinatura:** `(): ObservacaoReentrada`.
- **Responsabilidade, condições e efeitos:** Observação escalar/geométrica, copiada e congelada, sem oferecer objetos mutáveis.
- **Dependências diretas (AST):** `c.orbitador.getEstadoFisico`, `c.mundo.obterCondicoesAtmosfericas`, `c.orbitador.avaliar`, `geometriaConjunto`, `c.mundo.obterCargasAerodinamicas`, `cargas.forcaN.multiplicar`, `c.mundo.obterGravidadeMps2`, `c.ambiente.referencial.vetorParaLocal`, `g.membros.reduce`, `copiarSnapshot`, `c.ambiente.referencial.altitudeGeometricaM`, `c.ambiente.referencial.posicaoHorizontalM`, `Math.atan2`, `c.orbitador.observarRolagem`, `this.controlador.observar`, `c.orbitador.obterHistoricoRolagem`, `this.supervisor.observar`, `this.gerenciador.obterUltimaArbitragem`, `gravidade.adicionar`, `aceleracaoAero.produtoEscalar`, `Math.max`, `c.objetos.reduce`, `c.flaps.map`, `c.fixadores.map`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-05755a69bc286c7f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-05755a69bc286c7f).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.lerControle:MethodDeclaration`

- **Assinatura:** `(): TelemetriaControleReentrada`.
- **Responsabilidade, condições e efeitos:** Telemetria física para PD; calcula derivada angular do fluxo por v×a/|v|², sem diferenciar relógio real ou alterar estado. Torque passivo exclui lift ativo.
- **Dependências diretas (AST):** `c.orbitador.getEstadoFisico`, `geometriaConjunto`, `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `c.mundo.obterCargasAerodinamicas`, `c.mundo.obterGravidadeMps2(e.posicaoM).adicionar`, `c.mundo.obterGravidadeMps2`, `cargas.forcaN.multiplicar`, `e.velocidadeMps.subtrair`, `c.flaps.reduce`, `v.produtoVetorial`, `c.orbitador.observarRolagem`, `c.flaps.every`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-2db95d019a3477f5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2db95d019a3477f5).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.atualizarSupervisor:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Mapeia eixo longitudinal +X para atitude da vertical esperada pelo pouso BSS (+Y); integração propulsiva ausente bloqueia transferência explicitamente.
- **Dependências diretas (AST):** `c.sensores.obterLeituras`, `this.supervisor.observar`, `this.supervisor.atualizar`, `Math.hypot`, `normalizarAngulo`, `Math.atan2`, `this.evento`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-b5dfd4d0081ccbd9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b5dfd4d0081ccbd9).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.registrarCondicoes:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Registra arestas de falha/recuperação de condições, não repete eventos por frame. Colisão, dano e separação não encerram evolução física.
- **Dependências diretas (AST):** `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `c.flaps.some`, `this.controlador.observar`, `c.fixadores.some`, `c.mundo.obterContatosComSuperficie`, `this.lerControle`, `c.perfil.amostrar`, `c.ambiente.referencial.altitudeGeometricaM`, `c.orbitador.getEstadoFisico`, `c.orbitador.observarRolagem`, `c.flaps.entries`, `Object.entries`, `this.condicoesRegistradas.get`, `this.evento`, `this.condicoesRegistradas.set`.
- **Escritas diretas (AST):** `condicoes[`degradacao-flap-${i + 1}`]`, `condicoes[`colapso-flap-${i + 1}`]`.
- **Contrato:** [f-5dacbb18677d6f4c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5dacbb18677d6f4c).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.evento:MethodDeclaration`

- **Assinatura:** `(tipo: string, descricao: string, categoria?: EventoMissao["categoria"]): void`.
- **Responsabilidade, condições e efeitos:** Acrescenta evento no tempo de missão, com sequência estável e categoria.
- **Dependências diretas (AST):** `this.eventos.push`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-593973bfbdc79c20](../arquitetura/CATALOGO_DE_FUNCOES.md#f-593973bfbdc79c20).

### Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.obterIdentificacao:MethodDeclaration`

- **Assinatura:** `(): object`.
- **Responsabilidade, condições e efeitos:** Exporta identificação completa/revisões para o decorador de diário compartilhado.
- **Dependências diretas (AST):** `copiarSnapshot`, `this.cenario.mundo.obterConfiguracaoFisica`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-4987311594a9418d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4987311594a9418d).

### Nova: `src/cenarios/EnsaioReentrada.ts::criarEnsaioReentrada:FunctionDeclaration`

- **Assinatura:** `(configuracao?: Partial<ConfiguracaoReentrada>): RegistroMissao<ComandoReentrada, ObservacaoReentrada>`.
- **Responsabilidade, condições e efeitos:** Fábrica pública de ensaio registrável, sem relógio, DOM ou escrita externa.
- **Dependências diretas (AST):** `EnsaioReentrada`, `RegistroMissao`, `ensaio.obterIdentificacao`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-fbefc47b0a643060](../arquitetura/CATALOGO_DE_FUNCOES.md#f-fbefc47b0a643060).

### Nova: `src/cenarios/EnsaioReentrada.ts::reproduzirEnsaioReentrada:FunctionDeclaration`

- **Assinatura:** `(diario: DiarioReentrada): RegistroMissao<ComandoReentrada, ObservacaoReentrada>`.
- **Responsabilidade, condições e efeitos:** Reexecuta agenda no mesmo modelo/runtime; rejeita revisão, entradas e resultados divergentes. Pausa/exportação não reproduzem relógio real. O custo é proporcional ao número de passos físicos do diário; chamada síncrona headless.
- **Dependências diretas (AST):** `Number.isSafeInteger`, `Error`, `criarEnsaioReentrada`, `JSON.stringify`, `ensaio.exportar`, `ensaio.observar`, `ensaio.iniciar`, `ensaio.pausar`, `ensaio.receberComando`, `ensaio.avancarPasso`.
- **Escritas diretas (AST):** `indice`.
- **Contrato:** [f-af7e1ca547762556](../arquitetura/CATALOGO_DE_FUNCOES.md#f-af7e1ca547762556).

### Nova: `src/physics/ambiente/PerfilAtmosfericoReentrada.ts::PerfilAtmosfericoReentrada.amostrar:MethodDeclaration`

- **Assinatura:** `(altitudeM: number): AmostraAtmosferaReentrada`.
- **Responsabilidade, condições e efeitos:** Amostra SI, altitude geométrica finita; T em °C, som ideal com composição fixa. A cauda acima de 200 km é exponencial (H=50 km), sem corte artificial de vácuo. Caminho livre médio usa lambda*rho constante: indicador, sem DSMC/composição variável. Não integra estado. Testes: EnsaioReentrada.test.ts (continuidade e rarefação).
- **Dependências diretas (AST):** `Number.isFinite`, `Error`, `Math.max`, `Math.exp`, `Math.log`, `Math.sqrt`.
- **Escritas diretas (AST):** `densidadeKgM3`, `temperaturaC`, `i`.
- **Contrato:** [f-b99b389a507fa67b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b99b389a507fa67b).

### Nova: `src/physics/ambiente/PerfilAtmosfericoReentrada.ts::PerfilAtmosfericoReentrada.obterDensidadeKgM3:MethodDeclaration`

- **Assinatura:** `(altitudeM: number): number`.
- **Responsabilidade, condições e efeitos:** Consulta densidade kg/m³ do mesmo perfil usado pela telemetria de Mach/rarefação.
- **Dependências diretas (AST):** `this.amostrar`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-68095744d9001721](../arquitetura/CATALOGO_DE_FUNCOES.md#f-68095744d9001721).

### Nova: `src/physics/ambiente/PerfilAtmosfericoReentrada.ts::PerfilAtmosfericoReentrada.obterConfiguracao:MethodDeclaration`

- **Assinatura:** `(): object`.
- **Responsabilidade, condições e efeitos:** Exporta todas as âncoras/hipóteses; não alega fidelidade integral à USSA-1976.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-fbb89557654b1c68](../arquitetura/CATALOGO_DE_FUNCOES.md#f-fbb89557654b1c68).

### Nova: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.constructor:Constructor`

- **Assinatura:** `(definicao: DefinicaoAletaAerodinamica, lerRolagemRad: () => number, montagemIntegra: () => boolean): FlapReentrada`.
- **Responsabilidade, condições e efeitos:** Recebe somente porta de leitura da projeção e permissivo da montagem.
- **Dependências diretas (AST):** `super`, `lerRolagemRad`.
- **Escritas diretas (AST):** `this.lerRolagemRad`, `this.montagemIntegra`, `this.phiUltimoConectadoRad`.
- **Contrato:** [f-713ac4483df17789](../arquitetura/CATALOGO_DE_FUNCOES.md#f-713ac4483df17789).

### Nova: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.prepararPassoOperacional:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade, condições e efeitos:** Reutiliza atuador elétrico e acompanha bank enquanto conectado. Após separação conserva última projeção prescrita: o corpo livre mantém cargas aerodinâmicas, e sua posição/atitude XY continuam sendo calculadas exclusivamente pelo core.
- **Dependências diretas (AST):** `super.prepararPassoOperacional`, `this.montagemIntegra`, `this.lerRolagemRad`.
- **Escritas diretas (AST):** `this.phiUltimoConectadoRad`.
- **Contrato:** [f-d940577d02a1ae47](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d940577d02a1ae47).

### Nova: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.obterForcasAerodinamicas:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[]`.
- **Responsabilidade, condições e efeitos:** Força perpendicular ao fluxo no CP real do flap, N, proporcional a q. Corpo destacado mantém lift/drag próprios e última projeção de bank, sem transmitir forças a distância para o orbitador.
- **Dependências diretas (AST):** `this.getEstadoFisico`, `e.velocidadeMps.subtrair`, `Math.sin`, `new Vetor3(-v.y / V, v.x / V, 0).multiplicar`, `Vetor3`, `projetarSustentacao`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-e32af2d35fa6fa2c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e32af2d35fa6fa2c).

### Nova: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.getCoeficienteArrastoEfetivo:MethodDeclaration`

- **Assinatura:** `(): number`.
- **Responsabilidade, condições e efeitos:** Cd positivo por deflexão real; permanece no caminho único de arrasto do core.
- **Dependências diretas (AST):** `Math.sin`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-f2617c9c3b49b631](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f2617c9c3b49b631).

### Nova: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.obterPotenciaAquecimentoAerodinamicoW:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas, dissipacaoW: number): number`.
- **Responsabilidade, condições e efeitos:** Aquecimento indicador do flap com raio efetivo 0,5 m e área aquecida 2 m²; temperatura é do componente concentrado, sem interpretação de atuador interno.
- **Dependências diretas (AST):** `this.getEstadoFisico().velocidadeMps.subtrair`, `this.getEstadoFisico`, `Math.min`, `calcularFluxoTermicoIndicador`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-d1d83ab8a5f815b3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d1d83ab8a5f815b3).

### Nova: `src/physics/objetos/componentes/RolagemVirtual.ts::RolagemVirtual.constructor:Constructor`

- **Assinatura:** `(inicialRad?: number, taxaMaximaRadps?: number, limiteRad?: number): RolagemVirtual`.
- **Responsabilidade, condições e efeitos:** Inicializa ângulo rad, curso até π e taxa rad/s positivos; não conhece corpo/mundo.
- **Dependências diretas (AST):** `[inicialRad, taxaMaximaRadps, limiteRad].every`, `Math.abs`, `Error`, `this.historico.push`.
- **Escritas diretas (AST):** `this.taxaMaximaRadps`, `this.limiteRad`, `this.solicitadaRad`, `this.atualRad`, `this.disponivel`, `this.historico`.
- **Contrato:** [f-71592e454cdc955f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-71592e454cdc955f).

### Nova: `src/physics/objetos/componentes/RolagemVirtual.ts::RolagemVirtual.solicitar:MethodDeclaration`

- **Assinatura:** `(anguloRad: number, tempoS: number): void`.
- **Responsabilidade, condições e efeitos:** Satura alvo rad; registra mudanças no tempo simulado s, mesmo se indisponível.
- **Dependências diretas (AST):** `[anguloRad, tempoS].every`, `Error`, `Math.max`, `Math.min`, `this.historico.push`.
- **Escritas diretas (AST):** `this.solicitadaRad`.
- **Contrato:** [f-a32af989b5cd0715](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a32af989b5cd0715).

### Nova: `src/physics/objetos/componentes/RolagemVirtual.ts::RolagemVirtual.avancar:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade, condições e efeitos:** Avança apenas variável virtual por taxa prescrita rad/s; dt s em (0,1/60].
- **Dependências diretas (AST):** `Number.isFinite`, `Error`, `Math.max`, `Math.min`.
- **Escritas diretas (AST):** `this.atualRad`.
- **Contrato:** [f-7785f3fed60e116a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-7785f3fed60e116a).

### Nova: `src/physics/objetos/componentes/RolagemVirtual.ts::RolagemVirtual.definirDisponibilidade:MethodDeclaration`

- **Assinatura:** `(disponivel: boolean): void`.
- **Responsabilidade, condições e efeitos:** Falha congela somente a variável prescrita; não interfere em posição/velocidade/arfagem.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** `this.disponivel`.
- **Contrato:** [f-d9e74aab00b28ddd](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d9e74aab00b28ddd).

### Nova: `src/physics/objetos/componentes/RolagemVirtual.ts::RolagemVirtual.observar:MethodDeclaration`

- **Assinatura:** `(): EstadoRolagemVirtual`.
- **Responsabilidade, condições e efeitos:** Snapshot escalar sem acesso mutável ao componente.
- **Dependências diretas (AST):** `Object.freeze`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-07035258b4c50f9b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-07035258b4c50f9b).

### Nova: `src/physics/objetos/componentes/RolagemVirtual.ts::RolagemVirtual.obterHistorico:MethodDeclaration`

- **Assinatura:** `(): readonly { readonly tempoS: number; readonly anguloRad: number; }[]`.
- **Responsabilidade, condições e efeitos:** Copia histórico de mudanças; nenhuma amostra de cinemática XY é mantida.
- **Dependências diretas (AST):** `this.historico.map`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-c34bff7665ca14f2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c34bff7665ca14f2).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.constructor:Constructor`

- **Assinatura:** `(estadoInicial: EstadoFisico, limiteTermicoC: number, phiInicialRad: number, perfil: PerfilAtmosfericoReentrada, referencial: ReferencialFisico, lerVelocidadeArMps: () => Vetor3): OrbitadorReentrada`.
- **Responsabilidade, condições e efeitos:** Material concentrado provisório e geometria de engenharia, SI. TPS/estrutura não são camadas independentes. Recebe serviços compartilhados, sem DOM/relógio.
- **Dependências diretas (AST):** `super`, `Vetor3`, `RolagemVirtual`.
- **Escritas diretas (AST):** `this.perfil`, `this.referencial`, `this.lerVelocidadeArMps`, `this.rolagem`.
- **Contrato:** [f-f474385619746e2c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f474385619746e2c).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.avaliar:MethodDeclaration`

- **Assinatura:** `(condicoes: CondicoesAtmosfericas): CargasReentrada`.
- **Responsabilidade, condições e efeitos:** Consulta cargas com a mesma densidade/vento do core e perfil compartilhado.
- **Dependências diretas (AST):** `this.getEstadoFisico`, `avaliarAerodinamica`, `this.perfil.amostrar`, `this.referencial.altitudeGeometricaM`, `this.rolagem.observar`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-14919f1c850cb153](../arquitetura/CATALOGO_DE_FUNCOES.md#f-14919f1c850cb153).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.getCoeficienteArrastoEfetivo:MethodDeclaration`

- **Assinatura:** `(vRel?: Vetor3): number`.
- **Responsabilidade, condições e efeitos:** Cd analítico pelo fluxo atual; arrasto é aplicado exclusivamente pelo core.
- **Dependências diretas (AST):** `this.getEstadoFisico`, `this.avaliar`, `e.velocidadeMps.subtrair`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-5af7c6e41f3ef618](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5af7c6e41f3ef618).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.obterCentroPressaoM:MethodDeclaration`

- **Assinatura:** `(): Vetor3`.
- **Responsabilidade, condições e efeitos:** CP global m obtido da geometria longitudinal e atitude física XY atuais.
- **Dependências diretas (AST):** `this.getEstadoFisico`, `this.avaliar`, `this.lerVelocidadeArMps`, `e.posicaoM.adicionar`, `Vetor3`, `Math.cos`, `Math.sin`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-a11b6560d6de12a1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a11b6560d6de12a1).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.obterForcasAerodinamicas:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[]`.
- **Responsabilidade, condições e efeitos:** Somente sustentação projetada; não repete o arrasto aplicado pelo mundo.
- **Dependências diretas (AST):** `this.avaliar`, `this.obterCentroPressaoM`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-acefff1a6872cd5c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-acefff1a6872cd5c).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.obterPotenciaAquecimentoAerodinamicoW:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas, potenciaW: number): number`.
- **Responsabilidade, condições e efeitos:** Fluxo indicador vezes área efetiva, limitado à dissipação D·V; substitui a fração histórica. SistemaTermico aplica uma vez e conserva contadores/dano.
- **Dependências diretas (AST):** `Math.min`, `this.avaliar`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-93990e131a83cd8a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-93990e131a83cd8a).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.prepararPassoOperacional:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade, condições e efeitos:** Atualiza exclusivamente a cinemática virtual em subpassos do core, s; colapso estrutural indisponibiliza a capacidade, sem alterar atitude XY.
- **Dependências diretas (AST):** `this.rolagem.definirDisponibilidade`, `this.rolagem.avancar`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-b9aa4b0a352500a1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b9aa4b0a352500a1).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.solicitarRolagem:MethodDeclaration`

- **Assinatura:** `(rad: number, tempoS: number): void`.
- **Responsabilidade, condições e efeitos:** Solicitação operacional registrada em rad e segundos simulados.
- **Dependências diretas (AST):** `this.rolagem.solicitar`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-8ed0223bd082e085](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8ed0223bd082e085).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.definirDisponibilidadeRolagem:MethodDeclaration`

- **Assinatura:** `(disponivel: boolean): void`.
- **Responsabilidade, condições e efeitos:** Perda de disponibilidade não altera atitude física XY.
- **Dependências diretas (AST):** `this.rolagem.definirDisponibilidade`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-fccd1b9a46c52b5d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-fccd1b9a46c52b5d).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.observarRolagem:MethodDeclaration`

- **Assinatura:** `(): EstadoRolagemVirtual`.
- **Responsabilidade, condições e efeitos:** Snapshot consultável da aproximação virtual.
- **Dependências diretas (AST):** `this.rolagem.observar`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-9b79263187f0a4ca](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9b79263187f0a4ca).

### Nova: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.obterHistoricoRolagem:MethodDeclaration`

- **Assinatura:** `(): readonly { readonly tempoS: number; readonly anguloRad: number; }[]`.
- **Responsabilidade, condições e efeitos:** Cópia do histórico de comandos prescritos para exportação.
- **Dependências diretas (AST):** `this.rolagem.obterHistorico`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-0b0738b39eddc914](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0b0738b39eddc914).

### Nova: `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::projetarSustentacao:FunctionDeclaration`

- **Assinatura:** `(sustentacaoN: number, phiRad: number): number`.
- **Responsabilidade, condições e efeitos:** Projeção puramente algébrica L*cos(phi), inclusive em rolagem negativa; lateral L*sin(phi) não é integrada. Não produz arrasto ou integração.
- **Dependências diretas (AST):** `[sustentacaoN, phiRad].every`, `Error`, `Math.cos`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-b963603558db9e7b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b963603558db9e7b).

### Nova: `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::calcularFluxoTermicoIndicador:FunctionDeclaration`

- **Assinatura:** `(rho: number, velocidadeMps: number, raioM: number): number`.
- **Responsabilidade, condições e efeitos:** Indicador Sutton–Graves SI, limitado pelo fluxo cinético molecular incidente. rho kg/m³, V m/s e raio m; retorna W/m². Não é previsão qualificada de TPS, especialmente no rarefeito, fora do hipersônico ou com química/composição variáveis.
- **Dependências diretas (AST):** `[rho, velocidadeMps, raioM].every`, `Error`, `Math.min`, `Math.sqrt`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-5b99eb90d683a84a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5b99eb90d683a84a).

### Nova: `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::avaliarAerodinamica:FunctionDeclaration`

- **Assinatura:** `(estado: EstadoFisico, condicoes: CondicoesAtmosfericas, atmosfera: AmostraAtmosferaReentrada, integridade: number, phiRad: number): CargasReentrada`.
- **Responsabilidade, condições e efeitos:** Modelo analítico preliminar XY, eixo longitudinal local +X. Cl=0,9*sin(2α) com correção Mach suave; Cd=0,12+1,6*sin²α+termo Mach. Não usa tabela validada. CP levemente a ré produz momento real; lift normal ao fluxo é projetado por phi. Condições SI finitas fornecidas pelo mundo; função pura, dt não se aplica.
- **Dependências diretas (AST):** `estado.velocidadeMps.subtrair`, `normalizarAngulo`, `Math.atan2`, `Math.sin`, `Math.exp`, `projetarSustentacao`, `Vetor3`, `n.multiplicar`, `v.multiplicar`, `calcularFluxoTermicoIndicador`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-1ed66fedcef47f81](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1ed66fedcef47f81).

### Nova: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.constructor:Constructor`

- **Assinatura:** `(ler: () => TelemetriaControleReentrada, alphaRad: number, phiRad: number, corredor: CorredorReentrada): ControladorReentrada`.
- **Responsabilidade, condições e efeitos:** Recebe porta escalar de sensores/cargas, sem acesso ao objeto ou mundo. Corredor é uma heurística de investigação, sem garantia de trajetória segura.
- **Dependências diretas (AST):** `this.configurarAlvos`, `Object.values(corredor).every`, `Object.values`, `Error`.
- **Escritas diretas (AST):** `this.ler`, `this.corredor`, `this.id`, `this.prioridade`, `this.habilitado`, `this.alvoAlphaRad`, `this.alvoPhiRad`, `this.estado`, `this.alphaGerenciadoRad`.
- **Contrato:** [f-c18886ab4102b0a9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c18886ab4102b0a9).

### Nova: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.habilitar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Seleciona automação; ignição/posição/orientação não são comandadas.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** `this.habilitado`, `this.estado`.
- **Contrato:** [f-984a523bb78d293a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-984a523bb78d293a).

### Nova: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.desabilitar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Retira solicitações da arbitragem, preservando o estado físico.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** `this.habilitado`, `this.estado`.
- **Contrato:** [f-3355374dcb4f6b5f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3355374dcb4f6b5f).

### Nova: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.estaHabilitado:GetAccessor`

- **Assinatura:** `(): boolean`.
- **Responsabilidade, condições e efeitos:** Consulta seleção operacional real.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-8759d6e7ccb5a8f2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8759d6e7ccb5a8f2).

### Nova: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.configurarAlvos:MethodDeclaration`

- **Assinatura:** `(alphaRad: number, phiRad: number): void`.
- **Responsabilidade, condições e efeitos:** Alvos rad finitos, alpha de 0–80° e bank de ±90°.
- **Dependências diretas (AST):** `[alphaRad, phiRad].every`, `Math.abs`, `Error`.
- **Escritas diretas (AST):** `this.alvoAlphaRad`, `this.alvoPhiRad`.
- **Contrato:** [f-c5e7649bb6a75116](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c5e7649bb6a75116).

### Nova: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.observar:MethodDeclaration`

- **Assinatura:** `(): { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; }`.
- **Responsabilidade, condições e efeitos:** Snapshot de alvo do operador, alvo gerenciado e estado efetivo do controle.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-f9d73dd15b5c52e4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f9d73dd15b5c52e4).

### Nova: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.calcularSolicitacoes:MethodDeclaration`

- **Assinatura:** `(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[]`.
- **Responsabilidade, condições e efeitos:** Calcula deflexões opostas para torque de arfagem, limitado por q, geometria, projeção virtual e curso de 30°. PD sem integral evita windup. dt s em (0,1/60]. Sem autoridade não aplica torque substituto/RCS fictício. Leituras inválidas produzem ausência de pedidos; sensores só observam o estado real do core.
- **Dependências diretas (AST):** `Number.isFinite`, `Error`, `this.ler`, `Object.values(t).filter(v => typeof v === 'number').every`, `Object.values(t).filter`, `Object.values`, `Math.min`, `Math.max`, `Math.cos`, `normalizarAngulo`, `Math.abs`.
- **Escritas diretas (AST):** `this.estado`, `this.alphaGerenciadoRad`.
- **Contrato:** [f-e02341d58116ed62](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e02341d58116ed62).

### Nova: `src/physics/sistemas de controle/SupervisorReentrada.ts::SupervisorReentrada.constructor:Constructor`

- **Assinatura:** `(gerenciador: GerenciadorDeControladores, limites?: LimitesTransferencia): SupervisorReentrada`.
- **Responsabilidade, condições e efeitos:** Exige limites SI finitos/ordenados; recebe o gerenciador já registrado.
- **Dependências diretas (AST):** `Object.values(limites).every`, `Object.values`, `Error`.
- **Escritas diretas (AST):** `this.gerenciador`, `this.limites`, `this.solicitado`, `this.automatico`, `this.fase`, `this.requisitos`.
- **Contrato:** [f-cadd2a244c36f2e6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cadd2a244c36f2e6).

### Nova: `src/physics/sistemas de controle/SupervisorReentrada.ts::SupervisorReentrada.definirAutomatico:MethodDeclaration`

- **Assinatura:** `(ativo: boolean): void`.
- **Responsabilidade, condições e efeitos:** Define modo de chaveamento, sem antecipar a transferência.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** `this.automatico`.
- **Contrato:** [f-b1ae7b1305eed55c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b1ae7b1305eed55c).

### Nova: `src/physics/sistemas de controle/SupervisorReentrada.ts::SupervisorReentrada.solicitarPouso:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Solicita avaliação supervisionada única; falha exige novo comando manual.
- **Dependências diretas (AST):** nenhuma chamada direta.
- **Escritas diretas (AST):** `this.solicitado`.
- **Contrato:** [f-a197f80db78bc8fc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a197f80db78bc8fc).

### Nova: `src/physics/sistemas de controle/SupervisorReentrada.ts::SupervisorReentrada.atualizar:MethodDeclaration`

- **Assinatura:** `(e: EstadoTransferenciaPouso): void`.
- **Responsabilidade, condições e efeitos:** Verifica todas as condições antes de trocar o controlador selecionado. Falha de sensores/integridade retira ambos; perda de propulsão retira pouso. Não transfere para adaptador sem integração física, mesmo com cinemática favorável.
- **Dependências diretas (AST):** `[e.altitudeM, e.velocidadeMps, e.atitudeVerticalRad, e.trajetoriaRad, e.integridade].every`, `Math.abs`, `this.gerenciador.desabilitar`, `this.requisitos.every`, `this.gerenciador.habilitar`.
- **Escritas diretas (AST):** `this.requisitos`, `this.fase`, `this.solicitado`.
- **Contrato:** [f-673d50a58b6f9c0f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-673d50a58b6f9c0f).

### Nova: `src/physics/sistemas de controle/SupervisorReentrada.ts::SupervisorReentrada.observar:MethodDeclaration`

- **Assinatura:** `(): { fase: "reentrada" | "pouso" | "falha"; automatico: boolean; autorizado: boolean; requisitos: { descricao: string; atendido: boolean; atual: number | boolean; esperado: string; }[]; limites: { altitudeMinimaM: number; altitudeMaximaM: number; velocidadeMaximaMps: number; atitudeMaximaRad: number; trajetoriaMinimaRad: number; trajetoriaMaximaRad: number; }; }`.
- **Responsabilidade, condições e efeitos:** Copia diagnóstico e limites; falha bloqueada permanece observável.
- **Dependências diretas (AST):** `this.requisitos.every`, `this.requisitos.map`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-99cdaa23a64f6cf9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-99cdaa23a64f6cf9).

### Nova: `src/reentrada.ts::iniciarBancada:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Fronteira de apresentação: lê controles, comanda portas de missão e desenha snapshots; tempo real serve apenas ao executor fixo, nunca à lei física.
- **Dependências diretas (AST):** `elemento`, `RenderizadorReentrada`, `criarEnsaioReentrada`, `ExecutorPassoFixo`, `ensaio.observar`, `Map`, `iniciais.addEventListener`, `form.addEventListener`, `elemento('re-reset').addEventListener`, `modo.addEventListener`, `elemento('re-alvos').addEventListener`, `elemento(id).addEventListener`, `elemento('re-chaveamento').addEventListener`, `elemento('re-pouso').addEventListener`, `energia.addEventListener`, `elemento('re-falha-rolagem').addEventListener`, `elemento('re-separar').addEventListener`, `elemento('re-passo').addEventListener`, `elemento('re-exportar').addEventListener`, `requestAnimationFrame`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-bdf1e31dbe2aa399](../arquitetura/CATALOGO_DE_FUNCOES.md#f-bdf1e31dbe2aa399).

### Nova: `src/reentrada.ts::iniciarBancada.elemento:FunctionDeclaration`

- **Assinatura:** `<T extends HTMLElement>(id: string): T`.
- **Responsabilidade, condições e efeitos:** Resolve elemento obrigatório da página, falhando explicitamente se ausente.
- **Dependências diretas (AST):** `document.getElementById`, `Error`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-043a536f0ddd232b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-043a536f0ddd232b).

### Nova: `src/reentrada.ts::iniciarBancada.numero:FunctionDeclaration`

- **Assinatura:** `(id: string): number`.
- **Responsabilidade, condições e efeitos:** Converte entrada numérica em SI; validação final pertence ao domínio.
- **Dependências diretas (AST):** `Number`, `elemento`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-125d2a3542b41de5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-125d2a3542b41de5).

### Nova: `src/reentrada.ts::iniciarBancada.rad:FunctionDeclaration`

- **Assinatura:** `(id: string): number`.
- **Responsabilidade, condições e efeitos:** Converte graus da interface para radianos explicitamente.
- **Dependências diretas (AST):** `numero`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-1d3579ae29692539](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1d3579ae29692539).

### Nova: `src/reentrada.ts::iniciarBancada.lerConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): Partial<ConfiguracaoReentrada>`.
- **Responsabilidade, condições e efeitos:** Lê configuração pré-ensaio; todas as conversões são explícitas e registradas.
- **Dependências diretas (AST):** `numero`, `rad`, `elemento`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-9f19a52f59d415b4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9f19a52f59d415b4).

### Nova: `src/reentrada.ts::iniciarBancada.preparar:FunctionDeclaration`

- **Assinatura:** `(): boolean`.
- **Responsabilidade, condições e efeitos:** Recria ensaio solicitado; reinicia somente pela fábrica, sem editar corpos.
- **Dependências diretas (AST):** `form.reportValidity`, `criarEnsaioReentrada`, `lerConfiguracao`, `ExecutorPassoFixo`, `ensaio.observar`, `elemento`, `String`.
- **Escritas diretas (AST):** `ensaio`, `executor`, `historico`, `configAlterada`, `eventosMostrados`, `ultimaAtualizacaoMs`, `modo.value`, `elemento<HTMLInputElement>('re-alpha-alvo').value`, `elemento<HTMLInputElement>('re-phi-alvo').value`, `elemento<HTMLInputElement>('re-flap-dianteiro').value`, `elemento<HTMLInputElement>('re-flap-traseiro').value`, `mensagem.textContent`.
- **Contrato:** [f-c51586eefc46d9d2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c51586eefc46d9d2).

### Nova: `src/reentrada.ts::iniciarBancada.comandar:FunctionDeclaration`

- **Assinatura:** `(c: ComandoReentrada): void`.
- **Responsabilidade, condições e efeitos:** Encaminha intenção e apresenta diagnóstico real, sem duplicar estados.
- **Dependências diretas (AST):** `ensaio.receberComando`, `String`.
- **Escritas diretas (AST):** `mensagem.textContent`, `ultimaAtualizacaoMs`.
- **Contrato:** [f-cf79be1a17c2b2c7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cf79be1a17c2b2c7).

### Nova: `src/reentrada.ts::iniciarBancada.avancar:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade, condições e efeitos:** Executa um passo fixo e registra amostra visual a cada segundo simulado. O diário compartilhado mantém sua própria coleta determinística completa.
- **Dependências diretas (AST):** `ensaio.avancarPasso`, `historico.push`, `ensaio.observar`, `historico.shift`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-9085698dbe6b0394](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9085698dbe6b0394).

### Nova: `src/reentrada.ts::iniciarBancada.metrica:FunctionDeclaration`

- **Assinatura:** `(id: string, nome: string, valor: string): void`.
- **Responsabilidade, condições e efeitos:** Atualiza valor de telemetria em nó persistente, evitando reconstrução por frame.
- **Dependências diretas (AST):** `metricas.get`, `document.createElement`, `caixa.append`, `elemento('re-telemetria').append`, `elemento`, `metricas.set`.
- **Escritas diretas (AST):** `caixa.className`, `titulo.textContent`, `e`, `e.dataset.metrica`, `e.textContent`.
- **Contrato:** [f-0a8b2119bcaf62bf](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0a8b2119bcaf62bf).

### Nova: `src/reentrada.ts::iniciarBancada.graus:FunctionDeclaration`

- **Assinatura:** `(rad: number): string`.
- **Responsabilidade, condições e efeitos:** Converte radianos observados para graus de apresentação.
- **Dependências diretas (AST):** `(rad * 180 / Math.PI).toFixed`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-8a757acdc377f6ca](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8a757acdc377f6ca).

### Nova: `src/reentrada.ts::iniciarBancada.atualizarPainel:FunctionDeclaration`

- **Assinatura:** `(o: ObservacaoReentrada): void`.
- **Responsabilidade, condições e efeitos:** Renderiza comandos, estado físico e variáveis virtuais explicitamente distintos.
- **Dependências diretas (AST):** `metrica`, `o.altitudeM.toFixed`, `o.velocidadeMps.toFixed`, `graus`, `a.mach.toFixed`, `a.pressaoDinamicaPa.toPrecision`, `a.sustentacaoN.toFixed`, `a.sustentacaoXYN.toFixed`, `a.arrastoN.toFixed`, `a.sustentacaoLateralOmitidaN.toFixed`, `o.cargaG.toFixed`, `o.desaceleracaoMps2.toFixed`, `o.aceleracaoMps2.x.toFixed`, `o.aceleracaoMps2.y.toFixed`, `o.torqueAerodinamicoNm.toFixed`, `a.centroPressaoLocalM.toFixed`, `a.fluxoTermicoIndicadorWm2.toPrecision`, `o.temperaturaC.toFixed`, `(100 * o.integridade).toFixed`, `o.massaKg.toFixed`, `o.energiaAbsorvidaJ.toPrecision`, `o.dissipacaoW.toPrecision`, `o.calorTransferidoW.toPrecision`, `o.potenciaAtmosferaW.toPrecision`, `a.knudsen.toPrecision`, `o.energiaBateriaJ.toFixed`, `o.temperaturaBateriaC.toFixed`, `(100 * o.integridadeBateria).toFixed`, `o.flaps.entries`, `f.temperaturaC.toFixed`, `(100 * f.integridade).toFixed`, `elemento`, `o.flaps.every`, `o.tempoS.toFixed`, `executor.tempoPendenteS.toFixed`, `diagnostico.replaceChildren`, `document.createElement`, `r.atual.toPrecision`, `linha.append`, `diagnostico.append`, `ensaio.obterEventos`, `lista.replaceChildren`, `eventos.slice`, `evento.tempoS.toFixed`, `lista.append`.
- **Escritas diretas (AST):** `play.textContent`, `iniciais.disabled`, `manuais.disabled`, `modo.value`, `modo.disabled`, `elemento<HTMLButtonElement>('re-passo').disabled`, `elemento<HTMLSelectElement>('re-chaveamento').value`, `energia.textContent`, `elemento('re-tempo-real').textContent`, `linha.className`, `descricao.textContent`, `valor.textContent`, `li.textContent`, `eventosMostrados`.
- **Contrato:** [f-886d03c02bf67e85](../arquitetura/CATALOGO_DE_FUNCOES.md#f-886d03c02bf67e85).

### Nova: `src/reentrada.ts::iniciarBancada.quadro:FunctionDeclaration`

- **Assinatura:** `(timestamp: number): void`.
- **Responsabilidade, condições e efeitos:** Cooperação da apresentação: orçamento 8 ms/quadro, mantém dívida temporal. Pausa em erro explícito e conserva diagnóstico; não declara sucesso/repouso.
- **Dependências diretas (AST):** `performance.now`, `executor.avancarAte`, `numero`, `ensaio.observar`, `renderer.desenhar`, `atualizarPainel`, `renderer.desenharGraficos`, `ensaio.pausar`, `String`, `requestAnimationFrame`.
- **Escritas diretas (AST):** `ultimaAtualizacaoMs`, `mensagem.textContent`.
- **Contrato:** [f-081506ae1d0d1404](../arquitetura/CATALOGO_DE_FUNCOES.md#f-081506ae1d0d1404).

### Nova: `src/reentrada.ts::iniciarBancada.quadro.continuar:ArrowFunction`

- **Assinatura:** `(): boolean`.
- **Responsabilidade, condições e efeitos:** Orçamento visual em ms; interrompe lote, preservando dívida e dt físico.
- **Dependências diretas (AST):** `performance.now`.
- **Escritas diretas (AST):** nenhuma; encaminhamentos têm os efeitos das portas chamadas.
- **Contrato:** [f-8c86b54a123c80c0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8c86b54a123c80c0).

<!-- IMPACTO_FUNCOES_FIM -->
