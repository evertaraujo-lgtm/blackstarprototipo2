import { Vetor3 } from '../../Vetor3';
import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import type { FonteEletrica } from '../fontes-de-energia/FonteEletrica';
import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada } from '../base/Objeto';

import { Cilindro, ComCilindro, type DefinicaoCilindro } from './Cilindro';
export type { EntradasCilindro } from './Cilindro';

export interface DefinicaoCilindroEletrico extends DefinicaoCilindro {
  readonly corpo: Objeto;
  readonly haste: Objeto;
  readonly fonte?: FonteEletrica;
  /** Compatibilidade com montagens CC existentes. */
  readonly bateria?: FonteEletrica;
  readonly conexaoEletrica?: ConexaoEletrica;
  /** Capacidade de empuxo do fuso/motor; não altera velocidade diretamente. */
  readonly forcaMaximaN: number;
  readonly eficienciaEletromecanica?: number;
  /** Direção física do curso no mundo planar; padrão: X positivo. */
  readonly direcaoDeCursoM?: Vetor3;
  /** Permissivos externos de alimentação/controle, consultados a cada subpasso. */
  readonly operacaoAutorizada?: /** Consulta permissivo externo do atuador; false impede atuação, sem alterar pose ou substituir integridade/energia. @contract f-57b1b7d21164f2d4 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => boolean;
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

  /** Valida força N, velocidades m/s, eficiência e direção unitária; exige fonte e conexão coerentes com o corpo. Dimensiona circuito por força×velocidade/eficiência e valida retenção/potência de repouso. @contract f-10533c6e01afa02e @reviewed M12-DOC: implementação lida. */
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
    const fonte = definicaoEletrica.fonte ?? definicaoEletrica.bateria;
    if (!fonte) throw new Error('Cilindro elétrico exige uma fonte.');
    const potenciaNominalW = definicaoEletrica.forcaMaximaN * Math.max(this.velocidadeAvancoMps, this.velocidadeRecuoMps) / eficiencia + (definicaoEletrica.potenciaEmRepousoW ?? 0);
    this.conexaoEletrica = definicaoEletrica.conexaoEletrica ?? new ConexaoEletrica({
      id: `cabo-${definicaoEletrica.corpo.id}`, fonte, destino: definicaoEletrica.corpo,
      comprimentoMaximoM: 10, correnteMaximaA: potenciaNominalW / fonte.tensaoNominalV, inicialmenteLigada: true,
    });
    if (this.conexaoEletrica.fonte !== fonte || this.conexaoEletrica.destino !== definicaoEletrica.corpo) throw new Error('Conexão elétrica não corresponde à montagem do cilindro.');
    for (const valor of [definicaoEletrica.rigidezRetencaoNPorM ?? 0, definicaoEletrica.potenciaEmRepousoW ?? 0]) {
      if (!Number.isFinite(valor) || valor < 0) throw new Error('Rigidez e potência de repouso devem ser finitas e não negativas.');
    }
  }

  /** Devolve `this.definicaoEletrica.haste`. Efeitos indiretos seguem as dependências chamadas. @contract f-fab291dbb8f0c529 */
  public get haste(): Objeto { return this.definicaoEletrica.haste; }
  /** Devolve `this.forcaAtualN`. Efeitos indiretos seguem as dependências chamadas. @contract f-989c50b3daaa77a1 */
  public get forcaNaHasteN(): number { return this.forcaAtualN; }
  /** Devolve `this.potenciaEletricaCalculadaW`. Efeitos indiretos seguem as dependências chamadas. @contract f-a97f8e5bc9d950c7 */
  public get potenciaEletricaAtualW(): number { return this.potenciaEletricaCalculadaW; }
  /** Para dt positivo s prepara circuito e permissivos. Calcula servo implícito de velocidade relativa/posição retida com reação das duas massas e limite por integridade; solicita energia incluindo aceleração inicial e escala força pela entrega. Falha zera força/potência/retenção; não fixa posição nem velocidade. @contract f-2c7f670e39b3a436 @reviewed M12-DOC: implementação lida. */
  public prepararPassoOperacional(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('dt deve ser positivo e finito, em segundos.');
    this.conexaoEletrica.prepararPasso(dtS);
    const velocidadeDesejadaMps = this.velocidadeSolicitadaMps;
    if (this.conexaoEletrica.estaIndisponivel || this.conexaoEletrica.fonte.estaDescarregada || this.conexaoEletrica.fonte.integridadeEstrutural === 0 ||
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

  /** Devolve `[{ forcaN: this.direcaoDeCursoM.multiplicar(-this.forcaAtualN) }]`. Dependências diretas: `this.direcaoDeCursoM.multiplicar`. Efeitos indiretos seguem as dependências chamadas. @contract f-975af64a1e2c8faa */
  public obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return [{ forcaN: this.direcaoDeCursoM.multiplicar(-this.forcaAtualN) }]; }
  /** Devolve `[{ forcaN: this.direcaoDeCursoM.multiplicar(this.forcaAtualN) }]`. Dependências diretas: `this.direcaoDeCursoM.multiplicar`. Efeitos indiretos seguem as dependências chamadas. @contract f-16a9c47426b92786 */
  public obterForcasNaHaste(): readonly ForcaFisicaSolicitada[] { return [{ forcaN: this.direcaoDeCursoM.multiplicar(this.forcaAtualN) }]; }
}

