# RE-004 — inventário final de impacto por função

Complemento do CONTRATO DE IMPACTO FUNCIONAL registrado antes das alterações em `2026-10-18-re004.md`. Base 9db1ef9. Funções de produção dos módulos tocados estão individualizadas: nova, alterada ou reutilizada sem mudança. Assinaturas vêm do inventário AST oficial; o snapshot extenso usa o alias público equivalente ObservacaoReentrada. Dependências/escritas são evidências estáticas; efeitos indiretos seguem as portas chamadas. Nenhuma marca de revisão humana é acrescentada por geração.

## Reutilizada sem mudança: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.constructor:Constructor`

- **Assinatura:** `(canvas: HTMLCanvasElement, graficos: HTMLCanvasElement): RenderizadorReentrada`.
- **Responsabilidade / invariantes / efeitos:** Recebe superfícies de desenho; nunca cria ou modifica um corpo físico.
- **Dependências diretas:** `canvas.getContext`, `graficos.getContext`.
- **Escritas diretas:** `this.canvas`, `this.graficos`, `this.ctx`, `this.grafico`.
- **Contrato:** [f-9bdbc3539c49fc5c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9bdbc3539c49fc5c).

## Reutilizada sem mudança: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.dimensionar:MethodDeclaration`

- **Assinatura:** `(canvas: HTMLCanvasElement): void`.
- **Responsabilidade / invariantes / efeitos:** Redimensiona pixels lógicos à tela; física e dimensões SI não são alteradas.
- **Dependências diretas:** `Math.max`, `Math.round`.
- **Escritas diretas:** `canvas.width`, `canvas.height`.
- **Contrato:** [f-06c59a50a7238277](../arquitetura/CATALOGO_DE_FUNCOES.md#f-06c59a50a7238277).

## Reutilizada sem mudança: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenhar:MethodDeclaration`

- **Assinatura:** `(o: ObservacaoReentrada, historico: readonly ObservacaoReentrada[], metrosPorPixel: number): void`.
- **Responsabilidade / invariantes / efeitos:** Câmera centrada no corpo, Terra curva e réguas graduadas globais em m. Atitude XY usa rotate(-theta). Bank altera só projeção da geometria. O símbolo tem ampliação mínima declarada; réguas mantêm escala física.
- **Dependências diretas:** `this.dimensionar`, `CameraFisica2D`, `ctx.fillRect`, `camera.projetar`, `ctx.beginPath`, `ctx.arc`, `ctx.fill`, `ctx.stroke`, `ctx.setLineDash`, `historico.forEach`, `this.desenharReguas`, `Math.max`, `ctx.save`, `ctx.translate`, `ctx.rotate`, `Math.abs`, `Math.cos`, `ctx.moveTo`, `ctx.lineTo`, `ctx.closePath`, `o.flaps.entries`, `ctx.restore`, `fluxo.multiplicar`, `ctx.fillText`, `(o.rolagem.atualRad * 180 / Math.PI).toFixed`, `Math.max(1, pxM * metrosPorPixel).toFixed`, `metrosPorPixel.toFixed`.
- **Escritas diretas:** `ctx.fillStyle`, `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.font`.
- **Contrato:** [f-c44fd749571b9cb8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c44fd749571b9cb8).

## Reutilizada sem mudança: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharReguas:MethodDeclaration`

- **Assinatura:** `(camera: CameraFisica2D): void`.
- **Responsabilidade / invariantes / efeitos:** Réguas X/Y em metros globais consultados da câmera, sem arredondar estado.
- **Dependências diretas:** `Math.floor`, `Math.log10`, `[1, 2, 5, 10].map(v => v * base).find`, `[1, 2, 5, 10].map`, `ctx.beginPath`, `ctx.moveTo`, `ctx.lineTo`, `ctx.stroke`, `camera.desprojetar`, `ctx.fillText`, `Math.round`, `Math.max`.
- **Escritas diretas:** `ctx.font`, `ctx.strokeStyle`, `ctx.fillStyle`, `x`, `y`.
- **Contrato:** [f-830ad3072d81596d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-830ad3072d81596d).

## Nova: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.temperaturas:MethodDeclaration`

- **Assinatura:** `(o: ObservacaoReentrada, grupo: "corpo" | "flap1" | "flap2" | "bateria"): readonly number[]`.
- **Responsabilidade / invariantes / efeitos:** Canais regionais consultados do snapshot, nunca calculados no renderer. Retorna temperaturas °C na ordem superfície/estrutura/interior (bateria: um nó). Ausência de rede consulta somente o canal concentrado legado.
- **Dependências diretas:** `rede.regioes.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-15a792e972db1713](../arquitetura/CATALOGO_DE_FUNCOES.md#f-15a792e972db1713).

## Alterada: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos:MethodDeclaration`

- **Assinatura:** `(historico: readonly ObservacaoReentrada[]): void`.
- **Responsabilidade / invariantes / efeitos:** Gráficos de observação SI; redes optantes têm painéis separados por corpo, flap e bateria. Cores identificam superfície, estrutura e interior. Não há integração térmica, interpolação física nem limite artificial de temperatura.
- **Dependências diretas:** `historico.at`, `this.dimensionar`, `ctx.fillRect`, `canais.push`, `Math.max`, `canais.forEach`.
- **Escritas diretas:** `this.graficos.style.height`, `ctx.fillStyle`.
- **Contrato:** [f-8485960587076615](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8485960587076615).

## Alterada: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction`

- **Assinatura:** `(o: ObservacaoReentrada): number[]`.
- **Responsabilidade / invariantes / efeitos:** Consulta altitude radial m do snapshot.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a4e96facd78790d5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a4e96facd78790d5).

## Alterada: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction#2`

- **Assinatura:** `(o: ObservacaoReentrada): number[]`.
- **Responsabilidade / invariantes / efeitos:** Consulta velocidade inercial m/s do snapshot.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e652f616f5e31ba6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e652f616f5e31ba6).

## Alterada: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction#3`

- **Assinatura:** `(o: ObservacaoReentrada): number[]`.
- **Responsabilidade / invariantes / efeitos:** Consulta pressão Pa calculada no core.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d0588f78abec3bc7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d0588f78abec3bc7).

## Alterada: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction#4`

- **Assinatura:** `(o: ObservacaoReentrada): number[]`.
- **Responsabilidade / invariantes / efeitos:** Consulta indicador SG W/m²; não infere temperatura.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-afbff7d4cef24d10](../arquitetura/CATALOGO_DE_FUNCOES.md#f-afbff7d4cef24d10).

## Alterada: `src/apresentacao/reentrada/RenderizadorReentrada.ts::RenderizadorReentrada.desenharGraficos.ler:ArrowFunction#5`

- **Assinatura:** `(o: ObservacaoReentrada): readonly number[]`.
- **Responsabilidade / invariantes / efeitos:** Consulta canais regionais ou legado, sem escrever estados térmicos.
- **Dependências diretas:** `this.temperaturas`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-43e2920f305783b7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-43e2920f305783b7).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::validarComandoReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada: unknown): entrada is ComandoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Valida comando serializável por chaves exatas, finitude e limites; não executa.
- **Dependências diretas:** `Array.isArray`, `Object.hasOwn`, `Object.keys`, `chaves[e.tipo].every`, `Number.isFinite`, `Math.abs`, `[e.dianteiroRad, e.traseiroRad].every`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-52a010df6b7f3e6e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-52a010df6b7f3e6e).

## Alterada: `src/cenarios/EnsaioReentrada.ts::configurarReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada?: EntradaConfiguracaoReentrada): ConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Cria configuração copiada, validada e congelada; os limiares térmicos padrão foram definidos pelo operador. Com rede optante migram para superfície; região estrutural tem limite próprio. Divergência entre representações é erro.
- **Dependências diretas:** `validarConfiguracaoTermicaReentrada`, `termica.corpo.regioes.find`, `termica.flap.regioes.find`, `Object.entries`, `Error`, `copiarSnapshot`, `configurarParametrosReentrada`, `configurarFronteiraAproximacao`, `Number.isFinite`, `Number.isSafeInteger`, `Math.abs`, `Math.round`, `Object.values(c.corredor).every`, `Object.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f88e23012b3ae8c3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f88e23012b3ae8c3).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::exigirCamposConfiguracao:FunctionDeclaration`

- **Assinatura:** `(valor: unknown, referencia: object, prefixo: string, ignorados?: readonly string[]): void`.
- **Responsabilidade / invariantes / efeitos:** Exige campos próprios conhecidos, sem undefined nem omissão. Validação de valores/unidades permanece nas regras do cenário; não cria objetos físicos. O campo legado não editável pode ser omitido explicitamente pela interface.
- **Dependências diretas:** `Array.isArray`, `Error`, `Object.keys`, `ignorados.includes`, `Object.hasOwn`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-25970cc620e51b6d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-25970cc620e51b6d).

## Alterada: `src/cenarios/EnsaioReentrada.ts::validarConfiguracaoExplicitaReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada: unknown): ConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Fronteira estrita para formulários: exige todos os parâmetros editáveis em SI antes da validação/congelamento de domínio. Somente transferência legada, ausente da interface, usa a referência declarada. Rede opcional é validada integralmente; ausência preserva contrato legado. Não altera fábrica parcial, física, relógio ou configuração de ensaios existentes. Testes RE-003 A–G.
- **Dependências diretas:** `exigirCamposConfiguracao`, `configurarReentrada`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a01ba13dc3b415ea](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a01ba13dc3b415ea).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::estadoModulo:FunctionDeclaration`

- **Assinatura:** `(e: EstadoFisico, x: number, y: number): EstadoFisico`.
- **Responsabilidade / invariantes / efeitos:** Constrói somente estado inicial de módulo: pose relativa rígida e velocidade v+ω×r em SI. Não é usada para reposicionar objetos durante o ensaio.
- **Dependências diretas:** `Vetor3`, `Math.cos`, `Math.sin`, `e.posicaoM.adicionar`, `e.velocidadeMps.adicionar`, `e.velocidadeAngularRadps.produtoVetorial`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-532e693d7fa63ff9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-532e693d7fa63ff9).

## Alterada: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada?: EntradaConfiguracaoReentrada): { configuracao: ConfiguracaoReentrada; ambiente: AmbienteTerrestre; perfil: PerfilAtmosfericoReentrada; mundo: MundoFisico; orbitador: OrbitadorReentrada; flaps: FlapReentrada[]; bateria: Bateria; fixadores: FixadorEstrutural[]; objetos: readonly Objeto[]; sensores: SensoresVeiculoComposto; solo: SuperficieEsferica; }`.
- **Responsabilidade / invariantes / efeitos:** Fábrica ADM de corpos reais e vínculos no mesmo MundoFisico. Vácuo é explícito; atmosfera RE e rede térmica regional são opt-in. Redes e caminhos são instalados antes do registro, sem adicionar massa mecânica. Terra estática, XY; padrão 1/240 s, máximo exploratório 1/120 s. Fonte enclausurada.
- **Dependências diretas:** `configurarReentrada`, `AmbienteTerrestre`, `PerfilAtmosfericoReentrada`, `MundoFisico`, `criarEstadoInicialLocal`, `Math.cos`, `Math.sin`, `OrbitadorReentrada`, `Bateria`, `Vetor3`, `[0, 1].map`, `orbitador.configurarRedeTermicaPeloCore`, `bateria.configurarRedeTermicaPeloCore`, `mundo.registrarObjeto`, `FixadorEstrutural`, `fixadores.push`, `mundo.registrarFixador`, `SuperficieEsferica`, `mundo.registrarSuperficie`, `SensoresVeiculoComposto`, `mundo.registrarSensoresVeiculo`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8fc45f499c16a562](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8fc45f499c16a562).

## Nova: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada.[callback]#2.lerEficienciaAtuacao:ArrowFunction`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Eficiência do mecanismo interno, sem alterar controlador ou corrente.
- **Dependências diretas:** `flap.obterRedeTermicaPeloCore()?.obterRegiao`, `flap.obterRedeTermicaPeloCore`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a8c04a2cf1437583](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a8c04a2cf1437583).

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

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.constructor:Constructor`

- **Assinatura:** `(entrada?: EntradaConfiguracaoReentrada): EnsaioReentrada`.
- **Responsabilidade / invariantes / efeitos:** Monta controles por portas de leitura, registra adaptador de pouso desabilitado sem motores, e registra hipóteses/revisão, inclusive a térmica regional. Não inicia execução ou ignição.
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

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.observar:MethodDeclaration`

- **Assinatura:** `(): ObservacaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Observação escalar/geométrica e balanço angular, copiada e congelada. Torque gravítico é o gradiente entre centros dos membros, não distribuição interna. Resíduo usa cargas efetivamente integradas; contatos/fontes impulsivas são sinalizados. Não oferece objetos mutáveis nem corrige estado. Rede optante expõe nós, balanços SI e limites; temperaturaC passa a significar estrutura.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `c.mundo.obterCondicoesAtmosfericas`, `c.orbitador.avaliar`, `geometriaConjunto`, `c.mundo.obterCargasAerodinamicas`, `cargas.forcaN.multiplicar`, `c.mundo.obterGravidadeMps2`, `c.ambiente.referencial.vetorParaLocal`, `g.membros.reduce`, `copiarSnapshot`, `this.extremos.observar`, `c.ambiente.referencial.altitudeGeometricaM`, `c.ambiente.referencial.posicaoHorizontalM`, `Math.atan2`, `e.posicaoM.subtrair`, `c.ambiente.referencial.atitudeLocalRad`, `c.orbitador.observarRolagem`, `this.controlador.observar`, `c.orbitador.obterHistoricoRolagem`, `this.supervisor.observar`, `this.gerenciador.obterUltimaArbitragem`, `gravidade.adicionar`, `diagnosticarMomentoAngular`, `this.balancoAngular.observar`, `c.mundo.obterDiagnosticoAngularDoPasso`, `c.mundo.obterContatosComSuperficie`, `aceleracaoAero.produtoEscalar`, `Math.max`, `c.orbitador.observarRedeTermica`, `c.flaps.map`, `c.bateria.observarRedeTermica`, `c.objetos.reduce`, `c.orbitador.obterPotenciaAquecimentoAerodinamicoW`, `c.mundo.obterForcaArrastoAtmosferico(c.orbitador).produtoEscalar`, `c.mundo.obterForcaArrastoAtmosferico`, `e.velocidadeMps.subtrair`, `c.flaps.some`, `c.mundo.obterContatosComSuperficie().some`, `c.fixadores.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-05755a69bc286c7f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-05755a69bc286c7f).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.lerControle:MethodDeclaration`

- **Assinatura:** `(): { alphaRad: number; taxaArfagemRadps: number; taxaFluxoRadps: number; pressaoDinamicaPa: number; fluxoTermicoWm2: number; cargaG: number; torquePassivoNm: number; energiaMecanicaEspecificaJPorKg: number; integridadeMinima: number; inerciaKgM2: number; phiRad: number; disponivel: boolean; }`.
- **Responsabilidade / invariantes / efeitos:** Telemetria física para PD; calcula derivada angular do fluxo por v×a/|v|², sem diferenciar relógio real ou alterar estado. Dano próprio do mecanismo optante participa apenas da disponibilidade, sem mudar lei de controle. Torque passivo exclui lift ativo.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `geometriaConjunto`, `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `c.mundo.obterCargasAerodinamicas`, `c.mundo.obterGravidadeMps2(e.posicaoM).adicionar`, `c.mundo.obterGravidadeMps2`, `cargas.forcaN.multiplicar`, `e.velocidadeMps.subtrair`, `c.flaps.reduce`, `v.produtoVetorial`, `e.posicaoM.subtrair`, `Math.min`, `g.membros.map`, `c.orbitador.observarRolagem`, `c.flaps.every`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2db95d019a3477f5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2db95d019a3477f5).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.atualizarSupervisor:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Avalia estado real, autoridade remanescente e filtros A/B sem reutilizar limites antigos de pouso. Mecanismo optante sem integridade não oferece autoridade. Não há propulsão nem integração física de aproximação.
- **Dependências diretas:** `c.sensores.obterLeituras`, `this.supervisor.observar`, `this.lerControle`, `Math.min`, `c.flaps.map`, `Math.abs`, `Math.cos`, `this.supervisor.atualizar`, `Math.hypot`, `this.controlador.observar`, `c.flaps.every`, `this.evento`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b5dfd4d0081ccbd9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b5dfd4d0081ccbd9).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.registrarCondicoes:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Registra arestas de falha/recuperação de condições, não repete eventos por frame. Nó optante identifica corpo/região, limiar e colapso próprios. Colisão, dano e separação não encerram evolução física.
- **Dependências diretas:** `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `c.flaps.some`, `this.controlador.observar`, `c.fixadores.some`, `c.mundo.obterContatosComSuperficie`, `this.supervisor.observar`, `this.lerControle`, `c.perfil.amostrar`, `c.ambiente.referencial.altitudeGeometricaM`, `c.orbitador.getEstadoFisico`, `c.orbitador.observarRolagem`, `c.flaps.entries`, `Math.max`, `c.flaps.map`, `objeto.observarRedeTermica`, `Object.entries`, `this.condicoesRegistradas.get`, `this.evento`, `this.condicoesRegistradas.set`.
- **Escritas diretas:** `condicoes[`degradacao-flap-${i + 1}`]`, `condicoes[`colapso-flap-${i + 1}`]`, `valores[`degradacao-flap-${i + 1}`]`, `valores[`colapso-flap-${i + 1}`]`, `condicoes[chave]`, `valores[chave]`, `condicoes[`colapso-termico-${objeto.id}-${r.id}`]`, `valores[`colapso-termico-${objeto.id}-${r.id}`]`.
- **Contrato:** [f-5dacbb18677d6f4c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5dacbb18677d6f4c).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.evento:MethodDeclaration`

