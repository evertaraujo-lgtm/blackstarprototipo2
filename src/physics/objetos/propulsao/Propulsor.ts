import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada, type JatoTermico } from '../base/Objeto';
import { EstadoOperacional, GerenciadorDeSistemas, SistemaOperacional } from '../../SistemaOperacional';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { ConexaoEletrica } from '../../conexoes/ConexaoEletrica';
import { Bateria } from '../fontes-de-energia/Bateria';
import { Vetor3 } from '../../Vetor3';
import { LinhaDePropelente } from './alimentacao/LinhaDePropelente';
import { BombaPropelente } from './alimentacao/BombaPropelente';
import { CamaraCombustao } from './combustao/CamaraCombustao';
import { Bocal, GRAVIDADE_PADRAO_MPS2 } from './combustao/Bocal';

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
  /** Efeito térmico simplificado em throttle máximo, em W; não é potência química total. */
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
  /** Consulta fonte somente se a ligação instalada utiliza uma Bateria, caso contrário undefined. @contract f-20905674966ffa86 @reviewed M12-DOC: implementação lida. */
  private get bateria(): Bateria | undefined { return this.conexao?.fonte instanceof Bateria ? this.conexao.fonte : undefined; }
  private cadeiaBipropelente?: CadeiaBipropelenteDoPropulsor;
  private comprimentoMaxMangueiraM = 0;
  private mangueiraRompida = false;
  private empuxoAtualCalculadoN = 0;
  private vazaoAtualCalculadaKgS = 0;
  private vazaoReagidaCalculadaKgS = 0;
  private ignicaoConfirmada = false;
  private ultimaNegacaoDeComando?: string;
  private readonly sistemaEletrico = new SistemaOperacional('elétrico', EstadoOperacional.Desligado);
  private readonly sistemaHidraulico = new SistemaOperacional('hidráulico', EstadoOperacional.Desligado);
  private readonly sistemaCombustivel = new SistemaOperacional('combustível', EstadoOperacional.Desligado);
  private readonly sistemaControle = new SistemaOperacional('controle', EstadoOperacional.Desligado);
  private readonly sistemas = new GerenciadorDeSistemas([this.sistemaEletrico, this.sistemaHidraulico, this.sistemaCombustivel, this.sistemaControle]);
  /** Cria corpo propulsor e sistemas inicialmente desligados; valida empuxo N/vazão kg/s positivos, substância e parâmetros elétricos declarados. Não confirma ignição. @contract f-477362456c895763 @reviewed M12-DOC: implementação lida. */
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
  /** Consulta empuxo nominal configurado em N. @contract f-7bbaa8feb52e5de1 @reviewed M12-DOC: implementação lida. */
  public get empuxoMaximoN(): number { return this.definicaoPropulsor.empuxoMaximoN; }
  /** Empuxo médio do último intervalo integrado, inclusive um pulso parcial.
   * @contract f-9fdb46e359c0fa82
   */
  public get empuxoAtualN(): number { return this.empuxoAtualCalculadoN; }
  /** Massa total retirada dos tanques por segundo no último intervalo.
   * @contract f-7f7fbe1648a893de
   */
  public get vazaoAtualKgS(): number { return this.vazaoAtualCalculadaKgS; }
  /** Parcela reagida; a vazão total inclui todo o material retirado dos tanques.
   * @contract f-71b7a7d746d0bf24
   */
  public get vazaoReagidaKgS(): number { return this.vazaoReagidaCalculadaKgS; }
  /** Consulta Isp nominal do bocal químico em s, ou undefined no modelo paramétrico. @contract f-9990a6943d926e2a @reviewed M12-DOC: implementação lida. */
  public get impulsoEspecificoNominalS(): number | undefined { return this.cadeiaBipropelente?.bocal.impulsoEspecificoNominalS; }
  /** Calcula F/(vazão_total·g₀) em s quando há vazão; usa gravidade padrão de Isp, não gravidade central local. @contract f-4049845a54445cbb @reviewed M12-DOC: implementação lida. */
  public get impulsoEspecificoEfetivoS(): number | undefined {
    return this.vazaoAtualKgS > 0 ? this.empuxoAtualN / (this.vazaoAtualKgS * GRAVIDADE_PADRAO_MPS2) : undefined;
  }
  /** Consulta comando normalizado [0,1], distinto do empuxo realmente entregue. @contract f-8fc9159f99e77a24 @reviewed M12-DOC: implementação lida. */
  public get throttleAtual(): number { return this.throttle; }
  /** Efeito térmico nominal usado pelo core e pela apresentação, sem balanço químico total.
   * @contract f-b7eaa4d38155ad2b
   */
  public get potenciaTermicaMaximaW(): number { return this.definicaoPropulsor.potenciaTermicaMaximaW ?? 0; }
  /** Tensão nominal que uma futura fonte elétrica deverá fornecer ao propulsor.
   * @contract f-3a3e91d771def691
   */
  public get tensaoAlimentacaoNominalV(): number {
    return this.definicaoPropulsor.tensaoAlimentacaoNominalV ?? TENSAO_ALIMENTACAO_PADRAO_PROPULSOR_V;
  }
  /** Consulta demanda nominal elétrica em W, com referência histórica de 1000 W quando ausente. @contract f-cc115465b01c0fab @reviewed M12-DOC: implementação lida. */
  public get potenciaEletricaMaximaW(): number { return this.definicaoPropulsor.potenciaEletricaMaximaW ?? 1_000; }
  /** Exige ligação que pode conduzir e tensão nominal compatível; interruptor fechado é condição adicional da operação. @contract f-fbd5fe4dd57978c0 @reviewed M12-DOC: implementação lida. */
  public get fonteEletricaEstaConectada(): boolean {
    return this.conexao?.podeConduzir === true && this.conexao.tensaoNominalV === this.tensaoAlimentacaoNominalV;
  }
  /** Calor só existe quando a cadeia operacional produziu empuxo neste passo.
   * @contract f-9d437b2491bb86f4
   */
  public get potenciaTermicaAtualW(): number {
    const fracaoDeEmpuxo = Math.max(0, Math.min(1, this.empuxoAtualCalculadoN / this.definicaoPropulsor.empuxoMaximoN));
    return this.potenciaTermicaMaximaW * fracaoDeEmpuxo;
  }
  /** Parcelas simplificadas do efeito térmico: 15% carcaça, 70% jato; 15% não distribuídos.
   * @contract f-4bcb43c7abe4a398
   */
  public get potenciaTermicaNaCarcacaW(): number { return this.potenciaTermicaAtualW * 0.15; }
  /** Devolve `this.potenciaTermicaAtualW * 0.7`. Efeitos indiretos seguem as dependências chamadas. @contract f-6be9fb9296a277ac */
  public get potenciaTermicaNoJatoW(): number { return this.potenciaTermicaAtualW * 0.7; }
  /** Eficiência restante por integridade; dano reduz empuxo sem reduzir vazão.
   * @contract f-b91e74b0be2f91bb
   */
  public get eficienciaPorIntegridade(): number { return this.integridadeEstrutural; }
  /** Verifica integridade estrutural exatamente zero, que bloqueia partida. @contract f-3d5628cb71678818 @reviewed M12-DOC: implementação lida. */
  public get estaEstruturalmenteInoperante(): boolean { return this.integridadeEstrutural === 0; }
  /** Consulta IDs de sistemas internos não operacionais; não inclui todos os diagnósticos físicos detalhados. @contract f-0a3acb0573b6b05b @reviewed M12-DOC: implementação lida. */
  public get bloqueios(): readonly string[] { return this.sistemas.motivosDeBloqueio(); }
  /** Consulta confirmação explícita de ignição vigente. @contract f-a56160de4323bb1d @reviewed M12-DOC: implementação lida. */
  public get estaIgnitado(): boolean { return this.ignicaoConfirmada; }
  /** Consulta ruptura do adaptador histórico de mangueira. @contract f-fe8957a67dd35ef3 @reviewed M12-DOC: implementação lida. */
  public get mangueiraEstaRompida(): boolean { return this.mangueiraRompida; }
  /** Consulta ruptura na conexão elétrica real, ou false sem conexão. @contract f-57e11c5722b7ef05 @reviewed M12-DOC: implementação lida. */
  public get caboEletricoEstaRompido(): boolean { return this.conexao?.estaRompida ?? false; }
  /** Disponibiliza a conexão de domínio instalada, sem cópia concorrente de estado elétrico. @contract f-40a732df83e26e13 @reviewed M12-DOC: implementação lida. */
  public get conexaoEletrica(): ConexaoEletrica | undefined { return this.conexao; }
  /** Consulta tanque primário conectado ou undefined. @contract f-6c24f2a0e5cb8ae7 @reviewed M12-DOC: implementação lida. */
  public get tanqueConectado(): TanquePropelente | undefined { return this.tanque; }
  /** Consulta fonte Bateria da conexão instalada ou undefined. @contract f-bacb76578abbf3a0 @reviewed M12-DOC: implementação lida. */
  public get bateriaConectada(): Bateria | undefined { return this.bateria; }
  /** Consolida sistemas, reservas, conexões, limitações elétricas, throttle, ignição e última negação em mensagens novas; não altera permissivos. @contract f-2aed5cf4f32ab6fb @reviewed M12-DOC: implementação lida. */
  public get diagnosticoOperacional(): readonly string[] {
    const motivos = [...this.sistemas.motivosDeBloqueio()];
    if (!this.tanque) motivos.push('tanque não conectado');
    else if (this.tanque.massaPropelenteKg === 0) motivos.push('sem propelente');
    if (this.mangueiraRompida) motivos.push('mangueira rompida');
    if (this.cadeiaBipropelente?.linhaCombustivel.estaDesconectada) motivos.push('linha de combustível desconectada');
    if (this.cadeiaBipropelente?.linhaOxidante.estaDesconectada) motivos.push('linha de oxidante desconectada');
    if (this.cadeiaBipropelente?.linhaOxidante.massaDisponivelKg === 0) motivos.push('sem oxidante');
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
  /** Consulta encapsulada; não expõe a instância mutável do sistema interno.
   * @contract f-c5feab7ecffcf8a6
   */
  public obterEstadoDoSistema(id: IdSistemaPropulsor): EstadoOperacional {
    return this.obterSistema(id).estado;
  }
  /** Consulta estado operacional encapsulado do sistema identificado. @contract f-8cf8c37bc851dea2 @reviewed M12-DOC: implementação lida. */
  public sistemaEstaOperacional(id: IdSistemaPropulsor): boolean {
    return this.obterSistema(id).operacional;
  }
  /** Valida substância compatível e alcance m positivo/finito; substitui tanque e referência de mangueira, limpando ruptura desse adaptador histórico. @contract f-e489fdeda5ab85fc @reviewed M12-DOC: implementação lida. */
  public conectarTanque(tanque: TanquePropelente, comprimentoMaxMangueiraM = 10): void {
    if (tanque.tipoPropelente !== this.definicaoPropulsor.propelenteCompativel) throw new Error('Propelente incompatível.');
    if (!Number.isFinite(comprimentoMaxMangueiraM) || comprimentoMaxMangueiraM <= 0) throw new Error('Comprimento de mangueira inválido.');
    this.tanque = tanque;
    this.comprimentoMaxMangueiraM = comprimentoMaxMangueiraM;
    this.mangueiraRompida = false;
  }
  /** Valida alcance m e tensão V compatíveis e cria conexão elétrica real com limite P/V; a instalação deixa o sistema elétrico desligado. @contract f-dde3b226c5c49e29 @reviewed M12-DOC: implementação lida. */
  public conectarBateria(bateria: Bateria, comprimentoMaxCaboEletricoM = 10): void {
    if (!Number.isFinite(comprimentoMaxCaboEletricoM) || comprimentoMaxCaboEletricoM <= 0) throw new Error('Comprimento de cabo elétrico inválido.');
    if (bateria.tensaoNominalV !== this.tensaoAlimentacaoNominalV) throw new Error('Tensão da bateria incompatível.');
    this.instalarConexaoEletrica(new ConexaoEletrica({ id: `cabo-${this.id}`, fonte: bateria, destino: this,
      comprimentoMaximoM: comprimentoMaxCaboEletricoM, correnteMaximaA: this.potenciaEletricaMaximaW / bateria.tensaoNominalV }));
  }
  /** Exige fonte Bateria, destino igual ao motor e tensão compatível; abre conexão anterior, instala nova e desliga sistema elétrico. @contract f-e12a34269f3403c9 @reviewed M12-DOC: implementação lida. */
  public instalarConexaoEletrica(conexao: ConexaoEletrica): void {
    if (!(conexao.fonte instanceof Bateria) || conexao.destino !== this || conexao.tensaoNominalV !== this.tensaoAlimentacaoNominalV) throw new Error('Conexão elétrica incompatível com o propulsor.');
    this.conexao?.abrirInterruptor();
    this.conexao = conexao;
    this.definirEstadoDoSistema('elétrico', EstadoOperacional.Desligado);
  }
  /** Instala a cadeia que passa por linhas, bombas, câmara e bocal.
   * @contract f-41af430d642d49cc
   */
  public configurarCadeiaBipropelente(cadeia: CadeiaBipropelenteDoPropulsor): void {
    const ispS = cadeia.bocal.impulsoEspecificoNominalS;
    if (ispS !== undefined) {
      const empuxoPorVazaoN = this.definicaoPropulsor.vazaoMaximaKgS
        * (1 + cadeia.camara.razaoMisturaOxidanteCombustivel) * ispS * GRAVIDADE_PADRAO_MPS2;
      const toleranciaN = Math.max(1e-6, this.empuxoMaximoN * 1e-9);
      if (Math.abs(empuxoPorVazaoN - this.empuxoMaximoN) > toleranciaN
        || Math.abs(cadeia.bocal.empuxoMaximoN - this.empuxoMaximoN) > toleranciaN) {
        throw new Error('Empuxo nominal químico incompatível com vazão total, Isp ou bocal.');
      }
    }
    this.cadeiaBipropelente = cadeia;
    this.aplicarThrottleNasValvulas();
  }
  /** Corta a ignição e o empuxo quando uma linha física é desacoplada.
   * @contract f-fcc87169aa42cf99
   */
  public interromperPorAlimentacaoDePropelenteIndisponivel(): void {
    this.empuxoAtualCalculadoN = 0;
    this.vazaoAtualCalculadaKgS = 0;
    this.vazaoReagidaCalculadaKgS = 0;
    this.definirEstadoDoSistema('combustível', EstadoOperacional.Desligado);
    this.ultimaNegacaoDeComando = 'alimentação de propelente indisponível';
  }
  /** Valida comando [0,1] finito e propaga abertura às válvulas da cadeia; não confirma ignição nem altera cinemática. @contract f-c4ffe0aa2150ef1b @reviewed M12-DOC: implementação lida. */
  public definirThrottle(throttle: number): void {
    if (!Number.isFinite(throttle) || throttle < 0 || throttle > 1) throw new Error('Throttle deve estar entre 0 e 1.');
    this.throttle = throttle;
    this.aplicarThrottleNasValvulas();
  }
  /**
   * Liga um subsistema somente após o estágio anterior. A coordenação de missão
   * pode chamar esta API em sequência; a bancada a expõe para manutenção.
   * @contract f-4f7554eb65b4b673
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
  /** Comando operacional de parada solicitado por um controlador ou operador.
   * @contract f-cdf5acdeb2093113
   */
  public desligarSistema(id: IdSistemaPropulsor): void {
    this.definirEstadoDoSistema(id, EstadoOperacional.Desligado);
  }
  /** Uma parada, falha ou degradação cancela a ignição vigente.
   * @contract f-9ca0c122970e611f
   */
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
  /** Confirma uma nova ignição depois que todos os permissivos estão válidos.
   * @contract f-36ffbe5208d4babf
   */
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
  /** Executa subpasso em s positivo/finito: prepara orçamento elétrico/linhas, propaga falhas e exige ignição/permissivos/throttle; consome energia e massa reais, calcula empuxo médio degradado por integridade e corta dependentes ao perder recursos. @contract f-fcbd66d5834c05a1 @reviewed M12-DOC: implementação lida. */
  public override prepararPassoOperacional(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo operacional inválido.');
    this.conexao?.prepararPasso(dtS);
    if (!this.fonteEletricaEstaConectada || this.conexao?.estaIndisponivel) this.definirEstadoDoSistema('elétrico', EstadoOperacional.Desligado);
    this.empuxoAtualCalculadoN = 0;
    this.vazaoAtualCalculadaKgS = 0;
    this.vazaoReagidaCalculadaKgS = 0;
    this.cadeiaBipropelente?.linhaCombustivel.prepararPasso();
    this.cadeiaBipropelente?.linhaOxidante.prepararPasso();
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
  /** Devolve solicitação de empuxo N no eixo X local transformado pela atitude Z atual; empuxo nulo gera lista vazia. Ponto omitido é resolvido pelo mundo no centro atual. @contract f-9375a426ced24382 @reviewed M12-DOC: implementação lida. */
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    if (this.empuxoAtualCalculadoN === 0) return [];
    const angulo = this.getEstadoFisico().orientacaoRad.z;
    return [{ forcaN: new Vetor3(Math.cos(angulo) * this.empuxoAtualCalculadoN, Math.sin(angulo) * this.empuxoAtualCalculadoN, 0) }];
  }
  /** Disponibiliza parcela térmica da carcaça em W para o core térmico. @contract f-a72e0d365ee9bdd8 @reviewed M12-DOC: implementação lida. */
  public override obterPotenciaTermicaGeradaW(): number { return this.potenciaTermicaNaCarcacaW; }
  /** Quando há potência de jato, declara cone de alcance 12 m e abertura π/8 rad no sentido oposto ao empuxo; apenas fornece dados ao core térmico. @contract f-88eb456736ee1367 @reviewed M12-DOC: implementação lida. */
  public override obterJatoTermico(): JatoTermico | undefined {
    if (this.potenciaTermicaNoJatoW === 0) return undefined;
    const angulo = this.getEstadoFisico().orientacaoRad.z;
    return { potenciaW: this.potenciaTermicaNoJatoW, alcanceM: 12, aberturaRad: Math.PI / 8, direcaoM: new Vetor3(-Math.cos(angulo), -Math.sin(angulo), 0) };
  }

  /** Mede distância entre centros de motor/tanque em m; ausência de tanque retorna Infinity. @contract f-b2f3f1663596db48 @reviewed M12-DOC: implementação lida. */
  private distanciaAoTanqueM(): number {
    if (!this.tanque) return Number.POSITIVE_INFINITY;
    return this.getEstadoFisico().posicaoM.subtrair(this.tanque.getEstadoFisico().posicaoM).magnitude;
  }
  /** Verifica alcance das duas linhas, bombeia mistura pelo orçamento elétrico compartilhado, reage massas e calcula empuxo no bocal; integridade reduz empuxo uma vez, preservando vazão real. Atualiza vazões médias kg/s e corta alimentação indisponível. @contract f-2628629e9d3ba7f1 @reviewed M12-DOC: implementação lida. */
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
    const { massaCombustivelKg, massaOxidanteKg } = BombaPropelente.bombearMistura(
      { bomba: cadeia.bombaCombustivel, linha: cadeia.linhaCombustivel },
      { bomba: cadeia.bombaOxidante, linha: cadeia.linhaOxidante },
      conexao, massaCombustivelNominalKg, cadeia.camara.razaoMisturaOxidanteCombustivel, dtS, posicaoM,
    );
    // Câmara e bocal não têm integridade própria nesta composição. O dano do
    // motor é aplicado uma vez, no empuxo, preservando a vazão real consumida.
    const resultado = cadeia.camara.reagir(massaCombustivelKg, massaOxidanteKg, 1);
    const massaReagidaNominalKg = massaCombustivelNominalKg + massaOxidanteNominalKg;
    const fracaoDeVazao = Math.min(1, resultado.massaReagidaKg / massaReagidaNominalKg);
    this.empuxoAtualCalculadoN = cadeia.bocal.calcularEmpuxo(resultado, this.integridadeEstrutural, fracaoDeVazao, dtS);
    this.vazaoAtualCalculadaKgS = (massaCombustivelKg + massaOxidanteKg) / dtS;
    this.vazaoReagidaCalculadaKgS = resultado.massaReagidaKg / dtS;
    if (cadeia.linhaCombustivel.estaIndisponivel || cadeia.linhaOxidante.estaIndisponivel ) this.interromperPorAlimentacaoDePropelenteIndisponivel();
    // O último pulso químico pode usar somente parte da energia solicitada.
    // Seus valores são médias do intervalo já autorizado, como no esgotamento
    // de propelente. O próximo passo observa a fonte vazia e cancela a ignição.
    if (conexao.fonte.estaDescarregada && cadeia.bocal.impulsoEspecificoNominalS === undefined) {
      this.definirEstadoDoSistema('elétrico', EstadoOperacional.Desligado);
    }
  }
  /** Sem cadeia química mantém permissivo do adaptador; com cadeia exige ambas as linhas disponíveis e reservas positivas. @contract f-5fd833779167cdd9 @reviewed M12-DOC: implementação lida. */
  private cadeiaBipropelenteEstaDisponivel(): boolean {
    return !this.cadeiaBipropelente || (!this.cadeiaBipropelente.linhaCombustivel.estaIndisponivel
      && !this.cadeiaBipropelente.linhaOxidante.estaIndisponivel
      && this.cadeiaBipropelente.linhaCombustivel.massaDisponivelKg > 0
      && this.cadeiaBipropelente.linhaOxidante.massaDisponivelKg > 0);
  }
  /** Propaga throttle às duas válvulas quando há cadeia instalada; não bombeia nem consome por si. @contract f-3d8e5fdb7af1205c @reviewed M12-DOC: implementação lida. */
  private aplicarThrottleNasValvulas(): void {
    if (!this.cadeiaBipropelente) return;
    this.cadeiaBipropelente.linhaCombustivel.definirAberturaDaValvula(this.throttle);
    this.cadeiaBipropelente.linhaOxidante.definirAberturaDaValvula(this.throttle);
  }
  /** Seleciona instância interna pelo ID elétrico/hidráulico/combustível/controle; não expõe essa instância na API pública. @contract f-23c299f22b964033 @reviewed M12-DOC: implementação lida. */
  private obterSistema(id: IdSistemaPropulsor): SistemaOperacional {
    return {
      'elétrico': this.sistemaEletrico,
      'hidráulico': this.sistemaHidraulico,
      'combustível': this.sistemaCombustivel,
      controle: this.sistemaControle,
    }[id];
  }
  /** Consulta predecessor da cadeia elétrico→hidráulico→combustível→controle; elétrico não possui predecessor. @contract f-96a9e4ce92473f6c @reviewed M12-DOC: implementação lida. */
  private dependenciaDePartida(id: IdSistemaPropulsor): IdSistemaPropulsor | undefined {
    return ({
      'elétrico': undefined,
      'hidráulico': 'elétrico',
      'combustível': 'hidráulico',
      controle: 'combustível',
    } satisfies Record<IdSistemaPropulsor, IdSistemaPropulsor | undefined>)[id];
  }
  /** Desliga todos os estágios posteriores ao ID na cadeia declarada, preservando o estágio causador. @contract f-90418eb4d8c483b1 @reviewed M12-DOC: implementação lida. */
  private desligarDependentesDe(id: IdSistemaPropulsor): void {
    const sequencia: readonly IdSistemaPropulsor[] = ['elétrico', 'hidráulico', 'combustível', 'controle'];
    const indice = sequencia.indexOf(id);
    for (const dependente of sequencia.slice(indice + 1)) {
      this.obterSistema(dependente).definirEstado(EstadoOperacional.Desligado);
    }
  }
  /** Percorre estágios dependentes e desliga aqueles cujo predecessor não está operacional; não reignita ao restaurar recursos. @contract f-95962cd459578436 @reviewed M12-DOC: implementação lida. */
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
