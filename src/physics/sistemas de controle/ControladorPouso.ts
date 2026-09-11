import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';

export type FaseControlePouso = 'inativo' | 'aproximacao' | 'frenagem' | 'toque' | 'falha-de-sensores';

export interface ConfiguracaoControlePouso {
  /** Altitude do GPS correspondente ao apoio físico do veículo. */
  readonly altitudeAlvoM: number;
  readonly altitudeInicioFrenagemM: number;
  readonly velocidadeAproximacaoMps: number;
  readonly velocidadeMaximaToqueMps: number;
  readonly desaceleracaoPlanejadaMps2: number;
  /** Throttle que equilibra aproximadamente o peso na configuração atual. */
  readonly throttleSustentacao: number;
  readonly ganhoThrottlePorErroVelocidade: number;
  readonly taxaMaximaThrottlePorS: number;
  readonly ganhoGimbalInclinacao: number;
  readonly ganhoGimbalVelocidadeHorizontalRadPorMps: number;
  readonly limiteGimbalRad: number;
  readonly toleranciaAltitudeToqueM: number;
  readonly toleranciaVelocidadeHorizontalMps: number;
  readonly toleranciaInclinacaoRad: number;
}

export interface ComandoControlePouso {
  readonly fase: FaseControlePouso;
  readonly throttle: number;
  readonly anguloGimbalRad: number;
  readonly velocidadeVerticalAlvoMps: number;
  readonly alturaRestanteM: number;
  readonly leiturasValidas: boolean;
}

const CONFIGURACAO_PADRAO: ConfiguracaoControlePouso = {
  altitudeAlvoM: 0,
  altitudeInicioFrenagemM: 40,
  velocidadeAproximacaoMps: 8,
  velocidadeMaximaToqueMps: 0.75,
  desaceleracaoPlanejadaMps2: 3,
  throttleSustentacao: 0.5,
  ganhoThrottlePorErroVelocidade: 0.08,
  taxaMaximaThrottlePorS: 1,
  ganhoGimbalInclinacao: 2,
  ganhoGimbalVelocidadeHorizontalRadPorMps: 0.04,
  limiteGimbalRad: 15 * Math.PI / 180,
  toleranciaAltitudeToqueM: 0.1,
  toleranciaVelocidadeHorizontalMps: 0.5,
  toleranciaInclinacaoRad: 3 * Math.PI / 180,
};

const limitar = (valor: number, minimo: number, maximo: number): number => Math.max(minimo, Math.min(maximo, valor));

/**
 * Controle local de pouso vertical. Ele consome somente telemetria e produz
 * solicitações normalizadas para os atuadores; não conhece nem altera o mundo.
 */
export class ControladorPouso {
  private habilitado = false;
  private throttleAnterior = 0;
  private ultimoComando: ComandoControlePouso = {
    fase: 'inativo', throttle: 0, anguloGimbalRad: 0,
    velocidadeVerticalAlvoMps: 0, alturaRestanteM: 0, leiturasValidas: true,
  };

  public readonly configuracao: ConfiguracaoControlePouso;

  public constructor(configuracao: Partial<ConfiguracaoControlePouso> = {}) {
    this.configuracao = { ...CONFIGURACAO_PADRAO, ...configuracao };
    this.validarConfiguracao();
  }

  public habilitar(): void {
    this.habilitado = true;
    this.throttleAnterior = 0;
  }

  public desabilitar(): void {
    this.habilitado = false;
    this.throttleAnterior = 0;
    this.ultimoComando = {
      fase: 'inativo', throttle: 0, anguloGimbalRad: 0,
      velocidadeVerticalAlvoMps: 0, alturaRestanteM: 0, leiturasValidas: true,
    };
  }

  public get estaHabilitado(): boolean { return this.habilitado; }
  public obterUltimoComando(): ComandoControlePouso { return { ...this.ultimoComando }; }

