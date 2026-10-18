# RE-003 — inventário final de impacto por função

Complemento do CONTRATO DE IMPACTO FUNCIONAL registrado antes das alterações em `2026-10-18-re003.md`. Base 1cafa59. Funções de produção dos módulos tocados estão individualizadas: nova, alterada ou reutilizada sem mudança. Assinaturas vêm do inventário AST oficial; o snapshot extenso usa o alias público equivalente ObservacaoReentrada. Dependências/escritas são evidências estáticas; efeitos indiretos seguem as portas chamadas. Nenhuma marca de revisão humana é acrescentada por geração.

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::validarComandoReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada: unknown): entrada is ComandoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Valida comando serializável por chaves exatas, finitude e limites; não executa.
- **Dependências diretas:** `Array.isArray`, `Object.hasOwn`, `Object.keys`, `chaves[e.tipo].every`, `Number.isFinite`, `Math.abs`, `[e.dianteiroRad, e.traseiroRad].every`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-52a010df6b7f3e6e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-52a010df6b7f3e6e).

## Alterada: `src/cenarios/EnsaioReentrada.ts::configurarReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada?: EntradaConfiguracaoReentrada): ConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Cria configuração copiada, validada e congelada; os limiares térmicos padrão foram definidos pelo operador, não representam estrutura interna/qualificação.
- **Dependências diretas:** `copiarSnapshot`, `configurarParametrosReentrada`, `configurarFronteiraAproximacao`, `Number.isFinite`, `Error`, `Number.isSafeInteger`, `Math.abs`, `Math.round`, `Object.values(c.corredor).every`, `Object.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f88e23012b3ae8c3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f88e23012b3ae8c3).

## Nova: `src/cenarios/EnsaioReentrada.ts::exigirCamposConfiguracao:FunctionDeclaration`

- **Assinatura:** `(valor: unknown, referencia: object, prefixo: string, ignorados?: readonly string[]): void`.
- **Responsabilidade / invariantes / efeitos:** Exige campos próprios conhecidos, sem undefined nem omissão. Validação de valores/unidades permanece nas regras do cenário; não cria objetos físicos. O campo legado não editável pode ser omitido explicitamente pela interface.
- **Dependências diretas:** `Array.isArray`, `Error`, `Object.keys`, `ignorados.includes`, `Object.hasOwn`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-25970cc620e51b6d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-25970cc620e51b6d).

## Nova: `src/cenarios/EnsaioReentrada.ts::validarConfiguracaoExplicitaReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada: unknown): ConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Fronteira estrita para formulários: exige todos os parâmetros editáveis em SI antes da validação/congelamento de domínio. Somente transferência legada, ausente da interface, usa a referência declarada. Não altera fábrica parcial, física, relógio ou configuração de ensaios existentes. Testes RE-003 A–G.
- **Dependências diretas:** `exigirCamposConfiguracao`, `configurarReentrada`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a01ba13dc3b415ea](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a01ba13dc3b415ea).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::estadoModulo:FunctionDeclaration`

- **Assinatura:** `(e: EstadoFisico, x: number, y: number): EstadoFisico`.
- **Responsabilidade / invariantes / efeitos:** Constrói somente estado inicial de módulo: pose relativa rígida e velocidade v+ω×r em SI. Não é usada para reposicionar objetos durante o ensaio.
- **Dependências diretas:** `Vetor3`, `Math.cos`, `Math.sin`, `e.posicaoM.adicionar`, `e.velocidadeMps.adicionar`, `e.velocidadeAngularRadps.produtoVetorial`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-532e693d7fa63ff9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-532e693d7fa63ff9).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada?: EntradaConfiguracaoReentrada): { configuracao: ConfiguracaoReentrada; ambiente: AmbienteTerrestre; perfil: PerfilAtmosfericoReentrada; mundo: MundoFisico; orbitador: OrbitadorReentrada; flaps: FlapReentrada[]; bateria: Bateria; fixadores: FixadorEstrutural[]; objetos: readonly Objeto[]; sensores: SensoresVeiculoComposto; solo: SuperficieEsferica; }`.
- **Responsabilidade / invariantes / efeitos:** Fábrica ADM de corpos reais e vínculos no mesmo MundoFisico. Vácuo é explícito; atmosfera RE é opt-in. Terra estática, XY; padrão 1/240 s, máximo exploratório 1/120 s. Fonte enclausurada.
- **Dependências diretas:** `configurarReentrada`, `AmbienteTerrestre`, `PerfilAtmosfericoReentrada`, `MundoFisico`, `criarEstadoInicialLocal`, `Math.cos`, `Math.sin`, `OrbitadorReentrada`, `Bateria`, `Vetor3`, `[0, 1].map`, `mundo.registrarObjeto`, `FixadorEstrutural`, `fixadores.push`, `mundo.registrarFixador`, `SuperficieEsferica`, `mundo.registrarSuperficie`, `SensoresVeiculoComposto`, `mundo.registrarSensoresVeiculo`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8fc45f499c16a562](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8fc45f499c16a562).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada.[callback]#2.operacaoAutorizada:ArrowFunction`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Permissivo do atuador: vínculo íntegro e corpo vivo; não produz força.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-974c61344181bb4f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-974c61344181bb4f).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada.obterEsforcoSolicitadoN:ArrowFunction`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Sem solicitação operacional extra; impactos são registrados pelo core. Esforço aerodinâmico distribuído de vínculos não é qualificado neste ensaio.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f310bba164029a51](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f310bba164029a51).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::geometriaConjunto:FunctionDeclaration`

