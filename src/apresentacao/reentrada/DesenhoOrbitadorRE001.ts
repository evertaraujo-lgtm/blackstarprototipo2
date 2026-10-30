/**
 * Black Rise / RE-001 - silhueta estritamente lateral para o plano XY.
 * Somente desenho: coordenadas são convenções gráficas, NÃO dimensões de engenharia.
 * Chamador faz translate(corpo), rotate(-atitudeXY) e mantém o próprio save/restore.
 * O nariz está no eixo +X (direita); +Y Canvas é abaixo.
 */
export interface FlapVisualRE001 {
  readonly conectado: boolean;
  readonly deflexaoRad: number;
  readonly integridade?: number;
}

export interface AparenciaOrbitadorRE001 {
  readonly pixelsPorMetro: number;
  readonly rolagemRad: number; // estado virtual mantido; NÃO rotaciona nem abre asas em XY
  readonly integridade: number;
  readonly flaps: readonly FlapVisualRE001[];
}

/**
 * Desenha a silhueta longitudinal do orbitador em unidades gráficas locais. A
 * escala mínima impede que o símbolo desapareça no zoom distante; rolagem é
 * mantida apenas no snapshot e não altera a projeção lateral. A rotina usa o
 * contexto fornecido e restaura seu estado, sem consultar ou mutar a simulação.
 * @contract f-576f3ac8421df6ee
 */
