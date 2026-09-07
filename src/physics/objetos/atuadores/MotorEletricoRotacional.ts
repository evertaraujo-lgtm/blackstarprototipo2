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

  public get conexaoEletrica(): ConexaoEletrica { return this.conexao; }
  public get torqueAtualNm(): number { return this.torqueAtualInternoNm; }
  public get habilitado(): boolean { return this.habilitadoInterno; }

  public ligar(): void { this.habilitadoInterno = true; }
  public desligar(): void { this.habilitadoInterno = false; this.torqueAtualInternoNm = 0; }

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

  public obterForcasOperacionais(): readonly { forcaN: Vetor3; torqueNm?: Vetor3 }[] { return []; }
}