- **Assinatura:** `(c: CenarioReentrada): { membros: Objeto[]; massaKg: number; centroM: Vetor3; inerciaKgM2: number; }`.
- **Responsabilidade / invariantes / efeitos:** Calcula massa/CM/inércia instantâneos somente dos módulos ainda conectados. Diagnóstico, não segunda cópia de posições nem um integrador.
- **Dependências diretas:** `c.objetos.filter`, `membros.reduce`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-79e1834474e775f0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-79e1834474e775f0).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.constructor:Constructor`

- **Assinatura:** `(entrada?: EntradaConfiguracaoReentrada): EnsaioReentrada`.
- **Responsabilidade / invariantes / efeitos:** Monta controles por portas de leitura, registra adaptador de pouso desabilitado sem motores, e registra hipóteses/revisão. Não inicia execução ou ignição.
- **Dependências diretas:** `GerenciadorDeControladores`, `Map`, `BalancoAngular`, `criarCenarioReentrada`, `RegistroExtremos`, `Math.round`, `ControladorReentrada`, `this.gerenciador.registrar`, `ControladorAproximacao`, `ControladorPousoDePropulsores`, `pouso.configurar`, `this.gerenciador.habilitar`, `this.controlador.desabilitar`, `SupervisorRecuperacao`, `this.supervisor.definirAutomatico`, `this.atualizarSupervisor`, `this.evento`, `this.extremos.registrar`, `this.lerMetricasPasso`.
- **Escritas diretas:** `this.id`, `this.passoS`, `this.configuracao`, `this.passos`, `this.execucao`, `this.cenario`, `this.gerenciador`, `this.controlador`, `this.supervisor`, `this.eventos`, `this.condicoesRegistradas`, `this.energiaDissipadaJ`, `this.balancoAngular`, `this.extremos`, `this.sequenciaEvento`, `this.eventosDescartados`.
- **Contrato:** [f-34fba91cf8789bd5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-34fba91cf8789bd5).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.passosExecutados:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Índice exato usado pela agenda reproduzível.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-675d2c66285d618a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-675d2c66285d618a).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.estadoExecucao:GetAccessor`

- **Assinatura:** `(): EstadoExecucaoMissao`.
- **Responsabilidade / invariantes / efeitos:** Consulta execução real; pausa não altera estado físico.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a7a4e68b04548ca1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a7a4e68b04548ca1).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.iniciar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Autoriza passos simulados, sem alterar trajetória.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.execucao`.
- **Contrato:** [f-cd5bce11227c4b08](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cd5bce11227c4b08).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.pausar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Suspende executor mantendo corpos e fila operacional.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.execucao`.
- **Contrato:** [f-862b111fdbd503d8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-862b111fdbd503d8).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.obterEventos:MethodDeclaration`

- **Assinatura:** `(): readonly EventoMissao[]`.
- **Responsabilidade / invariantes / efeitos:** Eventos são copiados/congelados para consumidores.
- **Dependências diretas:** `copiarSnapshot`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-6a94dcd54d1a0d5d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6a94dcd54d1a0d5d).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.receberComando:MethodDeclaration`

- **Assinatura:** `(comando: ComandoReentrada): ResultadoComandoMissao`.
- **Responsabilidade / invariantes / efeitos:** Aplica comandos públicos e registra aceitação/bloqueio. Comando manual exige seleção manual; aproximação passa pelo supervisor e pouso direto é bloqueado.
- **Dependências diretas:** `validarComandoReentrada`, `this.supervisor.observar`, `['modo', 'alvos', 'flaps', 'rolagem'].includes`, `this.gerenciador.habilitar`, `this.gerenciador.desabilitar`, `c.flaps.forEach`, `this.controlador.configurarAlvos`, `c.flaps[0].solicitarDeflexaoRad`, `c.flaps[1].solicitarDeflexaoRad`, `c.orbitador.solicitarRolagem`, `this.supervisor.definirAutomatico`, `this.supervisor.solicitarAproximacao`, `this.atualizarSupervisor`, `this.supervisor.observar().requisitos.filter(r => !r.atendido).map(r => r.descricao).join`, `this.supervisor.observar().requisitos.filter(r => !r.atendido).map`, `this.supervisor.observar().requisitos.filter`, `c.orbitador.definirDisponibilidadeRolagem`, `c.fixadores[comando.indice].liberar`, `this.evento`.
- **Escritas diretas:** `aceito`, `motivo`.
- **Contrato:** [f-ea3e069c929c0c05](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ea3e069c929c0c05).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.avancarPasso:MethodDeclaration`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Consome solicitações arbitradas e avança um único passo no mundo compartilhado. Não encerra por tempo/evento intermediário. Registra quadratura do torque e resíduo de L intrínseco, sem correção UI. Contato/ruptura sinaliza balanço incompleto.
- **Dependências diretas:** `this.atualizarSupervisor`, `this.gerenciador.calcularSolicitacoes`, `c.sensores.obterLeituras`, `c.flaps.find(f => f.id === s.idAtuador)?.solicitarDeflexaoRad`, `c.flaps.find`, `c.orbitador.solicitarRolagem`, `c.objetos.reduce`, `geometriaConjunto`, `diagnosticarMomentoAngular`, `c.mundo.obterCargasAerodinamicas`, `c.mundo.avancar`, `c.mundo.obterDiagnosticoAngularDoPasso`, `this.balancoAngular.registrar`, `c.mundo.obterContatosComSuperficie`, `this.registrarCondicoes`, `this.extremos.registrar`, `this.lerMetricasPasso`.
- **Escritas diretas:** `this.passos`, `this.energiaDissipadaJ`.
- **Contrato:** [f-6c85c671f0b775b6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6c85c671f0b775b6).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.observar:MethodDeclaration`

