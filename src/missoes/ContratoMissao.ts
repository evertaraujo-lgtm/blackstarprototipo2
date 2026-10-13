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
  iniciar(): void;
  pausar(): void;
  receberComando(comando: C): ResultadoComandoMissao;
  /** Um passo fixo; devolve false enquanto preparada/pausada. */
  avancarPasso(): boolean;
  observar(): O;
  obterEventos(): readonly EventoMissao[];
}
export interface DefinicaoMissao<Configuracao, C, O> {
  readonly id: string;
  readonly revisao: string;
  criar(configuracao?: Configuracao): InstanciaMissao<C, O>;
}
