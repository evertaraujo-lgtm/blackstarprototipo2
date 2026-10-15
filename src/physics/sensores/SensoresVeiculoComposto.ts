import { AmbientePlano, type AmbienteFisico } from '../ambiente/AmbienteFisico';
import type { ReferencialFisico } from '../ambiente/ReferencialFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

export interface LeiturasVeiculoComposto {
  readonly posicaoGpsM: Vetor3;
  readonly posicaoHorizontalM?: number;
  readonly orientacaoInercialRad?: number;
  readonly velocidadeAngularInercialRadps?: number;
  readonly gravidadeLocalMps2?: number;
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
  /** Instala referência ao corpo observado; não possui trajetória própria. @contract f-1a302daca133db57 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly objeto: Objeto) {}

  /** Devolve posição global m do estado físico real, sem integração ou correção pelo sensor. @contract f-9cf48d4edb4f35a7 @reviewed M12-DOC: implementação lida. */
  public obterPosicaoM(): Vetor3 {
    return this.objeto.getEstadoFisico().posicaoM;
  }
}

/** Sensor interno de nível: lê a orientação física real do casco. */
export class SensorNivelInterno {
  /** Instala corpo e consulta opcional do referencial compartilhado, sem controlar atitude. @contract f-39802fbd795562d3 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly objeto: Objeto, private readonly obterReferencial?: () => ReferencialFisico) {}

  /** Lê atitude física Z e converte para vertical local quando há referencial; fallback normaliza ângulo inercial em rad. @contract f-421bc954b8ea55a0 @reviewed M12-DOC: implementação lida. */
  public obterInclinacaoRad(): number {
    const orientacaoRad = this.objeto.getEstadoFisico().orientacaoRad.z;
    return this.obterReferencial ? this.obterReferencial().atitudeLocalRad(orientacaoRad, this.objeto.getEstadoFisico().posicaoM)
      : Math.atan2(Math.sin(orientacaoRad), Math.cos(orientacaoRad));
  }
}

/** Instrumentação do casco, atualizada pelo MundoFisico após cada passo. */
export class SensoresVeiculoComposto {
  public readonly gps: GpsIdealizado;
  public readonly nivel: SensorNivelInterno;
  private leiturasAtuais: LeiturasVeiculoComposto;
  private tempoSimuladoS = 0;
  private readonly historicoAmostras: AmostraFisica[] = [];
  private ambiente: AmbienteFisico = new AmbientePlano();
  private inicioHistorico = 0;
  private amostraCongelada?: AmostraFisica;
  private falhaInjetada?: FalhaSensorVeiculo;

  /** Compõe GPS/nível do corpo, referência de altitude m e consulta de massa instantânea kg; cria primeira amostra no tempo simulado zero. @contract f-b51f721319e5a507 @reviewed M12-DOC: implementação lida. */
  public constructor(
    private readonly objeto: Objeto,
    private readonly altitudeDeReferenciaM = 0,
    private readonly obterMassaInstantaneaKg: () => number = /** Devolve `objeto.massaKg`. Efeitos indiretos seguem as dependências chamadas. @contract f-287b6ae924dd35f7 */
                                                             () => objeto.massaKg,
  ) {
    if (!Number.isFinite(altitudeDeReferenciaM)) throw new Error('Altitude de referência deve ser finita.');
    this.gps = new GpsIdealizado(objeto);
    this.nivel = new SensorNivelInterno(objeto, () => this.ambiente.referencial);
    this.leiturasAtuais = { ...this.criarAmostra(), idadeLeituraS: 0, sensoresValidos: true };
    this.historicoAmostras.push({ ...this.leiturasAtuais, tempoAmostraS: 0 });
  }

  /** O mundo injeta o referencial uma única vez antes de evoluir os sensores.
   * @contract f-a1551850db14bcab
   */
  public configurarAmbienteInicial(ambiente: AmbienteFisico): void {
    if (this.tempoSimuladoS !== 0) throw new Error('Não é permitido trocar o modelo de sensores durante a missão.');
    this.ambiente = ambiente;
    this.leiturasAtuais = { ...this.criarAmostra(), idadeLeituraS: 0, sensoresValidos: true };
    this.historicoAmostras.length = 0;
    this.inicioHistorico = 0;
    this.historicoAmostras.push({ ...this.leiturasAtuais, tempoAmostraS: 0 });
  }

