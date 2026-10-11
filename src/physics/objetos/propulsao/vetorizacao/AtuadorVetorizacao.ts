import type { ComandoVetorizacao, DefinicaoSistemaVetorizacao, EstadoVetorizacao, IAtuadorVetorizacao } from './InterfacesVetorizacao';

/** Atuador planar determinístico; futuros modelos podem especializar esta interface. */
export class AtuadorVetorizacao implements IAtuadorVetorizacao {
  private anguloAlvoRad = 0;
  private anguloAtualRad = 0;
  private habilitado = false;
  private falho = false;

  public constructor(private readonly definicao: DefinicaoSistemaVetorizacao) {
    if (!Number.isFinite(definicao.limiteAngularRad) || definicao.limiteAngularRad <= 0 ||
      !Number.isFinite(definicao.velocidadeAngularMaximaRadps) || definicao.velocidadeAngularMaximaRadps <= 0) {
      throw new Error('Definição de vetorização inválida.');
    }
  }

  public solicitar(comando: ComandoVetorizacao): boolean {
    if (this.falho) return false;
    if (!Number.isFinite(comando.anguloAlvoRad) || Math.abs(comando.anguloAlvoRad) > this.definicao.limiteAngularRad) return false;
    this.anguloAlvoRad = comando.anguloAlvoRad;
    return true;
  }

  public avancar(dtS: number, habilitado: boolean): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo temporal da vetorização inválido.');
    this.habilitado = habilitado;
    if (!habilitado || this.falho) return;
    const variacaoMaxima = this.definicao.velocidadeAngularMaximaRadps * dtS;
    const erro = this.anguloAlvoRad - this.anguloAtualRad;
    this.anguloAtualRad += Math.max(-variacaoMaxima, Math.min(variacaoMaxima, erro));
  }

  /** Simula travamento mecânico permanente na posição física atual do atuador. */
  public injetarFalhaMecanica(): void { this.falho = true; }

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
