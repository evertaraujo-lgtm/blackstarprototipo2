import type { ObservacaoReentrada } from '../../cenarios/EnsaioReentrada';
import { CameraFisica2D } from '../../visualizacao/CameraFisica2D';
import { desenharOrbitadorRE001 } from './DesenhoOrbitadorRE001';

/** Renderer XY somente de snapshots, independente de controladores/mundo mutáveis. */
export class RenderizadorReentrada {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly grafico: CanvasRenderingContext2D;

  /** Recebe superfícies de desenho; nunca cria ou modifica um corpo físico.  @contract f-9bdbc3539c49fc5c */
  public constructor(private readonly canvas: HTMLCanvasElement, private readonly graficos: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!; this.grafico = graficos.getContext('2d')!;
  }

  /** Redimensiona pixels lógicos à tela; física e dimensões SI não são alteradas.  @contract f-06c59a50a7238277 */
  private dimensionar(canvas: HTMLCanvasElement): void {
    const w = Math.max(1, Math.round(canvas.clientWidth)), h = Math.max(1, Math.round(canvas.clientHeight));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  /** Câmera centrada no corpo, Terra curva e réguas graduadas globais em m.
   * Atitude XY usa rotate(-theta). Bank altera só projeção da geometria.
   * O símbolo tem ampliação mínima declarada; réguas mantêm escala física.
   * @contract f-c44fd749571b9cb8
   */
  public desenhar(o: ObservacaoReentrada, historico: readonly ObservacaoReentrada[], metrosPorPixel: number): void {
    this.dimensionar(this.canvas);
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const camera = new CameraFisica2D(o.estado.posicaoM, metrosPorPixel, w, h);
    ctx.fillStyle = '#050e20'; ctx.fillRect(0, 0, w, h);
    const terra = camera.projetar(o.centroTerraM);
    ctx.fillStyle = '#0d2b3d'; ctx.strokeStyle = '#267a9c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(terra.x, terra.y, o.raioTerraM / metrosPorPixel, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#214257'; ctx.lineWidth = 1; ctx.setLineDash([5, 8]);
    for (const altitude of [25_000, 60_000, 120_000]) {
      ctx.beginPath(); ctx.arc(terra.x, terra.y, (o.raioTerraM + altitude) / metrosPorPixel, 0, 2 * Math.PI); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = '#e1b459'; ctx.lineWidth = 1.5; ctx.beginPath();
    historico.forEach((amostra, i) => {
      const p = camera.projetar(amostra.estado.posicaoM);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }); ctx.stroke();
    this.desenharReguas(camera);
    const centro = camera.projetar(o.estado.posicaoM), pxM = Math.max(2.5, 1 / metrosPorPixel);
    ctx.save(); ctx.translate(centro.x, centro.y); ctx.rotate(-o.estado.orientacaoRad.z);
    desenharOrbitadorRE001(ctx, {
      pixelsPorMetro: pxM,
      rolagemRad: o.rolagem.atualRad,
      integridade: o.integridade,
      flaps: o.flaps,
    });
    ctx.restore();
    for (const flap of o.flaps) if (!flap.conectado) {
      const p = camera.projetar(flap.estado.posicaoM);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-flap.estado.orientacaoRad.z);
      ctx.fillStyle = '#f87171'; ctx.fillRect(-4, -2, 8, 4); ctx.restore();
    }
    const fluxo = o.estado.velocidadeMps;
    if (fluxo.magnitude > 1) {
      const direcao = fluxo.multiplicar(60 / fluxo.magnitude);
      ctx.strokeStyle = '#67e8f9'; ctx.beginPath(); ctx.moveTo(centro.x, centro.y);
      ctx.lineTo(centro.x + direcao.x, centro.y - direcao.y); ctx.stroke();
    }
    ctx.fillStyle = '#d0e4f3'; ctx.font = '12px ui-monospace, monospace';
    ctx.fillText('XY · câmera no orbitador', 14, 22);
    ctx.fillStyle = '#f6d28b';
    ctx.fillText(`φ virtual ${(o.rolagem.atualRad * 180 / Math.PI).toFixed(1)}° · ${o.aerodinamica.regime}`, 14, 42);
    ctx.fillStyle = '#9db4cd';
    ctx.fillText(`Símbolo ${Math.max(1, pxM * metrosPorPixel).toFixed(0)}× · ${metrosPorPixel.toFixed(1)} m/px`, 14, 62);
  }

  /** Réguas X/Y em metros globais consultados da câmera, sem arredondar estado.  @contract f-830ad3072d81596d */
  private desenharReguas(camera: CameraFisica2D): void {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const alvo = camera.metrosPorPixel * 100, base = 10 ** Math.floor(Math.log10(alvo));
    const passoM = [1, 2, 5, 10].map(v => v * base).find(v => v >= alvo) ?? 10 * base;
    const passoPx = passoM / camera.metrosPorPixel;
    ctx.font = '10px ui-monospace, monospace'; ctx.strokeStyle = '#617d9b'; ctx.fillStyle = '#b0c4da';
    ctx.beginPath(); ctx.moveTo(0, h - 23); ctx.lineTo(w, h - 23); ctx.moveTo(1, 75); ctx.lineTo(1, h - 23); ctx.stroke();
    for (let x = w / 2 % passoPx; x < w; x += passoPx) {
      const p = camera.desprojetar(x, h / 2);
      ctx.beginPath(); ctx.moveTo(x, h - 29); ctx.lineTo(x, h - 18); ctx.stroke();
      ctx.fillText(`${Math.round(p.x)} m`, Math.max(3, x - 25), h - 5);
    }
    for (let y = h / 2 % passoPx; y < h - 38; y += passoPx) {
      if (y < 85) continue;
      const p = camera.desprojetar(w / 2, y);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(7, y); ctx.stroke(); ctx.fillText(`${Math.round(p.y)} m`, 10, y - 4);
    }
  }

  /** Canais regionais consultados do snapshot, nunca calculados no renderer.
   * Retorna temperaturas °C na ordem superfície/estrutura/interior (bateria: um
   * nó). Ausência de rede consulta somente o canal concentrado legado.
   * @contract f-15a792e972db1713
   */
  private temperaturas(o: ObservacaoReentrada, grupo: 'corpo' | 'flap1' | 'flap2' | 'bateria'): readonly number[] {
    if (!o.termica) return [grupo === 'corpo' ? o.temperaturaC : grupo === 'bateria' ? o.temperaturaBateriaC : o.flaps[grupo === 'flap1' ? 0 : 1].temperaturaC];
    const rede = grupo === 'corpo' ? o.termica.corpo : grupo === 'bateria' ? o.termica.bateria : o.termica.flaps[grupo === 'flap1' ? 0 : 1];
    return rede.regioes.map(r => r.temperaturaC);
  }

  /** Gráficos de observação SI; redes optantes têm painéis separados por corpo,
   * flap e bateria. Cores identificam superfície, estrutura e interior. Não há
   * integração térmica, interpolação física nem limite artificial de temperatura.
   * @contract f-8485960587076615
   */
  public desenharGraficos(historico: readonly ObservacaoReentrada[]): void {
    const regional = !!historico.at(-1)?.termica;
    this.graficos.style.height = regional ? '1120px' : '700px';
    this.dimensionar(this.graficos);
    const ctx = this.grafico, w = this.graficos.width, h = this.graficos.height;
    ctx.fillStyle = '#071126'; ctx.fillRect(0, 0, w, h);
    const canais: { nome: string; unidade: string; ler: (o: ObservacaoReentrada) => readonly number[] }[] = [
      { nome: 'Altitude', unidade: 'm',
        /** Consulta altitude radial m do snapshot.  @contract f-a4e96facd78790d5 */
        ler: (o: ObservacaoReentrada) => [o.altitudeM] },
      { nome: 'Velocidade', unidade: 'm/s',
        /** Consulta velocidade inercial m/s do snapshot.  @contract f-e652f616f5e31ba6 */
        ler: (o: ObservacaoReentrada) => [o.velocidadeMps] },
      { nome: 'Pressão dinâmica', unidade: 'Pa',
        /** Consulta pressão Pa calculada no core.  @contract f-d0588f78abec3bc7 */
        ler: (o: ObservacaoReentrada) => [o.aerodinamica.pressaoDinamicaPa] },
      { nome: 'Fluxo indicador', unidade: 'W/m²',
        /** Consulta indicador SG W/m²; não infere temperatura.  @contract f-afbff7d4cef24d10 */
        ler: (o: ObservacaoReentrada) => [o.aerodinamica.fluxoTermicoIndicadorWm2] },
    ];
    for (const grupo of ['corpo', 'flap1', 'flap2', 'bateria'] as const) canais.push({
      nome: `${grupo} · ${regional && grupo !== 'bateria' ? 'superfície / estrutura / interior' : regional ? 'interna' : 'concentrado'}`, unidade: '°C',
      /** Consulta canais regionais ou legado, sem escrever estados térmicos.  @contract f-43e2920f305783b7 */
      ler: (o: ObservacaoReentrada) => this.temperaturas(o, grupo),
    });
    const inicio = historico[0]?.tempoS ?? 0, fim = Math.max(inicio + 1, historico.at(-1)?.tempoS ?? 1);
    const cores = ['#fb7185', '#67e8f9', '#fbbf24'];
    canais.forEach((canal, i) => {
      const top = i * h / canais.length, altura = h / canais.length - 50;
      const amostras = historico.map(canal.ler), valores = amostras.flat();
      const minimo = valores.reduce((m, v) => Math.min(m, v), 0), maximo = valores.reduce((m, v) => Math.max(m, v), minimo + 1), faixa = maximo - minimo;
      ctx.fillStyle = '#cbd5e1'; ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`${canal.nome} (${canal.unidade})`, 4, top + 14, w - 8);
      ctx.fillStyle = '#91a6be'; ctx.fillText(`${minimo.toPrecision(3)}–${maximo.toPrecision(4)} · ${inicio.toFixed(0)}–${fim.toFixed(0)} s`, 4, top + 29);
      if (regional && i >= 4 && i < 7) {
        for (const [j, nome] of ['sup', 'est', 'int/art'].entries()) {
          ctx.fillStyle = cores[j]; ctx.fillText(nome, 4 + 75 * j, top + 42);
        }
      }
      ctx.strokeStyle = '#1d3655'; ctx.beginPath(); ctx.moveTo(4, top + 45 + altura); ctx.lineTo(w - 4, top + 45 + altura); ctx.stroke();
      const numeroSeries = amostras.at(-1)?.length ?? 1;
      for (let serie = 0; serie < numeroSeries; serie++) {
        ctx.strokeStyle = cores[serie]; ctx.lineWidth = 1.5; ctx.beginPath();
        historico.forEach((o, j) => {
          const x = 4 + (w - 8) * (o.tempoS - inicio) / (fim - inicio);
          const y = top + 45 + altura * (1 - (amostras[j][serie] - minimo) / faixa);
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }); ctx.stroke();
      }
    });
  }
}
