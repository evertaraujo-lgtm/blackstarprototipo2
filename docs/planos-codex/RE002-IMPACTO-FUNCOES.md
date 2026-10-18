# RE-002 — inventário final de impacto por função

Complemento do CONTRATO DE IMPACTO FUNCIONAL registrado antes das alterações em `2026-10-18-re002.md`. Base 20405b8. Funções de produção dos módulos tocados estão individualizadas: nova, alterada ou reutilizada sem mudança. Assinaturas vêm do inventário AST oficial; o snapshot extenso usa o alias público equivalente ObservacaoReentrada. Dependências/escritas são evidências estáticas; efeitos indiretos seguem as portas chamadas. Nenhuma marca de revisão humana é acrescentada por geração.

## Reutilizada sem mudança: `scripts/site/smoke.ts::abrirPagina:FunctionDeclaration`

- **Assinatura:** `(browser: Browser, largura: number, altura: number, erros: string[], falhas: string[]): Promise<Page>`.
- **Responsabilidade / invariantes / efeitos:** Cria aba observada; eventos registram erros sem mascarar respostas HTTP de falha.
- **Dependências diretas:** `browser.newPage`, `(await page.context().newCDPSession(page)).send`, `page.context().newCDPSession`, `page.context`, `page.on`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3be43bfd8ef4e2b3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3be43bfd8ef4e2b3).

## Reutilizada sem mudança: `scripts/site/smoke.ts::conferirImagens:FunctionDeclaration`

- **Assinatura:** `(page: Page): Promise<void>`.
- **Responsabilidade / invariantes / efeitos:** Exercita lazy loading/decode e verifica overflow; somente apresentação e leitura DOM.
- **Dependências diretas:** `page.evaluate`, `assert`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f647b4b757fc111c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f647b4b757fc111c).

## Alterada: `scripts/site/smoke.ts::executarSmokeSite:FunctionDeclaration`

- **Assinatura:** `(raiz: string): Promise<{ resultado: string; verificacoes: unknown[]; erros: string[]; falhas: string[]; capturas: string; }>`.
- **Responsabilidade / invariantes / efeitos:** Valida site e interfaces nativas em Chrome, sem dependência de outro checkout. @param raiz Raiz única P2 com dist compilado. SITE_URL opcional usa servidor já ativo; sem ele abre preview local em porta livre. CHROME_BIN aponta navegador. @returns Evidências compactas. Escreve somente capturas/download em /tmp ou SCREENSHOT_DIR; comanda simuladores exclusivamente por seus controles públicos. @remarks Fecha browser/preview em finally. Nunca chama Firebase ou altera fontes.
- **Dependências diretas:** `existsSync`, `Error`, `preview`, `servidor!.httpServer.address`, `mkdtempSync`, `join`, `tmpdir`, `mkdirSync`, `chromium.launch`, `abrirPagina`, `carousel.goto`, `carousel.mouse.move`, `carousel.$eval`, `carousel.waitForFunction`, `carousel.focus`, `carousel.keyboard.press`, `assert.equal`, `esperar`, `carousel.click`, `carousel.evaluate`, `carousel.emulateMedia`, `carousel.close`, `verificacoes.push`, `page.emulateMedia`, `(await page.goto(base + rota, { waitUntil: 'networkidle' }))!.status`, `page.goto`, `conferirImagens`, `page.$$eval`, `(await page.reload({ waitUntil: 'networkidle' }))!.status`, `page.reload`, `[1440, 390].includes`, `page.screenshot`, `page.focus`, `page.keyboard.press`, `page.$eval`, `assert`, `page.click`, `page.waitForFunction`, `page.close`, `fetch`, `pdf.headers.get('content-type')!.includes`, `pdf.headers.get`, `Buffer.from`, `pdf.arrayBuffer`, `bytes.subarray(0, 5).toString`, `bytes.subarray`, `readFileSync(join(raiz, publicacao.fonte)).equals`, `readFileSync`, `page.waitForEvent`, `page.locator(`a[target="_blank"][href="${publicacao.caminho}"]`).click`, `page.locator`, `leitor.waitForFunction`, `leitor.close`, `page.locator(`a[download][href="${publicacao.caminho}"]`).click`, `download.suggestedFilename`, `download.saveAs`, `readFileSync(arquivo).equals`, `Promise.all`, `page.waitForNavigation`, `URL`, `page.url`, `/^0[,. ]/.test`, `(await page.$eval('#empuxo', e => e.textContent))!.trim`, `page.selectOption`, `assert.notEqual`, `movel.goto`, `movel.click`, `movel.waitForFunction`, `movel.$eval`, `movel.$$eval`, `movel.close`, `assert.deepEqual`, `browser?.close`, `Promise`.
- **Escritas diretas:** `browser`.
- **Contrato:** [f-533365172ff4d81e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-533365172ff4d81e).

## Reutilizada sem mudança: `scripts/site/verificar.ts::listarArquivos:FunctionDeclaration`

- **Assinatura:** `(pasta: string): string[]`.
- **Responsabilidade / invariantes / efeitos:** Enumera arquivos de uma saída conhecida em ordem estável; somente leitura FS.
- **Dependências diretas:** `readdirSync(pasta, { withFileTypes: true }).flatMap(entrada => {
    const caminho = join(pasta, entrada.name);
    return entrada.isDirectory() ? listarArquivos(caminho) : [caminho];
}).sort`, `readdirSync(pasta, { withFileTypes: true }).flatMap`, `readdirSync`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-37e394dbdd56c265](../arquitetura/CATALOGO_DE_FUNCOES.md#f-37e394dbdd56c265).

## Reutilizada sem mudança: `scripts/site/verificar.ts::hashArquivo:FunctionDeclaration`

- **Assinatura:** `(caminho: string): string`.
- **Responsabilidade / invariantes / efeitos:** Lê bytes de um arquivo e retorna SHA-256; não normaliza PDF, imagens ou texto.
- **Dependências diretas:** `createHash('sha256').update(readFileSync(caminho)).digest`, `createHash('sha256').update`, `createHash`, `readFileSync`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e434e38838c174a9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e434e38838c174a9).

## Reutilizada sem mudança: `scripts/site/verificar.ts::resolverRecurso:FunctionDeclaration`

- **Assinatura:** `(dist: string, caminho: string): string`.
- **Responsabilidade / invariantes / efeitos:** Resolve URL local dentro de dist, incluindo as duas rotas sem extensão. @throws Em travessia de diretório, escape de dist ou recurso ausente. @returns Caminho absoluto existente, sem usar fallback para a homepage.
- **Dependências diretas:** `decodeURIComponent`, `resolve`, `nome.startsWith`, `arquivo.startsWith`, `Error`, `join`, `['/pesquisa', '/simulador'].includes`, `existsSync`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4430a7c8ba885481](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4430a7c8ba885481).

## Alterada: `scripts/site/verificar.ts::verificarDistribuicao:FunctionDeclaration`

- **Assinatura:** `(raiz: string): { paginas: number; imagens: number; referencias: number; pdfIdentico: boolean; }`.
- **Responsabilidade / invariantes / efeitos:** Qualifica arquivos e referências da distribuição única, sem executar simulação. @param raiz Checkout P2 com build concluído; lê dist, todas as fontes PDF e Hosting. @returns Contagens auditáveis. Não grava arquivos nem chama Firebase/deploy. @throws Em página/recurso ausente, PDF divergente, publicação de internos/legado ou configuração que possa mascarar ausência de assets com HTML.
- **Dependências diretas:** `resolve`, `Set`, `readFileSync`, `join`, `/<html[\s>]/i.test`, `Error`, `/starship_v1|vendor\/prototipo2|src\/js\//.test`, `html.matchAll`, `imagens.add`, `/^(?:https?:|data:|mailto:)/.test`, `URL`, `resolverRecurso`, `arquivo.endsWith`, `readFileSync(arquivo, 'utf8').includes`, `decodeURIComponent`, `ref.hash.slice`, `srcset.split`, `imagem.trim().split`, `imagem.trim`, `listarArquivos`, `relative(dist, arquivo).replaceAll`, `relative`, `/^(?:docs|src|scripts|vendor|node_modules|site)\/|starship_v1|\.(?:ts|map)$/.test`, `hashArquivo`, `readFileSync(pdf).subarray(0, 5).equals`, `readFileSync(pdf).subarray`, `Buffer.from`, `JSON.parse`, `hosting.rewrites?.some`, `hosting.predeploy?.includes`.
- **Escritas diretas:** `referencias`.
- **Contrato:** [f-85ec71145d9ea817](../arquitetura/CATALOGO_DE_FUNCOES.md#f-85ec71145d9ea817).

## Alterada: `scripts/smoke-reentrada.ts::executarSmokeReentrada:FunctionDeclaration`

- **Assinatura:** `(): Promise<void>`.
- **Responsabilidade / invariantes / efeitos:** Exercita dist real em desktop/mobile: controles, avanço, pausa, modo manual, bank limitado, perda elétrica, bloqueio de aproximação, dano térmico, parâmetros e exportação. Escreve evidências locais; sem deploy ou mutação direta da física no navegador.
- **Dependências diretas:** `resolve`, `mkdirSync`, `preview`, `servidor.httpServer.address`, `chromium.launch`, `browser.newPage`, `page.on`, `assert.equal`, `(await page.goto(base + '/simulador', { waitUntil: 'networkidle' }))!.status`, `page.goto`, `page.locator('a[href="/reentrada.html"]').click`, `page.locator`, `page.waitForSelector`, `assert.match`, `page.title`, `page.locator('#re-limite-corpo').inputValue`, `page.locator('#re-limite-flaps').inputValue`, `page.locator('#re-limite-bateria').inputValue`, `page.locator('#re-altitude').inputValue`, `page.locator('#re-velocidade').inputValue`, `assert`, `page.locator('#re-config').evaluate`, `page.evaluate`, `page.click`, `page.waitForFunction`, `page.locator('#re-tempo-real').textContent`, `page.waitForTimeout`, `page.selectOption`, `page.fill`, `page.locator('#re-mensagem').textContent`, `page.screenshot`, `page.locator('summary').filter({ hasText: 'Falhas de ensaio' }).click`, `page.locator('summary').filter`, `Promise.all`, `page.waitForEvent`, `download.saveAs`, `JSON.parse`, `readFileSync`, `diario.entradas.some`, `page.locator('summary').filter({ hasText: 'Configuração avançada' }).click`, `page.locator('summary').filter({ hasText: 'Parâmetros de engenharia' }).click`, `avancado.saveAs`, `page.locator('#re-manuais').isDisabled`, `verificacoes.push`, `page.close`, `assert.deepEqual`, `writeFileSync`, `JSON.stringify`, `console.log`, `browser.close`, `Promise`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4fe97b4e82bb0961](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4fe97b4e82bb0961).

## Nova: `scripts/validar-re002.ts::executarCampanhaReferencias:FunctionDeclaration`

- **Assinatura:** `(): Promise<void>`.
- **Responsabilidade / invariantes / efeitos:** Reproduz quatro receitas de referência por 838 s no core compartilhado, com amostras a cada 10 s e condições/versões completas. A duração é orçamento de coleta; não encerra a missão ou declara sucesso. Grava evidência local.
- **Dependências diretas:** `EnsaioReentrada`, `ensaio.iniciar`, `ensaio.observar`, `ensaio.avancarPasso`, `amostras.push`, `saida.push`, `ensaio.obterIdentificacao`, `ensaio.obterEventos`, `console.log`, `JSON.stringify`, `mkdirSync`, `writeFileSync`.
- **Escritas diretas:** `i`.
- **Contrato:** [f-d54d78e5c1917df6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d54d78e5c1917df6).

## Alterada: `site/build/pluginInstitucional.ts::pluginInstitucional:FunctionDeclaration`

- **Assinatura:** `(raiz: string): Plugin`.
- **Responsabilidade / invariantes / efeitos:** Integra HTMLs agrupados em site/ às rotas públicas, sem gerar conteúdo em JS. @param raiz Checkout único do P2; resolve fontes e PDF dentro desse diretório. @returns Plugin Vite: lê fontes no dev e emite HTML/PDF somente no build. @remarks Não importa domínio físico, não sincroniza repositórios nem faz deploy.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-1a321c694e8857ca](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1a321c694e8857ca).

## Alterada: `site/build/pluginInstitucional.ts::pluginInstitucional.atenderInstitucional:FunctionDeclaration`