- **Assinatura:** `(tipo: string, descricao: string, categoria?: EventoMissao["categoria"], dados?: EventoMissao["dados"]): void`.
- **Responsabilidade / invariantes / efeitos:** Acrescenta evento no tempo de missão, com sequência estável e categoria.
- **Dependências diretas:** `this.eventos.push`, `this.eventos.splice`.
- **Escritas diretas:** `this.sequenciaEvento`, `this.eventosDescartados`.
- **Contrato:** [f-593973bfbdc79c20](../arquitetura/CATALOGO_DE_FUNCOES.md#f-593973bfbdc79c20).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.lerMetricasPasso:MethodDeclaration`

- **Assinatura:** `(): Readonly<Record<string, number>>`.
- **Responsabilidade / invariantes / efeitos:** Coleta canais físicos SI em todo passo, antes de qualquer redução visual. Inclui temperaturas e resíduos de cada região optante. Sem cópia de trajetória ou recalibração de forças. Chaves/unidades acompanham o diário; extremos têm passo e instante e não dependem da renderização.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `objeto.observarRedeTermica`, `this.lerControle`, `normalizarAngulo`, `this.controlador.observar`, `c.ambiente.referencial.altitudeGeometricaM`, `e.posicaoM.subtrair`, `c.mundo.obterDiagnosticoAngularDoPasso`.
- **Escritas diretas:** `regionais[`temperatura-${objeto.id}-${r.id}-C`]`, `regionais[`residuo-termico-${objeto.id}-J`]`.
- **Contrato:** [f-08107e4693116363](../arquitetura/CATALOGO_DE_FUNCOES.md#f-08107e4693116363).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.obterIdentificacao:MethodDeclaration`

- **Assinatura:** `(): object`.
- **Responsabilidade / invariantes / efeitos:** Exporta identificação/revisões e hipóteses; RE-004 só com rede optante. Toda definição regional é serializada para reprodução estrita.
- **Dependências diretas:** `copiarSnapshot`, `this.cenario.mundo.obterConfiguracaoFisica`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4987311594a9418d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4987311594a9418d).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::criarEnsaioReentrada:FunctionDeclaration`

- **Assinatura:** `(configuracao?: EntradaConfiguracaoReentrada): RegistroMissao<ComandoReentrada, { temperaturaC: number; integridade: number; limiteOrbitadorC: number; limiteFlapsC: number; energiaAbsorvidaJ: number; energiaDissipadaJ: number; energiaAtmosferaJ: number; respostaTermica: { energiaAbsorvidaCorpoJ: number; modelo: string; tetoUniversal: boolean; potenciaIndicadorCorpoW: number; potenciaTransferidaCorpoW: number; tpsInstalado: boolean; camadasInternasModeladas: boolean; }; estadosTerminais: { corpoDestruido: boolean; controlePerdido: boolean; contato: boolean; impactoDestrutivo: boolean; }; dissipacaoW: number; calorTransferidoW: number; potenciaAtmosferaW: number; energiaBateriaJ: number; temperaturaBateriaC: number; integridadeBateria: number; limiteBateriaC: number; flaps: { id: string; estado: EstadoFisico; comandoRad: number; deflexaoRad: number; integridade: number; temperaturaC: number; energiaAbsorvidaJ: number; conectado: boolean; fluxoTermicoIndicadorWm2: number; energizado: boolean; atuacao: { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; integridadeMecanismo?: number | undefined; }; knudsenEstimado: number; modeloEscoamento: string; }[]; vinculos: { id: string; estado: "integro" | "rompido" | "liberado"; tracaoAtualN: number; picoTracaoN: number; resistenciaTracaoN: number; cisalhamentoFlexaoTorcaoModelados: boolean; termica?: Readonly<{ modelo: "condutancia-conservativa" | "temperatura-media-legada"; temperaturaC: number; energiaConduzidaJ: number; potenciaConduzidaW: number; portas: Readonly<{ regiaoA: string; regiaoB: string; }> | undefined; }> | undefined; }[]; raioTerraM: number; centroTerraM: Vetor3; propulsaoDisponivel: boolean; rcsDisponivel: boolean; termica?: { revisao: string; perfil: PerfilTermicoReentrada; corpo: Readonly<{ revisao: "RE-004-r1"; regioes: readonly Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>[]; energiaArmazenadaJ: number; energiaIncidenteJ: number; energiaGeradaJ: number; energiaConducaoExternaJ: number; energiaContatoJ: number; energiaRadiadaJ: number; energiaConveccaoJ: number; residuoEnergiaJ: number; potenciaIncidenteW: number; potenciaRadiadaW: number; potenciaConveccaoW: number; conducoes: readonly Readonly<{ energiaJ: number; potenciaW: number; a: string; b: string; condutanciaWPorC: number; condutanciaSemProtecaoWPorC: number; }>[]; }>; flaps: Readonly<{ revisao: "RE-004-r1"; regioes: readonly Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>[]; energiaArmazenadaJ: number; energiaIncidenteJ: number; energiaGeradaJ: number; energiaConducaoExternaJ: number; energiaContatoJ: number; energiaRadiadaJ: number; energiaConveccaoJ: number; residuoEnergiaJ: number; potenciaIncidenteW: number; potenciaRadiadaW: number; potenciaConveccaoW: number; conducoes: readonly Readonly<{ energiaJ: number; potenciaW: number; a: string; b: string; condutanciaWPorC: number; condutanciaSemProtecaoWPorC: number; }>[]; }>[]; bateria: Readonly<{ revisao: "RE-004-r1"; regioes: readonly Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>[]; energiaArmazenadaJ: number; energiaIncidenteJ: number; energiaGeradaJ: number; energiaConducaoExternaJ: number; energiaContatoJ: number; energiaRadiadaJ: number; energiaConveccaoJ: number; residuoEnergiaJ: number; potenciaIncidenteW: number; potenciaRadiadaW: number; potenciaConveccaoW: number; conducoes: readonly Readonly<{ energiaJ: number; potenciaW: number; a: string; b: string; condutanciaWPorC: number; condutanciaSemProtecaoWPorC: number; }>[]; }>; temperaturaLegadaSignifica: string; energiaAtmosferaLegadaSignifica: string; } | undefined; id: string; tempoS: number; passo: number; execucao: EstadoExecucaoMissao; estado: EstadoFisico; extremos: { globais: Record<string, FaixaTemporal>; intervaloAtual: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; }; ultimoIntervalo: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; } | null; }; eventosDescartados: number; altitudeM: number; arcoM: number; velocidadeMps: number; trajetoriaRad: number; velocidadeRadialMps: number; velocidadeTangencialMps: number; energiaMecanicaEspecificaJPorKg: number; atitudeInercialRad: number; atitudeLocalRad: number; aerodinamica: CargasReentrada; rolagem: EstadoRolagemVirtual; controle: { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; torqueSolicitadoNm: number; torqueComandadoNm: number; corredor: Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }> | null; }; historicoRolagem: readonly { readonly tempoS: number; readonly anguloRad: number; }[]; supervisor: { fase: "aproximacao" | "reentrada" | "falha"; automatico: boolean; candidatoCinematico: boolean; autorizado: boolean; requisitos: readonly Readonly<RequisitoAproximacao>[]; limites: ConfiguracaoFronteiraAproximacao; avaliacao: Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }> | null; }; arbitragem: readonly SolicitacaoArbitrada[]; massaKg: number; inerciaKgM2: number; centroM: Vetor3; forcaAerodinamicaN: Vetor3; torqueAerodinamicoNm: number; aceleracaoMps2: Vetor3; rotacao: { cargasEfetivamenteIntegradas: { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | null; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; fontesImpulsivas: boolean; impulsoTorqueNmS: number; residuoPassoKgM2ps: number; residuoAcumuladoKgM2ps: number; residuoMaximoPassoKgM2ps: number; passosIncompletos: number; massaKg: number; centroM: Vetor3; velocidadeCentroMps: Vetor3; inerciaKgM2: number; momentoIntrinsecoKgM2ps: number; momentoOrbitalKgM2ps: number; momentoTotalKgM2ps: number; omegaInercialRadps: number; torqueGravitacionalNm: number; }; cargaG: number; desaceleracaoMps2: number; }>`.
- **Responsabilidade / invariantes / efeitos:** Fábrica pública de ensaio registrável, sem relógio, DOM ou escrita externa.
- **Dependências diretas:** `EnsaioReentrada`, `RegistroMissao`, `ensaio.obterIdentificacao`, `Math.round`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-fbefc47b0a643060](../arquitetura/CATALOGO_DE_FUNCOES.md#f-fbefc47b0a643060).

## Alterada: `src/cenarios/EnsaioReentrada.ts::reproduzirEnsaioReentrada:FunctionDeclaration`

- **Assinatura:** `(diario: DiarioReentrada): RegistroMissao<ComandoReentrada, { temperaturaC: number; integridade: number; limiteOrbitadorC: number; limiteFlapsC: number; energiaAbsorvidaJ: number; energiaDissipadaJ: number; energiaAtmosferaJ: number; respostaTermica: { energiaAbsorvidaCorpoJ: number; modelo: string; tetoUniversal: boolean; potenciaIndicadorCorpoW: number; potenciaTransferidaCorpoW: number; tpsInstalado: boolean; camadasInternasModeladas: boolean; }; estadosTerminais: { corpoDestruido: boolean; controlePerdido: boolean; contato: boolean; impactoDestrutivo: boolean; }; dissipacaoW: number; calorTransferidoW: number; potenciaAtmosferaW: number; energiaBateriaJ: number; temperaturaBateriaC: number; integridadeBateria: number; limiteBateriaC: number; flaps: { id: string; estado: EstadoFisico; comandoRad: number; deflexaoRad: number; integridade: number; temperaturaC: number; energiaAbsorvidaJ: number; conectado: boolean; fluxoTermicoIndicadorWm2: number; energizado: boolean; atuacao: { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; integridadeMecanismo?: number | undefined; }; knudsenEstimado: number; modeloEscoamento: string; }[]; vinculos: { id: string; estado: "integro" | "rompido" | "liberado"; tracaoAtualN: number; picoTracaoN: number; resistenciaTracaoN: number; cisalhamentoFlexaoTorcaoModelados: boolean; termica?: Readonly<{ modelo: "condutancia-conservativa" | "temperatura-media-legada"; temperaturaC: number; energiaConduzidaJ: number; potenciaConduzidaW: number; portas: Readonly<{ regiaoA: string; regiaoB: string; }> | undefined; }> | undefined; }[]; raioTerraM: number; centroTerraM: Vetor3; propulsaoDisponivel: boolean; rcsDisponivel: boolean; termica?: { revisao: string; perfil: PerfilTermicoReentrada; corpo: Readonly<{ revisao: "RE-004-r1"; regioes: readonly Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>[]; energiaArmazenadaJ: number; energiaIncidenteJ: number; energiaGeradaJ: number; energiaConducaoExternaJ: number; energiaContatoJ: number; energiaRadiadaJ: number; energiaConveccaoJ: number; residuoEnergiaJ: number; potenciaIncidenteW: number; potenciaRadiadaW: number; potenciaConveccaoW: number; conducoes: readonly Readonly<{ energiaJ: number; potenciaW: number; a: string; b: string; condutanciaWPorC: number; condutanciaSemProtecaoWPorC: number; }>[]; }>; flaps: Readonly<{ revisao: "RE-004-r1"; regioes: readonly Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>[]; energiaArmazenadaJ: number; energiaIncidenteJ: number; energiaGeradaJ: number; energiaConducaoExternaJ: number; energiaContatoJ: number; energiaRadiadaJ: number; energiaConveccaoJ: number; residuoEnergiaJ: number; potenciaIncidenteW: number; potenciaRadiadaW: number; potenciaConveccaoW: number; conducoes: readonly Readonly<{ energiaJ: number; potenciaW: number; a: string; b: string; condutanciaWPorC: number; condutanciaSemProtecaoWPorC: number; }>[]; }>[]; bateria: Readonly<{ revisao: "RE-004-r1"; regioes: readonly Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>[]; energiaArmazenadaJ: number; energiaIncidenteJ: number; energiaGeradaJ: number; energiaConducaoExternaJ: number; energiaContatoJ: number; energiaRadiadaJ: number; energiaConveccaoJ: number; residuoEnergiaJ: number; potenciaIncidenteW: number; potenciaRadiadaW: number; potenciaConveccaoW: number; conducoes: readonly Readonly<{ energiaJ: number; potenciaW: number; a: string; b: string; condutanciaWPorC: number; condutanciaSemProtecaoWPorC: number; }>[]; }>; temperaturaLegadaSignifica: string; energiaAtmosferaLegadaSignifica: string; } | undefined; id: string; tempoS: number; passo: number; execucao: EstadoExecucaoMissao; estado: EstadoFisico; extremos: { globais: Record<string, FaixaTemporal>; intervaloAtual: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; }; ultimoIntervalo: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; } | null; }; eventosDescartados: number; altitudeM: number; arcoM: number; velocidadeMps: number; trajetoriaRad: number; velocidadeRadialMps: number; velocidadeTangencialMps: number; energiaMecanicaEspecificaJPorKg: number; atitudeInercialRad: number; atitudeLocalRad: number; aerodinamica: CargasReentrada; rolagem: EstadoRolagemVirtual; controle: { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; torqueSolicitadoNm: number; torqueComandadoNm: number; corredor: Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }> | null; }; historicoRolagem: readonly { readonly tempoS: number; readonly anguloRad: number; }[]; supervisor: { fase: "aproximacao" | "reentrada" | "falha"; automatico: boolean; candidatoCinematico: boolean; autorizado: boolean; requisitos: readonly Readonly<RequisitoAproximacao>[]; limites: ConfiguracaoFronteiraAproximacao; avaliacao: Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }> | null; }; arbitragem: readonly SolicitacaoArbitrada[]; massaKg: number; inerciaKgM2: number; centroM: Vetor3; forcaAerodinamicaN: Vetor3; torqueAerodinamicoNm: number; aceleracaoMps2: Vetor3; rotacao: { cargasEfetivamenteIntegradas: { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | null; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; fontesImpulsivas: boolean; impulsoTorqueNmS: number; residuoPassoKgM2ps: number; residuoAcumuladoKgM2ps: number; residuoMaximoPassoKgM2ps: number; passosIncompletos: number; massaKg: number; centroM: Vetor3; velocidadeCentroMps: Vetor3; inerciaKgM2: number; momentoIntrinsecoKgM2ps: number; momentoOrbitalKgM2ps: number; momentoTotalKgM2ps: number; omegaInercialRadps: number; torqueGravitacionalNm: number; }; cargaG: number; desaceleracaoMps2: number; }>`.
- **Responsabilidade / invariantes / efeitos:** Seleciona revisão térmica explícita do diário, preservando RE-003 sem rede. Reexecuta agenda no mesmo modelo/runtime; rejeita revisão, entradas e resultados divergentes. Pausa/exportação não reproduzem relógio real. O custo é proporcional ao número de passos físicos do diário; chamada síncrona headless.
- **Dependências diretas:** `Number.isSafeInteger`, `Error`, `criarEnsaioReentrada`, `JSON.stringify`, `ensaio.exportar`, `Math.round`, `ensaio.observar`, `ensaio.iniciar`, `ensaio.pausar`, `ensaio.receberComando`, `ensaio.avancarPasso`.
- **Escritas diretas:** `indice`.
- **Contrato:** [f-af7e1ca547762556](../arquitetura/CATALOGO_DE_FUNCOES.md#f-af7e1ca547762556).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor:Constructor`

- **Assinatura:** `(maxDtS?: number, configuracao?: ConfiguracaoMundoFisico): MundoFisico`.
- **Responsabilidade / invariantes / efeitos:** Compõe registros, ambiente, integração e solucionadores determinísticos; configura água somente quando regiões são declaradas. maxDtS em s positivo/finito; densidade kg/m³ não negativa (zero = vácuo), vento m/s, temperatura °C. Legado plano/Euler por padrão; central usa KDK e restringe XY. Perfil atmosférico opcional é injetado no solucionador compartilhado, sem alterar padrões anteriores. Instala callbacks de consulta/reação, sem depender de relógio real.
- **Dependências diretas:** `Map`, `IntegradorFisico`, `ResolvedorEsforcoEstrutural`, `Number.isFinite`, `Error`, `AmbientePlano`, `this.validarVetorPlanar`, `[...(configuracao.rajadasVento ?? [])].sort`, `[rajada.velocidadeAdicionalMps.x, rajada.velocidadeAdicionalMps.y, rajada.velocidadeAdicionalMps.z].every`, `SistemaAtmosferico`, `SistemaHidrodinamico`, `SistemaTermico`, `SistemaSensores`, `ResolvedorColisoes`, `ResolvedorContatoSuperficie`.
- **Escritas diretas:** `this.maxDtS`, `this.ambiente`, `this.integracao`, `this.objetos`, `this.superficies`, `this.fixadores`, `this.chumbadoresAoSolo`, `this.guiasLineares`, `this.juntasRotacionaisDeBancada`, `this.conjuntosEstruturais`, `this.forcasPendentes`, `this.impulsosPendentes`, `this.tempoMissaoS`, `this.densidadeAtmosfericaNivelMarKgM3`, `this.velocidadeArBaseMps`, `this.rajadasVento`, `this.velocidadeArAtualMps`, `this.atmosfera`, `this.integrador`, `this.sistemaTermico`, `this.resolvedorEsforcoEstrutural`, `this.resolvedorColisoes`, `this.resolvedorContatoSuperficie`, `this.sistemaSensores`, `this.hidrodinamica`, `this.perfilAtmosferico`, `this.avaliarCargasEstruturaisDistribuidas`, `this.diagnosticosAngularesPasso`, `this.dtDiagnosticoS`.
- **Contrato:** [f-518ff75ab4b7f057](../arquitetura/CATALOGO_DE_FUNCOES.md#f-518ff75ab4b7f057).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.verticalEm:ArrowFunction`

- **Assinatura:** `(p: Vetor3): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Fornece ao resolvedor a direção radial local do ambiente na posição global em metros; não calcula uma vertical alternativa.
- **Dependências diretas:** `this.ambiente.referencial.radial`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-6f1f287ebb4b06bb](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6f1f287ebb4b06bb).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterObjetos:ArrowFunction`

- **Assinatura:** `(): MapIterator<Objeto>`.
- **Responsabilidade / invariantes / efeitos:** Entrega iterador dos corpos registrados aos resolvedores; os objetos continuam pertencendo ao core, sem cópia da dinâmica.
- **Dependências diretas:** `this.objetos.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9bca04b4b6c063ed](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9bca04b4b6c063ed).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterConjuntoEstrutural:ArrowFunction`

- **Assinatura:** `(objeto: Objeto): ConjuntoEstruturalRigido | undefined`.
- **Responsabilidade / invariantes / efeitos:** Consulta a ilha estrutural atual do corpo para resolver contatos com massa e inércia compostas.
- **Dependências diretas:** `this.obterConjuntoEstruturalDoObjeto`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-23cc335f3cc5d880](../arquitetura/CATALOGO_DE_FUNCOES.md#f-23cc335f3cc5d880).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterFixadores:ArrowFunction`

- **Assinatura:** `(): MapIterator<FixadorEstrutural>`.
- **Responsabilidade / invariantes / efeitos:** Entrega iterador dos fixadores registrados para transmissão e eventual ruptura de esforços físicos.
- **Dependências diretas:** `this.fixadores.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-7e34327905877d05](../arquitetura/CATALOGO_DE_FUNCOES.md#f-7e34327905877d05).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.distribuirCalorDeAtrito:ArrowFunction`

- **Assinatura:** `(objetoA: Objeto, objetoB: Objeto, energiaJ: number, dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Porta que encaminha energia dissipada em J aos participantes do contato; delega ao sistema térmico entre objetos ou divide igualmente entre objeto e superfície. O dt em s acompanha o aquecimento do objeto, sem alterar cinemática.
- **Dependências diretas:** `this.sistemaTermico.distribuirCalorDeAtritoEntreObjetos`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-0ef3d90e16c5ee99](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0ef3d90e16c5ee99).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.deveIgnorarColisao:ArrowFunction`

- **Assinatura:** `(objetoA: Objeto, objetoB: Objeto): boolean`.
- **Responsabilidade / invariantes / efeitos:** Exclui o par de colisões quando alguma junta rotacional registrada declara essa exceção física.
- **Dependências diretas:** `[...this.juntasRotacionaisDeBancada.values()].some`, `this.juntasRotacionaisDeBancada.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-6ed17c159f596add](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6ed17c159f596add).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterObjetos:ArrowFunction#2`

- **Assinatura:** `(): MapIterator<Objeto>`.
- **Responsabilidade / invariantes / efeitos:** Entrega iterador dos corpos registrados aos resolvedores; os objetos continuam pertencendo ao core, sem cópia da dinâmica.
- **Dependências diretas:** `this.objetos.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f49ed769f70cbea8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f49ed769f70cbea8).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterSuperficies:ArrowFunction`

- **Assinatura:** `(): MapIterator<SuperficieFisica>`.
- **Responsabilidade / invariantes / efeitos:** Entrega iterador das superfícies rígidas ao resolvedor; regiões líquidas não são adicionadas como piso.
- **Dependências diretas:** `this.superficies.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b4cc7c84323b2b76](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b4cc7c84323b2b76).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterConjuntoEstrutural:ArrowFunction#2`

- **Assinatura:** `(objeto: Objeto): ConjuntoEstruturalRigido | undefined`.
- **Responsabilidade / invariantes / efeitos:** Consulta a ilha estrutural atual do corpo para resolver contatos com massa e inércia compostas.
- **Dependências diretas:** `this.obterConjuntoEstruturalDoObjeto`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-79dae79b06413c98](../arquitetura/CATALOGO_DE_FUNCOES.md#f-79dae79b06413c98).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterMassaEfetivaNoContato:ArrowFunction`

- **Assinatura:** `(objeto: Objeto, pontoM: Vetor3, normal: Vetor3): number | undefined`.
- **Responsabilidade / invariantes / efeitos:** Encaminha ponto global em m e normal à consulta de massa efetiva, preservando contribuição da ilha estrutural.
- **Dependências diretas:** `this.obterMassaEfetivaNoContato`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-cc331bf5e24d2670](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cc331bf5e24d2670).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterFixadores:ArrowFunction#2`

