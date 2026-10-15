import type { DefinicaoVeiculoComposto } from './VeiculoComposto';
import { VeiculoComposto } from './VeiculoComposto';
import type { ConfiguracaoControlePouso } from '../../sistemas de controle/ControladorPouso';
import type { ConfiguracaoControleDesaceleracao } from '../../sistemas de controle/ControladorDesaceleracao';
import type { ResultadoComandoPropulsor } from './ComputadorDeVoo';

export interface DefinicaoBss03 extends DefinicaoVeiculoComposto {
  readonly idsPropulsoresDecolagem: readonly string[];
  readonly idsPropulsoresPouso: readonly string[];
  readonly controlePouso: Partial<ConfiguracaoControlePouso>;
  readonly controleDesaceleracao: Partial<ConfiguracaoControleDesaceleracao>;
}

export type ControleAtivoBss03 = 'manual' | 'inclinacao' | 'pouso';

/** Nave BSS-03: os dois controles existem, mas toda troca é comandada pelo operador. */
export class Bss03 extends VeiculoComposto {
  private readonly idsPropulsoresDecolagem: readonly string[];
  private readonly idsPropulsoresPouso: readonly string[];
  private readonly configuracaoControlePouso: Partial<ConfiguracaoControlePouso>;
  private readonly configuracaoControleDesaceleracao: Partial<ConfiguracaoControleDesaceleracao>;
  private controleAtivo: ControleAtivoBss03 = 'manual';

  /** Escritas diretas: `this.idsPropulsoresDecolagem`, `this.idsPropulsoresPouso`, `this.configuracaoControlePouso`, `this.configuracaoControleDesaceleracao`. Dependências diretas: `super`, `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-860287d56592b29a */
  public constructor(definicao: DefinicaoBss03) {
    super(definicao);
    if (definicao.idsPropulsoresDecolagem.length === 0 || definicao.idsPropulsoresPouso.length === 0) {
      throw new Error('BSS-03 exige propulsores de decolagem e de pouso.');
    }
    this.idsPropulsoresDecolagem = [...definicao.idsPropulsoresDecolagem];
    this.idsPropulsoresPouso = [...definicao.idsPropulsoresPouso];
    this.configuracaoControlePouso = { ...definicao.controlePouso };
    this.configuracaoControleDesaceleracao = { ...definicao.controleDesaceleracao };
  }

  /** Escritas diretas: `this.controleAtivo`. Dependências diretas: `this.desabilitarControleDeDesaceleracao`, `this.desabilitarControleDeGimbalDeDescida`, `this.habilitarControleDeInclinacaoNosPropulsores`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-925836e5b858f517 */
  public ativarControleDeInclinacao(): void {
    this.desabilitarControleDeDesaceleracao();
    this.desabilitarControleDeGimbalDeDescida();
    this.habilitarControleDeInclinacaoNosPropulsores(this.idsPropulsoresDecolagem);
    this.controleAtivo = 'inclinacao';
  }

  /** Escritas diretas: `this.controleAtivo`. Dependências diretas: `this.habilitarControleDeGimbalDeDescida`, `this.habilitarControleDeDesaceleracao`, `this.habilitarControleDePousoComposto`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-bc37af32bf373cd0 */
  public ativarControleDePouso(): void {
    this.habilitarControleDeGimbalDeDescida(this.idsPropulsoresPouso, 0.002);
    this.habilitarControleDeDesaceleracao(this.configuracaoControleDesaceleracao, this.idsPropulsoresPouso);
    this.habilitarControleDePousoComposto(this.configuracaoControlePouso, this.idsPropulsoresPouso);
    this.controleAtivo = 'pouso';
  }

  /**
   * Comando único e explícito do operador para assumir o pouso. Não é uma
   * sequência automática: não depende de altitude, tempo ou fase de voo.
   * A transferência só corta a decolagem depois que cada motor de pouso passa
   * pelos permissivos e confirma a própria ignição.
   * @contract f-4397fd1c3b08116e
   */
  public acionarModoDePouso(): readonly ResultadoComandoPropulsor[] {
    for (const id of this.idsPropulsoresPouso) this.definirThrottleDoPropulsor(id, 0);
    const resultados = this.idsPropulsoresPouso.map((id) => this.solicitarIgnicaoDoPropulsor(id));
    if (!resultados.every((resultado) => resultado.aceito)) return resultados;

    for (const id of this.idsPropulsoresDecolagem) this.definirThrottleDoPropulsor(id, 0);
    this.ativarControleDePouso();
    return resultados;
  }

  /** Comando explícito para abandonar o pouso; corta o grupo de pouso antes do PID.
   * @contract f-27409d470d21b142
   */
  public retornarAoControleDeInclinacao(): void {
    for (const id of this.idsPropulsoresPouso) this.definirThrottleDoPropulsor(id, 0);
    this.ativarControleDeInclinacao();
  }

  /** Escritas diretas: `this.controleAtivo`. Dependências diretas: `this.desabilitarControleDeInclinacao`, `this.desabilitarControleDePouso`, `this.desabilitarControleDeDesaceleracao`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-a517d11ce6820182 */
  public desativarControlesAutomaticos(): void {
    this.desabilitarControleDeInclinacao();
    this.desabilitarControleDePouso();
    this.desabilitarControleDeDesaceleracao();
    this.desabilitarControleDeGimbalDeDescida();
    this.controleAtivo = 'manual';
  }

  /** Devolve `this.controleAtivo`. Efeitos indiretos seguem as dependências chamadas. @contract f-724031d58d4521b0 */
  public get controleAtivoBss03(): ControleAtivoBss03 { return this.controleAtivo; }
}
