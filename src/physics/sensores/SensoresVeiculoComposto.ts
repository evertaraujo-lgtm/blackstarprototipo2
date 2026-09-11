import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

export interface LeiturasVeiculoComposto {
  readonly posicaoGpsM: Vetor3;
  readonly altitudeM: number;
  readonly velocidadeVerticalMps: number;
  readonly velocidadeHorizontalMps: number;
  readonly inclinacaoRad: number;
}

/** GPS idealizado: a posição vem diretamente do estado físico do core. */
export class GpsIdealizado {
  public constructor(private readonly objeto: Objeto) {}

  public obterPosicaoM(): Vetor3 {
    return this.objeto.getEstadoFisico().posicaoM;
  }
}

/** Sensor interno de nível: lê a orientação física real do casco. */
export class SensorNivelInterno {
  public constructor(private readonly objeto: Objeto) {}

  public obterInclinacaoRad(): number {
    const orientacaoRad = this.objeto.getEstadoFisico().orientacaoRad.z;
    return Math.atan2(Math.sin(orientacaoRad), Math.cos(orientacaoRad));
  }
}

/** Instrumentação do casco, atualizada pelo MundoFisico após cada passo. */
export class SensoresVeiculoComposto {
  public readonly gps: GpsIdealizado;
  public readonly nivel: SensorNivelInterno;
  private posicaoGpsAnteriorM?: Vetor3;
  private leiturasAtuais: LeiturasVeiculoComposto;

  public constructor(objeto: Objeto, altitudeDeReferenciaM = 0) {
    if (!Number.isFinite(altitudeDeReferenciaM)) throw new Error('Altitude de referência deve ser finita.');
    this.gps = new GpsIdealizado(objeto);
    this.nivel = new SensorNivelInterno(objeto);
    const posicaoInicialM = this.gps.obterPosicaoM();
    this.leiturasAtuais = {
      posicaoGpsM: posicaoInicialM,
      altitudeM: posicaoInicialM.y - altitudeDeReferenciaM,
      velocidadeVerticalMps: 0,
      velocidadeHorizontalMps: 0,
      inclinacaoRad: this.nivel.obterInclinacaoRad(),
    };
    this.altitudeDeReferenciaM = altitudeDeReferenciaM;
  }

  private readonly altitudeDeReferenciaM: number;

  public atualizar(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo dos sensores deve ser positivo e finito.');
    const posicaoAtualM = this.gps.obterPosicaoM();
    const posicaoAnteriorM = this.posicaoGpsAnteriorM;
    this.leiturasAtuais = {
      posicaoGpsM: posicaoAtualM,
      altitudeM: posicaoAtualM.y - this.altitudeDeReferenciaM,
      velocidadeVerticalMps: posicaoAnteriorM ? (posicaoAtualM.y - posicaoAnteriorM.y) / dtS : 0,
      velocidadeHorizontalMps: posicaoAnteriorM ? (posicaoAtualM.x - posicaoAnteriorM.x) / dtS : 0,
      inclinacaoRad: this.nivel.obterInclinacaoRad(),
    };
    this.posicaoGpsAnteriorM = posicaoAtualM;
  }

  public obterLeituras(): LeiturasVeiculoComposto {
    return { ...this.leiturasAtuais, posicaoGpsM: this.leiturasAtuais.posicaoGpsM };
  }
}