- **Assinatura:** `(): MapIterator<FixadorEstrutural>`.
- **Responsabilidade / invariantes / efeitos:** Entrega iterador dos fixadores registrados para transmissão e eventual ruptura de esforços físicos.
- **Dependências diretas:** `this.fixadores.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3f3a80a38e9070f6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3f3a80a38e9070f6).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.distribuirCalorDeAtrito:ArrowFunction#2`

- **Assinatura:** `(objeto: Objeto, superficie: SuperficieFisica, energiaJ: number, dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Porta que encaminha energia dissipada em J aos participantes do contato; delega ao sistema térmico entre objetos ou divide igualmente entre objeto e superfície. O dt em s acompanha o aquecimento do objeto, sem alterar cinemática.
- **Dependências diretas:** `objeto.aplicarCalorDeAtritoPeloCore`, `superficie.aplicarCalorDeAtritoPeloCore`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-107e0418e080d86a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-107e0418e080d86a).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.constructor.obterGravidadeMps2:ArrowFunction`

- **Assinatura:** `(p: Vetor3): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Consulta o campo ativo na posição global em m para determinar reação normal e limite de atrito.
- **Dependências diretas:** `this.obterGravidadeMps2`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-35982ea5bb0323ff](../arquitetura/CATALOGO_DE_FUNCOES.md#f-35982ea5bb0323ff).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.tempoS:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta o tempo físico acumulado em s; não avança o mundo.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4b43112c6e426da9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4b43112c6e426da9).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.velocidadeDoArMps:GetAccessor`

- **Assinatura:** `(): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Consulta o vento inercial vigente no último subpasso em m/s.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-eb0f4320448a1c0c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-eb0f4320448a1c0c).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarGeometriaAquatica:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto, prisma: PrismaDeslocador): void`.
- **Responsabilidade / invariantes / efeitos:** Vincula prisma deslocador a objeto já registrado; exige sistema aquático e delega validação de geometria exclusiva.
- **Dependências diretas:** `this.exigirRegistro`, `Error`, `this.hidrodinamica.registrar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-46c5aaa56d1d830d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-46c5aaa56d1d830d).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterImersao:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): readonly EstadoImersao[]`.
- **Responsabilidade / invariantes / efeitos:** Calcula observações aquáticas do objeto registrado, tomando G da ilha como referência de torque; pode preencher cache geométrico, sem integrar.
- **Dependências diretas:** `this.exigirRegistro`, `this.obterConjuntoEstruturalDoObjeto(objeto)?.obterCentroDeMassaAtual`, `this.obterConjuntoEstruturalDoObjeto`, `objeto.getEstadoFisico`, `this.hidrodinamica?.calcular`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-7961c3fbd122116b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-7961c3fbd122116b).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.fracaoExpostaAr:MethodDeclaration`

- **Assinatura:** `(o: Objeto): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta a fração geométrica fora da água, ou 1 em mundo seco; reutiliza o cache hidrodinâmico.
- **Dependências diretas:** `this.hidrodinamica?.fracaoExpostaAr`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-af1921608b77b4f3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-af1921608b77b4f3).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarObjeto:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): void`.
- **Responsabilidade / invariantes / efeitos:** Insere corpo por identidade única após validar compatibilidade XY no ambiente central; não integra.
- **Dependências diretas:** `this.objetos.has`, `Error`, `this.validarEstadoPlanar`, `this.objetos.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e3413f4fbc66159f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e3413f4fbc66159f).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarSuperficie:MethodDeclaration`

- **Assinatura:** `(superficie: SuperficieFisica): void`.
- **Responsabilidade / invariantes / efeitos:** Insere geometria sólida por ID único; rejeita plano infinito no ambiente central, preservando plataformas finitas.
- **Dependências diretas:** `Error`, `this.superficies.has`, `this.superficies.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-6c1a2f8dcd939983](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6c1a2f8dcd939983).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarFixador:MethodDeclaration`

- **Assinatura:** `(fixador: FixadorEstrutural): void`.
- **Responsabilidade / invariantes / efeitos:** Registra vínculo por ID único entre dois corpos já presentes; topologia será sincronizada no passo físico.
- **Dependências diretas:** `this.fixadores.has`, `Error`, `this.exigirRegistro`, `this.fixadores.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-aa7bf4ca502e4d35](../arquitetura/CATALOGO_DE_FUNCOES.md#f-aa7bf4ca502e4d35).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarChumbadorAoSolo:MethodDeclaration`

- **Assinatura:** `(chumbador: ChumbadorAoSolo): void`.
- **Responsabilidade / invariantes / efeitos:** Registra fundação por ID único para corpo presente; a reação física é resolvida no avanço.
- **Dependências diretas:** `this.chumbadoresAoSolo.has`, `Error`, `this.exigirRegistro`, `this.chumbadoresAoSolo.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-30c830729acfc968](../arquitetura/CATALOGO_DE_FUNCOES.md#f-30c830729acfc968).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarSwitchFimDeCurso:MethodDeclaration`

- **Assinatura:** `(switchFimDeCurso: SwitchFimDeCurso): void`.
- **Responsabilidade / invariantes / efeitos:** Registra sensor físico de contato após exigir registro do hospedeiro; delega ao SistemaSensores.
- **Dependências diretas:** `this.exigirRegistro`, `this.sistemaSensores.registrarSwitchFimDeCurso`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f7b5b7280dc3c8fa](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f7b5b7280dc3c8fa).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarSensoresVeiculo:MethodDeclaration`

- **Assinatura:** `(sensores: SensoresVeiculoComposto): void`.
- **Responsabilidade / invariantes / efeitos:** Configura o ambiente inicial das leituras e instala o pacote de sensores no sistema observacional.
- **Dependências diretas:** `sensores.configurarAmbienteInicial`, `this.sistemaSensores.registrarSensoresVeiculo`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-41ac7bae56a51a91](../arquitetura/CATALOGO_DE_FUNCOES.md#f-41ac7bae56a51a91).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.reavaliarSwitchesFimDeCurso:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Reavalia contatos binários imediatamente, sem integrar tempo; destinado também ao reposicionamento ADM de sensores.
- **Dependências diretas:** `this.sistemaSensores.reavaliarSwitchesFimDeCurso`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3760886a2cb462bf](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3760886a2cb462bf).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarGuiaLinear:MethodDeclaration`

- **Assinatura:** `(guia: GuiaLinear): void`.
- **Responsabilidade / invariantes / efeitos:** Registra guia por ID único e corpo presente; não impõe movimento comandado na interface.
- **Dependências diretas:** `this.guiasLineares.has`, `Error`, `this.exigirRegistro`, `this.guiasLineares.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4b87578104c96a2f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4b87578104c96a2f).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarJuntaRotacionalDeBancada:MethodDeclaration`

- **Assinatura:** `(junta: JuntaRotacionalDeBancada): void`.
- **Responsabilidade / invariantes / efeitos:** Registra junta por ID único e exige base/braço presentes; suas forças/restrições pertencem ao core.
- **Dependências diretas:** `this.juntasRotacionaisDeBancada.has`, `Error`, `this.exigirRegistro`, `this.juntasRotacionaisDeBancada.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4a3dde9baad222b7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4a3dde9baad222b7).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.aplicarForca:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto, forcaN: Vetor3, pontoM?: Vetor3): void`.
- **Responsabilidade / invariantes / efeitos:** Solicita uma força externa, em N, mantida durante todo o próximo avanço. Para manter a força em avanços seguintes, o chamador deve solicitá-la novamente.
- **Dependências diretas:** `this.exigirRegistro`, `this.validarVetorPlanar`, `this.forcasPendentes.get`, `forcas.push`, `this.forcasPendentes.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9a9f5f5e187cc458](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9a9f5f5e187cc458).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.aplicarImpulso:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto, impulsoNs: Vetor3, pontoM?: Vetor3): void`.
- **Responsabilidade / invariantes / efeitos:** Solicita um impulso instantâneo, em N.s, aplicado uma única vez no próximo avanço.
- **Dependências diretas:** `this.exigirRegistro`, `this.validarVetorPlanar`, `this.impulsosPendentes.get`, `impulsos.push`, `this.impulsosPendentes.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3d2aac7e14626905](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3d2aac7e14626905).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterForcaArrastoAtmosferico:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Calcula o arrasto atmosférico atual em N para corpo registrado, consultando velocidade física e densidade do mesmo ambiente.
- **Dependências diretas:** `this.exigirRegistro`, `this.atmosfera.calcularArrasto`, `objeto.getEstadoFisico`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-75ef8579777a79d5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-75ef8579777a79d5).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterCondicoesAtmosfericas:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): CondicoesAtmosfericas`.
- **Responsabilidade / invariantes / efeitos:** Leitura do mesmo ambiente usado na integração; não modifica a física.
- **Dependências diretas:** `this.exigirRegistro`, `this.atmosfera.obterDensidadeNaPosicaoKgM3`, `objeto.getEstadoFisico`, `this.fracaoExpostaAr`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-db5cbfb2c2eedd9a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-db5cbfb2c2eedd9a).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterMenorDistanciaSuperficieM:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto, superficie: SuperficieFisica): number`.
- **Responsabilidade / invariantes / efeitos:** Mede menor distância assinada em m dos pontos orientados/candidatos à superfície; retorna Infinity quando não há projeção válida. Exige objeto registrado. Caminho para plano conserva ordem numérica legada; demais geometrias consultam candidatos/projeção da superfície. Não corrige penetração nem resolve contato.
- **Dependências diretas:** `this.exigirRegistro`, `objeto.getEstadoFisico`, `Math.sin`, `Math.cos`, `Math.min`, `objeto.getPontosDeContatoLocaisM().map`, `objeto.getPontosDeContatoLocaisM`, `Number.isFinite`, `Error`, `superficie.candidatosContato(this.obterPontosOrientados(objeto, objeto.getPontosDeContatoLocaisM()))
    .filter`, `superficie.candidatosContato`, `this.obterPontosOrientados`, `pontos.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f9dcad885ff21798](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f9dcad885ff21798).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterContatosComSuperficie:MethodDeclaration`

- **Assinatura:** `(): readonly ContatoSuperficieFisico[]`.
- **Responsabilidade / invariantes / efeitos:** Contatos e apoios efetivamente resolvidos pelo core no último subpasso.
- **Dependências diretas:** `this.resolvedorContatoSuperficie.obterContatos`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9cea077721cb03c3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9cea077721cb03c3).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterContatosDoObjeto:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto, superficie?: SuperficieFisica): readonly ContatoSuperficieFisico[]`.
- **Responsabilidade / invariantes / efeitos:** Contatos resolvidos deste objeto, opcionalmente limitados a uma superfície.
- **Dependências diretas:** `this.exigirRegistro`, `this.resolvedorContatoSuperficie.obterContatos().filter`, `this.resolvedorContatoSuperficie.obterContatos`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5666d3fa4dec8f19](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5666d3fa4dec8f19).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterCargasAerodinamicas:MethodDeclaration`

- **Assinatura:** `(objetos: readonly Objeto[], referenciaM: Vetor3): { forcaN: Vetor3; torqueNm: Vetor3; }`.
- **Responsabilidade / invariantes / efeitos:** Soma das mesmas forças aerodinâmicas usadas na integração, em torno da referência SI.
- **Dependências diretas:** `this.obterCondicoesAtmosfericas`, `objeto.getEstadoFisico`, `this.obterForcaArrastoAtmosferico`, `objeto.obterCentroPressaoM`, `objeto.obterForcasAerodinamicas`, `forcaN.adicionar`, `torqueNm.adicionar`, `(forca.pontoM ?? posicaoM).subtrair(referenciaM).produtoVetorial`, `(forca.pontoM ?? posicaoM).subtrair`.
- **Escritas diretas:** `forcaN`, `torqueNm`.
- **Contrato:** [f-674fcddb7e0f22e1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-674fcddb7e0f22e1).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.avancar:MethodDeclaration`

- **Assinatura:** `(deltaS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Avança deltaS físico com subpassos limitados por maxDtS e estabilidade hidrodinâmica; não consulta relógio real. deltaS em s positivo/finito. Verifica geometrias aquáticas de todos os corpos. Impulsos pendentes entram uma vez; forças externas duram toda a chamada. Limpa ambas as filas em finally e propaga falhas. Altera cinemática, sistemas, contatos, integridade, sensores e tempo pela receita compartilhada.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.hidrodinamica?.verificarDeclaracoes`, `this.objetos.values`, `Math.min`, `this.obterConjuntoEstruturalDoObjeto`, `this.hidrodinamica.limitePassoS`, `objeto.getMomentoInerciaKgM2`, `conjunto?.obterCentroDeMassaAtual`, `objeto.getEstadoFisico`, `this.integrarPasso`, `this.forcasPendentes.clear`, `this.impulsosPendentes.clear`.
- **Escritas diretas:** `passoS`, `primeiroPasso`, `restante`.
- **Contrato:** [f-6bd6caac8d77c92e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6bd6caac8d77c92e).

## Alterada: `src/physics/MundoFisico.ts::MundoFisico.integrarPasso:MethodDeclaration`

