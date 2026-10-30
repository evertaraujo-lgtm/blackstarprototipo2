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
  readonly operacaoAutorizada?: /** Consulta permissivo externo do atuador; false impede atuação, sem alterar pose ou substituir integridade/energia. @contract f-740741f36db4d1e3 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => boolean;
  /** Porta opcional [0,1] de capacidade do mecanismo; não é controlador. */
  readonly lerEficienciaAtuacao?: () => number;
  readonly resistenciaColisaoJ: number;
  readonly limiteTermicoC: number;
  readonly estadoInicial?: ConstructorParameters<typeof Objeto>[0]['estadoInicial'];
}

/** Superfície móvel que transforma fluxo atmosférico em força e torque. */
export class AletaAerodinamica extends Objeto {
  private comandoDeflexaoRad = 0;
  private anguloDeflexaoAtualRad = 0;
  public readonly conexaoEletrica: ConexaoEletrica;

  /** Cria aleta física com parâmetros SI positivos, deflexão menor que π/2 e circuito real de alimentação; mantém identidade/massa própria no mundo. @contract f-54ffb990a0b9fd30 @reviewed M12-DOC: implementação lida. */
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

  /** Consulta posição efetivamente atingida pelo atuador em rad, distinta do comando. @contract f-d1ba873c60de7b77 @reviewed M12-DOC: implementação lida. */
  public get deflexaoAtualRad(): number { return this.anguloDeflexaoAtualRad; }
  /** Consulta alvo de deflexão em rad. @contract f-6facf1f5c35c42f1 @reviewed M12-DOC: implementação lida. */
  public get comandoAtualRad(): number { return this.comandoDeflexaoRad; }

  /** Valida ângulo finito em rad e satura comando no curso declarado; não move instantaneamente a aleta. @contract f-8e46742911ecfd63 @reviewed M12-DOC: implementação lida. */
  public solicitarDeflexaoRad(valorRad: number): void {
    if (!Number.isFinite(valorRad)) throw new Error('Comando de deflexão deve ser finito.');
    const limite = this.deflexaoMaximaRad;
    this.comandoDeflexaoRad = Math.max(-limite, Math.min(limite, valorRad));
  }

  /** Porta regional opcional limita velocidade pela integridade própria do mecanismo;
   * ausência preserva fator 1. Prepara circuito no subpasso, exige energia/controle/integridade, limita variação por rad/s e fração de energia efetiva; atualiza somente a deflexão interna do atuador. @contract f-4e987276a8db4cad @reviewed M12-DOC: implementação lida. */
  public override prepararPassoOperacional(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS < 0) throw new Error('Passo do atuador deve ser finito e não negativo.');
    this.conexaoEletrica.prepararPasso(Math.max(dtS, Number.EPSILON));
    if (this.conexaoEletrica.estaIndisponivel || this.definicaoAleta.fonteEletrica.estaDescarregada
        || this.definicaoAleta.fonteEletrica.integridadeEstrutural === 0
        || this.definicaoAleta.operacaoAutorizada?.() === false || this.integridadeEstrutural === 0) return;
    const eficiencia = this.definicaoAleta.lerEficienciaAtuacao?.() ?? 1;
    if (!Number.isFinite(eficiencia) || eficiencia < 0 || eficiencia > 1) throw new Error('Eficiência do mecanismo inválida.');
    const variacaoMaxima = this.definicaoAleta.velocidadeAngularMaximaRadps * dtS * eficiencia;
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

  /** Calcula sustentação proporcional a q·A·Clα·deflexão·integridade na direção perpendicular ao fluxo relativo; retorna forças/ponto reais. Sem fluxo, densidade ou integridade não há força; arrasto permanece único na classe-base/core. @contract f-89136d5b05b3ebd7 @reviewed M12-DOC: implementação lida. */
  public override obterForcasAerodinamicas(condicoes: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[] {
    if (this.integridadeEstrutural <= 0 || condicoes.densidadeArKgM3 <= 0) return [];
    const estado = this.getEstadoFisico();
    const velocidadeRelativa = estado.velocidadeMps.subtrair(condicoes.velocidadeArMps);
    const velocidadeMps = velocidadeRelativa.magnitude;
    if (velocidadeMps < 1e-6) return [];

    const pressaoDinamicaPa = 0.5 * condicoes.densidadeArKgM3 * velocidadeMps ** 2;
    const c = Math.cos(estado.orientacaoRad.z);
    const s = Math.sin(estado.orientacaoRad.z);
    const lateralDoCorpo = new Vetor3(c, s, 0);
    const fluxoUnitario = velocidadeRelativa.multiplicar(1 / velocidadeMps);
    // Sustentação perpendicular ao fluxo: não injeta potência na translação.
    // O único arrasto é o termo declarado na classe-base e aplicado pelo core.
    const direcaoLateral = lateralDoCorpo.subtrair(fluxoUnitario.multiplicar(lateralDoCorpo.produtoEscalar(fluxoUnitario)));
    const sustentacaoN = pressaoDinamicaPa * this.definicaoAleta.areaEfetivaM2
      * this.definicaoAleta.coeficienteSustentacaoPorRad * this.anguloDeflexaoAtualRad * this.integridadeEstrutural;
    const forca = direcaoLateral.multiplicar(sustentacaoN);
    return [{ forcaN: forca, pontoM: estado.posicaoM }];
  }

  /** Consulta limite mecânico configurado em rad. @contract f-ada0794e720d3f92 @reviewed M12-DOC: implementação lida. */
  private get deflexaoMaximaRad(): number { return this.definicaoAleta.deflexaoMaximaRad; }
}
