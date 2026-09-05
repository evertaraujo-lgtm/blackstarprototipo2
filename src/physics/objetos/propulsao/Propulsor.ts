import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada, type JatoTermico } from '../base/Objeto';
import { EstadoOperacional, GerenciadorDeSistemas, SistemaOperacional } from '../../SistemaOperacional';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Bateria } from '../fontes-de-energia/Bateria';
import { Vetor3 } from '../../Vetor3';
import { LinhaDePropelente } from './alimentacao/LinhaDePropelente';
import { BombaPropelente } from './alimentacao/BombaPropelente';
import { CamaraCombustao } from './combustao/CamaraCombustao';
import { Bocal } from './combustao/Bocal';

/** Tensão nominal do barramento de equipamentos aeroespaciais nesta etapa. */
export const TENSAO_ALIMENTACAO_PADRAO_PROPULSOR_V = 28;

export interface DefinicaoPropulsor extends DefinicaoObjeto {
  readonly empuxoMaximoN: number;
  readonly vazaoMaximaKgS: number;
  readonly propelenteCompativel: string;
  /**
   * Tensão nominal de alimentação requerida pelo propulsor, em V.
   */
  readonly tensaoAlimentacaoNominalV?: number;
  /** Potência elétrica consumida em throttle máximo, em W. */
  readonly potenciaEletricaMaximaW?: number;
  /** Potência térmica total liberada em throttle máximo, em W. */
  readonly potenciaTermicaMaximaW?: number;
}

export type IdSistemaPropulsor = 'elétrico' | 'hidráulico' | 'combustível' | 'controle';

export interface CadeiaBipropelenteDoPropulsor {
  readonly linhaCombustivel: LinhaDePropelente;
  readonly bombaCombustivel: BombaPropelente;
  readonly linhaOxidante: LinhaDePropelente;
  readonly bombaOxidante: BombaPropelente;
  readonly camara: CamaraCombustao;
  readonly bocal: Bocal;
}