export function desenharOrbitadorRE001(
  ctx: CanvasRenderingContext2D,
  o: AparenciaOrbitadorRE001,
): void {
  const s = Math.max(0.01, o.pixelsPorMetro);
  const avariado = o.integridade <= 0.5;

  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1) Contorno longitudinal do corpo sustentante. Nada de planta superior,
  // asas triangulares abertas, pseudoperspectiva, tubeira ou trem de pouso.
  /** Constrói o caminho fechado do casco em coordenadas locais (metros gráficos). @contract f-64b2939547961bc0 */
  const fuselagem = () => {
    ctx.beginPath();
    ctx.moveTo(-23, -2.9); // extremidade traseira
    ctx.lineTo(-20, -3.8);
    ctx.bezierCurveTo(-14, -4.5, 0, -4.45, 8, -4.2);
    ctx.bezierCurveTo(15, -4.0, 21.9, -1.9, 23.6, -0.35);
    ctx.quadraticCurveTo(24.1, 0, 23.6, 0.35);
    ctx.bezierCurveTo(21.8, 1.95, 16, 3.65, 8, 4.2);
    ctx.bezierCurveTo(-1, 4.65, -15, 4.65, -20.1, 3.55);
    ctx.lineTo(-23, 2.7);
    ctx.closePath();
  };

  // Revestimento e brilho limitado à silhueta real.
  const casco = ctx.createLinearGradient(0, -4.6, 0, 4.8);
  casco.addColorStop(0, avariado ? '#bd9189' : '#ecf0f0');
  casco.addColorStop(0.35, avariado ? '#967b77' : '#b9ccd3');
  casco.addColorStop(0.7, avariado ? '#6b5553' : '#819dab');
  casco.addColorStop(1, avariado ? '#403a3b' : '#3b5365');
  ctx.fillStyle = casco;
  ctx.strokeStyle = avariado ? '#d4a99e' : '#b8d2dd';
  ctx.lineWidth = 0.42;
  fuselagem(); ctx.fill(); ctx.stroke();

  ctx.save();
  fuselagem(); ctx.clip();

  // 2) Escudo térmico ao longo da face inferior em perfil.
  const tps = ctx.createLinearGradient(0, 1, 0, 5);
  tps.addColorStop(0, avariado ? '#745753' : '#667d8c');
  tps.addColorStop(1, avariado ? '#352d32' : '#263746');
  ctx.fillStyle = tps;
  ctx.beginPath();
  ctx.moveTo(-24, 1.75);
  ctx.bezierCurveTo(-10, 2.1, 7, 2.2, 15.2, 1.85);
  ctx.quadraticCurveTo(21, 1.25, 24, 0.05);
  ctx.lineTo(25, 7);
  ctx.lineTo(-25, 7);
  ctx.closePath(); ctx.fill();

  // Juntas de painéis, seguindo o comprimento (não grades perpendiculares do topo).
  ctx.strokeStyle = avariado ? '#544b4b' : '#6d8799';
  ctx.lineWidth = 0.17;
  for (const x of [-17, -12, -7, -2, 3, 8, 13]) {
    ctx.beginPath();
    ctx.moveTo(x, -4.15);
    ctx.lineTo(x + 0.6, 2.15);
    ctx.stroke();
  }
  ctx.strokeStyle = avariado ? '#705651' : '#496477';
  ctx.beginPath();
  ctx.moveTo(-19, -1.35);
  ctx.bezierCurveTo(-3, -1.25, 10, -1.55, 16.8, -1.7);
  ctx.stroke();

  // 3) Aba/raiz aerodinâmica vista de perfil: apenas uma linha estreita.
  // A área lateral/projeção real dessas superfícies NÃO é modelada aqui.
  ctx.fillStyle = avariado ? '#655350' : '#536e7f';
  ctx.strokeStyle = '#89a5b5';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(-18, 2.1);
  ctx.lineTo(-4.5, 2.35);
  ctx.lineTo(5.5, 3.25);
  ctx.lineTo(-13, 3.1);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // 4) Compartimento traseiro lacrado. Sem bocal, escape, motor ou fogo.
  ctx.strokeStyle = '#809cac'; ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-22.9, -2.7);
  ctx.lineTo(-22.9, 2.65);
  ctx.stroke();
  ctx.strokeStyle = '#385369'; ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(-21.3, -3.45); ctx.lineTo(-21.3, 3.25); ctx.stroke();

  // 5) Janela escura embutida na parte dianteira da fuselagem.
  ctx.fillStyle = '#0c2132'; ctx.strokeStyle = '#9bcddd'; ctx.lineWidth = 0.32;
  ctx.beginPath();
  ctx.moveTo(12.7, -3.15);
  ctx.bezierCurveTo(16.8, -3, 19.4, -2.0, 20.2, -1.3);
  ctx.quadraticCurveTo(18.4, -0.95, 15.1, -1.18);
  ctx.lineTo(12.2, -1.75);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#4e89a1'; ctx.lineWidth = 0.15;
  ctx.beginPath(); ctx.moveTo(16.4, -2.85); ctx.lineTo(15.3, -1.21); ctx.stroke();

  // Identificação pequena; não depende de configuração aerodinâmica.
  ctx.fillStyle = avariado ? '#3c2929' : '#294f63';
  ctx.font = 'bold 1.5px system-ui, sans-serif';
  ctx.fillText('BLACK RISE', -10.2, -1.65);
  ctx.font = '1.2px system-ui, sans-serif';
  ctx.fillText('RE-001', 0.8, -1.58);

  // 6) Apenas DOIS flaps do snapshot, na silhueta inferior.
  // Com comando zero, cada flap fica quase rente ao casco, não parece uma asa aberta.
  // Não desenhar flap conectado quando a simulação já o destacou.
  for (const [i, flap] of o.flaps.entries()) {
    if (!flap.conectado || i > 1) continue;
    const dianteiro = i === 0;
    const x = dianteiro ? 11.5 : -16.0;
    const y = dianteiro ? 3.2 : 3.9;
    const sentido = dianteiro ? 1 : -1;
    const comprimento = dianteiro ? 5.5 : 5.9;
    const gasto = (flap.integridade ?? 1) < 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-flap.deflexaoRad);
    ctx.fillStyle = gasto ? '#9f685e' : '#8f9fa9';
    ctx.strokeStyle = gasto ? '#e6a39b' : '#e9c183';
    ctx.lineWidth = 0.33;
    ctx.beginPath();
    ctx.moveTo(0, -0.33);
    ctx.lineTo(sentido * comprimento, -0.21);
    ctx.lineTo(sentido * (comprimento + 0.6), 0.64);
    ctx.lineTo(0, 0.63);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#364b57'; ctx.lineWidth = 0.15;
    ctx.beginPath(); ctx.moveTo(sentido * 1.1, 0.13);
    ctx.lineTo(sentido * (comprimento - 0.45), 0.16); ctx.stroke();
    ctx.fillStyle = '#e1c68e';
    ctx.beginPath(); ctx.arc(0, 0.1, 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // o.rolagemRad é intencionalmente IGNORADO para a silhueta lateral XY.
  // A rolagem virtual continua sendo exibida pelo HUD e usada na física existente.
  ctx.restore();
}
