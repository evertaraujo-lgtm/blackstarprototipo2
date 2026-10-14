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
  private readonly executor = new ExecutorPassoFixo(this.missao.passoS);
  private readonly renderer: RenderizadorMissao;
  private quadro = 0;
  private sujo = true;
  public constructor(private readonly raiz: HTMLElement) {
    this.renderer = new RenderizadorMissao(raiz.querySelector<HTMLCanvasElement>('#cena-missao')!);
    conectarEntradaMissao(raiz, {
      comando: c => this.comandar(c), sistema: sistema => this.comandar({ tipo: 'sistema', sistema, ligar: !this.observacao.sistemas[sistema] }),
      iniciar: () => { this.missao.iniciar(); this.executor.reiniciar(); this.sujo = true; },
      pausar: () => { this.missao.pausar(); this.executor.reiniciar(); this.sujo = true; },
      reiniciar: () => this.reiniciar(), exportar: () => this.exportar(),
    });
    raiz.querySelector<HTMLInputElement>('#zoom')!.addEventListener('input', () => { this.sujo = true; });
    raiz.querySelector<HTMLSelectElement>('#variante-missao')!.addEventListener('change', () => this.reiniciar());
    window.addEventListener('resize', () => { this.sujo = true; });
    window.addEventListener('pagehide', () => cancelAnimationFrame(this.quadro), { once: true });
    this.quadro = requestAnimationFrame(t => this.animar(t));
  }
  private mensagem(texto: string) { this.raiz.querySelector<HTMLElement>('#retorno-comando')!.textContent = texto; }
  private comandar(c: ComandoBss006) {
    try { const r = this.missao.receberComando(c); this.mensagem(r.aceito ? 'Comando aceito.' : r.motivo); }
    catch (error) { this.mensagem(error instanceof Error ? error.message : String(error)); }
    this.observacao = this.missao.observar(); this.sujo = true;
  }
  private reiniciar() {
    try {
      const vento = Number(this.raiz.querySelector<HTMLInputElement>('#vento-inicial')!.value);
      const alvo = Number(this.raiz.querySelector<HTMLInputElement>('#alvo-pouso')!.value);
      const agua = this.raiz.querySelector<HTMLSelectElement>('#variante-missao')!.value === 'agua';
      const nova = criarMissaoBss006Registrada({ ventoTangencialMps: vento, alvoPousoLocalM: alvo,
        ...(agua ? { ensaioAquatico: { inclinacaoInicialRad: Number(this.raiz.querySelector<HTMLInputElement>('#inclinacao-ensaio')!.value) * Math.PI / 180,
          velocidadeInicialMps: Number(this.raiz.querySelector<HTMLInputElement>('#velocidade-ensaio')!.value), altitudeInicialM: 5 } } : {}) });
      this.missao = nova; this.observacao = nova.observar(); this.executor.reiniciar(); this.sujo = true;
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
        if (this.executor.avancarAte(instanteMs, escala, () => this.missao.avancarPasso()) > 0) this.sujo = true;
      }
      if (this.sujo) {
        this.observacao = this.missao.observar();
        const camera = this.renderer.desenhar(this.observacao, Number(this.raiz.querySelector<HTMLInputElement>('#zoom')!.value));
        const canvas = this.raiz.querySelector<HTMLCanvasElement>('#cena-missao')!;
        // Observação para acessibilidade e testes de integração; não é uma porta de escrita física.
        canvas.dataset.altitude = String(this.observacao.altitudeM); canvas.dataset.passo = String(this.observacao.passo);
        canvas.dataset.cameraX = String(camera.centroM.x); canvas.dataset.cameraY = String(camera.centroM.y);
        canvas.dataset.estadoAquatico = this.observacao.aquatico?.estado ?? 'sem-agua';
        canvas.dataset.volumeSubmerso = String(this.observacao.aquatico?.volumeSubmersoM3 ?? 0);
        canvas.dataset.integridade = String(this.observacao.integridadeMinima);
        atualizarHudMissao(this.raiz, this.observacao, this.missao.obterEventos()); this.sujo = false;
      }
    } catch (error) { this.missao.pausar(); this.executor.reiniciar(); this.sujo = true; this.mensagem(`Execução interrompida: ${error instanceof Error ? error.message : String(error)}`); console.error(error); }
    this.quadro = requestAnimationFrame(t => this.animar(t));
  }
}
