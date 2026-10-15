export enum EstadoOperacional { Desligado = 'desligado', Operacional = 'operacional', Falha = 'falha' }

/** Sistema interno mínimo e determinístico usado por equipamentos operacionais. */
export class SistemaOperacional {
  /** Armazena ID e estado operacional recebido; padrão histórico é Operacional. O construtor não avalia permissivos ou dependências. @contract f-d90f25d253e2ab58 @reviewed M12-DOC: implementação lida. */
  public constructor(public readonly id: string, private estadoAtual: EstadoOperacional = EstadoOperacional.Operacional) {}
  /** Consulta estado interno tipado do sistema, sem executar transição. @contract f-d152f98b7357b61a @reviewed M12-DOC: implementação lida. */
  public get estado(): EstadoOperacional { return this.estadoAtual; }
  /** Devolve true somente para EstadoOperacional.Operacional. @contract f-a4e85c28653a4a69 @reviewed M12-DOC: implementação lida. */
  public get operacional(): boolean { return this.estadoAtual === EstadoOperacional.Operacional; }
  /** Substitui estado interno pelo valor tipado recebido, sem validar permissivos; a coordenação e propagação pertencem ao agregador. @contract f-9fc41f9d8cbdea5c @reviewed M12-DOC: implementação lida. */
  public definirEstado(estado: EstadoOperacional): void { this.estadoAtual = estado; }
}

export class GerenciadorDeSistemas {
  /** Recebe referência à lista readonly de sistemas do mesmo agregado; não copia estados nem inicia transições. @contract f-cb8fd1f157f73637 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly sistemas: readonly SistemaOperacional[]) {}
  /** Exige que todos os sistemas listados estejam operacionais; lista vazia retorna true pela semântica de every. @contract f-aa81c7f0290e58fd @reviewed M12-DOC: implementação lida. */
  public operacaoAutorizada(): boolean { return this.sistemas.every((sistema) => sistema.operacional); }
  /** Lista IDs dos sistemas atualmente não operacionais, sem alterar seus estados. @contract f-c14720fc77a7e63a @reviewed M12-DOC: implementação lida. */
  public motivosDeBloqueio(): readonly string[] { return this.sistemas.filter((sistema) => !sistema.operacional).map((sistema) => sistema.id); }
}
