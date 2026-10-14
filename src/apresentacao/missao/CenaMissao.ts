import { criarMissaoBss006Registrada } from '../../missoes/ReplayMissaoBss006';
import type { ComandoBss006, ObservacaoBss006 } from '../../missoes/TiposMissaoBss006';
import { ExecutorPassoFixo } from '../../simulacao/ExecutorPassoFixo';
import { conectarEntradaMissao } from './EntradaMissao';
import { atualizarHudMissao } from './HudMissao';
import { RenderizadorMissao } from './RenderizadorMissao';

/** Adaptador de navegador; física e missão continuam executáveis sem esta classe. */
export class CenaMissao {
  private missao = criarMissaoBss006Registrada();
  private observacao: ObservacaoBss006 = this.missao.observar();
  private readonly executor = new ExecutorPassoFixo(this.missao.passoS, 0.05, true);
  private readonly renderer: RenderizadorMissao;
  private quadro = 0;
  private sujo = true;
  private hudSujo = true;
  private urgente = true;
  private ultimaPinturaMs = -Infinity;
  private ultimoHudMs = -Infinity;
  private ultimaMedicaoMs?: number;
  private passoMedicao = 0;
  private ritmo = 0;
  public constructor(private readonly raiz: HTMLElement) {
    this.renderer = new RenderizadorMissao(raiz.querySelector<HTMLCanvasElement>('#cena-missao')!);
    conectarEntradaMissao(raiz, {
      comando: c => this.comandar(c), sistema: sistema => this.comandar({ tipo: 'sistema', sistema, ligar: !this.observacao.sistemas[sistema] }),
      iniciar: () => { this.missao.iniciar(); this.executor.suspenderReferenciaRelogio(); this.ultimaMedicaoMs = undefined; this.marcarAtualizacao(); },
      pausar: () => { this.missao.pausar(); this.executor.suspenderReferenciaRelogio(); this.marcarAtualizacao(); },
      reiniciar: () => this.reiniciar(), exportar: () => this.exportar(),
    });
    raiz.querySelector<HTMLInputElement>('#zoom')!.addEventListener('input', () => this.marcarAtualizacao());
    raiz.querySelector<HTMLSelectElement>('#variante-missao')!.addEventListener('change', () => this.reiniciar());
    window.addEventListener('resize', () => this.marcarAtualizacao());
    window.addEventListener('pagehide', () => cancelAnimationFrame(this.quadro), { once: true });
    this.quadro = requestAnimationFrame(t => this.animar(t));
  }
  private marcarAtualizacao() { this.sujo = true; this.hudSujo = true; this.urgente = true; }
  private mensagem(texto: string) { this.raiz.querySelector<HTMLElement>('#retorno-comando')!.textContent = texto; }
  private comandar(c: ComandoBss006) {
    try { const r = this.missao.receberComando(c); this.mensagem(r.aceito ? 'Comando aceito.' : r.motivo); }
    catch (error) { this.mensagem(error instanceof Error ? error.message : String(error)); }
    this.observacao = this.missao.observar(); this.marcarAtualizacao();
  }
  private reiniciar() {
    try {
      const vento = Number(this.raiz.querySelector<HTMLInputElement>('#vento-inicial')!.value);
      const alvo = Number(this.raiz.querySelector<HTMLInputElement>('#alvo-pouso')!.value);
      const agua = this.raiz.querySelector<HTMLSelectElement>('#variante-missao')!.value === 'agua';
      const nova = criarMissaoBss006Registrada({ ventoTangencialMps: vento, alvoPousoLocalM: alvo,
        ...(agua ? { ensaioAquatico: { inclinacaoInicialRad: Number(this.raiz.querySelector<HTMLInputElement>('#inclinacao-ensaio')!.value) * Math.PI / 180,
          velocidadeInicialMps: Number(this.raiz.querySelector<HTMLInputElement>('#velocidade-ensaio')!.value), altitudeInicialM: 5 } } : {}) });
      this.missao = nova; this.observacao = nova.observar(); this.executor.reiniciar(); this.ultimaMedicaoMs = undefined; this.marcarAtualizacao();
      this.mensagem(agua ? 'Ensaio físico sobre oceano preparado. Inicie para observar entrada e estabilidade passiva.' : 'Nova missão preparada. Sistemas e ignição desligados.');
    } catch (error) { this.mensagem(error instanceof Error ? error.message : String(error)); }
  }
  private exportar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.missao.exportar(), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${this.missao.id}.json`; a.click(); URL.revokeObjectURL(url);
  }
  private animar(instanteMs: number) {
    try {
      if (this.missao.estadoExecucao === 'executando') {
        const escala = Number(this.raiz.querySelector<HTMLSelectElement>('#escala-tempo')!.value);
        const prazoMs = performance.now() + 12;
        if (this.executor.avancarAte(instanteMs, escala, () => this.missao.avancarPasso(),
          { maxPassos: 240, continuar: () => performance.now() < prazoMs }) > 0) { this.sujo = true; this.hudSujo = true; }
      }
      if (this.ultimaMedicaoMs === undefined) { this.ultimaMedicaoMs = instanteMs; this.passoMedicao = this.missao.passosExecutados; }
      else if (instanteMs - this.ultimaMedicaoMs >= 1000) {
        this.ritmo = (this.missao.passosExecutados - this.passoMedicao) * this.missao.passoS / ((instanteMs - this.ultimaMedicaoMs) / 1000);
        this.ultimaMedicaoMs = instanteMs; this.passoMedicao = this.missao.passosExecutados;
      }
      const desenhar = this.sujo && (this.urgente || instanteMs - this.ultimaPinturaMs >= 1000 / 30);
      const hud = this.hudSujo && (this.urgente || instanteMs - this.ultimoHudMs >= 100);
      if (desenhar || hud) this.observacao = this.missao.observar();
      if (desenhar) {
        const camera = this.renderer.desenhar(this.observacao, Number(this.raiz.querySelector<HTMLInputElement>('#zoom')!.value));
        const canvas = this.raiz.querySelector<HTMLCanvasElement>('#cena-missao')!;
        // Observação para acessibilidade e testes de integração; não é uma porta de escrita física.
        canvas.dataset.altitude = String(this.observacao.altitudeM); canvas.dataset.passo = String(this.observacao.passo);
        canvas.dataset.cameraX = String(camera.centroM.x); canvas.dataset.cameraY = String(camera.centroM.y);
        canvas.dataset.estadoAquatico = this.observacao.aquatico?.estado ?? 'sem-agua';
        canvas.dataset.volumeSubmerso = String(this.observacao.aquatico?.volumeSubmersoM3 ?? 0);
        canvas.dataset.integridade = String(this.observacao.integridadeMinima);
        this.sujo = false;
        // Mantém a fase do relógio de desenho: evita cair para 20 FPS por arredondamento de RAF a 60 Hz.
        this.ultimaPinturaMs = this.urgente ? instanteMs
          : this.ultimaPinturaMs + Math.floor((instanteMs - this.ultimaPinturaMs) / (1000 / 30)) * (1000 / 30);
      }
      if (hud) {
        atualizarHudMissao(this.raiz, this.observacao, this.missao.obterEventos());
        const atraso = this.executor.tempoPendenteS;
        const status = this.raiz.querySelector<HTMLElement>('#desempenho-missao')!;
        const texto = this.missao.estadoExecucao === 'executando'
          ? `Ritmo observado ${this.ritmo.toFixed(2)}× · ${atraso > 0.1 ? `atraso simulado ${atraso.toFixed(2)} s` : 'acompanhando o relógio'} · passos preservados`
          : `Simulação ${this.missao.estadoExecucao === 'pausada' ? 'pausada' : 'preparada'}${atraso > 0.1 ? ` · ${atraso.toFixed(2)} s pendentes ao continuar` : ''}`;
        if (status.textContent !== texto) status.textContent = texto;
        status.dataset.atrasoS = String(atraso); status.dataset.ritmo = String(this.ritmo);
        this.hudSujo = false; this.ultimoHudMs = instanteMs;
      }
      if (desenhar || hud) this.urgente = false;
    } catch (error) { this.missao.pausar(); this.executor.suspenderReferenciaRelogio(); this.marcarAtualizacao(); this.mensagem(`Execução interrompida: ${error instanceof Error ? error.message : String(error)}`); console.error(error); }
    this.quadro = requestAnimationFrame(t => this.animar(t));
  }
}
