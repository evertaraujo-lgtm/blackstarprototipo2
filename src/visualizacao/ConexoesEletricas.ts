import type { Objeto } from '../physics/objetos/base/Objeto';
import type { ConexaoEletrica } from '../physics/conexoes/ConexaoEletrica';
import { Vetor3 } from '../physics/Vetor3';

/** O renderer consulta a conexão de domínio usada pelo consumidor. */
export type ConexaoEletricaVisual = ConexaoEletrica;

export function conexoesEletricasExpostas(conexoes: readonly ConexaoEletricaVisual[], objetosVisiveis: readonly Objeto[]): readonly ConexaoEletricaVisual[] {
  return conexoes.filter((conexao) => objetosVisiveis.includes(conexao.fonte));
}

/** Terminal no meio da face esquerda local; acompanha translação e rotação reais. */
export function terminalEletricoM(objeto: Objeto): Vetor3 {
  const estado = objeto.getEstadoFisico();
  const xLocal = -objeto.dimensoesM.x / 2;
  return estado.posicaoM.adicionar(new Vetor3(xLocal * Math.cos(estado.orientacaoRad.z), xLocal * Math.sin(estado.orientacaoRad.z), 0));
}

export function desenharConexoesEletricas(
  contexto: CanvasRenderingContext2D,
  conexoes: readonly ConexaoEletricaVisual[],
  objetosVisiveis: readonly Objeto[],
  projetar: (pontoM: Vetor3) => { readonly x: number; readonly y: number },
): void {
  for (const conexao of conexoesEletricasExpostas(conexoes, objetosVisiveis)) {
    const inicio = projetar(terminalEletricoM(conexao.fonte));
    const fim = projetar(terminalEletricoM(conexao.destino));
    const estado = conexao.estaRompida ? 'rompida' : conexao.estaDesconectada ? 'desconectada' : conexao.estaEnergizada ? 'energizada' : 'desligada';
    const rotaX = Math.min(inicio.x, fim.x) - 22;
    contexto.save();
    contexto.lineJoin = 'round';
    contexto.lineCap = 'round';
    // Dois condutores, inclusive desligados. A separação em pixels é somente visual.
    for (const [deslocamento, cor] of [[-3, '#f87171'], [3, '#60a5fa']] as const) {
      const caminho = () => {
        contexto.beginPath();
        contexto.moveTo(inicio.x, inicio.y + deslocamento);
        contexto.lineTo(rotaX + deslocamento, inicio.y + deslocamento);
        contexto.lineTo(rotaX + deslocamento, fim.y + deslocamento);
        contexto.lineTo(fim.x, fim.y + deslocamento);
      };
      contexto.setLineDash(estado === 'rompida' || estado === 'desconectada' ? [6, 7] : []);
      caminho(); contexto.lineWidth = 5; contexto.strokeStyle = '#071126'; contexto.stroke();
      caminho(); contexto.lineWidth = 2; contexto.strokeStyle = estado === 'rompida' ? '#ef4444' : cor; contexto.stroke();
      contexto.setLineDash([]);
      for (const ponto of [inicio, fim]) {
        contexto.beginPath(); contexto.arc(ponto.x, ponto.y + deslocamento, 3, 0, Math.PI * 2);
        contexto.fillStyle = cor; contexto.fill();
      }
    }
    // Símbolo em série com o condutor positivo; consulta o estado real dos contatos.
    const switchX = rotaX - 3;
    const switchY = (inicio.y + fim.y) / 2;
    contexto.fillStyle = '#071126';
    contexto.fillRect(switchX - 18, switchY - 17, 22, 34);
    contexto.strokeStyle = conexao.interruptorFechado ? '#4ade80' : '#fbbf24';
    contexto.lineWidth = 2;
    contexto.beginPath();
    contexto.moveTo(switchX, switchY + 12);
    contexto.lineTo(switchX + (conexao.interruptorFechado ? 0 : -13), switchY - 12);
    contexto.stroke();
    for (const y of [switchY - 12, switchY + 12]) {
      contexto.beginPath();
      contexto.arc(switchX, y, 3, 0, Math.PI * 2);
      contexto.fill();
      contexto.stroke();
    }
    contexto.font = '11px ui-monospace, monospace';
    contexto.fillStyle = conexao.interruptorFechado ? '#4ade80' : '#fbbf24';
    contexto.fillText(conexao.interruptorFechado ? 'SW FECHADO' : 'SW ABERTO', rotaX + 22, switchY - 18);
    contexto.fillStyle = estado === 'energizada' ? '#fde047' : estado === 'rompida' ? '#f87171' : '#cbd5e1';
    contexto.font = '11px ui-monospace, monospace';
    contexto.fillText(estado === 'energizada' ? 'ALIMENTAÇÃO ON' : estado === 'rompida' ? 'CABO ROMPIDO' : estado === 'desconectada' ? 'DESCONECTADO' : 'ALIMENTAÇÃO OFF', rotaX + 9, (inicio.y + fim.y) / 2);
    contexto.fillText(`${conexao.correnteAtualA.toFixed(1)} A · ${conexao.tensaoSaidaV.toFixed(1)} V`, rotaX + 9, (inicio.y + fim.y) / 2 + 14);
    contexto.restore();
  }
}
