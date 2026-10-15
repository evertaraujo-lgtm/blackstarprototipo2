import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { Vetor3 } from '../../Vetor3';
import { Objeto, type DefinicaoObjeto } from '../base/Objeto';
import { Propulsor } from '../propulsao/Propulsor';
import { ComputadorDeVoo, type ResultadoComandoPropulsor } from './ComputadorDeVoo';
import { SensoresVeiculoComposto, type FalhaSensorVeiculo } from '../../sensores/SensoresVeiculoComposto';
import type { ControladorDeVoo, SolicitacaoArbitrada } from '../../sistemas de controle/GerenciadorDeControladores';
import type { ComandoControlePouso, ConfiguracaoControlePouso } from '../../sistemas de controle/ControladorPouso';
import type { ConfiguracaoControleDesaceleracao } from '../../sistemas de controle/ControladorDesaceleracao';
import type {
  ComandoDescidaFuzzyPid,
  ConfiguracaoDescidaFuzzyPid,
} from '../../sistemas de controle/ControladorDescidaFuzzyPidDePropulsores';

/**
 * Definição do casco estrutural central. `VeiculoComposto` não é uma fachada
 * sem massa: sua massa base pertence a um corpo físico real no MundoFisico.
 */
export interface DefinicaoVeiculoComposto extends DefinicaoObjeto {
  readonly massaBaseKg: number;
}

/**
 * Raiz de composição de um veículo e seu casco físico central. Tanque,
 * propulsores e demais módulos continuam sendo Objetos independentes, ligados
 * exclusivamente por FixadoresEstruturais. Não deve ser usado como contêiner
 * abstrato ou sem massa.
 */
export class VeiculoComposto extends Objeto {
  private readonly modulos = new Map<string, Objeto>();
  private readonly fixadores = new Map<string, FixadorEstrutural>();
  private readonly sensores: SensoresVeiculoComposto;
  private readonly computadorDeVoo: ComputadorDeVoo;

  /** Cria casco físico com massa própria e compõe sensores/ComputadorDeVoo pelas portas públicas; sensor consulta massa do conjunto conectado, sem duplicar estados de módulos. @contract f-64296b093cc455c5 @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoVeiculoComposto) {
    super(definicao);
    this.sensores = new SensoresVeiculoComposto(this, 0, () => this.massaInstantaneaDoConjuntoKg);
    this.computadorDeVoo = new ComputadorDeVoo(this.sensores);
  }

  /** Declara pertencimento por ID único de corpo distinto do casco; não cria fixador nem registra automaticamente no mundo. @contract f-8dfcc32b0c316311 @reviewed M12-DOC: implementação lida. */
  public adicionarModulo(modulo: Objeto): void {
    if (modulo === this) throw new Error('O corpo central não pode ser adicionado como módulo.');
    if (this.modulos.has(modulo.id)) throw new Error(`Módulo já instalado: ${modulo.id}.`);
    this.modulos.set(modulo.id, modulo);
  }

  /** Exige motor previamente adicionado como módulo físico e instala sua porta no computador. @contract f-5afcf15184dbc037 @reviewed M12-DOC: implementação lida. */
  public instalarPropulsor(propulsor: Propulsor): void {
    if (!this.modulos.has(propulsor.id)) throw new Error('Propulsor precisa ser adicionado como módulo físico antes de ser instalado.');
    this.computadorDeVoo.instalarPropulsor(propulsor);
  }

  /** Exige ID único e os dois corpos pertencentes ao agregado; registra vínculo para posterior inserção no mundo. @contract f-510862c29bb06949 @reviewed M12-DOC: implementação lida. */
  public adicionarFixador(fixador: FixadorEstrutural): void {
    if (this.fixadores.has(fixador.id)) throw new Error(`Fixador já instalado: ${fixador.id}.`);
    if (!this.pertenceAoVeiculo(fixador.objetoA) || !this.pertenceAoVeiculo(fixador.objetoB)) {
      throw new Error('Fixador só pode ligar corpos físicos pertencentes ao mesmo veículo composto.');
    }
    this.fixadores.set(fixador.id, fixador);
  }

  /** Registra cada corpo e vínculo no mundo, sem criar estado físico duplicado.
   * @contract f-d526d7c643008969
   */
  public registrarNoMundo(mundo: MundoFisico): void {
    mundo.registrarObjeto(this);
    mundo.registrarSensoresVeiculo(this.sensores);
    for (const modulo of this.modulos.values()) mundo.registrarObjeto(modulo);
    for (const fixador of this.fixadores.values()) mundo.registrarFixador(fixador);
  }

