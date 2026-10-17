import { normalizarAngulo } from '../ambiente/ReferencialFisico';
import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';
import { MODELO_REENTRADA } from '../reentrada/ModeloAerodinamicoReentrada';

export interface TelemetriaControleReentrada {
  readonly alphaRad: number;
  readonly taxaArfagemRadps: number;
  readonly taxaFluxoRadps: number;
  readonly pressaoDinamicaPa: number;
  readonly fluxoTermicoWm2: number;
  readonly cargaG: number;
  readonly torquePassivoNm: number;
  readonly inerciaKgM2: number;
  readonly phiRad: number;
  readonly disponivel: boolean;
}
export interface CorredorReentrada {
  readonly pressaoMaximaPa: number;
  readonly fluxoMaximoWm2: number;
  readonly cargaMaximaG: number;
}

/** PD por telemetria e compensação de torque; solicita atuadores via arbitragem. */
export class ControladorReentrada implements ControladorDeVoo {
  public readonly id = 'reentrada';
  public readonly prioridade = 90;
  private habilitado = false;
  private alvoAlphaRad: number;
  private alvoPhiRad: number;
  private estado = 'inativo';
  private alphaGerenciadoRad: number;

  /** Recebe porta escalar de sensores/cargas, sem acesso ao objeto ou mundo.
   * Corredor é uma heurística de investigação, sem garantia de trajetória segura.
   * @contract f-c18886ab4102b0a9
   */
  public constructor(private readonly ler: () => TelemetriaControleReentrada,
    alphaRad: number, phiRad: number, private readonly corredor: CorredorReentrada) {
    this.alvoAlphaRad = alphaRad; this.alvoPhiRad = phiRad; this.alphaGerenciadoRad = alphaRad;
    this.configurarAlvos(alphaRad, phiRad);
    if (!Object.values(corredor).every(v => Number.isFinite(v) && v > 0)) throw new Error('Corredor inválido.');
  }
  /** Seleciona automação; ignição/posição/orientação não são comandadas.  @contract f-984a523bb78d293a */
  public habilitar(): void { this.habilitado = true; this.estado = 'automatico'; }
  /** Retira solicitações da arbitragem, preservando o estado físico.  @contract f-3355374dcb4f6b5f */
  public desabilitar(): void { this.habilitado = false; this.estado = 'manual'; }
  /** Consulta seleção operacional real.  @contract f-8759d6e7ccb5a8f2 */
  public get estaHabilitado(): boolean { return this.habilitado; }
  /** Alvos rad finitos, alpha de 0–80° e bank de ±90°.  @contract f-c5e7649bb6a75116 */
  public configurarAlvos(alphaRad: number, phiRad: number): void {
    if (![alphaRad, phiRad].every(Number.isFinite) || alphaRad < 0 || alphaRad > 80 * Math.PI / 180
      || Math.abs(phiRad) > Math.PI / 2) throw new Error('Alvos de reentrada fora dos limites.');
    this.alvoAlphaRad = alphaRad; this.alvoPhiRad = phiRad;
  }
  /** Snapshot de alvo do operador, alvo gerenciado e estado efetivo do controle.  @contract f-f9d73dd15b5c52e4 */
  public observar() { return { estado: this.estado, alphaSolicitadoRad: this.alvoAlphaRad,
    alphaGerenciadoRad: this.alphaGerenciadoRad, phiSolicitadoRad: this.alvoPhiRad }; }

  /** Calcula deflexões opostas para torque de arfagem, limitado por q, geometria,
   * projeção virtual e curso de 30°. PD sem integral evita windup. dt s em (0,1/60].
   * Sem autoridade não aplica torque substituto/RCS fictício. Leituras inválidas
   * produzem ausência de pedidos; sensores só observam o estado real do core.
   * @contract f-e02341d58116ed62
   */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!Number.isFinite(dtS) || dtS <= 0 || dtS > 1 / 60) throw new Error('dt de controle inválido.');
    if (!this.habilitado) return [];
    const t = this.ler();
    if (leituras.sensoresValidos === false || (leituras.idadeLeituraS ?? 0) > 0.25
      || !t.disponivel || !Object.values(t).filter(v => typeof v === 'number').every(Number.isFinite)) {
      this.estado = 'falha'; return [];
    }
    const excedeuCorredor = t.pressaoDinamicaPa > this.corredor.pressaoMaximaPa
      || t.fluxoTermicoWm2 > this.corredor.fluxoMaximoWm2 || t.cargaG > this.corredor.cargaMaximaG;
    this.alphaGerenciadoRad = excedeuCorredor ? Math.min(70 * Math.PI / 180, Math.max(this.alvoAlphaRad, 55 * Math.PI / 180)) : this.alvoAlphaRad;
    const phi = excedeuCorredor ? 0 : this.alvoPhiRad;
    const modelo = MODELO_REENTRADA;
    const torquePorRad = 2 * t.pressaoDinamicaPa * modelo.areaFlapM2 * modelo.clFlapPorRad * modelo.bracoFlapM
      * Math.cos(t.alphaRad) * Math.cos(t.phiRad);
    const torqueAlvo = t.inerciaKgM2 * (modelo.ganhoAlpha * normalizarAngulo(this.alphaGerenciadoRad - t.alphaRad)
      - modelo.ganhoTaxa * (t.taxaArfagemRadps - t.taxaFluxoRadps)) - t.torquePassivoNm;
    const semAutoridade = Math.abs(torquePorRad) < modelo.torqueMinimoAutoridadeNm;
    const bruto = semAutoridade ? 0 : torqueAlvo / torquePorRad;
    const delta = Math.max(-modelo.cursoFlapRad, Math.min(modelo.cursoFlapRad, bruto));
    this.estado = semAutoridade ? 'sem-autoridade' : delta !== bruto ? 'saturado'
      : excedeuCorredor ? 'corredor-excedido' : 'automatico';
    return [{ idAtuador: 'flap-dianteiro', recurso: 'flap', valor: delta },
      { idAtuador: 'flap-traseiro', recurso: 'flap', valor: -delta },
      { idAtuador: 'orbitador-re-001', recurso: 'rolagem-virtual', valor: phi }];
  }
}
