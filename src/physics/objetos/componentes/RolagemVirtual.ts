export interface EstadoRolagemVirtual {
  readonly solicitadaRad: number;
  readonly atualRad: number;
  readonly taxaMaximaRadps: number;
  readonly limiteRad: number;
  readonly disponivel: boolean;
}

/** Cinemática prescrita, sem terceira rotação física ou comprovação de autoridade real. */
export class RolagemVirtual {
  private solicitadaRad: number;
  private atualRad: number;
  private disponivel = true;
  private readonly historico: { tempoS: number; anguloRad: number }[] = [];

  /** Inicializa ângulo rad, curso até π e taxa rad/s positivos; não conhece corpo/mundo.  @contract f-71592e454cdc955f */
  public constructor(inicialRad = 0, private readonly taxaMaximaRadps = Math.PI / 18,
    private readonly limiteRad = Math.PI / 2) {
    if (![inicialRad, taxaMaximaRadps, limiteRad].every(Number.isFinite)
      || taxaMaximaRadps <= 0 || limiteRad <= 0 || limiteRad > Math.PI || Math.abs(inicialRad) > limiteRad) {
      throw new Error('Configuração de rolagem virtual inválida.');
    }
    this.solicitadaRad = inicialRad; this.atualRad = inicialRad;
    this.historico.push({ tempoS: 0, anguloRad: inicialRad });
  }

  /** Satura alvo rad; registra mudanças no tempo simulado s, mesmo se indisponível.  @contract f-a32af989b5cd0715 */
  public solicitar(anguloRad: number, tempoS: number): void {
    if (![anguloRad, tempoS].every(Number.isFinite) || tempoS < 0) throw new Error('Comando virtual inválido.');
    const alvo = Math.max(-this.limiteRad, Math.min(this.limiteRad, anguloRad));
    if (alvo === this.solicitadaRad) return;
    this.solicitadaRad = alvo; this.historico.push({ tempoS, anguloRad: alvo });
  }

  /** Avança apenas variável virtual por taxa prescrita rad/s; dt s em (0,1/60].  @contract f-7785f3fed60e116a */
  public avancar(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0 || dtS > 1 / 60) throw new Error('dt virtual fora do domínio (0,1/60] s.');
    if (!this.disponivel) return;
    const passo = this.taxaMaximaRadps * dtS;
    this.atualRad += Math.max(-passo, Math.min(passo, this.solicitadaRad - this.atualRad));
  }

  /** Falha congela somente a variável prescrita; não interfere em posição/velocidade/arfagem.  @contract f-d9e74aab00b28ddd */
  public definirDisponibilidade(disponivel: boolean): void { this.disponivel = disponivel; }

  /** Snapshot escalar sem acesso mutável ao componente.  @contract f-07035258b4c50f9b */
  public observar(): EstadoRolagemVirtual {
    return Object.freeze({ solicitadaRad: this.solicitadaRad, atualRad: this.atualRad,
      taxaMaximaRadps: this.taxaMaximaRadps, limiteRad: this.limiteRad, disponivel: this.disponivel });
  }

  /** Copia histórico de mudanças; nenhuma amostra de cinemática XY é mantida.  @contract f-c34bff7665ca14f2 */
  public obterHistorico(): readonly { readonly tempoS: number; readonly anguloRad: number }[] {
    return this.historico.map(c => Object.freeze({ ...c }));
  }
}
