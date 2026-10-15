import type { ComandoVetorizacao, DefinicaoSistemaVetorizacao, EstadoVetorizacao, IAtuadorVetorizacao } from './InterfacesVetorizacao';

/** Atuador planar determinístico; futuros modelos podem especializar esta interface. */
export class AtuadorVetorizacao implements IAtuadorVetorizacao {
  private anguloAlvoRad = 0;
  private anguloAtualRad = 0;
  private habilitado = false;
  private falho = false;

  /** Escritas diretas: `this.definicao`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-d5fed7dda85b3573 */
  public constructor(private readonly definicao: DefinicaoSistemaVetorizacao) {
    if (!Number.isFinite(definicao.limiteAngularRad) || definicao.limiteAngularRad <= 0 ||
      !Number.isFinite(definicao.velocidadeAngularMaximaRadps) || definicao.velocidadeAngularMaximaRadps <= 0) {
      throw new Error('Definição de vetorização inválida.');
    }
  }

  /** Escritas diretas: `this.anguloAlvoRad`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-df9bcc79746756cc */
  public solicitar(comando: ComandoVetorizacao): boolean {
    if (this.falho) return false;
    if (!Number.isFinite(comando.anguloAlvoRad) || Math.abs(comando.anguloAlvoRad) > this.definicao.limiteAngularRad) return false;
    this.anguloAlvoRad = comando.anguloAlvoRad;
    return true;
  }

  /** Escritas diretas: `this.habilitado`, `this.anguloAtualRad`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-bc32846623819067 */
  public avancar(dtS: number, habilitado: boolean): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo temporal da vetorização inválido.');
    this.habilitado = habilitado;
    if (!habilitado || this.falho) return;
    const variacaoMaxima = this.definicao.velocidadeAngularMaximaRadps * dtS;
    const erro = this.anguloAlvoRad - this.anguloAtualRad;
    this.anguloAtualRad += Math.max(-variacaoMaxima, Math.min(variacaoMaxima, erro));
  }

  /** Simula travamento mecânico permanente na posição física atual do atuador.
   * @contract f-57b7136471fd0635
   */
  public injetarFalhaMecanica(): void { this.falho = true; }

  /** REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-5b23e1a40ed69514 */
  public obterEstado(): EstadoVetorizacao {
    return {
      anguloAlvoRad: this.anguloAlvoRad,
      anguloAtualRad: this.anguloAtualRad,
      limiteAngularRad: this.definicao.limiteAngularRad,
      velocidadeAngularMaximaRadps: this.definicao.velocidadeAngularMaximaRadps,
      estaHabilitado: this.habilitado,
      estaFalho: this.falho,
    };
  }
}
