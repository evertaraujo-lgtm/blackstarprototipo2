import type { EstadoExecucaoMissao } from './ContratoMissao';

/** Somente ciclo operacional/índice de passos. O tempo físico pertence ao mundo. */
export class CicloMissao {
  private estado: EstadoExecucaoMissao = 'preparada';
  private passos = 0;
  public get estadoExecucao(): EstadoExecucaoMissao { return this.estado; }
  public get passosExecutados(): number { return this.passos; }
  public iniciar(): void { this.estado = 'executando'; }
  public pausar(): void { if (this.estado === 'executando') this.estado = 'pausada'; }
  public registrarPasso(): void {
    if (this.estado !== 'executando') throw new Error('Missão deve estar executando para registrar passo.');
    this.passos++;
  }
}
