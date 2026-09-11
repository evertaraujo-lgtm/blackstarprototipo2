import type { DefinicaoVeiculoComposto } from './VeiculoComposto';
import { VeiculoComposto } from './VeiculoComposto';
import type { ConfiguracaoControlePouso } from '../../sistemas de controle/ControladorPouso';
import type { ResultadoComandoPropulsor } from './ComputadorDeVoo';

export interface DefinicaoBss03 extends DefinicaoVeiculoComposto {
  readonly idsPropulsoresDecolagem: readonly string[];
  readonly idsPropulsoresPouso: readonly string[];
  readonly controlePouso: Partial<ConfiguracaoControlePouso>;
}

export type ControleAtivoBss03 = 'manual' | 'inclinacao' | 'pouso';

/** Nave BSS-03: os dois controles existem, mas toda troca é comandada pelo operador. */
export class Bss03 extends VeiculoComposto {
  private readonly idsPropulsoresDecolagem: readonly string[];
  private readonly idsPropulsoresPouso: readonly string[];
  private readonly configuracaoControlePouso: Partial<ConfiguracaoControlePouso>;
  private controleAtivo: ControleAtivoBss03 = 'manual';

  public constructor(definicao: DefinicaoBss03) {
    super(definicao);
    if (definicao.idsPropulsoresDecolagem.length === 0 || definicao.idsPropulsoresPouso.length === 0) {
      throw new Error('BSS-03 exige propulsores de decolagem e de pouso.');
    }
    this.idsPropulsoresDecolagem = [...definicao.idsPropulsoresDecolagem];
    this.idsPropulsoresPouso = [...definicao.idsPropulsoresPouso];
    this.configuracaoControlePouso = { ...definicao.controlePouso };
  }

  public ativarControleDeInclinacao(): void {
    this.habilitarControleDeInclinacaoNosPropulsores(this.idsPropulsoresDecolagem);
    this.controleAtivo = 'inclinacao';
  }

  public ativarControleDePouso(): void {
    this.habilitarControleDePouso(this.configuracaoControlePouso, this.idsPropulsoresPouso);
    this.controleAtivo = 'pouso';
  }

  /**
   * Comando único e explícito do operador para assumir o pouso. Não é uma
   * sequência automática: não depende de altitude, tempo ou fase de voo.
   * A transferência só corta a decolagem depois que cada motor de pouso passa
   * pelos permissivos e confirma a própria ignição.
   */
  public acionarModoDePouso(): readonly ResultadoComandoPropulsor[] {
    for (const id of this.idsPropulsoresPouso) this.definirThrottleDoPropulsor(id, 0);
    const resultados = this.idsPropulsoresPouso.map((id) => this.solicitarIgnicaoDoPropulsor(id));
    if (!resultados.every((resultado) => resultado.aceito)) return resultados;

    for (const id of this.idsPropulsoresDecolagem) this.definirThrottleDoPropulsor(id, 0);
    this.ativarControleDePouso();
    return resultados;
  }

  /** Comando explícito para abandonar o pouso; corta o grupo de pouso antes do PID. */
  public retornarAoControleDeInclinacao(): void {
    for (const id of this.idsPropulsoresPouso) this.definirThrottleDoPropulsor(id, 0);
    this.ativarControleDeInclinacao();
  }

  public desativarControlesAutomaticos(): void {
    this.desabilitarControleDeInclinacao();
    this.desabilitarControleDePouso();
    this.controleAtivo = 'manual';
  }

  public get controleAtivoBss03(): ControleAtivoBss03 { return this.controleAtivo; }
}
