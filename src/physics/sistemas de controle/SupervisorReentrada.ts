import { GerenciadorDeControladores } from './GerenciadorDeControladores';

export interface EstadoTransferenciaPouso {
  readonly altitudeM: number;
  readonly velocidadeMps: number;
  readonly atitudeVerticalRad: number;
  readonly trajetoriaRad: number;
  readonly sensoresValidos: boolean;
  readonly integridade: number;
  readonly propulsaoDisponivel: boolean;
  readonly integracaoCompativel: boolean;
}
export interface LimitesTransferencia {
  readonly altitudeMinimaM: number;
  readonly altitudeMaximaM: number;
  readonly velocidadeMaximaMps: number;
  readonly atitudeMaximaRad: number;
  readonly trajetoriaMinimaRad: number;
  readonly trajetoriaMaximaRad: number;
}
export interface RequisitoTransferencia { readonly descricao: string; readonly atendido: boolean; readonly atual: number | boolean; readonly esperado: string }
export const LIMITES_TRANSFERENCIA: LimitesTransferencia = Object.freeze({ altitudeMinimaM: 20, altitudeMaximaM: 5000,
  velocidadeMaximaMps: 150, atitudeMaximaRad: 15 * Math.PI / 180,
  trajetoriaMinimaRad: -Math.PI / 2, trajetoriaMaximaRad: -5 * Math.PI / 180 });

/** Exclusão de posse pela arbitragem compartilhada; sem promessa de pouso. */
export class SupervisorReentrada {
  private solicitado = false;
  private automatico = false;
  private fase: 'reentrada' | 'pouso' | 'falha' = 'reentrada';
  private requisitos: readonly RequisitoTransferencia[] = [];

  /** Exige limites SI finitos/ordenados; recebe o gerenciador já registrado.  @contract f-cadd2a244c36f2e6 */
  public constructor(private readonly gerenciador: GerenciadorDeControladores,
    private readonly limites: LimitesTransferencia = LIMITES_TRANSFERENCIA) {
    if (!Object.values(limites).every(Number.isFinite) || limites.altitudeMinimaM < 0
      || limites.altitudeMaximaM <= limites.altitudeMinimaM || limites.velocidadeMaximaMps <= 0
      || limites.atitudeMaximaRad <= 0 || limites.atitudeMaximaRad > Math.PI / 2
      || limites.trajetoriaMinimaRad < -Math.PI / 2 || limites.trajetoriaMaximaRad >= 0
      || limites.trajetoriaMinimaRad >= limites.trajetoriaMaximaRad) throw new Error('Limites de transferência inválidos.');
  }
  /** Define modo de chaveamento, sem antecipar a transferência.  @contract f-b1ae7b1305eed55c */
  public definirAutomatico(ativo: boolean): void { this.automatico = ativo; }
  /** Solicita avaliação supervisionada única; falha exige novo comando manual.  @contract f-a197f80db78bc8fc */
  public solicitarPouso(): void { this.solicitado = true; }

  /** Verifica todas as condições antes de trocar o controlador selecionado.
   * Falha de sensores/integridade retira ambos; perda de propulsão retira pouso.
   * Não transfere para adaptador sem integração física, mesmo com cinemática favorável.
   * @contract f-673d50a58b6f9c0f
   */
  public atualizar(e: EstadoTransferenciaPouso): void {
    const l = this.limites;
    const finitos = [e.altitudeM, e.velocidadeMps, e.atitudeVerticalRad, e.trajetoriaRad, e.integridade].every(Number.isFinite);
    this.requisitos = [
      { descricao: 'Altitude', atendido: e.altitudeM >= l.altitudeMinimaM && e.altitudeM <= l.altitudeMaximaM, atual: e.altitudeM, esperado: `${l.altitudeMinimaM}–${l.altitudeMaximaM} m` },
      { descricao: 'Velocidade', atendido: e.velocidadeMps >= 0 && e.velocidadeMps <= l.velocidadeMaximaMps, atual: e.velocidadeMps, esperado: `0–${l.velocidadeMaximaMps} m/s` },
      { descricao: 'Atitude vertical', atendido: Math.abs(e.atitudeVerticalRad) <= l.atitudeMaximaRad, atual: e.atitudeVerticalRad, esperado: `|atitude| ≤ ${l.atitudeMaximaRad} rad` },
      { descricao: 'Trajetória descendente', atendido: e.trajetoriaRad >= l.trajetoriaMinimaRad && e.trajetoriaRad <= l.trajetoriaMaximaRad, atual: e.trajetoriaRad, esperado: `${l.trajetoriaMinimaRad}–${l.trajetoriaMaximaRad} rad` },
      { descricao: 'Sensores e finitude', atendido: e.sensoresValidos && finitos, atual: e.sensoresValidos && finitos, esperado: 'válidos' },
      { descricao: 'Integridade', atendido: e.integridade > 0, atual: e.integridade, esperado: '> 0' },
      { descricao: 'Propulsão operacional', atendido: e.propulsaoDisponivel, atual: e.propulsaoDisponivel, esperado: 'motores disponíveis, permissivos e ignição explícita' },
      { descricao: 'Integração com ControladorPouso', atendido: e.integracaoCompativel, atual: e.integracaoCompativel, esperado: 'sensores, atuadores propulsivos e configuração compatíveis' },
    ];
    if (!finitos || !e.sensoresValidos || e.integridade <= 0 || (this.fase === 'pouso' && !e.propulsaoDisponivel)) {
      this.gerenciador.desabilitar('reentrada'); this.gerenciador.desabilitar('pouso'); this.fase = 'falha';
      this.solicitado = false; return;
    }
    if ((this.solicitado || this.automatico) && this.requisitos.every(r => r.atendido) && this.fase === 'reentrada') {
      this.gerenciador.desabilitar('reentrada'); this.gerenciador.habilitar('pouso'); this.fase = 'pouso';
    }
    this.solicitado = false;
  }

  /** Copia diagnóstico e limites; falha bloqueada permanece observável.  @contract f-99cdaa23a64f6cf9 */
  public observar() { return { fase: this.fase, automatico: this.automatico,
    autorizado: this.requisitos.length > 0 && this.requisitos.every(r => r.atendido),
    requisitos: this.requisitos.map(r => ({ ...r })), limites: { ...this.limites } }; }
}