  /** Delegação operacional ao computador para percorrer permissivos e solicitar ignição explícita de todos os motores; retorna resultados individuais. @contract f-ced64c841fa15365 @reviewed M12-DOC: implementação lida. */
  public solicitarIgnicaoDosPropulsores(): readonly ResultadoComandoPropulsor[] {
    return this.computadorDeVoo.solicitarIgnicaoDeTodos();
  }

  /** Delegação da sequência de partida/ignição ao motor identificado; retorna aceitação e diagnóstico, sem alterar cinemática. @contract f-9642a2818f8394c9 @reviewed M12-DOC: implementação lida. */
  public solicitarIgnicaoDoPropulsor(idPropulsor: string): ResultadoComandoPropulsor {
    return this.computadorDeVoo.solicitarIgnicao(idPropulsor);
  }

  /** Delega comando normalizado ao motor identificado pelo computador; validação pertence ao motor. @contract f-43739a6d656305e2 @reviewed M12-DOC: implementação lida. */
  public definirThrottleDoPropulsor(idPropulsor: string, throttle: number): void {
    this.computadorDeVoo.definirThrottle(idPropulsor, throttle);
  }

  /** Delega o mesmo throttle a todos os motores instalados; não equivale a ignição. @contract f-33a277d7c86b2f84 @reviewed M12-DOC: implementação lida. */
  public definirThrottleDeTodosOsPropulsores(throttle: number): void {
    this.computadorDeVoo.definirThrottleDeTodos(throttle);
  }

  /** Solicita corte de todos os motores pela operação elétrica do computador, propagando a cadeia. @contract f-66b1501264aea86e @reviewed M12-DOC: implementação lida. */
  public desligarPropulsores(): void {
    this.computadorDeVoo.desligarTodos();
  }

  /** Solicita parada do motor identificado pela porta do computador. @contract f-1e0c45cdc470332c @reviewed M12-DOC: implementação lida. */
  public desligarPropulsor(idPropulsor: string): void { this.computadorDeVoo.desligarPropulsor(idPropulsor); }

