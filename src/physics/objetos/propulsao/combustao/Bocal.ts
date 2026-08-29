import type { ResultadoCombustao } from './CamaraCombustao';

export interface DefinicaoBocal { readonly empuxoMaximoN: number; readonly eficienciaNominal: number; }

/** Converte o resultado da câmara em empuxo, limitado pela integridade do bocal. */
export class Bocal {
  public constructor(private readonly definicao: DefinicaoBocal) {
    if (!Number.isFinite(definicao.empuxoMaximoN) || definicao.empuxoMaximoN <= 0 || !Number.isFinite(definicao.eficienciaNominal) || definicao.eficienciaNominal < 0 || definicao.eficienciaNominal > 1) throw new Error('Definição de bocal inválida.');
  }
  public calcularEmpuxo(resultado: ResultadoCombustao, integridade: number, fracaoDeVazao = 1): number {
    if (!Number.isFinite(integridade) || integridade < 0 || integridade > 1 || !Number.isFinite(fracaoDeVazao) || fracaoDeVazao < 0 || fracaoDeVazao > 1) throw new Error('Entrada de bocal inválida.');
    return this.definicao.empuxoMaximoN * resultado.eficiencia * this.definicao.eficienciaNominal * integridade * fracaoDeVazao;
  }
}
