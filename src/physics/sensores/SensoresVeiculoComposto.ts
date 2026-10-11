import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

export interface LeiturasVeiculoComposto {
  readonly posicaoGpsM: Vetor3;
  readonly altitudeM: number;
  readonly velocidadeVerticalMps: number;
  readonly velocidadeHorizontalMps: number;
  readonly inclinacaoRad: number;
  readonly velocidadeAngularRadps?: number;
  /** Massa instantânea do conjunto conectado, quando fornecida pelo veículo. */
  readonly massaInstantaneaKg?: number;
  /** Instante simulado da amostra física que originou as leituras. */
  readonly tempoAmostraS?: number;
  /** Idade da amostra no instante da consulta, em segundos simulados. */
  readonly idadeLeituraS?: number;
  /** Fica falso quando a amostra excede o limite de idade ou contém dado inválido. */
  readonly sensoresValidos?: boolean;
}

export type FalhaSensorVeiculo =
  | { readonly tipo: 'congelado'; readonly iniciarEmS: number }
  | { readonly tipo: 'atraso'; readonly iniciarEmS: number; readonly atrasoS: number }
  | { readonly tipo: 'desvio'; readonly iniciarEmS: number; readonly altitudeM?: number; readonly velocidadeVerticalMps?: number };

export const IDADE_MAXIMA_LEITURA_SENSOR_S = 0.25;

interface AmostraFisica extends LeiturasVeiculoComposto {
  readonly tempoAmostraS: number;
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
  private leiturasAtuais: LeiturasVeiculoComposto;
  private tempoSimuladoS = 0;
  private readonly historicoAmostras: AmostraFisica[] = [];
  private falhaInjetada?: FalhaSensorVeiculo;

  public constructor(
    private readonly objeto: Objeto,
    altitudeDeReferenciaM = 0,
    private readonly obterMassaInstantaneaKg: () => number = () => objeto.massaKg,
  ) {
    if (!Number.isFinite(altitudeDeReferenciaM)) throw new Error('Altitude de referência deve ser finita.');
    this.gps = new GpsIdealizado(objeto);
    this.nivel = new SensorNivelInterno(objeto);
    const posicaoInicialM = this.gps.obterPosicaoM();
    const velocidadeInicialMps = objeto.getEstadoFisico().velocidadeMps;
    this.leiturasAtuais = {
      posicaoGpsM: posicaoInicialM,
      altitudeM: posicaoInicialM.y - altitudeDeReferenciaM,
      velocidadeVerticalMps: velocidadeInicialMps.y,
      velocidadeHorizontalMps: velocidadeInicialMps.x,
      inclinacaoRad: this.nivel.obterInclinacaoRad(),
      velocidadeAngularRadps: objeto.getEstadoFisico().velocidadeAngularRadps.z,
      massaInstantaneaKg: this.obterMassaInstantaneaKg(),
      tempoAmostraS: 0,
      idadeLeituraS: 0,
      sensoresValidos: true,
    };
    this.historicoAmostras.push({ ...this.leiturasAtuais, tempoAmostraS: 0 });
    this.altitudeDeReferenciaM = altitudeDeReferenciaM;
  }

  private readonly altitudeDeReferenciaM: number;

