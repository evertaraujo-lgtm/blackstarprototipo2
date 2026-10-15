import { TanquePropelente } from '../../fontes-de-energia/TanquePropelente';
import { Vetor3 } from '../../../Vetor3';
import { ValvulaPropelente } from './ValvulaPropelente';

export interface DefinicaoLinhaDePropelente { readonly id: string; readonly tanque: TanquePropelente; readonly tipoPropelente: string; readonly comprimentoMaximoM: number; readonly vazaoMaximaKgS: number; readonly valvula: ValvulaPropelente; }

/** Conexão material entre tanque e bomba; rompe se a geometria exceder o alcance. */
export class LinhaDePropelente {
  private rompida = false;
  private desconectadaManualmente = false;
  private vazaoAtualCalculadaKgS = 0;
  /** Valida id, compatibilidade do propelente com tanque, comprimento m e vazão kg/s positivos finitos; não transfere fluido na construção. @contract f-e6203b52037d845b @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoLinhaDePropelente) {
    if (!definicao.id || definicao.tanque.tipoPropelente !== definicao.tipoPropelente || !Number.isFinite(definicao.comprimentoMaximoM) || definicao.comprimentoMaximoM <= 0 || !Number.isFinite(definicao.vazaoMaximaKgS) || definicao.vazaoMaximaKgS <= 0) throw new Error('Definição de linha de propelente inválida.');
  }
  /** Devolve `this.rompida`. Efeitos indiretos seguem as dependências chamadas. @contract f-a48dac5eb53936b1 */
  public get estaRompida(): boolean { return this.rompida; }
  /** A desconexão comandada preserva o tanque, mas remove sua alimentação.
   * @contract f-ad3cf00ed2b4b652
   */
  public get estaDesconectada(): boolean { return this.desconectadaManualmente; }
  /** Devolve `this.rompida || this.desconectadaManualmente`. Efeitos indiretos seguem as dependências chamadas. @contract f-0aef75929ce4fe71 */
  public get estaIndisponivel(): boolean { return this.rompida || this.desconectadaManualmente; }
  /** Devolve `this.vazaoAtualCalculadaKgS`. Efeitos indiretos seguem as dependências chamadas. @contract f-91cff4f699720426 */
  public get vazaoAtualKgS(): number { return this.vazaoAtualCalculadaKgS; }
  /** Devolve `this.definicao.tanque.massaPropelenteKg`. Efeitos indiretos seguem as dependências chamadas. @contract f-422ba07ba3513e30 */
  public get massaDisponivelKg(): number { return this.definicao.tanque.massaPropelenteKg; }
  /** Zera diagnóstico de vazão instantânea antes do próximo consumo; não repõe propelente. @contract f-cf850328b8993300 @reviewed M12-DOC: implementação lida. */
  public prepararPasso(): void { this.vazaoAtualCalculadaKgS = 0; }
  /** Consulta os limites reais antes de retirar material do tanque.
   * @contract f-fb258e04e0c329f6
   */
  public obterMassaFornecivelKg(dtS: number, posicaoConsumidorM: Vetor3): number {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo da linha deve ser positivo e finito.');
    this.verificarIntegridade(posicaoConsumidorM);
    if (this.estaIndisponivel) return 0;
    return Math.min(this.massaDisponivelKg,
      this.definicao.vazaoMaximaKgS * dtS, this.definicao.valvula.obterVazaoMaximaKgS() * dtS);
  }
  /** Comando de throttle aplicado à válvula desta linha.
   * @contract f-fd9fae67e703ae40
   */
  public definirAberturaDaValvula(abertura: number): void { this.definicao.valvula.definirAbertura(abertura); }
  /** Desacoplamento físico irreversível da linha neste cenário.
   * @contract f-ea75fd8bfdb5505c
   */
  public desconectar(): void {
    this.desconectadaManualmente = true;
    this.vazaoAtualCalculadaKgS = 0;
  }
  /** Falha física irreversível da mangueira, por ruptura ou soltura do encaixe.
   * @contract f-17f175959e1b3faa
   */
  public romper(): void {
    this.rompida = true;
    this.vazaoAtualCalculadaKgS = 0;
  }
  /** Atualiza a ruptura geométrica antes de qualquer bomba consumir energia.
   * @contract f-2871fdf3ca2583c4
   */
  public verificarIntegridade(posicaoConsumidorM: Vetor3): void {
    const distanciaM = this.definicao.tanque.getEstadoFisico().posicaoM.subtrair(posicaoConsumidorM).magnitude;
    if (distanciaM > this.definicao.comprimentoMaximoM) this.romper();
  }
  /** Zera vazão anterior, valida pedido kg/dt s e verifica integridade pela posição do consumidor. Limita entrega pela linha/válvula, consome tanque e registra vazão fornecida/dt; indisponibilidade retorna zero. @contract f-7a957cfc1c7f6f30 @reviewed M12-DOC: implementação lida. */
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
