import type { CondicoesAtmosfericas, ForcaFisicaSolicitada } from '../base/Objeto';
import { VeiculoTerrestre, type DefinicaoVeiculoTerrestre } from './VeiculoTerrestre';
import { Vetor3 } from '../../Vetor3';

export interface DefinicaoVeiculoAlado extends DefinicaoVeiculoTerrestre {
  readonly areaAsaM2: number;
  readonly anguloIncidenciaRad: number;
  readonly coeficienteSustentacaoPorRad: number;
  readonly coeficienteArrastoAsa: number;
  readonly anguloEstolRad: number;
  readonly posicaoAsaLocalM?: Vetor3;
}

/** Veículo terrestre que pode converter velocidade relativa ao ar em sustentação. */
export class VeiculoAlado extends VeiculoTerrestre {
  public constructor(private readonly definicaoAlada: DefinicaoVeiculoAlado) {
    super(definicaoAlada);
    for (const valor of [definicaoAlada.areaAsaM2, definicaoAlada.coeficienteSustentacaoPorRad, definicaoAlada.coeficienteArrastoAsa, definicaoAlada.anguloEstolRad]) {
      if (!Number.isFinite(valor) || valor <= 0) throw new Error('Parâmetros aerodinâmicos devem ser positivos.');
    }
    if (!Number.isFinite(definicaoAlada.anguloIncidenciaRad) || definicaoAlada.anguloEstolRad >= Math.PI / 2) {
      throw new Error('Ângulos aerodinâmicos inválidos.');
    }
  }

  public override obterForcasAerodinamicas(condicoes: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[] {
    if (condicoes.densidadeArKgM3 === 0) return [];
    const estado = this.getEstadoFisico();
    const velocidadeRelativa = estado.velocidadeMps.subtrair(condicoes.velocidadeArMps);
    const velocidadeMps = velocidadeRelativa.magnitude;
    if (velocidadeMps < 1e-6) return [];
    const anguloFluxoRad = Math.atan2(velocidadeRelativa.y, velocidadeRelativa.x);
    const anguloAtaqueRad = this.normalizarAngulo((estado.orientacaoRad.z + this.definicaoAlada.anguloIncidenciaRad) - anguloFluxoRad);
    const coeficienteSustentacao = Math.abs(anguloAtaqueRad) <= this.definicaoAlada.anguloEstolRad
      ? this.definicaoAlada.coeficienteSustentacaoPorRad * anguloAtaqueRad
      : 0;
    const pressaoDinamicaPa = 0.5 * condicoes.densidadeArKgM3 * velocidadeMps ** 2;
    const direcaoArrasto = velocidadeRelativa.multiplicar(-1 / velocidadeMps);
    const direcaoSustentacao = new Vetor3(-velocidadeRelativa.y / velocidadeMps, velocidadeRelativa.x / velocidadeMps, 0);
    const sustentacaoN = pressaoDinamicaPa * this.definicaoAlada.areaAsaM2 * coeficienteSustentacao;
    const arrastoN = pressaoDinamicaPa * this.definicaoAlada.areaAsaM2 * this.definicaoAlada.coeficienteArrastoAsa;
    const local = this.definicaoAlada.posicaoAsaLocalM ?? Vetor3.zero;
    const c = Math.cos(estado.orientacaoRad.z);
    const s = Math.sin(estado.orientacaoRad.z);
    const pontoM = new Vetor3(estado.posicaoM.x + (local.x * c) - (local.y * s), estado.posicaoM.y + (local.x * s) + (local.y * c), estado.posicaoM.z + local.z);
    return [{ forcaN: direcaoSustentacao.multiplicar(sustentacaoN).adicionar(direcaoArrasto.multiplicar(arrastoN)), pontoM }];
  }

  private normalizarAngulo(anguloRad: number): number {
    return Math.atan2(Math.sin(anguloRad), Math.cos(anguloRad));
  }
}