- **Assinatura:** `(): ObservacaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Observação escalar/geométrica e balanço angular, copiada e congelada. Torque gravítico é o gradiente entre centros dos membros, não distribuição interna. Resíduo usa cargas efetivamente integradas; contatos/fontes impulsivas são sinalizados. Não oferece objetos mutáveis nem corrige estado.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `c.mundo.obterCondicoesAtmosfericas`, `c.orbitador.avaliar`, `geometriaConjunto`, `c.mundo.obterCargasAerodinamicas`, `cargas.forcaN.multiplicar`, `c.mundo.obterGravidadeMps2`, `c.ambiente.referencial.vetorParaLocal`, `g.membros.reduce`, `copiarSnapshot`, `this.extremos.observar`, `c.ambiente.referencial.altitudeGeometricaM`, `c.ambiente.referencial.posicaoHorizontalM`, `Math.atan2`, `e.posicaoM.subtrair`, `c.ambiente.referencial.atitudeLocalRad`, `c.orbitador.observarRolagem`, `this.controlador.observar`, `c.orbitador.obterHistoricoRolagem`, `this.supervisor.observar`, `this.gerenciador.obterUltimaArbitragem`, `gravidade.adicionar`, `diagnosticarMomentoAngular`, `this.balancoAngular.observar`, `c.mundo.obterDiagnosticoAngularDoPasso`, `c.mundo.obterContatosComSuperficie`, `aceleracaoAero.produtoEscalar`, `Math.max`, `c.objetos.reduce`, `c.orbitador.obterPotenciaAquecimentoAerodinamicoW`, `c.mundo.obterForcaArrastoAtmosferico(c.orbitador).produtoEscalar`, `c.mundo.obterForcaArrastoAtmosferico`, `e.velocidadeMps.subtrair`, `c.flaps.some`, `c.mundo.obterContatosComSuperficie().some`, `c.flaps.map`, `c.fixadores.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-05755a69bc286c7f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-05755a69bc286c7f).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.lerControle:MethodDeclaration`

- **Assinatura:** `(): { alphaRad: number; taxaArfagemRadps: number; taxaFluxoRadps: number; pressaoDinamicaPa: number; fluxoTermicoWm2: number; cargaG: number; torquePassivoNm: number; energiaMecanicaEspecificaJPorKg: number; integridadeMinima: number; inerciaKgM2: number; phiRad: number; disponivel: boolean; }`.
- **Responsabilidade / invariantes / efeitos:** Telemetria física para PD; calcula derivada angular do fluxo por v×a/|v|², sem diferenciar relógio real ou alterar estado. Torque passivo exclui lift ativo.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `geometriaConjunto`, `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `c.mundo.obterCargasAerodinamicas`, `c.mundo.obterGravidadeMps2(e.posicaoM).adicionar`, `c.mundo.obterGravidadeMps2`, `cargas.forcaN.multiplicar`, `e.velocidadeMps.subtrair`, `c.flaps.reduce`, `v.produtoVetorial`, `e.posicaoM.subtrair`, `Math.min`, `g.membros.map`, `c.orbitador.observarRolagem`, `c.flaps.every`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2db95d019a3477f5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2db95d019a3477f5).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.atualizarSupervisor:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Avalia estado real, autoridade remanescente e filtros A/B sem reutilizar limites antigos de pouso. Não há propulsão nem integração física de aproximação.
- **Dependências diretas:** `c.sensores.obterLeituras`, `this.supervisor.observar`, `this.lerControle`, `Math.min`, `c.flaps.map`, `Math.abs`, `Math.cos`, `this.supervisor.atualizar`, `Math.hypot`, `this.controlador.observar`, `c.flaps.every`, `this.evento`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b5dfd4d0081ccbd9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b5dfd4d0081ccbd9).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.registrarCondicoes:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Registra arestas de falha/recuperação de condições, não repete eventos por frame. Colisão, dano e separação não encerram evolução física.
- **Dependências diretas:** `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `c.flaps.some`, `this.controlador.observar`, `c.fixadores.some`, `c.mundo.obterContatosComSuperficie`, `this.supervisor.observar`, `this.lerControle`, `c.perfil.amostrar`, `c.ambiente.referencial.altitudeGeometricaM`, `c.orbitador.getEstadoFisico`, `c.orbitador.observarRolagem`, `c.flaps.entries`, `Math.max`, `c.flaps.map`, `Object.entries`, `this.condicoesRegistradas.get`, `this.evento`, `this.condicoesRegistradas.set`.
- **Escritas diretas:** `condicoes[`degradacao-flap-${i + 1}`]`, `condicoes[`colapso-flap-${i + 1}`]`, `valores[`degradacao-flap-${i + 1}`]`, `valores[`colapso-flap-${i + 1}`]`.
- **Contrato:** [f-5dacbb18677d6f4c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5dacbb18677d6f4c).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.evento:MethodDeclaration`

