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
  public constructor(private readonly instancia: InstanciaMissao<C, O>, identificacao: object,
    private readonly validarComando: (c: unknown) => c is C, private readonly intervaloAmostraPassos = 240) {
    if (!Number.isSafeInteger(intervaloAmostraPassos) || intervaloAmostraPassos <= 0) throw new Error('Intervalo de amostra inválido.');
    this.identificacao = copiarSnapshot(identificacao); this.inicial = copiarSnapshot(instancia.observar());
    this.amostras.push({ passo: 0, observacao: this.inicial });
  }
  public get id() { return this.instancia.id; }
  public get passoS() { return this.instancia.passoS; }
  public get passosExecutados() { return this.instancia.passosExecutados; }
  public get estadoExecucao() { return this.instancia.estadoExecucao; }
  public iniciar(): void {
    this.entradas.push({ tipo: 'iniciar', passo: this.passosExecutados, sequencia: this.entradas.length }); this.instancia.iniciar();
  }
  public pausar(): void {
    this.entradas.push({ tipo: 'pausar', passo: this.passosExecutados, sequencia: this.entradas.length }); this.instancia.pausar();
  }
  public receberComando(comando: C): ResultadoComandoMissao {
    if (!this.validarComando(comando)) throw new Error('Comando inválido ou não serializável para o diário.');
    const resultado = this.instancia.receberComando(comando);
    this.entradas.push(copiarSnapshot({ tipo: 'comando', passo: this.passosExecutados, sequencia: this.entradas.length, comando, resultado }));
    return copiarSnapshot(resultado);
  }
  public avancarPasso(): boolean {
    if (!this.instancia.avancarPasso()) return false;
    if (this.passosExecutados % this.intervaloAmostraPassos === 0) this.amostras.push({ passo: this.passosExecutados, observacao: this.instancia.observar() });
    return true;
  }
  public observar(): O { return this.instancia.observar(); }
  public obterEventos() { return this.instancia.obterEventos(); }
  public exportar(): DiarioMissao<C, O> {
    return copiarSnapshot({ formato: 'blackstar-missao-1', identificacao: this.identificacao, passoS: this.passoS,
      intervaloAmostraPassos: this.intervaloAmostraPassos, passosExecutados: this.passosExecutados,
      inicial: this.inicial, final: this.observar(), entradas: this.entradas, eventos: this.obterEventos(), amostras: this.amostras });
  }
}