- **Assinatura:** `(req: IncomingMessage, res: ServerResponse, next: (erro?: unknown) => void): void`.
- **Responsabilidade / invariantes / efeitos:** Mapeia somente rotas institucionais; dev serve fontes canônicas do catálogo PDF. @returns void. Altera URL interna do servidor ou responde bytes/MIME; demais recursos seguem ao Vite MPA, cujo fallback não transforma ausência em homepage.
- **Dependências diretas:** `URL`, `publicacoes.find`, `paginasInstitucionais.find`, `next`, `readFileSync`, `resolve`, `res.setHeader`, `res.end`.
- **Escritas diretas:** `req.url`.
- **Contrato:** [f-8acac9034ca2a25b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8acac9034ca2a25b).

## Reutilizada sem mudança: `site/build/pluginInstitucional.ts::pluginInstitucional.configureServer:MethodDeclaration`

- **Assinatura:** `(server: ViteDevServer): void`.
- **Responsabilidade / invariantes / efeitos:** Registra rotas das fontes no dev; não grava HTML de preparação na raiz.
- **Dependências diretas:** `server.middlewares.use`.
- **Escritas diretas:** `desenvolvimento`.
- **Contrato:** [f-27a49be181fc5126](../arquitetura/CATALOGO_DE_FUNCOES.md#f-27a49be181fc5126).

## Reutilizada sem mudança: `site/build/pluginInstitucional.ts::pluginInstitucional.configurePreviewServer:MethodDeclaration`

- **Assinatura:** `(server: PreviewServer): void`.
- **Responsabilidade / invariantes / efeitos:** Registra as mesmas URLs no preview do dist já compilado, sem fallback global.
- **Dependências diretas:** `server.middlewares.use`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3e76145b889c0ddc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3e76145b889c0ddc).

## Alterada: `site/build/pluginInstitucional.ts::pluginInstitucional.generateBundle:MethodDeclaration`

- **Assinatura:** `(_opcoes: NormalizedOutputOptions, bundle: OutputBundle): void`.
- **Responsabilidade / invariantes / efeitos:** Move as três saídas HTML para a raiz e emite cada PDF idêntico ao original. @remarks Executa após processamento HTML do Vite; recusa ausência/colisão. Não copia bundle de simulador, diretório vizinho ou documento interno.
- **Dependências diretas:** `this.error`, `this.emitFile`, `publicacao.caminho.slice`, `readFileSync`, `resolve`.
- **Escritas diretas:** `html.fileName`, `bundle[pagina]`.
- **Contrato:** [f-423d67f295d31202](../arquitetura/CATALOGO_DE_FUNCOES.md#f-423d67f295d31202).

## Alterada: `src/cenarios/EnsaioReentrada.ts::validarComandoReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada: unknown): entrada is ComandoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Valida comando serializável por chaves exatas, finitude e limites; não executa.
- **Dependências diretas:** `Array.isArray`, `Object.hasOwn`, `Object.keys`, `chaves[e.tipo].every`, `Number.isFinite`, `Math.abs`, `[e.dianteiroRad, e.traseiroRad].every`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-52a010df6b7f3e6e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-52a010df6b7f3e6e).

## Alterada: `src/cenarios/EnsaioReentrada.ts::configurarReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada?: EntradaConfiguracaoReentrada): ConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Cria configuração copiada, validada e congelada; os limiares térmicos padrão foram definidos pelo operador, não representam estrutura interna/qualificação.
- **Dependências diretas:** `copiarSnapshot`, `configurarParametrosReentrada`, `configurarFronteiraAproximacao`, `[c.altitudeM, c.velocidadeMps, c.anguloAtaqueRad, c.trajetoriaRad, c.rolagemRad,
    c.limiteOrbitadorC, c.limiteFlapsC, c.limiteBateriaC, c.passoS, c.taxaAtitudeLocalInicialRadps].every`, `Math.abs`, `Number.isSafeInteger`, `[c.automatico, c.chaveamentoAutomatico, c.vacuo].every`, `Number.isFinite`, `Math.round`, `Object.values(c.corredor).every`, `Object.values`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f88e23012b3ae8c3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f88e23012b3ae8c3).

## Reutilizada sem mudança: `src/cenarios/EnsaioReentrada.ts::estadoModulo:FunctionDeclaration`

- **Assinatura:** `(e: EstadoFisico, x: number, y: number): EstadoFisico`.
- **Responsabilidade / invariantes / efeitos:** Constrói somente estado inicial de módulo: pose relativa rígida e velocidade v+ω×r em SI. Não é usada para reposicionar objetos durante o ensaio.
- **Dependências diretas:** `Vetor3`, `Math.cos`, `Math.sin`, `e.posicaoM.adicionar`, `e.velocidadeMps.adicionar`, `e.velocidadeAngularRadps.produtoVetorial`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-532e693d7fa63ff9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-532e693d7fa63ff9).

## Alterada: `src/cenarios/EnsaioReentrada.ts::criarCenarioReentrada:FunctionDeclaration`

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

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.constructor:Constructor`

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

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.receberComando:MethodDeclaration`

- **Assinatura:** `(comando: ComandoReentrada): ResultadoComandoMissao`.
- **Responsabilidade / invariantes / efeitos:** Aplica comandos públicos e registra aceitação/bloqueio. Comando manual exige seleção manual; aproximação passa pelo supervisor e pouso direto é bloqueado.
- **Dependências diretas:** `validarComandoReentrada`, `this.supervisor.observar`, `['modo', 'alvos', 'flaps', 'rolagem'].includes`, `this.gerenciador.habilitar`, `this.gerenciador.desabilitar`, `c.flaps.forEach`, `this.controlador.configurarAlvos`, `c.flaps[0].solicitarDeflexaoRad`, `c.flaps[1].solicitarDeflexaoRad`, `c.orbitador.solicitarRolagem`, `this.supervisor.definirAutomatico`, `this.supervisor.solicitarAproximacao`, `this.atualizarSupervisor`, `this.supervisor.observar().requisitos.filter(r => !r.atendido).map(r => r.descricao).join`, `this.supervisor.observar().requisitos.filter(r => !r.atendido).map`, `this.supervisor.observar().requisitos.filter`, `c.orbitador.definirDisponibilidadeRolagem`, `c.fixadores[comando.indice].liberar`, `this.evento`.
- **Escritas diretas:** `aceito`, `motivo`.
- **Contrato:** [f-ea3e069c929c0c05](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ea3e069c929c0c05).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.avancarPasso:MethodDeclaration`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Consome solicitações arbitradas e avança um único passo no mundo compartilhado. Não encerra por tempo/evento intermediário. Registra quadratura do torque e resíduo de L intrínseco, sem correção UI. Contato/ruptura sinaliza balanço incompleto.
- **Dependências diretas:** `this.atualizarSupervisor`, `this.gerenciador.calcularSolicitacoes`, `c.sensores.obterLeituras`, `c.flaps.find(f => f.id === s.idAtuador)?.solicitarDeflexaoRad`, `c.flaps.find`, `c.orbitador.solicitarRolagem`, `c.objetos.reduce`, `geometriaConjunto`, `diagnosticarMomentoAngular`, `c.mundo.obterCargasAerodinamicas`, `c.mundo.avancar`, `c.mundo.obterDiagnosticoAngularDoPasso`, `this.balancoAngular.registrar`, `c.mundo.obterContatosComSuperficie`, `this.registrarCondicoes`, `this.extremos.registrar`, `this.lerMetricasPasso`.
- **Escritas diretas:** `this.passos`, `this.energiaDissipadaJ`.
- **Contrato:** [f-6c85c671f0b775b6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6c85c671f0b775b6).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.observar:MethodDeclaration`

- **Assinatura:** `(): ObservacaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Observação escalar/geométrica e balanço angular, copiada e congelada. Torque gravítico é o gradiente entre centros dos membros, não distribuição interna. Resíduo usa cargas efetivamente integradas; contatos/fontes impulsivas são sinalizados. Não oferece objetos mutáveis nem corrige estado.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `c.mundo.obterCondicoesAtmosfericas`, `c.orbitador.avaliar`, `geometriaConjunto`, `c.mundo.obterCargasAerodinamicas`, `cargas.forcaN.multiplicar`, `c.mundo.obterGravidadeMps2`, `c.ambiente.referencial.vetorParaLocal`, `g.membros.reduce`, `copiarSnapshot`, `this.extremos.observar`, `c.ambiente.referencial.altitudeGeometricaM`, `c.ambiente.referencial.posicaoHorizontalM`, `Math.atan2`, `e.posicaoM.subtrair`, `c.ambiente.referencial.atitudeLocalRad`, `c.orbitador.observarRolagem`, `this.controlador.observar`, `c.orbitador.obterHistoricoRolagem`, `this.supervisor.observar`, `this.gerenciador.obterUltimaArbitragem`, `gravidade.adicionar`, `diagnosticarMomentoAngular`, `this.balancoAngular.observar`, `c.mundo.obterDiagnosticoAngularDoPasso`, `c.mundo.obterContatosComSuperficie`, `aceleracaoAero.produtoEscalar`, `Math.max`, `c.objetos.reduce`, `c.orbitador.obterPotenciaAquecimentoAerodinamicoW`, `c.mundo.obterForcaArrastoAtmosferico(c.orbitador).produtoEscalar`, `c.mundo.obterForcaArrastoAtmosferico`, `e.velocidadeMps.subtrair`, `c.flaps.some`, `c.mundo.obterContatosComSuperficie().some`, `c.flaps.map`, `c.fixadores.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-05755a69bc286c7f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-05755a69bc286c7f).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.lerControle:MethodDeclaration`

- **Assinatura:** `(): { alphaRad: number; taxaArfagemRadps: number; taxaFluxoRadps: number; pressaoDinamicaPa: number; fluxoTermicoWm2: number; cargaG: number; torquePassivoNm: number; energiaMecanicaEspecificaJPorKg: number; integridadeMinima: number; inerciaKgM2: number; phiRad: number; disponivel: boolean; }`.
- **Responsabilidade / invariantes / efeitos:** Telemetria física para PD; calcula derivada angular do fluxo por v×a/|v|², sem diferenciar relógio real ou alterar estado. Torque passivo exclui lift ativo.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `geometriaConjunto`, `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `c.mundo.obterCargasAerodinamicas`, `c.mundo.obterGravidadeMps2(e.posicaoM).adicionar`, `c.mundo.obterGravidadeMps2`, `cargas.forcaN.multiplicar`, `e.velocidadeMps.subtrair`, `c.flaps.reduce`, `v.produtoVetorial`, `e.posicaoM.subtrair`, `Math.min`, `g.membros.map`, `c.orbitador.observarRolagem`, `c.flaps.every`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2db95d019a3477f5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2db95d019a3477f5).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.atualizarSupervisor:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Avalia estado real, autoridade remanescente e filtros A/B sem reutilizar limites antigos de pouso. Não há propulsão nem integração física de aproximação.
- **Dependências diretas:** `c.sensores.obterLeituras`, `this.supervisor.observar`, `this.lerControle`, `Math.min`, `c.flaps.map`, `Math.abs`, `Math.cos`, `this.supervisor.atualizar`, `Math.hypot`, `this.controlador.observar`, `c.flaps.every`, `this.evento`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b5dfd4d0081ccbd9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b5dfd4d0081ccbd9).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.registrarCondicoes:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Registra arestas de falha/recuperação de condições, não repete eventos por frame. Colisão, dano e separação não encerram evolução física.
- **Dependências diretas:** `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `c.flaps.some`, `this.controlador.observar`, `c.fixadores.some`, `c.mundo.obterContatosComSuperficie`, `this.supervisor.observar`, `this.lerControle`, `c.perfil.amostrar`, `c.ambiente.referencial.altitudeGeometricaM`, `c.orbitador.getEstadoFisico`, `c.orbitador.observarRolagem`, `c.flaps.entries`, `Math.max`, `c.flaps.map`, `Object.entries`, `this.condicoesRegistradas.get`, `this.evento`, `this.condicoesRegistradas.set`.
- **Escritas diretas:** `condicoes[`degradacao-flap-${i + 1}`]`, `condicoes[`colapso-flap-${i + 1}`]`, `valores[`degradacao-flap-${i + 1}`]`, `valores[`colapso-flap-${i + 1}`]`.
- **Contrato:** [f-5dacbb18677d6f4c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5dacbb18677d6f4c).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.evento:MethodDeclaration`

