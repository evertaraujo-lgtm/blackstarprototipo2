import type { ComandoVetorizacao, DefinicaoSistemaVetorizacao, EstadoVetorizacao, IAtuadorVetorizacao } from './InterfacesVetorizacao';

/** Atuador planar determinístico; futuros modelos podem especializar esta interface. */
export class AtuadorVetorizacao implements IAtuadorVetorizacao {
  private anguloAlvoRad = 0;
  private anguloAtualRad = 0;
  private habilitado = false;
  private falho = false;

  /** Valida curso angular rad e velocidade máxima rad/s positivos finitos; inicializa configuração sem mover corpo físico. @contract f-d5fed7dda85b3573 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoSistemaVetorizacao) {
    if (!Number.isFinite(definicao.limiteAngularRad) || definicao.limiteAngularRad <= 0 ||
      !Number.isFinite(definicao.velocidadeAngularMaximaRadps) || definicao.velocidadeAngularMaximaRadps <= 0) {
      throw new Error('Definição de vetorização inválida.');
    }
  }

  /** Recusa falha, alvo não finito ou fora do curso; armazena alvo aceito em rad sem alcançar instantaneamente o ângulo. @contract f-df9bcc79746756cc @reviewed M12-DOC: implementação lida. */
  public solicitar(comando: ComandoVetorizacao): boolean {
    if (this.falho) return false;
    if (!Number.isFinite(comando.anguloAlvoRad) || Math.abs(comando.anguloAlvoRad) > this.definicao.limiteAngularRad) return false;
    this.anguloAlvoRad = comando.anguloAlvoRad;
    return true;
  }

  /** Valida dt positivo s e atualiza habilitação; somente habilitado/íntegro aproxima ângulo real do alvo pelo limite de velocidade angular×dt. É movimento interno do atuador; orientação do veículo pertence ao core. @contract f-bc32846623819067 @reviewed M12-DOC: implementação lida. */
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

  /** Retorna novo DTO com alvo/posição angular rad, limites rad/rad/s, habilitação e falha; não expõe campos internos. @contract f-5b23e1a40ed69514 @reviewed M12-DOC: implementação lida. */
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