- **Assinatura:** `(dtS: number, aplicarImpulsos: boolean): void`.
- **Responsabilidade / invariantes / efeitos:** Receita explícita do passo; fenômenos físicos vivem nos subsistemas. Finaliza dano das redes térmicas optantes após trocas nos fixadores.
- **Dependências diretas:** `this.diagnosticosAngularesPasso.clear`, `this.atualizarVentoDoPasso`, `this.atualizarApoioDeTracao`, `this.objetos.values`, `objeto.prepararPassoEnergetico`, `objeto.prepararPassoOperacional`, `this.sistemaTermico.atualizar`, `this.fixadores.values`, `fixador.prepararPasso`, `this.sistemaTermico.finalizarPasso`, `this.chumbadoresAoSolo.values`, `chumbador.prepararPasso`, `this.sincronizarConjuntosEstruturais`, `this.aplicarImpulsosPendentes`, `[...this.fixadores.values()].filter`, `this.hidrodinamica?.atualizarCarregamento`, `this.conjuntosEstruturais.values`, `conjunto.membros.map`, `this.resolvedorEsforcoEstrutural.registrarCargasDistribuidas`, `this.aplicarKickGravitacional`, `this.aplicarKickHidrostatico`, `this.integrarCorpos`, `this.resolvedorColisoes.resolver`, `this.resolvedorContatoSuperficie.resolver`, `chumbador.resolverRestricao`, `this.obterConjuntoEstruturalDoObjeto`, `conjunto.restringirNoMembro`, `this.guiasLineares.values`, `guia.resolverRestricao`, `this.sistemaSensores.atualizar`.
- **Escritas diretas:** `this.dtDiagnosticoS`, `this.tempoMissaoS`.
- **Contrato:** [f-99ffa3537971f382](../arquitetura/CATALOGO_DE_FUNCOES.md#f-99ffa3537971f382).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.atualizarVentoDoPasso:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Soma rajadas ativas no intervalo [início,início+duração) ao vento base e atualiza atmosfera no tempo físico atual.
- **Dependências diretas:** `velocidade.adicionar`, `this.atmosfera.definirVelocidadeArPeloMundo`.
- **Escritas diretas:** `velocidade`, `this.velocidadeArAtualMps`.
- **Contrato:** [f-412f6c5528fa3d74](../arquitetura/CATALOGO_DE_FUNCOES.md#f-412f6c5528fa3d74).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.aplicarImpulsosPendentes:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Consome a fila de impulsos em N·s uma única vez, aplicando na ilha ou corpo isolado; ponto ausente usa centro atual.
- **Dependências diretas:** `this.objetos.get`, `this.obterConjuntoEstruturalDoObjeto`, `objeto.getEstadoFisico`, `conjunto.aplicarImpulsoNoPonto`, `this.integrador.aplicarImpulsoNoPonto`, `this.impulsosPendentes.clear`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-890059995735e624](../arquitetura/CATALOGO_DE_FUNCOES.md#f-890059995735e624).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterGravidadeMps2:MethodDeclaration`

- **Assinatura:** `(posicaoM: Vetor3): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Consulta aceleração m/s² do campo do ambiente na posição inercial em m; não integra nem depende da orientação.
- **Dependências diretas:** `this.ambiente.campo.aceleracaoEm`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b8b386144342054d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b8b386144342054d).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterConfiguracaoFisica:MethodDeclaration`

- **Assinatura:** `(): object`.
- **Responsabilidade / invariantes / efeitos:** Exporta identificação do ambiente, integração, dt máximo, revisão angular, atmosfera e água para diários/replay. Perfil completo somente quando injetado. A revisão angular distingue reconstrução intrínseca relativa RE-002B de diários anteriores; não altera parâmetros nem garante compatibilidade antiga.
- **Dependências diretas:** `this.ambiente.obterConfiguracao`, `this.perfilAtmosferico.obterConfiguracao`, `this.hidrodinamica.obterConfiguracao`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d3dca202d77d15ec](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d3dca202d77d15ec).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.aplicarKickGravitacional:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Metade do impulso gravitacional em cada membro, preservando torque de gradiente.
- **Dependências diretas:** `Map`, `this.objetos.values`, `this.validarEstadoPlanar`, `objeto.getEstadoFisico`, `this.obterGravidadeMps2(p).multiplicar`, `this.obterGravidadeMps2`, `this.obterConjuntoEstruturalDoObjeto`, `lotes.get`, `lote.push`, `lotes.set`, `this.integrador.aplicarImpulsoNoPonto`, `conjunto.obterCentroDeMassaAtual`, `lote.reduce`, `this.registrarDiagnosticoAngular`, `conjunto.aplicarImpulsosSequenciais`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-ba4f542a6685a8b0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ba4f542a6685a8b0).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.aplicarKickHidrostatico:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Aplica impulso F_empuxo·dt em N·s nos centros de volume; usa lotes sequenciais por ilha e não reaplica o arrasto dissipativo.
- **Dependências diretas:** `Map`, `this.objetos.values`, `this.hidrodinamica.obterEmpuxos`, `f.forcaN.multiplicar`, `this.obterConjuntoEstruturalDoObjeto`, `lotes.get`, `lote.push`, `lotes.set`, `this.integrador.aplicarImpulsoNoPonto`, `conjunto.aplicarImpulsosSequenciais`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-1d8fd7f1e67ca925](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1d8fd7f1e67ca925).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterDiagnosticoAngularDoPasso:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | undefined`.
- **Responsabilidade / invariantes / efeitos:** Consulta cópia das cargas angulares do último subpasso, somente se ativadas. Impulso gravitacional N·m·s vem dos dois kicks; torque aero/outros em N·m vem da lista efetivamente integrada. Não inclui impulsos de contato/ruptura, que exigem classificação separada do balanço. Não escreve estado físico.
- **Dependências diretas:** `this.diagnosticosAngularesPasso.get`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-09aef6aae989916b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-09aef6aae989916b).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.registrarDiagnosticoAngular:MethodDeclaration`

- **Assinatura:** `(conjunto: ConjuntoEstruturalRigido, impulsoGravitacionalNmS: number, forcas?: readonly ForcaAplicada[]): void`.
- **Responsabilidade / invariantes / efeitos:** Registra grandezas derivadas das cargas aplicadas à ilha, sem reaplicá-las. Sem opt-in não faz cálculos adicionais. G é o mesmo usado pela integração; outros torques são a resultante não aero (gravidade KDK entra por impulso).
- **Dependências diretas:** `this.diagnosticosAngularesPasso.get`, `conjunto.obterCentroDeMassaAtual`, `this.obterCargasAerodinamicas`, `forcas?.reduce`, `this.diagnosticosAngularesPasso.set`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5a683553b2a0f912](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5a683553b2a0f912).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.validarVetorPlanar:MethodDeclaration`

- **Assinatura:** `(v: Vetor3): void`.
- **Responsabilidade / invariantes / efeitos:** Rejeita componente Z diferente de zero no ambiente central; o legado conserva o contrato anterior.
- **Dependências diretas:** `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-bed4015e9d6bffc1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-bed4015e9d6bffc1).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.validarForcaPlanar:MethodDeclaration`

- **Assinatura:** `(f: ForcaAplicada): void`.
- **Responsabilidade / invariantes / efeitos:** Exige força/ponto em XY e torque externo somente em Z; rejeita solicitações incompatíveis com o modelo central.
- **Dependências diretas:** `this.validarVetorPlanar`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8287e1f7d35ee0e5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8287e1f7d35ee0e5).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.validarEstadoPlanar:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): void`.
- **Responsabilidade / invariantes / efeitos:** No ambiente central exige posição/velocidade XY e atitude/taxa somente em Z; não projeta estados inválidos silenciosamente.
- **Dependências diretas:** `objeto.getEstadoFisico`, `this.validarVetorPlanar`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5bccf57f8e1d2ebe](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5bccf57f8e1d2ebe).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.integrarCorpos:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Reúne forças operacionais, externas, aerodinâmicas, juntas e água; integra uma vez cada corpo isolado ou ilha e registra uso em horas. dtS em s escolhido pelo avanço. Gravidade/empuxo já aplicados por KDK são omitidos da força explícita. Pontos de aplicação são físicos e massas são instantâneas; atualiza estados somente pelos integradores/ilha. Diagnóstico opt-in captura forças no instante efetivamente integrado, após atuação e primeiro kick.
- **Dependências diretas:** `this.objetos.values`, `this.obterConjuntoEstruturalDoObjeto`, `objeto.getEstadoFisico`, `(this.forcasPendentes.get(objeto.id) ?? [])
    .map`, `this.forcasPendentes.get`, `objeto.obterForcasOperacionais().map`, `objeto.obterForcasOperacionais`, `objeto.obterForcasAerodinamicas(this.obterCondicoesAtmosfericas(objeto))
    .map`, `objeto.obterForcasAerodinamicas`, `this.obterCondicoesAtmosfericas`, `this.validarForcaPlanar`, `[...this.juntasRotacionaisDeBancada.values()].flatMap`, `this.juntasRotacionaisDeBancada.values`, `this.hidrodinamica?.calcular`, `this.integrador.integrarObjeto`, `this.obterForcaArrastoAtmosferico`, `objeto.obterCentroPressaoM`, `this.obterGravidadeMps2`, `objeto.registrarUso`, `this.conjuntosEstruturais.values`, `forcasDoConjunto.push`, `objeto.obterForcasAerodinamicas(this.obterCondicoesAtmosfericas(objeto)).map`, `this.obterGravidadeMps2(estado.posicaoM).multiplicar`, `conjunto.obterCentroDeMassaAtual`, `junta.obterForcasPara`, `this.registrarDiagnosticoAngular`, `conjunto.integrar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3e1c3598586d381e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3e1c3598586d381e).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.sincronizarConjuntosEstruturais:MethodDeclaration`

- **Assinatura:** `(dtS: number, avancarOrientacao: boolean): void`.
- **Responsabilidade / invariantes / efeitos:** Reconstrói componentes conexos dos fixadores ativos, reutiliza ilhas por assinatura de membros e remove ilhas cuja topologia deixou de existir; sincroniza rigidez.
- **Dependências diretas:** `Map`, `this.fixadores.values`, `adjacencias.get`, `Set`, `adjacentesA.add`, `adjacencias.set`, `adjacentesB.add`, `adjacencias.keys`, `visitados.has`, `visitados.add`, `pendentes.pop`, `membros.push`, `pendentes.push`, `membros.map((objeto) => objeto.id).sort().join`, `membros.map((objeto) => objeto.id).sort`, `membros.map`, `assinaturasAtivas.add`, `this.conjuntosEstruturais.get`, `ConjuntoEstruturalRigido`, `this.conjuntosEstruturais.set`, `conjunto.sincronizar`, `this.conjuntosEstruturais.keys`, `assinaturasAtivas.has`, `this.conjuntosEstruturais.delete`.
- **Escritas diretas:** `conjunto`.
- **Contrato:** [f-af4f0f7ead83e4dc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-af4f0f7ead83e4dc).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.atualizarApoioDeTracao:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Avalia pontos de aderência orientados contra superfícies sólidas com tolerância de 0,02 m; atualiza permissão de tração no core, sem ancorar corpos.
- **Dependências diretas:** `this.objetos.values`, `this.obterPontosOrientados`, `objeto.getPontosDeTracaoLocaisM`, `[...this.superficies.values()].some`, `this.superficies.values`, `objeto.atualizarContatoDeTracaoPeloCore`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e0f6d2dcba6e82f4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e0f6d2dcba6e82f4).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterPontosOrientados:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto, pontosLocais: readonly Vetor3[]): Vetor3[]`.
- **Responsabilidade / invariantes / efeitos:** Transforma pontos locais em m pela rotação Z e translação física atuais; devolve novos vetores globais.
- **Dependências diretas:** `objeto.getEstadoFisico`, `Math.cos`, `Math.sin`, `pontosLocais.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9473634128208bd2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9473634128208bd2).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterConjuntoEstruturalDoObjeto:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): ConjuntoEstruturalRigido | undefined`.
- **Responsabilidade / invariantes / efeitos:** Procura a ilha atualmente registrada que contém o mesmo objeto; ausência devolve undefined.
- **Dependências diretas:** `[...this.conjuntosEstruturais.values()].find`, `this.conjuntosEstruturais.values`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b219b09925e9fcb0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b219b09925e9fcb0).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.obterMassaEfetivaNoContato:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3): number | undefined`.
- **Responsabilidade / invariantes / efeitos:** Consulta massa efetiva em kg no ponto/normal da ilha ou fixador; undefined indica ausência dessas restrições.
- **Dependências diretas:** `this.obterConjuntoEstruturalDoObjeto`, `conjunto.obterMassaEfetivaNoContato`, `this.fixadores.values`, `fixador.obterMassaEfetivaNoContato`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-17e4d2400cfdabbe](../arquitetura/CATALOGO_DE_FUNCOES.md#f-17e4d2400cfdabbe).

## Reutilizada sem mudança: `src/physics/MundoFisico.ts::MundoFisico.exigirRegistro:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): void`.
- **Responsabilidade / invariantes / efeitos:** Impede operação do mundo sobre identidade de objeto não registrada; lança erro, sem inserir automaticamente.
- **Dependências diretas:** `this.objetos.has`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f2830aafb5289482](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f2830aafb5289482).

## Alterada: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.constructor:Constructor`

- **Assinatura:** `(definicao: DefinicaoFixadorEstrutural): FixadorEstrutural`.
- **Responsabilidade / invariantes / efeitos:** Valida portas de rede optantes e condutância W/°C, sem evoluir calor. Captura deslocamento/atitude relativos de dois corpos distintos; valida resistência de tração N e compressão opcional N positivas/finitas; inicializa temperatura °C.
- **Dependências diretas:** `Number.isFinite`, `Error`, `definicao.objetoB.getEstadoFisico().posicaoM.subtrair`, `definicao.objetoB.getEstadoFisico`, `definicao.objetoA.getEstadoFisico`, `definicao.objetoB.getEstadoFisico().orientacaoRad.subtrair`, `definicao.objetoA.obterRedeTermicaPeloCore()?.obterRegiao`, `definicao.objetoA.obterRedeTermicaPeloCore`, `definicao.objetoB.obterRedeTermicaPeloCore()?.obterRegiao`, `definicao.objetoB.obterRedeTermicaPeloCore`.
- **Escritas diretas:** `this.definicao`, `this.rompido`, `this.liberado`, `this.deslocamentoInicialM`, `this.orientacaoInicialARad`, `this.orientacaoRelativaInicialRad`, `this.rotacaoDoConjuntoRad`, `this.temperaturaAtualC`, `this.energiaConduzidaJ`, `this.potenciaConduzidaW`, `this.esforcoFisicoAtualN`, `this.maiorEsforcoFisicoRegistradoN`, `this.esforcoCompressaoAtualN`, `this.maiorEsforcoCompressaoRegistradoN`.
- **Contrato:** [f-0f5869bdaef2f59f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0f5869bdaef2f59f).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.id:GetAccessor`

- **Assinatura:** `(): string`.
- **Responsabilidade / invariantes / efeitos:** Consulta identidade declarada do vínculo.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-055ce00a96446730](../arquitetura/CATALOGO_DE_FUNCOES.md#f-055ce00a96446730).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.estaRompido:GetAccessor`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Consulta ruptura física do vínculo.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-c9224d78e0658832](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c9224d78e0658832).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.estaAtivo:GetAccessor`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Exige vínculo sem ruptura e sem liberação operacional.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-ea793a469f4e1520](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ea793a469f4e1520).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.estado:GetAccessor`

- **Assinatura:** `(): "integro" | "rompido" | "liberado"`.
- **Responsabilidade / invariantes / efeitos:** Distingue rompido, liberado e íntegro, priorizando ruptura na consulta.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-52fa73b48adba727](../arquitetura/CATALOGO_DE_FUNCOES.md#f-52fa73b48adba727).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.liberar:MethodDeclaration`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Comando de separação. O mundo reconstrói a topologia sem fabricar impulso. @remarks Libera vínculo ativo uma vez e retorna confirmação; a reconstrução do mundo separa corpos sem impulso artificial.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.liberado`.
- **Contrato:** [f-db2b2b03b157c491](../arquitetura/CATALOGO_DE_FUNCOES.md#f-db2b2b03b157c491).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.resistenciaTracaoN:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta resistência nominal declarada em N.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4103566e9591bff2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4103566e9591bff2).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.temperaturaC:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta temperatura atual do fixador em °C.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e6634126f28d273d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e6634126f28d273d).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.limiteTermicoC:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta limite térmico declarado ou referência histórica de 500 °C; não cria material novo.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-031d3fa6bd416fc1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-031d3fa6bd416fc1).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.resistenciaTracaoEfetivaN:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Reduz resistência nominal linearmente acima do limite térmico, chegando a zero após excesso de 200 °C; retorno N.
- **Dependências diretas:** `Math.max`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-548f76af02c856bd](../arquitetura/CATALOGO_DE_FUNCOES.md#f-548f76af02c856bd).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.esforcoFisicoSolicitadoN:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Maior esforço físico transmitido pelo core no passo atual, em N.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d070c5bceb8ecb50](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d070c5bceb8ecb50).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.picoEsforcoFisicoN:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Pico de esforço físico desde a criação do fixador, em N.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b6b54cc2bff852a6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b6b54cc2bff852a6).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.picoEsforcoCompressaoFisicoN:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Maior compressão física transmitida pelo core desde a criação, em N.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-bf69d7a54da177a1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-bf69d7a54da177a1).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.objetoA:GetAccessor`

- **Assinatura:** `(): Objeto`.
- **Responsabilidade / invariantes / efeitos:** Devolve primeiro corpo físico conectado, por referência.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8ad1a2e72e49b9f8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8ad1a2e72e49b9f8).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.objetoB:GetAccessor`

- **Assinatura:** `(): Objeto`.
- **Responsabilidade / invariantes / efeitos:** Devolve segundo corpo físico conectado, por referência.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d799977675a682c6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d799977675a682c6).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.obterMassaEfetivaNoContato:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3): number | undefined`.
- **Responsabilidade / invariantes / efeitos:** Massa efetiva do conjunto rígido no ponto de contato plano. Ela inclui translação de ambas as massas e a inércia composta em torno do centro de massa; é usada pelo core para medir energia de impacto sem subestimá-la.
- **Dependências diretas:** `this.objetoA.getEstadoFisico`, `this.objetoB.getEstadoFisico`, `estadoA.posicaoM.multiplicar(massaA / massaTotal).adicionar`, `estadoA.posicaoM.multiplicar`, `estadoB.posicaoM.multiplicar`, `estadoA.posicaoM.subtrair`, `estadoB.posicaoM.subtrair`, `this.objetoA.getMomentoInerciaKgM2`, `this.objetoB.getMomentoInerciaKgM2`, `pontoContatoM.subtrair(centroMassa).produtoVetorial`, `pontoContatoM.subtrair`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-91c49432497b575a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-91c49432497b575a).

## Alterada: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.prepararPasso:MethodDeclaration`

- **Assinatura:** `(dtS?: number): void`.
- **Responsabilidade / invariantes / efeitos:** Avaliado pelo core após a preparação operacional e antes da integração. Optantes trocam energia A→B pelos mesmos J em redes declaradas, sem atravessar equilíbrio. Sua temperatura é diagnóstica (média das portas), não capacidade adicional. Liberação/ruptura corta caminho; legado é preservado.
- **Dependências diretas:** `this.objetoA.obterRedeTermicaPeloCore`, `this.objetoB.obterRedeTermicaPeloCore`, `a.obterRegiao`, `b.obterRegiao`, `energiaConduzida`, `a.adicionarEnergia`, `b.adicionarEnergia`, `Math.abs`, `this.definicao.obterEsforcoSolicitadoN`.
- **Escritas diretas:** `this.esforcoFisicoAtualN`, `this.esforcoCompressaoAtualN`, `this.energiaConduzidaJ`, `this.potenciaConduzidaW`, `this.temperaturaAtualC`, `this.rompido`.
- **Contrato:** [f-7423b87c58676970](../arquitetura/CATALOGO_DE_FUNCOES.md#f-7423b87c58676970).

## Nova: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.obterDiagnosticoTermico:MethodDeclaration`

- **Assinatura:** `(): Readonly<{ modelo: "condutancia-conservativa" | "temperatura-media-legada"; temperaturaC: number; energiaConduzidaJ: number; potenciaConduzidaW: number; portas: Readonly<{ regiaoA: string; regiaoB: string; }> | undefined; }>`.
- **Responsabilidade / invariantes / efeitos:** Diagnóstico SI da condução conservativa optante; potência zero se separado. Legado apenas informa temperatura do vínculo, sem alegar transferência real.
- **Dependências diretas:** `Object.freeze`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-40f68796b6d4661c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-40f68796b6d4661c).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.registrarEsforcoFisicoN:MethodDeclaration`

- **Assinatura:** `(esforcoN: number): void`.
- **Responsabilidade / invariantes / efeitos:** Recebe o esforço calculado pelo core a partir de um impulso de contato.
- **Dependências diretas:** `Number.isFinite`, `Error`, `Math.max`.
- **Escritas diretas:** `this.esforcoFisicoAtualN`, `this.maiorEsforcoFisicoRegistradoN`, `this.rompido`.
- **Contrato:** [f-7bd68d1e2b32c98b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-7bd68d1e2b32c98b).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.registrarEsforcoDeCompressaoFisicoN:MethodDeclaration`

