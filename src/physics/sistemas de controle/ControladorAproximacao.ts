import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';
import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { normalizarAngulo } from '../ambiente/ReferencialFisico';

export interface PropulsorAproximacao {
  readonly id: string;
  readonly empuxoMaximoN: number;
  readonly gimbalMaximoRad: number;
}

export interface ConfiguracaoControladorAproximacao {
  readonly alvoArcoM: number | null;
  readonly aceleracaoHorizontalMaximaMps2: number;
  readonly aceleracaoVerticalMaximaMps2: number;
  readonly velocidadeHorizontalMaximaMps: number;
  readonly velocidadeVerticalMaximaMps: number;
  readonly ganhoVelocidadePorS: number;
  readonly propulsores: readonly PropulsorAproximacao[];
}

export interface EstadoControladorAproximacao {
  readonly estado: 'inativo' | 'sem-plano' | 'guiando' | 'saturado' | 'alvo-ultrapassado' | 'falha-sensores';
  readonly distanciaRestanteM: number | null;
  readonly velocidadeHorizontalAlvoMps: number | null;
  readonly velocidadeVerticalAlvoMps: number | null;
  readonly aceleracaoHorizontalSolicitadaMps2: number;
  readonly aceleracaoVerticalLiquidaSolicitadaMps2: number;
  readonly aceleracaoVerticalEmpuxoSolicitadaMps2: number;
  readonly throttleSolicitado: number;
  readonly gimbalSolicitadoRad: number;
  readonly saturado: boolean;
}

const LIMITES: Omit<ConfiguracaoControladorAproximacao, 'alvoArcoM' | 'propulsores'> = {
  aceleracaoHorizontalMaximaMps2: 5,
  aceleracaoVerticalMaximaMps2: 5,
  velocidadeHorizontalMaximaMps: 500,
  velocidadeVerticalMaximaMps: 100,
  ganhoVelocidadePorS: 1,
};

/** Guia energia horizontal e descida por velocidade de frenagem; solicita
 * somente throttle/gimbal de motores configurados, sem ligar sistemas/ignição.
 * Assume eixos de motores paralelos ao +X do casco; o mundo continua integrando.
 */
export class ControladorAproximacao implements ControladorDeVoo {
  public readonly id = 'aproximacao';
  public readonly prioridade = 85;
  public readonly configuracao: ConfiguracaoControladorAproximacao;
  private habilitado = false;
  private estado: EstadoControladorAproximacao = Object.freeze({ estado: 'inativo', distanciaRestanteM: null,
    velocidadeHorizontalAlvoMps: null, velocidadeVerticalAlvoMps: null,
    aceleracaoHorizontalSolicitadaMps2: 0, aceleracaoVerticalLiquidaSolicitadaMps2: 0,
    aceleracaoVerticalEmpuxoSolicitadaMps2: 0, throttleSolicitado: 0, gimbalSolicitadoRad: 0, saturado: false });

  /** Valida um plano SI e copia a lista de propulsores; capacidade nula não é inferida.
   * @contract f-88f34141eee66edd */
  public constructor(entrada: Partial<ConfiguracaoControladorAproximacao> = {}) {
    const c = { ...LIMITES, ...entrada, propulsores: entrada.propulsores ?? [], alvoArcoM: entrada.alvoArcoM ?? null };
    if ((c.alvoArcoM !== null && !Number.isFinite(c.alvoArcoM)) || !Object.values(LIMITES).every(Number.isFinite)
      || ![c.aceleracaoHorizontalMaximaMps2, c.aceleracaoVerticalMaximaMps2,
        c.velocidadeHorizontalMaximaMps, c.velocidadeVerticalMaximaMps, c.ganhoVelocidadePorS].every(Number.isFinite)
      || c.aceleracaoHorizontalMaximaMps2 <= 0 || c.aceleracaoVerticalMaximaMps2 <= 0
      || c.velocidadeHorizontalMaximaMps <= 0 || c.velocidadeVerticalMaximaMps <= 0 || c.ganhoVelocidadePorS <= 0
      || !Array.isArray(c.propulsores) || c.propulsores.length > 16
      || c.propulsores.some(p => !p.id || !Number.isFinite(p.empuxoMaximoN) || p.empuxoMaximoN <= 0
        || !Number.isFinite(p.gimbalMaximoRad) || p.gimbalMaximoRad < 0 || p.gimbalMaximoRad > Math.PI / 2)
      || new Set(c.propulsores.map(p => p.id)).size !== c.propulsores.length) {
      throw new Error('Configuração do controlador de aproximação inválida.');
    }
    this.configuracao = Object.freeze({ ...c, propulsores: Object.freeze(c.propulsores.map(p => Object.freeze({ ...p }))) });
  }

  /** Seleciona o guia, sem solicitar ignição. @contract f-534188cc7979d4c8 */
  public habilitar(): void { this.habilitado = true; }
  /** Retira o guia da arbitragem e limpa diagnóstico transitório. @contract f-6bfef8a77e42e997 */
  public desabilitar(): void { this.habilitado = false; this.estado = { ...this.estado, estado: 'inativo', throttleSolicitado: 0 }; }
  /** Consulta seleção operacional. @contract f-e51247b354a8b769 */
  public get estaHabilitado(): boolean { return this.habilitado; }
  /** Devolve diagnóstico copiado da última chamada, não o estado do veículo. @contract f-6a68924a4824a066 */
  public observar(): EstadoControladorAproximacao { return { ...this.estado }; }

