export interface DefinicaoCamaraCombustao { readonly razaoMisturaOxidanteCombustivel: number; readonly toleranciaRazaoMistura: number; }
export interface ResultadoCombustao { readonly massaReagidaKg: number; readonly eficiencia: number; }

/** Câmara bipropelente: limita a reação pela razão de mistura e pela integridade. */
export class CamaraCombustao {
  /** Escritas diretas: `this.definicao`. Dependências diretas: `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b0538dd43b1921f1 */
  public constructor(private readonly definicao: DefinicaoCamaraCombustao) {
    if (!Number.isFinite(definicao.razaoMisturaOxidanteCombustivel) || definicao.razaoMisturaOxidanteCombustivel <= 0 || !Number.isFinite(definicao.toleranciaRazaoMistura) || definicao.toleranciaRazaoMistura < 0 || definicao.toleranciaRazaoMistura > 1) throw new Error('Definição de câmara inválida.');
  }
  /** Devolve `this.definicao.razaoMisturaOxidanteCombustivel`. Efeitos indiretos seguem as dependências chamadas. @contract f-9f56b115cd31e60a */
  public get razaoMisturaOxidanteCombustivel(): number { return this.definicao.razaoMisturaOxidanteCombustivel; }
  /** Dependências diretas: `[massaCombustivelKg, massaOxidanteKg, integridade].every`, `Error`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-41666046ae75addb */
  public reagir(massaCombustivelKg: number, massaOxidanteKg: number, integridade: number): ResultadoCombustao {
    if (![massaCombustivelKg, massaOxidanteKg, integridade].every(Number.isFinite) || massaCombustivelKg < 0 || massaOxidanteKg < 0 || integridade < 0 || integridade > 1) throw new Error('Entrada de combustão inválida.');
    if (massaCombustivelKg === 0 || massaOxidanteKg === 0 || integridade === 0) return { massaReagidaKg: 0, eficiencia: 0 };
    const desvio = Math.abs(massaOxidanteKg / massaCombustivelKg / this.definicao.razaoMisturaOxidanteCombustivel - 1);
    const eficienciaMistura = Math.max(0, 1 - desvio / Math.max(this.definicao.toleranciaRazaoMistura, Number.EPSILON));
    const combustivelLimitanteKg = Math.min(massaCombustivelKg, massaOxidanteKg / this.definicao.razaoMisturaOxidanteCombustivel);
    return { massaReagidaKg: combustivelLimitanteKg * (1 + this.definicao.razaoMisturaOxidanteCombustivel), eficiencia: eficienciaMistura * integridade };
  }
}
