import { Objeto, type DefinicaoObjeto } from '../objetos/base/Objeto';

export interface DefinicaoControladorPosicionamentoMotorEletrico extends DefinicaoObjeto {
  readonly obterAnguloAtualRad: /** Consulta ângulo físico atual em rad da planta controlada; não devolve alvo como se fosse posição real. @contract f-093ae6a77da90e61 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => number;
  readonly obterVelocidadeAngularRadps: /** Consulta taxa angular real em rad/s para realimentação do servo. @contract f-471639ed10d5c1fd @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => number;
  readonly torqueMaximoNm: number;
  readonly velocidadeAngularMaximaRadps: number;
  readonly aceleracaoMaximaRadps2: number;
  readonly ganhoProporcional?: number;
  readonly ganhoIntegral?: number;
  readonly ganhoDerivativo?: number;
  readonly anguloInicialRad?: number;
  readonly obterTorqueGravitacionalNm?: /** Consulta torque de compensação gravitacional em N·m da montagem para feedforward; mecanismo de bancada usa hipótese de peso local declarada. @contract f-e0f53d21da0ebec7 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => number;
  readonly obterMomentoInerciaControladoKgM2?: /** Consulta inércia composta em kg·m² da planta controlada em torno do pivô; deve ser positiva/finita, não apenas massa do motor. @contract f-bdbfd3326e6bad39 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => number;
}

export interface GanhosControladorPosicionamentoMotorEletrico {
  readonly ganhoProporcional: number;
  readonly ganhoIntegral: number;
  readonly ganhoDerivativo: number;
}

export interface ModeloAutotunePosicionamentoMotorEletrico {
  readonly momentoInerciaKgM2: number;
  readonly torqueMaximoNm: number;
  readonly velocidadeAngularMaximaRadps: number;
  readonly aceleracaoMaximaRadps2: number;
  readonly torqueGravitacionalNm: number;
}

/** Controle PID de posição para um atuador rotacional elétrico. */
export class ControladorPosicionamentoMotorEletrico extends Objeto {
  protected readonly configuracaoControle: DefinicaoControladorPosicionamentoMotorEletrico;
  private anguloAlvoInternoRad: number;
  private velocidadeAlvoAtualRadps = 0;
  private integralErroRadS = 0;
  private aceleracaoMaximaAtualRadps2: number;
  private ganhosAtuais: GanhosControladorPosicionamentoMotorEletrico;

  /** Inicializa motor base, valida limites positivos finitos SI e ganhos PID não negativos; guarda portas de leitura, alvo angular e memória de velocidade/integral. @contract f-d683e74f10cb066b @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoControladorPosicionamentoMotorEletrico) {
    super(definicao);
    if (!Number.isFinite(definicao.torqueMaximoNm) || definicao.torqueMaximoNm <= 0 ||
      !Number.isFinite(definicao.velocidadeAngularMaximaRadps) || definicao.velocidadeAngularMaximaRadps <= 0 ||
      !Number.isFinite(definicao.aceleracaoMaximaRadps2) || definicao.aceleracaoMaximaRadps2 <= 0) {
      throw new Error('Limites do controlador de posição devem ser positivos e finitos.');
    }
    const ganhos = [definicao.ganhoProporcional ?? 2_000, definicao.ganhoIntegral ?? 20, definicao.ganhoDerivativo ?? 500];
    if (!ganhos.every(Number.isFinite) || ganhos.some((ganho) => ganho < 0)) throw new Error('Ganhos PID devem ser finitos e não negativos.');
    this.configuracaoControle = definicao;
    this.anguloAlvoInternoRad = definicao.anguloInicialRad ?? 0;
    this.aceleracaoMaximaAtualRadps2 = definicao.aceleracaoMaximaRadps2;
    this.ganhosAtuais = { ganhoProporcional: ganhos[0], ganhoIntegral: ganhos[1], ganhoDerivativo: ganhos[2] };
  }

  /** Devolve `this.anguloAlvoInternoRad`. Efeitos indiretos seguem as dependências chamadas. @contract f-820a5be4106c3641 */
  public get anguloAlvoRelativoRad(): number { return this.anguloAlvoInternoRad; }
  /** Devolve `this.configuracaoControle.obterAnguloAtualRad()`. Dependências diretas: `this.configuracaoControle.obterAnguloAtualRad`. Efeitos indiretos seguem as dependências chamadas. @contract f-9d96755da4da0ca9 */
  public obterAnguloAtualRad(): number { return this.configuracaoControle.obterAnguloAtualRad(); }
  /** Devolve `{ ...this.ganhosAtuais }`. Efeitos indiretos seguem as dependências chamadas. @contract f-6a4b43f50e27848f */
  public get ganhos(): GanhosControladorPosicionamentoMotorEletrico { return { ...this.ganhosAtuais }; }
  /** Devolve `this.aceleracaoMaximaAtualRadps2`. Efeitos indiretos seguem as dependências chamadas. @contract f-eed9746b8b2d69d9 */
  public get aceleracaoMaximaRadps2(): number { return this.aceleracaoMaximaAtualRadps2; }