/** Propulsor físico que exige sequência de partida e ignição explícita. */
export class Propulsor extends Objeto {
  private throttle = 0;
  private tanque?: TanquePropelente;
  private conexao?: ConexaoEletrica;
  private get bateria(): Bateria | undefined { return this.conexao?.fonte; }
  private cadeiaBipropelente?: CadeiaBipropelenteDoPropulsor;
  private comprimentoMaxMangueiraM = 0;
  private mangueiraRompida = false;
  private empuxoAtualCalculadoN = 0;
  private vazaoAtualCalculadaKgS = 0;
  private ignicaoConfirmada = false;
  private ultimaNegacaoDeComando?: string;
  private readonly sistemaEletrico = new SistemaOperacional('elétrico', EstadoOperacional.Desligado);
  private readonly sistemaHidraulico = new SistemaOperacional('hidráulico', EstadoOperacional.Desligado);
  private readonly sistemaCombustivel = new SistemaOperacional('combustível', EstadoOperacional.Desligado);
  private readonly sistemaControle = new SistemaOperacional('controle', EstadoOperacional.Desligado);
  private readonly sistemas = new GerenciadorDeSistemas([this.sistemaEletrico, this.sistemaHidraulico, this.sistemaCombustivel, this.sistemaControle]);
  public constructor(private readonly definicaoPropulsor: DefinicaoPropulsor) {
    super(definicaoPropulsor);
    if (definicaoPropulsor.empuxoMaximoN <= 0 || definicaoPropulsor.vazaoMaximaKgS <= 0 || !definicaoPropulsor.propelenteCompativel) throw new Error('Definição de propulsor inválida.');
    if (definicaoPropulsor.tensaoAlimentacaoNominalV !== undefined &&
      (!Number.isFinite(definicaoPropulsor.tensaoAlimentacaoNominalV) || definicaoPropulsor.tensaoAlimentacaoNominalV <= 0)) {
      throw new Error('Tensão nominal de alimentação do propulsor inválida.');
    }
    if (definicaoPropulsor.potenciaEletricaMaximaW !== undefined &&
      (!Number.isFinite(definicaoPropulsor.potenciaEletricaMaximaW) || definicaoPropulsor.potenciaEletricaMaximaW < 0)) {
      throw new Error('Potência elétrica máxima do propulsor inválida.');
    }
  }
  public get empuxoAtualN(): number { return this.empuxoAtualCalculadoN; }
  public get vazaoAtualKgS(): number { return this.vazaoAtualCalculadaKgS; }
  public get throttleAtual(): number { return this.throttle; }
  /** Potência térmica total na condição nominal, usada também pela apresentação. */
  public get potenciaTermicaMaximaW(): number { return this.definicaoPropulsor.potenciaTermicaMaximaW ?? 0; }
  /** Tensão nominal que uma futura fonte elétrica deverá fornecer ao propulsor. */
  public get tensaoAlimentacaoNominalV(): number {
    return this.definicaoPropulsor.tensaoAlimentacaoNominalV ?? TENSAO_ALIMENTACAO_PADRAO_PROPULSOR_V;
  }
  public get potenciaEletricaMaximaW(): number { return this.definicaoPropulsor.potenciaEletricaMaximaW ?? 1_000; }
  public get fonteEletricaEstaConectada(): boolean {
    return this.conexao?.podeConduzir === true && this.conexao.tensaoNominalV === this.tensaoAlimentacaoNominalV;
  }
  /** Calor só existe quando a cadeia operacional produziu empuxo neste passo. */
  public get potenciaTermicaAtualW(): number {
    const fracaoDeEmpuxo = Math.max(0, Math.min(1, this.empuxoAtualCalculadoN / this.definicaoPropulsor.empuxoMaximoN));
    return this.potenciaTermicaMaximaW * fracaoDeEmpuxo;
  }
  /** Parcela que aquece a carcaça; o restante segue no jato de exaustão. */
  public get potenciaTermicaNaCarcacaW(): number { return this.potenciaTermicaAtualW * 0.15; }
  public get potenciaTermicaNoJatoW(): number { return this.potenciaTermicaAtualW * 0.7; }
  /** Eficiência restante por integridade; dano reduz empuxo sem reduzir vazão. */
  public get eficienciaPorIntegridade(): number { return this.integridadeEstrutural; }
  public get estaEstruturalmenteInoperante(): boolean { return this.integridadeEstrutural === 0; }
  public get bloqueios(): readonly string[] { return this.sistemas.motivosDeBloqueio(); }
  public get estaIgnitado(): boolean { return this.ignicaoConfirmada; }
  public get mangueiraEstaRompida(): boolean { return this.mangueiraRompida; }
  public get caboEletricoEstaRompido(): boolean { return this.conexao?.estaRompida ?? false; }
  public get conexaoEletrica(): ConexaoEletrica | undefined { return this.conexao; }
  public get tanqueConectado(): TanquePropelente | undefined { return this.tanque; }
  public get bateriaConectada(): Bateria | undefined { return this.bateria; }
  public get diagnosticoOperacional(): readonly string[] {
    const motivos = [...this.sistemas.motivosDeBloqueio()];
    if (!this.tanque) motivos.push('tanque não conectado');
    else if (this.tanque.massaPropelenteKg === 0) motivos.push('sem propelente');
    if (this.mangueiraRompida) motivos.push('mangueira rompida');
    if (this.cadeiaBipropelente?.linhaCombustivel.estaDesconectada) motivos.push('linha de combustível desconectada');
    if (this.cadeiaBipropelente?.linhaOxidante.estaDesconectada) motivos.push('linha de oxidante desconectada');
    if (!this.bateria) motivos.push('bateria não conectada');
    else if (this.bateria.estaDescarregada) motivos.push('bateria descarregada');
    else if (this.bateria.tensaoNominalV !== this.tensaoAlimentacaoNominalV) motivos.push('tensão da bateria incompatível');
    if (this.caboEletricoEstaRompido) motivos.push('cabo elétrico rompido');
    if (this.conexao?.estaDesconectada) motivos.push('cabo elétrico desconectado');
    if (this.conexao?.correnteLimitada) motivos.push('alimentação elétrica limitada');
    if (this.throttle === 0) motivos.push('throttle em zero');
    if (!this.ignicaoConfirmada) motivos.push('ignição não realizada');
    if (this.ultimaNegacaoDeComando) motivos.push(this.ultimaNegacaoDeComando);
    return motivos;
  }
  /** Consulta encapsulada; não expõe a instância mutável do sistema interno. */
  public obterEstadoDoSistema(id: IdSistemaPropulsor): EstadoOperacional {
    return this.obterSistema(id).estado;
  }
  public sistemaEstaOperacional(id: IdSistemaPropulsor): boolean {
    return this.obterSistema(id).operacional;
  }
  public conectarTanque(tanque: TanquePropelente, comprimentoMaxMangueiraM = 10): void {
    if (tanque.tipoPropelente !== this.definicaoPropulsor.propelenteCompativel) throw new Error('Propelente incompatível.');
    if (!Number.isFinite(comprimentoMaxMangueiraM) || comprimentoMaxMangueiraM <= 0) throw new Error('Comprimento de mangueira inválido.');
    this.tanque = tanque;
    this.comprimentoMaxMangueiraM = comprimentoMaxMangueiraM;
    this.mangueiraRompida = false;
  }
  public conectarBateria(bateria: Bateria, comprimentoMaxCaboEletricoM = 10): void {
    if (!Number.isFinite(comprimentoMaxCaboEletricoM) || comprimentoMaxCaboEletricoM <= 0) throw new Error('Comprimento de cabo elétrico inválido.');
    if (bateria.tensaoNominalV !== this.tensaoAlimentacaoNominalV) throw new Error('Tensão da bateria incompatível.');
    this.instalarConexaoEletrica(new ConexaoEletrica({ id: `cabo-${this.id}`, fonte: bateria, destino: this,
      comprimentoMaximoM: comprimentoMaxCaboEletricoM, correnteMaximaA: this.potenciaEletricaMaximaW / bateria.tensaoNominalV }));
  }
  public instalarConexaoEletrica(conexao: ConexaoEletrica): void {
    if (conexao.destino !== this || conexao.tensaoNominalV !== this.tensaoAlimentacaoNominalV) throw new Error('Conexão elétrica incompatível com o propulsor.');
    this.conexao?.abrirInterruptor();
    this.conexao = conexao;
    this.definirEstadoDoSistema('elétrico', EstadoOperacional.Desligado);
  }
  /** Instala a cadeia que passa por linhas, bombas, câmara e bocal. */
  public configurarCadeiaBipropelente(cadeia: CadeiaBipropelenteDoPropulsor): void {
    this.cadeiaBipropelente = cadeia;
    this.aplicarThrottleNasValvulas();
  }
  /** Corta a ignição e o empuxo quando uma linha física é desacoplada. */
  public interromperPorAlimentacaoDePropelenteIndisponivel(): void {
    this.empuxoAtualCalculadoN = 0;
    this.vazaoAtualCalculadaKgS = 0;
    this.definirEstadoDoSistema('combustível', EstadoOperacional.Desligado);
    this.ultimaNegacaoDeComando = 'alimentação de propelente indisponível';
  }
  public definirThrottle(throttle: number): void {
    if (!Number.isFinite(throttle) || throttle < 0 || throttle > 1) throw new Error('Throttle deve estar entre 0 e 1.');
    this.throttle = throttle;
    this.aplicarThrottleNasValvulas();
  }
  /**
   * Liga um subsistema somente após o estágio anterior. A coordenação de missão
   * pode chamar esta API em sequência; a bancada a expõe para manutenção.
   */
  public ligarSistema(id: IdSistemaPropulsor): boolean {
    if (this.estaEstruturalmenteInoperante) {
      this.ultimaNegacaoDeComando = `não é possível ligar ${id}: propulsor estruturalmente inoperante`;
      return false;
    }
    const sistema = this.obterSistema(id);
    if (sistema.operacional) return true;
    if (id === 'elétrico' && !this.fonteEletricaEstaConectada) {
      this.ultimaNegacaoDeComando = 'não é possível ligar elétrico: alimentação elétrica indisponível';
      return false;
    }
    if (id === 'combustível' && (this.mangueiraRompida || !this.cadeiaBipropelenteEstaDisponivel())) {
      this.ultimaNegacaoDeComando = this.mangueiraRompida
        ? 'não é possível ligar combustível: mangueira rompida'
        : 'não é possível ligar combustível: alimentação de propelente indisponível';
      return false;
    }
    const dependencia = this.dependenciaDePartida(id);
    if (dependencia && !this.obterSistema(dependencia).operacional) {
      this.ultimaNegacaoDeComando = `não é possível ligar ${id}: ${dependencia} não está operacional`;
      return false;
    }
    if (id === 'elétrico' && !this.conexao?.fecharInterruptor()) return false;
    sistema.definirEstado(EstadoOperacional.Operacional);
    this.ultimaNegacaoDeComando = undefined;
    return true;
  }
  /** Comando operacional de parada solicitado por um controlador ou operador. */
  public desligarSistema(id: IdSistemaPropulsor): void {
    this.definirEstadoDoSistema(id, EstadoOperacional.Desligado);
  }
  /** Uma parada, falha ou degradação cancela a ignição vigente. */
  public definirEstadoDoSistema(id: IdSistemaPropulsor, estado: EstadoOperacional): void {
    if (id === 'elétrico' && estado === EstadoOperacional.Operacional && !this.fonteEletricaEstaConectada) {
      this.obterSistema(id).definirEstado(EstadoOperacional.Desligado);
      this.desligarDependentesDe(id);
      this.ignicaoConfirmada = false;
      this.ultimaNegacaoDeComando = 'alimentação elétrica indisponível';
      return;
    }
    if (id === 'elétrico') {
      if (estado === EstadoOperacional.Operacional) this.conexao?.fecharInterruptor();
      else this.conexao?.abrirInterruptor();
    }
    this.obterSistema(id).definirEstado(estado);
    if (estado !== EstadoOperacional.Operacional) {
      this.desligarDependentesDe(id);
      this.ignicaoConfirmada = false;
    }
  }
  /** Confirma uma nova ignição depois que todos os permissivos estão válidos. */
  public solicitarIgnicao(): boolean {
    if (this.estaEstruturalmenteInoperante) {
      this.ultimaNegacaoDeComando = 'ignição bloqueada: propulsor estruturalmente inoperante';
      return false;
    }
    if (!this.sistemas.operacaoAutorizada() || this.conexao?.estaEnergizada !== true) {
      this.ultimaNegacaoDeComando = 'ignição bloqueada: sistemas obrigatórios indisponíveis';
      return false;
    }
    if (!this.tanque || this.tanque.massaPropelenteKg === 0 || this.mangueiraRompida || !this.cadeiaBipropelenteEstaDisponivel()) {
      this.ultimaNegacaoDeComando = 'ignição bloqueada: alimentação de propelente indisponível';
      return false;
    }
    this.ignicaoConfirmada = true;
    this.ultimaNegacaoDeComando = undefined;
    return true;
  }
  public override prepararPassoOperacional(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo operacional inválido.');
    this.conexao?.prepararPasso(dtS);
    if (!this.fonteEletricaEstaConectada || this.conexao?.estaIndisponivel) this.definirEstadoDoSistema('elétrico', EstadoOperacional.Desligado);
    this.empuxoAtualCalculadoN = 0;
    this.vazaoAtualCalculadaKgS = 0;
    if (this.estaEstruturalmenteInoperante) {
      this.definirEstadoDoSistema('controle', EstadoOperacional.Falha);
      this.ultimaNegacaoDeComando = 'propulsor estruturalmente inoperante';
      return;
    }
    // Uma falha observada pelo core invalida a ignição e derruba os estágios
    // posteriores, inclusive quando a falha vier de uma integração externa.
    this.propagarIndisponibilidades();
    if (!this.sistemas.operacaoAutorizada()) this.ignicaoConfirmada = false;
    if (!this.ignicaoConfirmada || !this.tanque || this.throttle === 0) return;
    if (this.mangueiraRompida || this.distanciaAoTanqueM() > this.comprimentoMaxMangueiraM) {
      this.mangueiraRompida = true;
      // A alimentação física foi perdida: combustível deixa de estar
      // operacional e a cadeia dependente é interrompida imediatamente.
      this.definirEstadoDoSistema('combustível', EstadoOperacional.Desligado);
      return;
    }
    const bateria = this.bateria;
    if (!bateria || !this.conexao || this.conexao.estaIndisponivel) {
      this.definirEstadoDoSistema('elétrico', EstadoOperacional.Desligado);
      return;
    }
    if (this.cadeiaBipropelente) {
      this.prepararCadeiaBipropelente(dtS, this.conexao);
      return;
    }
    const energiaNecessariaJ = this.throttle * this.potenciaEletricaMaximaW * dtS;
    const energiaFornecidaJ = this.conexao.fornecerEnergia(energiaNecessariaJ);
    const disponibilidadeEletrica = energiaNecessariaJ === 0 ? 1 : energiaFornecidaJ / energiaNecessariaJ;
    const massaNecessariaKg = this.throttle * this.definicaoPropulsor.vazaoMaximaKgS * dtS * disponibilidadeEletrica;
    const massaFornecidaKg = this.tanque.fornecerPropelente(massaNecessariaKg);
    const disponibilidadeDePropelente = massaNecessariaKg === 0 ? 0 : massaFornecidaKg / massaNecessariaKg;
    this.empuxoAtualCalculadoN = this.definicaoPropulsor.empuxoMaximoN * this.throttle * disponibilidadeDePropelente * disponibilidadeEletrica * this.eficienciaPorIntegridade;
    this.vazaoAtualCalculadaKgS = massaFornecidaKg / dtS;
    if (bateria.estaDescarregada) this.definirEstadoDoSistema('elétrico', EstadoOperacional.Desligado);
  }
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    if (this.empuxoAtualCalculadoN === 0) return [];
    const angulo = this.getEstadoFisico().orientacaoRad.z;
    return [{ forcaN: new Vetor3(Math.cos(angulo) * this.empuxoAtualCalculadoN, Math.sin(angulo) * this.empuxoAtualCalculadoN, 0) }];
  }
  public override obterPotenciaTermicaGeradaW(): number { return this.potenciaTermicaNaCarcacaW; }
  public override obterJatoTermico(): JatoTermico | undefined {
    if (this.potenciaTermicaNoJatoW === 0) return undefined;
    const angulo = this.getEstadoFisico().orientacaoRad.z;
    return { potenciaW: this.potenciaTermicaNoJatoW, alcanceM: 12, aberturaRad: Math.PI / 8, direcaoM: new Vetor3(-Math.cos(angulo), -Math.sin(angulo), 0) };
  }

  private distanciaAoTanqueM(): number {
    if (!this.tanque) return Number.POSITIVE_INFINITY;
    return this.getEstadoFisico().posicaoM.subtrair(this.tanque.getEstadoFisico().posicaoM).magnitude;
  }
  private prepararCadeiaBipropelente(dtS: number, conexao: ConexaoEletrica): void {
    const cadeia = this.cadeiaBipropelente;
    if (!cadeia) return;
    const posicaoM = this.getEstadoFisico().posicaoM;
    cadeia.linhaCombustivel.verificarIntegridade(posicaoM);
    cadeia.linhaOxidante.verificarIntegridade(posicaoM);
    if (!this.cadeiaBipropelenteEstaDisponivel()) {
      this.interromperPorAlimentacaoDePropelenteIndisponivel();
      return;
    }
    const massaCombustivelNominalKg = this.definicaoPropulsor.vazaoMaximaKgS * dtS;
    const massaOxidanteNominalKg = massaCombustivelNominalKg * cadeia.camara.razaoMisturaOxidanteCombustivel;
    const massaCombustivelKg = cadeia.bombaCombustivel.bombear(cadeia.linhaCombustivel, conexao, massaCombustivelNominalKg, dtS, posicaoM);
    const massaOxidanteKg = cadeia.bombaOxidante.bombear(cadeia.linhaOxidante, conexao, massaOxidanteNominalKg, dtS, posicaoM);
    const resultado = cadeia.camara.reagir(massaCombustivelKg, massaOxidanteKg, this.integridadeEstrutural);
    const massaReagidaNominalKg = massaCombustivelNominalKg + massaOxidanteNominalKg;
    const fracaoDeVazao = massaReagidaNominalKg === 0 ? 0 : resultado.massaReagidaKg / massaReagidaNominalKg;
    this.empuxoAtualCalculadoN = cadeia.bocal.calcularEmpuxo(resultado, this.integridadeEstrutural, fracaoDeVazao);
    this.vazaoAtualCalculadaKgS = resultado.massaReagidaKg / dtS;
    if (cadeia.linhaCombustivel.estaIndisponivel || cadeia.linhaOxidante.estaIndisponivel ) this.interromperPorAlimentacaoDePropelenteIndisponivel();
    if (conexao.fonte.estaDescarregada) this.definirEstadoDoSistema('elétrico', EstadoOperacional.Desligado);
  }
  private cadeiaBipropelenteEstaDisponivel(): boolean {
    return !this.cadeiaBipropelente || (!this.cadeiaBipropelente.linhaCombustivel.estaIndisponivel && !this.cadeiaBipropelente.linhaOxidante.estaIndisponivel);
  }
  private aplicarThrottleNasValvulas(): void {
    if (!this.cadeiaBipropelente) return;
    this.cadeiaBipropelente.linhaCombustivel.definirAberturaDaValvula(this.throttle);
    this.cadeiaBipropelente.linhaOxidante.definirAberturaDaValvula(this.throttle);
  }
  private obterSistema(id: IdSistemaPropulsor): SistemaOperacional {
    return {
      'elétrico': this.sistemaEletrico,
      'hidráulico': this.sistemaHidraulico,
      'combustível': this.sistemaCombustivel,
      controle: this.sistemaControle,
    }[id];
  }
  private dependenciaDePartida(id: IdSistemaPropulsor): IdSistemaPropulsor | undefined {
    return ({
      'elétrico': undefined,
      'hidráulico': 'elétrico',
      'combustível': 'hidráulico',
      controle: 'combustível',
    } satisfies Record<IdSistemaPropulsor, IdSistemaPropulsor | undefined>)[id];
  }
  private desligarDependentesDe(id: IdSistemaPropulsor): void {
    const sequencia: readonly IdSistemaPropulsor[] = ['elétrico', 'hidráulico', 'combustível', 'controle'];
    const indice = sequencia.indexOf(id);
    for (const dependente of sequencia.slice(indice + 1)) {
      this.obterSistema(dependente).definirEstado(EstadoOperacional.Desligado);
    }
  }
  private propagarIndisponibilidades(): void {
    const sequencia: readonly IdSistemaPropulsor[] = ['hidráulico', 'combustível', 'controle'];
    for (const id of sequencia) {
      const dependencia = this.dependenciaDePartida(id);
      if (dependencia && !this.obterSistema(dependencia).operacional) {
        this.obterSistema(id).definirEstado(EstadoOperacional.Desligado);
      }
    }
  }
}
