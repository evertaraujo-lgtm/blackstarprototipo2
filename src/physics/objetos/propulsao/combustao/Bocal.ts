import type { ResultadoCombustao } from './CamaraCombustao';

export const GRAVIDADE_PADRAO_MPS2 = 9.80665;

export interface DefinicaoBocal {
  readonly empuxoMaximoN: number;
  readonly eficienciaNominal: number;
  /** Modelo químico idealizado, calibrado na condição nominal declarada. Ausente: ensaio paramétrico. */
  readonly impulsoEspecificoNominalS?: number;
}

/** Converte o resultado da câmara em empuxo, limitado pela integridade do bocal. */
export class Bocal {
  public constructor(private readonly definicao: DefinicaoBocal) {
    if (!Number.isFinite(definicao.empuxoMaximoN) || definicao.empuxoMaximoN <= 0 || !Number.isFinite(definicao.eficienciaNominal) || definicao.eficienciaNominal < 0 || definicao.eficienciaNominal > 1) throw new Error('Definição de bocal inválida.');
    if (definicao.impulsoEspecificoNominalS !== undefined
      && (!Number.isFinite(definicao.impulsoEspecificoNominalS) || definicao.impulsoEspecificoNominalS <= 0)) {
      throw new Error('Impulso específico nominal deve ser positivo e finito, em segundos.');
    }
  }
  public get impulsoEspecificoNominalS(): number | undefined { return this.definicao.impulsoEspecificoNominalS; }
  public get empuxoMaximoN(): number { return this.definicao.empuxoMaximoN; }

  public calcularEmpuxo(resultado: ResultadoCombustao, integridade: number, fracaoDeVazao = 1, dtS?: number): number {
    if (!Number.isFinite(integridade) || integridade < 0 || integridade > 1 || !Number.isFinite(fracaoDeVazao) || fracaoDeVazao < 0 || fracaoDeVazao > 1) throw new Error('Entrada de bocal inválida.');
    if (!Number.isFinite(resultado.massaReagidaKg) || resultado.massaReagidaKg < 0
      || !Number.isFinite(resultado.eficiencia) || resultado.eficiencia < 0 || resultado.eficiencia > 1) {
      throw new Error('Resultado de combustão inválido.');
    }
    let empuxoIdealN = this.definicao.empuxoMaximoN * fracaoDeVazao;
    if (this.impulsoEspecificoNominalS !== undefined) {
      if (dtS === undefined || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Bocal químico exige dt positivo e finito.');
      empuxoIdealN = Math.min(this.empuxoMaximoN,
        resultado.massaReagidaKg / dtS * this.impulsoEspecificoNominalS * GRAVIDADE_PADRAO_MPS2);
    }
    return empuxoIdealN * resultado.eficiencia * this.definicao.eficienciaNominal * integridade;
  }
}
