import type { FonteEletrica } from '../objetos/fontes-de-energia/FonteEletrica';
import { Objeto } from '../objetos/base/Objeto';
import { Interruptor } from './eletrica/Interruptor';
import { Resistor } from './eletrica/Resistor';

export interface DestinoEletricoRecarregavel {
  /** Recebe oferta não negativa em J e retorna energia efetivamente armazenada conforme capacidade/integridade; altera reserva do destino, não fonte por esta porta. @contract f-379a6000119fc4ae @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  receberEnergia(energiaJ: number): number;
}

export interface DefinicaoConexaoEletrica {
  readonly id: string;
  readonly fonte: FonteEletrica;
  readonly destino: Objeto;
  /** Alcance entre os centros dos corpos, como o modelo atual de LinhaDePropelente. */
  readonly comprimentoMaximoM: number;
  /** Limitador ativo; zero bloqueia o fornecimento. Não modela um fusível. */
  readonly correnteMaximaA: number;
  readonly resistenciaCaboOhm?: number;
  readonly resistores?: readonly Resistor[];
  readonly interruptores?: readonly Pick<Interruptor, 'estaFechado'>[];
  readonly inicialmenteLigada?: boolean;
}

/**
 * Ligação CC ou CA RMS (fator de potência unitário): ciclo de conexão equivalente à linha de propelente, com leis elétricas próprias.
 * Um consumidor prepara o passo uma vez; todas as suas cargas compartilham o orçamento.
 */
export class ConexaoEletrica {
  private rompida = false;
  private desconectada = false;
  private readonly principal: Interruptor;
  private readonly resistores: readonly Resistor[];
  private readonly interruptores: readonly Pick<Interruptor, 'estaFechado'>[];
  private limiteA: number;
  private resistenciaCabo: number;
  private dtPassoS?: number;
  private energiaFonteNoPassoJ = 0;
  private energiaCargaNoPassoJ = 0;
  private energiaPerdidaNoPassoJ = 0;
  private energiaPerdidaAcumuladaJ = 0;
  private correnteCalculadaA = 0;
  private limitada = false;

