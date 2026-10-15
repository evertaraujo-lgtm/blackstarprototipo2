import type { LeiturasVeiculoComposto } from '../../sensores/SensoresVeiculoComposto';
import { IDADE_MAXIMA_LEITURA_SENSOR_S } from '../../sensores/SensoresVeiculoComposto';
import {
  type ComandoControlePouso,
  type ConfiguracaoControlePouso,
} from '../../sistemas de controle/ControladorPouso';
import { ControladorInclinacaoDePropulsores } from '../../sistemas de controle/ControladorInclinacaoDePropulsores';
import { ControladorPousoDePropulsores } from '../../sistemas de controle/ControladorPousoDePropulsores';
import { ControladorDesaceleracaoDePropulsores } from '../../sistemas de controle/ControladorDesaceleracaoDePropulsores';
import { ControladorGimbalDescidaDePropulsores } from '../../sistemas de controle/ControladorGimbalDescidaDePropulsores';
import {
  ControladorDescidaFuzzyPidDePropulsores,
  type ComandoDescidaFuzzyPid,
  type ConfiguracaoDescidaFuzzyPid,
} from '../../sistemas de controle/ControladorDescidaFuzzyPidDePropulsores';
import type { ConfiguracaoControleDesaceleracao } from '../../sistemas de controle/ControladorDesaceleracao';
import { GerenciadorDeControladores, type ControladorDeVoo, type SolicitacaoArbitrada } from '../../sistemas de controle/GerenciadorDeControladores';
import type { EstadoVetorizacao } from '../propulsao/vetorizacao/InterfacesVetorizacao';

type IdSistemaControlado = 'elétrico' | 'hidráulico' | 'combustível' | 'controle';

export interface FonteTelemetriaDoCasco {
  obterLeituras(): LeiturasVeiculoComposto;
}

/** Porta operacional que o computador precisa para controlar um propulsor. */
export interface IPropulsorControlavelPeloComputador {
  readonly id: string;
  readonly estaIgnitado: boolean;
  readonly diagnosticoOperacional: readonly string[];
  sistemaEstaOperacional(id: IdSistemaControlado): boolean;
  ligarSistema(id: IdSistemaControlado): boolean;
  solicitarIgnicao(): boolean;
  definirThrottle(throttle: number): void;
  desligarSistema(id: IdSistemaControlado): void;
  solicitarVetorizacao?(anguloAlvoRad: number): boolean;
  obterEstadoDaVetorizacao?(): EstadoVetorizacao;
}

export interface ResultadoComandoPropulsor {
  readonly idPropulsor: string;
  readonly aceito: boolean;
  readonly diagnostico: readonly string[];
}

/**
 * Componente operacional sem estado físico. Ele conhece somente a interface
 * pública dos propulsores instalados, nunca o veículo que o contém.
 */
export class ComputadorDeVoo {
  private readonly propulsores = new Map<string, IPropulsorControlavelPeloComputador>();
  private readonly propulsoresVetorizados = new Map<string, IPropulsorControlavelPeloComputador>();
  private readonly gerenciador = new GerenciadorDeControladores();
  private estavaAlimentado = false;
  private solicitacoesAplicadas: readonly SolicitacaoArbitrada[] = [];
  private readonly controladorInclinacao = new ControladorInclinacaoDePropulsores();
  private readonly controladorPouso = new ControladorPousoDePropulsores();
  private readonly controladorDesaceleracao = new ControladorDesaceleracaoDePropulsores();
  private readonly controladorGimbalDescida = new ControladorGimbalDescidaDePropulsores();
  private readonly controladorDescidaFuzzyPid = new ControladorDescidaFuzzyPidDePropulsores();

