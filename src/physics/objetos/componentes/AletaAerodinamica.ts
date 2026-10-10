import { Vetor3 } from '../../Vetor3';
import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Objeto, type CondicoesAtmosfericas, type ForcaFisicaSolicitada } from '../base/Objeto';
import type { FonteEletrica } from '../fontes-de-energia/FonteEletrica';

export interface DefinicaoAletaAerodinamica {
  readonly id: string;
  readonly massaBaseKg: number;
  readonly dimensoesM: Vetor3;
  readonly areaEfetivaM2: number;
  readonly coeficienteSustentacaoPorRad: number;
  readonly coeficienteArrasto: number;
  readonly deflexaoMaximaRad: number;
  readonly velocidadeAngularMaximaRadps: number;
  readonly potenciaNominalAtuadorW: number;
  readonly potenciaEmRepousoW: number;
  readonly fonteEletrica: FonteEletrica;
  readonly operacaoAutorizada?: () => boolean;
  readonly resistenciaColisaoJ: number;
  readonly limiteTermicoC: number;
  readonly estadoInicial?: ConstructorParameters<typeof Objeto>[0]['estadoInicial'];
}

/** Superfície móvel que transforma fluxo atmosférico em força e torque. */
export class AletaAerodinamica extends Objeto {
  private comandoDeflexaoRad = 0;
  private anguloDeflexaoAtualRad = 0;
  public readonly conexaoEletrica: ConexaoEletrica;

  public constructor(private readonly definicaoAleta: DefinicaoAletaAerodinamica) {
    super({
      id: definicaoAleta.id,
      massaBaseKg: definicaoAleta.massaBaseKg,
      dimensoesM: definicaoAleta.dimensoesM,
      resistenciaColisaoJ: definicaoAleta.resistenciaColisaoJ,
      limiteTermicoC: definicaoAleta.limiteTermicoC,
      areaFrontalM2: definicaoAleta.areaEfetivaM2,
      coeficienteArrasto: definicaoAleta.coeficienteArrasto,
      estadoInicial: definicaoAleta.estadoInicial,
    });
    const valoresPositivos = [
      definicaoAleta.areaEfetivaM2,
      definicaoAleta.coeficienteSustentacaoPorRad,
      definicaoAleta.coeficienteArrasto,
      definicaoAleta.deflexaoMaximaRad,
      definicaoAleta.velocidadeAngularMaximaRadps,
      definicaoAleta.potenciaNominalAtuadorW,
    ];
    if (!valoresPositivos.every((valor) => Number.isFinite(valor) && valor > 0)
        || definicaoAleta.deflexaoMaximaRad >= Math.PI / 2) {
      throw new Error('Parâmetros da aleta aerodinâmica devem ser positivos e a deflexão menor que 90°.');
    }
    if (!Number.isFinite(definicaoAleta.potenciaEmRepousoW) || definicaoAleta.potenciaEmRepousoW < 0) {
      throw new Error('Potência elétrica em repouso deve ser finita e não negativa.');
    }
    this.conexaoEletrica = new ConexaoEletrica({
      id: `cabo-${definicaoAleta.id}`,
      fonte: definicaoAleta.fonteEletrica,
      destino: this,
      comprimentoMaximoM: 20,
      correnteMaximaA: (definicaoAleta.potenciaNominalAtuadorW + definicaoAleta.potenciaEmRepousoW) / definicaoAleta.fonteEletrica.tensaoNominalV,
      inicialmenteLigada: true,
    });
  }

  public get deflexaoAtualRad(): number { return this.anguloDeflexaoAtualRad; }
  public get comandoAtualRad(): number { return this.comandoDeflexaoRad; }

  public solicitarDeflexaoRad(valorRad: number): void {
    if (!Number.isFinite(valorRad)) throw new Error('Comando de deflexão deve ser finito.');
    const limite = this.deflexaoMaximaRad;
    this.comandoDeflexaoRad = Math.max(-limite, Math.min(limite, valorRad));
  }

  public override prepararPassoOperacional(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS < 0) throw new Error('Passo do atuador deve ser finito e não negativo.');
    this.conexaoEletrica.prepararPasso(Math.max(dtS, Number.EPSILON));
    if (this.conexaoEletrica.estaIndisponivel || this.definicaoAleta.fonteEletrica.estaDescarregada
        || this.definicaoAleta.fonteEletrica.integridadeEstrutural === 0
        || this.definicaoAleta.operacaoAutorizada?.() === false || this.integridadeEstrutural === 0) return;
    const variacaoMaxima = this.definicaoAleta.velocidadeAngularMaximaRadps * dtS;
    const erro = this.comandoDeflexaoRad - this.anguloDeflexaoAtualRad;
    const variacaoSolicitada = Math.max(-variacaoMaxima, Math.min(variacaoMaxima, erro));
    const potenciaSolicitadaW = Math.abs(variacaoSolicitada) > 1e-12
      ? this.definicaoAleta.potenciaNominalAtuadorW + this.definicaoAleta.potenciaEmRepousoW
      : this.definicaoAleta.potenciaEmRepousoW;
    const energiaSolicitadaJ = potenciaSolicitadaW * dtS;
    const energiaFornecidaJ = this.conexaoEletrica.fornecerEnergia(energiaSolicitadaJ);
    const disponibilidade = energiaSolicitadaJ === 0 ? 1 : energiaFornecidaJ / energiaSolicitadaJ;
    this.anguloDeflexaoAtualRad += variacaoSolicitada * disponibilidade;
  }

  public override obterForcasAerodinamicas(condicoes: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[] {
    if (this.integridadeEstrutural <= 0 || condicoes.densidadeArKgM3 <= 0) return [];
    const estado = this.getEstadoFisico();
    const velocidadeRelativa = estado.velocidadeMps.subtrair(condicoes.velocidadeArMps);
    const velocidadeMps = velocidadeRelativa.magnitude;
    if (velocidadeMps < 1e-6) return [];

    const pressaoDinamicaPa = 0.5 * condicoes.densidadeArKgM3 * velocidadeMps ** 2;
    const arrasto = velocidadeRelativa.multiplicar(-pressaoDinamicaPa * this.definicaoAleta.areaEfetivaM2 * this.definicaoAleta.coeficienteArrasto / velocidadeMps);
    const c = Math.cos(estado.orientacaoRad.z);
    const s = Math.sin(estado.orientacaoRad.z);
    const direcaoLateral = new Vetor3(c, s, 0);
    const sustentacaoN = pressaoDinamicaPa * this.definicaoAleta.areaEfetivaM2
      * this.definicaoAleta.coeficienteSustentacaoPorRad * this.anguloDeflexaoAtualRad * this.integridadeEstrutural;
    const forca = arrasto.adicionar(direcaoLateral.multiplicar(sustentacaoN));
    return [{ forcaN: forca, pontoM: estado.posicaoM }];
  }

  private get deflexaoMaximaRad(): number { return this.definicaoAleta.deflexaoMaximaRad; }
}