  /** Configura ligação DC/CA RMS por fonte/destino distintos, alcance m positivo, corrente A e resistência Ω não negativas; congela listas e cria interruptor principal. @contract f-521216612aa29c82 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoConexaoEletrica) {
    if (!definicao.id || !Number.isFinite(definicao.comprimentoMaximoM) || definicao.comprimentoMaximoM <= 0 || definicao.fonte === definicao.destino) throw new Error('Definição de conexão elétrica inválida.');
    this.validarNaoNegativo(definicao.correnteMaximaA, 'Corrente máxima (A)');
    this.validarNaoNegativo(definicao.resistenciaCaboOhm ?? 0, 'Resistência (ohms)');
    this.limiteA = definicao.correnteMaximaA;
    this.resistenciaCabo = definicao.resistenciaCaboOhm ?? 0;
    this.resistores = Object.freeze([...(definicao.resistores ?? [])]);
    this.interruptores = Object.freeze([...(definicao.interruptores ?? [])]);
    this.principal = new Interruptor(`${definicao.id}-principal`, definicao.inicialmenteLigada ?? false);
    if (!Number.isFinite(this.resistenciaTotalOhm)) throw new Error('Resistência total inválida.');
  }
  /** Consulta identidade declarada da ligação, sem alterar conexão. @contract f-d89b0992c094f4b9 @reviewed M12-DOC: implementação lida. */
  public get id(): string { return this.definicao.id; }
  /** Devolve a porta da fonte elétrica real, não uma cópia da energia. @contract f-c04be2d44ef07071 @reviewed M12-DOC: implementação lida. */
  public get fonte(): FonteEletrica { return this.definicao.fonte; }
  /** Devolve o objeto consumidor real ligado ao circuito. @contract f-b070eb40e19ee68a @reviewed M12-DOC: implementação lida. */
  public get destino(): Objeto { return this.definicao.destino; }
  /** Consulta alcance máximo configurado em m entre centros dos corpos. @contract f-30c52f0f55cccd48 @reviewed M12-DOC: implementação lida. */
  public get comprimentoMaximoM(): number { return this.definicao.comprimentoMaximoM; }
  /** Mede distância euclidiana atual entre centros de fonte e consumidor em m; não verifica ruptura por si. @contract f-3241b5f6a6930704 @reviewed M12-DOC: implementação lida. */
  public get comprimentoAtualM(): number { return this.fonte.getEstadoFisico().posicaoM.subtrair(this.destino.getEstadoFisico().posicaoM).magnitude; }
  /** Consulta limite ativo de corrente em A; zero bloqueia fornecimento. @contract f-a058adbafa8eb886 @reviewed M12-DOC: implementação lida. */
  public get correnteMaximaA(): number { return this.limiteA; }
  /** Consulta resistência própria configurada em Ω. @contract f-7386c6d9b1709c23 @reviewed M12-DOC: implementação lida. */
  public get resistenciaCaboOhm(): number { return this.resistenciaCabo; }
  /** Soma resistência do cabo e resistores em série, em Ω. @contract f-855f8024b03ad98a @reviewed M12-DOC: implementação lida. */
  public get resistenciaTotalOhm(): number { return this.resistenciaCabo + this.resistores.reduce((soma, resistor) => soma + resistor.resistenciaOhm, 0); }
  /** Consulta ruptura irreversível registrada da ligação. @contract f-337b6374231acd8c @reviewed M12-DOC: implementação lida. */
  public get estaRompida(): boolean { return this.rompida; }
  /** Consulta desacoplamento operacional, distinto de ruptura. @contract f-2a8853db5708b2ca @reviewed M12-DOC: implementação lida. */
  public get estaDesconectada(): boolean { return this.desconectada; }
  /** Consulta posição do interruptor principal de domínio. @contract f-ee348401a2121328 @reviewed M12-DOC: implementação lida. */
  public get interruptorPrincipalFechado(): boolean { return this.principal.estaFechado; }
  /** Exige principal e todos os interruptores em série fechados, sem acionar contatos. @contract f-fe8ca12bccdb30d9 @reviewed M12-DOC: implementação lida. */
  public get interruptorFechado(): boolean { return this.principal.estaFechado && this.interruptores.every((interruptor) => interruptor.estaFechado); }
  /** Consulta se fonte tem carga e integridade positiva. @contract f-9e6a6d0b24dede00 @reviewed M12-DOC: implementação lida. */
  public get fonteDisponivel(): boolean { return !this.fonte.estaDescarregada && this.fonte.integridadeEstrutural > 0; }
  /** Verifica conexão íntegra/acoplada, alcance, disponibilidade e integridade de fonte/destino e corrente máxima positiva; não exige interruptores fechados. @contract f-81abdf41e4bd7773 @reviewed M12-DOC: implementação lida. */
  public get podeConduzir(): boolean {
    return !this.rompida && !this.desconectada && this.comprimentoAtualM <= this.comprimentoMaximoM &&
      this.fonteDisponivel && this.destino.integridadeEstrutural > 0 && this.limiteA > 0;
  }
  /** Combina permissivo físico de condução e fechamento de todos os interruptores. @contract f-f686dfa03004edaa @reviewed M12-DOC: implementação lida. */
  public get estaEnergizada(): boolean { return this.podeConduzir && this.interruptorFechado; }
  /** Nega condição de energização da própria ligação. @contract f-ba9260bfca531127 @reviewed M12-DOC: implementação lida. */
  public get estaIndisponivel(): boolean { return !this.estaEnergizada; }
  /** Consulta tensão nominal da fonte em V. @contract f-f85c66d9716c76fa @reviewed M12-DOC: implementação lida. */
  public get tensaoNominalV(): number { return this.fonte.tensaoNominalV; }
  /** Devolve corrente média calculada em A se energizada; desenergizada retorna zero. @contract f-c2aa9b4309abd126 @reviewed M12-DOC: implementação lida. */
  public get correnteAtualA(): number { return this.estaEnergizada ? this.correnteCalculadaA : 0; }
  /** Devolve max(0,Vfonte−I·R) em V se energizada; caso contrário zero. @contract f-2e63d9333771a5bd @reviewed M12-DOC: implementação lida. */
  public get tensaoSaidaV(): number { return this.estaEnergizada ? Math.max(0, this.tensaoNominalV - this.correnteCalculadaA * this.resistenciaTotalOhm) : 0; }
  /** Consulta se alguma solicitação foi atendida parcialmente no passo. @contract f-203eb3e602cd394d @reviewed M12-DOC: implementação lida. */
  public get correnteLimitada(): boolean { return this.limitada; }
  /** Consulta energia entregue à carga no passo em J. @contract f-100d4af3cfc2b664 @reviewed M12-DOC: implementação lida. */
  public get energiaEntregueNoPassoJ(): number { return this.energiaCargaNoPassoJ; }
  /** Consulta energia retirada da fonte no passo em J. @contract f-ff23ec6a2c901ac0 @reviewed M12-DOC: implementação lida. */
  public get energiaConsumidaNoPassoJ(): number { return this.energiaFonteNoPassoJ; }
  /** Consulta perdas do circuito no passo em J. @contract f-c929698df5687dfe @reviewed M12-DOC: implementação lida. */
  public get energiaDissipadaNoPassoJ(): number { return this.energiaPerdidaNoPassoJ; }
  /** Consulta perdas acumuladas desde criação em J. @contract f-b5043c5c966c68ea @reviewed M12-DOC: implementação lida. */
  public get energiaDissipadaAcumuladaJ(): number { return this.energiaPerdidaAcumuladaJ; }

