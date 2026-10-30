import { EnsaioReentrada } from './cenarios/EnsaioReentrada';
import { RenderizadorReentrada } from './apresentacao/reentrada/RenderizadorReentrada';
import { CameraFisica2D } from './visualizacao/CameraFisica2D';

/** Configura a reentrada horizontal pedida, em modo manual desde o início. */
const CONFIGURACAO_MANUAL = {
  altitudeM: 120_000,
  velocidadeMps: 7_700,
  anguloAtaqueRad: 0,
  trajetoriaRad: 0,
  taxaAtitudeLocalInicialRadps: 0,
  automatico: false,
  chaveamentoAutomatico: false,
  propulsaoExperimental: true,
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
const throttle = get<HTMLInputElement>('manual-throttle');
const ignitar = get<HTMLButtonElement>('manual-ignitar');
const cortar = get<HTMLButtonElement>('manual-cortar');
const armarRcs = get<HTMLButtonElement>('manual-armar-rcs');
const rcsCima = get<HTMLButtonElement>('manual-rcs-cima');
const rcsBaixo = get<HTMLButtonElement>('manual-rcs-baixo');
const rcsParar = get<HTMLButtonElement>('manual-rcs-parar');
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

/** Encaminha comando operacional ao motor e reflete permissivos do cenário. @contract f-e0ff48824e38c342 @reviewed RE-002E: ignição e throttle passam pela API da missão. */
function comandarMotor(comando: 'throttle-propulsor' | 'ignicao-propulsor' | 'corte-propulsor', valor?: number): void {
  const resultado = ensaio.receberComando(comando === 'throttle-propulsor'
    ? { tipo: comando, throttle: (valor ?? 0) / 100 } : { tipo: comando });
  mensagem.textContent = resultado.motivo;
  desenhar();
}

/** Comanda um par RCS enquanto o botão estiver pressionado. @contract f-040c8edf523ca7cf @reviewed RE-002E: pulso é encaminhado pelo cenário ao controlador de jatos. */
function comandarRcs(comando: -1 | 0 | 1): void {
  const resultado = ensaio.receberComando({ tipo: 'rcs', comando });
  if (!resultado.aceito) mensagem.textContent = resultado.motivo;
  desenhar();
}

/** Desenha propulsor principal e jatos ativos a partir de poses físicas consultadas. @contract f-fd925c7913a9d99b @reviewed RE-002E: símbolo e pluma são apresentação; força vem do MundoFisico. */
function desenharPropulsores(atual: Amostra): void {
  const context = cena.getContext('2d')!;
  const escalaPx = Math.max(2.5, 1 / 1_000);
  const camera = new CameraFisica2D(atual.estado.posicaoM, 1_000, cena.width, cena.height);
  const centro = camera.projetar(atual.estado.posicaoM);
  context.save(); context.translate(centro.x, centro.y); context.rotate(-atual.estado.orientacaoRad.z);
  /** Desenha corpo e pluma com direção física consultada, sem alterar a missão. @contract f-1237af72c3751233 @reviewed RE-002E: geometria visual acompanha pose e empuxo dos objetos. */
  const desenharCorpo = (estado: Amostra['motor']['estado'], tipo: 'motor' | 'rcs', empuxoN: number, ignitado: boolean) => {
    const deslocamento = estado.posicaoM.subtrair(atual.estado.posicaoM);
    const localX = deslocamento.x * Math.cos(atual.estado.orientacaoRad.z) + deslocamento.y * Math.sin(atual.estado.orientacaoRad.z);
    const localY = -deslocamento.x * Math.sin(atual.estado.orientacaoRad.z) + deslocamento.y * Math.cos(atual.estado.orientacaoRad.z);
    context.save(); context.translate(localX * escalaPx, -localY * escalaPx);
    context.rotate(-(estado.orientacaoRad.z - atual.estado.orientacaoRad.z));
    context.fillStyle = tipo === 'motor' ? '#526b7b' : '#879da8';
    context.strokeStyle = '#e2edf0'; context.lineWidth = tipo === 'motor' ? 1.8 : 1.2;
    const comprimentoM = tipo === 'motor' ? 12 : 1.2, larguraM = tipo === 'motor' ? 4 : 0.7;
    const comprimentoPx = comprimentoM * escalaPx, larguraPx = larguraM * escalaPx;
    context.fillRect(-comprimentoPx / 2, -larguraPx / 2, comprimentoPx, larguraPx);
    context.strokeRect(-comprimentoPx / 2, -larguraPx / 2, comprimentoPx, larguraPx);
    if (ignitado && empuxoN > 0) {
      const plume = tipo === 'motor' ? 78 : 18;
      const gradiente = context.createLinearGradient(-comprimentoPx / 2, 0, -plume, 0);
      gradiente.addColorStop(0, 'rgba(216,247,255,.98)'); gradiente.addColorStop(.4, 'rgba(104,216,248,.82)'); gradiente.addColorStop(1, 'rgba(56,153,227,0)');
      context.fillStyle = gradiente; context.beginPath(); context.moveTo(-comprimentoPx / 2, -larguraPx / 2);
      context.lineTo(-plume, 0); context.lineTo(-comprimentoPx / 2, larguraPx / 2); context.closePath(); context.fill();
    }
    context.restore();
  };
  desenharCorpo(atual.motor.estado, 'motor', atual.motor.empuxoN, atual.motor.ignitado);
  for (const jato of atual.rcs.jatos) desenharCorpo(jato.estado, 'rcs', jato.empuxoN, jato.ignitado);
  context.restore();
}

/** Atualiza a apresentação usando somente o snapshot físico observado. @contract f-cd568d351201f9ee @reviewed RE-001: renderizador consulta snapshots sem alterar o mundo. */
function desenhar(): void {
  const atual = ensaio.observar();
  renderer.desenhar(atual, historico.length ? historico : [atual], 1_000);
  desenharPropulsores(atual);
  get('manual-situacao').textContent = executando ? 'REENTRADA · SIMULAÇÃO EM EXECUÇÃO' : 'REENTRADA · CONTROLE MANUAL';
  get('manual-flaps').textContent = `Flaps solicitados: dianteiro ${f(Number(dianteiro.value), 0)}° · traseiro ${f(Number(traseiro.value), 0)}°`;
  get('manual-tempo').textContent = `t = ${f(atual.tempoS, 2)} s · ${executando ? 'executando' : 'pausada'}`;
  get('manual-altitude').textContent = `${f(atual.altitudeM, 0)} m`;
  get('manual-velocidade').textContent = `${f(atual.velocidadeMps, 1)} m/s`;
  get('manual-alpha').textContent = `${f(graus(atual.aerodinamica.anguloAtaqueRad), 2)}°`;
  get('manual-pressao').textContent = `${f(atual.aerodinamica.pressaoDinamicaPa, 2)} Pa`;
  get('manual-attitude').textContent = `${f(graus(atual.atitudeLocalRad), 2)}°`;
  get('manual-omega').textContent = `${f(graus(atual.estado.velocidadeAngularRadps.z), 2)}°/s`;
  get('manual-empuxo').textContent = `${f(atual.motor.empuxoN / 1e6, 2)} MN`;
  get('manual-propelente').textContent = `${f(atual.motor.metanoKg, 0)} / ${f(atual.motor.oxidanteKg, 0)} kg`;
  get('manual-rcs-estado').textContent = !atual.rcs.armado ? 'Desarmado' : atual.rcs.comando === 0 ? 'Armado · neutro' : atual.rcs.comando < 0 ? 'Pulso · nariz para cima' : 'Pulso · nariz para baixo';
  get('manual-rcs-propelente').textContent = `${f(atual.rcs.nitrogenioKg, 1)} kg`;
  get('manual-dianteiro-efetivo').textContent = `${f(graus(atual.flaps[0].deflexaoRad), 1)}°`;
  get('manual-traseiro-efetivo').textContent = `${f(graus(atual.flaps[1].deflexaoRad), 1)}°`;
  get('manual-integridade').textContent = `${f(atual.integridade * 100, 1)}%`;
  get('manual-estado').textContent = atual.execucao === 'executando' ? 'Executando' : atual.execucao === 'pausada' ? 'Pausado' : 'Preparado';
  get('manual-dianteiro-label').innerHTML = `${f(Number(dianteiro.value), 0)}° <small>solicitado</small>`;
  get('manual-traseiro-label').innerHTML = `${f(Number(traseiro.value), 0)}° <small>solicitado</small>`;
  get('manual-throttle-label').innerHTML = `${f(Number(throttle.value), 0)}% <small>solicitado</small>`;
  ignitar.disabled = atual.motor.ignitado;
  cortar.disabled = !atual.motor.ignitado;
  armarRcs.disabled = atual.rcs.armado;
  armarRcs.textContent = atual.rcs.armado ? 'RCS armado' : 'Armar RCS';
  rcsCima.disabled = rcsBaixo.disabled = rcsParar.disabled = !atual.rcs.armado;
  rcsParar.disabled = !atual.rcs.armado || atual.rcs.comando === 0;
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
throttle.addEventListener('input', () => comandarMotor('throttle-propulsor', Number(throttle.value)));
ignitar.addEventListener('click', () => comandarMotor('ignicao-propulsor'));
cortar.addEventListener('click', () => {
  throttle.value = '0';
  comandarMotor('corte-propulsor');
});
armarRcs.addEventListener('click', () => {
  const resultado = ensaio.receberComando({ tipo: 'armar-rcs' });
  mensagem.textContent = resultado.aceito ? 'RCS armado. Pressione e mantenha um comando de rotação.' : resultado.motivo;
  desenhar();
});
for (const [botao, comando] of [[rcsCima, -1], [rcsBaixo, 1]] as const) {
  botao.addEventListener('pointerdown', event => {
    event.preventDefault(); botao.setPointerCapture(event.pointerId); comandarRcs(comando);
  });
  botao.addEventListener('pointerup', () => comandarRcs(0));
  botao.addEventListener('pointercancel', () => comandarRcs(0));
  botao.addEventListener('lostpointercapture', () => comandarRcs(0));
}
rcsParar.addEventListener('click', () => comandarRcs(0));
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
  throttle.value = '0';
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
