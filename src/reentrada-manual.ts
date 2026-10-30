import { EnsaioReentrada } from './cenarios/EnsaioReentrada';
import { RenderizadorReentrada } from './apresentacao/reentrada/RenderizadorReentrada';

/** Configura a reentrada horizontal pedida, em modo manual desde o início. */
const CONFIGURACAO_MANUAL = {
  altitudeM: 120_000,
  velocidadeMps: 7_700,
  anguloAtaqueRad: 0,
  trajetoriaRad: 0,
  taxaAtitudeLocalInicialRadps: 0,
  automatico: false,
  chaveamentoAutomatico: false,
} as const;

/** Obtém elementos obrigatórios e falha claramente diante de HTML incompatível. @contract f-307e1fe2eef51bbb @reviewed RE-001: IDs visuais e controles conferidos. */
const get = <T extends HTMLElement>(id: string): T => {
  const elemento = document.getElementById(id);
  if (!elemento) throw new Error(`Elemento ausente: ${id}`);
  return elemento as T;
};
const cena = get<HTMLCanvasElement>('manual-cena');
const graficos = get<HTMLCanvasElement>('manual-graficos');
const renderer = new RenderizadorReentrada(cena, graficos);
const dianteiro = get<HTMLInputElement>('manual-dianteiro');
const traseiro = get<HTMLInputElement>('manual-traseiro');
const play = get<HTMLButtonElement>('manual-play');
const passo = get<HTMLButtonElement>('manual-passo');
const escala = get<HTMLSelectElement>('manual-escala');
const mensagem = get<HTMLOutputElement>('manual-mensagem');
type Amostra = ReturnType<EnsaioReentrada['observar']>;

let ensaio = new EnsaioReentrada(CONFIGURACAO_MANUAL);
let historico: Amostra[] = [];
let executando = false;
let ultimoFrameMs: number | undefined;
let acumuladorS = 0;
const dtS = ensaio.passoS;
/** Formata telemetria SI somente na camada de apresentação. @contract f-f15a3c3490727458 @reviewed RE-001: unidades e precisão conferidas. */
const f = (valor: number, casas = 1) => valor.toLocaleString('pt-BR', {
  minimumFractionDigits: casas, maximumFractionDigits: casas,
});
/** Converte radianos do domínio para graus apresentados na interface. @contract f-a070e03b40740fb0 @reviewed RE-001: conversão ocorre apenas na fronteira visual. */
const graus = (rad: number) => rad * 180 / Math.PI;

/** Encaminha os dois alvos de flap pela porta operacional do ensaio. @contract f-90b18d36bedecb9e @reviewed RE-001: comandos passam pela API do cenário. */
function comandarFlaps(): void {
  const resultado = ensaio.receberComando({
    tipo: 'flaps',
    dianteiroRad: Number(dianteiro.value) * Math.PI / 180,
    traseiroRad: Number(traseiro.value) * Math.PI / 180,
  });
  mensagem.textContent = resultado.motivo;
  desenhar();
}

/** Atualiza a apresentação usando somente o snapshot físico observado. @contract f-cd568d351201f9ee @reviewed RE-001: renderizador consulta snapshots sem alterar o mundo. */
function desenhar(): void {
  const atual = ensaio.observar();
  renderer.desenhar(atual, historico.length ? historico : [atual], 1_000);
  get('manual-situacao').textContent = executando ? 'REENTRADA · SIMULAÇÃO EM EXECUÇÃO' : 'REENTRADA · CONTROLE MANUAL';
  get('manual-flaps').textContent = `Flaps solicitados: dianteiro ${f(Number(dianteiro.value), 0)}° · traseiro ${f(Number(traseiro.value), 0)}°`;
  get('manual-tempo').textContent = `t = ${f(atual.tempoS, 2)} s · ${executando ? 'executando' : 'pausada'}`;
  get('manual-altitude').textContent = `${f(atual.altitudeM, 0)} m`;
  get('manual-velocidade').textContent = `${f(atual.velocidadeMps, 1)} m/s`;
  get('manual-alpha').textContent = `${f(graus(atual.aerodinamica.anguloAtaqueRad), 2)}°`;
  get('manual-pressao').textContent = `${f(atual.aerodinamica.pressaoDinamicaPa, 2)} Pa`;
  get('manual-dianteiro-efetivo').textContent = `${f(graus(atual.flaps[0].deflexaoRad), 1)}°`;
  get('manual-traseiro-efetivo').textContent = `${f(graus(atual.flaps[1].deflexaoRad), 1)}°`;
  get('manual-integridade').textContent = `${f(atual.integridade * 100, 1)}%`;
  get('manual-estado').textContent = atual.execucao === 'executando' ? 'Executando' : atual.execucao === 'pausada' ? 'Pausado' : 'Preparado';
  get('manual-dianteiro-label').innerHTML = `${f(Number(dianteiro.value), 0)}° <small>solicitado</small>`;
  get('manual-traseiro-label').innerHTML = `${f(Number(traseiro.value), 0)}° <small>solicitado</small>`;
  play.textContent = executando ? 'Pausar' : 'Iniciar';
}

/** Avança a missão pelo mesmo passo físico do RE-001; relógio só escala a apresentação. @contract f-d0ef4a5043f85288 @reviewed RE-001: passo físico fixo e comando sem mutação cinemática direta. */
function avancar(): void {
  if (!executando) ensaio.iniciar();
  if (!ensaio.avancarPasso()) return;
  const atual = ensaio.observar();
  if (!historico.length || atual.tempoS - historico.at(-1)!.tempoS >= 1) historico.push(atual);
  if (historico.length > 600) historico.shift();
  if (atual.integridade <= 0) {
    executando = false;
    ensaio.pausar();
    mensagem.textContent = 'Integridade estrutural esgotada. Simulação pausada.';
  }
}

dianteiro.addEventListener('input', comandarFlaps);
traseiro.addEventListener('input', comandarFlaps);
play.addEventListener('click', () => {
  executando = !executando;
  if (executando) ensaio.iniciar(); else ensaio.pausar();
  if (!executando) acumuladorS = 0;
  desenhar();
});
passo.addEventListener('click', () => {
  if (executando) return;
  ensaio.iniciar();
  for (let i = 0; i < Math.round(1 / dtS); i++) avancar();
  ensaio.pausar();
  desenhar();
});
get<HTMLButtonElement>('manual-reiniciar').addEventListener('click', () => {
  ensaio = new EnsaioReentrada(CONFIGURACAO_MANUAL);
  historico = [];
  executando = false;
  acumuladorS = 0;
  ultimoFrameMs = undefined;
  dianteiro.value = '0';
  traseiro.value = '0';
  mensagem.textContent = 'Cenário reiniciado: 120 km, voo horizontal e controle manual.';
  desenhar();
});

/** Converte quadros em passos fixos e reproduzíveis da missão. @contract f-00815132d8fc272b @reviewed RE-001: tempo real limita-se à camada visual. */
function animar(timestamp: number): void {
  if (ultimoFrameMs === undefined) ultimoFrameMs = timestamp;
  const delta = Math.min(0.1, Math.max(0, (timestamp - ultimoFrameMs) / 1_000));
  ultimoFrameMs = timestamp;
  if (executando) {
    acumuladorS += delta * Number(escala.value);
    let passosQuadro = 0;
    while (acumuladorS >= dtS && passosQuadro < 240 && executando) {
      avancar();
      acumuladorS -= dtS;
      passosQuadro++;
    }
    desenhar();
  }
  requestAnimationFrame(animar);
}

historico = [ensaio.observar()];
desenhar();
requestAnimationFrame(animar);