- **Assinatura:** `(tipo: string, descricao: string, categoria?: EventoMissao["categoria"], dados?: EventoMissao["dados"]): void`.
- **Responsabilidade / invariantes / efeitos:** Acrescenta evento no tempo de missão, com sequência estável e categoria.
- **Dependências diretas:** `this.eventos.push`, `this.eventos.splice`.
- **Escritas diretas:** `this.sequenciaEvento`, `this.eventosDescartados`.
- **Contrato:** [f-593973bfbdc79c20](../arquitetura/CATALOGO_DE_FUNCOES.md#f-593973bfbdc79c20).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.lerMetricasPasso:MethodDeclaration`

- **Assinatura:** `(): Readonly<Record<string, number>>`.
- **Responsabilidade / invariantes / efeitos:** Coleta canais físicos SI em todo passo, antes de qualquer redução visual. Sem cópia de trajetória ou recalibração de forças. Chaves/unidades acompanham o diário; extremos têm passo e instante e não dependem da renderização.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `this.lerControle`, `normalizarAngulo`, `this.controlador.observar`, `c.ambiente.referencial.altitudeGeometricaM`, `e.posicaoM.subtrair`, `c.mundo.obterDiagnosticoAngularDoPasso`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-08107e4693116363](../arquitetura/CATALOGO_DE_FUNCOES.md#f-08107e4693116363).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.obterIdentificacao:MethodDeclaration`

- **Assinatura:** `(): object`.
- **Responsabilidade / invariantes / efeitos:** Exporta identificação completa/revisões para o decorador de diário compartilhado.
- **Dependências diretas:** `copiarSnapshot`, `this.cenario.mundo.obterConfiguracaoFisica`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4987311594a9418d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4987311594a9418d).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::criarEnsaioReentrada:FunctionDeclaration`

- **Assinatura:** `(configuracao?: EntradaConfiguracaoReentrada): RegistroMissao<ComandoReentrada, { id: string; tempoS: number; passo: number; execucao: EstadoExecucaoMissao; estado: EstadoFisico; extremos: { globais: Record<string, FaixaTemporal>; intervaloAtual: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; }; ultimoIntervalo: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; } | null; }; eventosDescartados: number; altitudeM: number; arcoM: number; velocidadeMps: number; trajetoriaRad: number; velocidadeRadialMps: number; velocidadeTangencialMps: number; energiaMecanicaEspecificaJPorKg: number; atitudeInercialRad: number; atitudeLocalRad: number; aerodinamica: CargasReentrada; rolagem: EstadoRolagemVirtual; controle: { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; torqueSolicitadoNm: number; torqueComandadoNm: number; corredor: Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }> | null; }; historicoRolagem: readonly { readonly tempoS: number; readonly anguloRad: number; }[]; supervisor: { fase: "aproximacao" | "reentrada" | "falha"; automatico: boolean; candidatoCinematico: boolean; autorizado: boolean; requisitos: readonly Readonly<RequisitoAproximacao>[]; limites: ConfiguracaoFronteiraAproximacao; avaliacao: Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }> | null; }; arbitragem: readonly SolicitacaoArbitrada[]; massaKg: number; inerciaKgM2: number; centroM: Vetor3; forcaAerodinamicaN: Vetor3; torqueAerodinamicoNm: number; aceleracaoMps2: Vetor3; rotacao: { cargasEfetivamenteIntegradas: { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | null; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; fontesImpulsivas: boolean; impulsoTorqueNmS: number; residuoPassoKgM2ps: number; residuoAcumuladoKgM2ps: number; residuoMaximoPassoKgM2ps: number; passosIncompletos: number; massaKg: number; centroM: Vetor3; velocidadeCentroMps: Vetor3; inerciaKgM2: number; momentoIntrinsecoKgM2ps: number; momentoOrbitalKgM2ps: number; momentoTotalKgM2ps: number; omegaInercialRadps: number; torqueGravitacionalNm: number; }; cargaG: number; desaceleracaoMps2: number; temperaturaC: number; integridade: number; limiteOrbitadorC: number; limiteFlapsC: number; energiaAbsorvidaJ: number; energiaDissipadaJ: number; energiaAtmosferaJ: number; respostaTermica: { energiaAbsorvidaCorpoJ: number; modelo: string; tetoUniversal: boolean; potenciaIndicadorCorpoW: number; potenciaTransferidaCorpoW: number; tpsInstalado: boolean; camadasInternasModeladas: boolean; }; estadosTerminais: { corpoDestruido: boolean; controlePerdido: boolean; contato: boolean; impactoDestrutivo: boolean; }; dissipacaoW: number; calorTransferidoW: number; potenciaAtmosferaW: number; energiaBateriaJ: number; temperaturaBateriaC: number; integridadeBateria: number; limiteBateriaC: number; flaps: { id: string; estado: EstadoFisico; comandoRad: number; deflexaoRad: number; integridade: number; temperaturaC: number; energiaAbsorvidaJ: number; conectado: boolean; fluxoTermicoIndicadorWm2: number; energizado: boolean; atuacao: { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; }; knudsenEstimado: number; modeloEscoamento: string; }[]; vinculos: { id: string; estado: "integro" | "rompido" | "liberado"; tracaoAtualN: number; picoTracaoN: number; resistenciaTracaoN: number; cisalhamentoFlexaoTorcaoModelados: boolean; }[]; raioTerraM: number; centroTerraM: Vetor3; propulsaoDisponivel: boolean; rcsDisponivel: boolean; }>`.
- **Responsabilidade / invariantes / efeitos:** Fábrica pública de ensaio registrável, sem relógio, DOM ou escrita externa.
- **Dependências diretas:** `EnsaioReentrada`, `RegistroMissao`, `ensaio.obterIdentificacao`, `Math.round`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-fbefc47b0a643060](../arquitetura/CATALOGO_DE_FUNCOES.md#f-fbefc47b0a643060).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::reproduzirEnsaioReentrada:FunctionDeclaration`

