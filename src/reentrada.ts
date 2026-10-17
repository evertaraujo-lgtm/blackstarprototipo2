import './style.css';
import './reentrada.css';
import { criarEnsaioReentrada, type ComandoReentrada, type ConfiguracaoReentrada, type ObservacaoReentrada } from './cenarios/EnsaioReentrada';
import { ExecutorPassoFixo } from './simulacao/ExecutorPassoFixo';
import { RenderizadorReentrada } from './apresentacao/reentrada/RenderizadorReentrada';

/** Fronteira de apresentação: lê controles, comanda portas de missão e desenha
 * snapshots; tempo real serve apenas ao executor fixo, nunca à lei física.
 * @contract f-bdf1e31dbe2aa399
   */
function iniciarBancada(): void {
  /** Resolve elemento obrigatório da página, falhando explicitamente se ausente.  @contract f-043a536f0ddd232b */
  function elemento<T extends HTMLElement>(id: string): T {
    const e = document.getElementById(id); if (!e) throw new Error(`Elemento ausente: ${id}`); return e as T;
  }
  /** Converte entrada numérica em SI; validação final pertence ao domínio.  @contract f-125d2a3542b41de5 */
  function numero(id: string): number { return Number(elemento<HTMLInputElement>(id).value); }
  /** Converte graus da interface para radianos explicitamente.  @contract f-1d3579ae29692539 */
  function rad(id: string): number { return numero(id) * Math.PI / 180; }
  const form = elemento<HTMLFormElement>('re-config'), iniciais = elemento<HTMLFieldSetElement>('re-iniciais');
  const play = elemento<HTMLButtonElement>('re-play'), mensagem = elemento<HTMLOutputElement>('re-mensagem');
  const modo = elemento<HTMLSelectElement>('re-modo'), manuais = elemento<HTMLFieldSetElement>('re-manuais');
  const energia = elemento<HTMLButtonElement>('re-energia');
  const renderer = new RenderizadorReentrada(elemento('re-canvas'), elemento('re-graficos'));
  let ensaio = criarEnsaioReentrada(), executor = new ExecutorPassoFixo(ensaio.passoS);
  let historico: ObservacaoReentrada[] = [ensaio.observar()];
  let configAlterada = false, ultimaAtualizacaoMs = -Infinity, eventosMostrados = -1;
  const metricas = new Map<string, HTMLElement>();

  /** Lê configuração pré-ensaio; todas as conversões são explícitas e registradas.  @contract f-9f19a52f59d415b4 */
  function lerConfiguracao(): Partial<ConfiguracaoReentrada> {
    return { altitudeM: numero('re-altitude'), velocidadeMps: numero('re-velocidade'),
      anguloAtaqueRad: rad('re-alpha-inicial'), trajetoriaRad: rad('re-trajetoria'), rolagemRad: rad('re-phi-inicial'),
      limiteOrbitadorC: numero('re-limite-corpo'), limiteFlapsC: numero('re-limite-flaps'),
      limiteBateriaC: numero('re-limite-bateria'),
      automatico: elemento<HTMLSelectElement>('re-controle-inicial').value === 'automatico',
      vacuo: elemento<HTMLSelectElement>('re-atmosfera').value === 'vacuo', semente: numero('re-semente'),
      chaveamentoAutomatico: elemento<HTMLSelectElement>('re-chaveamento').value === 'automatico',
      corredor: { pressaoMaximaPa: numero('re-qmax'), fluxoMaximoWm2: numero('re-heatmax'), cargaMaximaG: numero('re-gmax') },
      transferencia: { altitudeMinimaM: numero('re-hmin-pouso'), altitudeMaximaM: numero('re-hmax-pouso'),
        velocidadeMaximaMps: numero('re-vmax-pouso'), atitudeMaximaRad: rad('re-atitude-pouso'),
        trajetoriaMinimaRad: rad('re-gamma-min'), trajetoriaMaximaRad: rad('re-gamma-max') } };
  }

  /** Recria ensaio solicitado; reinicia somente pela fábrica, sem editar corpos.  @contract f-c51586eefc46d9d2 */
  function preparar(): boolean {
    if (!form.reportValidity()) return false;
    try {
      const novo = criarEnsaioReentrada(lerConfiguracao());
      ensaio = novo; executor = new ExecutorPassoFixo(ensaio.passoS); historico = [ensaio.observar()];
      configAlterada = false; eventosMostrados = -1; ultimaAtualizacaoMs = -Infinity;
      modo.value = lerConfiguracao().automatico ? 'automatico' : 'manual';
      elemento<HTMLInputElement>('re-alpha-alvo').value = elemento<HTMLInputElement>('re-alpha-inicial').value;
      elemento<HTMLInputElement>('re-phi-alvo').value = elemento<HTMLInputElement>('re-phi-inicial').value;
      elemento<HTMLInputElement>('re-flap-dianteiro').value = '0'; elemento<HTMLInputElement>('re-flap-traseiro').value = '0';
      mensagem.textContent = 'Ensaio preparado. Modelos e limites registrados no diário.';
      return true;
    } catch (e) { mensagem.textContent = e instanceof Error ? e.message : String(e); return false; }
  }

  /** Encaminha intenção e apresenta diagnóstico real, sem duplicar estados.  @contract f-cf79be1a17c2b2c7 */
  function comandar(c: ComandoReentrada): void {
    try { const r = ensaio.receberComando(c); mensagem.textContent = `${r.aceito ? 'Aceito' : 'Bloqueado'}: ${r.motivo}`; }
    catch (e) { mensagem.textContent = e instanceof Error ? e.message : String(e); }
    ultimaAtualizacaoMs = -Infinity;
  }

  /** Executa um passo fixo e registra amostra visual a cada segundo simulado.
   * O diário compartilhado mantém sua própria coleta determinística completa.
   * @contract f-9085698dbe6b0394
   */
  function avancar(): void {
    if (ensaio.avancarPasso() && ensaio.passosExecutados % 240 === 0) {
      historico.push(ensaio.observar());
      if (historico.length > 3600) historico.shift();
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

  /** Renderiza comandos, estado físico e variáveis virtuais explicitamente distintos.  @contract f-886d03c02bf67e85 */
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
    metrica('temperatura', 'Temperatura corpo / início de dano', `${o.temperaturaC.toFixed(2)} / ${o.limiteOrbitadorC} °C`);
    metrica('integridade', 'Integridade do corpo / massa conectada', `${(100 * o.integridade).toFixed(2)} % / ${o.massaKg.toFixed(0)} kg`);
    metrica('energia', 'Calor absorvido acumulado', `${o.energiaAbsorvidaJ.toPrecision(5)} J`);
    metrica('balanco', 'Dissipação / calor transferido / atmosfera', `${o.dissipacaoW.toPrecision(4)} / ${o.calorTransferidoW.toPrecision(4)} / ${o.potenciaAtmosferaW.toPrecision(4)} W`);
    metrica('rarefacao', 'Knudsen / modelo contínuo aplicável', `${a.knudsen.toPrecision(3)} / ${a.modeloContinuoAplicavel ? 'sim, preliminar' : 'não'}`);
    metrica('controle', 'Modo do controlador / supervisor', `${o.controle.estado} / ${o.supervisor.fase}`);
    metrica('bateria', 'Energia elétrica interna / RCS', `${o.energiaBateriaJ.toFixed(0)} J / ausente`);
    metrica('bateria-termica', 'Bateria isolada · temperatura / limiar / integridade', `${o.temperaturaBateriaC.toFixed(2)} / ${o.limiteBateriaC} °C / ${(100 * o.integridadeBateria).toFixed(2)} %`);
    for (const [i, f] of o.flaps.entries()) {
      metrica(`flap-${i}`, `${i === 0 ? 'Dianteiro' : 'Traseiro'} · comando → efetivo`, `${graus(f.comandoRad)}° → ${graus(f.deflexaoRad)}° · ${f.energizado ? 'energizado' : 'sem energia'} · ${f.conectado ? 'vinculado' : 'separado'}`);
      metrica(`flap-termico-${i}`, `Flap ${i + 1} · temperatura / limiar / integridade`, `${f.temperaturaC.toFixed(2)} / ${o.limiteFlapsC} °C / ${(100 * f.integridade).toFixed(1)} %`);
    }
    play.textContent = o.execucao === 'executando' ? 'Pausar' : o.execucao === 'preparada' ? 'Iniciar ensaio' : 'Continuar';
    iniciais.disabled = o.passo > 0 || o.execucao === 'executando';
    manuais.disabled = o.controle.estado !== 'manual' || o.supervisor.fase !== 'reentrada';
    modo.value = o.controle.estado === 'manual' ? 'manual' : 'automatico';
    modo.disabled = o.supervisor.fase !== 'reentrada';
    elemento<HTMLButtonElement>('re-passo').disabled = o.execucao === 'executando';
    elemento<HTMLSelectElement>('re-chaveamento').value = o.supervisor.automatico ? 'automatico' : 'manual';
    energia.textContent = o.flaps.every(f => f.energizado) ? 'Desligar alimentação dos flaps' : 'Ligar alimentação dos flaps';
    elemento('re-tempo-real').textContent = `t = ${o.tempoS.toFixed(3)} s · ${o.execucao} · dt = 1/240 s · dívida ${executor.tempoPendenteS.toFixed(2)} s`;
    const diagnostico = elemento('re-requisitos'); diagnostico.replaceChildren();
    for (const r of o.supervisor.requisitos) {
      const linha = document.createElement('div'); linha.className = `re-requisito ${r.atendido ? 're-ok' : 're-bloqueado'}`;
      const descricao = document.createElement('span'); descricao.textContent = `${r.atendido ? 'OK' : 'BLOQUEADO'} · ${r.descricao}`;
      const valor = document.createElement('span'); valor.textContent = `${typeof r.atual === 'number' ? r.atual.toPrecision(4) : r.atual ? 'sim' : 'não'} · ${r.esperado}`;
      linha.append(descricao, valor); diagnostico.append(linha);
    }
    const eventos = ensaio.obterEventos();
    if (eventosMostrados !== eventos.length) {
      const lista = elemento('re-eventos'); lista.replaceChildren();
      for (const evento of eventos.slice(-80)) {
        const li = document.createElement('li'); li.textContent = `${evento.tempoS.toFixed(3)} s · ${evento.tipo} · ${evento.descricao}`; lista.append(li);
      }
      eventosMostrados = eventos.length;
    }
  }

  iniciais.addEventListener('input', () => { configAlterada = true; });
  iniciais.addEventListener('change', () => { configAlterada = true; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (ensaio.estadoExecucao === 'executando') { ensaio.pausar(); executor.suspenderReferenciaRelogio(); }
    else { if (configAlterada && !preparar()) return; ensaio.iniciar(); executor.suspenderReferenciaRelogio(); }
    ultimaAtualizacaoMs = -Infinity;
  });
  elemento('re-reset').addEventListener('click', () => { iniciais.disabled = false; preparar(); });
  modo.addEventListener('change', () => comandar({ tipo: 'modo', automatico: modo.value === 'automatico' }));
  elemento('re-alvos').addEventListener('click', () => {
    comandar({ tipo: 'alvos', alphaRad: rad('re-alpha-alvo'), phiRad: rad('re-phi-alvo') });
    if (modo.value === 'manual') comandar({ tipo: 'rolagem', phiRad: rad('re-phi-alvo') });
  });
  for (const id of ['re-flap-dianteiro', 're-flap-traseiro']) elemento(id).addEventListener('input', () => {
    comandar({ tipo: 'flaps', dianteiroRad: rad('re-flap-dianteiro'), traseiroRad: rad('re-flap-traseiro') });
  });
  elemento('re-chaveamento').addEventListener('change', () => comandar({ tipo: 'chaveamento', automatico: elemento<HTMLSelectElement>('re-chaveamento').value === 'automatico' }));
  elemento('re-pouso').addEventListener('click', () => comandar({ tipo: 'pouso' }));
  energia.addEventListener('click', () => comandar({ tipo: 'alimentacao', ligada: !ensaio.observar().flaps.every(f => f.energizado) }));
  elemento('re-falha-rolagem').addEventListener('click', () => comandar({ tipo: 'falha-rolagem' }));
  elemento('re-separar').addEventListener('click', () => comandar({ tipo: 'separar-flap', indice: 0 }));
  elemento('re-passo').addEventListener('click', () => {
    if (configAlterada && !preparar()) return;
    ensaio.iniciar(); for (let i = 0; i < 240; i++) avancar(); ensaio.pausar(); executor.suspenderReferenciaRelogio();
    ultimaAtualizacaoMs = -Infinity;
  });
  elemento('re-exportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(ensaio.exportar(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'blackstar-RE-001.json'; link.click(); URL.revokeObjectURL(url);
    mensagem.textContent = 'Diário exportado com configuração, revisão física, comandos, eventos e amostras para reprodução.';
  });

  /** Cooperação da apresentação: orçamento 8 ms/quadro, mantém dívida temporal.
   * Pausa em erro explícito e conserva diagnóstico; não declara sucesso/repouso.
   * @contract f-081506ae1d0d1404
   */
  function quadro(timestamp: number): void {
    try {
      if (ensaio.estadoExecucao === 'executando') {
        const inicio = performance.now();
        executor.avancarAte(timestamp, numero('re-tempo'), avancar,
          { maxPassos: 240,
            /** Orçamento visual em ms; interrompe lote, preservando dívida e dt físico.  @contract f-8c86b54a123c80c0 */
            continuar: () => performance.now() - inicio < 8 });
      }
      const o = ensaio.observar();
      renderer.desenhar(o, historico, 10 ** numero('re-zoom'));
      if (timestamp - ultimaAtualizacaoMs >= 100) {
        atualizarPainel(o); renderer.desenharGraficos(historico); ultimaAtualizacaoMs = timestamp;
      }
    } catch (e) { ensaio.pausar(); mensagem.textContent = `Ensaio pausado por erro: ${e instanceof Error ? e.message : String(e)}`; }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
}
iniciarBancada();