  /** Calcula alvos por sqrt(2ad) e pede aceleração em SI. Sensores inválidos,
   * distância passada ou ausência de motores não autorizam manobra física.
   * @contract f-11a58d8d31bdebcd
   */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!Number.isFinite(dtS) || dtS <= 0 || dtS > 1 / 60) throw new Error('dt de aproximação inválido.');
    if (!this.habilitado) return [];
    const c = this.configuracao;
    if (c.alvoArcoM === null || c.propulsores.length === 0) {
      this.estado = { ...this.estado, estado: 'sem-plano', distanciaRestanteM: null,
        throttleSolicitado: 0, saturado: false };
      return [];
    }
    const sensoresValidos = leituras.sensoresValidos !== false && (leituras.idadeLeituraS ?? 0) <= 0.25
      && [leituras.posicaoHorizontalM, leituras.altitudeM, leituras.velocidadeHorizontalMps,
        leituras.velocidadeVerticalMps, leituras.inclinacaoRad, leituras.gravidadeLocalMps2,
        leituras.massaInstantaneaKg].every(v => typeof v === 'number' && Number.isFinite(v))
      && leituras.altitudeM >= 0 && leituras.gravidadeLocalMps2! > 0 && leituras.massaInstantaneaKg! > 0;
    if (!sensoresValidos) {
      this.estado = { ...this.estado, estado: 'falha-sensores', throttleSolicitado: 0, saturado: true };
      return c.propulsores.map(p => ({ idAtuador: p.id, recurso: 'throttle' as const, valor: 0 }));
    }
    const distancia = c.alvoArcoM - leituras.posicaoHorizontalM!;
    if (distancia <= 0) {
      this.estado = { ...this.estado, estado: distancia <= 0 ? 'alvo-ultrapassado' : 'falha-sensores',
        distanciaRestanteM: distancia, throttleSolicitado: 0, saturado: true };
      return c.propulsores.map(p => ({ idAtuador: p.id, recurso: 'throttle' as const, valor: 0 }));
    }

    const limiteVelocidadeHorizontal = Math.min(c.velocidadeHorizontalMaximaMps,
      Math.sqrt(2 * c.aceleracaoHorizontalMaximaMps2 * distancia));
    const vHorizontalAlvo = Math.sign(distancia)
      * Math.min(Math.abs(leituras.velocidadeHorizontalMps), limiteVelocidadeHorizontal);
    const vVerticalAlvo = -Math.min(c.velocidadeVerticalMaximaMps,
      Math.sqrt(2 * c.aceleracaoVerticalMaximaMps2 * leituras.altitudeM));
    const ax = limitar(c.ganhoVelocidadePorS * (vHorizontalAlvo - leituras.velocidadeHorizontalMps),
      -c.aceleracaoHorizontalMaximaMps2, c.aceleracaoHorizontalMaximaMps2);
    const ay = limitar(c.ganhoVelocidadePorS * (vVerticalAlvo - leituras.velocidadeVerticalMps),
      -c.aceleracaoVerticalMaximaMps2, c.aceleracaoVerticalMaximaMps2);
    const ayEmpuxo = ay + leituras.gravidadeLocalMps2!;
    const anguloRelativo = normalizarAngulo(Math.atan2(ayEmpuxo, ax) - leituras.inclinacaoRad - Math.PI / 2);
    const gimbalMax = Math.min(...c.propulsores.map(p => p.gimbalMaximoRad));
    const gimbal = limitar(anguloRelativo, -gimbalMax, gimbalMax);
    const empuxoTotalMaxN = c.propulsores.reduce((s, p) => s + p.empuxoMaximoN, 0);
    const throttleBruto = leituras.massaInstantaneaKg! * Math.hypot(ax, ayEmpuxo) / empuxoTotalMaxN;
    const throttle = limitar(throttleBruto, 0, 1);
    const saturado = throttle !== throttleBruto || Math.abs(gimbal - anguloRelativo) > 1e-9;
    this.estado = Object.freeze({ estado: saturado ? 'saturado' : 'guiando', distanciaRestanteM: distancia,
      velocidadeHorizontalAlvoMps: vHorizontalAlvo, velocidadeVerticalAlvoMps: vVerticalAlvo,
      aceleracaoHorizontalSolicitadaMps2: ax, aceleracaoVerticalLiquidaSolicitadaMps2: ay,
      aceleracaoVerticalEmpuxoSolicitadaMps2: ayEmpuxo, throttleSolicitado: throttle,
      gimbalSolicitadoRad: gimbal, saturado });
    return c.propulsores.flatMap(p => [
      { idAtuador: p.id, recurso: 'throttle' as const, valor: throttle },
      { idAtuador: p.id, recurso: 'gimbal' as const, valor: gimbal },
    ]);
  }
}

/** Limita valor ao intervalo fechado, preservando unidades do chamador. @contract f-bf17aecd4828c1e1 */
const limitar = (valor: number, minimo: number, maximo: number): number => Math.max(minimo, Math.min(maximo, valor));