export class HasteDeCilindroEletrico extends Objeto {
  /** Inicializa haste como objeto físico com propriedades herdadas; forças do acionamento serão integradas pelo mundo. @contract f-388b485ef7af8890 @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoObjeto, private readonly obterCilindro: /** Resolve acionamento já associado à haste para consultar solicitações físicas de força; evita criação de dinâmica concorrente. @contract f-e25c8d2ac86de693 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => Pick<CilindroEletrico, 'obterForcasNaHaste'>) { super(definicao); }
  /** Devolve `this.obterCilindro().obterForcasNaHaste()`. Dependências diretas: `this.obterCilindro().obterForcasNaHaste`, `this.obterCilindro`. Efeitos indiretos seguem as dependências chamadas. @contract f-b8753a62eb7004d8 */
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return this.obterCilindro().obterForcasNaHaste(); }
}

/** Corpo físico opcional da montagem existente; o comportamento não possui geometria. */
export class CorpoDeCilindroEletrico extends ComCilindro(Objeto) {
  private readonly acionamento: CilindroEletrico;
  /** Inicializa corpo físico, cria acionamento que o referencia como corpo e instala comportamento único do cilindro. @contract f-9e79c14c264823ea @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoObjeto & Omit<DefinicaoCilindroEletrico, 'corpo'>) {
    super(definicao);
    this.acionamento = new CilindroEletrico({ ...definicao, corpo: this });
    this.instalarCilindro(this.acionamento);
  }
  /** Devolve `this.acionamento.conexaoEletrica`. Efeitos indiretos seguem as dependências chamadas. @contract f-43ae106d1e223ba2 */
  public get conexaoEletrica(): ConexaoEletrica { return this.acionamento.conexaoEletrica; }
  /** Devolve `this.acionamento.forcaNaHasteN`. Efeitos indiretos seguem as dependências chamadas. @contract f-fc7b357de6957594 */
  public get forcaNaHasteN(): number { return this.acionamento.forcaNaHasteN; }
  /** Devolve `this.acionamento.potenciaEletricaAtualW`. Efeitos indiretos seguem as dependências chamadas. @contract f-bf9ebc8a79202075 */
  public get potenciaEletricaAtualW(): number { return this.acionamento.potenciaEletricaAtualW; }
  /** Encaminha dt em s ao acionamento para calcular consumo e forças; movimento continua no core. @contract f-7292795abd661d3e @reviewed M12-DOC: implementação lida. */
  public override prepararPassoOperacional(dtS: number): void { this.acionamento.prepararPassoOperacional(dtS); }
  /** Devolve `this.acionamento.obterForcasOperacionais()`. Dependências diretas: `this.acionamento.obterForcasOperacionais`. Efeitos indiretos seguem as dependências chamadas. @contract f-355a0323f882c7b7 */
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return this.acionamento.obterForcasOperacionais(); }
  /** Devolve `this.acionamento.obterForcasNaHaste()`. Dependências diretas: `this.acionamento.obterForcasNaHaste`. Efeitos indiretos seguem as dependências chamadas. @contract f-d12e66fa2a5f7c50 */
  public obterForcasNaHaste(): readonly ForcaFisicaSolicitada[] { return this.acionamento.obterForcasNaHaste(); }
}
