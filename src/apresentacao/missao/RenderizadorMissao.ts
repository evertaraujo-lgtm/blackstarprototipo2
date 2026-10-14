import { Vetor3 } from '../../physics/Vetor3';
import type { ObservacaoBss006, CorpoObservado } from '../../missoes/TiposMissaoBss006';
import { terminalEletricoDoEstadoM } from '../../visualizacao/ConexoesEletricas';
import { CameraMissao } from './CameraMissao';
import { ReferencialEsferico } from '../../physics/ambiente/ReferencialFisico';
import { GeografiaCosteira } from '../../physics/ambiente/GeografiaCosteira';

const COR = (c: CorpoObservado): string => c.integridade <= 0 ? '#57464d' :
  c.id.includes('grid-fin') ? '#57cfbb' : c.id.includes('tanque') ? '#d8e5ec' :
  c.id.includes('bateria') ? '#ffd56b' : c.id.includes('painel') ? '#408dba' :
  c.id.includes('perna') || c.id.includes('sapata') ? '#a0b7c4' : c.id.includes('propulsor') ? '#899eaf' : '#e7f2f4';
/** Somente snapshots: a apresentação não recebe mundo nem objetos mutáveis. */
export class RenderizadorMissao {
  public constructor(private readonly canvas: HTMLCanvasElement) {}
  public desenhar(o: ObservacaoBss006, metrosPorPixel: number): CameraMissao {
    const largura = Math.max(1, this.canvas.clientWidth), altura = Math.max(1, this.canvas.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(largura * dpr) || this.canvas.height !== Math.round(altura * dpr)) {
      this.canvas.width = Math.round(largura * dpr); this.canvas.height = Math.round(altura * dpr);
    }
    const ctx = this.canvas.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const camera = new CameraMissao(o, largura, altura, metrosPorPixel);
    const ceu = ctx.createLinearGradient(0, 0, 0, altura); ceu.addColorStop(0, '#0c233b'); ceu.addColorStop(1, '#508c9c');
    ctx.fillStyle = ceu; ctx.fillRect(0, 0, largura, altura);
    this.terreno(ctx, camera, o); this.infraestrutura(ctx, camera, o);
    // Vínculos visíveis entre as peças, sem alteração de geometria física.
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#9aacb4';
    const casco = o.corpos.find(c => c.id === 'bss-006')!;
    for (const f of o.fixadores.filter(f => f.estado === 'integro')) {
      const modulo = o.corpos.find(c => f.id === `fixador-decolagem-${c.id}`); if (!modulo) continue;
      const a = camera.projetar(casco.estado.posicaoM), b = camera.projetar(modulo.estado.posicaoM);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const c of o.corpos) this.corpo(ctx, camera, c, o);
    // Fontes expostas mantêm cabos visíveis também com alimentação desligada.
    for (const [i, ligacao] of o.conexoesEletricas.entries()) {
      const fonte = o.corpos.find(c => c.id === ligacao.fonteId), destino = o.corpos.find(c => c.id === ligacao.destinoId);
      if (!fonte || !destino) continue;
      const a = camera.projetar(terminalEletricoDoEstadoM(fonte.estado, fonte.dimensoesM));
      const b = camera.projetar(terminalEletricoDoEstadoM(destino.estado, destino.dimensoesM));
      const rotaX = Math.min(a.x, b.x) - 8 - i * 3;
      ctx.setLineDash(ligacao.estado === 'rompida' || ligacao.estado === 'desconectada' ? [3, 4] : []);
      ctx.strokeStyle = ligacao.estado === 'rompida' ? '#ec775c' : ligacao.estado === 'energizada' ? '#e4c877' : '#7d9cab';
      ctx.lineWidth = 1.25; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(rotaX, a.y); ctx.lineTo(rotaX, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (o.cenario.costa) { this.agua(ctx, camera, o); ctx.fillStyle = '#9ce6ec'; ctx.font = '11px system-ui'; ctx.fillText('OCEANO FÍSICO · 1025 kg/m³', 24, 81); }
    this.reguas(ctx, camera, o);
    ctx.fillStyle = '#071522bd'; ctx.fillRect(14, 14, Math.min(290, largura - 28), 48);
    ctx.fillStyle = '#eff7f9'; ctx.font = '12px ui-monospace, monospace';
    ctx.fillText('BSS-006 · câmera acompanha o veículo', 24, 34);
    ctx.fillStyle = '#b9d7dd'; ctx.fillText(`t ${o.tempoS.toFixed(2)} s · ${o.fase.toUpperCase()}`, 24, 51);
    return camera;
  }
  private terreno(ctx: CanvasRenderingContext2D, camera: CameraMissao, o: ObservacaoBss006) {
    const c = o.cenario.centroTerraM, centro = new Vetor3(c.x, c.y, c.z), R = o.cenario.raioTerraM;
    const ref = new ReferencialEsferico(centro, R), costa = o.cenario.costa ? new GeografiaCosteira(ref, o.cenario.costa) : undefined;
    ctx.beginPath();
    for (let px = -10; px <= camera.larguraPx + 10; px += 10) {
      const eixo = camera.pontoNaTela(px, camera.alturaPx / 2).subtrair(centro);
      const x = eixo.produtoEscalar(camera.tangencial), y = Math.sqrt(Math.max(0, R * R - x * x));
      const livre = centro.adicionar(camera.tangencial.multiplicar(x)).adicionar(camera.radial.multiplicar(y));
      const p = camera.projetar(costa ? ref.posicaoPorArcoM(ref.posicaoHorizontalM(livre), costa.alturaSoloM(ref.posicaoHorizontalM(livre))) : livre);
      if (px === -10) ctx.moveTo(px, p.y); else ctx.lineTo(px, p.y);
    }
    ctx.lineTo(camera.larguraPx + 10, camera.alturaPx + 10); ctx.lineTo(-10, camera.alturaPx + 10); ctx.closePath();
    ctx.fillStyle = '#34433c'; ctx.fill(); ctx.strokeStyle = '#7d9c79'; ctx.lineWidth = 2; ctx.stroke();
    if (costa) { this.agua(ctx, camera, o, true); return; }
    // Costa no cenário distante: apresentação, sem superfície de água simulada.
    const base = camera.projetar(o.cenario.ancoraM);
    if (base.y < camera.alturaPx && base.y > -10) {
      ctx.fillStyle = '#316a76'; ctx.fillRect(Math.max(0, base.x + 160), base.y + 4, camera.larguraPx, 28);
      ctx.strokeStyle = '#73a8ae'; ctx.beginPath(); ctx.moveTo(base.x + 160, base.y + 7); ctx.lineTo(camera.larguraPx, base.y + 7); ctx.stroke();
    }
  }
  /** Mesmo nível radial e perfil de fundo do domínio; máscara visual não participa da física. */
  private agua(ctx: CanvasRenderingContext2D, camera: CameraMissao, o: ObservacaoBss006, fundo = false) {
    const c = o.cenario.centroTerraM, centro = new Vetor3(c.x, c.y, c.z), R = o.cenario.raioTerraM;
    const ref = new ReferencialEsferico(centro, R), costa = new GeografiaCosteira(ref, o.cenario.costa!);
    const topo: { x: number; y: number; molhado: boolean }[] = [], base: { x: number; y: number }[] = [];
    for (let px = -10; px <= camera.larguraPx + 10; px += 10) {
      const eixo = camera.pontoNaTela(px, camera.alturaPx / 2).subtrair(centro), x = eixo.produtoEscalar(camera.tangencial);
      const p = centro.adicionar(camera.tangencial.multiplicar(x)).adicionar(camera.radial.multiplicar(Math.sqrt(Math.max(0, R * R - x * x))));
      const s = ref.posicaoHorizontalM(p), h = costa.alturaSoloM(s);
      topo.push({ ...camera.projetar(ref.posicaoPorArcoM(s, costa.configuracao.nivelMarM)), molhado: h < costa.configuracao.nivelMarM });
      base.push(camera.projetar(ref.posicaoPorArcoM(s, h)));
    }
    ctx.beginPath(); topo.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    for (const p of base.reverse()) ctx.lineTo(p.x, p.y); ctx.closePath();
    ctx.fillStyle = fundo ? '#184d70' : '#46b6ce45'; ctx.fill();
    ctx.beginPath(); let anteriorMolhado = false;
    topo.forEach(p => { if (p.molhado) { if (anteriorMolhado) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } anteriorMolhado = p.molhado; });
    ctx.strokeStyle = '#8cd5de'; ctx.lineWidth = 2; ctx.stroke();
  }
  private infraestrutura(ctx: CanvasRenderingContext2D, camera: CameraMissao, o: ObservacaoBss006) {
    const ancora = o.cenario.ancoraM, centro = o.cenario.centroTerraM;
    const a = new Vetor3(ancora.x, ancora.y, ancora.z), r = a.subtrair(new Vetor3(centro.x, centro.y, centro.z));
    const er = r.multiplicar(1 / r.magnitude), et = new Vetor3(er.y, -er.x, 0);
    const ponto = (x: number, y: number) => camera.projetar(a.adicionar(et.multiplicar(x)).adicionar(er.multiplicar(y)));
    // Demarcação da própria superfície existente: não há uma laje elevada fictícia.
    const esq = ponto(-7, 0), dir = ponto(7, 0);
    ctx.strokeStyle = '#d2d2bf'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(esq.x, esq.y); ctx.lineTo(dir.x, dir.y); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#627888';
    for (const x of [-13, -10]) { const b = ponto(x, 0), t = ponto(x, 24); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke(); }
    for (let y = 0; y < 24; y += 3) {
      const p = ponto(-13, y), q = ponto(-10, y + 3), p2 = ponto(-10, y), q2 = ponto(-13, y + 3);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.moveTo(p2.x, p2.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
    }
    const topo = ponto(-10, 22), braco = ponto(-5, 22); ctx.beginPath(); ctx.moveTo(topo.x, topo.y); ctx.lineTo(braco.x, braco.y); ctx.stroke();
    const label = ponto(-7, -2); ctx.font = '11px system-ui'; ctx.fillStyle = '#becbc2'; ctx.fillText('PLATAFORMA COSTEIRA', label.x, label.y);
    const target = ponto(o.alvoPousoLocalM, 0); ctx.strokeStyle = '#4ff4c0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(target.x, target.y - 9); ctx.lineTo(target.x - 5, target.y - 16); ctx.lineTo(target.x + 5, target.y - 16); ctx.closePath(); ctx.stroke();
  }
  private corpo(ctx: CanvasRenderingContext2D, camera: CameraMissao, c: CorpoObservado, o: ObservacaoBss006) {
    const p = camera.projetar(c.estado.posicaoM), w = c.dimensoesM.x / camera.metrosPorPixel, h = c.dimensoesM.y / camera.metrosPorPixel;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(camera.anguloCanvas(c.estado.orientacaoRad.z));
    ctx.fillStyle = COR(c); ctx.strokeStyle = c.integridade < 1 ? '#ee8065' : '#1c3648'; ctx.lineWidth = 1;
    ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h);
    if (c.id.includes('painel')) { ctx.strokeStyle = '#9cd7e6'; for (let x = -w / 2; x < w / 2; x += Math.max(1, w / 5)) { ctx.beginPath(); ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2); ctx.stroke(); } }
    if (c.deflexaoRad !== undefined) {
      // Pás internas consultam deflexão real; carcaça mantém geometria do core.
      ctx.rotate(-c.deflexaoRad); ctx.strokeStyle = '#183e42'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2); ctx.stroke();
    }
    if (c.id.includes('propulsor') && o.empuxoN > 0 && c.integridade > 0) {
      ctx.rotate(-o.gimbalRad);
      const comprimento = (1 + 4 * o.empuxoN / 120000) / camera.metrosPorPixel;
      // Motor tem eixo local +X; exaustão em -X, inclusive após girar/separar.
      ctx.fillStyle = '#ffb550'; ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.32);
      ctx.lineTo(-w / 2 - comprimento, 0); ctx.lineTo(-w / 2, h * 0.32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.15);
      ctx.lineTo(-w / 2 - comprimento * 0.65, 0); ctx.lineTo(-w / 2, h * 0.15); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  private reguas(ctx: CanvasRenderingContext2D, camera: CameraMissao, o: ObservacaoBss006) {
    const intervalo = Math.pow(10, Math.floor(Math.log10(camera.metrosPorPixel * 85)));
    const passo = intervalo * (camera.metrosPorPixel * 85 / intervalo > 5 ? 5 : camera.metrosPorPixel * 85 / intervalo > 2 ? 2 : 1);
    ctx.font = '11px ui-monospace, monospace'; ctx.strokeStyle = '#d1e5e663'; ctx.fillStyle = '#e1eff0'; ctx.lineWidth = 1;
    // Altitude radial exata dos pontos na régua; graduação local perto do veículo.
    const hmin = o.altitudeM + 5 - camera.alturaPx / 2 * camera.metrosPorPixel;
    const hmax = o.altitudeM + 5 + camera.alturaPx / 2 * camera.metrosPorPixel;
    for (let h = Math.ceil(hmin / passo) * passo; h <= hmax; h += passo) {
      const y = camera.alturaPx / 2 - (h - o.altitudeM - 5) / camera.metrosPorPixel;
      ctx.beginPath(); ctx.moveTo(camera.larguraPx - 12, y); ctx.lineTo(camera.larguraPx, y); ctx.stroke();
      ctx.fillText(`${h.toFixed(passo < 1 ? 1 : 0)} m`, camera.larguraPx - 64, y - 4);
    }
    for (let x = Math.ceil((o.deslocamentoHorizontalM - camera.larguraPx / 2 * camera.metrosPorPixel) / passo) * passo;
      x <= o.deslocamentoHorizontalM + camera.larguraPx / 2 * camera.metrosPorPixel; x += passo) {
      const px = camera.larguraPx / 2 + (x - o.deslocamentoHorizontalM) / camera.metrosPorPixel;
      ctx.beginPath(); ctx.moveTo(px, camera.alturaPx - 10); ctx.lineTo(px, camera.alturaPx); ctx.stroke();
      ctx.fillText(`${x.toFixed(passo < 1 ? 1 : 0)} m`, px + 3, camera.alturaPx - 14);
    }
  }
}
