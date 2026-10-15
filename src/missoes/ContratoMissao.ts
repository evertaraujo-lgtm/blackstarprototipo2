/** Portas de domínio: não expõem mundo, objetos mutáveis, DOM ou relógio real. */
export type EstadoExecucaoMissao = 'preparada' | 'executando' | 'pausada';
export interface ResultadoComandoMissao {
  readonly aceito: boolean;
  readonly motivo: string;
}
export interface EventoMissao {
  readonly sequencia: number;
  readonly passo: number;
  readonly tempoS: number;
  readonly categoria: 'fisico' | 'missao' | 'comando';
  readonly tipo: string;
  readonly descricao: string;
}
export interface ObjetivoMissao {
  readonly id: string;
  readonly descricao: string;
  readonly estado: 'pendente' | 'atingido' | 'falhou' | 'nao-qualificado';
}
export interface InstanciaMissao<C, O> {
  readonly id: string;
  readonly passoS: number;
  readonly passosExecutados: number;
  readonly estadoExecucao: EstadoExecucaoMissao;
  /** Habilita avanço da instância preparada/pausada; não ignita motores nem avança tempo por relógio real. @contract f-2f9e0038be674f24 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  iniciar(): void;
  /** Suspende avanço por passos mantendo estado físico e agenda reproduzível. @contract f-5c4e46f178b7b9fd @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  pausar(): void;
  /** Recebe comando de domínio tipado e retorna aceitação/motivo; efeitos passam pelas operações autorizadas, sem escrita cinemática pela interface. @contract f-d4e766ef6daba9d7 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  receberComando(comando: C): ResultadoComandoMissao;
  /** Executa exatamente um passo fixo quando em execução e informa se avançou; preparada/pausada retorna false. Física permanece autoridade do mundo. @contract f-c4e871af53a1b68a @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  avancarPasso(): boolean;
  /** Entrega observação para consumidores sem expor objetos físicos mutáveis; implementações de missão usam snapshots copiados/congelados. @contract f-f9f322a0c7e881ec @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  observar(): O;
  /** Consulta eventos sequenciados e datados no tempo simulado; eventos descrevem medidas/comandos e não determinam trajetória. @contract f-0a5cd2525c97341a @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  obterEventos(): readonly EventoMissao[];
}
export interface DefinicaoMissao<Configuracao, C, O> {
  readonly id: string;
  readonly revisao: string;
  /** Constrói nova instância independente a partir da configuração opcional, com mundo/veículo próprios; não inicia loop de navegador. @contract f-d515b6136cdb5afb @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  criar(configuracao?: Configuracao): InstanciaMissao<C, O>;
}
