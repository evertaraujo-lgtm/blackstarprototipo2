import type { LeiturasVeiculoComposto } from '../../sensores/SensoresVeiculoComposto';
import { ControladorInclinacaoPid } from '../../sistemas de controle/ControladorInclinacaoPid';
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
  private propulsorVetorizado?: IPropulsorControlavelPeloComputador;

  public constructor(private readonly telemetriaDoCasco: FonteTelemetriaDoCasco) {
    super(2, 0.05, 0.2, Math.PI / 12);
  }

  public obterLeiturasDoCasco(): LeiturasVeiculoComposto {
    return this.telemetriaDoCasco.obterLeituras();
  }

  public instalarPropulsor(propulsor: IPropulsorControlavelPeloComputador): void {
    if (this.propulsores.has(propulsor.id)) throw new Error(`Propulsor já instalado no computador: ${propulsor.id}.`);
    this.propulsores.set(propulsor.id, propulsor);
    if (propulsor.solicitarVetorizacao && propulsor.obterEstadoDaVetorizacao) this.propulsorVetorizado = propulsor;
  }

  /** Executa uma amostra do controle PID antes da preparação dos propulsores. */
  public atualizarControleDeInclinacao(dtS: number): void {
    if (!this.estaHabilitado || !this.propulsorVetorizado) return;
    // O motor fica abaixo do centro de massa: para uma inclinação positiva,
    // o gimbal positivo gera a força lateral restauradora no eixo planar.
    const erroRad = this.telemetriaDoCasco.obterLeituras().inclinacaoRad;
    this.propulsorVetorizado.solicitarVetorizacao?.(this.calcularComando(erroRad, dtS));
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
    return [...this.propulsores.values()].map((propulsor) => {
      const sequencia: readonly IdSistemaControlado[] = ['elétrico', 'hidráulico', 'combustível', 'controle'];
      const sistemasAceitos = sequencia.every((sistema) => propulsor.ligarSistema(sistema));
      const aceito = sistemasAceitos && propulsor.solicitarIgnicao();
      return { idPropulsor: propulsor.id, aceito, diagnostico: propulsor.diagnosticoOperacional };
    });
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
}