- **Assinatura:** `(diario: DiarioReentrada): RegistroMissao<ComandoReentrada, { id: string; tempoS: number; passo: number; execucao: EstadoExecucaoMissao; estado: EstadoFisico; extremos: { globais: Record<string, FaixaTemporal>; intervaloAtual: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; }; ultimoIntervalo: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; } | null; }; eventosDescartados: number; altitudeM: number; arcoM: number; velocidadeMps: number; trajetoriaRad: number; velocidadeRadialMps: number; velocidadeTangencialMps: number; energiaMecanicaEspecificaJPorKg: number; atitudeInercialRad: number; atitudeLocalRad: number; aerodinamica: CargasReentrada; rolagem: EstadoRolagemVirtual; controle: { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; torqueSolicitadoNm: number; torqueComandadoNm: number; corredor: Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }> | null; }; historicoRolagem: readonly { readonly tempoS: number; readonly anguloRad: number; }[]; supervisor: { fase: "aproximacao" | "reentrada" | "falha"; automatico: boolean; candidatoCinematico: boolean; autorizado: boolean; requisitos: readonly Readonly<RequisitoAproximacao>[]; limites: ConfiguracaoFronteiraAproximacao; avaliacao: Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }> | null; }; arbitragem: readonly SolicitacaoArbitrada[]; massaKg: number; inerciaKgM2: number; centroM: Vetor3; forcaAerodinamicaN: Vetor3; torqueAerodinamicoNm: number; aceleracaoMps2: Vetor3; rotacao: { cargasEfetivamenteIntegradas: { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | null; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; fontesImpulsivas: boolean; impulsoTorqueNmS: number; residuoPassoKgM2ps: number; residuoAcumuladoKgM2ps: number; residuoMaximoPassoKgM2ps: number; passosIncompletos: number; massaKg: number; centroM: Vetor3; velocidadeCentroMps: Vetor3; inerciaKgM2: number; momentoIntrinsecoKgM2ps: number; momentoOrbitalKgM2ps: number; momentoTotalKgM2ps: number; omegaInercialRadps: number; torqueGravitacionalNm: number; }; cargaG: number; desaceleracaoMps2: number; temperaturaC: number; integridade: number; limiteOrbitadorC: number; limiteFlapsC: number; energiaAbsorvidaJ: number; energiaDissipadaJ: number; energiaAtmosferaJ: number; respostaTermica: { energiaAbsorvidaCorpoJ: number; modelo: string; tetoUniversal: boolean; potenciaIndicadorCorpoW: number; potenciaTransferidaCorpoW: number; tpsInstalado: boolean; camadasInternasModeladas: boolean; }; estadosTerminais: { corpoDestruido: boolean; controlePerdido: boolean; contato: boolean; impactoDestrutivo: boolean; }; dissipacaoW: number; calorTransferidoW: number; potenciaAtmosferaW: number; energiaBateriaJ: number; temperaturaBateriaC: number; integridadeBateria: number; limiteBateriaC: number; flaps: { id: string; estado: EstadoFisico; comandoRad: number; deflexaoRad: number; integridade: number; temperaturaC: number; energiaAbsorvidaJ: number; conectado: boolean; fluxoTermicoIndicadorWm2: number; energizado: boolean; atuacao: { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; }; knudsenEstimado: number; modeloEscoamento: string; }[]; vinculos: { id: string; estado: "integro" | "rompido" | "liberado"; tracaoAtualN: number; picoTracaoN: number; resistenciaTracaoN: number; cisalhamentoFlexaoTorcaoModelados: boolean; }[]; raioTerraM: number; centroTerraM: Vetor3; propulsaoDisponivel: boolean; rcsDisponivel: boolean; }>`.
- **Responsabilidade / invariantes / efeitos:** Reexecuta agenda no mesmo modelo/runtime; rejeita revisão, entradas e resultados divergentes. Pausa/exportação não reproduzem relógio real. O custo é proporcional ao número de passos físicos do diário; chamada síncrona headless.
- **Dependências diretas:** `Number.isSafeInteger`, `Error`, `criarEnsaioReentrada`, `JSON.stringify`, `ensaio.exportar`, `Math.round`, `ensaio.observar`, `ensaio.iniciar`, `ensaio.pausar`, `ensaio.receberComando`, `ensaio.avancarPasso`.
- **Escritas diretas:** `indice`.
- **Contrato:** [f-af7e1ca547762556](../arquitetura/CATALOGO_DE_FUNCOES.md#f-af7e1ca547762556).

## Alterada: `src/reentrada.ts::iniciarBancada:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Fronteira de apresentação: lê controles, comanda portas de missão e desenha snapshots; tempo real serve apenas ao executor fixo, nunca à lei física.
- **Dependências diretas:** `elemento`, `Map`, `Object.entries`, `configurarParametrosReentrada`, `document.createElement`, `String`, `label.append`, `elemento('re-parametros').append`, `camposParametros.set`, `RenderizadorReentrada`, `iniciais.addEventListener`, `form.addEventListener`, `elemento('re-reset').addEventListener`, `elemento('re-continuar-aplicada').addEventListener`, `elemento('re-iniciar-nova').addEventListener`, `elemento('re-cancelar-escolha').addEventListener`, `modo.addEventListener`, `elemento('re-alvos').addEventListener`, `elemento(id).addEventListener`, `elemento('re-chaveamento').addEventListener`, `elemento('re-pouso').addEventListener`, `energia.addEventListener`, `elemento('re-falha-rolagem').addEventListener`, `elemento('re-separar').addEventListener`, `elemento('re-passo').addEventListener`, `elemento('re-exportar').addEventListener`, `preparar`, `requestAnimationFrame`.
- **Escritas diretas:** `label.textContent`, `input.type`, `input.step`, `input.required`, `input.id`, `input.value`.
- **Contrato:** [f-bdf1e31dbe2aa399](../arquitetura/CATALOGO_DE_FUNCOES.md#f-bdf1e31dbe2aa399).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.elemento:FunctionDeclaration`

- **Assinatura:** `<T extends HTMLElement>(id: string): T`.
- **Responsabilidade / invariantes / efeitos:** Resolve elemento obrigatório da página, falhando explicitamente se ausente.
- **Dependências diretas:** `document.getElementById`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-043a536f0ddd232b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-043a536f0ddd232b).

## Alterada: `src/reentrada.ts::iniciarBancada.numero:FunctionDeclaration`

- **Assinatura:** `(id: string): number`.
- **Responsabilidade / invariantes / efeitos:** Lê número explícito, rejeitando vazio, não finito e restrições HTML com diagnóstico do campo. Unidades físicas são validadas também no domínio.
- **Dependências diretas:** `elemento`, `input.value.trim`, `Number.isFinite`, `Number`, `Error`, `input.labels?.[0]?.textContent?.trim`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-125d2a3542b41de5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-125d2a3542b41de5).

## Nova: `src/reentrada.ts::iniciarBancada.opcao:FunctionDeclaration`

- **Assinatura:** `(id: string, permitidas: readonly string[]): string`.
- **Responsabilidade / invariantes / efeitos:** Valida seleção conhecida antes de convertê-la em estado inicial booleano.
- **Dependências diretas:** `elemento`, `permitidas.includes`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-00c81d5a7e7c47cb](../arquitetura/CATALOGO_DE_FUNCOES.md#f-00c81d5a7e7c47cb).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.rad:FunctionDeclaration`

- **Assinatura:** `(id: string): number`.
- **Responsabilidade / invariantes / efeitos:** Converte graus da interface para radianos explicitamente.
- **Dependências diretas:** `numero`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-1d3579ae29692539](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1d3579ae29692539).

## Alterada: `src/reentrada.ts::iniciarBancada.lerConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): ConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Lê configuração pré-ensaio; todas as conversões são explícitas e registradas.
- **Dependências diretas:** `validarConfiguracaoExplicitaReentrada`, `Object.fromEntries`, `[...camposParametros].map`, `numero`, `rad`, `opcao`, `elemento<HTMLInputElement>('re-alvo-arco').value.trim`, `elemento`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9f19a52f59d415b4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9f19a52f59d415b4).

## Nova: `src/reentrada.ts::iniciarBancada.capturarCamposConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): Readonly<Record<string, string>>`.
- **Responsabilidade / invariantes / efeitos:** Captura somente valores de configuração, inclusive restaurados sem eventos. As strings detectam edição; não substituem a configuração física validada.
- **Dependências diretas:** `Object.fromEntries`, `[...iniciais.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')]
    .map`, `iniciais.querySelectorAll`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4edb2d339a14b022](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4edb2d339a14b022).

## Nova: `src/reentrada.ts::iniciarBancada.atualizarEstadoConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Mostra pendência comparando o formulário com a última preparação. Consulta apenas strings e snapshot aplicado; nunca exporta todo o diário por frame.
- **Dependências diretas:** `JSON.stringify`, `capturarCamposConfiguracao`, `elemento`, `String`.
- **Escritas diretas:** `estado.dataset.pendente`, `estado.textContent`, `elemento('re-config-rastreio').textContent`.
- **Contrato:** [f-9662794860c9ef0a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9662794860c9ef0a).

## Nova: `src/reentrada.ts::iniciarBancada.rejeitarConfiguracao:FunctionDeclaration`

- **Assinatura:** `(erro: unknown): void`.
- **Responsabilidade / invariantes / efeitos:** Rejeição pertence à apresentação e não altera o diário do ensaio anterior.
- **Dependências diretas:** `String`, `atualizarEstadoConfiguracao`.
- **Escritas diretas:** `rejeicoes`, `mensagem.textContent`.
- **Contrato:** [f-a0d4388c173e901d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a0d4388c173e901d).

