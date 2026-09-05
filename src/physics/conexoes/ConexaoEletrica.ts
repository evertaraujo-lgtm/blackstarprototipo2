import { Bateria } from '../objetos/fontes-de-energia/Bateria';
import { Objeto } from '../objetos/base/Objeto';
import { Interruptor } from './eletrica/Interruptor';
import { Resistor } from './eletrica/Resistor';

export interface DefinicaoConexaoEletrica {
  readonly id: string;
  readonly fonte: Bateria;
  readonly destino: Objeto;
  /** Alcance entre os centros dos corpos, como o modelo atual de LinhaDePropelente. */
  readonly comprimentoMaximoM: number;
  /** Limitador ativo; zero bloqueia o fornecimento. Não modela um fusível. */
  readonly correnteMaximaA: number;
  readonly resistenciaCaboOhm?: number;
  readonly resistores?: readonly Resistor[];
  readonly interruptores?: readonly Interruptor[];
  readonly inicialmenteLigada?: boolean;
}

/**
 * Ligação DC: ciclo de conexão equivalente à linha de propelente, com leis elétricas próprias.
 * Um consumidor prepara o passo uma vez; todas as suas cargas compartilham o orçamento.
 */
export class ConexaoEletrica {
  private rompida = false;
  private desconectada = false;
  private readonly principal: Interruptor;
  private readonly resistores: readonly Resistor[];
  private readonly interruptores: readonly Interruptor[];
  private limiteA: number;
  private resistenciaCabo: number;
  private dtPassoS?: number;
  private energiaFonteNoPassoJ = 0;
  private energiaCargaNoPassoJ = 0;
  private energiaPerdidaNoPassoJ = 0;
  private energiaPerdidaAcumuladaJ = 0;
  private correnteCalculadaA = 0;
  private limitada = false;

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
  public get id(): string { return this.definicao.id; }
  public get fonte(): Bateria { return this.definicao.fonte; }
  public get destino(): Objeto { return this.definicao.destino; }
  public get comprimentoMaximoM(): number { return this.definicao.comprimentoMaximoM; }
  public get comprimentoAtualM(): number { return this.fonte.getEstadoFisico().posicaoM.subtrair(this.destino.getEstadoFisico().posicaoM).magnitude; }
  public get correnteMaximaA(): number { return this.limiteA; }
  public get resistenciaCaboOhm(): number { return this.resistenciaCabo; }
  public get resistenciaTotalOhm(): number { return this.resistenciaCabo + this.resistores.reduce((soma, resistor) => soma + resistor.resistenciaOhm, 0); }
  public get estaRompida(): boolean { return this.rompida; }
  public get estaDesconectada(): boolean { return this.desconectada; }
  public get interruptorFechado(): boolean { return this.principal.estaFechado && this.interruptores.every((interruptor) => interruptor.estaFechado); }
  public get fonteDisponivel(): boolean { return !this.fonte.estaDescarregada && this.fonte.integridadeEstrutural > 0; }
  public get podeConduzir(): boolean {
    return !this.rompida && !this.desconectada && this.comprimentoAtualM <= this.comprimentoMaximoM &&
      this.fonteDisponivel && this.destino.integridadeEstrutural > 0 && this.limiteA > 0;
  }
  public get estaEnergizada(): boolean { return this.podeConduzir && this.interruptorFechado; }
  public get estaIndisponivel(): boolean { return !this.estaEnergizada; }
  public get tensaoNominalV(): number { return this.fonte.tensaoNominalV; }
  public get correnteAtualA(): number { return this.estaEnergizada ? this.correnteCalculadaA : 0; }
  public get tensaoSaidaV(): number { return this.estaEnergizada ? Math.max(0, this.tensaoNominalV - this.correnteCalculadaA * this.resistenciaTotalOhm) : 0; }
  public get correnteLimitada(): boolean { return this.limitada; }
  public get energiaEntregueNoPassoJ(): number { return this.energiaCargaNoPassoJ; }
  public get energiaConsumidaNoPassoJ(): number { return this.energiaFonteNoPassoJ; }
  public get energiaDissipadaNoPassoJ(): number { return this.energiaPerdidaNoPassoJ; }
  public get energiaDissipadaAcumuladaJ(): number { return this.energiaPerdidaAcumuladaJ; }

  public abrirInterruptor(): void { this.principal.abrir(); this.correnteCalculadaA = 0; }
  public fecharInterruptor(): boolean {
    if (!this.podeConduzir) return false;
    this.principal.fechar(); return this.interruptorFechado;
  }
  public desconectar(): void { this.desconectada = true; this.abrirInterruptor(); }
  /** Reconexão não repara ruptura nem religa o interruptor. */
  public conectar(): boolean {
    if (this.rompida || this.comprimentoAtualM > this.comprimentoMaximoM) return false;
    this.desconectada = false; return true;
  }
  public romper(): void { this.rompida = true; this.abrirInterruptor(); }
  public verificarIntegridade(): void {
    if (!this.desconectada && this.comprimentoAtualM > this.comprimentoMaximoM) this.romper();
  }
  public configurarCorrenteMaxima(correnteA: number): void {
    this.validarNaoNegativo(correnteA, 'Corrente máxima (A)');
    this.limiteA = correnteA; this.dtPassoS = undefined; this.correnteCalculadaA = 0;
  }
  public configurarResistenciaCabo(resistenciaOhm: number): void {
    this.validarNaoNegativo(resistenciaOhm, 'Resistência (ohms)');
    if (!Number.isFinite(resistenciaOhm + this.resistores.reduce((soma, r) => soma + r.resistenciaOhm, 0))) throw new Error('Resistência total inválida.');
    this.resistenciaCabo = resistenciaOhm; this.dtPassoS = undefined; this.correnteCalculadaA = 0;
  }
  public prepararPasso(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo elétrico deve ser positivo e finito, em segundos.');
    this.dtPassoS = dtS;
    this.energiaFonteNoPassoJ = 0; this.energiaCargaNoPassoJ = 0; this.energiaPerdidaNoPassoJ = 0;
    this.correnteCalculadaA = 0; this.limitada = false;
    this.verificarIntegridade();
  }
  /** Entrega energia à carga descontando também perdas I²R da bateria. */
  public fornecerEnergia(energiaSolicitadaJ: number): number {
    this.validarNaoNegativo(energiaSolicitadaJ, 'Energia solicitada (J)');
    if (this.dtPassoS === undefined) throw new Error('Prepare o passo elétrico antes de solicitar energia.');
    if (this.estaIndisponivel || energiaSolicitadaJ === 0) return 0;
    const dt = this.dtPassoS;
    const v = this.tensaoNominalV;
    const r = this.resistenciaTotalOhm;
    const energiaDesejadaTotalJ = this.energiaCargaNoPassoJ + energiaSolicitadaJ;
    // P = I(V - RI). Usa o ramo de maior tensão, até o máximo transferível.
    const maxCorrenteEnergiaA = (this.fonte.energiaArmazenadaJ + this.energiaFonteNoPassoJ) / (v * dt);
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
  private validarNaoNegativo(valor: number, nome: string): void {
    if (!Number.isFinite(valor) || valor < 0) throw new Error(`${nome} deve ser finito e não negativo.`);
  }
}
