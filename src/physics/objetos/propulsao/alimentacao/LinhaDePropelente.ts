import { TanquePropelente } from '../../fontes-de-energia/TanquePropelente';
import { Vetor3 } from '../../../Vetor3';
import { ValvulaPropelente } from './ValvulaPropelente';

export interface DefinicaoLinhaDePropelente { readonly id: string; readonly tanque: TanquePropelente; readonly tipoPropelente: string; readonly comprimentoMaximoM: number; readonly vazaoMaximaKgS: number; readonly valvula: ValvulaPropelente; }

/** Conexão material entre tanque e bomba; rompe se a geometria exceder o alcance. */
export class LinhaDePropelente {
  private rompida = false;
  private desconectadaManualmente = false;
  private vazaoAtualCalculadaKgS = 0;
  public constructor(private readonly definicao: DefinicaoLinhaDePropelente) {
    if (!definicao.id || definicao.tanque.tipoPropelente !== definicao.tipoPropelente || !Number.isFinite(definicao.comprimentoMaximoM) || definicao.comprimentoMaximoM <= 0 || !Number.isFinite(definicao.vazaoMaximaKgS) || definicao.vazaoMaximaKgS <= 0) throw new Error('Definição de linha de propelente inválida.');
  }
  public get estaRompida(): boolean { return this.rompida; }
  /** A desconexão comandada preserva o tanque, mas remove sua alimentação. */
  public get estaDesconectada(): boolean { return this.desconectadaManualmente; }
  public get estaIndisponivel(): boolean { return this.rompida || this.desconectadaManualmente; }
  public get vazaoAtualKgS(): number { return this.vazaoAtualCalculadaKgS; }
  /** Comando de throttle aplicado à válvula desta linha. */
  public definirAberturaDaValvula(abertura: number): void { this.definicao.valvula.definirAbertura(abertura); }
  /** Desacoplamento físico irreversível da linha neste cenário. */
  public desconectar(): void {
    this.desconectadaManualmente = true;
    this.vazaoAtualCalculadaKgS = 0;
  }
  /** Falha física irreversível da mangueira, por ruptura ou soltura do encaixe. */
  public romper(): void {
    this.rompida = true;
    this.vazaoAtualCalculadaKgS = 0;
  }
  /** Atualiza a ruptura geométrica antes de qualquer bomba consumir energia. */
  public verificarIntegridade(posicaoConsumidorM: Vetor3): void {
    const distanciaM = this.definicao.tanque.getEstadoFisico().posicaoM.subtrair(posicaoConsumidorM).magnitude;
    if (distanciaM > this.definicao.comprimentoMaximoM) this.romper();
  }
  public fornecerMassa(massaSolicitadaKg: number, dtS: number, posicaoConsumidorM: Vetor3): number {
    this.vazaoAtualCalculadaKgS = 0;
    if (!Number.isFinite(massaSolicitadaKg) || massaSolicitadaKg < 0 || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Solicitação de linha inválida.');
    this.verificarIntegridade(posicaoConsumidorM);
    if (this.estaIndisponivel) return 0;
    const limiteKg = Math.min(this.definicao.vazaoMaximaKgS, this.definicao.valvula.obterVazaoMaximaKgS()) * dtS;
    const fornecida = this.definicao.tanque.fornecerPropelente(Math.min(massaSolicitadaKg, limiteKg));
    this.vazaoAtualCalculadaKgS = fornecida / dtS;
    return fornecida;
  }
}
