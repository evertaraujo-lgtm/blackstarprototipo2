import { criarEnsaioPropulsivoOrbitadorRe002 } from './cenarios/EnsaioPropulsivoOrbitadorRe002';
import { desenharOrbitadorRE001 } from './apresentacao/reentrada/DesenhoOrbitadorRE001';

const get = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error('Elemento ausente: '+id);
  return el as T;
};
const canvas = get<HTMLCanvasElement>('manual-cena');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas indisponível');
const habilitar = get<HTMLButtonElement>('manual-habilitar');
const ignitar = get<HTMLButtonElement>('manual-ignitar');
const cortar = get<HTMLButtonElement>('manual-cortar');
const throttle = get<HTMLInputElement>('manual-throttle');
const percentual = get<HTMLOutputElement>('manual-percentual');
const play = get<HTMLButtonElement>('manual-play');
const passo = get<HTMLButtonElement>('manual-passo');
const reset = get<HTMLButtonElement>('manual-reiniciar');
const escala = get<HTMLSelectElement>('manual-escala');
const mensagem = get<HTMLOutputElement>('manual-mensagem');
let ensaio = criarEnsaioPropulsivoOrbitadorRe002();
let modoManual = false;
let executando = false;
let acumuladorS = 0;
let ultimoFrameMs: number | undefined;
let encerrado = false;
const dtS = 1 / 240;
const f = (v: number, d = 1) => v.toLocaleString('pt-BR', {maximumFractionDigits:d, minimumFractionDigits:d});
const escrever = (id: string, valor: string) => { get<HTMLElement>(id).textContent = valor; };
function controle(): void {
  const ativo = modoManual && !encerrado;
  ignitar.disabled = !ativo || ensaio.propulsor.estaIgnitado;
  cortar.disabled = !ativo || !ensaio.propulsor.estaIgnitado;
  throttle.disabled = !ativo;
  play.disabled = !ativo;
  passo.disabled = !ativo || executando;
  habilitar.textContent = modoManual ? 'Modo manual ativo' : 'Ativar modo manual';
  habilitar.disabled = modoManual || encerrado;
  habilitar.classList.toggle('active', modoManual);
  play.textContent = executando ? 'Pausar' : 'Iniciar';
  percentual.innerHTML = f(Number(throttle.value), 0) + '% <small>solicitado</small>';
}
function mensagemStatus(s: string): void { mensagem.textContent=s; }
function aplicarThrottle(): void {
  if (!modoManual || encerrado) return;
  const valor = Number(throttle.value)/100;
  if (!Number.isFinite(valor) || valor<0 || valor>1) return;
  ensaio.veiculo.definirThrottleDoPropulsor(ensaio.propulsor.id, valor);
  controle();
}
habilitar.addEventListener('click',()=>{
  if (modoManual || encerrado) return;
  modoManual=true;
  ensaio.veiculo.desabilitarControleDeInclinacao();
  ensaio.controladorAproximacao.desabilitar();
  mensagemStatus('Modo manual habilitado. Ajuste a potência e solicite a ignição.');
  controle();desenhar();
});
ignitar.addEventListener('click',()=>{
  if(!modoManual || encerrado || ensaio.propulsor.estaIgnitado)return;
  const resultado = ensaio.veiculo.solicitarIgnicaoDoPropulsor(ensaio.propulsor.id);
  mensagemStatus(resultado.aceito?'Ignição aceita pelos permissivos do computador de voo.': 'Ignição recusada: '+resultado.diagnostico.join('; '));
  controle();desenhar();
});
cortar.addEventListener('click',()=>{
  if(!modoManual || encerrado)return;
  ensaio.veiculo.definirThrottleDoPropulsor(ensaio.propulsor.id,0);
  throttle.value='0';
  ensaio.veiculo.desligarPropulsor(ensaio.propulsor.id);
  mensagemStatus('Corte do motor solicitado. Reinicie o ensaio para nova sequência de partida.');
  controle();desenhar();
});
throttle.addEventListener('input',()=>{aplicarThrottle();desenhar()});
play.addEventListener('click',()=>{
  if(!modoManual || encerrado)return;
  executando=!executando;
  if(!executando)acumuladorS=0;
  controle();desenhar();
});
passo.addEventListener('click',()=>{
  if(!modoManual || encerrado || executando)return;
  for(let n=0;n<240 && !encerrado;n++)avancar();
  controle();desenhar();
});
reset.addEventListener('click',()=>{
  ensaio=criarEnsaioPropulsivoOrbitadorRe002();
  modoManual=false;executando=false;encerrado=false;acumuladorS=0;ultimoFrameMs=undefined;
  throttle.value='0';mensagemStatus('Cenário reiniciado: motor desligado, sem ignição implícita.');
  controle();desenhar();
});
function avancar():void{
  if(encerrado)return;
  ensaio.mundo.avancar(dtS);
  const colisao=ensaio.mundo.obterContatosComSuperficie().some(c=>c.objetoId===ensaio.veiculo.id);
  if(ensaio.veiculo.integridadeEstrutural===0 || colisao){
    encerrado=true;executando=false;mensagemStatus('Contato com a superfície ou falha estrutural. O ensaio foi interrompido.');
  }
}
function arredondadoRect(x:number,y:number,w:number,h:number,r:number):void{
  ctx!.beginPath();ctx!.roundRect(x,y,w,h,r);
}
function desenhar():void{
  const c=ctx!,w=canvas.width,h=canvas.height;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
  const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#051020');bg.addColorStop(1,'#10263a');c.fillStyle=bg;c.fillRect(0,0,w,h);
  const estado=ensaio.veiculo.getEstadoFisico();
  const motor=ensaio.propulsor.getEstadoFisico();
  const leitura=ensaio.veiculo.obterLeiturasDoComputadorDeVoo();
  const empuxo=ensaio.propulsor.empuxoAtualN;
  const desenhoEscala=Math.min(w/150,h/110);
  const angulo=-estado.orientacaoRad.z;
  c.save();c.translate(w*.5,h*.49);c.rotate(angulo);
  // Corpo e motor são objetos do mundo; a vista usa posição relativa ao casco.
  desenharOrbitadorRE001(c,{pixelsPorMetro:desenhoEscala,rolagemRad:0,integridade:ensaio.veiculo.integridadeEstrutural,flaps:[]});
  const dx=motor.posicaoM.x-estado.posicaoM.x,dy=motor.posicaoM.y-estado.posicaoM.y;
  const localX=(dx*Math.cos(estado.orientacaoRad.z)+dy*Math.sin(estado.orientacaoRad.z))*desenhoEscala;
  const localY=(-dx*Math.sin(estado.orientacaoRad.z)+dy*Math.cos(estado.orientacaoRad.z))*desenhoEscala;
  c.save();c.translate(localX,localY);
  // O motor é montado na sua orientação própria, não inventa gimbal a partir do slider.
  c.rotate(-(motor.orientacaoRad.z-estado.orientacaoRad.z));
  const gimbal=ensaio.propulsor.obterEstadoDaVetorizacao().anguloAtualRad;
  c.rotate(-gimbal);
  c.fillStyle='#5d788c';c.strokeStyle='#cbd9de';c.lineWidth=1.4;
  c.beginPath();c.moveTo(-6,-8);c.lineTo(5,-11);c.lineTo(9,11);c.lineTo(-6,8);c.closePath();c.fill();c.stroke();
  if(empuxo>0){
    const comprimento=14+Math.min(62,empuxo/2_400_000*58);
    const grad=c.createLinearGradient(8,0,8+comprimento,0);
    grad.addColorStop(0,'rgba(214,245,255,.94)');grad.addColorStop(.4,'rgba(102,213,248,.77)');grad.addColorStop(1,'rgba(56,153,227,0)');
    c.fillStyle=grad;c.beginPath();c.moveTo(8,-6);c.lineTo(8+comprimento,0);c.lineTo(8,6);c.closePath();c.fill();
  }
  c.restore();c.restore();
  // Indicadores de cena ancorados na tela; não integram física.
  c.strokeStyle='#28465d';c.setLineDash([5,9]);c.beginPath();c.moveTo(0,h*.75);c.lineTo(w,h*.75);c.stroke();c.setLineDash([]);
  c.fillStyle='#92b0c8';c.font='14px ui-monospace, monospace';c.fillText('XY  /  Vista lateral de objeto composto',19,h-21);
  escrever('manual-situacao',encerrado?'SIMULAÇÃO INTERROMPIDA':modoManual?'CONTROLE MANUAL HABILITADO':'CONTROLE MANUAL DESABILITADO');
  escrever('manual-motor',(ensaio.propulsor.estaIgnitado?'MOTOR IGNITADO':'MOTOR DESLIGADO')+' · '+f(empuxo/1e6,2)+' MN');
  escrever('manual-tempo','t = '+f(ensaio.mundo.tempoS,2)+' s · '+(executando?'executando':'pausada'));
  escrever('manual-altitude',f(leitura.altitudeM,0)+' m');
  escrever('manual-vvertical',f(leitura.velocidadeVerticalMps,1)+' m/s');
  escrever('manual-vhorizontal',f(leitura.velocidadeHorizontalMps,1)+' m/s');
  escrever('manual-empuxo',f(empuxo/1e6,2)+' MN');
  escrever('manual-gimbal',f(gimbal*180/Math.PI,1)+'°');
  escrever('manual-propelente',f(ensaio.tanqueMetano.massaPropelenteKg,0)+' / '+f(ensaio.tanqueOxidante.massaPropelenteKg,0)+' kg');
  escrever('manual-integridade',f(ensaio.veiculo.integridadeEstrutural*100,1)+'%');
  escrever('manual-massa',f(ensaio.veiculo.massaInstantaneaDoConjuntoKg,0)+' kg');
}
function animar(timestamp:number):void{
  if(ultimoFrameMs===undefined)ultimoFrameMs=timestamp;
  const duracao=Math.min(.1,Math.max(0,(timestamp-ultimoFrameMs)/1000));
  ultimoFrameMs=timestamp;
  if(executando&&!encerrado){
    acumuladorS+=duracao*Number(escala.value);
    let n=0;
    while(acumuladorS>=dtS&&n<1200&&!encerrado){avancar();acumuladorS-=dtS;n++}
    controle();desenhar();
  }
  requestAnimationFrame(animar);
}
controle();desenhar();requestAnimationFrame(animar);