- **Assinatura:** `(tipo: string, descricao: string, categoria?: EventoMissao["categoria"], dados?: EventoMissao["dados"]): void`.
- **Responsabilidade / invariantes / efeitos:** Acrescenta evento no tempo de missão, com sequência estável e categoria.
- **Dependências diretas:** `this.eventos.push`, `this.eventos.splice`.
- **Escritas diretas:** `this.sequenciaEvento`, `this.eventosDescartados`.
- **Contrato:** [f-593973bfbdc79c20](../arquitetura/CATALOGO_DE_FUNCOES.md#f-593973bfbdc79c20).

## Nova: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.lerMetricasPasso:MethodDeclaration`

- **Assinatura:** `(): Readonly<Record<string, number>>`.
- **Responsabilidade / invariantes / efeitos:** Coleta canais físicos SI em todo passo, antes de qualquer redução visual. Sem cópia de trajetória ou recalibração de forças. Chaves/unidades acompanham o diário; extremos têm passo e instante e não dependem da renderização.
- **Dependências diretas:** `c.orbitador.getEstadoFisico`, `c.orbitador.avaliar`, `c.mundo.obterCondicoesAtmosfericas`, `this.lerControle`, `normalizarAngulo`, `this.controlador.observar`, `c.ambiente.referencial.altitudeGeometricaM`, `e.posicaoM.subtrair`, `c.mundo.obterDiagnosticoAngularDoPasso`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-08107e4693116363](../arquitetura/CATALOGO_DE_FUNCOES.md#f-08107e4693116363).

## Alterada: `src/cenarios/EnsaioReentrada.ts::EnsaioReentrada.obterIdentificacao:MethodDeclaration`

- **Assinatura:** `(): object`.
- **Responsabilidade / invariantes / efeitos:** Exporta identificação completa/revisões para o decorador de diário compartilhado.
- **Dependências diretas:** `copiarSnapshot`, `this.cenario.mundo.obterConfiguracaoFisica`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-4987311594a9418d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4987311594a9418d).

## Alterada: `src/cenarios/EnsaioReentrada.ts::criarEnsaioReentrada:FunctionDeclaration`

- **Assinatura:** `(configuracao?: EntradaConfiguracaoReentrada): RegistroMissao<ComandoReentrada, { id: string; tempoS: number; passo: number; execucao: EstadoExecucaoMissao; estado: EstadoFisico; extremos: { globais: Record<string, FaixaTemporal>; intervaloAtual: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; }; ultimoIntervalo: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; } | null; }; eventosDescartados: number; altitudeM: number; arcoM: number; velocidadeMps: number; trajetoriaRad: number; velocidadeRadialMps: number; velocidadeTangencialMps: number; energiaMecanicaEspecificaJPorKg: number; atitudeInercialRad: number; atitudeLocalRad: number; aerodinamica: CargasReentrada; rolagem: EstadoRolagemVirtual; controle: { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; torqueSolicitadoNm: number; torqueComandadoNm: number; corredor: Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }> | null; }; historicoRolagem: readonly { readonly tempoS: number; readonly anguloRad: number; }[]; supervisor: { fase: "aproximacao" | "reentrada" | "falha"; automatico: boolean; candidatoCinematico: boolean; autorizado: boolean; requisitos: readonly Readonly<RequisitoAproximacao>[]; limites: ConfiguracaoFronteiraAproximacao; avaliacao: Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }> | null; }; arbitragem: readonly SolicitacaoArbitrada[]; massaKg: number; inerciaKgM2: number; centroM: Vetor3; forcaAerodinamicaN: Vetor3; torqueAerodinamicoNm: number; aceleracaoMps2: Vetor3; rotacao: { cargasEfetivamenteIntegradas: { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | null; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; fontesImpulsivas: boolean; impulsoTorqueNmS: number; residuoPassoKgM2ps: number; residuoAcumuladoKgM2ps: number; residuoMaximoPassoKgM2ps: number; passosIncompletos: number; massaKg: number; centroM: Vetor3; velocidadeCentroMps: Vetor3; inerciaKgM2: number; momentoIntrinsecoKgM2ps: number; momentoOrbitalKgM2ps: number; momentoTotalKgM2ps: number; omegaInercialRadps: number; torqueGravitacionalNm: number; }; cargaG: number; desaceleracaoMps2: number; temperaturaC: number; integridade: number; limiteOrbitadorC: number; limiteFlapsC: number; energiaAbsorvidaJ: number; energiaDissipadaJ: number; energiaAtmosferaJ: number; respostaTermica: { energiaAbsorvidaCorpoJ: number; modelo: string; tetoUniversal: boolean; potenciaIndicadorCorpoW: number; potenciaTransferidaCorpoW: number; tpsInstalado: boolean; camadasInternasModeladas: boolean; }; estadosTerminais: { corpoDestruido: boolean; controlePerdido: boolean; contato: boolean; impactoDestrutivo: boolean; }; dissipacaoW: number; calorTransferidoW: number; potenciaAtmosferaW: number; energiaBateriaJ: number; temperaturaBateriaC: number; integridadeBateria: number; limiteBateriaC: number; flaps: { id: string; estado: EstadoFisico; comandoRad: number; deflexaoRad: number; integridade: number; temperaturaC: number; energiaAbsorvidaJ: number; conectado: boolean; fluxoTermicoIndicadorWm2: number; energizado: boolean; atuacao: { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; }; knudsenEstimado: number; modeloEscoamento: string; }[]; vinculos: { id: string; estado: "integro" | "rompido" | "liberado"; tracaoAtualN: number; picoTracaoN: number; resistenciaTracaoN: number; cisalhamentoFlexaoTorcaoModelados: boolean; }[]; raioTerraM: number; centroTerraM: Vetor3; propulsaoDisponivel: boolean; rcsDisponivel: boolean; }>`.
- **Responsabilidade / invariantes / efeitos:** Fábrica pública de ensaio registrável, sem relógio, DOM ou escrita externa.
- **Dependências diretas:** `EnsaioReentrada`, `RegistroMissao`, `ensaio.obterIdentificacao`, `Math.round`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-fbefc47b0a643060](../arquitetura/CATALOGO_DE_FUNCOES.md#f-fbefc47b0a643060).

## Alterada: `src/cenarios/EnsaioReentrada.ts::reproduzirEnsaioReentrada:FunctionDeclaration`

- **Assinatura:** `(diario: DiarioReentrada): RegistroMissao<ComandoReentrada, { id: string; tempoS: number; passo: number; execucao: EstadoExecucaoMissao; estado: EstadoFisico; extremos: { globais: Record<string, FaixaTemporal>; intervaloAtual: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; }; ultimoIntervalo: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; } | null; }; eventosDescartados: number; altitudeM: number; arcoM: number; velocidadeMps: number; trajetoriaRad: number; velocidadeRadialMps: number; velocidadeTangencialMps: number; energiaMecanicaEspecificaJPorKg: number; atitudeInercialRad: number; atitudeLocalRad: number; aerodinamica: CargasReentrada; rolagem: EstadoRolagemVirtual; controle: { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; torqueSolicitadoNm: number; torqueComandadoNm: number; corredor: Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }> | null; }; historicoRolagem: readonly { readonly tempoS: number; readonly anguloRad: number; }[]; supervisor: { fase: "aproximacao" | "reentrada" | "falha"; automatico: boolean; candidatoCinematico: boolean; autorizado: boolean; requisitos: readonly Readonly<RequisitoAproximacao>[]; limites: ConfiguracaoFronteiraAproximacao; avaliacao: Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }> | null; }; arbitragem: readonly SolicitacaoArbitrada[]; massaKg: number; inerciaKgM2: number; centroM: Vetor3; forcaAerodinamicaN: Vetor3; torqueAerodinamicoNm: number; aceleracaoMps2: Vetor3; rotacao: { cargasEfetivamenteIntegradas: { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | null; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; fontesImpulsivas: boolean; impulsoTorqueNmS: number; residuoPassoKgM2ps: number; residuoAcumuladoKgM2ps: number; residuoMaximoPassoKgM2ps: number; passosIncompletos: number; massaKg: number; centroM: Vetor3; velocidadeCentroMps: Vetor3; inerciaKgM2: number; momentoIntrinsecoKgM2ps: number; momentoOrbitalKgM2ps: number; momentoTotalKgM2ps: number; omegaInercialRadps: number; torqueGravitacionalNm: number; }; cargaG: number; desaceleracaoMps2: number; temperaturaC: number; integridade: number; limiteOrbitadorC: number; limiteFlapsC: number; energiaAbsorvidaJ: number; energiaDissipadaJ: number; energiaAtmosferaJ: number; respostaTermica: { energiaAbsorvidaCorpoJ: number; modelo: string; tetoUniversal: boolean; potenciaIndicadorCorpoW: number; potenciaTransferidaCorpoW: number; tpsInstalado: boolean; camadasInternasModeladas: boolean; }; estadosTerminais: { corpoDestruido: boolean; controlePerdido: boolean; contato: boolean; impactoDestrutivo: boolean; }; dissipacaoW: number; calorTransferidoW: number; potenciaAtmosferaW: number; energiaBateriaJ: number; temperaturaBateriaC: number; integridadeBateria: number; limiteBateriaC: number; flaps: { id: string; estado: EstadoFisico; comandoRad: number; deflexaoRad: number; integridade: number; temperaturaC: number; energiaAbsorvidaJ: number; conectado: boolean; fluxoTermicoIndicadorWm2: number; energizado: boolean; atuacao: { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; }; knudsenEstimado: number; modeloEscoamento: string; }[]; vinculos: { id: string; estado: "integro" | "rompido" | "liberado"; tracaoAtualN: number; picoTracaoN: number; resistenciaTracaoN: number; cisalhamentoFlexaoTorcaoModelados: boolean; }[]; raioTerraM: number; centroTerraM: Vetor3; propulsaoDisponivel: boolean; rcsDisponivel: boolean; }>`.
- **Responsabilidade / invariantes / efeitos:** Reexecuta agenda no mesmo modelo/runtime; rejeita revisão, entradas e resultados divergentes. Pausa/exportação não reproduzem relógio real. O custo é proporcional ao número de passos físicos do diário; chamada síncrona headless.
- **Dependências diretas:** `Number.isSafeInteger`, `Error`, `criarEnsaioReentrada`, `JSON.stringify`, `ensaio.exportar`, `Math.round`, `ensaio.observar`, `ensaio.iniciar`, `ensaio.pausar`, `ensaio.receberComando`, `ensaio.avancarPasso`.
- **Escritas diretas:** `indice`.
- **Contrato:** [f-af7e1ca547762556](../arquitetura/CATALOGO_DE_FUNCOES.md#f-af7e1ca547762556).

## Nova: `src/missoes/RegistroExtremos.ts::RegistroExtremos.constructor:Constructor`

- **Assinatura:** `(intervaloPassos: number): RegistroExtremos`.
- **Responsabilidade / invariantes / efeitos:** Recebe intervalo inteiro positivo em passos; não depende do relógio real.
- **Dependências diretas:** `Number.isSafeInteger`, `Error`.
- **Escritas diretas:** `this.intervaloPassos`, `this.globais`, `this.atual`, `this.ultimoIntervalo`, `this.inicioPasso`, `this.ultimoPasso`.
- **Contrato:** [f-a127d9dc71e4e4e5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a127d9dc71e4e4e5).

## Nova: `src/missoes/RegistroExtremos.ts::RegistroExtremos.registrar:MethodDeclaration`

- **Assinatura:** `(valores: Readonly<Record<string, number>>, passo: number, tempoS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Registra valores SI finitos no índice/tempo efetivos. Empates preservam o primeiro instante. A resolução é do passo integrado, não interpolação contínua.
- **Dependências diretas:** `Number.isSafeInteger`, `Number.isFinite`, `Error`, `Object.entries`.
- **Escritas diretas:** `tabela[canal]`, `this.ultimoPasso`, `this.ultimoIntervalo`, `this.atual`, `this.inicioPasso`.
- **Contrato:** [f-924d20c3c048dff6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-924d20c3c048dff6).

## Nova: `src/missoes/RegistroExtremos.ts::RegistroExtremos.observar:MethodDeclaration`

- **Assinatura:** `(): { globais: Record<string, FaixaTemporal>; intervaloAtual: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; }; ultimoIntervalo: { inicioPasso: number; fimPasso: number; extremos: Record<string, FaixaTemporal>; } | null; }`.
- **Responsabilidade / invariantes / efeitos:** Copia resumo global, intervalo em curso e último fechado; sem histórico O(t). Cada amostra do diário carrega seu intervalo e a frequência consta da receita.
- **Dependências diretas:** `copiarSnapshot`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-06f593710de6734b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-06f593710de6734b).

## Alterada: `src/missoes/RegistroMissao.ts::RegistroMissao.constructor:Constructor`

- **Assinatura:** `<C, O>(instancia: InstanciaMissao<C, O>, identificacao: object, validarComando: (c: unknown) => c is C, intervaloAmostraPassos?: number, limiteAmostras?: number | undefined): RegistroMissao<C, O>`.
- **Responsabilidade / invariantes / efeitos:** Decora missão com registro em memória e primeira observação imutável. Intervalo em passos positivo; limite opcional >=2 preserva inicial + janela recente e informa descartes. Agenda continua completa para reexecução; sem limite mantém comportamento histórico. Não grava disco/rede.
- **Dependências diretas:** `Number.isSafeInteger`, `Error`, `copiarSnapshot`, `instancia.observar`, `this.amostras.push`.
- **Escritas diretas:** `this.instancia`, `this.validarComando`, `this.intervaloAmostraPassos`, `this.limiteAmostras`, `this.entradas`, `this.amostras`, `this.inicial`, `this.identificacao`, `this.amostrasDescartadas`.
- **Contrato:** [f-4554d825e0078446](../arquitetura/CATALOGO_DE_FUNCOES.md#f-4554d825e0078446).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.id:GetAccessor`

- **Assinatura:** `(): string`.
- **Responsabilidade / invariantes / efeitos:** Consulta identificação da instância decorada.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b5aa733ba9f107f5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b5aa733ba9f107f5).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.passoS:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta duração física fixa em s da instância decorada.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2de73f4cac519707](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2de73f4cac519707).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.passosExecutados:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta índice de passos físicos da missão real, sem contador paralelo.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5a9342f7d17e6061](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5a9342f7d17e6061).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.estadoExecucao:GetAccessor`

- **Assinatura:** `(): EstadoExecucaoMissao`.
- **Responsabilidade / invariantes / efeitos:** Consulta preparada/executando/pausada na missão decorada.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-2210020a7e80bfa5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-2210020a7e80bfa5).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.iniciar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Registra entrada iniciar com sequência/passo atuais e delega início operacional; não avança física por si.
- **Dependências diretas:** `this.entradas.push`, `this.instancia.iniciar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-531fe0884bbcab20](../arquitetura/CATALOGO_DE_FUNCOES.md#f-531fe0884bbcab20).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.pausar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Registra entrada pausar ordenada e delega pausa, preservando estados físicos.
- **Dependências diretas:** `this.entradas.push`, `this.instancia.pausar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-bf4414d6c26e1a0d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-bf4414d6c26e1a0d).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.receberComando:MethodDeclaration`

- **Assinatura:** `(comando: C): ResultadoComandoMissao`.
- **Responsabilidade / invariantes / efeitos:** Valida comando serializável, aplica na mesma porta da missão e registra cópias congeladas do comando/resultado no passo corrente; devolve resultado copiado.
- **Dependências diretas:** `this.validarComando`, `Error`, `this.instancia.receberComando`, `this.entradas.push`, `copiarSnapshot`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f3c9605f73c05bc9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f3c9605f73c05bc9).

