import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada } from '../base/Objeto';
import { CilindroEletrico } from '../atuadores/CilindroEletrico';
import { ComCilindro, type EntradasCilindro } from '../atuadores/Cilindro';
import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Bateria } from '../fontes-de-energia/Bateria';
import { SwitchFimDeCurso } from '../../sensores/SwitchFimDeCurso';
import { EstadoOperacional, SistemaOperacional } from '../../SistemaOperacional';
import { Vetor3 } from '../../Vetor3';

export interface DefinicaoPorta extends DefinicaoObjeto {
  readonly batente: Objeto;
  readonly bateria: Bateria;
  readonly conexaoEletrica?: ConexaoEletrica;
  readonly sensorAberto: SwitchFimDeCurso;
  readonly sensorFechado: SwitchFimDeCurso;
  readonly velocidadeAvancoMps: number;
  readonly velocidadeRecuoMps: number;
  readonly forcaMaximaN: number;
  readonly tensaoNominalV: number;
  readonly rigidezRetencaoNPorM: number;
  readonly potenciaEmRepousoW: number;
}

/** Porta vertical: identidade física de Objeto e comportamento herdado do cilindro. */
export class Porta extends ComCilindro(Objeto) {
  private readonly acionamento: CilindroEletrico;
  private readonly alimentacao = new SistemaOperacional('alimentação', EstadoOperacional.Desligado);
  private readonly controle = new SistemaOperacional('controle', EstadoOperacional.Desligado);
  private comando: 'abrir' | 'fechar' | 'parar' = 'parar';

  public constructor(private readonly configuracaoPorta: DefinicaoPorta) {
    super(configuracaoPorta);
    if (!Number.isFinite(configuracaoPorta.tensaoNominalV) || configuracaoPorta.tensaoNominalV <= 0) throw new Error('Tensão nominal deve ser positiva, em V.');
    this.acionamento = new CilindroEletrico({
      ...configuracaoPorta, corpo: configuracaoPorta.batente, haste: this,
      direcaoDeCursoM: new Vetor3(0, 1, 0), operacaoAutorizada: () => this.operacional,
    });
    this.instalarCilindro(this.acionamento);
    this.conexaoEletrica.abrirInterruptor();
  }

  public get sensorAbertoAcionado(): boolean {
    return this.configuracaoPorta.sensorAberto.obterAlvoEmContato() === this;
  }
  public get sensorFechadoAcionado(): boolean {
    return this.configuracaoPorta.sensorFechado.obterAlvoEmContato() === this;
  }
  public get conexaoEletrica(): ConexaoEletrica { return this.acionamento.conexaoEletrica; }
  public get fonteDisponivel(): boolean {
    const bateria = this.configuracaoPorta.bateria;
    return this.conexaoEletrica.podeConduzir && !bateria.estaDescarregada && bateria.integridadeEstrutural > 0 &&
      Math.abs(bateria.tensaoNominalV - this.configuracaoPorta.tensaoNominalV) <= this.configuracaoPorta.tensaoNominalV * 0.05;
  }
  public get alimentacaoLigada(): boolean { return this.alimentacao.operacional && this.fonteDisponivel && this.conexaoEletrica.estaEnergizada; }
  public get controleLigado(): boolean { return this.controle.operacional && this.alimentacaoLigada; }
  public get operacional(): boolean {
    return this.controleLigado && this.integridadeEstrutural > 0 && this.configuracaoPorta.batente.integridadeEstrutural > 0;
  }
  public get comandoAtual(): string { return this.comando; }
  public get forcaAtualN(): number { return this.operacional ? this.acionamento.forcaNaHasteN : 0; }
  public get potenciaEletricaAtualW(): number { return this.operacional ? this.acionamento.potenciaEletricaAtualW : 0; }

  public ligarAlimentacao(): boolean {
    if (!this.fonteDisponivel) return false;
    if (!this.conexaoEletrica.fecharInterruptor()) return false;
    this.alimentacao.definirEstado(EstadoOperacional.Operacional);
    return true;
  }
  public desligarAlimentacao(): void {
    this.conexaoEletrica.abrirInterruptor();
    this.alimentacao.definirEstado(EstadoOperacional.Desligado);
    this.desligarControle();
  }
  public ligarControle(): boolean {
    if (!this.alimentacaoLigada || this.integridadeEstrutural === 0 || this.configuracaoPorta.batente.integridadeEstrutural === 0) return false;
    this.controle.definirEstado(EstadoOperacional.Operacional);
    return true;
  }
  public desligarControle(): void {
    this.controle.definirEstado(EstadoOperacional.Desligado);
    this.comando = 'parar';
    this.atualizarEntradasDosSensores();
  }
  public abrir(): boolean { return this.solicitarMovimento('abrir'); }
  public fechar(): boolean { return this.solicitarMovimento('fechar'); }
  public parar(): void { this.comando = 'parar'; this.atualizarEntradasDosSensores(); }

  /** API herdada: as realimentações válidas vêm dos sensores físicos, não do chamador. */
  public override definirEntradas(entradas: EntradasCilindro): void {
    if (entradas.avancar && entradas.recuar) throw new Error('Porta não pode abrir e fechar simultaneamente.');
    if (entradas.avancar) this.abrir();
    else if (entradas.recuar) this.fechar();
    else this.parar();
  }
  private solicitarMovimento(comando: 'abrir' | 'fechar'): boolean {
    if (!this.operacional) return false;
    this.comando = comando;
    this.atualizarEntradasDosSensores();
    return true;
  }
  private atualizarEntradasDosSensores(): void {
    super.definirEntradas({
      avancar: this.operacional && this.comando === 'abrir',
      recuar: this.operacional && this.comando === 'fechar',
      avancado: this.sensorAbertoAcionado, recuado: this.sensorFechadoAcionado,
    });
  }
  public override prepararPassoOperacional(dtS: number): void {
    this.conexaoEletrica.verificarIntegridade();
    if (!this.fonteDisponivel || !this.conexaoEletrica.estaEnergizada) this.desligarAlimentacao();
    if (!this.alimentacaoLigada || this.integridadeEstrutural === 0 || this.configuracaoPorta.batente.integridadeEstrutural === 0) this.desligarControle();
    if ((this.comando === 'abrir' && this.sensorAbertoAcionado) ||
        (this.comando === 'fechar' && this.sensorFechadoAcionado)) this.comando = 'parar';
    this.atualizarEntradasDosSensores();
    this.acionamento.prepararPassoOperacional(dtS);
  }
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    return this.operacional ? this.acionamento.obterForcasNaHaste() : [];
  }
  public obterReacaoNoBatente(): readonly ForcaFisicaSolicitada[] {
    return this.operacional ? this.acionamento.obterForcasOperacionais() : [];
  }
}

/** Travessa física que recebe a reação do motor por interface de forças. */
export class BatenteDePorta extends Objeto {
  public constructor(definicao: DefinicaoObjeto, private readonly obterReacao: () => readonly ForcaFisicaSolicitada[]) { super(definicao); }
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return this.obterReacao(); }
}
