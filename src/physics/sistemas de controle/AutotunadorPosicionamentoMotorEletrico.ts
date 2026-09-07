import type {
  GanhosControladorPosicionamentoMotorEletrico,
  ModeloAutotunePosicionamentoMotorEletrico,
  ControladorPosicionamentoMotorEletrico,
} from './ControladorPosicionamentoMotorEletrico';

export interface ProgressoAutotunePosicionamentoMotorEletrico {
  readonly percentual: number;
  readonly candidatosAvaliados: number;
  readonly candidatosTotais: number;
}

export interface ResultadoAutotunePosicionamentoMotorEletrico {
  readonly ganhos: GanhosControladorPosicionamentoMotorEletrico;
  readonly custo: number;
}

/** Busca ganhos por simulação determinística do conjunto rotacional, sem renderização. */
export class AutotunadorPosicionamentoMotorEletrico {
  public constructor(private readonly controlador: ControladorPosicionamentoMotorEletrico) {}

  public async executar(onProgress?: (progresso: ProgressoAutotunePosicionamentoMotorEletrico) => void): Promise<ResultadoAutotunePosicionamentoMotorEletrico> {
    const modelo = this.controlador.obterModeloParaAutotune();
    const candidatos = this.criarCandidatos(modelo);
    let melhor: ResultadoAutotunePosicionamentoMotorEletrico | undefined;
    for (let indice = 0; indice < candidatos.length; indice += 1) {
      const ganhos = candidatos[indice];
      const custo = this.simular(modelo, ganhos);
      if (!melhor || custo < melhor.custo) melhor = { ganhos, custo };
      onProgress?.({ percentual: ((indice + 1) / candidatos.length) * 100, candidatosAvaliados: indice + 1, candidatosTotais: candidatos.length });
      if (indice % 8 === 0) await new Promise<void>((resolver) => setTimeout(resolver, 0));
    }
    if (!melhor) throw new Error('Autotune não gerou candidatos.');
    this.controlador.aplicarGanhos(melhor.ganhos);
    return melhor;
  }

  private criarCandidatos(modelo: ModeloAutotunePosicionamentoMotorEletrico): GanhosControladorPosicionamentoMotorEletrico[] {
    const frequenciaNatural = Math.sqrt(Math.max(0.05, modelo.torqueMaximoNm / modelo.momentoInerciaKgM2)) * 0.35;
    const proporcional = [0.6, 1, 1.4, 1.8].map((fator) => modelo.momentoInerciaKgM2 * frequenciaNatural ** 2 * fator);
    const derivativo = [0.25, 0.45, 0.65].map((fator) => 2 * Math.sqrt(modelo.momentoInerciaKgM2 * proporcional[1]) * fator);
    const integral = [0, 0.01, 0.03];
    return proporcional.flatMap((ganhoProporcional) => derivativo.flatMap((ganhoDerivativo) => integral.map((fatorIntegral) => ({
      ganhoProporcional,
      ganhoIntegral: ganhoProporcional * fatorIntegral,
      ganhoDerivativo,
    }))));
  }

  private simular(modelo: ModeloAutotunePosicionamentoMotorEletrico, ganhos: GanhosControladorPosicionamentoMotorEletrico): number {
    const dtS = 1 / 240;
    const duracaoS = 4;
    const alvoRad = Math.PI / 4;
    let anguloRad = 0;
    let velocidadeRadps = 0;
    let velocidadeAlvoRadps = 0;
    let integralErroRadS = 0;
    let custo = 0;
    let picoErro = 0;
    for (let tempoS = 0; tempoS < duracaoS; tempoS += dtS) {
      const erroRad = alvoRad - anguloRad;
      const velocidadeDesejada = Math.max(-modelo.velocidadeAngularMaximaRadps, Math.min(modelo.velocidadeAngularMaximaRadps, erroRad * 4));
      const variacaoMaxima = modelo.aceleracaoMaximaRadps2 * dtS;
      velocidadeAlvoRadps += Math.max(-variacaoMaxima, Math.min(variacaoMaxima, velocidadeDesejada - velocidadeAlvoRadps));
      const erroVelocidade = velocidadeAlvoRadps - velocidadeRadps;
      integralErroRadS = Math.max(-10, Math.min(10, integralErroRadS + erroRad * dtS));
      const torqueSolicitado = ganhos.ganhoProporcional * erroRad + ganhos.ganhoIntegral * integralErroRadS + ganhos.ganhoDerivativo * erroVelocidade + modelo.torqueGravitacionalNm;
      const torque = Math.max(-modelo.torqueMaximoNm, Math.min(modelo.torqueMaximoNm, torqueSolicitado));
      const aceleracao = torque / modelo.momentoInerciaKgM2;
      velocidadeRadps += aceleracao * dtS;
      anguloRad += velocidadeRadps * dtS;
      picoErro = Math.max(picoErro, Math.abs(erroRad));
      custo += erroRad ** 2 * dtS + Math.abs(torque) * 0.00001 * dtS;
      if (!Number.isFinite(anguloRad) || Math.abs(anguloRad) > Math.PI * 8) return Number.POSITIVE_INFINITY;
    }
    return custo + picoErro * 0.1 + Math.abs(alvoRad - anguloRad) * 10;
  }
}