- **Assinatura:** `(esforcoN: number): void`.
- **Responsabilidade / invariantes / efeitos:** Recebe a compressão axial calculada pelo core quando essa capacidade foi declarada.
- **Dependências diretas:** `Number.isFinite`, `Error`, `Math.max`.
- **Escritas diretas:** `this.esforcoCompressaoAtualN`, `this.maiorEsforcoCompressaoRegistradoN`, `this.rompido`.
- **Contrato:** [f-18711e23ebfb91f8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-18711e23ebfb91f8).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.aplicarRestricao:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Mantém um conjunto rígido planar, conservando momento linear e angular. A representação atual do core usa a rotação Z para os vínculos físicos visualizados em 2D; uma futura extensão 3D poderá substituir esta parte por tensor de inércia e orientação espacial.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.objetoA.getEstadoFisico`, `this.objetoB.getEstadoFisico`, `estadoA.posicaoM.multiplicar(massaA / massaTotal).adicionar`, `estadoA.posicaoM.multiplicar`, `estadoB.posicaoM.multiplicar`, `estadoA.velocidadeMps.multiplicar(massaA / massaTotal).adicionar`, `estadoA.velocidadeMps.multiplicar`, `estadoB.velocidadeMps.multiplicar`, `estadoA.posicaoM.subtrair`, `estadoB.posicaoM.subtrair`, `bracoA.produtoVetorial`, `this.objetoA.getMomentoInerciaKgM2`, `bracoB.produtoVetorial`, `this.objetoB.getMomentoInerciaKgM2`, `this.rotacionarNoPlano`, `centroMassa.subtrair`, `deslocamentoRotacionado.multiplicar`, `centroMassa.adicionar`, `posicaoA.subtrair`, `posicaoB.subtrair`, `Vetor3`, `velocidade.adicionar`, `orientacaoA.adicionar`, `this.objetoA.atualizarEstadoPeloCore`, `this.objetoB.atualizarEstadoPeloCore`.
- **Escritas diretas:** `this.rotacaoDoConjuntoRad`.
- **Contrato:** [f-64e4382f5c4846fc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-64e4382f5c4846fc).

## Reutilizada sem mudança: `src/physics/conexoes/FixadorEstrutural.ts::FixadorEstrutural.rotacionarNoPlano:MethodDeclaration`

- **Assinatura:** `(vetor: Vetor3, anguloRad: number): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Rotaciona vetor em XY pelo ângulo rad e preserva Z, devolvendo novo vetor.
- **Dependências diretas:** `Math.cos`, `Math.sin`, `Vetor3`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d31246df8d25d2db](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d31246df8d25d2db).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.constructor:Constructor`

- **Assinatura:** `(definicao: DefinicaoObjeto): Objeto`.
- **Responsabilidade / invariantes / efeitos:** Valida definição física e limites declarados; cria estado inicial congelado e temperatura °C. Massas/dimensões positivas são responsabilidade da configuração.
- **Dependências diretas:** `Error`, `Number.isFinite`, `Object.freeze`.
- **Escritas diretas:** `this.definicao`, `this.massaVariavelKg`, `this.integridade`, `this.horasVidaUtilConsumidas`, `this.estado`, `this.inerciaCalculada`, `this.paraquedasAcoplado`, `this.temperaturaAtualC`, `this.redeTermica`, `this.energiaTermicaDeAtritoJ`, `this.energiaTermicaAerodinamicaJ`.
- **Contrato:** [f-0a5a2a6326f96011](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0a5a2a6326f96011).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.id:GetAccessor`

- **Assinatura:** `(): string`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.id`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-23fabd3a58761361](../arquitetura/CATALOGO_DE_FUNCOES.md#f-23fabd3a58761361).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.massaBaseKg:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.massaBaseKg`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b964968d0fb19009](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b964968d0fb19009).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.massaKg:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.massaBaseKg + this.massaVariavelKg + (this.paraquedasAcoplado?.massaKg ?? 0)`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-eff125a966da1f02](../arquitetura/CATALOGO_DE_FUNCOES.md#f-eff125a966da1f02).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.dimensoesM:GetAccessor`

- **Assinatura:** `(): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.dimensoesM`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f13282f5a28640a9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f13282f5a28640a9).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.resistenciaColisaoJ:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.resistenciaColisaoJ`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4f9ca4814fdaace8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4f9ca4814fdaace8).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.dissipacaoImpacto:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.dissipacaoImpacto ?? 0.15`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4e4d0b39192935bf](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4e4d0b39192935bf).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.coeficienteAtrito:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.coeficienteAtrito ?? 0.65`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-04613d7dbacb323b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-04613d7dbacb323b).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.coeficienteAtritoEntreObjetos:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.coeficienteAtritoEntreObjetos ?? 0`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a56d92711ddba117](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a56d92711ddba117).

## Alterada: `src/physics/objetos/base/Objeto.ts::Objeto.limiteTermicoC:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Limiar estrutural °C na rede optante; limite concentrado legado nos demais.
- **Dependências diretas:** `this.redeTermica?.obterRegiao`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-ef895eec91db525d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ef895eec91db525d).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.temperaturaFusaoC:GetAccessor`

- **Assinatura:** `(): number | undefined`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.temperaturaFusaoC`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8a88686ab77df881](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8a88686ab77df881).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.temperaturaFalhaTotalC:GetAccessor`

- **Assinatura:** `(): number | undefined`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.temperaturaFalhaTotalC`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e691146ec640ca1b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e691146ec640ca1b).

## Alterada: `src/physics/objetos/base/Objeto.ts::Objeto.temperaturaC:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Temperatura estrutural °C na rede optante; temperatura uniforme legada nos demais.
- **Dependências diretas:** `this.redeTermica?.obterRegiao`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f51e927410ea5fc0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f51e927410ea5fc0).

## Alterada: `src/physics/objetos/base/Objeto.ts::Objeto.capacidadeTermicaJPorC:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Capacidade estrutural J/°C na rede optante; capacidade concentrada legada nos demais.
- **Dependências diretas:** `this.redeTermica?.obterRegiao`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-50b0fd0df35bc5d7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-50b0fd0df35bc5d7).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.areaTermicaM2:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.areaTermicaM2 ?? Math.max(0.1, this.dimensoesM.x * this.dimensoesM.y)`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** `Math.max`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-cf1ecdb8534b1ed7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cf1ecdb8534b1ed7).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.coeficienteConveccaoWPorM2C:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.coeficienteConveccaoWPorM2C ?? 10`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-af88ebcdb549f68a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-af88ebcdb549f68a).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.areaFrontalM2:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.areaFrontalM2 ?? 0`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-32aa5b53d57963b0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-32aa5b53d57963b0).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.coeficienteArrasto:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.coeficienteArrasto ?? 1`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-0c3a9624f2ce2cbf](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0c3a9624f2ce2cbf).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.fracaoAquecimentoAerodinamico:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.definicao.fracaoAquecimentoAerodinamico ?? 0.1`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-584efc7e11184cb2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-584efc7e11184cb2).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.energiaTermicaDeAtritoAcumuladaJ:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.energiaTermicaDeAtritoJ`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-51f1927917f5a0d0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-51f1927917f5a0d0).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.energiaTermicaAerodinamicaAcumuladaJ:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.energiaTermicaAerodinamicaJ`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2848da0fe68bc5e8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2848da0fe68bc5e8).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.paraquedasEstaAberto:GetAccessor`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.paraquedasAcoplado?.estaAberto ?? false`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-1107671263be49a8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1107671263be49a8).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.integridadeEstrutural:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.integridade`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-16714b3ef5311e65](../arquitetura/CATALOGO_DE_FUNCOES.md#f-16714b3ef5311e65).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.horasConsumidas:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Devolve `this.horasVidaUtilConsumidas`. Efeitos indiretos seguem as dependências chamadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-6b9361e290ef0d54](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6b9361e290ef0d54).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.getEstadoFisico:MethodDeclaration`

- **Assinatura:** `(): EstadoFisico`.
- **Responsabilidade / invariantes / efeitos:** Devolve referência ao estado físico congelado atual, contendo vetores imutáveis; escrita legítima do core substitui o registro inteiro.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-7d456f55b10d8f57](../arquitetura/CATALOGO_DE_FUNCOES.md#f-7d456f55b10d8f57).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.obterForcasOperacionais:MethodDeclaration`

- **Assinatura:** `(): readonly ForcaFisicaSolicitada[]`.
- **Responsabilidade / invariantes / efeitos:** Componentes podem solicitar forças ao núcleo neste ponto do passo físico. A implementação base não produz força; ela existe para que o core não precise conhecer subclasses ou controladores de domínio.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-65a0ceec1434076f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-65a0ceec1434076f).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.obterPotenciaTermicaGeradaW:MethodDeclaration`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Hook base sem geração interna: retorna 0 W; especializações podem fornecer potência física.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-16defccad83f402d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-16defccad83f402d).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.obterPotenciaAquecimentoAerodinamicoW:MethodDeclaration`

- **Assinatura:** `(_condicoes: CondicoesAtmosfericas, potenciaDissipadaW: number): number`.
- **Responsabilidade / invariantes / efeitos:** Potência W transferida ao corpo a partir da dissipação no ar W. O padrão preserva a fração histórica; especializações retornam uma única parcela, limitada à dissipação pelo SistemaTermico. Consulta pura; aplicação só pelo core.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8a36fd8decc22230](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8a36fd8decc22230).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.obterJatoTermico:MethodDeclaration`

- **Assinatura:** `(): JatoTermico | undefined`.
- **Responsabilidade / invariantes / efeitos:** Hook base sem jato térmico: retorna undefined; especializações declaram geometria e potência.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-c5780a53173bbe5c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c5780a53173bbe5c).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.prepararPassoEnergetico:MethodDeclaration`

- **Assinatura:** `(_dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Preparação determinística de recursos antes da integração do passo. Reserva orçamentos energéticos antes de preparar qualquer consumidor.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-c3ef45c3f688a134](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c3ef45c3f688a134).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.prepararPassoOperacional:MethodDeclaration`

- **Assinatura:** `(_dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Hook base sem operação; especializações atualizam sistemas/solicitações antes da integração, sem escrever cinemática.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-22d0031bf76cca21](../arquitetura/CATALOGO_DE_FUNCOES.md#f-22d0031bf76cca21).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.obterForcasAerodinamicas:MethodDeclaration`

- **Assinatura:** `(_condicoes: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[]`.
- **Responsabilidade / invariantes / efeitos:** Forças aerodinâmicas produzidas por componentes do objeto.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5a683317d550638e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5a683317d550638e).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.acoplarParaquedas:MethodDeclaration`

- **Assinatura:** `(paraquedas: Paraquedas): void`.
- **Responsabilidade / invariantes / efeitos:** Acopla um único paraquedas físico ao objeto nesta etapa do modelo.
- **Dependências diretas:** `Error`.
- **Escritas diretas:** `this.paraquedasAcoplado`.
- **Contrato:** [f-25d8c1802ba46a63](../arquitetura/CATALOGO_DE_FUNCOES.md#f-25d8c1802ba46a63).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.acionarParaquedas:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Exige paraquedas acoplado e solicita abertura pública; não altera velocidades nem cria pouso seguro.
- **Dependências diretas:** `Error`, `this.paraquedasAcoplado.acionar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-cdf77bbe9a51340c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cdf77bbe9a51340c).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.recolherParaquedas:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Exige paraquedas acoplado e solicita recolhimento; efeito aerodinâmico será consultado pelo core.
- **Dependências diretas:** `Error`, `this.paraquedasAcoplado.recolher`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-caaad9a3f8a27be6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-caaad9a3f8a27be6).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.obterEstadoDoParaquedas:MethodDeclaration`

- **Assinatura:** `(): EstadoParaquedas | undefined`.
- **Responsabilidade / invariantes / efeitos:** Consulta estado do componente acoplado ou undefined quando ausente; não abre/recolhe nem integra.
- **Dependências diretas:** `this.paraquedasAcoplado?.obterEstado`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-fc2e1c6d21493f40](../arquitetura/CATALOGO_DE_FUNCOES.md#f-fc2e1c6d21493f40).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.configurarAreaDoParaquedas:MethodDeclaration`

- **Assinatura:** `(areaFrontalM2: number): void`.
- **Responsabilidade / invariantes / efeitos:** Exige componente acoplado e delega validação/configuração da área em m².
- **Dependências diretas:** `Error`, `this.paraquedasAcoplado.configurarAreaFrontal`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-ed5813132a308e2b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ed5813132a308e2b).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.getAreaArrastoEfetivaM2:MethodDeclaration`

- **Assinatura:** `(velocidadeRelativaMps?: Vetor3): number`.
- **Responsabilidade / invariantes / efeitos:** Soma área projetada do corpo e área do paraquedas efetivamente aberto em m²; não aplica arrasto.
- **Dependências diretas:** `this.obterAreaBaseProjetadaM2`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9772c89d7b8fb24d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9772c89d7b8fb24d).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.getCoeficienteArrastoEfetivo:MethodDeclaration`

- **Assinatura:** `(velocidadeRelativaMps?: Vetor3): number`.
- **Responsabilidade / invariantes / efeitos:** Calcula Cd médio ponderado pelas áreas do corpo e paraquedas aberto; retorna zero se área total zero.
- **Dependências diretas:** `this.obterAreaBaseProjetadaM2`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-00d7e5f4edb84da9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-00d7e5f4edb84da9).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.obterCentroPressaoM:MethodDeclaration`

- **Assinatura:** `(): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Ponto de aplicação do arrasto do corpo, transformado pela orientação atual.
- **Dependências diretas:** `Math.cos`, `Math.sin`, `this.estado.posicaoM.adicionar`, `Vetor3`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d00a5622f840c0a5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d00a5622f840c0a5).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.obterAreaBaseProjetadaM2:MethodDeclaration`

- **Assinatura:** `(velocidadeRelativaMps: Vetor3): number`.
- **Responsabilidade / invariantes / efeitos:** Projeta largura XY perpendicular ao fluxo relativo e escala a área de referência X×Z; retorna área nominal quando projeção desabilitada ou fluxo desprezível.
- **Dependências diretas:** `Vetor3`, `Math.cos`, `Math.sin`, `Math.abs`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f3c40939a6d363c1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f3c40939a6d363c1).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.getPontosDeContatoLocaisM:MethodDeclaration`

- **Assinatura:** `(): readonly Vetor3[]`.
- **Responsabilidade / invariantes / efeitos:** Vértices locais elegíveis para contato com uma superfície física.
- **Dependências diretas:** `pontos.push`, `Vetor3`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b1f2e8ab94d95be1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b1f2e8ab94d95be1).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.getVerticesColisaoLocais2D:MethodDeclaration`

- **Assinatura:** `(): readonly Vetor3[]`.
- **Responsabilidade / invariantes / efeitos:** Polígono local da seção XY usado em colisões entre objetos.
- **Dependências diretas:** `Vetor3`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3c9f23c18e868b72](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3c9f23c18e868b72).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.getPontosDeTracaoLocaisM:MethodDeclaration`

- **Assinatura:** `(): readonly Vetor3[]`.
- **Responsabilidade / invariantes / efeitos:** Pontos que podem fornecer aderência para tração; objetos passivos não têm nenhum.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2018d05f39cc61f1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2018d05f39cc61f1).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.atualizarContatoDeTracaoPeloCore:MethodDeclaration`

- **Assinatura:** `(_apoiado: boolean): void`.
- **Responsabilidade / invariantes / efeitos:** Atualização exclusiva do core sobre a existência de apoio de tração.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3931fc8b6aa6c14e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3931fc8b6aa6c14e).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.getCoeficienteAtritoDeContato:MethodDeclaration`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Atrito tangencial usado pelo resolvedor de contato com superfícies.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d100c406dfb5788d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d100c406dfb5788d).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.definirMassaVariavelKg:MethodDeclaration`

- **Assinatura:** `(massaKg: number): void`.
- **Responsabilidade / invariantes / efeitos:** Valida massa variável kg finita/não negativa e substitui a parcela mutável; massa total e inércia consultam esse valor.
- **Dependências diretas:** `Number.isFinite`, `Error`.
- **Escritas diretas:** `this.massaVariavelKg`.
- **Contrato:** [f-6396eb35b4f3037e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6396eb35b4f3037e).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.registrarUso:MethodDeclaration`

- **Assinatura:** `(deltaHoras: number): void`.
- **Responsabilidade / invariantes / efeitos:** Acumula horas de uso não negativas/finitas; não aceita intervalo negativo.
- **Dependências diretas:** `Number.isFinite`, `Error`.
- **Escritas diretas:** `this.horasVidaUtilConsumidas`.
- **Contrato:** [f-ccbe7012d41fc881](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ccbe7012d41fc881).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.aplicarDanoPorImpacto:MethodDeclaration`

- **Assinatura:** `(energiaJ: number): void`.
- **Responsabilidade / invariantes / efeitos:** Acima da resistência J, reduz integridade pelo excesso relativo de energia; limita em zero e não restaura dano.
- **Dependências diretas:** `Number.isFinite`, `Error`, `Math.max`.
- **Escritas diretas:** `this.integridade`.
- **Contrato:** [f-2dedc3bfbf9467db](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2dedc3bfbf9467db).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.aplicarDanoPorCarregamentoPeloCore:MethodDeclaration`

- **Assinatura:** `(energiaAnteriorJ: number, energiaTotalJ: number): void`.
- **Responsabilidade / invariantes / efeitos:** Energia mecânica acumulada de um único carregamento, sem reaplicar o dano dos subpassos anteriores.
- **Dependências diretas:** `[energiaAnteriorJ, energiaTotalJ].every`, `Error`, `Math.max`.
- **Escritas diretas:** `this.integridade`.
- **Contrato:** [f-a5fa3ef50d09119d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a5fa3ef50d09119d).

## Alterada: `src/physics/objetos/base/Objeto.ts::Objeto.aplicarEnergiaTermicaPeloCore:MethodDeclaration`

