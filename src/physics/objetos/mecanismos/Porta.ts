import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada } from '../base/Objeto';
import { CilindroEletrico } from '../atuadores/CilindroEletrico';
import { ComCilindro, type EntradasCilindro } from '../atuadores/Cilindro';
import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Contator } from '../../conexoes/eletrica/Contator';
import { Bateria } from '../fontes-de-energia/Bateria';
import { SwitchFimDeCurso } from '../../sensores/SwitchFimDeCurso';
import { EstadoOperacional, SistemaOperacional } from '../../SistemaOperacional';
import { Vetor3 } from '../../Vetor3';

export interface ComandoOperacionalDaPorta {
  readonly sequencia: number;
  readonly comando: 'abrir' | 'fechar' | 'parar';
}

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
  private sequenciaComandoMovimento = 0;
  private ultimoComandoOperacional?: ComandoOperacionalDaPorta;

  /** Inicializa folha física e acionamento vertical +Y contra batente, selecionando circuito de potência separado quando fornecido; valida tensão, instala comportamento e abre interruptor inicialmente. @contract f-d2cfa4d811ed7e35 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly configuracaoPorta: DefinicaoPorta) {
    super(configuracaoPorta);
    if (!Number.isFinite(configuracaoPorta.tensaoNominalV) || configuracaoPorta.tensaoNominalV <= 0) throw new Error('Tensão nominal deve ser positiva, em V.');
    this.acionamento = new CilindroEletrico({
      ...configuracaoPorta, fonte: configuracaoPorta.potenciaSeparada?.conexao.fonte ?? configuracaoPorta.bateria,
      conexaoEletrica: configuracaoPorta.potenciaSeparada?.conexao ?? configuracaoPorta.conexaoEletrica, corpo: configuracaoPorta.batente, haste: this,
      direcaoDeCursoM: new Vetor3(0, 1, 0), /** Devolve `this.operacional && (this.configuracaoPorta.potenciaSeparada?.contator.estaFechado ?? true)`. Efeitos indiretos seguem as dependências chamadas. @contract f-42ed7864866c1b4e */
                                            operacaoAutorizada: () => this.operacional && (this.configuracaoPorta.potenciaSeparada?.contator.estaFechado ?? true),
    });
    this.instalarCilindro(this.acionamento);
    this.conexaoEletrica.abrirInterruptor();
  }

  /** Consulta estado do sensor de abertura pela porta operacional, sem deduzir posição por animação. @contract f-e7ca86a464409ee0 @reviewed M12-DOC: implementação lida. */
  public get sensorAbertoAcionado(): boolean {
    return this.configuracaoPorta.sensorAberto.estaAcionado();
  }
  /** Consulta estado do sensor de fechamento, sem alterar geometria. @contract f-91c75a864106899d @reviewed M12-DOC: implementação lida. */
  public get sensorFechadoAcionado(): boolean {
    return this.configuracaoPorta.sensorFechado.estaAcionado();
  }
  /** Devolve `this.configuracaoPorta.conexaoEletrica ?? this.acionamento.conexaoEletrica`. Efeitos indiretos seguem as dependências chamadas. @contract f-465e9cfefe680cd1 */
  public get conexaoEletrica(): ConexaoEletrica { return this.configuracaoPorta.conexaoEletrica ?? this.acionamento.conexaoEletrica; }
  /** Devolve `this.acionamento.conexaoEletrica`. Efeitos indiretos seguem as dependências chamadas. @contract f-b608266eef73c938 */
  public get conexaoPotencia(): ConexaoEletrica { return this.acionamento.conexaoEletrica; }
  /** Devolve `this.configuracaoPorta.potenciaSeparada?.contator.estaFechado ?? this.controleLigado`. Efeitos indiretos seguem as dependências chamadas. @contract f-95186393d08bc5f0 */
  public get contatorFechado(): boolean { return this.configuracaoPorta.potenciaSeparada?.contator.estaFechado ?? this.controleLigado; }
  /** Devolve `!this.configuracaoPorta.potenciaSeparada || (this.conexaoPotencia.podeConduzir && this.conexaoPotencia.interruptorPrincipalFechado)`. Efeitos indiretos seguem as dependências chamadas. @contract f-2749d2f01556cd78 */
  public get potenciaDisponivel(): boolean { return !this.configuracaoPorta.potenciaSeparada || (this.conexaoPotencia.podeConduzir && this.conexaoPotencia.interruptorPrincipalFechado); }
  /** Exige continuidade, bateria carregada/íntegra e tensão dentro de ±5% da nominal; consulta disponibilidade antes de energização. @contract f-24b8af59a69d534b @reviewed M12-DOC: implementação lida. */
  public get fonteDisponivel(): boolean {
    const bateria = this.configuracaoPorta.bateria;
    return this.conexaoEletrica.podeConduzir && !bateria.estaDescarregada && bateria.integridadeEstrutural > 0 &&
      Math.abs(bateria.tensaoNominalV - this.configuracaoPorta.tensaoNominalV) <= this.configuracaoPorta.tensaoNominalV * 0.05;
  }
  /** Devolve `this.alimentacao.operacional && this.fonteDisponivel && this.conexaoEletrica.estaEnergizada`. Efeitos indiretos seguem as dependências chamadas. @contract f-620faa6b19a2e7dd */
  public get alimentacaoLigada(): boolean { return this.alimentacao.operacional && this.fonteDisponivel && this.conexaoEletrica.estaEnergizada; }
  /** Devolve `this.controle.operacional && this.alimentacaoLigada`. Efeitos indiretos seguem as dependências chamadas. @contract f-40c94c7fa63d1a83 */
  public get controleLigado(): boolean { return this.controle.operacional && this.alimentacaoLigada; }
  /** Combina controle ligado, potência disponível, suporte estrutural e integridade da folha/batente; não implica movimento. @contract f-4db1c8f3bbdb2c30 @reviewed M12-DOC: implementação lida. */
  public get operacional(): boolean {
    return this.controleLigado && this.potenciaDisponivel && this.apoioEstruturalDisponivel
      && this.integridadeEstrutural > 0 && this.configuracaoPorta.batente.integridadeEstrutural > 0;
  }
  /** Devolve `this.configuracaoPorta.apoioEstruturalDisponivel?.() ?? true`. Dependências diretas: `this.configuracaoPorta.apoioEstruturalDisponivel`. Efeitos indiretos seguem as dependências chamadas. @contract f-84464637725e4f7c */
  public get apoioEstruturalDisponivel(): boolean { return this.configuracaoPorta.apoioEstruturalDisponivel?.() ?? true; }
  /** Devolve `this.comando`. Efeitos indiretos seguem as dependências chamadas. @contract f-a7808e220dd5ddc4 */
  public get comandoAtual(): string { return this.comando; }
  /** Evento retido do último comando que iniciou um movimento.
   * @contract f-63a9c418930f86d4
   */
  public obterUltimoComandoOperacional(): ComandoOperacionalDaPorta | undefined {
    return this.ultimoComandoOperacional;
  }
  /** Devolve `this.operacional ? this.acionamento.forcaNaHasteN : 0`. Efeitos indiretos seguem as dependências chamadas. @contract f-98ee8e3cbcb2740e */
  public get forcaAtualN(): number { return this.operacional ? this.acionamento.forcaNaHasteN : 0; }
  /** Devolve `this.operacional ? this.acionamento.potenciaEletricaAtualW : 0`. Efeitos indiretos seguem as dependências chamadas. @contract f-447504a1d4c47931 */
  public get potenciaEletricaAtualW(): number { return this.operacional ? this.acionamento.potenciaEletricaAtualW : 0; }

  /** Se fonte disponível e interruptor aceitar fechamento, marca alimentação operacional; recusa retorna false sem forçar circuito. @contract f-d80e9c6226e07edd @reviewed M12-DOC: implementação lida. */
  public ligarAlimentacao(): boolean {
    if (!this.fonteDisponivel) return false;
    if (!this.conexaoEletrica.fecharInterruptor()) return false;
    this.alimentacao.definirEstado(EstadoOperacional.Operacional);
    return true;
  }
  /** Abre interruptor, desliga alimentação e encadeia desligamento do controle. @contract f-97254903ab10186e @reviewed M12-DOC: implementação lida. */
  public desligarAlimentacao(): void {
    this.conexaoEletrica.abrirInterruptor();
    this.alimentacao.definirEstado(EstadoOperacional.Desligado);
    this.desligarControle();
  }
  /** Habilita somente com alimentação ligada e folha/batente não destruídos; retorna aceitação. @contract f-3822e888eb3248e9 @reviewed M12-DOC: implementação lida. */
  public ligarControle(): boolean {
    if (!this.alimentacaoLigada || this.integridadeEstrutural === 0 || this.configuracaoPorta.batente.integridadeEstrutural === 0) return false;
    this.controle.definirEstado(EstadoOperacional.Operacional);
    return true;
  }
  /** Desliga controle, retira solicitação de potência, registra parar, limpa selo, desarma contator e reavalia entradas; não zera velocidade. @contract f-5908fa63346ac702 @reviewed M12-DOC: implementação lida. */
  public desligarControle(): void {
    this.controle.definirEstado(EstadoOperacional.Desligado);
    this.potenciaSolicitada = false;
    this.registrarComandoOperacional('parar');
    this.limparSelo();
    this.configuracaoPorta.potenciaSeparada?.contator.desarmar();
    this.atualizarEntradasDosSensores();
  }
  /** Devolve `this.solicitarMovimento('abrir')`. Dependências diretas: `this.solicitarMovimento`. Efeitos indiretos seguem as dependências chamadas. @contract f-ae04387145ba033b */
  public abrir(): boolean { return this.solicitarMovimento('abrir'); }
  /** Devolve `this.solicitarMovimento('fechar')`. Dependências diretas: `this.solicitarMovimento`. Efeitos indiretos seguem as dependências chamadas. @contract f-085a903cd8963b67 */
  public fechar(): boolean { return this.solicitarMovimento('fechar'); }
  /** Registra pedido parar, limpa selo e atualiza entradas; parada efetiva depende das forças do mecanismo. @contract f-3e0a2f510657ffe1 @reviewed M12-DOC: implementação lida. */
  public parar(): void { this.registrarComandoOperacional('parar'); this.limparSelo(); this.atualizarEntradasDosSensores(); }

  /** API herdada: as realimentações válidas vêm dos sensores físicos, não do chamador.
   * @contract f-cce97e0907b34da6
   */
  public override definirEntradas(entradas: EntradasCilindro): void {
    if (entradas.avancar && entradas.recuar) throw new Error('Porta não pode abrir e fechar simultaneamente.');
    if (entradas.avancar) this.abrir();
    else if (entradas.recuar) this.fechar();
    else this.parar();
  }
  /** Recusa se não operacional; registra comando de movimento, solicita potência e atualiza entradas do cilindro. @contract f-cbb378311dda8b24 @reviewed M12-DOC: implementação lida. */
  private solicitarMovimento(comando: 'abrir' | 'fechar'): boolean {
    if (!this.operacional) return false;
    this.registrarComandoOperacional(comando);
    this.potenciaSolicitada = true;
    this.atualizarEntradasDosSensores();
    return true;
  }
  /** Só quando comando muda incrementa sequência e grava último comando; permite à trava distinguir novo pedido de comando mantido. @contract f-fb6b3d1ebdb8d0f3 @reviewed M12-DOC: implementação lida. */
  private registrarComandoOperacional(comando: 'abrir' | 'fechar' | 'parar'): void {
    if (this.comando === comando) return;
    this.comando = comando;
    this.sequenciaComandoMovimento += 1;
    this.ultimoComandoOperacional = { sequencia: this.sequenciaComandoMovimento, comando };
  }
  /** Converte abrir/fechar em avanço/recuo condicionado à operação e trava liberada; fins de curso vêm dos sensores, enviados ao comportamento herdado. @contract f-975b9fc2614745fe @reviewed M12-DOC: implementação lida. */
  private atualizarEntradasDosSensores(): void {
    const travaLiberada = this.configuracaoPorta.obterTravaRecuada?.() ?? true;
    super.definirEntradas({
      avancar: this.operacional && this.comando === 'abrir' && travaLiberada,
      recuar: this.operacional && this.comando === 'fechar' && travaLiberada,
      avancado: this.sensorAbertoAcionado, recuado: this.sensorFechadoAcionado,
    });
  }
  /** Verifica circuitos e, com potência separada, consome controle 6 W/bobina e desarma por falta de energia/tensão. Reavalia alimentação, integridade, comandos/sensores e prepara servo; não integra deslocamento. @contract f-58044e53e4878da0 @reviewed M12-DOC: implementação lida. */
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
  /** Combina força na folha pelo acionamento quando operacional com forças da trava fornecidas pela porta injetada; não duplica reação no batente. @contract f-a95597ce6d32f242 @reviewed M12-DOC: implementação lida. */
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    return [
      ...(this.operacional ? this.acionamento.obterForcasNaHaste() : []),
      ...(this.configuracaoPorta.obterForcasDaTrava?.() ?? []),
    ];
  }
  /** Retorna forças de reação do acionamento se porta operacional, senão vazio; aplicação ao batente cabe ao core. @contract f-a3740f2b3d603565 @reviewed M12-DOC: implementação lida. */
  public obterReacaoNoBatente(): readonly ForcaFisicaSolicitada[] {
    return this.operacional ? this.acionamento.obterForcasOperacionais() : [];
  }
}

/** Travessa física que recebe a reação do motor por interface de forças. */
export class BatenteDePorta extends Objeto {
  /** Inicializa corpo físico do batente com propriedades herdadas; ancoragens/uniões são componentes externos. @contract f-f5c6f081fdd28132 @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoObjeto, private readonly obterReacao: () => readonly ForcaFisicaSolicitada[]) { super(definicao); }
  /** Devolve `this.obterReacao()`. Dependências diretas: `this.obterReacao`. Efeitos indiretos seguem as dependências chamadas. @contract f-54331652b68582ed */
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return this.obterReacao(); }
}