  /** Seleciona PID de inclinação do computador para motores vetorizados instalados, respeitando arbitragem. @contract f-45ff117525af8a18 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeInclinacao(): void { this.computadorDeVoo.habilitar(); }
  /** Seleciona motores vetorizados específicos para controle de inclinação; computador valida IDs e conflitos. @contract f-6262e3c57f0e2af0 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeInclinacaoNosPropulsores(idsPropulsores: readonly string[]): void {
    this.computadorDeVoo.habilitarControleDeInclinacao(idsPropulsores);
  }
  /** Desabilita solicitação de inclinação no gerenciador, sem alterar atitude física. @contract f-0fb19353f8100e01 @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDeInclinacao(): void { this.computadorDeVoo.desabilitar(); }
  /** Devolve `this.computadorDeVoo.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-6380fa9ada052ff9
   * @remarks Consulta estado do controlador de inclinação composto no computador.
   * @contract f-6380fa9ada052ff9
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public get controleDeInclinacaoEstaHabilitado(): boolean { return this.computadorDeVoo.estaHabilitado; }
  /** Acrescenta controlador pelas portas de extensão do computador, com ID único e prioridade própria. @contract f-9bd602c1488947a0 @reviewed M12-DOC: implementação lida. */
  public registrarControlador(controlador: ControladorDeVoo): void { this.computadorDeVoo.registrarControlador(controlador); }
  /** Devolve `this.computadorDeVoo.obterSolicitacoesAplicadas()`. Dependências diretas: `this.computadorDeVoo.obterSolicitacoesAplicadas`. Efeitos indiretos seguem as dependências chamadas. @contract f-e349bc614a323c1d
   * @remarks Consulta cópias das solicitações que efetivamente chegaram às portas dos atuadores após arbitragem/permissivos.
   * @contract f-e349bc614a323c1d
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public obterSolicitacoesAplicadas(): readonly SolicitacaoArbitrada[] { return this.computadorDeVoo.obterSolicitacoesAplicadas(); }

  /** Configura/encontra controlador de pouso e seleção de motores pelo computador; não impõe estado de pouso físico. @contract f-90ed830c88842f9e @reviewed M12-DOC: implementação lida. */
  public habilitarControleDePouso(
    configuracao: Partial<ConfiguracaoControlePouso> = {},
    idsPropulsores?: readonly string[],
  ): void {
    this.computadorDeVoo.habilitarControleDePouso(configuracao, idsPropulsores);
  }
  /** Habilita pouso preservando demais controles, que continuam sujeitos à arbitragem por recurso. @contract f-6fe8874607aec4f2 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDePousoComposto(configuracao: Partial<ConfiguracaoControlePouso>, idsPropulsores: readonly string[]): void {
    this.computadorDeVoo.habilitarControleDePousoComposto(configuracao, idsPropulsores);
  }
  /** Seleciona PID de inclinação para motores vetorizados declarados, sem aplicar rotação instantânea. @contract f-e547ee17bf52af7d @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeVerticalizacao(idsPropulsores: readonly string[]): void {
    this.computadorDeVoo.habilitarControleDeVerticalizacao(idsPropulsores);
  }
  /** Configura gimbal de descida e ganho de deriva rad/(m/s) na porta do computador. @contract f-b99a5be913564709 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeGimbalDeDescida(idsPropulsores: readonly string[], ganhoDerivaRadPorMps?: number): void {
    this.computadorDeVoo.habilitarControleDeGimbalDeDescida(idsPropulsores, ganhoDerivaRadPorMps);
  }
  /** Configura PID de desaceleração e seleção de motores no computador. @contract f-a35735e375b9a20c @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeDesaceleracao(configuracao: Partial<ConfiguracaoControleDesaceleracao>, idsPropulsores: readonly string[]): void {
    this.computadorDeVoo.habilitarControleDeDesaceleracao(configuracao, idsPropulsores);
  }
  /** Desabilita controlador de pouso pelo computador. @contract f-1a0c25edb228e828 @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDePouso(): void { this.computadorDeVoo.desabilitarControleDePouso(); }
  /** Desabilita controlador de desaceleração pelo computador. @contract f-070ea143eed9dade @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDeDesaceleracao(): void { this.computadorDeVoo.desabilitarControleDeDesaceleracao(); }
  /** Desabilita controlador de gimbal de descida pelo computador. @contract f-c9fbd697f3ae5d0e @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDeGimbalDeDescida(): void { this.computadorDeVoo.desabilitarControleDeGimbalDeDescida(); }
  /** Devolve `this.computadorDeVoo.controleDeGimbalDeDescidaEstaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-f17dab4ab8242145
   * @remarks Consulta seleção de gimbal de descida, não autoridade física disponível.
   * @contract f-f17dab4ab8242145
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public get controleDeGimbalDeDescidaEstaHabilitado(): boolean { return this.computadorDeVoo.controleDeGimbalDeDescidaEstaHabilitado; }
  /** Configura Fuzzy-PID vertical e motores pela porta do computador; gimbal mantém autoridade independente. @contract f-52deea90b6b56440 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeDescidaFuzzyPid(configuracao: ConfiguracaoDescidaFuzzyPid, idsPropulsores: readonly string[]): void {
    this.computadorDeVoo.habilitarControleDeDescidaFuzzyPid(configuracao, idsPropulsores);
  }
  /** Desabilita Fuzzy-PID e seu amortecimento horizontal associado no computador. @contract f-9ef6e059845d5472 @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDeDescidaFuzzyPid(): void { this.computadorDeVoo.desabilitarControleDeDescidaFuzzyPid(); }
  /** Devolve `this.computadorDeVoo.controleDeDescidaFuzzyPidEstaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-8b629fbb7807eb45
   * @remarks Consulta seleção operacional do Fuzzy-PID.
   * @contract f-8b629fbb7807eb45
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public get controleDeDescidaFuzzyPidEstaHabilitado(): boolean { return this.computadorDeVoo.controleDeDescidaFuzzyPidEstaHabilitado; }
  /** Consulta cópia de fase, referência e throttle do Fuzzy-PID; não aplica comando. @contract f-3410bd363579f38e @reviewed M12-DOC: implementação lida. */
  public obterUltimoComandoDeDescidaFuzzyPid(): ComandoDescidaFuzzyPid {
    return this.computadorDeVoo.obterUltimoComandoDeDescidaFuzzyPid();
  }
  /** Devolve `this.computadorDeVoo.controleDePousoEstaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-03a4e349742900d1
   * @remarks Consulta seleção do controlador de pouso.
   * @contract f-03a4e349742900d1
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public get controleDePousoEstaHabilitado(): boolean { return this.computadorDeVoo.controleDePousoEstaHabilitado; }
  /** Consulta último comando de pouso ou undefined quando controle inativo. @contract f-7c5625890eaa5e77 @reviewed M12-DOC: implementação lida. */
  public obterUltimoComandoDePouso(): ComandoControlePouso | undefined {
    return this.computadorDeVoo.obterUltimoComandoDePouso();
  }

  /** Solicita atualização/arbitragem de controladores por dtS s antes da preparação dos motores; não integra diretamente o casco. @contract f-b951489114dfb081 @reviewed M12-DOC: implementação lida. */
  public override prepararPassoOperacional(dtS: number): void {
    this.computadorDeVoo.atualizarControladores(dtS);
  }