- **Assinatura:** `(energiaJ: number, dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** API do core térmico: energia positiva aquece, negativa resfria. Rede optante recebe na superfície sem dano repetido; legado permanece igual.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.redeTermica.adicionarEnergia`, `Math.max`, `Math.min`.
- **Escritas diretas:** `this.temperaturaAtualC`, `this.integridade`.
- **Contrato:** [f-c9f39a12ef5d34b7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c9f39a12ef5d34b7).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.aplicarCalorDeAtritoPeloCore:MethodDeclaration`

- **Assinatura:** `(energiaJ: number, dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Energia mecânica dissipada em contato, registrada separadamente para telemetria.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.aplicarEnergiaTermicaPeloCore`.
- **Escritas diretas:** `this.energiaTermicaDeAtritoJ`.
- **Contrato:** [f-debce85196872e9e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-debce85196872e9e).

## Alterada: `src/physics/objetos/base/Objeto.ts::Objeto.aplicarAquecimentoAerodinamicoPeloCore:MethodDeclaration`

- **Assinatura:** `(energiaJ: number, dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Calor aero recebido uma vez na superfície optante ou corpo concentrado legado. Contador de energia mantém origem; dano regional só na finalização.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.redeTermica.adicionarEnergia`, `this.aplicarEnergiaTermicaPeloCore`.
- **Escritas diretas:** `this.energiaTermicaAerodinamicaJ`.
- **Contrato:** [f-2df99f0558a645cd](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2df99f0558a645cd).

## Nova: `src/physics/objetos/base/Objeto.ts::Objeto.configurarRedeTermicaPeloCore:MethodDeclaration`

- **Assinatura:** `(definicao: DefinicaoRedeTermica): void`.
- **Responsabilidade / invariantes / efeitos:** Instala rede optante apenas na montagem, sem alterar massa, CM ou inércia. Reinstalação é rejeitada para não apagar energia/dano durante uma missão.
- **Dependências diretas:** `Error`, `RedeTermica`.
- **Escritas diretas:** `this.redeTermica`.
- **Contrato:** [f-49a28bfc7e1c0730](../arquitetura/CATALOGO_DE_FUNCOES.md#f-49a28bfc7e1c0730).

## Nova: `src/physics/objetos/base/Objeto.ts::Objeto.obterRedeTermicaPeloCore:MethodDeclaration`

- **Assinatura:** `(): RedeTermica | undefined`.
- **Responsabilidade / invariantes / efeitos:** Porta de mutação reservada aos solucionadores do core e fixadores físicos. Apresentação deve usar observarRedeTermica e nunca evoluir esta referência.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2428daa6a99ed3ee](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2428daa6a99ed3ee).

## Nova: `src/physics/objetos/base/Objeto.ts::Objeto.observarRedeTermica:MethodDeclaration`

- **Assinatura:** `(): Readonly<{ revisao: "RE-004-r1"; regioes: readonly Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>[]; energiaArmazenadaJ: number; energiaIncidenteJ: number; energiaGeradaJ: number; energiaConducaoExternaJ: number; energiaContatoJ: number; energiaRadiadaJ: number; energiaConveccaoJ: number; residuoEnergiaJ: number; potenciaIncidenteW: number; potenciaRadiadaW: number; potenciaConveccaoW: number; conducoes: readonly Readonly<{ energiaJ: number; potenciaW: number; a: string; b: string; condutanciaWPorC: number; condutanciaSemProtecaoWPorC: number; }>[]; }> | undefined`.
- **Responsabilidade / invariantes / efeitos:** Snapshot térmico somente leitura; ausente preserva semântica concentrada.
- **Dependências diretas:** `this.redeTermica?.observar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-42efdd82fec8c0c0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-42efdd82fec8c0c0).

## Nova: `src/physics/objetos/base/Objeto.ts::Objeto.finalizarPassoTermicoPeloCore:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Aplica incremento de dano estrutural uma vez por passo térmico, somando-o ao dano mecânico já existente. Superfície não reduz estrutura diretamente. A fase térmica precede contatos cinemáticos: seu calor evolui no próximo passo.
- **Dependências diretas:** `this.redeTermica.obterRegiao`, `this.redeTermica.degradar`, `Math.max`.
- **Escritas diretas:** `this.integridade`.
- **Contrato:** [f-0e87f43f588acec7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0e87f43f588acec7).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.atualizarEstadoPeloCore:MethodDeclaration`

- **Assinatura:** `(estado: EstadoFisico): void`.
- **Responsabilidade / invariantes / efeitos:** API reservada ao MundoFisico; não deve ser chamada por controladores ou UI.
- **Dependências diretas:** `Object.freeze`.
- **Escritas diretas:** `this.estado`.
- **Contrato:** [f-2c7176aa0d28ef32](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2c7176aa0d28ef32).

## Reutilizada sem mudança: `src/physics/objetos/base/Objeto.ts::Objeto.getMomentoInerciaKgM2:MethodDeclaration`

- **Assinatura:** `(): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Aproximação de paralelepípedo homogêneo nos eixos locais. @remarks Calcula inércia de caixa homogênea pelos eixos locais usando massa instantânea e dimensões atuais. Retorno kg·m²; cache exige mesma massa e dimensões XYZ. Momento próprio é separado do termo de eixos paralelos da ilha; não modela tensor espacial completo.
- **Dependências diretas:** `Vetor3`.
- **Escritas diretas:** `this.inerciaCalculada`.
- **Contrato:** [f-3b34554ea0acd89f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3b34554ea0acd89f).

## Reutilizada sem mudança: `src/physics/objetos/componentes/AletaAerodinamica.ts::AletaAerodinamica.constructor:Constructor`

- **Assinatura:** `(definicaoAleta: DefinicaoAletaAerodinamica): AletaAerodinamica`.
- **Responsabilidade / invariantes / efeitos:** Cria aleta física com parâmetros SI positivos, deflexão menor que π/2 e circuito real de alimentação; mantém identidade/massa própria no mundo.
- **Dependências diretas:** `super`, `valoresPositivos.every`, `Error`, `Number.isFinite`, `ConexaoEletrica`.
- **Escritas diretas:** `this.definicaoAleta`, `this.comandoDeflexaoRad`, `this.anguloDeflexaoAtualRad`, `this.conexaoEletrica`.
- **Contrato:** [f-54ffb990a0b9fd30](../arquitetura/CATALOGO_DE_FUNCOES.md#f-54ffb990a0b9fd30).

## Reutilizada sem mudança: `src/physics/objetos/componentes/AletaAerodinamica.ts::AletaAerodinamica.deflexaoAtualRad:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta posição efetivamente atingida pelo atuador em rad, distinta do comando.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d1ba873c60de7b77](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d1ba873c60de7b77).

## Reutilizada sem mudança: `src/physics/objetos/componentes/AletaAerodinamica.ts::AletaAerodinamica.comandoAtualRad:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta alvo de deflexão em rad.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-6facf1f5c35c42f1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6facf1f5c35c42f1).

## Reutilizada sem mudança: `src/physics/objetos/componentes/AletaAerodinamica.ts::AletaAerodinamica.solicitarDeflexaoRad:MethodDeclaration`

- **Assinatura:** `(valorRad: number): void`.
- **Responsabilidade / invariantes / efeitos:** Valida ângulo finito em rad e satura comando no curso declarado; não move instantaneamente a aleta.
- **Dependências diretas:** `Number.isFinite`, `Error`, `Math.max`, `Math.min`.
- **Escritas diretas:** `this.comandoDeflexaoRad`.
- **Contrato:** [f-8e46742911ecfd63](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8e46742911ecfd63).

## Alterada: `src/physics/objetos/componentes/AletaAerodinamica.ts::AletaAerodinamica.prepararPassoOperacional:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Porta regional opcional limita velocidade pela integridade própria do mecanismo; ausência preserva fator 1. Prepara circuito no subpasso, exige energia/controle/integridade, limita variação por rad/s e fração de energia efetiva; atualiza somente a deflexão interna do atuador.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.conexaoEletrica.prepararPasso`, `Math.max`, `this.definicaoAleta.operacaoAutorizada`, `this.definicaoAleta.lerEficienciaAtuacao`, `Math.min`, `Math.abs`, `this.conexaoEletrica.fornecerEnergia`.
- **Escritas diretas:** `this.anguloDeflexaoAtualRad`.
- **Contrato:** [f-4e987276a8db4cad](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4e987276a8db4cad).

## Reutilizada sem mudança: `src/physics/objetos/componentes/AletaAerodinamica.ts::AletaAerodinamica.obterForcasAerodinamicas:MethodDeclaration`

- **Assinatura:** `(condicoes: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[]`.
- **Responsabilidade / invariantes / efeitos:** Calcula sustentação proporcional a q·A·Clα·deflexão·integridade na direção perpendicular ao fluxo relativo; retorna forças/ponto reais. Sem fluxo, densidade ou integridade não há força; arrasto permanece único na classe-base/core.
- **Dependências diretas:** `this.getEstadoFisico`, `estado.velocidadeMps.subtrair`, `Math.cos`, `Math.sin`, `Vetor3`, `velocidadeRelativa.multiplicar`, `lateralDoCorpo.subtrair`, `fluxoUnitario.multiplicar`, `lateralDoCorpo.produtoEscalar`, `direcaoLateral.multiplicar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-89136d5b05b3ebd7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-89136d5b05b3ebd7).

## Reutilizada sem mudança: `src/physics/objetos/componentes/AletaAerodinamica.ts::AletaAerodinamica.deflexaoMaximaRad:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta limite mecânico configurado em rad.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-ada0794e720d3f92](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ada0794e720d3f92).

## Reutilizada sem mudança: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.constructor:Constructor`

- **Assinatura:** `(definicao: DefinicaoAletaAerodinamica, lerRolagemRad: () => number, montagemIntegra: () => boolean, parametros?: ParametrosReentrada): FlapReentrada`.
- **Responsabilidade / invariantes / efeitos:** Recebe somente porta de leitura da projeção e permissivo da montagem.
- **Dependências diretas:** `super`, `lerRolagemRad`.
- **Escritas diretas:** `this.lerRolagemRad`, `this.montagemIntegra`, `this.parametros`, `this.phiUltimoConectadoRad`, `this.taxaEfetivaRadps`.
- **Contrato:** [f-713ac4483df17789](../arquitetura/CATALOGO_DE_FUNCOES.md#f-713ac4483df17789).

## Reutilizada sem mudança: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.prepararPassoOperacional:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Reutiliza atuador elétrico e acompanha bank enquanto conectado. Após separação conserva última projeção prescrita: o corpo livre mantém cargas aerodinâmicas, e sua posição/atitude XY continuam sendo calculadas exclusivamente pelo core.
- **Dependências diretas:** `super.prepararPassoOperacional`, `this.montagemIntegra`, `this.lerRolagemRad`.
- **Escritas diretas:** `this.taxaEfetivaRadps`, `this.phiUltimoConectadoRad`.
- **Contrato:** [f-d940577d02a1ae47](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d940577d02a1ae47).

## Reutilizada sem mudança: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.obterForcasAerodinamicas:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[]`.
- **Responsabilidade / invariantes / efeitos:** Força perpendicular ao fluxo no CP real do flap, N, proporcional a q. Corpo destacado mantém lift/drag próprios e última projeção de bank, sem transmitir forças a distância para o orbitador.
- **Dependências diretas:** `this.getEstadoFisico`, `e.velocidadeMps.subtrair`, `Math.sin`, `new Vetor3(-v.y / V, v.x / V, 0).multiplicar`, `Vetor3`, `projetarSustentacao`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e32af2d35fa6fa2c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e32af2d35fa6fa2c).

## Reutilizada sem mudança: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.getCoeficienteArrastoEfetivo:MethodDeclaration`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Cd positivo por deflexão real; permanece no caminho único de arrasto do core.
- **Dependências diretas:** `Math.sin`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f2617c9c3b49b631](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f2617c9c3b49b631).

## Alterada: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.obterPotenciaAquecimentoAerodinamicoW:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas, dissipacaoW: number): number`.
- **Responsabilidade / invariantes / efeitos:** Aquecimento indicador com raio/área configurados (padrões 0,5 m e 2 m²); rede optante fornece fluxo externo prescrito sem teto D·V local; legado conserva calor concentrado min(indicador,D·V). O core aplica uma única vez.
- **Dependências diretas:** `this.getEstadoFisico().velocidadeMps.subtrair`, `this.getEstadoFisico`, `calcularFluxoTermicoIndicador`, `this.obterRedeTermicaPeloCore`, `Math.min`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d1d83ab8a5f815b3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d1d83ab8a5f815b3).

## Alterada: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.capacidadeTermicaJPorC:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Capacidade estrutural regional optante, ou massa instantânea × c no legado.
- **Dependências diretas:** `this.obterRedeTermicaPeloCore`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3e48ec123ef93cbe](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3e48ec123ef93cbe).

## Alterada: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.obterDiagnosticoAtuacao:MethodDeclaration`

- **Assinatura:** `(): { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; integridadeMecanismo?: number | undefined; }`.
- **Responsabilidade / invariantes / efeitos:** Diagnóstico do atuador prescrito, em rad/s, por permissivos reais. Torque e carga mecânica não são inventados a partir dos 300 W elétricos do modelo. Expõe dano próprio do mecanismo, separado da superfície/estrutura.
- **Dependências diretas:** `this.obterRedeTermicaPeloCore`, `this.obterRedeTermicaPeloCore()!.obterRegiao`, `this.montagemIntegra`, `this.obterRedeTermicaPeloCore()?.obterRegiao`, `Math.abs`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b750057ae1f8513b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b750057ae1f8513b).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.constructor:Constructor`

- **Assinatura:** `(estadoInicial: EstadoFisico, limiteTermicoC: number, phiInicialRad: number, perfil: PerfilAtmosfericoReentrada, referencial: ReferencialFisico, lerVelocidadeArMps: () => Vetor3, parametros?: ParametrosReentrada): OrbitadorReentrada`.
- **Responsabilidade / invariantes / efeitos:** Material concentrado provisório e geometria de engenharia, SI. TPS/estrutura não são camadas independentes. Recebe serviços compartilhados, sem DOM/relógio.
- **Dependências diretas:** `super`, `Vetor3`, `RolagemVirtual`.
- **Escritas diretas:** `this.perfil`, `this.referencial`, `this.lerVelocidadeArMps`, `this.parametros`, `this.rolagem`.
- **Contrato:** [f-f474385619746e2c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f474385619746e2c).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.avaliar:MethodDeclaration`

- **Assinatura:** `(condicoes: CondicoesAtmosfericas): CargasReentrada`.
- **Responsabilidade / invariantes / efeitos:** Consulta cargas com a mesma densidade/vento do core e perfil compartilhado.
- **Dependências diretas:** `this.getEstadoFisico`, `avaliarAerodinamica`, `this.perfil.amostrar`, `this.referencial.altitudeGeometricaM`, `this.rolagem.observar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-14919f1c850cb153](../arquitetura/CATALOGO_DE_FUNCOES.md#f-14919f1c850cb153).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.getCoeficienteArrastoEfetivo:MethodDeclaration`

- **Assinatura:** `(vRel?: Vetor3): number`.
- **Responsabilidade / invariantes / efeitos:** Cd analítico pelo fluxo atual; arrasto é aplicado exclusivamente pelo core.
- **Dependências diretas:** `this.getEstadoFisico`, `this.avaliar`, `e.velocidadeMps.subtrair`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5af7c6e41f3ef618](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5af7c6e41f3ef618).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.obterCentroPressaoM:MethodDeclaration`

- **Assinatura:** `(): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** CP global m obtido da geometria longitudinal e atitude física XY atuais.
- **Dependências diretas:** `this.getEstadoFisico`, `this.avaliar`, `this.lerVelocidadeArMps`, `e.posicaoM.adicionar`, `Vetor3`, `Math.cos`, `Math.sin`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a11b6560d6de12a1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a11b6560d6de12a1).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.obterForcasAerodinamicas:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[]`.
- **Responsabilidade / invariantes / efeitos:** Somente sustentação projetada; não repete o arrasto aplicado pelo mundo.
- **Dependências diretas:** `this.avaliar`, `this.obterCentroPressaoM`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-acefff1a6872cd5c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-acefff1a6872cd5c).

## Alterada: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.obterPotenciaAquecimentoAerodinamicoW:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas, potenciaW: number): number`.
- **Responsabilidade / invariantes / efeitos:** Rede optante: fluxo indicador externo vezes área efetiva, sem teto D·V local. Legado limitado à dissipação D·V; substitui a fração histórica. SistemaTermico aplica uma vez e conserva contadores/dano.
- **Dependências diretas:** `this.avaliar`, `this.obterRedeTermicaPeloCore`, `Math.min`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-93990e131a83cd8a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-93990e131a83cd8a).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.prepararPassoOperacional:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Atualiza exclusivamente a cinemática virtual em subpassos do core, s; colapso estrutural indisponibiliza a capacidade, sem alterar atitude XY.
- **Dependências diretas:** `this.rolagem.definirDisponibilidade`, `this.rolagem.avancar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b9aa4b0a352500a1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b9aa4b0a352500a1).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.solicitarRolagem:MethodDeclaration`

- **Assinatura:** `(rad: number, tempoS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Solicitação operacional registrada em rad e segundos simulados.
- **Dependências diretas:** `this.rolagem.solicitar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8ed0223bd082e085](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8ed0223bd082e085).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.definirDisponibilidadeRolagem:MethodDeclaration`

- **Assinatura:** `(disponivel: boolean): void`.
- **Responsabilidade / invariantes / efeitos:** Perda de disponibilidade não altera atitude física XY.
- **Dependências diretas:** `this.rolagem.definirDisponibilidade`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-fccd1b9a46c52b5d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-fccd1b9a46c52b5d).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.observarRolagem:MethodDeclaration`

- **Assinatura:** `(): EstadoRolagemVirtual`.
- **Responsabilidade / invariantes / efeitos:** Snapshot consultável da aproximação virtual.
- **Dependências diretas:** `this.rolagem.observar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9b79263187f0a4ca](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9b79263187f0a4ca).

## Reutilizada sem mudança: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.obterHistoricoRolagem:MethodDeclaration`

- **Assinatura:** `(): readonly { readonly tempoS: number; readonly anguloRad: number; }[]`.
- **Responsabilidade / invariantes / efeitos:** Cópia do histórico de comandos prescritos para exportação.
- **Dependências diretas:** `this.rolagem.obterHistorico`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-0b0738b39eddc914](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0b0738b39eddc914).

## Reutilizada sem mudança: `src/physics/solucionadores/SistemaTermico.ts::SistemaTermico.constructor:Constructor`

- **Assinatura:** `(atmosfera: SistemaAtmosferico, temperaturaAmbienteC: number, exposicaoAoAr?: (o: Objeto) => number): SistemaTermico`.
- **Responsabilidade / invariantes / efeitos:** Configura consulta atmosférica, exposição ao ar e reservatório ambiente em °C finitos; não converte limites materiais para Kelvin.
- **Dependências diretas:** `Number.isFinite`, `Error`.
- **Escritas diretas:** `this.atmosfera`, `this.temperaturaAmbienteC`, `this.exposicaoAoAr`.
- **Contrato:** [f-4a293a694405dea2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4a293a694405dea2).

