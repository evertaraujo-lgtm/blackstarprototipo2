import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';

/** Saída normalizada: controladores solicitam; o computador aplica ao atuador. */
export type RecursoDeAtuador = 'throttle' | 'gimbal';

export interface SolicitacaoDeAtuador {
  readonly idAtuador: string;
  readonly recurso: RecursoDeAtuador;
  readonly valor: number;
}

export interface SolicitacaoArbitrada extends SolicitacaoDeAtuador {
  readonly idControlador: string;
}

/** Contrato de extensão para qualquer controlador de voo futuro. */
export interface ControladorDeVoo {
  readonly id: string;
  /** Em disputa sobre o mesmo atuador e recurso, o maior valor vence. */
  readonly prioridade: number;
  readonly estaHabilitado: boolean;
  /** Seleciona controlador para cálculo e reinicialização definida pela implementação; não ignita atuadores. @contract f-c239c04410fd7830 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  habilitar(): void;
  /** Retira seleção operacional e limpa memória conforme controlador, sem impor repouso físico. @contract f-bb47ae1580754693 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  desabilitar(): void;
  /** Reinicia memória após perda de alimentação/leitura preservando seleção habilitada quando previsto. @contract f-56eaf7435c607a26 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  reiniciarMemoria?(): void;
  /** Usa leituras SI locais e dt em s para produzir pedidos de atuadores; pode atualizar memória do controle, nunca estado cinemático. Gerenciador arbitra prioridades antes da aplicação. @contract f-41b09b3ce8972a5e @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
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
  private ultimaArbitragem: readonly SolicitacaoArbitrada[] = [];

  /** Devolve cópias das solicitações vencedoras, sem expor a lista interna. @contract f-35d6a921e9ab5ffa @reviewed M12-DOC: implementação lida. */
  public obterUltimaArbitragem(): readonly SolicitacaoArbitrada[] {
    return this.ultimaArbitragem.map((solicitacao) => ({ ...solicitacao }));
  }

  /** Perda de alimentação limpa memória dos controles, conservando a seleção do operador.
   * @contract f-895d1fe7d9e5a408
   */
  public reiniciarControladores(): void {
    for (const controlador of this.controladores.values()) {
      if (!controlador.estaHabilitado) continue;
      controlador.desabilitar();
      controlador.habilitar();
    }
    this.ultimaArbitragem = [];
  }

  /** Registra controlador composto por ID único; lança erro para duplicata, sem implementar nova lei de controle. @contract f-f0fd492c3563472d @reviewed M12-DOC: implementação lida. */
  public registrar(controlador: ControladorDeVoo): void {
    if (this.controladores.has(controlador.id)) throw new Error(`Controlador já registrado: ${controlador.id}.`);
    this.controladores.set(controlador.id, controlador);
  }

  /** Consulta controlador por ID e lança erro para ausente. @contract f-e56d139b2aad1cc9 @reviewed M12-DOC: implementação lida. */
  public obter(id: string): ControladorDeVoo {
    const controlador = this.controladores.get(id);
    if (!controlador) throw new Error(`Controlador não registrado: ${id}.`);
    return controlador;
  }

  /** Delega habilitação à porta do controlador registrado. @contract f-6df8627a53a52ed3 @reviewed M12-DOC: implementação lida. */
  public habilitar(id: string): void { this.obter(id).habilitar(); }
  /** Delega desabilitação à porta do controlador registrado. @contract f-516986ceb691ca9e @reviewed M12-DOC: implementação lida. */
  public desabilitar(id: string): void { this.obter(id).desabilitar(); }
  /** Lista IDs dos controladores efetivamente habilitados. @contract f-5aa76e0a954284cb @reviewed M12-DOC: implementação lida. */
  public idsAtivos(): readonly string[] {
    return [...this.controladores.values()].filter((controlador) => controlador.estaHabilitado).map((controlador) => controlador.id);
  }

  /** Calcula saídas de controles habilitados e arbitra cada par atuador/recurso por maior prioridade; empate usa ID lexical. Registra vencedores e limpa memória de habilitados sem nenhuma vitória; não comanda cinemática. @contract f-4be67e00ce7effb0 @reviewed M12-DOC: implementação lida. */
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
    this.ultimaArbitragem = [...vencedores.values()].map(({ controlador, solicitacao }) =>
      ({ ...solicitacao, idControlador: controlador.id }));
    const idsVencedores = new Set(this.ultimaArbitragem.map((s) => s.idControlador));
    for (const controlador of this.controladores.values()) {
      if (controlador.estaHabilitado && !idsVencedores.has(controlador.id)) controlador.reiniciarMemoria?.();
    }
    return [...vencedores.values()].map(({ solicitacao }) => solicitacao);
  }
}
