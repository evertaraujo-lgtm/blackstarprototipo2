import type { LeiturasVeiculoComposto } from '../../sensores/SensoresVeiculoComposto';
import {
  type ComandoControlePouso,
  type ConfiguracaoControlePouso,
} from '../../sistemas de controle/ControladorPouso';
import { ControladorInclinacaoDePropulsores } from '../../sistemas de controle/ControladorInclinacaoDePropulsores';
import { ControladorPousoDePropulsores } from '../../sistemas de controle/ControladorPousoDePropulsores';
import { ControladorDesaceleracaoDePropulsores } from '../../sistemas de controle/ControladorDesaceleracaoDePropulsores';
import { ControladorGimbalDescidaDePropulsores } from '../../sistemas de controle/ControladorGimbalDescidaDePropulsores';
import type { ConfiguracaoControleDesaceleracao } from '../../sistemas de controle/ControladorDesaceleracao';
import { GerenciadorDeControladores, type ControladorDeVoo } from '../../sistemas de controle/GerenciadorDeControladores';
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
  private readonly controladorInclinacao = new ControladorInclinacaoDePropulsores();
  private readonly controladorPouso = new ControladorPousoDePropulsores();
  private readonly controladorDesaceleracao = new ControladorDesaceleracaoDePropulsores();
  private readonly controladorGimbalDescida = new ControladorGimbalDescidaDePropulsores();

  public constructor(private readonly telemetriaDoCasco: FonteTelemetriaDoCasco) {
    this.gerenciador.registrar(this.controladorInclinacao);
    this.gerenciador.registrar(this.controladorPouso);
    this.gerenciador.registrar(this.controladorDesaceleracao);
    this.gerenciador.registrar(this.controladorGimbalDescida);
  }

  public obterLeiturasDoCasco(): LeiturasVeiculoComposto {
    return this.telemetriaDoCasco.obterLeituras();
  }

  public instalarPropulsor(propulsor: IPropulsorControlavelPeloComputador): void {
    if (this.propulsores.has(propulsor.id)) throw new Error(`Propulsor já instalado no computador: ${propulsor.id}.`);
    this.propulsores.set(propulsor.id, propulsor);
    if (propulsor.solicitarVetorizacao && propulsor.obterEstadoDaVetorizacao) {
      this.propulsoresVetorizados.set(propulsor.id, propulsor);
    }
  }

  public habilitar(): void {
    this.desabilitarControleDePouso();
    this.desabilitarControleDeGimbalDeDescida();
    this.controladorInclinacao.configurarAlvos([...this.propulsoresVetorizados.keys()]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }
  public desabilitar(): void { this.gerenciador.desabilitar(this.controladorInclinacao.id); }

  public habilitarControleDeInclinacao(idsPropulsores: readonly string[] = [...this.propulsoresVetorizados.keys()]): void {
    this.desabilitarControleDePouso();
    this.desabilitarControleDeGimbalDeDescida();
    this.controladorInclinacao.configurarAlvos([...this.validarSelecao(idsPropulsores, true)]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }

  public habilitarControleDePouso(
    configuracao: Partial<ConfiguracaoControlePouso> = {},
    idsPropulsores: readonly string[] = [...this.propulsores.keys()],
  ): void {
    this.gerenciador.desabilitar(this.controladorInclinacao.id);
    this.controladorPouso.configurar(configuracao, [...this.validarSelecao(idsPropulsores, false)]);
    this.gerenciador.habilitar(this.controladorPouso.id);
  }

  /** Ativa pouso sem desativar verticalização ou desaceleração já registradas. */
  public habilitarControleDePousoComposto(
    configuracao: Partial<ConfiguracaoControlePouso> = {}, idsPropulsores: readonly string[] = [...this.propulsores.keys()],
  ): void {
    this.controladorPouso.configurar(configuracao, [...this.validarSelecao(idsPropulsores, false)]);
    this.gerenciador.habilitar(this.controladorPouso.id);
  }

  public habilitarControleDeVerticalizacao(idsPropulsores: readonly string[]): void {
    this.controladorInclinacao.configurarAlvos([...this.validarSelecao(idsPropulsores, true)]);
    this.gerenciador.habilitar(this.controladorInclinacao.id);
  }

  public habilitarControleDeGimbalDeDescida(idsPropulsores: readonly string[]): void {
    this.gerenciador.desabilitar(this.controladorInclinacao.id);
    this.controladorGimbalDescida.configurarAlvos([...this.validarSelecao(idsPropulsores, true)]);
    this.gerenciador.habilitar(this.controladorGimbalDescida.id);
  }

  public habilitarControleDeDesaceleracao(
    configuracao: Partial<ConfiguracaoControleDesaceleracao>, idsPropulsores: readonly string[],
  ): void {
    this.controladorDesaceleracao.configurar(configuracao, [...this.validarSelecao(idsPropulsores, false)]);
    this.gerenciador.habilitar(this.controladorDesaceleracao.id);
  }

  public desabilitarControleDePouso(): void {
    this.gerenciador.desabilitar(this.controladorPouso.id);
  }
  public desabilitarControleDeDesaceleracao(): void { this.gerenciador.desabilitar(this.controladorDesaceleracao.id); }
  public desabilitarControleDeGimbalDeDescida(): void { this.gerenciador.desabilitar(this.controladorGimbalDescida.id); }
  public get controleDeGimbalDeDescidaEstaHabilitado(): boolean { return this.controladorGimbalDescida.estaHabilitado; }

  public get controleDePousoEstaHabilitado(): boolean {
    return this.controladorPouso.estaHabilitado;
  }

  public obterUltimoComandoDePouso(): ComandoControlePouso | undefined {
    return this.controladorPouso.estaHabilitado ? this.controladorPouso.obterUltimoComando() : undefined;
  }

  /** Extensão aberta para controles independentes (RCS, térmico, paraquedas etc.). */
  public registrarControlador(controlador: ControladorDeVoo): void { this.gerenciador.registrar(controlador); }
  public habilitarControlador(id: string): void { this.gerenciador.habilitar(id); }
  public desabilitarControlador(id: string): void { this.gerenciador.desabilitar(id); }
  public get idsControladoresAtivos(): readonly string[] { return this.gerenciador.idsAtivos(); }
  public get estaHabilitado(): boolean { return this.controladorInclinacao.estaHabilitado; }

  /** Executa uma amostra do controle PID antes da preparação dos propulsores. */
  public atualizarControleDeInclinacao(dtS: number): void {
    this.aplicarSolicitacoesDeControladores(dtS);
  }

  /** Aplica throttle e gimbal pelas mesmas portas operacionais do comando manual. */
  public atualizarControleDePouso(dtS: number): void {
    this.aplicarSolicitacoesDeControladores(dtS);
  }

  public atualizarControladores(dtS: number): void {
    this.aplicarSolicitacoesDeControladores(dtS);
  }

  public definirThrottle(idPropulsor: string, throttle: number): void {
    this.obterPropulsor(idPropulsor).definirThrottle(throttle);
  }

  public definirThrottleDeTodos(throttle: number): void {
    for (const propulsor of this.propulsores.values()) propulsor.definirThrottle(throttle);
  }

  /**
   * A automação percorre exatamente a mesma cadeia usada na operação manual:
   * elétrica → hidráulica → combustível → controle → ignição.
   */
  public solicitarIgnicaoDeTodos(): readonly ResultadoComandoPropulsor[] {
    return [...this.propulsores.keys()].map((id) => this.solicitarIgnicao(id));
  }

  public solicitarIgnicao(idPropulsor: string): ResultadoComandoPropulsor {
    const propulsor = this.obterPropulsor(idPropulsor);
    const sequencia: readonly IdSistemaControlado[] = ['elétrico', 'hidráulico', 'combustível', 'controle'];
    const sistemasAceitos = sequencia.every((sistema) => propulsor.ligarSistema(sistema));
    const aceito = sistemasAceitos && propulsor.solicitarIgnicao();
    return { idPropulsor: propulsor.id, aceito, diagnostico: propulsor.diagnosticoOperacional };
  }

  public desligarPropulsor(idPropulsor: string): void {
    this.obterPropulsor(idPropulsor).desligarSistema('elétrico');
  }

  public desligarTodos(): void {
    for (const propulsor of this.propulsores.values()) propulsor.desligarSistema('elétrico');
  }

  public obterDiagnostico(): readonly ResultadoComandoPropulsor[] {
    return [...this.propulsores.values()].map((propulsor) => ({
      idPropulsor: propulsor.id,
      aceito: propulsor.estaIgnitado && propulsor.diagnosticoOperacional.length === 0,
      diagnostico: propulsor.diagnosticoOperacional,
    }));
  }

  private obterPropulsor(idPropulsor: string): IPropulsorControlavelPeloComputador {
    const propulsor = this.propulsores.get(idPropulsor);
    if (!propulsor) throw new Error(`Propulsor não instalado: ${idPropulsor}.`);
    return propulsor;
  }

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

  private solicitarGimbalLimitado(idPropulsor: string, comandoRad: number): void {
    const propulsor = this.propulsoresVetorizados.get(idPropulsor);
    const limiteRad = propulsor?.obterEstadoDaVetorizacao?.().limiteAngularRad;
    if (!propulsor?.solicitarVetorizacao || limiteRad === undefined) return;
    propulsor.solicitarVetorizacao(Math.max(-limiteRad, Math.min(limiteRad, comandoRad)));
  }

  private aplicarSolicitacoesDeControladores(dtS: number): void {
    for (const solicitacao of this.gerenciador.calcularSolicitacoes(this.telemetriaDoCasco.obterLeituras(), dtS)) {
      if (solicitacao.recurso === 'throttle') this.obterPropulsor(solicitacao.idAtuador).definirThrottle(solicitacao.valor);
      else this.solicitarGimbalLimitado(solicitacao.idAtuador, solicitacao.valor);
    }
  }
}
