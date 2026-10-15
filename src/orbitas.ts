import './style.css';
import './orbitas.css';
import { criarEnsaioOrbitalInerte } from './cenarios/EnsaioOrbitalInerte';
import { CameraFisica2D } from './visualizacao/CameraFisica2D';
import { Vetor3 } from './physics/Vetor3';

const canvas = document.querySelector<HTMLCanvasElement>('#orbital-canvas')!;
const ctx = canvas.getContext('2d')!;
const tipo = document.querySelector<HTMLSelectElement>('#orbital-tipo')!;
const tempo = document.querySelector<HTMLSelectElement>('#orbital-tempo')!;
const modoCamera = document.querySelector<HTMLSelectElement>('#orbital-camera')!;
const zoom = document.querySelector<HTMLInputElement>('#orbital-zoom')!;
const play = document.querySelector<HTMLButtonElement>('#orbital-play')!;
const dados = document.querySelector<HTMLOutputElement>('#orbital-dados')!;
let ensaio = criarEnsaioOrbitalInerte();
let pontos: Vetor3[] = [ensaio.corpo.getEstadoFisico().posicaoM];
let rodando = false;
let ultimoTimestamp: number | undefined;
let acumuladorS = 0;
const DT_S = 1;

/** Recria ensaio circular/elíptico escolhido, reinicia trilha e acumulador visual e pausa execução; não reutiliza estado residual da missão anterior. @contract f-16848ec4b453ff12 @reviewed M12-DOC: implementação lida. */
function reiniciar(): void {
  ensaio = criarEnsaioOrbitalInerte(tipo.value === 'eliptica' ? 'eliptica' : 'circular');
  pontos = [ensaio.corpo.getEstadoFisico().posicaoM];
  rodando = false; ultimoTimestamp = undefined; acumuladorS = 0; play.textContent = 'Iniciar';
}
play.addEventListener('click', () => { rodando = !rodando; ultimoTimestamp = undefined; play.textContent = rodando ? 'Pausar' : 'Continuar'; });
document.querySelector('#orbital-reset')!.addEventListener('click', reiniciar);
tipo.addEventListener('change', reiniciar);
document.querySelector('#orbital-exportar')!.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ versao: 1, configuracao: ensaio.obterConfiguracao(), dtS: DT_S,
    passosExecutados: ensaio.mundo.tempoS / DT_S, leituraFinal: ensaio.ler(), pontos,
    reproducao: 'Recriar o ensaio inerte selecionado na mesma revisão/modelo e avançar os passos de 1 s; nenhum comando propulsivo.' }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `blackstar-orbita-${ensaio.tipo}.json`; a.click();
  URL.revokeObjectURL(url);
});

