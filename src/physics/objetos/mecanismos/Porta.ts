import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada } from '../base/Objeto';
import { CilindroEletrico } from '../atuadores/CilindroEletrico';
import { ComCilindro, type EntradasCilindro } from '../atuadores/Cilindro';
import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Contator } from '../../conexoes/eletrica/Contator';
import { Bateria } from '../fontes-de-energia/Bateria';
import { SwitchFimDeCurso } from '../../sensores/SwitchFimDeCurso';
import { EstadoOperacional, SistemaOperacional } from '../../SistemaOperacional';
import { Vetor3 } from '../../Vetor3';

export interface DefinicaoPorta extends DefinicaoObjeto {
  readonly batente: Objeto;
  readonly bateria: Bateria;
  readonly conexaoEletrica?: ConexaoEletrica;
  readonly potenciaSeparada?: { readonly conexao: ConexaoEletrica; readonly contator: Contator };
  readonly sensorAberto: SwitchFimDeCurso;
  readonly sensorFechado: SwitchFimDeCurso;
  readonly velocidadeAvancoMps: number;
  readonly velocidadeRecuoMps: number;
  readonly forcaMaximaN: number;
  readonly tensaoNominalV: number;
  readonly rigidezRetencaoNPorM: number;
  readonly potenciaEmRepousoW: number;
  readonly obterTravaRecuada?: () => boolean;
  readonly obterForcasDaTrava?: () => readonly ForcaFisicaSolicitada[];
  readonly apoioEstruturalDisponivel?: () => boolean;
}

/** Porta vertical: identidade física de Objeto e comportamento herdado do cilindro. */
export class Porta extends ComCilindro(Objeto) {
  private readonly acionamento: CilindroEletrico;
  private readonly alimentacao = new SistemaOperacional('alimentação', EstadoOperacional.Desligado);
  private readonly controle = new SistemaOperacional('controle', EstadoOperacional.Desligado);
  private potenciaSolicitada = false;
  private comando: 'abrir' | 'fechar' | 'parar' = 'parar';

  public constructor(private readonly configuracaoPorta: DefinicaoPorta) {
    super(configuracaoPorta);
    if (!Number.isFinite(configuracaoPorta.tensaoNominalV) || configuracaoPorta.tensaoNominalV <= 0) throw new Error('Tensão nominal deve ser positiva, em V.');
    this.acionamento = new CilindroEletrico({
      ...configuracaoPorta, fonte: configuracaoPorta.potenciaSeparada?.conexao.fonte ?? configuracaoPorta.bateria,
      conexaoEletrica: configuracaoPorta.potenciaSeparada?.conexao ?? configuracaoPorta.conexaoEletrica, corpo: configuracaoPorta.batente, haste: this,
      direcaoDeCursoM: new Vetor3(0, 1, 0), operacaoAutorizada: () => this.operacional && (this.configuracaoPorta.potenciaSeparada?.contator.estaFechado ?? true),
    });
    this.instalarCilindro(this.acionamento);
    this.conexaoEletrica.abrirInterruptor();
  }

