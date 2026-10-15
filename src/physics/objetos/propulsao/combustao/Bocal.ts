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
  /** Valida empuxo máximo N positivo, eficiência em [0,1] e Isp opcional positivo em s; não usa gravidade local para definir Isp. @contract f-a3901e8f9e6759b1 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoBocal) {
    if (!Number.isFinite(definicao.empuxoMaximoN) || definicao.empuxoMaximoN <= 0 || !Number.isFinite(definicao.eficienciaNominal) || definicao.eficienciaNominal < 0 || definicao.eficienciaNominal > 1) throw new Error('Definição de bocal inválida.');
    if (definicao.impulsoEspecificoNominalS !== undefined
      && (!Number.isFinite(definicao.impulsoEspecificoNominalS) || definicao.impulsoEspecificoNominalS <= 0)) {
      throw new Error('Impulso específico nominal deve ser positivo e finito, em segundos.');
    }
  }
  /** Devolve `this.definicao.impulsoEspecificoNominalS`. Efeitos indiretos seguem as dependências chamadas. @contract f-ca9b07a74be06c89 */
  public get impulsoEspecificoNominalS(): number | undefined { return this.definicao.impulsoEspecificoNominalS; }
  /** Devolve `this.definicao.empuxoMaximoN`. Efeitos indiretos seguem as dependências chamadas. @contract f-fc1b59c78f5bd776 */
  public get empuxoMaximoN(): number { return this.definicao.empuxoMaximoN; }

  /** Valida integridade, fração de vazão e combustão; calcula força N por empuxo nominal×fração ou, com Isp, por massa reagida/dt×Isp×g0 limitada ao máximo. Multiplica eficiências/integridade sem aplicar força ao corpo. Modo químico exige dt positivo s. @contract f-8e0bcbb38bc93765 @reviewed M12-DOC: implementação lida. */
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
