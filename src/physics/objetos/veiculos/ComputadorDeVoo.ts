import type { LeiturasVeiculoComposto } from '../../sensores/SensoresVeiculoComposto';
import { ControladorInclinacaoPid } from '../../sistemas de controle/ControladorInclinacaoPid';
import {
  ControladorPouso,
  type ComandoControlePouso,
  type ConfiguracaoControlePouso,
} from '../../sistemas de controle/ControladorPouso';
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
export class ComputadorDeVoo extends ControladorInclinacaoPid {
  private readonly propulsores = new Map<string, IPropulsorControlavelPeloComputador>();
  private readonly propulsoresVetorizados = new Map<string, IPropulsorControlavelPeloComputador>();
  private idsPropulsoresDoControleDeInclinacao = new Set<string>();
  private idsPropulsoresDoControleDePouso = new Set<string>();
  private controladorPouso?: ControladorPouso;

  public constructor(private readonly telemetriaDoCasco: FonteTelemetriaDoCasco) {
    super(2, 0.05, 0.2, Math.PI / 12);
  }

  public obterLeiturasDoCasco(): LeiturasVeiculoComposto {
    return this.telemetriaDoCasco.obterLeituras();
  }

  public instalarPropulsor(propulsor: IPropulsorControlavelPeloComputador): void {
    if (this.propulsores.has(propulsor.id)) throw new Error(`Propulsor já instalado no computador: ${propulsor.id}.`);
    this.propulsores.set(propulsor.id, propulsor);
    if (propulsor.solicitarVetorizacao && propulsor.obterEstadoDaVetorizacao) {
      this.propulsoresVetorizados.set(propulsor.id, propulsor);
      this.idsPropulsoresDoControleDeInclinacao.add(propulsor.id);
    }
  }

  public override habilitar(): void {
    this.desabilitarControleDePouso();
    this.idsPropulsoresDoControleDeInclinacao = new Set(this.propulsoresVetorizados.keys());
    super.habilitar();
  }

  public habilitarControleDeInclinacao(idsPropulsores: readonly string[] = [...this.propulsoresVetorizados.keys()]): void {
    this.desabilitarControleDePouso();
    this.idsPropulsoresDoControleDeInclinacao = this.validarSelecao(idsPropulsores, true);
    super.habilitar();
  }

  public habilitarControleDePouso(
    configuracao: Partial<ConfiguracaoControlePouso> = {},
    idsPropulsores: readonly string[] = [...this.propulsores.keys()],
  ): void {
    super.desabilitar();
    this.idsPropulsoresDoControleDePouso = this.validarSelecao(idsPropulsores, false);
    this.controladorPouso = new ControladorPouso(configuracao);
    this.controladorPouso.habilitar();
  }

  public desabilitarControleDePouso(): void {
    this.controladorPouso?.desabilitar();
    this.controladorPouso = undefined;
  }

  public get controleDePousoEstaHabilitado(): boolean {
    return this.controladorPouso?.estaHabilitado === true;
  }

  public obterUltimoComandoDePouso(): ComandoControlePouso | undefined {
    return this.controladorPouso?.obterUltimoComando();
  }

  /** Executa uma amostra do controle PID antes da preparação dos propulsores. */
  public atualizarControleDeInclinacao(dtS: number): void {
    if (this.controleDePousoEstaHabilitado || !this.estaHabilitado) return;
    // O motor fica abaixo do centro de massa: para uma inclinação positiva,
    // o gimbal positivo gera a força lateral restauradora no eixo planar.
    const erroRad = this.telemetriaDoCasco.obterLeituras().inclinacaoRad;
    const comandoRad = this.calcularComando(erroRad, dtS);
    for (const id of this.idsPropulsoresDoControleDeInclinacao) {
      this.solicitarGimbalLimitado(id, comandoRad);
    }
  }

  /** Aplica throttle e gimbal pelas mesmas portas operacionais do comando manual. */
  public atualizarControleDePouso(dtS: number): void {
    if (!this.controladorPouso?.estaHabilitado) return;
    const comando = this.controladorPouso.calcularComando(this.telemetriaDoCasco.obterLeituras(), dtS);
    for (const id of this.idsPropulsoresDoControleDePouso) {
      const propulsor = this.obterPropulsor(id);
      propulsor.definirThrottle(comando.throttle);
      this.solicitarGimbalLimitado(id, comando.anguloGimbalRad);
    }
  }

  public atualizarControladores(dtS: number): void {
    if (this.controleDePousoEstaHabilitado) this.atualizarControleDePouso(dtS);
    else this.atualizarControleDeInclinacao(dtS);
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
}