  public get sensorAbertoAcionado(): boolean {
    return this.configuracaoPorta.sensorAberto.estaAcionado();
  }
  public get sensorFechadoAcionado(): boolean {
    return this.configuracaoPorta.sensorFechado.estaAcionado();
  }
  public get conexaoEletrica(): ConexaoEletrica { return this.configuracaoPorta.conexaoEletrica ?? this.acionamento.conexaoEletrica; }
  public get conexaoPotencia(): ConexaoEletrica { return this.acionamento.conexaoEletrica; }
  public get contatorFechado(): boolean { return this.configuracaoPorta.potenciaSeparada?.contator.estaFechado ?? this.controleLigado; }
  public get potenciaDisponivel(): boolean { return !this.configuracaoPorta.potenciaSeparada || (this.conexaoPotencia.podeConduzir && this.conexaoPotencia.interruptorPrincipalFechado); }
  public get fonteDisponivel(): boolean {
    const bateria = this.configuracaoPorta.bateria;
    return this.conexaoEletrica.podeConduzir && !bateria.estaDescarregada && bateria.integridadeEstrutural > 0 &&
      Math.abs(bateria.tensaoNominalV - this.configuracaoPorta.tensaoNominalV) <= this.configuracaoPorta.tensaoNominalV * 0.05;
  }
  public get alimentacaoLigada(): boolean { return this.alimentacao.operacional && this.fonteDisponivel && this.conexaoEletrica.estaEnergizada; }
  public get controleLigado(): boolean { return this.controle.operacional && this.alimentacaoLigada; }
  public get operacional(): boolean {
    return this.controleLigado && this.potenciaDisponivel && this.apoioEstruturalDisponivel
      && this.integridadeEstrutural > 0 && this.configuracaoPorta.batente.integridadeEstrutural > 0;
  }
  public get apoioEstruturalDisponivel(): boolean { return this.configuracaoPorta.apoioEstruturalDisponivel?.() ?? true; }
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
    this.potenciaSolicitada = false;
    this.comando = 'parar';
    this.limparSelo();
    this.configuracaoPorta.potenciaSeparada?.contator.desarmar();
    this.atualizarEntradasDosSensores();
  }
  public abrir(): boolean { return this.solicitarMovimento('abrir'); }
  public fechar(): boolean { return this.solicitarMovimento('fechar'); }
  public parar(): void { this.comando = 'parar'; this.limparSelo(); this.atualizarEntradasDosSensores(); }

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
    this.potenciaSolicitada = true;
    this.atualizarEntradasDosSensores();
    return true;
  }
  private atualizarEntradasDosSensores(): void {
    const travaLiberada = this.configuracaoPorta.obterTravaRecuada?.() ?? true;
    super.definirEntradas({
      avancar: this.operacional && this.comando === 'abrir' && travaLiberada,
      recuar: this.operacional && this.comando === 'fechar' && travaLiberada,
      avancado: this.sensorAbertoAcionado, recuado: this.sensorFechadoAcionado,
    });
  }
  public override prepararPassoOperacional(dtS: number): void {
    this.conexaoEletrica.verificarIntegridade();
    const potencia = this.configuracaoPorta.potenciaSeparada;
    if (potencia) {
      potencia.conexao.verificarIntegridade();
      this.conexaoEletrica.prepararPasso(dtS);
      if (this.alimentacaoLigada) {
        const energiaControle = this.conexaoEletrica.fornecerEnergia(6 * dtS);
        if (energiaControle < 6 * dtS - 1e-10 || Math.abs(this.conexaoEletrica.tensaoSaidaV - 24) > 1.2) this.desligarAlimentacao();
      }
      if (!this.potenciaDisponivel) {
        this.potenciaSolicitada = false; this.parar();
      }
      const autorizar = this.potenciaSolicitada && this.operacional;
      const energiaBobina = autorizar ? this.conexaoEletrica.fornecerEnergia(potencia.contator.potenciaBobinaW * dtS) : 0;
      potencia.contator.atualizarBobina(autorizar, this.conexaoEletrica.tensaoSaidaV, energiaBobina, dtS);
      if (autorizar && !potencia.contator.estaFechado) { this.potenciaSolicitada = false; this.desligarControle(); }
    }
    if (!this.fonteDisponivel || !this.conexaoEletrica.estaEnergizada) this.desligarAlimentacao();
    if (!this.alimentacaoLigada || this.integridadeEstrutural === 0 || this.configuracaoPorta.batente.integridadeEstrutural === 0) this.desligarControle();
    this.atualizarEntradasDosSensores();
    this.acionamento.prepararPassoOperacional(dtS);
  }
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    return [
      ...(this.operacional ? this.acionamento.obterForcasNaHaste() : []),
      ...(this.configuracaoPorta.obterForcasDaTrava?.() ?? []),
    ];
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