  public atualizar(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo dos sensores deve ser positivo e finito.');
    this.tempoSimuladoS += dtS;
    const posicaoAtualM = this.gps.obterPosicaoM();
    const velocidadeAtualMps = this.gpsObjeto.getEstadoFisico().velocidadeMps;
    const amostraAtual: AmostraFisica = {
      posicaoGpsM: posicaoAtualM,
      altitudeM: posicaoAtualM.y - this.altitudeDeReferenciaM,
      velocidadeVerticalMps: velocidadeAtualMps.y,
      velocidadeHorizontalMps: velocidadeAtualMps.x,
      inclinacaoRad: this.nivel.obterInclinacaoRad(),
      velocidadeAngularRadps: this.objeto.getEstadoFisico().velocidadeAngularRadps.z,
      massaInstantaneaKg: this.obterMassaInstantaneaKg(),
      tempoAmostraS: this.tempoSimuladoS,
    };
    this.historicoAmostras.push(amostraAtual);
    while (this.historicoAmostras.length > 1
      && this.historicoAmostras[1]!.tempoAmostraS < this.tempoSimuladoS - 60) this.historicoAmostras.shift();

    const falhaAtiva = this.falhaInjetada && this.tempoSimuladoS >= this.falhaInjetada.iniciarEmS
      ? this.falhaInjetada : undefined;
    let amostraEntregue = amostraAtual;
    if (falhaAtiva?.tipo === 'congelado') {
      amostraEntregue = this.obterUltimaAmostraAte(falhaAtiva.iniciarEmS);
    } else if (falhaAtiva?.tipo === 'atraso') {
      const instanteDesejadoS = this.tempoSimuladoS - falhaAtiva.atrasoS;
      amostraEntregue = this.obterUltimaAmostraAte(instanteDesejadoS);
    }
    const idadeLeituraS = this.tempoSimuladoS - amostraEntregue.tempoAmostraS;
    const leiturasComDesvio = falhaAtiva?.tipo === 'desvio'
      ? {
        ...amostraEntregue,
        altitudeM: amostraEntregue.altitudeM + (falhaAtiva.altitudeM ?? 0),
        velocidadeVerticalMps: amostraEntregue.velocidadeVerticalMps + (falhaAtiva.velocidadeVerticalMps ?? 0),
      }
      : amostraEntregue;
    this.leiturasAtuais = {
      ...leiturasComDesvio,
      tempoAmostraS: amostraEntregue.tempoAmostraS,
      idadeLeituraS,
      sensoresValidos: idadeLeituraS <= IDADE_MAXIMA_LEITURA_SENSOR_S
        && [leiturasComDesvio.altitudeM, leiturasComDesvio.velocidadeVerticalMps,
          leiturasComDesvio.velocidadeHorizontalMps, leiturasComDesvio.inclinacaoRad,
          leiturasComDesvio.velocidadeAngularRadps ?? 0, leiturasComDesvio.massaInstantaneaKg ?? 0,
          leiturasComDesvio.posicaoGpsM.x, leiturasComDesvio.posicaoGpsM.y,
          leiturasComDesvio.posicaoGpsM.z].every(Number.isFinite),
    };
  }

  /** Injeta uma falha determinística usando somente tempo de missão. */
  public injetarFalha(falha: FalhaSensorVeiculo): void {
    const valores = falha.tipo === 'atraso'
      ? [falha.iniciarEmS, falha.atrasoS]
      : falha.tipo === 'desvio'
        ? [falha.iniciarEmS, falha.altitudeM ?? 0, falha.velocidadeVerticalMps ?? 0]
        : [falha.iniciarEmS];
    if (!valores.every(Number.isFinite) || falha.iniciarEmS < this.tempoSimuladoS
      || (falha.tipo === 'atraso' && (falha.atrasoS <= 0 || falha.atrasoS > 60))) {
      throw new Error('Configuração inválida para falha de sensor.');
    }
    this.falhaInjetada = { ...falha };
  }

  public limparFalhaInjetada(): void { this.falhaInjetada = undefined; }

  private obterUltimaAmostraAte(tempoS: number): AmostraFisica {
    for (let indice = this.historicoAmostras.length - 1; indice >= 0; indice -= 1) {
      const amostra = this.historicoAmostras[indice]!;
      if (amostra.tempoAmostraS <= tempoS) return amostra;
    }
    return this.historicoAmostras[0]!;
  }

  private get gpsObjeto(): Objeto {
    // O GPS expõe posição por interface; a velocidade permanece sob autoridade
    // do mesmo objeto físico e não deve ser reconstruída por diferença finita.
    return this.objeto;
  }

  public obterLeituras(): LeiturasVeiculoComposto {
    return {
      ...this.leiturasAtuais,
      posicaoGpsM: this.leiturasAtuais.posicaoGpsM,
      massaInstantaneaKg: this.obterMassaInstantaneaKg(),
    };
  }
}