## Reutilizada sem mudança: `src/physics/solucionadores/SistemaTermico.ts::SistemaTermico.constructor.exposicaoAoAr:ArrowFunction`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Porta padrão de exposição: retorna fração 1 (totalmente no ar) quando mundo não fornece adaptação para imersão; não consulta nem aplica força.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d8491cc35a8ea84c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d8491cc35a8ea84c).

## Alterada: `src/physics/solucionadores/SistemaTermico.ts::SistemaTermico.atualizar:MethodDeclaration`

- **Assinatura:** `(objetos: readonly Objeto[], dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Geração interna, convecção ambiente, aquecimento aero e jatos em ordem determinística, dt em s do core. O hook aero devolve uma única parcela W limitada à dissipação D·V no legado; rede optante declara fluxo externo prescrito e não usa D·V local como teto universal. Especializações não aplicam calor por conta própria. Energia entra em Objeto uma vez por troca.
- **Dependências diretas:** `objeto.obterRedeTermicaPeloCore`, `rede?.iniciarPasso`, `objeto.obterPotenciaTermicaGeradaW`, `rede.adicionarEnergia`, `objeto.aplicarEnergiaTermicaPeloCore`, `this.atmosfera.obterDensidadeNaPosicaoKgM3`, `objeto.getEstadoFisico`, `this.exposicaoAoAr`, `Math.abs`, `Math.sign`, `Math.min`, `objeto.getEstadoFisico().velocidadeMps.subtrair`, `this.atmosfera.calcularArrasto`, `Math.max`, `forcaArrastoN.produtoEscalar`, `objeto.obterPotenciaAquecimentoAerodinamicoW`, `Number.isFinite`, `Error`, `objeto.aplicarAquecimentoAerodinamicoPeloCore`, `fonte.obterJatoTermico`, `fonte.getEstadoFisico`, `alvo.getEstadoFisico().posicaoM.subtrair`, `alvo.getEstadoFisico`, `vetor.produtoEscalar`, `Math.cos`, `alvo.aplicarEnergiaTermicaPeloCore`, `rede.evoluir`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-52ff1b5ad0ab53a2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-52ff1b5ad0ab53a2).

## Nova: `src/physics/solucionadores/SistemaTermico.ts::SistemaTermico.finalizarPasso:MethodDeclaration`

- **Assinatura:** `(objetos: readonly Objeto[], dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Finaliza dano regional uma vez, após condução dos fixadores. Não modifica objetos não optantes; o passo continua sob autoridade de MundoFisico.
- **Dependências diretas:** `objeto.finalizarPassoTermicoPeloCore`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-51394ca18ed8bc24](../arquitetura/CATALOGO_DE_FUNCOES.md#f-51394ca18ed8bc24).

## Reutilizada sem mudança: `src/physics/solucionadores/SistemaTermico.ts::SistemaTermico.distribuirCalorDeAtritoEntreObjetos:MethodDeclaration`

- **Assinatura:** `(objetoA: Objeto, objetoB: Objeto, energiaJ: number, dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Sem dados de efusividade, reparte a dissipação entre os materiais.
- **Dependências diretas:** `objetoA.aplicarCalorDeAtritoPeloCore`, `objetoB.aplicarCalorDeAtritoPeloCore`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b469dac88a38cf3f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b469dac88a38cf3f).

## Alterada: `src/reentrada.ts::iniciarBancada:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Fronteira de apresentação: lê controles, comanda portas de missão e desenha snapshots; tempo real serve apenas ao executor fixo, nunca à lei física. Define padrões restauráveis no formulário; recuperação exige ação explícita e nova preparação validada, sem criar cenário alternativo em erro.
- **Dependências diretas:** `elemento`, `Map`, `Object.entries`, `configurarParametrosReentrada`, `document.createElement`, `String`, `label.append`, `elemento('re-parametros').append`, `camposParametros.set`, `RenderizadorReentrada`, `iniciais.addEventListener`, `form.addEventListener`, `elemento('re-reset').addEventListener`, `elemento('re-perfil-termico').addEventListener`, `elemento('re-restaurar-padroes').addEventListener`, `elemento('re-continuar-aplicada').addEventListener`, `elemento('re-iniciar-nova').addEventListener`, `elemento('re-cancelar-escolha').addEventListener`, `modo.addEventListener`, `elemento('re-alvos').addEventListener`, `elemento(id).addEventListener`, `elemento('re-chaveamento').addEventListener`, `elemento('re-pouso').addEventListener`, `energia.addEventListener`, `elemento('re-falha-rolagem').addEventListener`, `elemento('re-separar').addEventListener`, `elemento('re-passo').addEventListener`, `elemento('re-exportar').addEventListener`, `carregarPerfilTermico`, `preparar`, `requestAnimationFrame`.
- **Escritas diretas:** `label.textContent`, `input.type`, `input.step`, `input.required`, `input.id`, `input.defaultValue`.
- **Contrato:** [f-bdf1e31dbe2aa399](../arquitetura/CATALOGO_DE_FUNCOES.md#f-bdf1e31dbe2aa399).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.elemento:FunctionDeclaration`

- **Assinatura:** `<T extends HTMLElement>(id: string): T`.
- **Responsabilidade / invariantes / efeitos:** Resolve elemento obrigatório da página, falhando explicitamente se ausente.
- **Dependências diretas:** `document.getElementById`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-043a536f0ddd232b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-043a536f0ddd232b).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.numero:FunctionDeclaration`

- **Assinatura:** `(id: string): number`.
- **Responsabilidade / invariantes / efeitos:** Lê número explícito, rejeitando vazio, não finito e restrições HTML com diagnóstico do campo. Unidades físicas são validadas também no domínio.
- **Dependências diretas:** `elemento`, `input.value.trim`, `Number.isFinite`, `Number`, `Error`, `input.labels?.[0]?.textContent?.trim`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-125d2a3542b41de5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-125d2a3542b41de5).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.opcao:FunctionDeclaration`

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

## Nova: `src/reentrada.ts::iniciarBancada.lerTermica:FunctionDeclaration`

- **Assinatura:** `(): ConfiguracaoTermicaReentrada | null`.
- **Responsabilidade / invariantes / efeitos:** Compõe parâmetros editados com os três limites dos campos dedicados. O editor não duplica limites de superfície/bateria; seus demais limites regionais são explícitos em °C. JSON inválido nunca recebe fallback.
- **Dependências diretas:** `opcao`, `JSON.parse`, `elemento`, `Error`, `numero`, `Array.isArray`, `c[nome].regioes.map`, `validarConfiguracaoTermicaReentrada`.
- **Escritas diretas:** `composto[nome]`.
- **Contrato:** [f-31a88b3524a1e832](../arquitetura/CATALOGO_DE_FUNCOES.md#f-31a88b3524a1e832).

## Nova: `src/reentrada.ts::iniciarBancada.carregarPerfilTermico:FunctionDeclaration`

- **Assinatura:** `(preservarRestauracao?: boolean): void`.
- **Responsabilidade / invariantes / efeitos:** Carrega uma receita por seleção explícita. Remove do editor apenas os três limites que já têm campos dedicados. Nenhuma temperatura evolui na UI. Na carga inicial, defaultValue preserva o valor dirty restaurado pelo navegador; trocar perfil explicitamente substitui o editor. Reinicialização do ensaio continua sendo ação explícita separada.
- **Dependências diretas:** `opcao`, `elemento`, `criarConfiguracaoTermicaReentrada`, `JSON.parse`, `JSON.stringify`.
- **Escritas diretas:** `editor.disabled`, `editor.defaultValue`, `editor.value`.
- **Contrato:** [f-1974365edf2e7548](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1974365edf2e7548).

## Alterada: `src/reentrada.ts::iniciarBancada.lerConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): ConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Lê configuração pré-ensaio; todas as conversões são explícitas e registradas. Inclui opt-in regional completo, sem calcular calor na interface.
- **Dependências diretas:** `validarConfiguracaoExplicitaReentrada`, `lerTermica`, `Object.fromEntries`, `[...camposParametros].map`, `numero`, `rad`, `opcao`, `elemento<HTMLInputElement>('re-alvo-arco').value.trim`, `elemento`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9f19a52f59d415b4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9f19a52f59d415b4).

## Alterada: `src/reentrada.ts::iniciarBancada.capturarCamposConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): Readonly<Record<string, string>>`.
- **Responsabilidade / invariantes / efeitos:** Captura somente valores de configuração, inclusive restaurados sem eventos. Inclui editor térmico; as strings detectam edição; não substituem a configuração física validada.
- **Dependências diretas:** `Object.fromEntries`, `[...iniciais.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')]
    .map`, `iniciais.querySelectorAll`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4edb2d339a14b022](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4edb2d339a14b022).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.atualizarEstadoConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Mostra pendência comparando o formulário com a última preparação. Consulta apenas strings e snapshot aplicado; nunca exporta todo o diário por frame.
- **Dependências diretas:** `JSON.stringify`, `capturarCamposConfiguracao`, `elemento`, `String`.
- **Escritas diretas:** `estado.dataset.pendente`, `estado.textContent`, `elemento('re-config-rastreio').textContent`.
- **Contrato:** [f-9662794860c9ef0a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9662794860c9ef0a).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.rejeitarConfiguracao:FunctionDeclaration`

- **Assinatura:** `(erro: unknown): void`.
- **Responsabilidade / invariantes / efeitos:** Rejeição pertence à apresentação e não altera o diário do ensaio anterior.
- **Dependências diretas:** `String`, `atualizarEstadoConfiguracao`.
- **Escritas diretas:** `rejeicoes`, `mensagem.textContent`.
- **Contrato:** [f-a0d4388c173e901d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a0d4388c173e901d).

## Alterada: `src/reentrada.ts::iniciarBancada.preparar:FunctionDeclaration`

- **Assinatura:** `(configuracao?: ConfiguracaoReentrada): boolean`.
- **Responsabilidade / invariantes / efeitos:** Recria pela fábrica após leitura/validação única; só substitui instância após construção bem sucedida. Confirma valores do diário retornado pelo domínio, sem reescrever inputs ou materiais do ensaio anterior. Testes RE-003 A–G. Oculta o aviso de cena indisponível somente após preparação válida.
- **Dependências diretas:** `ensaio.pausar`, `executor?.suspenderReferenciaRelogio`, `criarEnsaioReentrada`, `lerConfiguracao`, `novo.exportar`, `ExecutorPassoFixo`, `novo.observar`, `capturarCamposConfiguracao`, `Math.round`, `elemento`, `String`, `elemento('re-telemetria').replaceChildren`, `metricas.clear`, `cancelarEscolhaConfiguracao`, `atualizarEstadoConfiguracao`, `atualizarPainel`, `rejeitarConfiguracao`.
- **Escritas diretas:** `iniciais.disabled`, `ensaio`, `aplicada`, `executor`, `historico`, `camposAplicados`, `numeroPreparo`, `intervaloVisualPassos`, `limiteVisualAmostras`, `e.min`, `e.max`, `e.value`, `eventosMostrados`, `ultimaAtualizacaoMs`, `modo.value`, `elemento<HTMLInputElement>('re-alpha-alvo').value`, `elemento<HTMLInputElement>('re-phi-alvo').value`, `elemento('re-config-aplicada').textContent`, `mensagem.textContent`, `elemento('re-cena-indisponivel').hidden`.
- **Contrato:** [f-c51586eefc46d9d2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c51586eefc46d9d2).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.garantirConfiguracaoParaInicio:FunctionDeclaration`

- **Assinatura:** `(acao: "executar" | "passo"): boolean`.
- **Responsabilidade / invariantes / efeitos:** Nenhum novo início/passo depende de evento de edição. Revalida o formulário; ensaio pausado com edição exige escolha, inclusive se a edição for inválida.
- **Dependências diretas:** `JSON.stringify`, `capturarCamposConfiguracao`, `atualizarEstadoConfiguracao`, `elemento`, `elemento('re-continuar-aplicada').focus`, `lerConfiguracao`, `preparar`, `rejeitarConfiguracao`.
- **Escritas diretas:** `acaoPendente`, `elemento('re-config-escolha').hidden`, `mensagem.textContent`.
- **Contrato:** [f-9b4f1d58114ea0f6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9b4f1d58114ea0f6).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.executarAcaoPreparada:FunctionDeclaration`

- **Assinatura:** `(acao: "executar" | "passo"): void`.
- **Responsabilidade / invariantes / efeitos:** Executa somente sobre instância já escolhida/validada; tempo real fica na apresentação. Passo manual avança exatamente 1 s usando dt configurado.
- **Dependências diretas:** `cancelarEscolhaConfiguracao`, `ensaio.iniciar`, `executor.suspenderReferenciaRelogio`, `Math.round`, `avancar`, `ensaio.pausar`, `atualizarPainel`, `ensaio.observar`.
- **Escritas diretas:** `i`, `ultimaAtualizacaoMs`.
- **Contrato:** [f-f954882670778897](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f954882670778897).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.tratarExecucao:FunctionDeclaration`

- **Assinatura:** `(evento: SubmitEvent): void`.
- **Responsabilidade / invariantes / efeitos:** Handler de início/pausa: pausar não valida nem aplica edições.
- **Dependências diretas:** `evento.preventDefault`, `ensaio.pausar`, `executor?.suspenderReferenciaRelogio`, `atualizarPainel`, `ensaio.observar`, `garantirConfiguracaoParaInicio`, `executarAcaoPreparada`.
- **Escritas diretas:** `ultimaAtualizacaoMs`.
- **Contrato:** [f-3761f7ab8221f2db](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3761f7ab8221f2db).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.reinicializar:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Reinicialização explícita aplica a edição e conserva novo ensaio no passo 0.
- **Dependências diretas:** `cancelarEscolhaConfiguracao`, `preparar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-cb43a54875d00a72](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cb43a54875d00a72).

## Alterada: `src/reentrada.ts::iniciarBancada.restaurarConfiguracaoPadrao:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Restaura explicitamente todos os campos de configuração aos padrões HTML e SI do modelo, inclusive limiares térmicos aprovados, e prepara no tempo zero pela mesma validação. Não inicia execução nem conserva o ensaio antigo. Recarrega receita térmica padrão após reset do seletor/editor. Depende do DOM/form.reset e reinicializar; smoke cobre erro e recuperação.
- **Dependências diretas:** `form.reset`, `carregarPerfilTermico`, `reinicializar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-23de89613c49fbe8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-23de89613c49fbe8).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.avancarUmSegundo:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Avanço manual usa a mesma validação e a mesma escolha da execução contínua.
- **Dependências diretas:** `garantirConfiguracaoParaInicio`, `executarAcaoPreparada`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2c6793de2a48e002](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2c6793de2a48e002).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.cancelarEscolhaConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Fecha escolha sem tocar em corpos, diário ou valores digitados.
- **Dependências diretas:** `elemento`.
- **Escritas diretas:** `acaoPendente`, `elemento('re-config-escolha').hidden`.
- **Contrato:** [f-0245250bccc43c18](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0245250bccc43c18).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.continuarConfiguracaoAplicada:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Retoma explicitamente a configuração anterior mesmo com edição inválida; preserva edição e agenda física anterior. Não reinterpreta inputs como comandos.
- **Dependências diretas:** `executarAcaoPreparada`.
- **Escritas diretas:** `mensagem.textContent`.
- **Contrato:** [f-aa238813e3495b38](../arquitetura/CATALOGO_DE_FUNCOES.md#f-aa238813e3495b38).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.iniciarNovaConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Troca de ensaio só após validação bem sucedida da edição atual.
- **Dependências diretas:** `preparar`, `executarAcaoPreparada`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5a22c7b79b3d9a12](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5a22c7b79b3d9a12).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.exportarDiario:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Exporta somente o ensaio aplicado, identificando edição pendente. Antes de existir um ensaio válido não fabrica um diário com defaults. Download local.
- **Dependências diretas:** `Blob`, `JSON.stringify`, `ensaio.exportar`, `URL.createObjectURL`, `document.createElement`, `link.click`, `URL.revokeObjectURL`, `atualizarEstadoConfiguracao`, `elemento`.
- **Escritas diretas:** `mensagem.textContent`, `link.href`, `link.download`.
- **Contrato:** [f-e5c5a5583589aedc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e5c5a5583589aedc).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.comandar:FunctionDeclaration`

