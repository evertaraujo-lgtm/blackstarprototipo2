import type { EstadoExecucaoMissao } from './ContratoMissao';

/** Somente ciclo operacional/índice de passos. O tempo físico pertence ao mundo. */
export class CicloMissao {
  private estado: EstadoExecucaoMissao = 'preparada';
  private passos = 0;
  /** Consulta o estado operacional preparada/executando/pausada; não duplica tempo físico. @contract f-b04eae8408c853c9 @reviewed M12-DOC: implementação lida. */
  public get estadoExecucao(): EstadoExecucaoMissao { return this.estado; }
  /** Consulta número inteiro de passos físicos registrados. @contract f-229ce615b07d7bca @reviewed M12-DOC: implementação lida. */
  public get passosExecutados(): number { return this.passos; }
  /** Define execução operacional como executando; não avança tempo por si. @contract f-a389b3bbe1dc48f9 @reviewed M12-DOC: implementação lida. */
  public iniciar(): void { this.estado = 'executando'; }
  /** Muda executando para pausada; mantém preparada/pausada e índice de passos. @contract f-fd6e13babdc1c637 @reviewed M12-DOC: implementação lida. */
  public pausar(): void { if (this.estado === 'executando') this.estado = 'pausada'; }
  /** Incrementa índice somente quando executando; lança erro em pausa/preparação, sem avançar o mundo. @contract f-dc39b90f3742f775 @reviewed M12-DOC: implementação lida. */
  public registrarPasso(): void {
    if (this.estado !== 'executando') throw new Error('Missão deve estar executando para registrar passo.');
    this.passos++;
  }
}
