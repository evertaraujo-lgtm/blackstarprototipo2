import { Vetor3 } from '../../Vetor3';
import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Bateria } from '../fontes-de-energia/Bateria';
import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada } from '../base/Objeto';

import { Cilindro, ComCilindro, type DefinicaoCilindro } from './Cilindro';
export type { EntradasCilindro } from './Cilindro';

export interface DefinicaoCilindroEletrico extends DefinicaoCilindro {
  readonly corpo: Objeto;
  readonly haste: Objeto;
  readonly bateria: Bateria;
  readonly conexaoEletrica?: ConexaoEletrica;
  /** Capacidade de empuxo do fuso/motor; não altera velocidade diretamente. */
  readonly forcaMaximaN: number;
  readonly eficienciaEletromecanica?: number;
  /** Direção física do curso no mundo planar; padrão: X positivo. */
  readonly direcaoDeCursoM?: Vetor3;
  /** Permissivos externos de alimentação/controle, consultados a cada subpasso. */
  readonly operacaoAutorizada?: () => boolean;
  /** Servo de retenção opcional: rigidez equivalente em N/m, limitada pela força máxima. */
  readonly rigidezRetencaoNPorM?: number;
  /** Consumo elétrico do controle e motor energizados, inclusive parado (W). */
  readonly potenciaEmRepousoW?: number;
}

/** Atuador eletromecânico linear com controle de velocidade por força. */
export class CilindroEletrico extends Cilindro {
  private forcaAtualN = 0;
  private potenciaEletricaCalculadaW = 0;
  private readonly direcaoDeCursoM: Vetor3;
  private posicaoRetidaM?: number;
  public readonly conexaoEletrica: ConexaoEletrica;

  public constructor(private readonly definicaoEletrica: DefinicaoCilindroEletrico) {
    super(definicaoEletrica);
    for (const valor of [definicaoEletrica.velocidadeAvancoMps, definicaoEletrica.velocidadeRecuoMps, definicaoEletrica.forcaMaximaN]) {
      if (!Number.isFinite(valor) || valor <= 0) throw new Error('Velocidades e força máxima do cilindro elétrico devem ser positivas.');
    }
    const eficiencia = definicaoEletrica.eficienciaEletromecanica ?? 0.85;
    if (!Number.isFinite(eficiencia) || eficiencia <= 0 || eficiencia > 1) throw new Error('Eficiência eletromecânica deve estar entre 0 e 1.');
    const direcao = definicaoEletrica.direcaoDeCursoM ?? new Vetor3(1, 0, 0);
    if (Math.abs(direcao.magnitude - 1) > 1e-9) throw new Error('Direção de curso do cilindro elétrico deve ser unitária.');
    this.direcaoDeCursoM = direcao;
    const potenciaNominalW = definicaoEletrica.forcaMaximaN * Math.max(this.velocidadeAvancoMps, this.velocidadeRecuoMps) / eficiencia + (definicaoEletrica.potenciaEmRepousoW ?? 0);
    this.conexaoEletrica = definicaoEletrica.conexaoEletrica ?? new ConexaoEletrica({
      id: `cabo-${definicaoEletrica.corpo.id}`, fonte: definicaoEletrica.bateria, destino: definicaoEletrica.corpo,
      comprimentoMaximoM: 10, correnteMaximaA: potenciaNominalW / definicaoEletrica.bateria.tensaoNominalV, inicialmenteLigada: true,
    });
    if (this.conexaoEletrica.fonte !== definicaoEletrica.bateria || this.conexaoEletrica.destino !== definicaoEletrica.corpo) throw new Error('Conexão elétrica não corresponde à montagem do cilindro.');
    for (const valor of [definicaoEletrica.rigidezRetencaoNPorM ?? 0, definicaoEletrica.potenciaEmRepousoW ?? 0]) {
      if (!Number.isFinite(valor) || valor < 0) throw new Error('Rigidez e potência de repouso devem ser finitas e não negativas.');
    }
  }