  /** Deriva posição m, altitude relativa m, componentes locais m/s, atitudes rad, taxas rad/s, gravidade m/s² e massa kg pelo ambiente compartilhado; usa somente estado observado. @contract f-39201031d7e41dd5 @reviewed M12-DOC: implementação lida. */
  private criarAmostra(): AmostraFisica {
    const e = this.objeto.getEstadoFisico();
    const ref = this.ambiente.referencial;
    const local = ref.vetorParaLocal(e.velocidadeMps, e.posicaoM);
    return {
      posicaoGpsM: e.posicaoM,
      altitudeM: ref.altitudeGeometricaM(e.posicaoM) - this.altitudeDeReferenciaM,
      posicaoHorizontalM: ref.posicaoHorizontalM(e.posicaoM),
      velocidadeVerticalMps: local.y, velocidadeHorizontalMps: local.x,
      inclinacaoRad: this.nivel.obterInclinacaoRad(),
      orientacaoInercialRad: e.orientacaoRad.z,
      velocidadeAngularRadps: ref.taxaAtitudeLocalRadps(e.velocidadeAngularRadps.z, e.posicaoM, e.velocidadeMps),
      velocidadeAngularInercialRadps: e.velocidadeAngularRadps.z,
      gravidadeLocalMps2: this.ambiente.campo.aceleracaoEm(e.posicaoM).magnitude,
      massaInstantaneaKg: this.obterMassaInstantaneaKg(), tempoAmostraS: this.tempoSimuladoS,
    };
  }

  /** Avança relógio observacional por dtS s positivo/finito, amostra física pós-core e histórico de 60 s; aplica freeze/atraso/desvio determinísticos e calcula idade/validade ≤0,25 s. Não escreve cinemática. @contract f-a0db375ce541062b @reviewed M12-DOC: implementação lida. */
  public atualizar(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo dos sensores deve ser positivo e finito.');
    this.tempoSimuladoS += dtS;
    const amostraAtual = this.criarAmostra();
    this.historicoAmostras.push(amostraAtual);
    // Mesmo histórico de 60 s, com descarte por índice (amortizado O(1)); não
    // desloca milhares de amostras a cada subpasso de uma missão prolongada.
    while (this.historicoAmostras.length - this.inicioHistorico > 1
      && this.historicoAmostras[this.inicioHistorico + 1]!.tempoAmostraS < this.tempoSimuladoS - 60) this.inicioHistorico++;
    if (this.inicioHistorico > 16384) {
      this.historicoAmostras.splice(0, this.inicioHistorico);
      this.inicioHistorico = 0;
    }

    const falhaAtiva = this.falhaInjetada && this.tempoSimuladoS >= this.falhaInjetada.iniciarEmS
      ? this.falhaInjetada : undefined;
    let amostraEntregue = amostraAtual;
    if (falhaAtiva?.tipo === 'congelado') {
      this.amostraCongelada ??= this.obterUltimaAmostraAte(falhaAtiva.iniciarEmS);
      amostraEntregue = this.amostraCongelada;
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

  /** Injeta uma falha determinística usando somente tempo de missão.
   * @contract f-8089a62084335f6b
   */
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
    this.amostraCongelada = undefined;
    this.falhaInjetada = { ...falha };
  }

  /** Remove configuração de falha e amostra congelada; futuras leituras voltam ao fluxo nominal no próximo update. @contract f-9093ba9d4648fa0e @reviewed M12-DOC: implementação lida. */
  public limparFalhaInjetada(): void { this.falhaInjetada = undefined; this.amostraCongelada = undefined; }

  /** Procura retrospectivamente última amostra com tempo simulado ≤instante s; antes do histórico disponível devolve a primeira retida. @contract f-ad6ac5942727e3de @reviewed M12-DOC: implementação lida. */
  private obterUltimaAmostraAte(tempoS: number): AmostraFisica {
    for (let indice = this.historicoAmostras.length - 1; indice >= this.inicioHistorico; indice -= 1) {
      const amostra = this.historicoAmostras[indice]!;
      if (amostra.tempoAmostraS <= tempoS) return amostra;
    }
    return this.historicoAmostras[this.inicioHistorico]!;
  }

  /** Devolve cópia da leitura atual e vetor imutável de GPS; massa é consultada no instante de leitura, enquanto demais grandezas preservam timestamp/atraso da amostra. @contract f-2da2e08370185f92 @reviewed M12-DOC: implementação lida. */
  public obterLeituras(): LeiturasVeiculoComposto {
    return {
      ...this.leiturasAtuais,
      posicaoGpsM: this.leiturasAtuais.posicaoGpsM,
      massaInstantaneaKg: this.obterMassaInstantaneaKg(),
    };
  }
}