## Alterada: `src/missoes/RegistroMissao.ts::RegistroMissao.avancarPasso:MethodDeclaration`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Delega passo físico; registra no intervalo contratado. Retenção opcional preserva a amostra inicial e contabiliza descarte da janela recente, sem alterar comandos, extremos globais ou física.
- **Dependências diretas:** `this.instancia.avancarPasso`, `this.amostras.push`, `this.instancia.observar`, `this.amostras.splice`.
- **Escritas diretas:** `this.amostrasDescartadas`.
- **Contrato:** [f-823c2c01169947e0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-823c2c01169947e0).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.observar:MethodDeclaration`

- **Assinatura:** `(): O`.
- **Responsabilidade / invariantes / efeitos:** Consulta observação da instância decorada sem gerar amostra adicional no diário.
- **Dependências diretas:** `this.instancia.observar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-601da3428577f9c0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-601da3428577f9c0).

## Reutilizada sem mudança: `src/missoes/RegistroMissao.ts::RegistroMissao.obterEventos:MethodDeclaration`

- **Assinatura:** `(): readonly EventoMissao[]`.
- **Responsabilidade / invariantes / efeitos:** Consulta eventos produzidos pela missão real, sem duplicar máquina de estados.
- **Dependências diretas:** `this.instancia.obterEventos`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-92f199d3da33b9c9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-92f199d3da33b9c9).

## Alterada: `src/missoes/RegistroMissao.ts::RegistroMissao.exportar:MethodDeclaration`

- **Assinatura:** `(): DiarioMissao<C, O>`.
- **Responsabilidade / invariantes / efeitos:** Copia diário com identificação, agenda e dados retidos. Quando configurado, explicita janela/descartes; agenda completa permite reconstruir amostras pelo mesmo modelo. Sem limite preserva formato histórico. Não grava disco/rede.
- **Dependências diretas:** `copiarSnapshot`, `this.observar`, `this.obterEventos`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-459c9ad4545d6300](../arquitetura/CATALOGO_DE_FUNCOES.md#f-459c9ad4545d6300).

## Alterada: `src/physics/MundoFisico.ts::MundoFisico.constructor:Constructor`

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
- **Responsabilidade / invariantes / efeitos:** Receita explícita do passo; fenômenos físicos vivem nos subsistemas.
- **Dependências diretas:** `this.diagnosticosAngularesPasso.clear`, `this.atualizarVentoDoPasso`, `this.atualizarApoioDeTracao`, `this.objetos.values`, `objeto.prepararPassoEnergetico`, `objeto.prepararPassoOperacional`, `this.sistemaTermico.atualizar`, `this.fixadores.values`, `fixador.prepararPasso`, `this.chumbadoresAoSolo.values`, `chumbador.prepararPasso`, `this.sincronizarConjuntosEstruturais`, `this.aplicarImpulsosPendentes`, `[...this.fixadores.values()].filter`, `this.hidrodinamica?.atualizarCarregamento`, `this.conjuntosEstruturais.values`, `conjunto.membros.map`, `this.resolvedorEsforcoEstrutural.registrarCargasDistribuidas`, `this.aplicarKickGravitacional`, `this.aplicarKickHidrostatico`, `this.integrarCorpos`, `this.resolvedorColisoes.resolver`, `this.resolvedorContatoSuperficie.resolver`, `chumbador.resolverRestricao`, `this.obterConjuntoEstruturalDoObjeto`, `conjunto.restringirNoMembro`, `this.guiasLineares.values`, `guia.resolverRestricao`, `this.sistemaSensores.atualizar`.
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

## Alterada: `src/physics/MundoFisico.ts::MundoFisico.obterConfiguracaoFisica:MethodDeclaration`

- **Assinatura:** `(): object`.
- **Responsabilidade / invariantes / efeitos:** Exporta identificação do ambiente, integração, dt máximo, revisão angular, atmosfera e água para diários/replay. Perfil completo somente quando injetado. A revisão angular distingue reconstrução intrínseca relativa RE-002B de diários anteriores; não altera parâmetros nem garante compatibilidade antiga.
- **Dependências diretas:** `this.ambiente.obterConfiguracao`, `this.perfilAtmosferico.obterConfiguracao`, `this.hidrodinamica.obterConfiguracao`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d3dca202d77d15ec](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d3dca202d77d15ec).

## Alterada: `src/physics/MundoFisico.ts::MundoFisico.aplicarKickGravitacional:MethodDeclaration`

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

## Nova: `src/physics/MundoFisico.ts::MundoFisico.obterDiagnosticoAngularDoPasso:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | undefined`.
- **Responsabilidade / invariantes / efeitos:** Consulta cópia das cargas angulares do último subpasso, somente se ativadas. Impulso gravitacional N·m·s vem dos dois kicks; torque aero/outros em N·m vem da lista efetivamente integrada. Não inclui impulsos de contato/ruptura, que exigem classificação separada do balanço. Não escreve estado físico.
- **Dependências diretas:** `this.diagnosticosAngularesPasso.get`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-09aef6aae989916b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-09aef6aae989916b).

## Nova: `src/physics/MundoFisico.ts::MundoFisico.registrarDiagnosticoAngular:MethodDeclaration`

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

## Alterada: `src/physics/MundoFisico.ts::MundoFisico.integrarCorpos:MethodDeclaration`

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

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.constructor:Constructor`

- **Assinatura:** `(objetos: readonly Objeto[]): ConjuntoEstruturalRigido`.
- **Responsabilidade / invariantes / efeitos:** Captura geometria relativa e estados de montagem de membros conectados; exige lista não vazia com massas positivas, usa orientação Z do primeiro membro.
- **Dependências diretas:** `Map`, `objetoDeReferencia.getEstadoFisico`, `this.obterCentroDeMassaAtual`, `objeto.getEstadoFisico`, `this.estadosDeMontagem.set`, `this.referenciasLocaisM.set`, `this.rotacionarNoPlano`, `estado.posicaoM.subtrair`, `this.orientacoesRelativasRad.set`, `estado.orientacaoRad.subtrair`, `Vetor3`.
- **Escritas diretas:** `this.objetos`, `this.referenciasLocaisM`, `this.orientacoesRelativasRad`, `this.estadosDeMontagem`, `this.anguloDoConjuntoRad`, `this.massaDasReferenciasKg`, `this.centroCalculado`.
- **Contrato:** [f-d3848f1d1b9d7918](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d3848f1d1b9d7918).

## Alterada: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.sincronizar:MethodDeclaration`

- **Assinatura:** `(dtS: number, avancarOrientacao: boolean): void`.
- **Responsabilidade / invariantes / efeitos:** Conserva momento linear e angular de todos os membros simultaneamente. Momento intrínseco usa v−Vg, evitando contaminação pela translação orbital quando o primeiro momento de massa residual não é zero em Float64. Avançar o ângulo só ocorre uma vez por passo; após colisões, a projeção reaplica a rigidez sem introduzir avanço angular duplicado.
- **Dependências diretas:** `this.atualizarReferenciasLocaisPelaMassaAtual`, `this.obterCentroDeMassaAtual`, `this.objetos.reduce`, `this.obterInerciaCompostaZ`, `this.obterVelocidadeDoCentroAtual`, `Vetor3`, `objeto.getEstadoFisico`, `this.referenciasLocaisM.get`, `this.rotacionarNoPlano`, `this.orientacoesRelativasRad.get`, `objeto.atualizarEstadoPeloCore`, `centroMassa.adicionar`, `velocidadeDoCentroMps.adicionar`.
- **Escritas diretas:** `this.anguloDoConjuntoRad`.
- **Contrato:** [f-dd4593ec27d92adb](../arquitetura/CATALOGO_DE_FUNCOES.md#f-dd4593ec27d92adb).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.contem:MethodDeclaration`

- **Assinatura:** `(objeto: Objeto): boolean`.
- **Responsabilidade / invariantes / efeitos:** Verifica pertencimento por identidade de instância no conjunto rígido atual.
- **Dependências diretas:** `this.objetos.includes`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-db72109b5862bb2c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-db72109b5862bb2c).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.membros:GetAccessor`

- **Assinatura:** `(): readonly Objeto[]`.
- **Responsabilidade / invariantes / efeitos:** Devolve a lista de membros tipada readonly; não cria cópias de corpos ou de estados físicos.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b144fcc6051f60bc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b144fcc6051f60bc).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.momentoInerciaZKgM2:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Consulta inércia planar composta kg·m², somando inércias próprias e termo de eixos paralelos.
- **Dependências diretas:** `this.obterInerciaCompostaZ`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a8f9f77cf3111cdd](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a8f9f77cf3111cdd).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.restringirAoSolo:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Reação da fundação rígida: preserva a geometria montada da ilha inteira.
- **Dependências diretas:** `objeto.atualizarEstadoPeloCore`, `this.estadosDeMontagem.get`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-21ad1a8b15c07bb6](../arquitetura/CATALOGO_DE_FUNCOES.md#f-21ad1a8b15c07bb6).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.restringirNoMembro:MethodDeclaration`

