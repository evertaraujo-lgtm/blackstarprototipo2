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

  /** Escritas diretas: `this.telemetriaDoCasco`. Dependências diretas: `this.gerenciador.registrar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-3115018a632ba8cf */
  public constructor(private readonly telemetriaDoCasco: FonteTelemetriaDoCasco) {
    this.gerenciador.registrar(this.controladorInclinacao);
    this.gerenciador.registrar(this.controladorPouso);
    this.gerenciador.registrar(this.controladorDesaceleracao);
    this.gerenciador.registrar(this.controladorGimbalDescida);
    this.gerenciador.registrar(this.controladorDescidaFuzzyPid);
  }

  /** Devolve `this.telemetriaDoCasco.obterLeituras()`. Dependências diretas: `this.telemetriaDoCasco.obterLeituras`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b0e1189b763914a1 */
  public obterLeiturasDoCasco(): LeiturasVeiculoComposto {
    return this.telemetriaDoCasco.obterLeituras();
  }

  /** Dependências diretas: `this.propulsores.has`, `Error`, `this.propulsores.set`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-223bc2a4a41bc800 */
  public instalarPropulsor(propulsor: IPropulsorControlavelPeloComputador): void {
    if (this.propulsores.has(propulsor.id)) throw new Error(`Propulsor já instalado no computador: ${propulsor.id}.`);
    this.propulsores.set(propulsor.id, propulsor);
    if (propulsor.solicitarVetorizacao && propulsor.obterEstadoDaVetorizacao) {
      this.propulsoresVetorizados.set(propulsor.id, propulsor);
    }
  }

  /** Dependências diretas: `this.desabilitarControleDePouso`, `this.desabilitarControleDeGimbalDeDescida`, `this.controladorInclinacao.desabilitarAmortecimentoHorizontal`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-4b4f2d241b070c31 */
  public habilitar(): void {
    this.desabilitarControleDePouso();
    this.desabilitarControleDeGimbalDeDescida();
    this.controladorInclinacao.desabilitarAmortecimentoHorizontal();
    this.controladorInclinacao.configurarAlvos([...this.propulsoresVetorizados.keys()]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }
  /** Dependências diretas: `this.gerenciador.desabilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-217dc61dda130d03 */
  public desabilitar(): void { this.gerenciador.desabilitar(this.controladorInclinacao.id); }

  /** Dependências diretas: `this.desabilitarControleDePouso`, `this.desabilitarControleDeGimbalDeDescida`, `this.controladorInclinacao.configurarAlvos`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-d658c2943e76a9f5 */
  public habilitarControleDeInclinacao(idsPropulsores: readonly string[] = [...this.propulsoresVetorizados.keys()]): void {
    this.desabilitarControleDePouso();
    this.desabilitarControleDeGimbalDeDescida();
    this.controladorInclinacao.configurarAlvos([...this.validarSelecao(idsPropulsores, true)]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }

  /** Dependências diretas: `this.gerenciador.desabilitar`, `this.controladorPouso.configurar`, `this.validarSelecao`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-c6ba6ae7eb07b5d0 */
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

  /** Dependências diretas: `this.controladorInclinacao.configurarAlvos`, `this.validarSelecao`, `this.gerenciador.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-46a56b00aaef2d33 */
  public habilitarControleDeVerticalizacao(idsPropulsores: readonly string[]): void {
    this.controladorInclinacao.configurarAlvos([...this.validarSelecao(idsPropulsores, true)]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }

  /** Dependências diretas: `this.gerenciador.desabilitar`, `this.controladorGimbalDescida.configurarAlvos`, `this.validarSelecao`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-8bf1e565cc8a35fb */
  public habilitarControleDeGimbalDeDescida(idsPropulsores: readonly string[], ganhoDerivaRadPorMps?: number): void {
    this.gerenciador.desabilitar(this.controladorInclinacao.id);
    this.controladorGimbalDescida.configurarAlvos([...this.validarSelecao(idsPropulsores, true)], ganhoDerivaRadPorMps);
    this.gerenciador.habilitar(this.controladorGimbalDescida.id);
  }

  /** Dependências diretas: `this.controladorDesaceleracao.configurar`, `this.validarSelecao`, `this.gerenciador.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0738990da2805bb6 */
  public habilitarControleDeDesaceleracao(
    configuracao: Partial<ConfiguracaoControleDesaceleracao>, idsPropulsores: readonly string[],
  ): void {
    this.controladorDesaceleracao.configurar(configuracao, [...this.validarSelecao(idsPropulsores, false)]);
    this.gerenciador.habilitar(this.controladorDesaceleracao.id);
  }

  /** Dependências diretas: `this.gerenciador.desabilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-5b096cfad2219e4d */
  public desabilitarControleDePouso(): void {
    this.gerenciador.desabilitar(this.controladorPouso.id);
  }
  /** Dependências diretas: `this.gerenciador.desabilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-77934db4dcf72f7f */
  public desabilitarControleDeDesaceleracao(): void { this.gerenciador.desabilitar(this.controladorDesaceleracao.id); }
  /** Dependências diretas: `this.gerenciador.desabilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-db9721d0aca9aa2f */
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

  /** Dependências diretas: `this.gerenciador.desabilitar`, `this.controladorInclinacao.desabilitarAmortecimentoHorizontal`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-526bb8b13da9261b */
  public desabilitarControleDeDescidaFuzzyPid(): void {
    this.gerenciador.desabilitar(this.controladorDescidaFuzzyPid.id);
    this.controladorInclinacao.desabilitarAmortecimentoHorizontal();
  }

  /** Devolve `this.controladorDescidaFuzzyPid.estaHabilitado`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-56dba2053976afb4 */
  public get controleDeDescidaFuzzyPidEstaHabilitado(): boolean {
    return this.controladorDescidaFuzzyPid.estaHabilitado;
  }

  /** Devolve `this.controladorDescidaFuzzyPid.obterUltimoComando()`. Dependências diretas: `this.controladorDescidaFuzzyPid.obterUltimoComando`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-5b3119a019f5ee87 */
  public obterUltimoComandoDeDescidaFuzzyPid(): ComandoDescidaFuzzyPid {
    return this.controladorDescidaFuzzyPid.obterUltimoComando();
  }

  /** Devolve `this.controladorPouso.estaHabilitado`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0e490f8258936b3e */
  public get controleDePousoEstaHabilitado(): boolean {
    return this.controladorPouso.estaHabilitado;
  }

  /** Devolve `this.controladorPouso.estaHabilitado ? this.controladorPouso.obterUltimoComando() : undefined`. Dependências diretas: `this.controladorPouso.obterUltimoComando`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b5347ffb94d4bd16 */
  public obterUltimoComandoDePouso(): ComandoControlePouso | undefined {
    return this.controladorPouso.estaHabilitado ? this.controladorPouso.obterUltimoComando() : undefined;
  }

  /** Extensão aberta para controles independentes (RCS, térmico, paraquedas etc.).
   * @contract f-b64a5088af010807
   */
  public registrarControlador(controlador: ControladorDeVoo): void { this.gerenciador.registrar(controlador); }
  /** Dependências diretas: `this.gerenciador.habilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-1185d322e448e002 */
  public habilitarControlador(id: string): void { this.gerenciador.habilitar(id); }
  /** Dependências diretas: `this.gerenciador.desabilitar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-a2f5101cb8b0ce76 */
  public desabilitarControlador(id: string): void { this.gerenciador.desabilitar(id); }
  /** Devolve `this.gerenciador.idsAtivos()`. Dependências diretas: `this.gerenciador.idsAtivos`. Efeitos indiretos seguem as dependências chamadas. @contract f-bd3361a23495da26 */
  public get idsControladoresAtivos(): readonly string[] { return this.gerenciador.idsAtivos(); }
  /** Devolve `this.solicitacoesAplicadas.map((solicitacao) => ({ ...solicitacao }))`. Dependências diretas: `this.solicitacoesAplicadas.map`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-337d3ca5f1ee1f65 */
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

  /** Dependências diretas: `this.aplicarSolicitacoesDeControladores`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-1e66d026bf2d5e2f */
  public atualizarControladores(dtS: number): void {
    this.aplicarSolicitacoesDeControladores(dtS);
  }

  /** Dependências diretas: `this.obterPropulsor(idPropulsor).definirThrottle`, `this.obterPropulsor`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-e294ab50adf8ee32 */
  public definirThrottle(idPropulsor: string, throttle: number): void {
    this.obterPropulsor(idPropulsor).definirThrottle(throttle);
  }

  /** Dependências diretas: `this.propulsores.values`, `propulsor.definirThrottle`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-7b7c57486c5ae695 */
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

  /** Devolve `{ idPropulsor: propulsor.id, aceito, diagnostico: propulsor.diagnosticoOperacional }`. Dependências diretas: `this.obterPropulsor`, `sequencia.every`, `propulsor.solicitarIgnicao`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-6425699b43700f58 */
  public solicitarIgnicao(idPropulsor: string): ResultadoComandoPropulsor {
    const propulsor = this.obterPropulsor(idPropulsor);
    const sequencia: readonly IdSistemaControlado[] = ['elétrico', 'hidráulico', 'combustível', 'controle'];
    const sistemasAceitos = sequencia.every((sistema) => propulsor.ligarSistema(sistema));
    const aceito = sistemasAceitos && propulsor.solicitarIgnicao();
    return { idPropulsor: propulsor.id, aceito, diagnostico: propulsor.diagnosticoOperacional };
  }

  /** Dependências diretas: `this.obterPropulsor(idPropulsor).desligarSistema`, `this.obterPropulsor`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-2fb721895466636b */
  public desligarPropulsor(idPropulsor: string): void {
    this.obterPropulsor(idPropulsor).desligarSistema('elétrico');
  }

  /** Dependências diretas: `this.propulsores.values`, `propulsor.desligarSistema`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-8e9156b0afc0693a */
  public desligarTodos(): void {
    for (const propulsor of this.propulsores.values()) propulsor.desligarSistema('elétrico');
  }

  /** Dependências diretas: `[...this.propulsores.values()].map`, `this.propulsores.values`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b42e349f6775b05f */
  public obterDiagnostico(): readonly ResultadoComandoPropulsor[] {
    return [...this.propulsores.values()].map((propulsor) => ({
      idPropulsor: propulsor.id,
      aceito: propulsor.estaIgnitado && propulsor.diagnosticoOperacional.length === 0,
      diagnostico: propulsor.diagnosticoOperacional,
    }));
  }

  /** Devolve `propulsor`. Dependências diretas: `this.propulsores.get`, `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-6996921a46b0f79a */
  private obterPropulsor(idPropulsor: string): IPropulsorControlavelPeloComputador {
    const propulsor = this.propulsores.get(idPropulsor);
    if (!propulsor) throw new Error(`Propulsor não instalado: ${idPropulsor}.`);
    return propulsor;
  }

  /** Devolve `ids`. Dependências diretas: `Error`, `Set`, `this.obterPropulsor`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-2665b2da0cf0481c */
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

  /** Devolve `propulsor.solicitarVetorizacao(valorRad) ? valorRad : undefined`. Dependências diretas: `this.propulsoresVetorizados.get`, `propulsor?.obterEstadoDaVetorizacao`, `propulsor.solicitarVetorizacao`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-c1075ebae0ca7291 */
  private solicitarGimbalLimitado(idPropulsor: string, comandoRad: number): number | undefined {
    const propulsor = this.propulsoresVetorizados.get(idPropulsor);
    const limiteRad = propulsor?.obterEstadoDaVetorizacao?.().limiteAngularRad;
    if (!propulsor?.solicitarVetorizacao || limiteRad === undefined) return;
    const valorRad = Math.max(-limiteRad, Math.min(limiteRad, comandoRad));
    return propulsor.solicitarVetorizacao(valorRad) ? valorRad : undefined;
  }

  /** Escritas diretas: `this.solicitacoesAplicadas`, `this.estavaAlimentado`. Dependências diretas: `[...this.propulsores.values()].some`, `this.propulsores.values`, `this.gerenciador.reiniciarControladores`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-2a19b873c05a47a3 */
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
