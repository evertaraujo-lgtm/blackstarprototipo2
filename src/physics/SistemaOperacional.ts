export enum EstadoOperacional { Desligado = 'desligado', Operacional = 'operacional', Falha = 'falha' }

/** Sistema interno mínimo e determinístico usado por equipamentos operacionais. */
export class SistemaOperacional {
  /** Hook vazio nesta implementação; não produz operação. REVISÃO NECESSÁRIA do contrato de especialização. @contract f-d90f25d253e2ab58 */
  public constructor(public readonly id: string, private estadoAtual: EstadoOperacional = EstadoOperacional.Operacional) {}
  /** Devolve `this.estadoAtual`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-d152f98b7357b61a */
  public get estado(): EstadoOperacional { return this.estadoAtual; }
  /** Devolve `this.estadoAtual === EstadoOperacional.Operacional`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-a4e85c28653a4a69 */
  public get operacional(): boolean { return this.estadoAtual === EstadoOperacional.Operacional; }
  /** Escritas diretas: `this.estadoAtual`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-9fc41f9d8cbdea5c */
  public definirEstado(estado: EstadoOperacional): void { this.estadoAtual = estado; }
}

export class GerenciadorDeSistemas {
  /** Hook vazio nesta implementação; não produz operação. REVISÃO NECESSÁRIA do contrato de especialização. @contract f-cb8fd1f157f73637 */
  public constructor(private readonly sistemas: readonly SistemaOperacional[]) {}
  /** Devolve `this.sistemas.every((sistema) => sistema.operacional)`. Dependências diretas: `this.sistemas.every`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-aa81c7f0290e58fd */
  public operacaoAutorizada(): boolean { return this.sistemas.every((sistema) => sistema.operacional); }
  /** Devolve `this.sistemas.filter((sistema) => !sistema.operacional).map((sistema) => sistema.id)`. Dependências diretas: `this.sistemas.filter((sistema) => !sistema.operacional).map`, `this.sistemas.filter`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-c14720fc77a7e63a */
  public motivosDeBloqueio(): readonly string[] { return this.sistemas.filter((sistema) => !sistema.operacional).map((sistema) => sistema.id); }
}