- **Assinatura:** `(objetoAncorado: Objeto, estadoDeAncoragem: EstadoFisico): void`.
- **Responsabilidade / invariantes / efeitos:** Junta fixa que ancora um membro sem desfazer a geometria do conjunto.
- **Dependências diretas:** `this.contem`, `Error`, `this.orientacoesRelativasRad.get`, `this.referenciasLocaisM.get`, `estadoDeAncoragem.posicaoM.subtrair`, `this.rotacionarNoPlano`, `objeto.getEstadoFisico`, `objeto.atualizarEstadoPeloCore`, `centroDeMassa.adicionar`, `Vetor3`.
- **Escritas diretas:** `this.anguloDoConjuntoRad`.
- **Contrato:** [f-3f9e81d50af0af7f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3f9e81d50af0af7f).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.massaTotalKg:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Soma massas instantâneas kg dos membros, incluindo consumíveis físicos atuais.
- **Dependências diretas:** `this.objetos.reduce`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-dc4b60a8630d67b8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-dc4b60a8630d67b8).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.obterMassaEfetivaNoContato:MethodDeclaration`

- **Assinatura:** `(pontoContatoM: Vetor3, normal: Vetor3): number`.
- **Responsabilidade / invariantes / efeitos:** Massa dinâmica vista em um ponto e direção de contato do conjunto inteiro.
- **Dependências diretas:** `pontoContatoM.subtrair`, `this.obterCentroDeMassaAtual`, `braco.produtoVetorial`, `this.obterInerciaCompostaZ`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b22a4e9a52edd60f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b22a4e9a52edd60f).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.obterCentroDeMassaAtual:MethodDeclaration`

- **Assinatura:** `(): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Calcula G pela média ponderada das posições por massas instantâneas; reutiliza somente cache exatamente compatível. Retorna posição m. Cache exige mesmas referências de posição e mesmas massas individuais, não apenas massa total. Atualiza memoização; preserva ordem de soma e não altera corpos.
- **Dependências diretas:** `this.objetos.every`, `objeto.getEstadoFisico`, `Vetor3`, `this.objetos.map`.
- **Escritas diretas:** `x`, `y`, `z`, `this.centroCalculado`.
- **Contrato:** [f-a380dcc40ef24c82](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a380dcc40ef24c82).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.obterVelocidadeNoPonto:MethodDeclaration`

- **Assinatura:** `(pontoM: Vetor3): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Velocidade física do corpo rígido no ponto de contato informado.
- **Dependências diretas:** `this.obterCentroDeMassaAtual`, `this.obterVelocidadeDoCentroAtual`, `Vetor3`, `this.obterVelocidadeAngularAtual`, `velocidadeCentro.adicionar`, `velocidadeAngular.produtoVetorial`, `pontoM.subtrair`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3b36d6e87005a46e](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3b36d6e87005a46e).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.aplicarImpulsoNoPonto:MethodDeclaration`

- **Assinatura:** `(impulsoNs: Vetor3, pontoM: Vetor3): void`.
- **Responsabilidade / invariantes / efeitos:** Aplica impulso diretamente à ilha, preservando a rigidez de seus membros.
- **Dependências diretas:** `this.obterCentroDeMassaAtual`, `this.obterVelocidadeDoCentroAtual`, `this.obterInerciaCompostaZ`, `this.obterVelocidadeAngularAtual`, `velocidadeCentro.adicionar`, `impulsoNs.multiplicar`, `pontoM.subtrair(centroMassa).produtoVetorial`, `pontoM.subtrair`, `Vetor3`, `objeto.getEstadoFisico`, `objeto.atualizarEstadoPeloCore`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-c6a983e8d4a7b876](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c6a983e8d4a7b876).

## Alterada: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.aplicarImpulsosSequenciais:MethodDeclaration`

- **Assinatura:** `(impulsos: readonly { impulsoNs: Vetor3; pontoM: Vetor3; }[]): void`.
- **Responsabilidade / invariantes / efeitos:** Kicks N·s sem mudança de pose/massa, em ordem declarada; duas passagens calculam Vg e L intrínseco com v−Vg antes de cada impulso. Evita multiplicar resíduos de CM pela velocidade orbital. Publica velocidades rígidas ao fim; não altera KDK, dt ou forças. Soma (L+orbital)+spin na ordem individual. Regressão: conservação/Galileu RE-002B.
- **Dependências diretas:** `this.obterCentroDeMassaAtual`, `this.obterInerciaCompostaZ`, `this.objetos.map`, `Number.isFinite`, `Error`, `b.o.atualizarEstadoPeloCore`, `Vetor3`.
- **Escritas diretas:** `vx`, `vy`, `vz`, `L`, `b.vx`, `b.vy`, `b.vz`, `b.w`.
- **Contrato:** [f-ef8ab0fbe286de89](../arquitetura/CATALOGO_DE_FUNCOES.md#f-ef8ab0fbe286de89).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.corrigirPenetracao:MethodDeclaration`

- **Assinatura:** `(normal: Vetor3, penetracaoM: number): void`.
- **Responsabilidade / invariantes / efeitos:** Corrige penetração por translação da ilha inteira, nunca de um membro isolado.
- **Dependências diretas:** `normal.multiplicar`, `objeto.getEstadoFisico`, `objeto.atualizarEstadoPeloCore`, `estado.posicaoM.adicionar`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e851a177213a9963](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e851a177213a9963).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.integrar:MethodDeclaration`

- **Assinatura:** `(forcas: readonly ForcaAplicada[], dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Integra todas as forças externas como uma única resultante do corpo rígido.
- **Dependências diretas:** `this.atualizarReferenciasLocaisPelaMassaAtual`, `this.obterCentroDeMassaAtual`, `forcas.reduce`, `this.obterVelocidadeDoCentroAtual().adicionar`, `this.obterVelocidadeDoCentroAtual`, `resultanteN.multiplicar`, `centroMassa.adicionar`, `velocidadeCentro.multiplicar`, `this.obterVelocidadeAngularAtual`, `this.obterInerciaCompostaZ`, `Vetor3`, `objeto.getEstadoFisico`, `this.referenciasLocaisM.get`, `this.rotacionarNoPlano`, `this.orientacoesRelativasRad.get`, `objeto.atualizarEstadoPeloCore`, `proximoCentroMassa.adicionar`, `velocidadeCentro.adicionar`, `velocidadeAngular.produtoVetorial`.
- **Escritas diretas:** `this.anguloDoConjuntoRad`.
- **Contrato:** [f-f4b59e6ece2fdff3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f4b59e6ece2fdff3).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.obterVelocidadeDoCentroAtual:MethodDeclaration`

- **Assinatura:** `(): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Calcula velocidade m/s de G pela média ponderada das velocidades dos membros; soma escalar preserva a ordem numérica.
- **Dependências diretas:** `objeto.getEstadoFisico`, `Vetor3`.
- **Escritas diretas:** `x`, `y`, `z`.
- **Contrato:** [f-d2c51cb872c6f449](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d2c51cb872c6f449).

## Alterada: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.obterVelocidadeAngularAtual:MethodDeclaration`

- **Assinatura:** `(centroMassa: Vetor3): number`.
- **Responsabilidade / invariantes / efeitos:** Obtém ωZ=LZ/IZ em rad/s; L intrínseco soma r×m(v−Vg) e Ipróprio·ω. Subtrair Vg antes dos produtos evita torque numérico por cancelamento de velocidades orbitais com braços pequenos. Não integra nem altera corpos.
- **Dependências diretas:** `this.obterVelocidadeDoCentroAtual`, `this.objetos.reduce`, `this.obterInerciaCompostaZ`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-20bfea7b2e381c3a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-20bfea7b2e381c3a).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.obterInerciaCompostaZ:MethodDeclaration`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Soma Ipróprio,Z+m|p−G|² para cada membro, em kg·m²; consulta massa/pose atuais.
- **Dependências diretas:** `this.objetos.reduce`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-628f59665bf573bc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-628f59665bf573bc).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.rotacionarNoPlano:MethodDeclaration`

- **Assinatura:** `(vetor: Vetor3, anguloRad: number): Vetor3`.
- **Responsabilidade / invariantes / efeitos:** Aplica rotação XY pelo ângulo em rad, preservando Z; retorna novo vetor.
- **Dependências diretas:** `Math.cos`, `Math.sin`, `Vetor3`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-22d65dbe670ae3c2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-22d65dbe670ae3c2).

## Reutilizada sem mudança: `src/physics/estruturas/ConjuntoEstruturalRigido.ts::ConjuntoEstruturalRigido.atualizarReferenciasLocaisPelaMassaAtual:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Recalibra os bracos locais quando a massa dos membros muda. Combustivel consumido altera o centro de massa sem mover os pontos dos membros. Manter referencias calculadas com a massa inicial faria a projecao rigida deslocar artificialmente o conjunto a cada passo. @remarks Quando a massa total difere, recalcula referências locais em relação ao novo G e atualiza massa de referência; não desloca membros por si.
- **Dependências diretas:** `this.obterCentroDeMassaAtual`, `this.referenciasLocaisM.set`, `this.rotacionarNoPlano`, `objeto.getEstadoFisico().posicaoM.subtrair`, `objeto.getEstadoFisico`.
- **Escritas diretas:** `this.massaDasReferenciasKg`.
- **Contrato:** [f-75836752bdbbb79a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-75836752bdbbb79a).

## Nova: `src/physics/estruturas/DiagnosticoAngular.ts::diagnosticarMomentoAngular:FunctionDeclaration`

- **Assinatura:** `(membros: readonly Objeto[], centroAtratorM: Vetor3, gravidade: (posicaoM: Vetor3) => Vetor3): DiagnosticoAngular`.
- **Responsabilidade / invariantes / efeitos:** Consulta G/Vg por diferenças a uma âncora para reduzir cancelamento em escala planetária. L intrínseco usa r×m(v−Vg)+Iω; orbital usa (G−C)×MVg. Gravidade atua nos centros dos membros: o torque de gradiente é desse modelo, não da distribuição interna de cada caixa. Posições m, velocidades m/s, massas kg e aceleração m/s²; exige membros não vazios. Não escreve corpos.
- **Dependências diretas:** `Error`, `membros[0].getEstadoFisico`, `membros.reduce`, `o.getEstadoFisico`, `centroM.adicionar`, `e.posicaoM.subtrair(ancora.posicaoM).multiplicar`, `e.posicaoM.subtrair`, `velocidadeCentroMps.adicionar`, `e.velocidadeMps.subtrair(ancora.velocidadeMps).multiplicar`, `e.velocidadeMps.subtrair`, `gravidade`, `o.getMomentoInerciaKgM2`, `r.produtoVetorial`, `e.velocidadeMps.subtrair(velocidadeCentroMps).multiplicar`, `gravidade(e.posicaoM).subtrair(gCentro).multiplicar`, `gravidade(e.posicaoM).subtrair`, `centroM.subtrair(centroAtratorM).produtoVetorial`, `centroM.subtrair`, `velocidadeCentroMps.multiplicar`.
- **Escritas diretas:** `centroM`, `velocidadeCentroMps`, `inerciaKgM2`, `momentoIntrinsecoKgM2ps`, `torqueGravitacionalNm`.
- **Contrato:** [f-62f73b2d7d2e4053](../arquitetura/CATALOGO_DE_FUNCOES.md#f-62f73b2d7d2e4053).

## Nova: `src/physics/estruturas/DiagnosticoAngular.ts::BalancoAngular.registrar:MethodDeclaration`

- **Assinatura:** `(antes: DiagnosticoAngular, depois: DiagnosticoAngular, dtS: number, torqueNaoGravitacionalNm: number, completo: boolean, impulsoMedidoPeloCoreNmS?: number): void`.
- **Responsabilidade / invariantes / efeitos:** Acumula somente grandezas observadas; quadratura aero explícita pode ter erro O(dt²) no passo com atuação variável. Não corrige rotação ou energia.
- **Dependências diretas:** `Number.isFinite`, `Error`, `Math.max`, `Math.abs`.
- **Escritas diretas:** `this.residuoPassoKgM2ps`, `this.impulsoTorqueNmS`, `this.residuoAcumuladoKgM2ps`, `this.residuoMaximoPassoKgM2ps`, `this.passosIncompletos`.
- **Contrato:** [f-22a29b5a950e9118](../arquitetura/CATALOGO_DE_FUNCOES.md#f-22a29b5a950e9118).

## Nova: `src/physics/estruturas/DiagnosticoAngular.ts::BalancoAngular.observar:MethodDeclaration`

- **Assinatura:** `(): { impulsoTorqueNmS: number; residuoPassoKgM2ps: number; residuoAcumuladoKgM2ps: number; residuoMaximoPassoKgM2ps: number; passosIncompletos: number; }`.
- **Responsabilidade / invariantes / efeitos:** Snapshot escalar de resíduo e quadratura; não equivale a qualificação de conservação quando há fontes impulsivas ou distribuição de massa não medidas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-77917d37205da563](../arquitetura/CATALOGO_DE_FUNCOES.md#f-77917d37205da563).

## Alterada: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.constructor:Constructor`

- **Assinatura:** `(definicao: DefinicaoAletaAerodinamica, lerRolagemRad: () => number, montagemIntegra: () => boolean, parametros?: ParametrosReentrada): FlapReentrada`.
- **Responsabilidade / invariantes / efeitos:** Recebe somente porta de leitura da projeção e permissivo da montagem.
- **Dependências diretas:** `super`, `lerRolagemRad`.
- **Escritas diretas:** `this.lerRolagemRad`, `this.montagemIntegra`, `this.parametros`, `this.phiUltimoConectadoRad`, `this.taxaEfetivaRadps`.
- **Contrato:** [f-713ac4483df17789](../arquitetura/CATALOGO_DE_FUNCOES.md#f-713ac4483df17789).

## Alterada: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.prepararPassoOperacional:MethodDeclaration`

- **Assinatura:** `(dtS: number): void`.
- **Responsabilidade / invariantes / efeitos:** Reutiliza atuador elétrico e acompanha bank enquanto conectado. Após separação conserva última projeção prescrita: o corpo livre mantém cargas aerodinâmicas, e sua posição/atitude XY continuam sendo calculadas exclusivamente pelo core.
- **Dependências diretas:** `super.prepararPassoOperacional`, `this.montagemIntegra`, `this.lerRolagemRad`.
- **Escritas diretas:** `this.taxaEfetivaRadps`, `this.phiUltimoConectadoRad`.
- **Contrato:** [f-d940577d02a1ae47](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d940577d02a1ae47).

## Alterada: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.obterForcasAerodinamicas:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[]`.
- **Responsabilidade / invariantes / efeitos:** Força perpendicular ao fluxo no CP real do flap, N, proporcional a q. Corpo destacado mantém lift/drag próprios e última projeção de bank, sem transmitir forças a distância para o orbitador.
- **Dependências diretas:** `this.getEstadoFisico`, `e.velocidadeMps.subtrair`, `Math.sin`, `new Vetor3(-v.y / V, v.x / V, 0).multiplicar`, `Vetor3`, `projetarSustentacao`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e32af2d35fa6fa2c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e32af2d35fa6fa2c).

## Alterada: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.getCoeficienteArrastoEfetivo:MethodDeclaration`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Cd positivo por deflexão real; permanece no caminho único de arrasto do core.
- **Dependências diretas:** `Math.sin`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f2617c9c3b49b631](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f2617c9c3b49b631).

## Alterada: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.obterPotenciaAquecimentoAerodinamicoW:MethodDeclaration`

- **Assinatura:** `(c: CondicoesAtmosfericas, dissipacaoW: number): number`.
- **Responsabilidade / invariantes / efeitos:** Aquecimento indicador com raio/área configurados (padrões 0,5 m e 2 m²); temperatura é do componente concentrado, sem interpretação de atuador interno.
- **Dependências diretas:** `this.getEstadoFisico().velocidadeMps.subtrair`, `this.getEstadoFisico`, `Math.min`, `calcularFluxoTermicoIndicador`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-d1d83ab8a5f815b3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-d1d83ab8a5f815b3).