## Alterada: `src/reentrada.ts::iniciarBancada.preparar:FunctionDeclaration`

- **Assinatura:** `(configuracao?: ConfiguracaoReentrada): boolean`.
- **Responsabilidade / invariantes / efeitos:** Recria pela fábrica após leitura/validação única; só substitui instância após construção bem sucedida. Confirma valores do diário retornado pelo domínio, sem reescrever inputs ou materiais do ensaio anterior. Testes RE-003 A–G.
- **Dependências diretas:** `ensaio.pausar`, `executor?.suspenderReferenciaRelogio`, `criarEnsaioReentrada`, `lerConfiguracao`, `novo.exportar`, `ExecutorPassoFixo`, `novo.observar`, `capturarCamposConfiguracao`, `Math.round`, `elemento`, `String`, `cancelarEscolhaConfiguracao`, `atualizarEstadoConfiguracao`, `atualizarPainel`, `rejeitarConfiguracao`.
- **Escritas diretas:** `iniciais.disabled`, `ensaio`, `aplicada`, `executor`, `historico`, `camposAplicados`, `numeroPreparo`, `intervaloVisualPassos`, `limiteVisualAmostras`, `e.min`, `e.max`, `e.value`, `eventosMostrados`, `ultimaAtualizacaoMs`, `modo.value`, `elemento<HTMLInputElement>('re-alpha-alvo').value`, `elemento<HTMLInputElement>('re-phi-alvo').value`, `elemento('re-config-aplicada').textContent`, `mensagem.textContent`.
- **Contrato:** [f-c51586eefc46d9d2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c51586eefc46d9d2).

## Nova: `src/reentrada.ts::iniciarBancada.garantirConfiguracaoParaInicio:FunctionDeclaration`

- **Assinatura:** `(acao: "executar" | "passo"): boolean`.
- **Responsabilidade / invariantes / efeitos:** Nenhum novo início/passo depende de evento de edição. Revalida o formulário; ensaio pausado com edição exige escolha, inclusive se a edição for inválida.
- **Dependências diretas:** `JSON.stringify`, `capturarCamposConfiguracao`, `atualizarEstadoConfiguracao`, `elemento`, `elemento('re-continuar-aplicada').focus`, `lerConfiguracao`, `preparar`, `rejeitarConfiguracao`.
- **Escritas diretas:** `acaoPendente`, `elemento('re-config-escolha').hidden`, `mensagem.textContent`.
- **Contrato:** [f-9b4f1d58114ea0f6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9b4f1d58114ea0f6).

## Nova: `src/reentrada.ts::iniciarBancada.executarAcaoPreparada:FunctionDeclaration`

- **Assinatura:** `(acao: "executar" | "passo"): void`.
- **Responsabilidade / invariantes / efeitos:** Executa somente sobre instância já escolhida/validada; tempo real fica na apresentação. Passo manual avança exatamente 1 s usando dt configurado.
- **Dependências diretas:** `cancelarEscolhaConfiguracao`, `ensaio.iniciar`, `executor.suspenderReferenciaRelogio`, `Math.round`, `avancar`, `ensaio.pausar`, `atualizarPainel`, `ensaio.observar`.
- **Escritas diretas:** `i`, `ultimaAtualizacaoMs`.
- **Contrato:** [f-f954882670778897](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f954882670778897).

## Nova: `src/reentrada.ts::iniciarBancada.tratarExecucao:FunctionDeclaration`

- **Assinatura:** `(evento: SubmitEvent): void`.
- **Responsabilidade / invariantes / efeitos:** Handler de início/pausa: pausar não valida nem aplica edições.
- **Dependências diretas:** `evento.preventDefault`, `ensaio.pausar`, `executor?.suspenderReferenciaRelogio`, `atualizarPainel`, `ensaio.observar`, `garantirConfiguracaoParaInicio`, `executarAcaoPreparada`.
- **Escritas diretas:** `ultimaAtualizacaoMs`.
- **Contrato:** [f-3761f7ab8221f2db](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3761f7ab8221f2db).

## Nova: `src/reentrada.ts::iniciarBancada.reinicializar:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Reinicialização explícita aplica a edição e conserva novo ensaio no passo 0.
- **Dependências diretas:** `cancelarEscolhaConfiguracao`, `preparar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-cb43a54875d00a72](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cb43a54875d00a72).

## Nova: `src/reentrada.ts::iniciarBancada.avancarUmSegundo:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Avanço manual usa a mesma validação e a mesma escolha da execução contínua.
- **Dependências diretas:** `garantirConfiguracaoParaInicio`, `executarAcaoPreparada`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2c6793de2a48e002](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2c6793de2a48e002).

## Nova: `src/reentrada.ts::iniciarBancada.cancelarEscolhaConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Fecha escolha sem tocar em corpos, diário ou valores digitados.
- **Dependências diretas:** `elemento`.
- **Escritas diretas:** `acaoPendente`, `elemento('re-config-escolha').hidden`.
- **Contrato:** [f-0245250bccc43c18](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0245250bccc43c18).

## Nova: `src/reentrada.ts::iniciarBancada.continuarConfiguracaoAplicada:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Retoma explicitamente a configuração anterior mesmo com edição inválida; preserva edição e agenda física anterior. Não reinterpreta inputs como comandos.
- **Dependências diretas:** `executarAcaoPreparada`.
- **Escritas diretas:** `mensagem.textContent`.
- **Contrato:** [f-aa238813e3495b38](../arquitetura/CATALOGO_DE_FUNCOES.md#f-aa238813e3495b38).

## Nova: `src/reentrada.ts::iniciarBancada.iniciarNovaConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Troca de ensaio só após validação bem sucedida da edição atual.
- **Dependências diretas:** `preparar`, `executarAcaoPreparada`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5a22c7b79b3d9a12](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5a22c7b79b3d9a12).

## Nova: `src/reentrada.ts::iniciarBancada.exportarDiario:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Exporta somente o ensaio aplicado, identificando edição pendente. Antes de existir um ensaio válido não fabrica um diário com defaults. Download local.
- **Dependências diretas:** `Blob`, `JSON.stringify`, `ensaio.exportar`, `URL.createObjectURL`, `document.createElement`, `link.click`, `URL.revokeObjectURL`, `atualizarEstadoConfiguracao`, `elemento`.
- **Escritas diretas:** `mensagem.textContent`, `link.href`, `link.download`.
- **Contrato:** [f-e5c5a5583589aedc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e5c5a5583589aedc).

