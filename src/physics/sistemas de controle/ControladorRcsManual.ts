import { Propulsor } from '../objetos/propulsao/Propulsor';

export type ComandoRotacaoRcs = -1 | 0 | 1;

/** Recebe comando manual discreto e comanda pares físicos de jatos RCS. */
export class ControladorRcsManual {
  private comandoAtual: ComandoRotacaoRcs = 0;
  /** Liga pares reais de jatos opostos para comandos independentes de atitude; não integra uma nave proprietária. @contract f-548f23471389cbf4 @reviewed RE-002E: dependências são pares tipados de propulsores. */
  public constructor(
    private readonly parNarizCima: readonly [Propulsor, Propulsor],
    private readonly parNarizBaixo: readonly [Propulsor, Propulsor],
  ) {}

  /** Valida e aplica pulso contínuo −1/0/+1 aos pares opostos; não altera cinemática. @contract f-651bd83fa675aaff @reviewed RE-002E: saída somente throttle de propulsores físicos. */
  public solicitarRotacao(comando: ComandoRotacaoRcs): void {
    if (comando !== -1 && comando !== 0 && comando !== 1) throw new Error('Comando RCS deve ser −1, 0 ou +1.');
    for (const propulsor of this.parNarizCima) propulsor.definirThrottle(comando === -1 ? 1 : 0);
    for (const propulsor of this.parNarizBaixo) propulsor.definirThrottle(comando === 1 ? 1 : 0);
    this.comandoAtual = comando;
  }

  /** Consulta o último comando discreto; não confunde solicitação com rotação efetiva. @contract f-d8988e01f5c8e858 @reviewed RE-002E: telemetria reporta comando, não estado cinemático. */
  public observarComando(): ComandoRotacaoRcs { return this.comandoAtual; }
}
