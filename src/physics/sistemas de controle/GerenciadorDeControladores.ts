import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';

/** Saída normalizada: controladores solicitam; o computador aplica ao atuador. */
export type RecursoDeAtuador = 'throttle' | 'gimbal';

export interface SolicitacaoDeAtuador {
  readonly idAtuador: string;
  readonly recurso: RecursoDeAtuador;
  readonly valor: number;
}

/** Contrato de extensão para qualquer controlador de voo futuro. */
export interface ControladorDeVoo {
  readonly id: string;
  /** Em disputa sobre o mesmo atuador e recurso, o maior valor vence. */
  readonly prioridade: number;
  readonly estaHabilitado: boolean;
  habilitar(): void;
  desabilitar(): void;
  calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[];
}

/**
 * Registro e arbitragem determinística de controladores compostos. Vários
 * controladores podem permanecer ativos; somente comandos para o mesmo par
 * atuador/recurso entram em disputa. Empates são resolvidos pelo id para que
 * o resultado não dependa da ordem de execução.
 */
export class GerenciadorDeControladores {
  private readonly controladores = new Map<string, ControladorDeVoo>();

  public registrar(controlador: ControladorDeVoo): void {
    if (this.controladores.has(controlador.id)) throw new Error(`Controlador já registrado: ${controlador.id}.`);
    this.controladores.set(controlador.id, controlador);
  }

  public obter(id: string): ControladorDeVoo {
    const controlador = this.controladores.get(id);
    if (!controlador) throw new Error(`Controlador não registrado: ${id}.`);
    return controlador;
  }

  public habilitar(id: string): void { this.obter(id).habilitar(); }
  public desabilitar(id: string): void { this.obter(id).desabilitar(); }
  public idsAtivos(): readonly string[] {
    return [...this.controladores.values()].filter((controlador) => controlador.estaHabilitado).map((controlador) => controlador.id);
  }

  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    const vencedores = new Map<string, { controlador: ControladorDeVoo; solicitacao: SolicitacaoDeAtuador }>();
    for (const controlador of this.controladores.values()) {
      if (!controlador.estaHabilitado) continue;
      for (const solicitacao of controlador.calcularSolicitacoes(leituras, dtS)) {
        const chave = `${solicitacao.idAtuador}:${solicitacao.recurso}`;
        const atual = vencedores.get(chave);
        if (!atual || controlador.prioridade > atual.controlador.prioridade ||
          (controlador.prioridade === atual.controlador.prioridade && controlador.id.localeCompare(atual.controlador.id) < 0)) {
          vencedores.set(chave, { controlador, solicitacao });
        }
      }
    }
    return [...vencedores.values()].map(({ solicitacao }) => solicitacao);
  }
}