  /** Guarda porta de telemetria e registra controladores de inclinação, pouso, desaceleração, gimbal de descida e Fuzzy-PID no gerenciador; não recebe nem navega pelo veículo proprietário. @contract f-3115018a632ba8cf @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly telemetriaDoCasco: FonteTelemetriaDoCasco) {
    this.gerenciador.registrar(this.controladorInclinacao);
    this.gerenciador.registrar(this.controladorPouso);
    this.gerenciador.registrar(this.controladorDesaceleracao);
    this.gerenciador.registrar(this.controladorGimbalDescida);
    this.gerenciador.registrar(this.controladorDescidaFuzzyPid);
  }

  /** Consulta pacote de leituras pela porta injetada; não mantém dinâmica própria nem estima outra altitude. @contract f-b0e1189b763914a1 @reviewed M12-DOC: implementação lida. */
  public obterLeiturasDoCasco(): LeiturasVeiculoComposto {
    return this.telemetriaDoCasco.obterLeituras();
  }

  /** Rejeita id duplicado, registra porta operacional e inclui na seleção vetorizável somente se ambas as portas de comando/leitura do gimbal existirem. @contract f-223bc2a4a41bc800 @reviewed M12-DOC: implementação lida. */
  public instalarPropulsor(propulsor: IPropulsorControlavelPeloComputador): void {
    if (this.propulsores.has(propulsor.id)) throw new Error(`Propulsor já instalado no computador: ${propulsor.id}.`);
    this.propulsores.set(propulsor.id, propulsor);
    if (propulsor.solicitarVetorizacao && propulsor.obterEstadoDaVetorizacao) {
      this.propulsoresVetorizados.set(propulsor.id, propulsor);
    }
  }

