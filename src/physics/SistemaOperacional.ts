export enum EstadoOperacional { Desligado = 'desligado', Operacional = 'operacional', Falha = 'falha' }

/** Sistema interno mínimo e determinístico usado por equipamentos operacionais. */
export class SistemaOperacional {
  public constructor(public readonly id: string, private estadoAtual: EstadoOperacional = EstadoOperacional.Operacional) {}
  public get estado(): EstadoOperacional { return this.estadoAtual; }
  public get operacional(): boolean { return this.estadoAtual === EstadoOperacional.Operacional; }
  public definirEstado(estado: EstadoOperacional): void { this.estadoAtual = estado; }
}

export class GerenciadorDeSistemas {
  public constructor(private readonly sistemas: readonly SistemaOperacional[]) {}
  public operacaoAutorizada(): boolean { return this.sistemas.every((sistema) => sistema.operacional); }
  public motivosDeBloqueio(): readonly string[] { return this.sistemas.filter((sistema) => !sistema.operacional).map((sistema) => sistema.id); }
}