## Nova: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.capacidadeTermicaJPorC:GetAccessor`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Capacidade térmica concentrada J/°C calculada pela massa instantânea e c configurado.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3e48ec123ef93cbe](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3e48ec123ef93cbe).

## Nova: `src/physics/objetos/componentes/FlapReentrada.ts::FlapReentrada.obterDiagnosticoAtuacao:MethodDeclaration`

- **Assinatura:** `(): { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; }`.
- **Responsabilidade / invariantes / efeitos:** Diagnóstico do atuador prescrito, em rad/s, por permissivos reais. Torque e carga mecânica não são inventados a partir dos 300 W elétricos do modelo.
- **Dependências diretas:** `this.montagemIntegra`, `Math.abs`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b750057ae1f8513b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b750057ae1f8513b).

## Alterada: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.constructor:Constructor`

- **Assinatura:** `(estadoInicial: EstadoFisico, limiteTermicoC: number, phiInicialRad: number, perfil: PerfilAtmosfericoReentrada, referencial: ReferencialFisico, lerVelocidadeArMps: () => Vetor3, parametros?: ParametrosReentrada): OrbitadorReentrada`.
- **Responsabilidade / invariantes / efeitos:** Material concentrado provisório e geometria de engenharia, SI. TPS/estrutura não são camadas independentes. Recebe serviços compartilhados, sem DOM/relógio.
- **Dependências diretas:** `super`, `Vetor3`, `RolagemVirtual`.
- **Escritas diretas:** `this.perfil`, `this.referencial`, `this.lerVelocidadeArMps`, `this.parametros`, `this.rolagem`.
- **Contrato:** [f-f474385619746e2c](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f474385619746e2c).

## Alterada: `src/physics/objetos/veiculos/OrbitadorReentrada.ts::OrbitadorReentrada.avaliar:MethodDeclaration`

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
- **Responsabilidade / invariantes / efeitos:** Fluxo indicador vezes área efetiva, limitado à dissipação D·V; substitui a fração histórica. SistemaTermico aplica uma vez e conserva contadores/dano.
- **Dependências diretas:** `Math.min`, `this.avaliar`.
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

## Nova: `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::configurarParametrosReentrada:FunctionDeclaration`

- **Assinatura:** `(entrada?: Partial<ParametrosReentrada>): ParametrosReentrada`.
- **Responsabilidade / invariantes / efeitos:** Copia parâmetros SI conhecidos e valida finitude, sinal e domínio mecânico. São calibrações de ensaio, não especificações certificadas. Nenhuma alteração afeta o objeto padrão global nem modifica corpos já em voo.
- **Dependências diretas:** `Array.isArray`, `Object.keys(entrada).some`, `Object.keys`, `Error`, `Object.entries`, `Number.isFinite`, `Math.abs`, `assinados.includes`, `podemZerar.includes`, `Object.freeze`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e334f1718df02bee](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e334f1718df02bee).

## Reutilizada sem mudança: `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::projetarSustentacao:FunctionDeclaration`

- **Assinatura:** `(sustentacaoN: number, phiRad: number): number`.
- **Responsabilidade / invariantes / efeitos:** Projeção puramente algébrica L*cos(phi), inclusive em rolagem negativa; lateral L*sin(phi) não é integrada. Não produz arrasto ou integração.
- **Dependências diretas:** `[sustentacaoN, phiRad].every`, `Error`, `Math.cos`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-b963603558db9e7b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-b963603558db9e7b).

## Alterada: `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::calcularFluxoTermicoIndicador:FunctionDeclaration`

- **Assinatura:** `(rho: number, velocidadeMps: number, raioM: number, coeficienteSI?: number): number`.
- **Responsabilidade / invariantes / efeitos:** Indicador Sutton–Graves SI, limitado pelo fluxo cinético molecular incidente. rho kg/m³, V m/s e raio m; retorna W/m². Não é previsão qualificada de TPS, especialmente no rarefeito, fora do hipersônico ou com química/composição variáveis.
- **Dependências diretas:** `[rho, velocidadeMps, raioM, coeficienteSI].every`, `Error`, `Math.min`, `Math.sqrt`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-5b99eb90d683a84a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-5b99eb90d683a84a).

## Alterada: `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::avaliarAerodinamica:FunctionDeclaration`

- **Assinatura:** `(estado: EstadoFisico, condicoes: CondicoesAtmosfericas, atmosfera: AmostraAtmosferaReentrada, integridade: number, phiRad: number, p?: ParametrosReentrada): CargasReentrada`.
- **Responsabilidade / invariantes / efeitos:** Modelo analítico preliminar XY, eixo longitudinal local +X. Cl=0,9*sin(2α) com correção Mach suave; Cd=0,12+1,6*sin²α+termo Mach. Não usa tabela validada. CP levemente a ré produz momento real; lift normal ao fluxo é projetado por phi. Condições SI finitas fornecidas pelo mundo; função pura, dt não se aplica.
- **Dependências diretas:** `estado.velocidadeMps.subtrair`, `normalizarAngulo`, `Math.atan2`, `Math.sin`, `Math.exp`, `projetarSustentacao`, `Vetor3`, `n.multiplicar`, `v.multiplicar`, `calcularFluxoTermicoIndicador`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-1ed66fedcef47f81](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1ed66fedcef47f81).

## Alterada: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.constructor:Constructor`

- **Assinatura:** `(ler: () => TelemetriaControleReentrada, alphaRad: number, phiRad: number, corredor: CorredorReentrada, parametros?: ParametrosReentrada): ControladorReentrada`.
- **Responsabilidade / invariantes / efeitos:** Recebe porta escalar de sensores/cargas, sem acesso ao objeto ou mundo. Corredor é uma heurística de investigação, sem garantia de trajetória segura.
- **Dependências diretas:** `this.configurarAlvos`, `Object.values(corredor).every`, `Object.values`, `Error`.
- **Escritas diretas:** `this.ler`, `this.corredor`, `this.parametros`, `this.id`, `this.prioridade`, `this.habilitado`, `this.alvoAlphaRad`, `this.alvoPhiRad`, `this.estado`, `this.alphaGerenciadoRad`, `this.diagnosticoCorredor`, `this.torqueSolicitadoNm`, `this.torqueComandadoNm`.
- **Contrato:** [f-c18886ab4102b0a9](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c18886ab4102b0a9).

## Reutilizada sem mudança: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.habilitar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Seleciona automação; ignição/posição/orientação não são comandadas.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.habilitado`, `this.estado`.
- **Contrato:** [f-984a523bb78d293a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-984a523bb78d293a).

## Alterada: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.desabilitar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Retira solicitações da arbitragem, preservando o estado físico.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.habilitado`, `this.estado`, `this.torqueSolicitadoNm`, `this.torqueComandadoNm`.
- **Contrato:** [f-3355374dcb4f6b5f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3355374dcb4f6b5f).

## Reutilizada sem mudança: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.estaHabilitado:GetAccessor`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Consulta seleção operacional real.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8759d6e7ccb5a8f2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8759d6e7ccb5a8f2).

## Reutilizada sem mudança: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.configurarAlvos:MethodDeclaration`

- **Assinatura:** `(alphaRad: number, phiRad: number): void`.
- **Responsabilidade / invariantes / efeitos:** Alvos rad finitos, alpha de 0–80° e bank de ±90°.
- **Dependências diretas:** `[alphaRad, phiRad].every`, `Math.abs`, `Error`.
- **Escritas diretas:** `this.alvoAlphaRad`, `this.alvoPhiRad`.
- **Contrato:** [f-c5e7649bb6a75116](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c5e7649bb6a75116).

## Alterada: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.observar:MethodDeclaration`

- **Assinatura:** `(): { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; torqueSolicitadoNm: number; torqueComandadoNm: number; corredor: Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }> | null; }`.
- **Responsabilidade / invariantes / efeitos:** Snapshot de alvo do operador, alvo gerenciado e estado efetivo do controle.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-f9d73dd15b5c52e4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-f9d73dd15b5c52e4).

## Alterada: `src/physics/sistemas de controle/ControladorReentrada.ts::ControladorReentrada.calcularSolicitacoes:MethodDeclaration`

- **Assinatura:** `(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[]`.
- **Responsabilidade / invariantes / efeitos:** Calcula deflexões opostas para torque de arfagem, limitado por q, geometria, projeção virtual e curso configurado (padrão 30°). PD sem integral evita windup. dt s em (0,1/60]. Sem autoridade não aplica torque substituto/RCS fictício. Leituras inválidas produzem ausência de pedidos; sensores só observam o estado real do core.
- **Dependências diretas:** `Number.isFinite`, `Error`, `this.ler`, `Object.values(t).filter(v => typeof v === 'number').every`, `Object.values(t).filter`, `Object.values`, `avaliarCorredorReentrada`, `Math.cos`, `normalizarAngulo`, `Math.abs`, `Math.max`, `Math.min`.
- **Escritas diretas:** `this.estado`, `this.torqueSolicitadoNm`, `this.torqueComandadoNm`, `this.diagnosticoCorredor`, `this.alphaGerenciadoRad`.
- **Contrato:** [f-e02341d58116ed62](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e02341d58116ed62).

## Nova: `src/physics/sistemas de controle/EstrategiaCorredorReentrada.ts::avaliarCorredorReentrada:FunctionDeclaration`

- **Assinatura:** `(t: TelemetriaControleReentrada, limites: CorredorReentrada, alphaSolicitadoRad: number, phiSolicitadoRad: number): Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }>`.
- **Responsabilidade / invariantes / efeitos:** Política experimental separada do PD: considera q/fluxo/carga e informa energia/integridade monitoradas, sem inventar lei ótima ou escrever estado. Não há atuador capaz de impor energia diretamente. Alvos rad; limites SI.
- **Dependências diretas:** `[t.pressaoDinamicaPa > limites.pressaoMaximaPa ? 'pressao' : '',
    t.fluxoTermicoWm2 > limites.fluxoMaximoWm2 ? 'fluxo-termico' : '', t.cargaG > limites.cargaMaximaG ? 'carga' : ''].filter`, `Object.freeze`, `Math.min`, `Math.max`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-c23886613e0b2192](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c23886613e0b2192).