## Alterada: `src/reentrada.ts::iniciarBancada.comandar:FunctionDeclaration`

- **Assinatura:** `(c: ComandoReentrada): void`.
- **Responsabilidade / invariantes / efeitos:** Encaminha intenção e apresenta diagnóstico real, sem duplicar estados.
- **Dependências diretas:** `Error`, `ensaio.receberComando`, `String`.
- **Escritas diretas:** `mensagem.textContent`, `ultimaAtualizacaoMs`.
- **Contrato:** [f-cf79be1a17c2b2c7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cf79be1a17c2b2c7).

## Alterada: `src/reentrada.ts::iniciarBancada.avancar:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Executa um passo fixo e registra amostra visual a cada segundo simulado. O diário compartilha coleta configurada e informa retenção/descartes; extremos são medidos em todo passo.
- **Dependências diretas:** `ensaio?.avancarPasso`, `historico.push`, `ensaio.observar`, `historico.shift`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9085698dbe6b0394](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9085698dbe6b0394).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.metrica:FunctionDeclaration`

- **Assinatura:** `(id: string, nome: string, valor: string): void`.
- **Responsabilidade / invariantes / efeitos:** Atualiza valor de telemetria em nó persistente, evitando reconstrução por frame.
- **Dependências diretas:** `metricas.get`, `document.createElement`, `caixa.append`, `elemento('re-telemetria').append`, `elemento`, `metricas.set`.
- **Escritas diretas:** `caixa.className`, `titulo.textContent`, `e`, `e.dataset.metrica`, `e.textContent`.
- **Contrato:** [f-0a8b2119bcaf62bf](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0a8b2119bcaf62bf).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.graus:FunctionDeclaration`

- **Assinatura:** `(rad: number): string`.
- **Responsabilidade / invariantes / efeitos:** Converte radianos observados para graus de apresentação.
- **Dependências diretas:** `(rad * 180 / Math.PI).toFixed`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8a757acdc377f6ca](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8a757acdc377f6ca).

## Alterada: `src/reentrada.ts::iniciarBancada.atualizarPainel:FunctionDeclaration`

- **Assinatura:** `(o: ObservacaoReentrada): void`.
- **Responsabilidade / invariantes / efeitos:** Renderiza comandos, estado físico e variáveis virtuais explicitamente distintos.
- **Dependências diretas:** `metrica`, `o.altitudeM.toFixed`, `o.velocidadeMps.toFixed`, `graus`, `a.mach.toFixed`, `a.pressaoDinamicaPa.toPrecision`, `a.sustentacaoN.toFixed`, `a.sustentacaoXYN.toFixed`, `a.arrastoN.toFixed`, `a.sustentacaoLateralOmitidaN.toFixed`, `o.cargaG.toFixed`, `o.desaceleracaoMps2.toFixed`, `o.aceleracaoMps2.x.toFixed`, `o.aceleracaoMps2.y.toFixed`, `o.torqueAerodinamicoNm.toFixed`, `a.centroPressaoLocalM.toFixed`, `a.fluxoTermicoIndicadorWm2.toPrecision`, `o.temperaturaC.toFixed`, `(100 * o.integridade).toFixed`, `o.massaKg.toFixed`, `o.energiaAbsorvidaJ.toPrecision`, `o.dissipacaoW.toPrecision`, `o.calorTransferidoW.toPrecision`, `o.potenciaAtmosferaW.toPrecision`, `a.knudsen.toPrecision`, `o.estado.velocidadeAngularRadps.z.toPrecision`, `o.rotacao.momentoIntrinsecoKgM2ps.toPrecision`, `o.rotacao.momentoOrbitalKgM2ps.toPrecision`, `o.inerciaKgM2.toPrecision`, `o.rotacao.torqueGravitacionalNm.toPrecision`, `(o.rotacao.cargasEfetivamenteIntegradas?.torqueOutrosContinuosNm ?? 0).toPrecision`, `o.rotacao.residuoPassoKgM2ps.toPrecision`, `o.rotacao.residuoAcumuladoKgM2ps.toPrecision`, `o.energiaMecanicaEspecificaJPorKg.toPrecision`, `o.velocidadeRadialMps.toFixed`, `o.velocidadeTangencialMps.toFixed`, `o.extremos.globais.pressaoDinamicaPa.maximo.valor.toPrecision`, `o.extremos.globais.fluxoTermicoIndicadorWm2.maximo.valor.toPrecision`, `o.respostaTermica.potenciaIndicadorCorpoW.toPrecision`, `o.respostaTermica.potenciaTransferidaCorpoW.toPrecision`, `o.controle.torqueSolicitadoNm.toPrecision`, `fronteira.distanciaRestanteM.toFixed`, `fronteira.hipoteses.map(h => `${h.aceleracaoLiquidaMps2} m/s² → ${h.velocidadeLimiteNecessariaMps?.toFixed(0)} m/s (desvio ${h.desvioVelocidadeMps?.toFixed(0)})`).join`, `fronteira.hipoteses.map`, `o.energiaBateriaJ.toFixed`, `o.temperaturaBateriaC.toFixed`, `(100 * o.integridadeBateria).toFixed`, `o.flaps.entries`, `f.temperaturaC.toFixed`, `(100 * f.integridade).toFixed`, `atualizarEstadoConfiguracao`, `elemento`, `o.flaps.every`, `o.tempoS.toFixed`, `aplicada!.passoS.toPrecision`, `executor!.tempoPendenteS.toFixed`, `diagnostico.replaceChildren`, `document.createElement`, `r.atual.toPrecision`, `linha.append`, `diagnostico.append`, `ensaio?.obterEventos`, `eventos.at`, `lista.replaceChildren`, `eventos.slice`, `evento.tempoS.toFixed`, `lista.append`.
- **Escritas diretas:** `play.textContent`, `iniciais.disabled`, `manuais.disabled`, `modo.value`, `modo.disabled`, `elemento<HTMLButtonElement>('re-passo').disabled`, `elemento<HTMLSelectElement>('re-chaveamento').value`, `energia.textContent`, `elemento('re-tempo-real').textContent`, `linha.className`, `descricao.textContent`, `valor.textContent`, `li.textContent`, `eventosMostrados`.
- **Contrato:** [f-886d03c02bf67e85](../arquitetura/CATALOGO_DE_FUNCOES.md#f-886d03c02bf67e85).

## Alterada: `src/reentrada.ts::iniciarBancada.quadro:FunctionDeclaration`

- **Assinatura:** `(timestamp: number): void`.
- **Responsabilidade / invariantes / efeitos:** Cooperação da apresentação: orçamento 8 ms/quadro, mantém dívida temporal. Pausa em erro explícito e conserva diagnóstico; não declara sucesso/repouso.
- **Dependências diretas:** `performance.now`, `executor.avancarAte`, `numero`, `ensaio?.observar`, `renderer.desenhar`, `atualizarPainel`, `atualizarEstadoConfiguracao`, `renderer.desenharGraficos`, `ensaio?.pausar`, `String`, `requestAnimationFrame`.
- **Escritas diretas:** `ultimaAtualizacaoMs`, `mensagem.textContent`.
- **Contrato:** [f-081506ae1d0d1404](../arquitetura/CATALOGO_DE_FUNCOES.md#f-081506ae1d0d1404).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.quadro.continuar:ArrowFunction`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Orçamento visual em ms; interrompe lote, preservando dívida e dt físico.
- **Dependências diretas:** `performance.now`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8c86b54a123c80c0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8c86b54a123c80c0).

## Nova: `scripts/smoke-configuracao-re003.ts::validarInterfaceConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): Promise<void>`.
- **Responsabilidade / invariantes / efeitos:** Testes A–G do RE-003 no build real: inputs, início, pausa/escolha, reset, validação e downloads. Não modifica instâncias físicas; a fábrica é conferida nos testes de domínio. Evidências separadas, desktop/mobile, sem deploy.
- **Dependências diretas:** `resolve`, `mkdirSync`, `preview`, `servidor.httpServer.address`, `chromium.launch`, `abrir`, `page.fill`, `page.evaluate`, `iniciarPausar`, `exportar`, `configuracao`, `assert.deepEqual`, `assert.equal`, `assert.match`, `page.locator('#re-config-aplicada').textContent`, `page.locator`, `page.locator('#re-iniciais').isEnabled`, `page.click`, `assert`, `page.locator('#re-config-escolha').isVisible`, `page.locator('#re-mensagem').textContent`, `page.inputValue`, `page.locator('summary').filter({ hasText: 'Parâmetros de engenharia' }).click`, `page.locator('summary').filter`, `page.locator('summary').filter({ hasText: 'Configuração avançada' }).click`, `page.screenshot`, `casos.push`, `page.close`, `browser.newPage`, `page.route`, `page.goto`, `page.waitForFunction`, `writeFileSync`, `JSON.stringify`, `console.log`, `browser.close`, `Promise`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-6243448c45e0a365](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6243448c45e0a365).