- **Assinatura:** `(c: ComandoReentrada): void`.
- **Responsabilidade / invariantes / efeitos:** Encaminha intenção e apresenta diagnóstico real, sem duplicar estados.
- **Dependências diretas:** `Error`, `ensaio.receberComando`, `String`.
- **Escritas diretas:** `mensagem.textContent`, `ultimaAtualizacaoMs`.
- **Contrato:** [f-cf79be1a17c2b2c7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cf79be1a17c2b2c7).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.avancar:FunctionDeclaration`

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
- **Responsabilidade / invariantes / efeitos:** Renderiza comandos, física e canais térmicos regionais já calculados no core, incluindo potência, energia e causa. Não calcula transferências na UI.
- **Dependências diretas:** `metrica`, `o.altitudeM.toFixed`, `o.velocidadeMps.toFixed`, `graus`, `a.mach.toFixed`, `a.pressaoDinamicaPa.toPrecision`, `a.sustentacaoN.toFixed`, `a.sustentacaoXYN.toFixed`, `a.arrastoN.toFixed`, `a.sustentacaoLateralOmitidaN.toFixed`, `o.cargaG.toFixed`, `o.desaceleracaoMps2.toFixed`, `o.aceleracaoMps2.x.toFixed`, `o.aceleracaoMps2.y.toFixed`, `o.torqueAerodinamicoNm.toFixed`, `a.centroPressaoLocalM.toFixed`, `a.fluxoTermicoIndicadorWm2.toPrecision`, `o.temperaturaC.toFixed`, `o.termica?.corpo.regioes.find`, `(100 * o.integridade).toFixed`, `o.massaKg.toFixed`, `o.energiaAbsorvidaJ.toPrecision`, `o.dissipacaoW.toPrecision`, `o.calorTransferidoW.toPrecision`, `o.potenciaAtmosferaW.toPrecision`, `a.knudsen.toPrecision`, `o.estado.velocidadeAngularRadps.z.toPrecision`, `o.rotacao.momentoIntrinsecoKgM2ps.toPrecision`, `o.rotacao.momentoOrbitalKgM2ps.toPrecision`, `o.inerciaKgM2.toPrecision`, `o.rotacao.torqueGravitacionalNm.toPrecision`, `(o.rotacao.cargasEfetivamenteIntegradas?.torqueOutrosContinuosNm ?? 0).toPrecision`, `o.rotacao.residuoPassoKgM2ps.toPrecision`, `o.rotacao.residuoAcumuladoKgM2ps.toPrecision`, `o.energiaMecanicaEspecificaJPorKg.toPrecision`, `o.velocidadeRadialMps.toFixed`, `o.velocidadeTangencialMps.toFixed`, `o.extremos.globais.pressaoDinamicaPa.maximo.valor.toPrecision`, `o.extremos.globais.fluxoTermicoIndicadorWm2.maximo.valor.toPrecision`, `o.respostaTermica.potenciaIndicadorCorpoW.toPrecision`, `o.respostaTermica.potenciaTransferidaCorpoW.toPrecision`, `o.controle.torqueSolicitadoNm.toPrecision`, `fronteira.distanciaRestanteM.toFixed`, `fronteira.hipoteses.map(h => `${h.aceleracaoLiquidaMps2} m/s² → ${h.velocidadeLimiteNecessariaMps?.toFixed(0)} m/s (desvio ${h.desvioVelocidadeMps?.toFixed(0)})`).join`, `fronteira.hipoteses.map`, `o.energiaBateriaJ.toFixed`, `o.temperaturaBateriaC.toFixed`, `(100 * o.integridadeBateria).toFixed`, `o.flaps.entries`, `f.temperaturaC.toFixed`, `o.termica?.flaps[i].regioes.find`, `(100 * f.integridade).toFixed`, `atualizarEstadoConfiguracao`, `o.termica.flaps.map`, `r.temperaturaC.toFixed`, `(r.integridade * 100).toFixed`, `rede.potenciaIncidenteW.toPrecision`, `rede.potenciaRadiadaW.toPrecision`, `rede.potenciaConveccaoW.toPrecision`, `rede.energiaArmazenadaJ.toPrecision`, `rede.energiaRadiadaJ.toPrecision`, `rede.energiaConveccaoJ.toPrecision`, `rede.energiaConducaoExternaJ.toPrecision`, `rede.residuoEnergiaJ.toPrecision`, `l.potenciaW.toPrecision`, `l.energiaJ.toPrecision`, `f.termica.potenciaConduzidaW.toPrecision`, `f.termica.energiaConduzidaJ.toPrecision`, `elemento`, `o.flaps.every`, `o.tempoS.toFixed`, `aplicada!.passoS.toPrecision`, `executor!.tempoPendenteS.toFixed`, `diagnostico.replaceChildren`, `document.createElement`, `r.atual.toPrecision`, `linha.append`, `diagnostico.append`, `ensaio?.obterEventos`, `eventos.at`, `lista.replaceChildren`, `eventos.slice`, `evento.tempoS.toFixed`, `lista.append`.
- **Escritas diretas:** `play.textContent`, `iniciais.disabled`, `manuais.disabled`, `modo.value`, `modo.disabled`, `elemento<HTMLButtonElement>('re-passo').disabled`, `elemento<HTMLSelectElement>('re-chaveamento').value`, `energia.textContent`, `elemento('re-tempo-real').textContent`, `linha.className`, `descricao.textContent`, `valor.textContent`, `li.textContent`, `eventosMostrados`.
- **Contrato:** [f-886d03c02bf67e85](../arquitetura/CATALOGO_DE_FUNCOES.md#f-886d03c02bf67e85).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.quadro:FunctionDeclaration`

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

## Nova: `scripts/validar-compatibilidade-re003.ts::validarCompatibilidadeLegada:FunctionDeclaration`

- **Assinatura:** `(): Promise<void>`.
- **Responsabilidade / invariantes / efeitos:** Compara agenda de 480 passos no código arquivado 9db1ef9 e atual, no mesmo Node/V8. Precondição: RE004_BASE_LEGADA aponta à extração de git archive dessa revisão. Não altera arquivos RE-003. Separa incompatibilidade numérica entre runtimes (já existente) de regressão introduzida pelo modelo regional.
- **Dependências diretas:** `Error`, `import`, `resolve`, `JSON.parse`, `readFileSync`, `antigo.reproduzirEnsaioReentrada`, `String`, `JSON.stringify`, `executar`, `assert.deepEqual`, `reproduzirEnsaioReentrada(referencia).exportar`, `reproduzirEnsaioReentrada`, `writeFileSync`, `console.log`.
- **Escritas diretas:** `resultadoBrowserLegado`.
- **Contrato:** [f-f9128c669cbe52ff](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f9128c669cbe52ff).

## Nova: `scripts/validar-compatibilidade-re003.ts::validarCompatibilidadeLegada.executar:FunctionDeclaration`

- **Assinatura:** `(fabrica: typeof criarEnsaioReentrada): DiarioReentrada`.
- **Responsabilidade / invariantes / efeitos:** Executa a mesma agenda na fábrica fornecida; usa comandos/portas existentes, sem editar estados térmicos/cinemáticos ou tolerar diferenças de resultados.
- **Dependências diretas:** `fabrica`, `e.iniciar`, `e.pausar`, `e.receberComando`, `assert`, `e.avancarPasso`, `e.exportar`.
- **Escritas diretas:** `indice`.
- **Contrato:** [f-c794be49d1420031](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c794be49d1420031).

## Nova: `scripts/validar-termica-re004.ts::compararTermica:FunctionDeclaration`

- **Assinatura:** `(): Promise<void>`.
- **Responsabilidade / invariantes / efeitos:** Janela de medição orbital com receita RE-003 conservada: 120 km, 7700 m/s, γ=-1°, α=40°, automático, semente 1, limites superficiais/legados 5000 °C. Não encerra o cenário físico: coleta 900 s, inclusive após falha. Cada perfil escreve evidência nova em RE-004, sem sobrescrever fixtures/ensaios antigos. RE004_BASE_LEGADA permite usar árvore arquivada do commit anterior como controle.
- **Dependências diretas:** `['legado', 'sem-tps', 'tps-experimental'].includes`, `Error`, `Number`, `Number.isFinite`, `import`, `resolve`, `Classe`, `criarConfiguracaoTermicaReentrada`, `e.obterIdentificacao`, `coletar`, `e.observar`, `e.iniciar`, `Math.round`, `assert`, `e.avancarPasso`, `console.log`, `JSON.stringify`, `mkdirSync`, `e.obterEventos`, `writeFileSync`, `resultado.final.flaps.map`.
- **Escritas diretas:** `i`.
- **Contrato:** [f-ef79af3cabe5b51d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ef79af3cabe5b51d).

## Nova: `scripts/validar-termica-re004.ts::compararTermica.coletar:FunctionDeclaration`

- **Assinatura:** `(o: ObservacaoReentrada): void`.
- **Responsabilidade / invariantes / efeitos:** Projeta observação para curvas e comparação; sem integrar energia ou alterar estados. Guarda todas as regiões e termos do balanço, além da trajetória.
- **Dependências diretas:** `assert`, `Number.isFinite`, `Math.max`, `Math.abs`, `amostras.push`, `o.flaps.map`.
- **Escritas diretas:** `residuoMaximoJ`.
- **Contrato:** [f-38093423cb9475b9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-38093423cb9475b9).

## Nova: `src/physics/reentrada/ConfiguracaoTermicaReentrada.ts::criarConfiguracaoTermicaReentrada:FunctionDeclaration`

- **Assinatura:** `(perfil: PerfilTermicoReentrada, limiteCorpoC?: number, limiteFlapC?: number, limiteBateriaC?: number): ConfiguracaoTermicaReentrada`.
- **Responsabilidade / invariantes / efeitos:** Receita de estudo SI inteiramente hipotética, sem dados de certificação. Três capacidades equivalentes por corpo/flap; revestimento/estrutura/interior são separados mesmo sem TPS. Massa térmica não é acrescida à massa mecânica. Limites antigos passam explicitamente à superfície; estrutura 800 °C e mecanismo 120 °C são hipóteses ajustáveis, independentes da bateria (60 °C).
- **Dependências diretas:** `Error`, `regiao`, `validarConfiguracaoTermicaReentrada`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-1043d2497bfcabb6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1043d2497bfcabb6).

## Nova: `src/physics/reentrada/ConfiguracaoTermicaReentrada.ts::regiao:FunctionDeclaration`

- **Assinatura:** `(id: string, material: string, massaTermicaKg: number, calorEspecificoJPorKgC: number, areaExpostaM2: number, emissividade: number, limiteTermicoC: number): RegiaoTermica`.
- **Responsabilidade / invariantes / efeitos:** Constrói dados regionais explícitos em kg, J/(kg·°C), m² e °C; não evolui calor.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9b4a1f6cf6ccceae](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9b4a1f6cf6ccceae).

## Nova: `src/physics/reentrada/ConfiguracaoTermicaReentrada.ts::validarConfiguracaoTermicaReentrada:FunctionDeclaration`

- **Assinatura:** `(e: ConfiguracaoTermicaReentrada): ConfiguracaoTermicaReentrada`.
- **Responsabilidade / invariantes / efeitos:** Valida todas as redes e caminho interno→bateria, retornando cópias congeladas. Não preenche uma receita regional incompleta, nem converte limites de Kelvin.
- **Dependências diretas:** `['sem-tps', 'tps-experimental'].includes`, `e.hipotese.trim`, `Object.keys(e).some`, `Object.keys`, `Number.isFinite`, `Error`, `validarRedeTermica`, `Object.freeze`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9ed2ed08efdf2951](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9ed2ed08efdf2951).

## Nova: `src/physics/termica/RedeTermica.ts::validarRedeTermica:FunctionDeclaration`

- **Assinatura:** `(entrada: DefinicaoRedeTermica): DefinicaoRedeTermica`.
- **Responsabilidade / invariantes / efeitos:** Valida topologia acíclica de dados, SI finitos e temperaturas ≥ 0 K. Campos desconhecidos são rejeitados. Hipóteses de material são obrigatórias; retorna cópia congelada. Não aceita limites materiais em Kelvin nem converte massas.
- **Dependências diretas:** `Array.isArray`, `Error`, `Object.keys(entrada).some`, `Object.keys`, `validarTemperatura`, `Set`, `entrada.regioes.map`, `ids.has`, `entrada.ligacoes.map`, `Object.freeze`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e1b7ca33c8d712ad](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e1b7ca33c8d712ad).

## Nova: `src/physics/termica/RedeTermica.ts::validarTemperatura:FunctionDeclaration`

- **Assinatura:** `(c: number): void`.
- **Responsabilidade / invariantes / efeitos:** Domínio numérico: °C finitos entre zero absoluto e 10⁷ °C. O extremo superior apenas rejeita estados fora do domínio computacional; não limita temperaturas calculadas à faixa de sobrevivência de materiais nem satura aquecimento.
- **Dependências diretas:** `Number.isFinite`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-6915fd8c4cec89d9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6915fd8c4cec89d9).

## Nova: `src/physics/termica/RedeTermica.ts::energiaConduzida:FunctionDeclaration`

- **Assinatura:** `(taC: number, tbC: number, caJPorC: number, cbJPorC: number, gWPorC: number, dtS: number): number`.
- **Responsabilidade / invariantes / efeitos:** Troca pareada analítica de capacidades constantes. Retorna J de A para B, preservando soma de energia sem atravessar equilíbrio mesmo com G·dt elevado.
- **Dependências diretas:** `[taC, tbC, caJPorC, cbJPorC, gWPorC, dtS].every`, `Error`, `Math.expm1`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-c33c6c1b4e0d7cfc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c33c6c1b4e0d7cfc).

## Nova: `src/physics/termica/RedeTermica.ts::RedeTermica.constructor:Constructor`

- **Assinatura:** `(definicao: DefinicaoRedeTermica): RedeTermica`.
- **Responsabilidade / invariantes / efeitos:** Copia definição validada e cria capacidades regionais sem objetos/massas novos.
- **Dependências diretas:** `validarRedeTermica`, `this.definicao.regioes.map`, `this.definicao.ligacoes.map`.
- **Escritas diretas:** `this.definicao`, `this.estados`, `this.recebidaJ`, `this.incidenteJ`, `this.geradaJ`, `this.externaJ`, `this.contatoJ`, `this.radiadaJ`, `this.conveccaoJ`, `this.potenciaIncidenteW`, `this.potenciaRadiadaW`, `this.potenciaConveccaoW`, `this.conduzidaLigacoesJ`, `this.potenciasConducaoW`, `this.incidentePassoJ`.
- **Contrato:** [f-af0b746b7499fe37](../arquitetura/CATALOGO_DE_FUNCOES.md#f-af0b746b7499fe37).

## Nova: `src/physics/termica/RedeTermica.ts::RedeTermica.indice:MethodDeclaration`

- **Assinatura:** `(id: string): number`.
- **Responsabilidade / invariantes / efeitos:** Resolve índice declarado ou rejeita porta ausente antes de qualquer escrita.
- **Dependências diretas:** `this.definicao.regioes.findIndex`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f7c3dda616533178](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f7c3dda616533178).

## Nova: `src/physics/termica/RedeTermica.ts::RedeTermica.obterRegiao:MethodDeclaration`

- **Assinatura:** `(id: string): Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>`.
- **Responsabilidade / invariantes / efeitos:** Consulta snapshot regional: °C, J/°C e integridade [0,1], sem acesso mutável.
- **Dependências diretas:** `this.indice`, `Object.freeze`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-df33982cf0bd44b4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-df33982cf0bd44b4).

## Nova: `src/physics/termica/RedeTermica.ts::RedeTermica.iniciarPasso:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Inicia contagem de potências do passo; não apaga energia histórica.
- **Dependências diretas:** `this.potenciasConducaoW.fill`.
- **Escritas diretas:** `this.incidentePassoJ`, `this.potenciaIncidenteW`, `this.potenciaRadiadaW`, `this.potenciaConveccaoW`.
- **Contrato:** [f-b37c1500876dfde4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b37c1500876dfde4).

## Nova: `src/physics/termica/RedeTermica.ts::RedeTermica.adicionarEnergia:MethodDeclaration`

- **Assinatura:** `(id: string, energiaJ: number, origem: OrigemCalor): void`.
- **Responsabilidade / invariantes / efeitos:** Adiciona J com origem física declarada a uma única região. Externa é condução entre objetos; valores negativos saem do corpo. Não degrada aqui: dano ocorre uma única vez por passo após todas as trocas.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.indice`, `validarTemperatura`.
- **Escritas diretas:** `this.estados[i].temperaturaC`, `this.recebidaJ`, `this.incidenteJ`, `this.incidentePassoJ`, `this.geradaJ`, `this.externaJ`, `this.contatoJ`.
- **Contrato:** [f-7c938f9cf03271a6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-7c938f9cf03271a6).

## Nova: `src/physics/termica/RedeTermica.ts::RedeTermica.evoluir:MethodDeclaration`

- **Assinatura:** `(dtS: number, conveccaoWPorM2C: number, ambienteC: number): void`.
- **Responsabilidade / invariantes / efeitos:** Evolui convecção superficial, ligações G·ΔT e radiação εσA(T⁴−Tr⁴). Kelvin somente no quarto grau. Radiação implícita por bisseção entre T e Tr impede overshoot; J realmente retirados entram no balanço, sem teto térmico. Condução interna retira e adiciona os mesmos J, sem reaplicar fonte aero.
- **Dependências diretas:** `Number.isFinite`, `Error`, `validarTemperatura`, `this.indice`, `Math.expm1`, `this.definicao.ligacoes.entries`, `this.obterRegiao`, `energiaConduzida`, `this.definicao.regioes.entries`, `Math.min`, `Math.max`.
- **Escritas diretas:** `this.potenciaIncidenteW`, `this.estados[s].temperaturaC`, `this.conveccaoJ`, `this.potenciaConveccaoW`, `this.estados[ia].temperaturaC`, `this.estados[ib].temperaturaC`, `this.estados[ia].energiaConduzidaJ`, `this.estados[ib].energiaConduzidaJ`, `this.conduzidaLigacoesJ[i]`, `this.potenciasConducaoW[i]`, `n`, `hi`, `lo`, `this.estados[i].temperaturaC`, `this.radiadaJ`, `this.potenciaRadiadaW`.
- **Contrato:** [f-dc4bd0a3ba434cf2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-dc4bd0a3ba434cf2).

## Nova: `src/physics/termica/RedeTermica.ts::RedeTermica.degradar:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Dano progressivo por região, em s, taxa equivalente à lei legada de excesso por 100 °C. Integridade não se recupera ao resfriar. Superfície não é estrutura.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.definicao.regioes.entries`, `Math.max`.
- **Escritas diretas:** `this.estados[i].integridade`.
- **Contrato:** [f-695e1ccf3bc9af80](../arquitetura/CATALOGO_DE_FUNCOES.md#f-695e1ccf3bc9af80).

## Nova: `src/physics/termica/RedeTermica.ts::RedeTermica.observar:MethodDeclaration`

- **Assinatura:** `(): Readonly<{ revisao: "RE-004-r1"; regioes: readonly Readonly<{ capacidadeJPorC: number; causa: `temperatura>${number} \u00B0C em ${string}` | null; temperaturaC: number; integridade: number; energiaConduzidaJ: number; id: string; material: string; massaTermicaKg: number; calorEspecificoJPorKgC: number; areaExpostaM2: number; emissividade: number; temperaturaInicialC: number; limiteTermicoC: number; taxaDanoPorSegundo: number; }>[]; energiaArmazenadaJ: number; energiaIncidenteJ: number; energiaGeradaJ: number; energiaConducaoExternaJ: number; energiaContatoJ: number; energiaRadiadaJ: number; energiaConveccaoJ: number; residuoEnergiaJ: number; potenciaIncidenteW: number; potenciaRadiadaW: number; potenciaConveccaoW: number; conducoes: readonly Readonly<{ energiaJ: number; potenciaW: number; a: string; b: string; condutanciaWPorC: number; condutanciaSemProtecaoWPorC: number; }>[]; }>`.
- **Responsabilidade / invariantes / efeitos:** Exporta balanço relativo ao estado inicial: ΔU = entradas − radiação − convecção. Condução entre objetos aparece com sinal; interna soma zero. Não soma energia elétrica armazenada, que é um reservatório distinto.
- **Dependências diretas:** `this.definicao.regioes.map`, `regioes.reduce`, `Object.freeze`, `this.definicao.ligacoes.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b1b103d7b850237f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b1b103d7b850237f).

## Remoções

Nenhuma função de produção removida.