  public get haste(): Objeto { return this.definicaoEletrica.haste; }
  public get forcaNaHasteN(): number { return this.forcaAtualN; }
  public get potenciaEletricaAtualW(): number { return this.potenciaEletricaCalculadaW; }
  public prepararPassoOperacional(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt deve ser positivo e finito, em segundos.');
    this.conexaoEletrica.prepararPasso(dtS);
    const velocidadeDesejadaMps = this.velocidadeSolicitadaMps;
    if (this.conexaoEletrica.estaIndisponivel || this.definicaoEletrica.bateria.estaDescarregada || this.definicaoEletrica.bateria.integridadeEstrutural === 0 ||
        this.haste.integridadeEstrutural === 0 || this.definicaoEletrica.corpo.integridadeEstrutural === 0 ||
        this.definicaoEletrica.operacaoAutorizada?.() === false) {
      this.forcaAtualN = 0;
      this.potenciaEletricaCalculadaW = 0;
      this.posicaoRetidaM = undefined;
      return;
    }
    const velocidadeRelativaMps = this.haste.getEstadoFisico().velocidadeMps.subtrair(this.definicaoEletrica.corpo.getEstadoFisico().velocidadeMps).produtoEscalar(this.direcaoDeCursoM);
    const forcaLimiteN = this.definicaoEletrica.forcaMaximaN * Math.min(this.haste.integridadeEstrutural, this.definicaoEletrica.corpo.integridadeEstrutural);
    const ganhoNPorMps = forcaLimiteN / Math.max(this.velocidadeAvancoMps, this.velocidadeRecuoMps);
    const posicaoRelativaM = this.haste.getEstadoFisico().posicaoM.subtrair(this.definicaoEletrica.corpo.getEstadoFisico().posicaoM).produtoEscalar(this.direcaoDeCursoM);
    if (velocidadeDesejadaMps !== 0) this.posicaoRetidaM = undefined;
    else this.posicaoRetidaM ??= posicaoRelativaM;
    const forcaRetencaoN = this.posicaoRetidaM === undefined ? 0 :
      (this.posicaoRetidaM - posicaoRelativaM) * (this.definicaoEletrica.rigidezRetencaoNPorM ?? 0);
    // Resposta implícita do servo: o ganho considera a reação dos dois corpos
    // durante dt, evitando alternância artificial de força em passos maiores.
    const inversaMassaEfetiva = 1 / this.haste.massaKg + 1 / this.definicaoEletrica.corpo.massaKg;
    const rigidezAtiva = this.posicaoRetidaM === undefined ? 0 : this.definicaoEletrica.rigidezRetencaoNPorM ?? 0;
    const denominador = 1 + inversaMassaEfetiva * (ganhoNPorMps * dtS + rigidezAtiva * dtS ** 2);
    const forcaSolicitadaN = Math.max(-forcaLimiteN, Math.min(forcaLimiteN,
      ((velocidadeDesejadaMps - velocidadeRelativaMps) * ganhoNPorMps + forcaRetencaoN) / denominador));
    // Inclui o trabalho inicial de aceleração; força a partir do repouso também exige energia.
    const potenciaMecanicaW = Math.abs(forcaSolicitadaN * velocidadeRelativaMps) + forcaSolicitadaN ** 2 * dtS / (2 * this.haste.massaKg);
    const potenciaEletricaW = potenciaMecanicaW / (this.definicaoEletrica.eficienciaEletromecanica ?? 0.85) + (this.definicaoEletrica.potenciaEmRepousoW ?? 0);
    const energiaSolicitadaJ = potenciaEletricaW * dtS;
    const energiaFornecidaJ = this.conexaoEletrica.fornecerEnergia(energiaSolicitadaJ);
    const disponibilidade = energiaSolicitadaJ === 0 ? 1 : energiaFornecidaJ / energiaSolicitadaJ;
    this.forcaAtualN = forcaSolicitadaN * disponibilidade;
    this.potenciaEletricaCalculadaW = potenciaEletricaW * disponibilidade;
  }

  public obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return [{ forcaN: this.direcaoDeCursoM.multiplicar(-this.forcaAtualN) }]; }
  public obterForcasNaHaste(): readonly ForcaFisicaSolicitada[] { return [{ forcaN: this.direcaoDeCursoM.multiplicar(this.forcaAtualN) }]; }
}

export class HasteDeCilindroEletrico extends Objeto {
  public constructor(definicao: DefinicaoObjeto, private readonly obterCilindro: () => Pick<CilindroEletrico, 'obterForcasNaHaste'>) { super(definicao); }
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return this.obterCilindro().obterForcasNaHaste(); }
}

/** Corpo físico opcional da montagem existente; o comportamento não possui geometria. */
export class CorpoDeCilindroEletrico extends ComCilindro(Objeto) {
  private readonly acionamento: CilindroEletrico;
  public constructor(definicao: DefinicaoObjeto & Omit<DefinicaoCilindroEletrico, 'corpo'>) {
    super(definicao);
    this.acionamento = new CilindroEletrico({ ...definicao, corpo: this });
    this.instalarCilindro(this.acionamento);
  }
  public get conexaoEletrica(): ConexaoEletrica { return this.acionamento.conexaoEletrica; }
  public get forcaNaHasteN(): number { return this.acionamento.forcaNaHasteN; }
  public get potenciaEletricaAtualW(): number { return this.acionamento.potenciaEletricaAtualW; }
  public override prepararPassoOperacional(dtS: number): void { this.acionamento.prepararPassoOperacional(dtS); }
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return this.acionamento.obterForcasOperacionais(); }
  public obterForcasNaHaste(): readonly ForcaFisicaSolicitada[] { return this.acionamento.obterForcasNaHaste(); }
}