  /** Valida limite positivo finito rad/s², substitui configuração operacional e zera memória do controlador. @contract f-d488df7b4a1b85c9 @reviewed M12-DOC: implementação lida. */
  public definirAceleracaoMaximaRadps2(aceleracaoRadps2: number): void {
    if (!Number.isFinite(aceleracaoRadps2) || aceleracaoRadps2 <= 0) throw new Error('Aceleração máxima deve ser positiva e finita.');
    this.aceleracaoMaximaAtualRadps2 = aceleracaoRadps2;
    this.zerarEstadoDoControlador();
  }

  /** Lê inércia controlada ou inércia Z própria, limites e torque gravitacional da porta; rejeita inércia não positiva/não finita. Retorna modelo auxiliar sem executar dinâmica; finitude do torque não é verificada aqui. @contract f-2da9b7e6cac3c1da @reviewed M12-DOC: implementação lida. */
  public obterModeloParaAutotune(): ModeloAutotunePosicionamentoMotorEletrico {
    const inercia = this.configuracaoControle.obterMomentoInerciaControladoKgM2?.() ?? this.getMomentoInerciaKgM2().z;
    const torqueGravitacionalNm = this.configuracaoControle.obterTorqueGravitacionalNm?.() ?? 0;
    if (!Number.isFinite(inercia) || inercia <= 0) throw new Error('Momento de inércia inválido para autotune.');
    return {
      momentoInerciaKgM2: inercia,
      torqueMaximoNm: this.configuracaoControle.torqueMaximoNm,
      velocidadeAngularMaximaRadps: this.configuracaoControle.velocidadeAngularMaximaRadps,
      aceleracaoMaximaRadps2: this.aceleracaoMaximaAtualRadps2,
      torqueGravitacionalNm,
    };
  }

  /** Valida ganhos PID não negativos finitos, copia valores e reinicia memória; não comanda pose. @contract f-ac364057ee333075 @reviewed M12-DOC: implementação lida. */
  public aplicarGanhos(ganhos: GanhosControladorPosicionamentoMotorEletrico): void {
    if (![ganhos.ganhoProporcional, ganhos.ganhoIntegral, ganhos.ganhoDerivativo].every(Number.isFinite) ||
      ganhos.ganhoProporcional < 0 || ganhos.ganhoIntegral < 0 || ganhos.ganhoDerivativo < 0) {
      throw new Error('Ganhos do controlador devem ser finitos e não negativos.');
    }
    this.ganhosAtuais = { ...ganhos };
    this.zerarEstadoDoControlador();
  }

  /** Armazena alvo finito em rad sem normalização periódica; não altera ângulo real. @contract f-0d510d2ae0c47850 @reviewed M12-DOC: implementação lida. */
  public definirAnguloAlvoRad(anguloRad: number): void {
    if (!Number.isFinite(anguloRad)) throw new Error('Angulo alvo do controlador deve ser finito.');
    this.anguloAlvoInternoRad = anguloRad;
  }

  /** Para dt positivo finito, calcula erro angular e velocidade-alvo limitada em módulo e aceleração; combina P/I e erro de velocidade com feedforward gravitacional. Limita torque N·m e reverte integral quando saturado. Retorna solicitação ao motor, sem integrar cinemática. @contract f-6c76c654aa9d1fb8 @reviewed M12-DOC: implementação lida. */
  protected calcularTorqueDePosicao(dtS: number): number {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo do controlador deve ser positivo e finito.');
    const erroRad = this.anguloAlvoInternoRad - this.configuracaoControle.obterAnguloAtualRad();
    const velocidadeAlvoDesejada = Math.max(-this.configuracaoControle.velocidadeAngularMaximaRadps, Math.min(this.configuracaoControle.velocidadeAngularMaximaRadps, erroRad * 4));
    const variacaoMaximaRadps = this.aceleracaoMaximaAtualRadps2 * dtS;
    this.velocidadeAlvoAtualRadps += Math.max(-variacaoMaximaRadps, Math.min(variacaoMaximaRadps, velocidadeAlvoDesejada - this.velocidadeAlvoAtualRadps));
    const erroVelocidadeRadPorS = this.velocidadeAlvoAtualRadps - this.configuracaoControle.obterVelocidadeAngularRadps();
    const integralAnterior = this.integralErroRadS;
    this.integralErroRadS += erroRad * dtS;
    const { ganhoProporcional, ganhoIntegral, ganhoDerivativo } = this.ganhosAtuais;
    const torqueFeedforwardNm = this.configuracaoControle.obterTorqueGravitacionalNm?.() ?? 0;
    if (!Number.isFinite(torqueFeedforwardNm)) throw new Error('Torque gravitacional do controlador deve ser finito.');
    const solicitadoNm = erroRad * ganhoProporcional + this.integralErroRadS * ganhoIntegral + erroVelocidadeRadPorS * ganhoDerivativo + torqueFeedforwardNm;
    const torqueLimitadoNm = Math.max(-this.configuracaoControle.torqueMaximoNm, Math.min(this.configuracaoControle.torqueMaximoNm, solicitadoNm));
    if (torqueLimitadoNm !== solicitadoNm) this.integralErroRadS = integralAnterior;
    return torqueLimitadoNm;
  }

  /** Zera velocidade-alvo filtrada e integral de erro angular, preservando alvo e ganhos. @contract f-8f384250ec04088c @reviewed M12-DOC: implementação lida. */
  protected zerarEstadoDoControlador(): void {
    this.velocidadeAlvoAtualRadps = 0;
    this.integralErroRadS = 0;
  }
}