## Nova: `scripts/smoke-configuracao-re003.ts::validarInterfaceConfiguracao.exportar:FunctionDeclaration`

- **Assinatura:** `(page: Page, nome: string): Promise<DiarioReentrada>`.
- **Responsabilidade / invariantes / efeitos:** Baixa JSON real e conserva a evidência integral do ensaio aplicado.
- **Dependências diretas:** `Promise.all`, `page.waitForEvent`, `page.click`, `resolve`, `download.saveAs`, `JSON.parse`, `readFileSync`.
- **Escritas diretas:** `downloads`.
- **Contrato:** [f-2d05a4f5e37ea385](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2d05a4f5e37ea385).

## Nova: `scripts/smoke-configuracao-re003.ts::validarInterfaceConfiguracao.configuracao:FunctionDeclaration`

- **Assinatura:** `(diario: DiarioReentrada): ConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Consulta somente configuração da identificação oficial do diário.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-ca4e642a3640220a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ca4e642a3640220a).

## Nova: `scripts/smoke-configuracao-re003.ts::validarInterfaceConfiguracao.abrir:FunctionDeclaration`

- **Assinatura:** `(largura: number): Promise<Page>`.
- **Responsabilidade / invariantes / efeitos:** Abre página real, observa erros e expande as seções de configuração.
- **Dependências diretas:** `browser.newPage`, `page.on`, `page.goto`, `page.waitForSelector`, `page.locator('summary').filter({ hasText: 'Configuração avançada' }).click`, `page.locator('summary').filter`, `page.locator`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a223d9287819384a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a223d9287819384a).

## Nova: `scripts/smoke-configuracao-re003.ts::validarInterfaceConfiguracao.iniciarPausar:FunctionDeclaration`

- **Assinatura:** `(page: Page): Promise<void>`.
- **Responsabilidade / invariantes / efeitos:** Inicia e pausa pela UI, comprovando avanço positivo do relógio da missão.
- **Dependências diretas:** `page.click`, `page.waitForFunction`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f124caa617850c95](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f124caa617850c95).

## Nova: `scripts/validar-termica-re003.ts::validarLimiaresTermicos:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Ensaio H do RE-003: duas receitas SI idênticas salvo limiar 900/5000 °C. Executa o mesmo core a 1/240 s por 410 s de coleta, sem mudar leis, temperatura inicial, controles ou resistências. Compara trajetória antes do dano e observa início real de degradação; não exige sobrevivência após falhas. Escreve evidência separada, sem sobrescrever referências históricas e sem publicar resultados.
- **Dependências diretas:** `EnsaioReentrada`, `a.observar`, `b.observar`, `assert.deepEqual`, `iniciais[0].flaps.map`, `iniciais[1].flaps.map`, `a.iniciar`, `b.iniciar`, `assert`, `a.avancarPasso`, `b.avancarPasso`, `a.obterEventos().some`, `a.obterEventos`, `oa.flaps.some`, `ob.flaps.every`, `ob.flaps.some`, `oa.flaps.map`, `ob.flaps.map`, `amostras.push`, `b.obterEventos().some`, `b.obterEventos`, `mkdirSync`, `a.obterIdentificacao`, `b.obterIdentificacao`, `writeFileSync`, `JSON.stringify`, `console.log`, `resultado.finais.map`.
- **Escritas diretas:** `i`, `cruzamento`.
- **Contrato:** [f-f789e7f0f396e3e7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f789e7f0f396e3e7).

## Remoções

Nenhuma função de produção removida.