  public calcularComando(leituras: LeiturasVeiculoComposto, dtS: number): ComandoControlePouso {
    if (!this.habilitado) return this.obterUltimoComando();
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo do controle de pouso deve ser positivo e finito.');

    const valoresDosSensores = [
      leituras.altitudeM, leituras.velocidadeVerticalMps,
      leituras.velocidadeHorizontalMps, leituras.inclinacaoRad,
    ];
    if (!valoresDosSensores.every(Number.isFinite)) {
      this.throttleAnterior = 0;
      this.ultimoComando = {
        fase: 'falha-de-sensores', throttle: 0, anguloGimbalRad: 0,
        velocidadeVerticalAlvoMps: 0, alturaRestanteM: 0, leiturasValidas: false,
      };
      return this.obterUltimoComando();
    }

    const c = this.configuracao;
    const alturaRestanteM = Math.max(0, leituras.altitudeM - c.altitudeAlvoM);
    const velocidadePermitidaMps = Math.min(
      c.velocidadeAproximacaoMps,
      Math.sqrt(c.velocidadeMaximaToqueMps ** 2 + 2 * c.desaceleracaoPlanejadaMps2 * alturaRestanteM),
    );
    const velocidadeVerticalAlvoMps = -velocidadePermitidaMps;
    const contatoSeguro = alturaRestanteM <= c.toleranciaAltitudeToqueM
      && Math.abs(leituras.velocidadeVerticalMps) <= c.velocidadeMaximaToqueMps
      && Math.abs(leituras.velocidadeHorizontalMps) <= c.toleranciaVelocidadeHorizontalMps
      && Math.abs(leituras.inclinacaoRad) <= c.toleranciaInclinacaoRad;

    if (contatoSeguro) {
      this.throttleAnterior = 0;
      this.ultimoComando = {
        fase: 'toque', throttle: 0, anguloGimbalRad: 0,
        velocidadeVerticalAlvoMps, alturaRestanteM, leiturasValidas: true,
      };
      return this.obterUltimoComando();
    }

    const erroVelocidadeMps = velocidadeVerticalAlvoMps - leituras.velocidadeVerticalMps;
    const throttleAlvo = limitar(
      c.throttleSustentacao + c.ganhoThrottlePorErroVelocidade * erroVelocidadeMps,
      0,
      1,
    );
    const variacaoMaximaThrottle = c.taxaMaximaThrottlePorS * dtS;
    const throttle = limitar(
      throttleAlvo,
      Math.max(0, this.throttleAnterior - variacaoMaximaThrottle),
      Math.min(1, this.throttleAnterior + variacaoMaximaThrottle),
    );
    this.throttleAnterior = throttle;

    // No arranjo vertical planar, comando positivo gera força lateral negativa:
    // inclinação e velocidade horizontal positivas pedem gimbal positivo.
    const anguloGimbalRad = limitar(
      c.ganhoGimbalInclinacao * leituras.inclinacaoRad
        + c.ganhoGimbalVelocidadeHorizontalRadPorMps * leituras.velocidadeHorizontalMps,
      -c.limiteGimbalRad,
      c.limiteGimbalRad,
    );
    this.ultimoComando = {
      fase: alturaRestanteM > c.altitudeInicioFrenagemM ? 'aproximacao' : 'frenagem',
      throttle, anguloGimbalRad, velocidadeVerticalAlvoMps, alturaRestanteM, leiturasValidas: true,
    };
    return this.obterUltimoComando();
  }

  private validarConfiguracao(): void {
    const c = this.configuracao;
    if (!Object.values(c).every(Number.isFinite)
      || c.altitudeInicioFrenagemM <= c.altitudeAlvoM
      || c.velocidadeAproximacaoMps <= 0
      || c.velocidadeMaximaToqueMps <= 0
      || c.velocidadeMaximaToqueMps > c.velocidadeAproximacaoMps
      || c.desaceleracaoPlanejadaMps2 <= 0
      || c.throttleSustentacao < 0 || c.throttleSustentacao > 1
      || c.ganhoThrottlePorErroVelocidade < 0
      || c.taxaMaximaThrottlePorS <= 0
      || c.ganhoGimbalInclinacao < 0
      || c.ganhoGimbalVelocidadeHorizontalRadPorMps < 0
      || c.limiteGimbalRad <= 0
      || c.toleranciaAltitudeToqueM < 0
      || c.toleranciaVelocidadeHorizontalMps < 0
      || c.toleranciaInclinacaoRad < 0) {
      throw new Error('Configuração do controle de pouso inválida.');
    }
  }
}