  /** Ativa inclinação em todos os motores vetorizados, desativa pouso/gimbal de descida e remove correção lateral gradual; não representa ativação de todos os controladores. @contract f-4b4f2d241b070c31 @reviewed M12-DOC: implementação lida. */
  public habilitar(): void {
    this.desabilitarControleDePouso();
    this.desabilitarControleDeGimbalDeDescida();
    this.controladorInclinacao.desabilitarAmortecimentoHorizontal();
    this.controladorInclinacao.configurarAlvos([...this.propulsoresVetorizados.keys()]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }
  /** Desativa somente controlador de inclinação; demais controladores mantêm sua seleção operacional. @contract f-217dc61dda130d03 @reviewed M12-DOC: implementação lida. */
  public desabilitar(): void { this.gerenciador.desabilitar(this.controladorInclinacao.id); }

  /** Desativa pouso/gimbal de descida, valida seleção não vazia de motores vetorizados e habilita PID de inclinação. @contract f-d658c2943e76a9f5 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeInclinacao(idsPropulsores: readonly string[] = [...this.propulsoresVetorizados.keys()]): void {
    this.desabilitarControleDePouso();
    this.desabilitarControleDeGimbalDeDescida();
    this.controladorInclinacao.configurarAlvos([...this.validarSelecao(idsPropulsores, true)]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }

  /** Desativa inclinação, configura controlador de pouso com motores instalados selecionados e o habilita; não exige gimbal quando não necessário. @contract f-c6ba6ae7eb07b5d0 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDePouso(
    configuracao: Partial<ConfiguracaoControlePouso> = {},
    idsPropulsores: readonly string[] = [...this.propulsores.keys()],
  ): void {
    this.gerenciador.desabilitar(this.controladorInclinacao.id);
    this.controladorPouso.configurar(configuracao, [...this.validarSelecao(idsPropulsores, false)]);
    this.gerenciador.habilitar(this.controladorPouso.id);
  }

  /** Ativa pouso sem desativar verticalização ou desaceleração já registradas.
   * @contract f-3751c0abba9bbc5c
   */
  public habilitarControleDePousoComposto(
    configuracao: Partial<ConfiguracaoControlePouso> = {}, idsPropulsores: readonly string[] = [...this.propulsores.keys()],
  ): void {
    this.controladorPouso.configurar(configuracao, [...this.validarSelecao(idsPropulsores, false)]);
    this.gerenciador.habilitar(this.controladorPouso.id);
  }

  /** Valida motores vetorizados e habilita inclinação, preservando outros controladores para composição/arbitragem. @contract f-46a56b00aaef2d33 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeVerticalizacao(idsPropulsores: readonly string[]): void {
    this.controladorInclinacao.configurarAlvos([...this.validarSelecao(idsPropulsores, true)]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }

  /** Desativa inclinação, valida seleção vetorizada, configura ganho de deriva rad/(m/s) e habilita controlador de descida. @contract f-8bf1e565cc8a35fb @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeGimbalDeDescida(idsPropulsores: readonly string[], ganhoDerivaRadPorMps?: number): void {
    this.gerenciador.desabilitar(this.controladorInclinacao.id);
    this.controladorGimbalDescida.configurarAlvos([...this.validarSelecao(idsPropulsores, true)], ganhoDerivaRadPorMps);
    this.gerenciador.habilitar(this.controladorGimbalDescida.id);
  }

  /** Configura controlador de desaceleração para seleção validada e o habilita sem executar ignição. @contract f-0738990da2805bb6 @reviewed M12-DOC: implementação lida. */
  public habilitarControleDeDesaceleracao(
    configuracao: Partial<ConfiguracaoControleDesaceleracao>, idsPropulsores: readonly string[],
  ): void {
    this.controladorDesaceleracao.configurar(configuracao, [...this.validarSelecao(idsPropulsores, false)]);
    this.gerenciador.habilitar(this.controladorDesaceleracao.id);
  }

  /** Desativa controlador de pouso via gerenciador; o controlador limpa sua memória/último comando. @contract f-5b096cfad2219e4d @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDePouso(): void {
    this.gerenciador.desabilitar(this.controladorPouso.id);
  }
  /** Desativa controlador de desaceleração via gerenciador e reinicia sua memória. @contract f-77934db4dcf72f7f @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDeDesaceleracao(): void { this.gerenciador.desabilitar(this.controladorDesaceleracao.id); }
  /** Desativa PID de gimbal de descida via gerenciador, sem impor orientação ao veículo. @contract f-db9721d0aca9aa2f @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDeGimbalDeDescida(): void { this.gerenciador.desabilitar(this.controladorGimbalDescida.id); }
  /** Devolve `this.controladorGimbalDescida.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-28ed00f5e4b2e789 */
  public get controleDeGimbalDeDescidaEstaHabilitado(): boolean { return this.controladorGimbalDescida.estaHabilitado; }

  /** Controle BSS-004: PID de throttle independente do gimbal, que pode ficar ativo continuamente.
   * @contract f-84459e633f3918d5
   */
  public habilitarControleDeDescidaFuzzyPid(configuracao: ConfiguracaoDescidaFuzzyPid, idsPropulsores: readonly string[]): void {
    this.gerenciador.desabilitar(this.controladorPouso.id);
    this.gerenciador.desabilitar(this.controladorDesaceleracao.id);
    this.controladorInclinacao.configurarAmortecimentoHorizontal(
      configuracao.ganhoAtitudePorVelocidadeHorizontalRadPorMps ?? 0.01,
    );
    this.controladorDescidaFuzzyPid.configurar(configuracao, [...this.validarSelecao(idsPropulsores, false)]);
    this.gerenciador.habilitar(this.controladorDescidaFuzzyPid.id);
  }

  /** Desativa Fuzzy-PID e remove correção horizontal do controlador de inclinação; não zera velocidade física. @contract f-526bb8b13da9261b @reviewed M12-DOC: implementação lida. */
  public desabilitarControleDeDescidaFuzzyPid(): void {
    this.gerenciador.desabilitar(this.controladorDescidaFuzzyPid.id);
    this.controladorInclinacao.desabilitarAmortecimentoHorizontal();
  }

  /** Consulta seleção operacional do Fuzzy-PID; habilitado não significa que permissivos dos atuadores estejam disponíveis. @contract f-56dba2053976afb4 @reviewed M12-DOC: implementação lida. */
  public get controleDeDescidaFuzzyPidEstaHabilitado(): boolean {
    return this.controladorDescidaFuzzyPid.estaHabilitado;
  }

  /** Consulta último resultado calculado pelo Fuzzy-PID, conforme contrato de cópia do controlador. @contract f-5b3119a019f5ee87 @reviewed M12-DOC: implementação lida. */
  public obterUltimoComandoDeDescidaFuzzyPid(): ComandoDescidaFuzzyPid {
    return this.controladorDescidaFuzzyPid.obterUltimoComando();
  }

  /** Consulta habilitação do controlador de pouso, sem comprovar apoio, toque ou êxito de missão. @contract f-0e490f8258936b3e @reviewed M12-DOC: implementação lida. */
  public get controleDePousoEstaHabilitado(): boolean {
    return this.controladorPouso.estaHabilitado;
  }

  /** Devolve último comando somente se controle de pouso habilitado; caso contrário retorna undefined. @contract f-b5347ffb94d4bd16 @reviewed M12-DOC: implementação lida. */
  public obterUltimoComandoDePouso(): ComandoControlePouso | undefined {
    return this.controladorPouso.estaHabilitado ? this.controladorPouso.obterUltimoComando() : undefined;
  }

  /** Extensão aberta para controles independentes (RCS, térmico, paraquedas etc.).
   * @contract f-b64a5088af010807
   */
  public registrarControlador(controlador: ControladorDeVoo): void { this.gerenciador.registrar(controlador); }
  /** Encaminha id ao gerenciador para habilitar controlador registrado; não altera permissivos físicos dos motores. @contract f-1185d322e448e002 @reviewed M12-DOC: implementação lida. */
  public habilitarControlador(id: string): void { this.gerenciador.habilitar(id); }
  /** Encaminha id ao gerenciador para desabilitação e limpeza prevista pelo controlador. @contract f-a2f5101cb8b0ce76 @reviewed M12-DOC: implementação lida. */
  public desabilitarControlador(id: string): void { this.gerenciador.desabilitar(id); }
  /** Devolve `this.gerenciador.idsAtivos()`. Dependências diretas: `this.gerenciador.idsAtivos`. Efeitos indiretos seguem as dependências chamadas. @contract f-bd3361a23495da26 */
  public get idsControladoresAtivos(): readonly string[] { return this.gerenciador.idsAtivos(); }
  /** Cria cópia da lista e de cada solicitação efetivamente aplicada na última atualização, separada dos pedidos rejeitados. @contract f-337d3ca5f1ee1f65 @reviewed M12-DOC: implementação lida. */
  public obterSolicitacoesAplicadas(): readonly SolicitacaoArbitrada[] {
    return this.solicitacoesAplicadas.map((solicitacao) => ({ ...solicitacao }));
  }
  /** Devolve `this.controladorInclinacao.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-1c5ea72ddb54b366 */
  public get estaHabilitado(): boolean { return this.controladorInclinacao.estaHabilitado; }

  /** Executa uma amostra do controle PID antes da preparação dos propulsores.
   * @contract f-f89bcc810ff54965
   */
  public atualizarControleDeInclinacao(dtS: number): void {
    this.aplicarSolicitacoesDeControladores(dtS);
  }

  /** Aplica throttle e gimbal pelas mesmas portas operacionais do comando manual.
   * @contract f-b028c0250a66549d
   */
  public atualizarControleDePouso(dtS: number): void {
    this.aplicarSolicitacoesDeControladores(dtS);
  }

  /** Executa ciclo central de leitura, cálculo, arbitragem e aplicação para dt em s. É a mesma operação usada pelos aliases de atualização; chamá-los adicionalmente duplicaria atualização de memória. @contract f-1e66d026bf2d5e2f @reviewed M12-DOC: implementação lida. */
  public atualizarControladores(dtS: number): void {
    this.aplicarSolicitacoesDeControladores(dtS);
  }

  /** Localiza motor instalado e envia throttle pela porta validada; não liga sistemas nem solicita ignição. @contract f-e294ab50adf8ee32 @reviewed M12-DOC: implementação lida. */
  public definirThrottle(idPropulsor: string, throttle: number): void {
    this.obterPropulsor(idPropulsor).definirThrottle(throttle);
  }

  /** Solicita mesmo throttle a todos os motores registrados usando suas portas operacionais; não garante empuxo. @contract f-7b7c57486c5ae695 @reviewed M12-DOC: implementação lida. */
  public definirThrottleDeTodos(throttle: number): void {
    for (const propulsor of this.propulsores.values()) propulsor.definirThrottle(throttle);
  }

  /**
   * A automação percorre exatamente a mesma cadeia usada na operação manual:
   * elétrica → hidráulica → combustível → controle → ignição.
   * @contract f-cd7ba09bfbb8e295
   */
  public solicitarIgnicaoDeTodos(): readonly ResultadoComandoPropulsor[] {
    return [...this.propulsores.keys()].map((id) => this.solicitarIgnicao(id));
  }

  /** Tenta sistemas na ordem elétrico→hidráulico→combustível→controle com interrupção na primeira recusa; solicita ignição explícita só após todos aceitarem e retorna aceitação/diagnóstico. Sistemas já acionados não são revertidos automaticamente. @contract f-6425699b43700f58 @reviewed M12-DOC: implementação lida. */
  public solicitarIgnicao(idPropulsor: string): ResultadoComandoPropulsor {
    const propulsor = this.obterPropulsor(idPropulsor);
    const sequencia: readonly IdSistemaControlado[] = ['elétrico', 'hidráulico', 'combustível', 'controle'];
    const sistemasAceitos = sequencia.every((sistema) => propulsor.ligarSistema(sistema));
    const aceito = sistemasAceitos && propulsor.solicitarIgnicao();
    return { idPropulsor: propulsor.id, aceito, diagnostico: propulsor.diagnosticoOperacional };
  }

  /** Desliga sistema elétrico do motor selecionado, provocando sua cadeia normal de intertravamentos; não remove corpo do mundo. @contract f-2fb721895466636b @reviewed M12-DOC: implementação lida. */
  public desligarPropulsor(idPropulsor: string): void {
    this.obterPropulsor(idPropulsor).desligarSistema('elétrico');
  }

  /** Desliga sistema elétrico de cada propulsor registrado pelas mesmas operações do operador. @contract f-8e9156b0afc0693a @reviewed M12-DOC: implementação lida. */
  public desligarTodos(): void {
    for (const propulsor of this.propulsores.values()) propulsor.desligarSistema('elétrico');
  }

  /** Compõe diagnóstico por motor; aceito significa ignição presente e lista de motivos vazia no instante da consulta, não qualificação do voo. @contract f-b42e349f6775b05f @reviewed M12-DOC: implementação lida. */
  public obterDiagnostico(): readonly ResultadoComandoPropulsor[] {
    return [...this.propulsores.values()].map((propulsor) => ({
      idPropulsor: propulsor.id,
      aceito: propulsor.estaIgnitado && propulsor.diagnosticoOperacional.length === 0,
      diagnostico: propulsor.diagnosticoOperacional,
    }));
  }

  /** Consulta motor por id ou lança erro se não instalado; não cria componentes implicitamente. @contract f-6996921a46b0f79a @reviewed M12-DOC: implementação lida. */
  private obterPropulsor(idPropulsor: string): IPropulsorControlavelPeloComputador {
    const propulsor = this.propulsores.get(idPropulsor);
    if (!propulsor) throw new Error(`Propulsor não instalado: ${idPropulsor}.`);
    return propulsor;
  }

  /** Exige seleção não vazia sem ids repetidos, todos instalados e, quando requerido, com portas de vetorização; retorna Set validado sem alterar seleção anterior. @contract f-2665b2da0cf0481c @reviewed M12-DOC: implementação lida. */
  private validarSelecao(idsPropulsores: readonly string[], exigirVetorizacao: boolean): Set<string> {
    if (idsPropulsores.length === 0) throw new Error('O controlador precisa de ao menos um propulsor selecionado.');
    const ids = new Set(idsPropulsores);
    if (ids.size !== idsPropulsores.length) throw new Error('Seleção de propulsores contém identificadores duplicados.');
    for (const id of ids) {
      this.obterPropulsor(id);
      if (exigirVetorizacao && !this.propulsoresVetorizados.has(id)) {
        throw new Error(`Propulsor sem vetorização não pode controlar inclinação: ${id}.`);
      }
    }
    return ids;
  }

  /** Consulta limite real do atuador, satura pedido em rad e o envia pela porta; retorna valor aceito ou undefined por ausência de capacidade/recusa. Não altera ângulo diretamente. @contract f-c1075ebae0ca7291 @reviewed M12-DOC: implementação lida. */
  private solicitarGimbalLimitado(idPropulsor: string, comandoRad: number): number | undefined {
    const propulsor = this.propulsoresVetorizados.get(idPropulsor);
    const limiteRad = propulsor?.obterEstadoDaVetorizacao?.().limiteAngularRad;
    if (!propulsor?.solicitarVetorizacao || limiteRad === undefined) return;
    const valorRad = Math.max(-limiteRad, Math.min(limiteRad, comandoRad));
    return propulsor.solicitarVetorizacao(valorRad) ? valorRad : undefined;
  }

  /** Limpa diagnóstico aplicado e verifica alimentação elétrica/controle. Perda de energia reinicia memórias; leitura inválida/obsoleta reinicia controles, solicita throttle zero e mantém alvo do gimbal no ângulo atual. Caso válido arbitra pedidos, filtra motores operacionais, limita gimbal e registra apenas comandos aceitos. Não integra forças ou cinemática. @contract f-2a19b873c05a47a3 @reviewed M12-DOC: implementação lida. */
  private aplicarSolicitacoesDeControladores(dtS: number): void {
    const controladoresAlimentados = [...this.propulsores.values()].some((propulsor) =>
      propulsor.sistemaEstaOperacional('elétrico') && propulsor.sistemaEstaOperacional('controle'));
    this.solicitacoesAplicadas = [];
    if (this.estavaAlimentado && !controladoresAlimentados) this.gerenciador.reiniciarControladores();
    this.estavaAlimentado = controladoresAlimentados;
    if (!controladoresAlimentados) return;
    const leituras = this.telemetriaDoCasco.obterLeituras();
    const sensoresInvalidos = leituras.sensoresValidos === false
      || (leituras.idadeLeituraS !== undefined && leituras.idadeLeituraS > IDADE_MAXIMA_LEITURA_SENSOR_S);
    if (sensoresInvalidos) this.gerenciador.reiniciarControladores();
    this.gerenciador.calcularSolicitacoes(leituras, dtS);
    if (sensoresInvalidos) {
      for (const propulsor of this.propulsores.values()) {
        propulsor.definirThrottle(0);
        const estadoGimbal = propulsor.obterEstadoDaVetorizacao?.();
        if (estadoGimbal && propulsor.solicitarVetorizacao) {
          propulsor.solicitarVetorizacao(estadoGimbal.anguloAtualRad);
        }
      }
      return;
    }
    const aplicadas: SolicitacaoArbitrada[] = [];
    for (const solicitacao of this.gerenciador.obterUltimaArbitragem()) {
      const propulsor = this.propulsores.get(solicitacao.idAtuador);
      if (!propulsor?.sistemaEstaOperacional('elétrico') || !propulsor.sistemaEstaOperacional('controle')) continue;
      if (solicitacao.recurso === 'throttle') {
        this.obterPropulsor(solicitacao.idAtuador).definirThrottle(solicitacao.valor);
        aplicadas.push(solicitacao);
      } else {
        const valor = this.solicitarGimbalLimitado(solicitacao.idAtuador, solicitacao.valor);
        if (valor !== undefined) aplicadas.push({ ...solicitacao, valor });
      }
    }
    this.solicitacoesAplicadas = aplicadas;
  }
}