/** Consulta ensaio e projeta Terra, trajetória, corpo e radial em Canvas por câmera/zoom; atualiza indicadores orbitais e erros relativos. Conversões para km/pixels/graus não alteram estado físico. @contract f-caa69db0599506b2 @reviewed M12-DOC: implementação lida. */
function desenhar(): void {
  // Pixels lógicos acompanham o viewport: réguas e texto continuam legíveis
  // no celular, sem transformar coordenadas ou dimensões do corpo físico.
  const largura = Math.max(1, Math.round(canvas.clientWidth));
  const altura = Math.max(1, Math.round(canvas.clientHeight));
  if (canvas.width !== largura || canvas.height !== altura) { canvas.width = largura; canvas.height = altura; }
  const p = ensaio.corpo.getEstadoFisico().posicaoM;
  const m = ensaio.ler();
  const raio = ensaio.ambiente.referencial.raioM;
  const centro = modoCamera.value === 'veiculo' ? p : ensaio.ambiente.campo.centroM;
  const escalaBase = modoCamera.value === 'veiculo' ? 4000 : 20_000_000 / Math.min(canvas.width, canvas.height);
  const camera = new CameraFisica2D(centro, escalaBase / Number(zoom.value), canvas.width, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const terra = camera.projetar(ensaio.ambiente.campo.centroM);
  ctx.fillStyle = '#0c3048'; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(terra.x, terra.y, raio / camera.metrosPorPixel, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  const referencia = camera.projetar(ensaio.ambiente.campo.centroM.adicionar(new Vetor3(0, raio + 400_000, 0)));
  ctx.setLineDash([5, 7]); ctx.strokeStyle = '#1e3a5f';
  ctx.beginPath(); ctx.arc(terra.x, terra.y, Math.abs(referencia.y - terra.y), 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
  pontos.forEach((ponto, i) => { const s = camera.projetar(ponto); if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); }); ctx.stroke();
  const marcador = camera.projetar(p);
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(marcador.x, marcador.y, 5, 0, 2 * Math.PI); ctx.fill();
  const radial = ensaio.ambiente.referencial.radial(p);
  const seta = camera.projetar(p.adicionar(radial.multiplicar(camera.metrosPorPixel * 30)));
  ctx.strokeStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(marcador.x, marcador.y); ctx.lineTo(seta.x, seta.y); ctx.stroke();
  const barraPx = 120;
  ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(24, canvas.height - 30); ctx.lineTo(24 + barraPx, canvas.height - 30); ctx.stroke();
  ctx.font = '14px ui-monospace, monospace'; ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`${(barraPx * camera.metrosPorPixel / 1000).toFixed(1)} km`, 24, canvas.height - 40);
  ctx.fillText('XY · Terra estática · vácuo', 24, 28);
  const energiaErro = Math.abs(m.energiaEspecificaJPorKg / ensaio.inicial.energiaEspecificaJPorKg - 1);
  const momentoErro = Math.abs(m.momentoAngularEspecificoM2S / ensaio.inicial.momentoAngularEspecificoM2S - 1);
  dados.textContent = `t = ${ensaio.mundo.tempoS.toFixed(0)} s · ${m.estado} · altura ${(m.altitudeM / 1000).toFixed(3)} km · velocidade inercial ${m.velocidadeInercialMps.toFixed(2)} m/s\nPerigeu previsto ${(m.perigeuM / 1000).toFixed(3)} km · apogeu previsto ${((m.apogeuM ?? 0) / 1000).toFixed(3)} km · período previsto ${m.periodoS?.toFixed(3)} s\nEnergia específica ${m.energiaEspecificaJPorKg.toFixed(2)} J/kg · momento angular ${m.momentoAngularEspecificoM2S.toExponential(6)} m²/s\nVariação relativa de energia ${energiaErro.toExponential(3)} · momento angular ${momentoErro.toExponential(3)} · massa ${ensaio.corpo.massaKg.toFixed(1)} kg`;
}
/** Acumula delta real limitado a 0,25 s vezes escala, avança até 200 passos fixos por quadro e preserva restante no acumulador. Registra trilha a cada 5 s até 10 mil pontos, desenha e agenda próximo quadro; o corte de delta real pertence a esta UI orbital legada. @contract f-a8bbee59e2fde294 @reviewed M12-DOC: implementação lida. */
function executar(timestamp: number): void {
  if (rodando && ultimoTimestamp !== undefined && timestamp > ultimoTimestamp) {
    acumuladorS += Math.min((timestamp - ultimoTimestamp) / 1000, 0.25) * Number(tempo.value);
    let passos = 0;
    while (acumuladorS >= DT_S && passos < 200) {
      ensaio.mundo.avancar(DT_S); acumuladorS -= DT_S; passos++;
      if (ensaio.mundo.tempoS % 5 === 0) { pontos.push(ensaio.corpo.getEstadoFisico().posicaoM); if (pontos.length > 10000) pontos.shift(); }
    }
  }
  ultimoTimestamp = timestamp;
  desenhar(); window.requestAnimationFrame(executar);
}
window.requestAnimationFrame(executar);
