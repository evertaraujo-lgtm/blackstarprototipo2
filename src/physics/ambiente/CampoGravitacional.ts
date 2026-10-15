import { Vetor3 } from '../Vetor3';

/** Constantes de referência; g0 de Isp não é a gravidade superficial μ/R². */
export const TERRA = Object.freeze({ raioM: 6_371_000, muM3S2: 3.986004418e14, g0Mps2: 9.80665 });

export interface CampoGravitacional {
  readonly modelo: 'uniforme' | 'central';
  /** Consulta aceleração gravitacional global em m/s² para posição m, independente de orientação/massa do corpo; singularidades devem ser rejeitadas pelo modelo. @contract f-d84e2f25e040d596 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  aceleracaoEm(posicaoM: Vetor3): Vetor3;
  /** Expõe identificação/constantes do campo para reprodução e diagnóstico, sem integrar estado. @contract f-e3c512cd6c35448a @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  obterConfiguracao(): object;
}

export class CampoUniforme implements CampoGravitacional {
  public readonly modelo = 'uniforme';
  /** Armazena a aceleração prescrita em m/s²; o padrão usa −g₀ em Y, independentemente da posição. @contract f-e6be7e2b746bc751 @reviewed M12-DOC: implementação lida. */
  public constructor(public readonly aceleracaoMps2 = new Vetor3(0, -TERRA.g0Mps2, 0)) {}
  /** Devolve o mesmo vetor prescrito em m/s²; ignora a posição, sem integrar corpos. @contract f-94e4c79d20170738 @reviewed M12-DOC: implementação lida. */
  public aceleracaoEm(_posicaoM: Vetor3): Vetor3 { return this.aceleracaoMps2; }
  /** Exporta modelo e aceleração prescrita para identificação física de diários. @contract f-132473929223783f @reviewed M12-DOC: implementação lida. */
  public obterConfiguracao(): object { return { modelo: this.modelo, aceleracaoMps2: this.aceleracaoMps2 }; }
}

/** Campo pontual exterior. Não regulariza o centro nem modela o interior planetário. */
export class CampoCentral implements CampoGravitacional {
  public readonly modelo = 'central';
  /** Define centro inercial em m e μ em m³/s²; exige μ finito e positivo. Não ajusta μ para coincidir com g₀. @contract f-9ba11d917192cfa4 @reviewed M12-DOC: implementação lida. */
  public constructor(
    public readonly centroM = new Vetor3(0, -TERRA.raioM, 0),
    public readonly muM3S2: number = TERRA.muM3S2,
  ) {
    if (!Number.isFinite(muM3S2) || muM3S2 <= 0) throw new Error('μ deve ser positivo e finito em m³/s².');
  }
  /** Calcula −μr/|r|³ em m/s², r=p−C, normalizando antes dos produtos para evitar overflow. Posição em m, r não nulo; lança erro para singularidade/resultado não finito. Campo pontual exterior, sem modelo do interior planetário. Aceleração independe de massa e orientação; não integra nem altera corpos. @contract f-987c8bfdf6e3fd0c @reviewed M12-DOC: implementação lida. */
  public aceleracaoEm(posicaoM: Vetor3): Vetor3 {
    const r = posicaoM.subtrair(this.centroM);
    const distanciaM = r.magnitude;
    if (distanciaM === 0 || !Number.isFinite(distanciaM)) throw new Error('Posição singular ou não finita no campo central.');
    // Normalização antes do produto evita formar |r|³, que pode transbordar.
    const intensidade = this.muM3S2 / distanciaM / distanciaM;
    if (!Number.isFinite(intensidade)) throw new Error('Aceleração central fora do domínio numérico.');
    return r.multiplicar(1 / distanciaM).multiplicar(-intensidade);
  }
  /** Exporta centro e μ, sem recalcular ou ajustar constantes físicas. @contract f-fa1e625d17e509e6 @reviewed M12-DOC: implementação lida. */
  public obterConfiguracao(): object { return { modelo: this.modelo, centroM: this.centroM, muM3S2: this.muM3S2 }; }
}
