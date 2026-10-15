import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Vetor3 } from '../../Vetor3';
import { ControladorPosicionamentoMotorEletrico, type DefinicaoControladorPosicionamentoMotorEletrico } from '../../sistemas de controle/ControladorPosicionamentoMotorEletrico';
import type { FonteEletrica } from '../fontes-de-energia/FonteEletrica';

export interface DefinicaoMotorEletricoRotacional extends DefinicaoControladorPosicionamentoMotorEletrico {
  readonly fonteEletrica: FonteEletrica;
  readonly potenciaNominalW: number;
}

/** Motor fisico que controla o eixo de uma junta rotacional de bancada. */
export class MotorEletricoRotacional extends ControladorPosicionamentoMotorEletrico {
  private readonly conexao: ConexaoEletrica;
  private torqueAtualInternoNm = 0;
  private habilitadoInterno = true;

  /** Inicializa objeto físico e conexão elétrica de 10 m ligada, com corrente nominal por potência/tensão da fonte; exige potência positiva. Mantém controle especializado nas subclasses. @contract f-338925f6e3377ab1 @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoMotorEletricoRotacional) {
    super(definicao);
    if (definicao.potenciaNominalW <= 0) {
      throw new Error('Parametros do motor rotacional devem ser positivos.');
    }
    this.conexao = new ConexaoEletrica({
      id: `cabo-${definicao.id}`,
      fonte: definicao.fonteEletrica,
      destino: this,
      comprimentoMaximoM: 10,
      correnteMaximaA: definicao.potenciaNominalW / definicao.fonteEletrica.tensaoNominalV,
      inicialmenteLigada: true,
    });
  }

  /** Devolve `this.conexao`. Efeitos indiretos seguem as dependências chamadas. @contract f-09aa3720d357e532 */
  public get conexaoEletrica(): ConexaoEletrica { return this.conexao; }
  /** Devolve `this.torqueAtualInternoNm`. Efeitos indiretos seguem as dependências chamadas. @contract f-d61eda98b005cd1f */
  public get torqueAtualNm(): number { return this.torqueAtualInternoNm; }
  /** Devolve `this.habilitadoInterno`. Efeitos indiretos seguem as dependências chamadas. @contract f-bad4c32de9938f81 */
  public get habilitado(): boolean { return this.habilitadoInterno; }

  /** Marca motor habilitado; fornecimento elétrico e integridade ainda condicionam torque efetivo. @contract f-b5ae4fa41874fd7b @reviewed M12-DOC: implementação lida. */
  public ligar(): void { this.habilitadoInterno = true; }
  /** Desabilita e zera torque interno disponível sem impor parada cinemática. @contract f-6e59ef95d6e931ad @reviewed M12-DOC: implementação lida. */
  public desligar(): void { this.habilitadoInterno = false; this.torqueAtualInternoNm = 0; }

  /** Prepara circuito; indisponibilidade/destruição zera torque e memória. Solicita energia pelo trabalho |τω| e parcela proporcional ao torque; escala torque pela energia realmente entregue. Não integra rotação nem garante torque quando sem alimentação. @contract f-c5f258a2e6357c87 @reviewed M12-DOC: implementação lida. */
  public prepararPassoOperacional(dtS: number): void {
    this.conexao.prepararPasso(dtS);
    if (!this.habilitadoInterno || this.conexao.estaIndisponivel || this.integridadeEstrutural === 0) {
      this.torqueAtualInternoNm = 0;
      this.zerarEstadoDoControlador();
      return;
    }
    const torqueSolicitadoNm = this.calcularTorqueDePosicao(dtS);
    const velocidadeAtualRadps = this.configuracaoControle.obterVelocidadeAngularRadps();
    const energiaJ = Math.abs(torqueSolicitadoNm * velocidadeAtualRadps) * dtS + Math.abs(torqueSolicitadoNm) * 0.02 * dtS;
    const fornecidaJ = this.conexao.fornecerEnergia(energiaJ);
    const disponibilidade = energiaJ === 0 ? 1 : fornecidaJ / energiaJ;
    this.torqueAtualInternoNm = torqueSolicitadoNm * Math.min(1, disponibilidade);
  }

  /** Devolve `[]`. Efeitos indiretos seguem as dependências chamadas. @contract f-605bde42e3e15c5c */
  public obterForcasOperacionais(): readonly { forcaN: Vetor3; torqueNm?: Vetor3 }[] { return []; }
}