  /** Consulta diagnósticos operacionais individuais calculados pelo computador. @contract f-d906968d98d53a33 @reviewed M12-DOC: implementação lida. */
  public obterDiagnosticoDosPropulsores(): readonly ResultadoComandoPropulsor[] {
    return this.computadorDeVoo.obterDiagnostico();
  }

  /** Consulta leituras de sensores que alimentam o computador, preservando timestamp/falhas. @contract f-69b4989deae2fb65 @reviewed M12-DOC: implementação lida. */
  public obterLeiturasDoComputadorDeVoo(): ReturnType<ComputadorDeVoo['obterLeiturasDoCasco']> {
    return this.computadorDeVoo.obterLeiturasDoCasco();
  }

  /** Apenas módulos ainda conectados ao corpo central compõem este conjunto.
   * @contract f-873f2459e7a2f13d
   */
  public obterObjetosFisicosConectados(): readonly Objeto[] {
    const conectados = new Set<Objeto>([this]);
    let houveAlteracao = true;
    while (houveAlteracao) {
      houveAlteracao = false;
      for (const fixador of this.fixadores.values()) {
        if (!fixador.estaAtivo) continue;
        if (conectados.has(fixador.objetoA) && !conectados.has(fixador.objetoB)) {
          conectados.add(fixador.objetoB); houveAlteracao = true;
        }
        if (conectados.has(fixador.objetoB) && !conectados.has(fixador.objetoA)) {
          conectados.add(fixador.objetoA); houveAlteracao = true;
        }
      }
    }
    return [...conectados];
  }

  /** Soma kg somente de corpos alcançáveis por fixadores ativos a partir do casco; módulos separados permanecem no mundo, sem compor a massa do veículo. @contract f-088fafe22599e5a4 @reviewed M12-DOC: implementação lida. */
  public get massaInstantaneaDoConjuntoKg(): number {
    return this.obterObjetosFisicosConectados().reduce((massa, objeto) => massa + objeto.massaKg, 0);
  }

  /** Calcula posição de G em m por média ponderada das massas instantâneas dos corpos ainda conectados. @contract f-32893a9a0796a1ce @reviewed M12-DOC: implementação lida. */
  public get centroDeMassaDoConjuntoM(): Vetor3 {
    const objetos = this.obterObjetosFisicosConectados();
    const massa = objetos.reduce((soma, objeto) => soma + objeto.massaKg, 0);
    return objetos.reduce(
      (soma, objeto) => soma.adicionar(objeto.getEstadoFisico().posicaoM.multiplicar(objeto.massaKg / massa)),
      Vetor3.zero,
    );
  }

  /** Devolve `[...this.modulos.values()]`. Dependências diretas: `this.modulos.values`. Efeitos indiretos seguem as dependências chamadas. @contract f-4b333846bf7b91a8
   * @remarks Devolve nova lista de referências dos módulos declarados, inclusive separados; não representa necessariamente conjunto rígido atual.
   * @contract f-4b333846bf7b91a8
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public get modulosFisicos(): readonly Objeto[] { return [...this.modulos.values()]; }
  /** Devolve `[...this.fixadores.values()]`. Dependências diretas: `this.fixadores.values`. Efeitos indiretos seguem as dependências chamadas. @contract f-7f710e5d2c4a7907
   * @remarks Devolve nova lista de vínculos declarados, inclusive rompidos/liberados.
   * @contract f-7f710e5d2c4a7907
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public get fixadoresEstruturais(): readonly FixadorEstrutural[] { return [...this.fixadores.values()]; }
  /** Devolve `this.sensores.obterLeituras()`. Dependências diretas: `this.sensores.obterLeituras`. Efeitos indiretos seguem as dependências chamadas. @contract f-57c1456a46cf3731
   * @remarks Consulta pacote real de sensores do casco, sem fabricar leituras na apresentação.
   * @contract f-57c1456a46cf3731
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public obterLeiturasDosSensores(): ReturnType<SensoresVeiculoComposto['obterLeituras']> { return this.sensores.obterLeituras(); }

  /** Injeção determinística de falha para ensaios; não altera o estado físico.
   * @contract f-46ef23ef20b8671c
   */
  public injetarFalhaNosSensores(falha: FalhaSensorVeiculo): void { this.sensores.injetarFalha(falha); }
  /** Remove injeção de falha pela API dos sensores, sem alterar o estado físico. @contract f-024ee2a28ec77298 @reviewed M12-DOC: implementação lida. */
  public limparFalhaNosSensores(): void { this.sensores.limparFalhaInjetada(); }

  /** Verifica se a instância é o casco ou módulo registrado sob seu próprio ID. @contract f-ef61cecd3c8576c0 @reviewed M12-DOC: implementação lida. */
  private pertenceAoVeiculo(objeto: Objeto): boolean {
    return objeto === this || this.modulos.get(objeto.id) === objeto;
  }
}