## Alterada: `src/reentrada.ts::iniciarBancada:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Fronteira de apresentação: lê controles, comanda portas de missão e desenha snapshots; tempo real serve apenas ao executor fixo, nunca à lei física.
- **Dependências diretas:** `elemento`, `Map`, `Object.entries`, `configurarParametrosReentrada`, `document.createElement`, `String`, `label.append`, `elemento('re-parametros').append`, `camposParametros.set`, `RenderizadorReentrada`, `criarEnsaioReentrada`, `ExecutorPassoFixo`, `ensaio.observar`, `iniciais.addEventListener`, `form.addEventListener`, `elemento('re-reset').addEventListener`, `modo.addEventListener`, `elemento('re-alvos').addEventListener`, `elemento(id).addEventListener`, `elemento('re-chaveamento').addEventListener`, `elemento('re-pouso').addEventListener`, `energia.addEventListener`, `elemento('re-falha-rolagem').addEventListener`, `elemento('re-separar').addEventListener`, `elemento('re-passo').addEventListener`, `elemento('re-exportar').addEventListener`, `requestAnimationFrame`.
- **Escritas diretas:** `label.textContent`, `input.type`, `input.step`, `input.required`, `input.id`, `input.value`.
- **Contrato:** [f-bdf1e31dbe2aa399](../arquitetura/CATALOGO_DE_FUNCOES.md#f-bdf1e31dbe2aa399).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.elemento:FunctionDeclaration`

- **Assinatura:** `<T extends HTMLElement>(id: string): T`.
- **Responsabilidade / invariantes / efeitos:** Resolve elemento obrigatório da página, falhando explicitamente se ausente.
- **Dependências diretas:** `document.getElementById`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-043a536f0ddd232b](../arquitetura/CATALOGO_DE_FUNCOES.md#f-043a536f0ddd232b).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.numero:FunctionDeclaration`

- **Assinatura:** `(id: string): number`.
- **Responsabilidade / invariantes / efeitos:** Converte entrada numérica em SI; validação final pertence ao domínio.
- **Dependências diretas:** `Number`, `elemento`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-125d2a3542b41de5](../arquitetura/CATALOGO_DE_FUNCOES.md#f-125d2a3542b41de5).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.rad:FunctionDeclaration`

- **Assinatura:** `(id: string): number`.
- **Responsabilidade / invariantes / efeitos:** Converte graus da interface para radianos explicitamente.
- **Dependências diretas:** `numero`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-1d3579ae29692539](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1d3579ae29692539).

## Alterada: `src/reentrada.ts::iniciarBancada.lerConfiguracao:FunctionDeclaration`

- **Assinatura:** `(): EntradaConfiguracaoReentrada`.
- **Responsabilidade / invariantes / efeitos:** Lê configuração pré-ensaio; todas as conversões são explícitas e registradas.
- **Dependências diretas:** `Object.fromEntries`, `[...camposParametros].map`, `numero`, `rad`, `elemento`, `elemento<HTMLInputElement>('re-alvo-arco').value.trim`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-9f19a52f59d415b4](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9f19a52f59d415b4).