  /** Abre contato principal e zera corrente observada; não remove o cabo físico. @contract f-78e9519429d1d786 @reviewed M12-DOC: implementação lida. */
  public abrirInterruptor(): void { this.principal.abrir(); this.correnteCalculadaA = 0; }
  /** Fecha principal somente se podeConduzir; retorno informa se a série inteira ficou fechada. @contract f-1d7d761306b75436 @reviewed M12-DOC: implementação lida. */
  public fecharInterruptor(): boolean {
    if (!this.podeConduzir) return false;
    this.principal.fechar(); return this.interruptorFechado;
  }
  /** Marca ligação desacoplada e abre principal; não apaga a fonte/destino. @contract f-310be7c1d73e2c35 @reviewed M12-DOC: implementação lida. */
  public desconectar(): void { this.desconectada = true; this.abrirInterruptor(); }
  /** Reconexão não repara ruptura nem religa o interruptor.
   * @remarks Reacopla apenas sem ruptura e dentro do alcance; não fecha interruptor nem restaura operação do consumidor.
   * @contract f-c9255cdbb977522c
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public conectar(): boolean {
    if (this.rompida || this.comprimentoAtualM > this.comprimentoMaximoM) return false;
    this.desconectada = false; return true;
  }
  /** Marca ruptura e abre circuito, zerando corrente; não repara automaticamente. @contract f-d5cc85db867621b1 @reviewed M12-DOC: implementação lida. */
  public romper(): void { this.rompida = true; this.abrirInterruptor(); }
  /** Rompe ligação ainda acoplada quando distância entre centros excede alcance; independe de carga solicitada. @contract f-51d0cf15ae6e8270 @reviewed M12-DOC: implementação lida. */
  public verificarIntegridade(): void {
    if (!this.desconectada && this.comprimentoAtualM > this.comprimentoMaximoM) this.romper();
  }
  /** Valida limite A finito/não negativo e invalida orçamento preparado/corrente, exigindo nova preparação. @contract f-15d7f6d31cb42b5c @reviewed M12-DOC: implementação lida. */
  public configurarCorrenteMaxima(correnteA: number): void {
    this.validarNaoNegativo(correnteA, 'Corrente máxima (A)');
    this.limiteA = correnteA; this.dtPassoS = undefined; this.correnteCalculadaA = 0;
  }
  /** Valida resistência Ω finita/não negativa e total finito; invalida orçamento/corrente. @contract f-dad1252f4587bd4e @reviewed M12-DOC: implementação lida. */
  public configurarResistenciaCabo(resistenciaOhm: number): void {
    this.validarNaoNegativo(resistenciaOhm, 'Resistência (ohms)');
    if (!Number.isFinite(resistenciaOhm + this.resistores.reduce((soma, r) => soma + r.resistenciaOhm, 0))) throw new Error('Resistência total inválida.');
    this.resistenciaCabo = resistenciaOhm; this.dtPassoS = undefined; this.correnteCalculadaA = 0;
  }
  /** Exige dtS em s positivo/finito, reinicia os orçamentos compartilhados e verifica ruptura; o proprietário deve chamar uma vez por subpasso. @contract f-157913e61ca42f2e @reviewed M12-DOC: implementação lida. */
  public prepararPasso(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo elétrico deve ser positivo e finito, em segundos.');
    this.dtPassoS = dtS;
    this.energiaFonteNoPassoJ = 0; this.energiaCargaNoPassoJ = 0; this.energiaPerdidaNoPassoJ = 0;
    this.correnteCalculadaA = 0; this.limitada = false;
    this.verificarIntegridade();
  }
  /** Entrega energia à carga descontando também perdas I²R da bateria.
   * @remarks Entrega J limitados por fonte, corrente e máximo P=I(V−RI), no ramo de maior tensão; retira energia da fonte incluindo perdas I²R e acumula orçamento comum entre cargas. Exige passo preparado e solicitação J finita/não negativa.
   * @contract f-393b4e7aa411dc81
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public fornecerEnergia(energiaSolicitadaJ: number): number {
    this.validarNaoNegativo(energiaSolicitadaJ, 'Energia solicitada (J)');
    if (this.dtPassoS === undefined) throw new Error('Prepare o passo elétrico antes de solicitar energia.');
    if (this.estaIndisponivel || energiaSolicitadaJ === 0) return 0;
    const dt = this.dtPassoS;
    const v = this.tensaoNominalV;
    const r = this.resistenciaTotalOhm;
    const energiaDesejadaTotalJ = this.energiaCargaNoPassoJ + energiaSolicitadaJ;
    // P = I(V - RI). Usa o ramo de maior tensão, até o máximo transferível.
    const maxCorrenteEnergiaA = ((this.fonte.energiaDisponivelNoPassoJ ?? this.fonte.energiaArmazenadaJ) + this.energiaFonteNoPassoJ) / (v * dt);
    const iMax = Math.min(this.limiteA, r === 0 ? Infinity : v / (2 * r), maxCorrenteEnergiaA);
    const potenciaMaxW = iMax * (v - r * iMax);
    const potenciaW = Math.min(energiaDesejadaTotalJ / dt, potenciaMaxW);
    const correnteA = r === 0 ? potenciaW / v : (2 * potenciaW) / (v + Math.sqrt(Math.max(0, v * v - 4 * r * potenciaW)));
    const energiaFonteTotalJ = v * correnteA * dt;
    const energiaCargaTotalJ = potenciaW * dt;
    const deltaFonteJ = Math.max(0, energiaFonteTotalJ - this.energiaFonteNoPassoJ);
    const fornecidaJ = this.fonte.fornecerEnergia(deltaFonteJ);
    const fracao = deltaFonteJ === 0 ? 1 : fornecidaJ / deltaFonteJ;
    const entregueJ = Math.max(0, energiaCargaTotalJ - this.energiaCargaNoPassoJ) * fracao;
    const perdaJ = Math.max(0, fornecidaJ - entregueJ);
    this.energiaFonteNoPassoJ += fornecidaJ; this.energiaCargaNoPassoJ += entregueJ;
    this.energiaPerdidaNoPassoJ += perdaJ; this.energiaPerdidaAcumuladaJ += perdaJ;
    this.correnteCalculadaA = this.energiaFonteNoPassoJ / (v * dt);
    this.limitada ||= entregueJ < energiaSolicitadaJ - 1e-9;
    return entregueJ;
  }
  /** Exige destino recarregável, fornece energia pela mesma ligação e delega armazenamento; retorno é J efetivamente aceitos pelo destino. @contract f-a580d071e7323483 @reviewed M12-DOC: implementação lida. */
  public transferirEnergiaParaDestino(energiaSolicitadaJ: number): number {
    if (!('receberEnergia' in this.definicao.destino)) throw new Error('Destino elétrico não aceita carga.');
    const energiaEntregue = this.fornecerEnergia(energiaSolicitadaJ);
    return (this.definicao.destino as Objeto & DestinoEletricoRecarregavel).receberEnergia(energiaEntregue);
  }
  /** Rejeita valor não finito ou negativo com diagnóstico contendo o nome/unidade recebidos; não altera configuração. @contract f-79915faf97fa4e41 @reviewed M12-DOC: implementação lida. */
  private validarNaoNegativo(valor: number, nome: string): void {
    if (!Number.isFinite(valor) || valor < 0) throw new Error(`${nome} deve ser finito e não negativo.`);
  }
}
