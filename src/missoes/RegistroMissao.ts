import type { EventoMissao, InstanciaMissao, ResultadoComandoMissao } from './ContratoMissao';
import { copiarSnapshot } from './SnapshotMissao';

export type EntradaMissao<C> = { readonly passo: number; readonly sequencia: number } & (
  | { readonly tipo: 'iniciar' }
  | { readonly tipo: 'pausar' }
  | { readonly tipo: 'comando'; readonly comando: C; readonly resultado: ResultadoComandoMissao });
export interface DiarioMissao<C, O> {
  readonly formato: 'blackstar-missao-1';
  readonly identificacao: object;
  readonly passoS: number;
  readonly intervaloAmostraPassos: number;
  readonly passosExecutados: number;
  readonly inicial: O;
  readonly final: O;
  readonly entradas: readonly EntradaMissao<C>[];
  readonly eventos: readonly EventoMissao[];
  readonly amostras: readonly { readonly passo: number; readonly observacao: O }[];
}
/** Decorador de domínio: registro portátil em memória; exportação não acessa disco/rede. */
export class RegistroMissao<C, O> implements InstanciaMissao<C, O> {
  private readonly entradas: EntradaMissao<C>[] = [];
  private readonly amostras: { passo: number; observacao: O }[] = [];
  private readonly inicial: O;
  private readonly identificacao: object;
  /** Decora instância de missão com registro em memória, identificador copiado/congelado e primeira observação no passo zero; exige intervalo de amostragem inteiro positivo. @contract f-4554d825e0078446 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly instancia: InstanciaMissao<C, O>, identificacao: object,
    private readonly validarComando: /** Validador injetado converte entrada desconhecida em comando tipado somente se formato aceito; não executa comando nem altera missão. @contract f-020f0a9a496837f4 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ (c: unknown) => c is C, private readonly intervaloAmostraPassos = 240) {
    if (!Number.isSafeInteger(intervaloAmostraPassos) || intervaloAmostraPassos <= 0) throw new Error('Intervalo de amostra inválido.');
    this.identificacao = copiarSnapshot(identificacao); this.inicial = copiarSnapshot(instancia.observar());
    this.amostras.push({ passo: 0, observacao: this.inicial });
  }
  /** Consulta identificação da instância decorada. @contract f-b5aa733ba9f107f5 @reviewed M12-DOC: implementação lida. */
  public get id() { return this.instancia.id; }
  /** Consulta duração física fixa em s da instância decorada. @contract f-2de73f4cac519707 @reviewed M12-DOC: implementação lida. */
  public get passoS() { return this.instancia.passoS; }
  /** Consulta índice de passos físicos da missão real, sem contador paralelo. @contract f-5a9342f7d17e6061 @reviewed M12-DOC: implementação lida. */
  public get passosExecutados() { return this.instancia.passosExecutados; }
  /** Consulta preparada/executando/pausada na missão decorada. @contract f-2210020a7e80bfa5 @reviewed M12-DOC: implementação lida. */
  public get estadoExecucao() { return this.instancia.estadoExecucao; }
  /** Registra entrada iniciar com sequência/passo atuais e delega início operacional; não avança física por si. @contract f-531fe0884bbcab20 @reviewed M12-DOC: implementação lida. */
  public iniciar(): void {
    this.entradas.push({ tipo: 'iniciar', passo: this.passosExecutados, sequencia: this.entradas.length }); this.instancia.iniciar();
  }
  /** Registra entrada pausar ordenada e delega pausa, preservando estados físicos. @contract f-bf4414d6c26e1a0d @reviewed M12-DOC: implementação lida. */
  public pausar(): void {
    this.entradas.push({ tipo: 'pausar', passo: this.passosExecutados, sequencia: this.entradas.length }); this.instancia.pausar();
  }
  /** Valida comando serializável, aplica na mesma porta da missão e registra cópias congeladas do comando/resultado no passo corrente; devolve resultado copiado. @contract f-f3c9605f73c05bc9 @reviewed M12-DOC: implementação lida. */
  public receberComando(comando: C): ResultadoComandoMissao {
    if (!this.validarComando(comando)) throw new Error('Comando inválido ou não serializável para o diário.');
    const resultado = this.instancia.receberComando(comando);
    this.entradas.push(copiarSnapshot({ tipo: 'comando', passo: this.passosExecutados, sequencia: this.entradas.length, comando, resultado }));
    return copiarSnapshot(resultado);
  }
  /** Delega um passo físico; somente se executado registra amostra quando índice é múltiplo do intervalo contratado. Retorna false se instância não avança. @contract f-823c2c01169947e0 @reviewed M12-DOC: implementação lida. */
  public avancarPasso(): boolean {
    if (!this.instancia.avancarPasso()) return false;
    if (this.passosExecutados % this.intervaloAmostraPassos === 0) this.amostras.push({ passo: this.passosExecutados, observacao: this.instancia.observar() });
    return true;
  }
  /** Consulta observação da instância decorada sem gerar amostra adicional no diário. @contract f-601da3428577f9c0 @reviewed M12-DOC: implementação lida. */
  public observar(): O { return this.instancia.observar(); }
  /** Consulta eventos produzidos pela missão real, sem duplicar máquina de estados. @contract f-92f199d3da33b9c9 @reviewed M12-DOC: implementação lida. */
  public obterEventos() { return this.instancia.obterEventos(); }
  /** Constrói e copia/congela diário completo com identificação, inicial/final, agenda, eventos e amostras; não grava em disco, rede ou Firestore. @contract f-459c9ad4545d6300 @reviewed M12-DOC: implementação lida. */
  public exportar(): DiarioMissao<C, O> {
    return copiarSnapshot({ formato: 'blackstar-missao-1', identificacao: this.identificacao, passoS: this.passoS,
      intervaloAmostraPassos: this.intervaloAmostraPassos, passosExecutados: this.passosExecutados,
      inicial: this.inicial, final: this.observar(), entradas: this.entradas, eventos: this.obterEventos(), amostras: this.amostras });
  }
}