## Alterada: `src/reentrada.ts::iniciarBancada.preparar:FunctionDeclaration`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Recria ensaio solicitado; reinicia somente pela fábrica, sem editar corpos.
- **Dependências diretas:** `form.reportValidity`, `criarEnsaioReentrada`, `lerConfiguracao`, `ExecutorPassoFixo`, `ensaio.observar`, `Math.round`, `numero`, `elemento`, `Number`, `camposParametros.get`, `String`.
- **Escritas diretas:** `ensaio`, `executor`, `historico`, `intervaloVisualPassos`, `limiteVisualAmostras`, `e.min`, `e.max`, `configAlterada`, `eventosMostrados`, `ultimaAtualizacaoMs`, `modo.value`, `elemento<HTMLInputElement>('re-alpha-alvo').value`, `elemento<HTMLInputElement>('re-phi-alvo').value`, `elemento<HTMLInputElement>('re-flap-dianteiro').value`, `elemento<HTMLInputElement>('re-flap-traseiro').value`, `mensagem.textContent`.
- **Contrato:** [f-c51586eefc46d9d2](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c51586eefc46d9d2).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.comandar:FunctionDeclaration`

- **Assinatura:** `(c: ComandoReentrada): void`.
- **Responsabilidade / invariantes / efeitos:** Encaminha intenção e apresenta diagnóstico real, sem duplicar estados.
- **Dependências diretas:** `ensaio.receberComando`, `String`.
- **Escritas diretas:** `mensagem.textContent`, `ultimaAtualizacaoMs`.
- **Contrato:** [f-cf79be1a17c2b2c7](../arquitetura/CATALOGO_DE_FUNCOES.md#f-cf79be1a17c2b2c7).

## Alterada: `src/reentrada.ts::iniciarBancada.avancar:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Executa um passo fixo e registra amostra visual a cada segundo simulado. O diário compartilha coleta configurada e informa retenção/descartes; extremos são medidos em todo passo.
- **Dependências diretas:** `ensaio.avancarPasso`, `historico.push`, `ensaio.observar`, `historico.shift`.
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
- **Dependências diretas:** `metrica`, `o.altitudeM.toFixed`, `o.velocidadeMps.toFixed`, `graus`, `a.mach.toFixed`, `a.pressaoDinamicaPa.toPrecision`, `a.sustentacaoN.toFixed`, `a.sustentacaoXYN.toFixed`, `a.arrastoN.toFixed`, `a.sustentacaoLateralOmitidaN.toFixed`, `o.cargaG.toFixed`, `o.desaceleracaoMps2.toFixed`, `o.aceleracaoMps2.x.toFixed`, `o.aceleracaoMps2.y.toFixed`, `o.torqueAerodinamicoNm.toFixed`, `a.centroPressaoLocalM.toFixed`, `a.fluxoTermicoIndicadorWm2.toPrecision`, `o.temperaturaC.toFixed`, `(100 * o.integridade).toFixed`, `o.massaKg.toFixed`, `o.energiaAbsorvidaJ.toPrecision`, `o.dissipacaoW.toPrecision`, `o.calorTransferidoW.toPrecision`, `o.potenciaAtmosferaW.toPrecision`, `a.knudsen.toPrecision`, `o.estado.velocidadeAngularRadps.z.toPrecision`, `o.rotacao.momentoIntrinsecoKgM2ps.toPrecision`, `o.rotacao.momentoOrbitalKgM2ps.toPrecision`, `o.inerciaKgM2.toPrecision`, `o.rotacao.torqueGravitacionalNm.toPrecision`, `(o.rotacao.cargasEfetivamenteIntegradas?.torqueOutrosContinuosNm ?? 0).toPrecision`, `o.rotacao.residuoPassoKgM2ps.toPrecision`, `o.rotacao.residuoAcumuladoKgM2ps.toPrecision`, `o.energiaMecanicaEspecificaJPorKg.toPrecision`, `o.velocidadeRadialMps.toFixed`, `o.velocidadeTangencialMps.toFixed`, `o.extremos.globais.pressaoDinamicaPa.maximo.valor.toPrecision`, `o.extremos.globais.fluxoTermicoIndicadorWm2.maximo.valor.toPrecision`, `o.respostaTermica.potenciaIndicadorCorpoW.toPrecision`, `o.respostaTermica.potenciaTransferidaCorpoW.toPrecision`, `o.controle.torqueSolicitadoNm.toPrecision`, `fronteira.distanciaRestanteM.toFixed`, `fronteira.hipoteses.map(h => `${h.aceleracaoLiquidaMps2} m/s² → ${h.velocidadeLimiteNecessariaMps?.toFixed(0)} m/s (desvio ${h.desvioVelocidadeMps?.toFixed(0)})`).join`, `fronteira.hipoteses.map`, `o.energiaBateriaJ.toFixed`, `o.temperaturaBateriaC.toFixed`, `(100 * o.integridadeBateria).toFixed`, `o.flaps.entries`, `f.temperaturaC.toFixed`, `(100 * f.integridade).toFixed`, `elemento`, `o.flaps.every`, `o.tempoS.toFixed`, `ensaio.passoS.toPrecision`, `executor.tempoPendenteS.toFixed`, `diagnostico.replaceChildren`, `document.createElement`, `r.atual.toPrecision`, `linha.append`, `diagnostico.append`, `ensaio.obterEventos`, `eventos.at`, `lista.replaceChildren`, `eventos.slice`, `evento.tempoS.toFixed`, `lista.append`.
- **Escritas diretas:** `play.textContent`, `iniciais.disabled`, `manuais.disabled`, `modo.value`, `modo.disabled`, `elemento<HTMLButtonElement>('re-passo').disabled`, `elemento<HTMLSelectElement>('re-chaveamento').value`, `energia.textContent`, `elemento('re-tempo-real').textContent`, `linha.className`, `descricao.textContent`, `valor.textContent`, `li.textContent`, `eventosMostrados`.
- **Contrato:** [f-886d03c02bf67e85](../arquitetura/CATALOGO_DE_FUNCOES.md#f-886d03c02bf67e85).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.quadro:FunctionDeclaration`

- **Assinatura:** `(timestamp: number): void`.
- **Responsabilidade / invariantes / efeitos:** Cooperação da apresentação: orçamento 8 ms/quadro, mantém dívida temporal. Pausa em erro explícito e conserva diagnóstico; não declara sucesso/repouso.
- **Dependências diretas:** `performance.now`, `executor.avancarAte`, `numero`, `ensaio.observar`, `renderer.desenhar`, `atualizarPainel`, `renderer.desenharGraficos`, `ensaio.pausar`, `String`, `requestAnimationFrame`.
- **Escritas diretas:** `ultimaAtualizacaoMs`, `mensagem.textContent`.
- **Contrato:** [f-081506ae1d0d1404](../arquitetura/CATALOGO_DE_FUNCOES.md#f-081506ae1d0d1404).

## Reutilizada sem mudança: `src/reentrada.ts::iniciarBancada.quadro.continuar:ArrowFunction`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Orçamento visual em ms; interrompe lote, preservando dívida e dt físico.
- **Dependências diretas:** `performance.now`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-8c86b54a123c80c0](../arquitetura/CATALOGO_DE_FUNCOES.md#f-8c86b54a123c80c0).

## Nova: `scripts/campanha-re002.ts::resumir:FunctionDeclaration`

- **Assinatura:** `(o: ObservacaoReentrada): { tempoS: number; passo: number; altitudeM: number; arcoM: number; velocidadeMps: number; velocidadeRadialMps: number; velocidadeTangencialMps: number; trajetoriaRad: number; atitudeInercialRad: number; atitudeLocalRad: number; alphaRad: number; alphaAlvoRad: number; omegaRadps: number; energiaMecanicaEspecificaJPorKg: number; inerciaKgM2: number; rotacao: { cargasEfetivamenteIntegradas: { dtS: number; impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; } | null; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number; fontesImpulsivas: boolean; impulsoTorqueNmS: number; residuoPassoKgM2ps: number; residuoAcumuladoKgM2ps: number; residuoMaximoPassoKgM2ps: number; passosIncompletos: number; massaKg: number; centroM: Vetor3; velocidadeCentroMps: Vetor3; inerciaKgM2: number; momentoIntrinsecoKgM2ps: number; momentoOrbitalKgM2ps: number; momentoTotalKgM2ps: number; omegaInercialRadps: number; torqueGravitacionalNm: number; }; torqueAerodinamicoNm: number; pressaoDinamicaPa: number; cargaG: number; fluxoTermicoIndicadorWm2: number; energiaDissipadaJ: number; temperaturaC: number; integridade: number; respostaTermica: { energiaAbsorvidaCorpoJ: number; modelo: string; tetoUniversal: boolean; potenciaIndicadorCorpoW: number; potenciaTransferidaCorpoW: number; tpsInstalado: boolean; camadasInternasModeladas: boolean; }; energiaBateriaJ: number; temperaturaBateriaC: number; controle: { estado: string; alphaSolicitadoRad: number; alphaGerenciadoRad: number; phiSolicitadoRad: number; torqueSolicitadoNm: number; torqueComandadoNm: number; corredor: Readonly<{ estrategia: "heuristica-experimental-55-70-graus"; excedeu: boolean; violacoes: readonly string[]; alphaAlvoRad: number; phiAlvoRad: number; energiaMecanicaEspecificaJPorKg: number | null; integridadeMinima: number | null; eficaciaQualificada: false; }> | null; }; supervisor: { fase: "aproximacao" | "reentrada" | "falha"; automatico: boolean; candidatoCinematico: boolean; autorizado: boolean; requisitos: readonly Readonly<RequisitoAproximacao>[]; limites: ConfiguracaoFronteiraAproximacao; avaliacao: Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }> | null; }; terminais: { corpoDestruido: boolean; controlePerdido: boolean; contato: boolean; impactoDestrutivo: boolean; }; flaps: { comandoRad: number; deflexaoRad: number; integridade: number; temperaturaC: number; energiaAbsorvidaJ: number; conectado: boolean; energizado: boolean; atuacao: { taxaEfetivaRadps: number; cursoRad: number; taxaMaximaRadps: number; modeloMecanico: string; torqueDisponivelNm: null; torqueCargaNm: null; bloqueio: string; }; }[]; vinculos: { id: string; estado: "integro" | "rompido" | "liberado"; tracaoAtualN: number; picoTracaoN: number; resistenciaTracaoN: number; cisalhamentoFlexaoTorcaoModelados: boolean; }[]; extremos: Record<string, FaixaTemporal>; }`.
- **Responsabilidade / invariantes / efeitos:** Seleciona métricas efetivamente observadas, sem guardar uma trajetória paralela. Os extremos vêm da redução em cada passo; amostras abaixo são espaçadas 10 s.
- **Dependências diretas:** `o.flaps.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-a4e257495658a353](../arquitetura/CATALOGO_DE_FUNCOES.md#f-a4e257495658a353).

## Nova: `scripts/campanha-re002.ts::executarCampanha:FunctionDeclaration`

- **Assinatura:** `(): Promise<void>`.
- **Responsabilidade / invariantes / efeitos:** Campanha determinística no Ensaio real; termina orçamento de coleta, não missão. Referências anteriores não são sobrescritas. Alvos são sintéticos e explícitos. Nenhum motor/TPS é instalado. Saída incremental permite auditar falhas também.
- **Dependências diretas:** `mkdirSync`, `process.env.RE002_CASOS?.split`, `[30, 40, 55].map`, `casos.filter`, `EnsaioReentrada`, `e.observar`, `resumir`, `e.iniciar`, `Math.round`, `e.avancarPasso`, `Math.atan2`, `Math.sin`, `Math.cos`, `Math.min`, `Math.max`, `amostras.push`, `e.obterIdentificacao`, `Math.sqrt`, `e.obterEventos`, `writeFileSync`, `JSON.stringify`, `console.log`, `final.flaps.map`.
- **Escritas diretas:** `passo`, `erroAlphaQuadratico`, `observacoes`, `minErro`, `maxErro`, `cruzamentosErro`, `erroAnterior`, `saturadas`, `semAutoridade`, `candidatoPrimeiro`.
- **Contrato:** [f-e85b85490afedc61](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e85b85490afedc61).

## Nova: `scripts/convergencia-angular-re002.ts::validarConvergencia:FunctionDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Mede convergência/limite de arredondamento no gradiente central por 10 s, em vácuo declarado, sem controlador e sem trocar integrador. As quatro resoluções e o orçamento são os mesmos da regressão angular versionada. Grava evidência local SI; não ajusta tolerâncias a posteriori.
- **Dependências diretas:** `criarCenarioReentrada`, `medir`, `energia`, `BalancoAngular`, `Math.round`, `c.mundo.avancar`, `b.registrar`, `resultados.push`, `c.mundo.obterConfiguracaoFisica`, `b.observar`, `Math.abs`, `writeFileSync`, `JSON.stringify`, `console.log`, `resultados.map`.
- **Escritas diretas:** `i`, `antes`.
- **Contrato:** [f-c01c0626f58071c1](../arquitetura/CATALOGO_DE_FUNCOES.md#f-c01c0626f58071c1).

## Nova: `scripts/convergencia-angular-re002.ts::validarConvergencia.medir:ArrowFunction`

- **Assinatura:** `(): DiagnosticoAngular`.
- **Responsabilidade / invariantes / efeitos:** Consulta L/I/torque do mesmo conjunto, sem modificar corpos.
- **Dependências diretas:** `diagnosticarMomentoAngular`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-002980b97f4edc92](../arquitetura/CATALOGO_DE_FUNCOES.md#f-002980b97f4edc92).

## Nova: `scripts/convergencia-angular-re002.ts::validarConvergencia.energia:ArrowFunction`

- **Assinatura:** `(): number`.
- **Responsabilidade / invariantes / efeitos:** Soma energia translacional cinética e potencial central em J dos membros; não inclui energia rotacional.
- **Dependências diretas:** `c.objetos.reduce`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-50101903824a8ffc](../arquitetura/CATALOGO_DE_FUNCOES.md#f-50101903824a8ffc).

## Nova: `src/physics/sistemas de controle/ControladorAproximacao.ts::ControladorAproximacao.habilitar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Seleciona protótipo sem autorizar atuação física.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.habilitado`.
- **Contrato:** [f-534188cc7979d4c8](../arquitetura/CATALOGO_DE_FUNCOES.md#f-534188cc7979d4c8).

## Nova: `src/physics/sistemas de controle/ControladorAproximacao.ts::ControladorAproximacao.desabilitar:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Retira o protótipo da seleção.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.habilitado`.
- **Contrato:** [f-6bfef8a77e42e997](../arquitetura/CATALOGO_DE_FUNCOES.md#f-6bfef8a77e42e997).

## Nova: `src/physics/sistemas de controle/ControladorAproximacao.ts::ControladorAproximacao.estaHabilitado:GetAccessor`

- **Assinatura:** `(): boolean`.
- **Responsabilidade / invariantes / efeitos:** Consulta seleção, distinta de prontidão operacional.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-e51247b354a8b769](../arquitetura/CATALOGO_DE_FUNCOES.md#f-e51247b354a8b769).

## Nova: `src/physics/sistemas de controle/ControladorAproximacao.ts::ControladorAproximacao.calcularSolicitacoes:MethodDeclaration`

- **Assinatura:** `(_leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[]`.
- **Responsabilidade / invariantes / efeitos:** Valida dt SI e retorna ausência de solicitações em todos os estados. Instalar esta classe não torna a integração propulsiva compatível.
- **Dependências diretas:** `Number.isFinite`, `Error`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-11a58d8d31bdebcd](../arquitetura/CATALOGO_DE_FUNCOES.md#f-11a58d8d31bdebcd).

## Nova: `src/physics/sistemas de controle/FronteiraAproximacao.ts::configurarFronteiraAproximacao:FunctionDeclaration`

- **Assinatura:** `(entrada?: Partial<ConfiguracaoFronteiraAproximacao>): ConfiguracaoFronteiraAproximacao`.
- **Responsabilidade / invariantes / efeitos:** Copia e congela hipóteses exploratórias SI; alvo null bloqueia candidatura. Aceleração é líquida útil hipotética, sem inferir empuxo/combustível/ignição.
- **Dependências diretas:** `Number.isFinite`, `Math.abs`, `Array.isArray`, `c.aceleracoesLiquidasHipoteticasMps2.every`, `Error`, `Object.freeze`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-3f8022ec198f2a6a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-3f8022ec198f2a6a).

## Nova: `src/physics/sistemas de controle/FronteiraAproximacao.ts::avaliarFronteiraAproximacao:FunctionDeclaration`

- **Assinatura:** `(e: EstadoFronteiraAproximacao, c: ConfiguracaoFronteiraAproximacao): Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }>`.
- **Responsabilidade / invariantes / efeitos:** Avalia limites NECESSÁRIOS de frenagem ideal V²/(2a), sem certificar trajetória. Distância é arco assinado ao alvo à frente. Não resolve alinhamento, combustível, reignição ou dinâmica 3D. Aceleração líquida evita contabilizar gravidade duas vezes. A candidatura A nunca implica autorização operacional B. Nenhum efeito físico.
- **Dependências diretas:** `Object.values(e).filter(v => typeof v === 'number').every`, `Object.values(e).filter`, `Object.values`, `c.aceleracoesLiquidasHipoteticasMps2.map`, `Math.abs`, `normalizarAngulo`, `hipoteses.some`, `requisitos.every`, `requisitos.push`, `Object.freeze`, `hipoteses.map`, `requisitos.map`.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-bb2582e8bd866e0f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-bb2582e8bd866e0f).

## Nova: `src/physics/sistemas de controle/SupervisorRecuperacao.ts::SupervisorRecuperacao.constructor:Constructor`

- **Assinatura:** `(gerenciador: GerenciadorDeControladores, limites: ConfiguracaoFronteiraAproximacao): SupervisorRecuperacao`.
- **Responsabilidade / invariantes / efeitos:** Recebe registro existente e congela critérios independentes dos antigos de pouso.
- **Dependências diretas:** `configurarFronteiraAproximacao`.
- **Escritas diretas:** `this.gerenciador`, `this.solicitado`, `this.automatico`, `this.fase`, `this.avaliacao`, `this.limites`.
- **Contrato:** [f-100510609617f2a3](../arquitetura/CATALOGO_DE_FUNCOES.md#f-100510609617f2a3).

## Nova: `src/physics/sistemas de controle/SupervisorRecuperacao.ts::SupervisorRecuperacao.definirAutomatico:MethodDeclaration`

- **Assinatura:** `(ativo: boolean): void`.
- **Responsabilidade / invariantes / efeitos:** Define tentativa automática; não dispensa os requisitos operacionais.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.automatico`.
- **Contrato:** [f-1533e482f466d653](../arquitetura/CATALOGO_DE_FUNCOES.md#f-1533e482f466d653).

## Nova: `src/physics/sistemas de controle/SupervisorRecuperacao.ts::SupervisorRecuperacao.solicitarAproximacao:MethodDeclaration`

- **Assinatura:** `(): void`.
- **Responsabilidade / invariantes / efeitos:** Agenda avaliação única de posse, sem ignição ou atuação.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** `this.solicitado`.
- **Contrato:** [f-9c317fe82816cb1a](../arquitetura/CATALOGO_DE_FUNCOES.md#f-9c317fe82816cb1a).

## Nova: `src/physics/sistemas de controle/SupervisorRecuperacao.ts::SupervisorRecuperacao.atualizar:MethodDeclaration`

- **Assinatura:** `(e: EstadoFronteiraAproximacao): void`.
- **Responsabilidade / invariantes / efeitos:** Avalia A/B e troca seleção exclusivamente quando B está atendido. Perda crítica retira as três seleções e mantém falha travada para diagnóstico.
- **Dependências diretas:** `avaliarFronteiraAproximacao`, `this.gerenciador.desabilitar`, `this.gerenciador.habilitar`.
- **Escritas diretas:** `this.avaliacao`, `this.fase`, `this.solicitado`.
- **Contrato:** [f-658ed3f1e0b5263f](../arquitetura/CATALOGO_DE_FUNCOES.md#f-658ed3f1e0b5263f).

## Nova: `src/physics/sistemas de controle/SupervisorRecuperacao.ts::SupervisorRecuperacao.observar:MethodDeclaration`

- **Assinatura:** `(): { fase: "aproximacao" | "reentrada" | "falha"; automatico: boolean; candidatoCinematico: boolean; autorizado: boolean; requisitos: readonly Readonly<RequisitoAproximacao>[]; limites: ConfiguracaoFronteiraAproximacao; avaliacao: Readonly<{ candidatoCinematico: boolean; autorizado: boolean; distanciaRestanteM: number | null; energiaMecanicaEspecificaJPorKg: number; natureza: "limites-necessarios-ideais-nao-trajetoria-certificada"; hipoteses: readonly Readonly<{ aceleracaoLiquidaMps2: number; distanciaFrenagemM: number; quedaFrenagemRadialM: number; tempoFrenagemS: number; velocidadeLimiteNecessariaMps: number | null; desvioVelocidadeMps: number | null; limitesNecessariosAtendidos: boolean; }>[]; requisitos: readonly Readonly<RequisitoAproximacao>[]; }> | null; }`.
- **Responsabilidade / invariantes / efeitos:** Expõe DTO imutável com candidato A separado da autorização B.
- **Dependências diretas:** nenhuma chamada direta.
- **Escritas diretas:** nenhuma; efeitos das portas chamadas permanecem.
- **Contrato:** [f-0cddc17ba40e187d](../arquitetura/CATALOGO_DE_FUNCOES.md#f-0cddc17ba40e187d).

## Remoções

Nenhuma função de produção removida.
