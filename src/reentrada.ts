import { criarConfiguracaoTermicaReentrada, validarConfiguracaoTermicaReentrada, type ConfiguracaoTermicaReentrada } from './physics/reentrada/ConfiguracaoTermicaReentrada';
import { configurarParametrosReentrada, type ParametrosReentrada } from './physics/reentrada/ModeloAerodinamicoReentrada';
import { rotulosParametros } from './apresentacao/reentrada/CamposParametrosReentrada';
import './style.css';
import './reentrada.css';
import { criarEnsaioReentrada, type ComandoReentrada, validarConfiguracaoExplicitaReentrada, type ConfiguracaoReentrada, type ObservacaoReentrada } from './cenarios/EnsaioReentrada';
import { ExecutorPassoFixo } from './simulacao/ExecutorPassoFixo';
import { RenderizadorReentrada } from './apresentacao/reentrada/RenderizadorReentrada';

/** Fronteira de apresentação: lê controles, comanda portas de missão e desenha
 * snapshots; tempo real serve apenas ao executor fixo, nunca à lei física.
 * Define padrões restauráveis no formulário; recuperação exige ação explícita
 * e nova preparação validada, sem criar cenário alternativo em erro.
 * @contract f-bdf1e31dbe2aa399
   */
function iniciarBancada(): void {
  /** Resolve elemento obrigatório da página, falhando explicitamente se ausente.  @contract f-043a536f0ddd232b */
  function elemento<T extends HTMLElement>(id: string): T {
    const e = document.getElementById(id); if (!e) throw new Error(`Elemento ausente: ${id}`); return e as T;
  }
  /** Lê número explícito, rejeitando vazio, não finito e restrições HTML com
   * diagnóstico do campo. Unidades físicas são validadas também no domínio.
   * @contract f-125d2a3542b41de5 */
  function numero(id: string): number {
    const input = elemento<HTMLInputElement>(id), valor = input.value.trim();
    if (valor === '' || !Number.isFinite(Number(valor)) || !input.validity.valid) {
      throw new Error(`${input.labels?.[0]?.textContent?.trim() ?? id}: ${input.validationMessage || 'Informe um número finito.'}`);
    }
    return Number(valor);
  }
  /** Valida seleção conhecida antes de convertê-la em estado inicial booleano.  @contract f-00c81d5a7e7c47cb */
  function opcao(id: string, permitidas: readonly string[]): string {
    const valor = elemento<HTMLSelectElement>(id).value;
    if (!permitidas.includes(valor)) throw new Error(`Seleção inválida: ${id}.`);
    return valor;
  }
  /** Converte graus da interface para radianos explicitamente.  @contract f-1d3579ae29692539 */
  function rad(id: string): number { return numero(id) * Math.PI / 180; }
  const form = elemento<HTMLFormElement>('re-config'), iniciais = elemento<HTMLFieldSetElement>('re-iniciais');
  const play = elemento<HTMLButtonElement>('re-play'), mensagem = elemento<HTMLOutputElement>('re-mensagem');
  const modo = elemento<HTMLSelectElement>('re-modo'), manuais = elemento<HTMLFieldSetElement>('re-manuais');
  const energia = elemento<HTMLButtonElement>('re-energia');
  const camposParametros = new Map<keyof ParametrosReentrada, HTMLInputElement>();
  for (const [nome, valor] of Object.entries(configurarParametrosReentrada())) {
    const chave = nome as keyof ParametrosReentrada;
    const label = document.createElement('label'); label.textContent = rotulosParametros[chave];
    const input = document.createElement('input'); input.type = 'number'; input.step = 'any'; input.required = true;
    input.id = `re-param-${chave}`; input.defaultValue = String(valor); label.append(input);
    elemento('re-parametros').append(label); camposParametros.set(chave, input);
  }
  const renderer = new RenderizadorReentrada(elemento('re-canvas'), elemento('re-graficos'));
  let ensaio: ReturnType<typeof criarEnsaioReentrada> | undefined;
  let executor: ExecutorPassoFixo | undefined;
  let aplicada: ConfiguracaoReentrada | undefined;
  let camposAplicados: Readonly<Record<string, string>> = {};
  let acaoPendente: 'executar' | 'passo' | undefined;
  let numeroPreparo = 0, rejeicoes = 0;
  let historico: ObservacaoReentrada[] = [];
  let intervaloVisualPassos = 240, limiteVisualAmostras = 3600;
  let ultimaAtualizacaoMs = -Infinity, eventosMostrados = -1;
  const metricas = new Map<string, HTMLElement>();

  /** Compõe parâmetros editados com os três limites dos campos dedicados.
   * O editor não duplica limites de superfície/bateria; seus demais limites
   * regionais são explícitos em °C. JSON inválido nunca recebe fallback.
   * @contract f-31a88b3524a1e832
   */
  function lerTermica(): ConfiguracaoTermicaReentrada | null {
    const perfil = opcao('re-perfil-termico', ['legado', 'sem-tps', 'tps-experimental']);
    if (perfil === 'legado') return null;
    const c = JSON.parse(elemento<HTMLTextAreaElement>('re-termica-json').value) as ConfiguracaoTermicaReentrada;
    if (!c || c.perfil !== perfil) throw new Error('Perfil térmico do editor diverge da seleção.');
    const pares = [['corpo', 'superficie', numero('re-limite-corpo')], ['flap', 'superficie', numero('re-limite-flaps')],
      ['bateria', 'estrutura', numero('re-limite-bateria')]] as const;
    const composto = { ...c };
    for (const [nome, id, limite] of pares) {
      if (!c[nome] || !Array.isArray(c[nome].regioes)) throw new Error(`Rede térmica ausente: ${nome}.`);
      composto[nome] = { ...c[nome], regioes: c[nome].regioes.map(r => {
        if (r.id !== id) return r;
        if (Object.hasOwn(r, 'limiteTermicoC')) throw new Error(`Edite o limite de ${nome}/${id} no campo dedicado acima, sem duplicá-lo no JSON.`);
        return { ...r, limiteTermicoC: limite };
      }) };
    }
    return validarConfiguracaoTermicaReentrada(composto);
  }

  /** Carrega uma receita por seleção explícita. Remove do editor apenas os três
   * limites que já têm campos dedicados. Nenhuma temperatura evolui na UI.
   * Na carga inicial, defaultValue preserva o valor dirty restaurado pelo
   * navegador; trocar perfil explicitamente substitui o editor.
   * Reinicialização do ensaio continua sendo ação explícita separada.
   * @contract f-1974365edf2e7548
   */
  function carregarPerfilTermico(preservarRestauracao = false): void {
    const perfil = opcao('re-perfil-termico', ['legado', 'sem-tps', 'tps-experimental']);
    const editor = elemento<HTMLTextAreaElement>('re-termica-json'); editor.disabled = perfil === 'legado';
    if (perfil === 'legado') { if (preservarRestauracao) editor.defaultValue = ''; else editor.value = ''; return; }
    const c = criarConfiguracaoTermicaReentrada(perfil as 'sem-tps' | 'tps-experimental');
    const dados = JSON.parse(JSON.stringify(c));
    for (const [nome, id] of [['corpo', 'superficie'], ['flap', 'superficie'], ['bateria', 'estrutura']]) {
      for (const r of dados[nome].regioes) if (r.id === id) delete r.limiteTermicoC;
    }
    if (preservarRestauracao) editor.defaultValue = JSON.stringify(dados, null, 2);
    else editor.value = JSON.stringify(dados, null, 2);
  }

  /** Lê configuração pré-ensaio; todas as conversões são explícitas e registradas.
   * Inclui opt-in regional completo, sem calcular calor na interface.  @contract f-9f19a52f59d415b4 */
  function lerConfiguracao(): ConfiguracaoReentrada {
    return validarConfiguracaoExplicitaReentrada({ termica: lerTermica(), parametros: Object.fromEntries([...camposParametros].map(([k, input]) => [k, numero(input.id)])),
      passoS: 1 / numero('re-divisor-dt'), intervaloColetaS: numero('re-intervalo-coleta'),
      limiteAmostras: numero('re-limite-amostras'), limiteEventos: numero('re-limite-eventos'), altitudeM: numero('re-altitude'), velocidadeMps: numero('re-velocidade'),
      taxaAtitudeLocalInicialRadps: rad('re-taxa-inicial'), anguloAtaqueRad: rad('re-alpha-inicial'), trajetoriaRad: rad('re-trajetoria'), rolagemRad: rad('re-phi-inicial'),
      limiteOrbitadorC: numero('re-limite-corpo'), limiteFlapsC: numero('re-limite-flaps'),
      limiteBateriaC: numero('re-limite-bateria'),
      automatico: opcao('re-controle-inicial', ['automatico', 'manual']) === 'automatico',
      vacuo: opcao('re-atmosfera', ['atmosfera', 'vacuo']) === 'vacuo', semente: numero('re-semente'),
      chaveamentoAutomatico: opcao('re-chaveamento-inicial', ['automatico', 'manual']) === 'automatico',
      corredor: { pressaoMaximaPa: numero('re-qmax'), fluxoMaximoWm2: numero('re-heatmax'), cargaMaximaG: numero('re-gmax') },
      aproximacao: { alvoArcoM: elemento<HTMLInputElement>('re-alvo-arco').value.trim() === '' ? null : numero('re-alvo-arco'),
        aceleracoesLiquidasHipoteticasMps2: [numero('re-acc-1'), numero('re-acc-2'), numero('re-acc-3')],
        erroAlphaMaxRad: rad('re-erro-alpha'), omegaMaxRadps: rad('re-omega-max') } });
  }

  /** Captura somente valores de configuração, inclusive restaurados sem eventos.
   * Inclui editor térmico; as strings detectam edição; não substituem a configuração física validada.
   * @contract f-4edb2d339a14b022
   */
  function capturarCamposConfiguracao(): Readonly<Record<string, string>> {
    return Object.fromEntries([...iniciais.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')]
      .map(input => [input.id, input.value]));
  }

  /** Mostra pendência comparando o formulário com a última preparação. Consulta
   * apenas strings e snapshot aplicado; nunca exporta todo o diário por frame.
   * @contract f-9662794860c9ef0a
   */
  function atualizarEstadoConfiguracao(): void {
    const pendente = !aplicada || JSON.stringify(capturarCamposConfiguracao()) !== JSON.stringify(camposAplicados);
    const estado = elemento('re-config-estado');
    estado.dataset.pendente = String(pendente);
    estado.textContent = aplicada
      ? pendente ? 'Configuração editada: alterações pendentes. O ensaio atual mantém a configuração aplicada.' : 'Configuração editada igual à configuração aplicada.'
      : 'Configuração editada ainda não aplicada. Corrija os campos e prepare o ensaio.';
    elemento('re-config-rastreio').textContent = `Preparações: ${numeroPreparo} · rejeições: ${rejeicoes}. O JSON registra a configuração aplicada.`;
  }

  /** Rejeição pertence à apresentação e não altera o diário do ensaio anterior.  @contract f-a0d4388c173e901d */
  function rejeitarConfiguracao(erro: unknown): void {
    rejeicoes++;
    mensagem.textContent = `Configuração rejeitada: ${erro instanceof Error ? erro.message : String(erro)}`;
    atualizarEstadoConfiguracao();
  }

  /** Recria pela fábrica após leitura/validação única; só substitui instância após
   * construção bem sucedida. Confirma valores do diário retornado pelo domínio,
   * sem reescrever inputs ou materiais do ensaio anterior. Testes RE-003 A–G.
   * Oculta o aviso de cena indisponível somente após preparação válida.
   * @contract f-c51586eefc46d9d2 */
  function preparar(configuracao?: ConfiguracaoReentrada): boolean {
    if (ensaio?.estadoExecucao === 'executando') ensaio.pausar();
    executor?.suspenderReferenciaRelogio(); iniciais.disabled = false;
    try {
      const novo = criarEnsaioReentrada(configuracao ?? lerConfiguracao());
      const identificacao = novo.exportar().identificacao as { configuracao: ConfiguracaoReentrada; revisao: string };
      const c = identificacao.configuracao;
      ensaio = novo; aplicada = c; executor = new ExecutorPassoFixo(c.passoS); historico = [novo.observar()];
      camposAplicados = capturarCamposConfiguracao(); numeroPreparo++;
      intervaloVisualPassos = Math.round(c.intervaloColetaS / c.passoS); limiteVisualAmostras = c.limiteAmostras;
      for (const id of ['re-flap-dianteiro', 're-flap-traseiro']) {
        const e = elemento<HTMLInputElement>(id), curso = c.parametros.cursoFlapRad * 180 / Math.PI;
        e.min = String(-curso); e.max = String(curso); e.value = '0';
      }
      eventosMostrados = -1; ultimaAtualizacaoMs = -Infinity;
      modo.value = c.automatico ? 'automatico' : 'manual';
      elemento<HTMLInputElement>('re-alpha-alvo').value = String(c.anguloAtaqueRad * 180 / Math.PI);
      elemento<HTMLInputElement>('re-phi-alvo').value = String(c.rolagemRad * 180 / Math.PI);
      const confirmacao = `Configuração aplicada ao RE-001 (preparo ${numeroPreparo}, ${identificacao.revisao}). `
        + `Limite térmico do corpo: ${c.limiteOrbitadorC} °C. Limite térmico dos flaps: ${c.limiteFlapsC} °C. Limite térmico da bateria: ${c.limiteBateriaC} °C. `
        + `Resistência a impacto: corpo ${c.parametros.resistenciaCorpoJ} J; flaps ${c.parametros.resistenciaFlapJ} J. Resistência axial dos fixadores: ${c.parametros.resistenciaFixadorN} N.`;
      const contexto = c.termica ? ` Modelo térmico ${c.termica.revisao} (${c.termica.perfil}): limites acima são superfície; estrutura e mecanismo têm limites próprios no editor. Bateria com condução declarada.` : ' Modelo térmico legado concentrado; bateria isolada.';
      elemento('re-config-aplicada').textContent = confirmacao + contexto;
      mensagem.textContent = confirmacao + contexto;
      elemento('re-telemetria').replaceChildren(); metricas.clear();
      cancelarEscolhaConfiguracao(); atualizarEstadoConfiguracao(); atualizarPainel(novo.observar());
      elemento('re-cena-indisponivel').hidden = true;
      return true;
    } catch (e) { rejeitarConfiguracao(e); return false; }
  }

  /** Nenhum novo início/passo depende de evento de edição. Revalida o formulário;
   * ensaio pausado com edição exige escolha, inclusive se a edição for inválida.
   * @contract f-9b4f1d58114ea0f6
   */
  function garantirConfiguracaoParaInicio(acao: 'executar' | 'passo'): boolean {
    const pendente = JSON.stringify(capturarCamposConfiguracao()) !== JSON.stringify(camposAplicados);
    atualizarEstadoConfiguracao();
    if (ensaio?.estadoExecucao === 'pausada' && pendente) {
      acaoPendente = acao; elemento('re-config-escolha').hidden = false;
      elemento('re-continuar-aplicada').focus();
      mensagem.textContent = 'Há alterações pendentes. Escolha continuar o ensaio aplicado ou preparar um novo ensaio.';
      return false;
    }
    try {
      const configuracao = lerConfiguracao();
      return (!ensaio || pendente) ? preparar(configuracao) : true;
    } catch (e) { rejeitarConfiguracao(e); return false; }
  }

  /** Executa somente sobre instância já escolhida/validada; tempo real fica na
   * apresentação. Passo manual avança exatamente 1 s usando dt configurado.
   * @contract f-f954882670778897
   */
  function executarAcaoPreparada(acao: 'executar' | 'passo'): void {
    if (!ensaio || !executor) return;
    cancelarEscolhaConfiguracao();
    ensaio.iniciar(); executor.suspenderReferenciaRelogio();
    if (acao === 'passo') {
      for (let i = 0; i < Math.round(1 / ensaio.passoS); i++) avancar();
      ensaio.pausar(); executor.suspenderReferenciaRelogio();
    }
    ultimaAtualizacaoMs = -Infinity; atualizarPainel(ensaio.observar());
  }

  /** Handler de início/pausa: pausar não valida nem aplica edições.  @contract f-3761f7ab8221f2db */
  function tratarExecucao(evento: SubmitEvent): void {
    evento.preventDefault();
    if (ensaio?.estadoExecucao === 'executando') {
      ensaio.pausar(); executor?.suspenderReferenciaRelogio(); atualizarPainel(ensaio.observar());
    } else if (garantirConfiguracaoParaInicio('executar')) executarAcaoPreparada('executar');
    ultimaAtualizacaoMs = -Infinity;
  }

  /** Reinicialização explícita aplica a edição e conserva novo ensaio no passo 0.  @contract f-cb43a54875d00a72 */
  function reinicializar(): void { cancelarEscolhaConfiguracao(); preparar(); }

  /** Restaura explicitamente todos os campos de configuração aos padrões HTML
   * e SI do modelo, inclusive limiares térmicos aprovados, e prepara no tempo
   * zero pela mesma validação. Não inicia execução nem conserva o ensaio antigo.
   * Recarrega receita térmica padrão após reset do seletor/editor.
   * Depende do DOM/form.reset e reinicializar; smoke cobre erro e recuperação.
   * @contract f-23de89613c49fbe8
   */
  function restaurarConfiguracaoPadrao(): void {
    form.reset(); carregarPerfilTermico(); reinicializar();
  }

  /** Avanço manual usa a mesma validação e a mesma escolha da execução contínua.  @contract f-2c6793de2a48e002 */
  function avancarUmSegundo(): void {
    if (garantirConfiguracaoParaInicio('passo')) executarAcaoPreparada('passo');
  }

  /** Fecha escolha sem tocar em corpos, diário ou valores digitados.  @contract f-0245250bccc43c18 */
  function cancelarEscolhaConfiguracao(): void {
    acaoPendente = undefined; elemento('re-config-escolha').hidden = true;
  }

  /** Retoma explicitamente a configuração anterior mesmo com edição inválida;
   * preserva edição e agenda física anterior. Não reinterpreta inputs como comandos.
   * @contract f-aa238813e3495b38
   */
  function continuarConfiguracaoAplicada(): void {
    if (!acaoPendente) return;
    executarAcaoPreparada(acaoPendente);
    mensagem.textContent = 'Continuando com a configuração aplicada anterior. Edições continuam pendentes.';
  }

  /** Troca de ensaio só após validação bem sucedida da edição atual.  @contract f-5a22c7b79b3d9a12 */
  function iniciarNovaConfiguracao(): void {
    const acao = acaoPendente;
    if (acao && preparar()) executarAcaoPreparada(acao);
  }

  /** Exporta somente o ensaio aplicado, identificando edição pendente. Antes de
   * existir um ensaio válido não fabrica um diário com defaults. Download local.
   * @contract f-e5c5a5583589aedc
   */
  function exportarDiario(): void {
    if (!ensaio) { mensagem.textContent = 'Não há ensaio aplicado para exportar. Prepare uma configuração válida.'; return; }
    const blob = new Blob([JSON.stringify(ensaio.exportar(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'blackstar-RE-001.json'; link.click(); URL.revokeObjectURL(url);
    atualizarEstadoConfiguracao();
    const pendente = elemento('re-config-estado').dataset.pendente === 'true';
    mensagem.textContent = `Diário do preparo ${numeroPreparo} exportado com a configuração aplicada.`
      + (pendente ? ' As edições pendentes não foram aplicadas; use Reinicializar para preparar esses valores.' : '');
  }

  /** Encaminha intenção e apresenta diagnóstico real, sem duplicar estados.  @contract f-cf79be1a17c2b2c7 */
  function comandar(c: ComandoReentrada): void {
    try { if (!ensaio) throw new Error('Prepare uma configuração válida antes de comandar.'); const r = ensaio.receberComando(c); mensagem.textContent = `${r.aceito ? 'Aceito' : 'Bloqueado'}: ${r.motivo}`; }
    catch (e) { mensagem.textContent = e instanceof Error ? e.message : String(e); }
    ultimaAtualizacaoMs = -Infinity;
  }

  /** Executa um passo fixo e registra amostra visual a cada segundo simulado.
   * O diário compartilha coleta configurada e informa retenção/descartes; extremos são medidos em todo passo.
   * @contract f-9085698dbe6b0394
   */
  function avancar(): void {
    if (ensaio?.avancarPasso() && ensaio.passosExecutados % intervaloVisualPassos === 0) {
      historico.push(ensaio.observar());
      if (historico.length > limiteVisualAmostras) historico.shift();
    }
  }

  /** Atualiza valor de telemetria em nó persistente, evitando reconstrução por frame.  @contract f-0a8b2119bcaf62bf */
  function metrica(id: string, nome: string, valor: string): void {
    let e = metricas.get(id);
    if (!e) {
      const caixa = document.createElement('div'); caixa.className = 're-metrica';
      const titulo = document.createElement('span'); titulo.textContent = nome;
      e = document.createElement('strong'); e.dataset.metrica = id;
      caixa.append(titulo, e); elemento('re-telemetria').append(caixa); metricas.set(id, e);
    }
    e.textContent = valor;
  }

  /** Converte radianos observados para graus de apresentação.  @contract f-8a757acdc377f6ca */
  function graus(rad: number): string { return (rad * 180 / Math.PI).toFixed(1); }

  /** Renderiza comandos, física e canais térmicos regionais já calculados no
   * core, incluindo potência, energia e causa. Não calcula transferências na UI.  @contract f-886d03c02bf67e85 */
  function atualizarPainel(o: ObservacaoReentrada): void {
    const a = o.aerodinamica;
    metrica('altitude', 'Altitude radial / velocidade', `${o.altitudeM.toFixed(0)} m / ${o.velocidadeMps.toFixed(1)} m/s`);
    metrica('trajetoria', 'Trajetória / Mach aproximado', `${graus(o.trajetoriaRad)}° / M ${a.mach.toFixed(2)}`);
    metrica('alpha', 'α solicitado → gerenciado → real', `${graus(o.controle.alphaSolicitadoRad)}° → ${graus(o.controle.alphaGerenciadoRad)}° → ${graus(a.anguloAtaqueRad)}°`);
    metrica('phi', 'φ virtual comandado → atual', `${graus(o.rolagem.solicitadaRad)}° → ${graus(o.rolagem.atualRad)}°`);
    metrica('q', 'Pressão dinâmica / regime', `${a.pressaoDinamicaPa.toPrecision(4)} Pa / ${a.regime}`);
    metrica('lift', 'Sustentação modelo → projetada XY', `${a.sustentacaoN.toFixed(1)} → ${a.sustentacaoXYN.toFixed(1)} N`);
    metrica('drag', 'Arrasto do corpo / lateral omitida', `${a.arrastoN.toFixed(1)} N / ${a.sustentacaoLateralOmitidaN.toFixed(1)} N`);
    metrica('carga', 'Carga aero / desaceleração por aero', `${o.cargaG.toFixed(3)} g₀ / ${o.desaceleracaoMps2.toFixed(3)} m/s²`);
    metrica('aceleracao', 'Aceleração total X / Y', `${o.aceleracaoMps2.x.toFixed(3)} / ${o.aceleracaoMps2.y.toFixed(3)} m/s²`);
    metrica('torque', 'Momento aero / CP local do corpo', `${o.torqueAerodinamicoNm.toFixed(1)} N·m / ${a.centroPressaoLocalM.toFixed(3)} m`);
    metrica('heat', 'Fluxo térmico indicador', `${a.fluxoTermicoIndicadorWm2.toPrecision(4)} W/m² · preliminar`);
    metrica('temperatura', o.termica ? 'Estrutura do corpo / limite estrutural' : 'Corpo concentrado / início de dano', `${o.temperaturaC.toFixed(2)} / ${o.termica?.corpo.regioes.find(r => r.id === 'estrutura')?.limiteTermicoC ?? o.limiteOrbitadorC} °C`);
    metrica('integridade', 'Integridade do corpo / massa conectada', `${(100 * o.integridade).toFixed(2)} % / ${o.massaKg.toFixed(0)} kg`);
    metrica('energia', 'Calor absorvido acumulado', `${o.energiaAbsorvidaJ.toPrecision(5)} J`);
    metrica('balanco', o.termica ? 'D·V / fluxo prescrito / resíduo legado (não fecha atmosfera)' : 'Dissipação / calor transferido / atmosfera', `${o.dissipacaoW.toPrecision(4)} / ${o.calorTransferidoW.toPrecision(4)} / ${o.potenciaAtmosferaW.toPrecision(4)} W`);
    metrica('rarefacao', 'Knudsen / modelo contínuo aplicável', `${a.knudsen.toPrecision(3)} / ${a.modeloContinuoAplicavel ? 'sim, preliminar' : 'não'}`);
    metrica('rotacao', 'ω inercial / momento intrínseco', `${o.estado.velocidadeAngularRadps.z.toPrecision(6)} rad/s / ${o.rotacao.momentoIntrinsecoKgM2ps.toPrecision(6)} kg·m²/s`);
    metrica('momento-orbital', 'Momento orbital / inércia', `${o.rotacao.momentoOrbitalKgM2ps.toPrecision(6)} kg·m²/s / ${o.inerciaKgM2.toPrecision(6)} kg·m²`);
    metrica('torque-gravidade', 'Torque de gradiente / outros contínuos', `${o.rotacao.torqueGravitacionalNm.toPrecision(5)} / ${(o.rotacao.cargasEfetivamenteIntegradas?.torqueOutrosContinuosNm ?? 0).toPrecision(5)} N·m`);
    metrica('residuo-angular', 'Resíduo angular por passo / acumulado', `${o.rotacao.residuoPassoKgM2ps.toPrecision(4)} / ${o.rotacao.residuoAcumuladoKgM2ps.toPrecision(4)} kg·m²/s · ${o.rotacao.passosIncompletos} passos incompletos`);
    metrica('energia-voo', 'Energia mecânica específica / velocidade local', `${o.energiaMecanicaEspecificaJPorKg.toPrecision(6)} J/kg · radial ${o.velocidadeRadialMps.toFixed(1)} / tangencial ${o.velocidadeTangencialMps.toFixed(1)} m/s`);
    metrica('picos', 'Picos por passo · pressão / fluxo', `${o.extremos.globais.pressaoDinamicaPa.maximo.valor.toPrecision(4)} Pa / ${o.extremos.globais.fluxoTermicoIndicadorWm2.maximo.valor.toPrecision(4)} W/m²`);
    metrica('termica-modelo', 'Potência térmica indicada → recebida pelo corpo', `${o.respostaTermica.potenciaIndicadorCorpoW.toPrecision(4)} → ${o.respostaTermica.potenciaTransferidaCorpoW.toPrecision(4)} W · hipótese min(indicador, D·V)`);
    metrica('corridor', 'Estratégia experimental / torque PD solicitado', `${o.controle.corredor?.estrategia ?? 'inativa'} / ${o.controle.torqueSolicitadoNm.toPrecision(5)} N·m`);
    metrica('coleta', 'Coleta e eventos / descarte explícito', `extremos a cada passo · ${o.eventosDescartados} eventos fora da janela`);
    metrica('modelo-escoamento', 'Modelo empregado / domínio atmosférico', `${a.modeloEscoamentoEfetivo} · ${a.foraDominioAtmosferico ? 'fora de 0–200 km' : 'dentro de 0–200 km'}`);
    metrica('controle', 'Modo do controlador / supervisor', `${o.controle.estado} / ${o.supervisor.fase}`);
    metrica('aproximacao', 'Candidato A / autorização operacional B', `${o.supervisor.candidatoCinematico ? 'candidato hipotético' : 'não candidato'} / ${o.supervisor.autorizado ? 'autorizada' : 'bloqueada'}`);
    const fronteira = o.supervisor.avaliacao;
    metrica('alvo-aproximacao', 'Arco restante / limites necessários de velocidade', fronteira?.distanciaRestanteM == null
      ? 'Alvo não definido · configurar antes de estudar aproximação'
      : `${fronteira.distanciaRestanteM.toFixed(0)} m · ${fronteira.hipoteses.map(h => `${h.aceleracaoLiquidaMps2} m/s² → ${h.velocidadeLimiteNecessariaMps?.toFixed(0)} m/s (desvio ${h.desvioVelocidadeMps?.toFixed(0)})`).join(' · ')} · frenagem ideal, trajetória não certificada`);
    metrica('bateria', 'Energia elétrica interna / RCS', `${o.energiaBateriaJ.toFixed(0)} J / ausente`);
    metrica('bateria-termica', o.termica ? 'Bateria com condução · temperatura / limiar / integridade' : 'Bateria isolada · temperatura / limiar / integridade', `${o.temperaturaBateriaC.toFixed(o.termica ? 6 : 2)} / ${o.limiteBateriaC} °C / ${(100 * o.integridadeBateria).toFixed(2)} %`);
    for (const [i, f] of o.flaps.entries()) {
      metrica(`flap-${i}`, `${i === 0 ? 'Dianteiro' : 'Traseiro'} · comando → efetivo`, `${graus(f.comandoRad)}° → ${graus(f.deflexaoRad)}° · ${f.energizado ? 'energizado' : 'sem energia'} · ${f.conectado ? 'vinculado' : 'separado'}`);
      metrica(`flap-atuacao-${i}`, `Flap ${i + 1} · taxa efetiva / impedimento`, `${graus(f.atuacao.taxaEfetivaRadps)} °/s · ${f.atuacao.bloqueio} · torque mecânico não modelado`);
      metrica(`flap-termico-${i}`, `Flap ${i + 1} · ${o.termica ? 'estrutura' : 'concentrado'} / limiar / integridade`, `${f.temperaturaC.toFixed(2)} / ${o.termica?.flaps[i].regioes.find(r => r.id === 'estrutura')?.limiteTermicoC ?? o.limiteFlapsC} °C / ${(100 * f.integridade).toFixed(1)} %`);
    }
    play.textContent = o.execucao === 'executando' ? 'Pausar' : o.execucao === 'preparada' ? 'Iniciar ensaio' : 'Continuar';
    iniciais.disabled = o.execucao === 'executando';
    atualizarEstadoConfiguracao();
    manuais.disabled = o.controle.estado !== 'manual' || o.supervisor.fase !== 'reentrada';
    modo.value = o.controle.estado === 'manual' ? 'manual' : 'automatico';
    modo.disabled = o.supervisor.fase !== 'reentrada';
    if (o.termica) {
      const redes = [['corpo', o.termica.corpo], ...o.termica.flaps.map((r, i) => [`flap-${i + 1}`, r] as const), ['bateria', o.termica.bateria]] as const;
      for (const [nome, rede] of redes) {
        for (const r of rede.regioes) metrica(`regiao-${nome}-${r.id}`, `${nome} · ${nome === 'bateria' ? 'interna' : r.id === 'interna' && nome !== 'corpo' ? 'articulação/atuador' : r.id} · T / limite / integridade`,
          `${r.temperaturaC.toFixed(nome === 'bateria' ? 6 : 3)} / ${r.limiteTermicoC} °C · ${(r.integridade * 100).toFixed(2)}%${r.causa ? ' · ' + r.causa : ''}`);
        metrica(`termica-potencia-${nome}`, `${nome} · incidente / irradiada / convecção`, `${rede.potenciaIncidenteW.toPrecision(4)} / ${rede.potenciaRadiadaW.toPrecision(4)} / ${rede.potenciaConveccaoW.toPrecision(4)} W`);
        metrica(`termica-energia-${nome}`, `${nome} · ΔU / radiação / convecção / condução externa / resíduo`,
          `${rede.energiaArmazenadaJ.toPrecision(4)} / ${rede.energiaRadiadaJ.toPrecision(4)} / ${rede.energiaConveccaoJ.toPrecision(4)} / ${rede.energiaConducaoExternaJ.toPrecision(4)} / ${rede.residuoEnergiaJ.toPrecision(3)} J`);
        for (const l of rede.conducoes) metrica(`conducao-${nome}-${l.a}-${l.b}`, `${nome} · ${l.a} → ${l.b}`, `${l.potenciaW.toPrecision(4)} W · ${l.energiaJ.toPrecision(4)} J`);
      }
      for (const f of o.vinculos) if (f.termica) metrica(`conducao-${f.id}`, `${f.id} · condução entre objetos`, `${f.termica.potenciaConduzidaW.toPrecision(4)} W · ${f.termica.energiaConduzidaJ.toPrecision(4)} J`);
    }
    elemento<HTMLButtonElement>('re-passo').disabled = o.execucao === 'executando';
    elemento<HTMLSelectElement>('re-chaveamento').value = o.supervisor.automatico ? 'automatico' : 'manual';
    energia.textContent = o.flaps.every(f => f.energizado) ? 'Desligar alimentação dos flaps' : 'Ligar alimentação dos flaps';
    elemento('re-tempo-real').textContent = `t = ${o.tempoS.toFixed(3)} s · ${o.execucao} · dt = ${aplicada!.passoS.toPrecision(5)} s · dívida ${executor!.tempoPendenteS.toFixed(2)} s`;
    const diagnostico = elemento('re-requisitos'); diagnostico.replaceChildren();
    for (const r of o.supervisor.requisitos) {
      const linha = document.createElement('div'); linha.className = `re-requisito ${r.atendido ? 're-ok' : 're-bloqueado'}`;
      const descricao = document.createElement('span'); descricao.textContent = `${r.atendido ? 'OK' : 'BLOQUEADO'} · ${r.descricao}`;
      const valor = document.createElement('span'); valor.textContent = `${typeof r.atual === 'number' ? r.atual.toPrecision(4) : r.atual === null ? 'não definido' : r.atual ? 'sim' : 'não'} · ${r.esperado}`;
      linha.append(descricao, valor); diagnostico.append(linha);
    }
    const eventos = ensaio?.obterEventos() ?? [];
    if (eventosMostrados !== (eventos.at(-1)?.sequencia ?? -1)) {
      const lista = elemento('re-eventos'); lista.replaceChildren();
      for (const evento of eventos.slice(-80)) {
        const li = document.createElement('li'); li.textContent = `${evento.tempoS.toFixed(3)} s · ${evento.tipo} · ${evento.descricao}${evento.dados ? ` · valor ${evento.dados.valor} · causa ${evento.dados.causa}` : ''}`; lista.append(li);
      }
      eventosMostrados = eventos.at(-1)?.sequencia ?? -1;
    }
  }

  iniciais.addEventListener('input', atualizarEstadoConfiguracao);
  iniciais.addEventListener('change', atualizarEstadoConfiguracao);
  form.addEventListener('submit', tratarExecucao);
  elemento('re-reset').addEventListener('click', reinicializar);
  elemento('re-perfil-termico').addEventListener('change', () => carregarPerfilTermico());
  elemento('re-restaurar-padroes').addEventListener('click', restaurarConfiguracaoPadrao);
  elemento('re-continuar-aplicada').addEventListener('click', continuarConfiguracaoAplicada);
  elemento('re-iniciar-nova').addEventListener('click', iniciarNovaConfiguracao);
  elemento('re-cancelar-escolha').addEventListener('click', cancelarEscolhaConfiguracao);
  modo.addEventListener('change', () => comandar({ tipo: 'modo', automatico: modo.value === 'automatico' }));
  elemento('re-alvos').addEventListener('click', () => {
    comandar({ tipo: 'alvos', alphaRad: rad('re-alpha-alvo'), phiRad: rad('re-phi-alvo') });
    if (modo.value === 'manual') comandar({ tipo: 'rolagem', phiRad: rad('re-phi-alvo') });
  });
  for (const id of ['re-flap-dianteiro', 're-flap-traseiro']) elemento(id).addEventListener('input', () => {
    comandar({ tipo: 'flaps', dianteiroRad: rad('re-flap-dianteiro'), traseiroRad: rad('re-flap-traseiro') });
  });
  elemento('re-chaveamento').addEventListener('change', () => comandar({ tipo: 'chaveamento', automatico: elemento<HTMLSelectElement>('re-chaveamento').value === 'automatico' }));
  elemento('re-pouso').addEventListener('click', () => comandar({ tipo: 'aproximacao' }));
  energia.addEventListener('click', () => comandar({ tipo: 'alimentacao', ligada: !(ensaio?.observar().flaps.every(f => f.energizado) ?? false) }));
  elemento('re-falha-rolagem').addEventListener('click', () => comandar({ tipo: 'falha-rolagem' }));
  elemento('re-separar').addEventListener('click', () => comandar({ tipo: 'separar-flap', indice: 0 }));
  elemento('re-passo').addEventListener('click', avancarUmSegundo);
  elemento('re-exportar').addEventListener('click', exportarDiario);

  /** Cooperação da apresentação: orçamento 8 ms/quadro, mantém dívida temporal.
   * Pausa em erro explícito e conserva diagnóstico; não declara sucesso/repouso.
   * @contract f-081506ae1d0d1404
   */
  function quadro(timestamp: number): void {
    try {
      if (ensaio?.estadoExecucao === 'executando' && executor) {
        const inicio = performance.now();
        executor.avancarAte(timestamp, numero('re-tempo'), avancar,
          { maxPassos: 240,
            /** Orçamento visual em ms; interrompe lote, preservando dívida e dt físico.  @contract f-8c86b54a123c80c0 */
            continuar: () => performance.now() - inicio < 8 });
      }
      const o = ensaio?.observar();
      if (o) renderer.desenhar(o, historico, 10 ** numero('re-zoom'));
      if (timestamp - ultimaAtualizacaoMs >= 100) {
        if (o) atualizarPainel(o);
        atualizarEstadoConfiguracao(); renderer.desenharGraficos(historico); ultimaAtualizacaoMs = timestamp;
      }
    } catch (e) { ensaio?.pausar(); mensagem.textContent = `Ensaio pausado por erro: ${e instanceof Error ? e.message : String(e)}`; }
    requestAnimationFrame(quadro);
  }
  carregarPerfilTermico(true);
  preparar();
  requestAnimationFrame(quadro);
}
iniciarBancada();
