export interface DefinicaoCamaraCombustao { readonly razaoMisturaOxidanteCombustivel: number; readonly toleranciaRazaoMistura: number; }
export interface ResultadoCombustao { readonly massaReagidaKg: number; readonly eficiencia: number; }

/** Câmara bipropelente: limita a reação pela razão de mistura e pela integridade. */
export class CamaraCombustao {
  public constructor(private readonly definicao: DefinicaoCamaraCombustao) {
    if (!Number.isFinite(definicao.razaoMisturaOxidanteCombustivel) || definicao.razaoMisturaOxidanteCombustivel <= 0 || !Number.isFinite(definicao.toleranciaRazaoMistura) || definicao.toleranciaRazaoMistura < 0 || definicao.toleranciaRazaoMistura > 1) throw new Error('Definição de câmara inválida.');
  }
  public get razaoMisturaOxidanteCombustivel(): number { return this.definicao.razaoMisturaOxidanteCombustivel; }
  public reagir(massaCombustivelKg: number, massaOxidanteKg: number, integridade: number): ResultadoCombustao {
    if (![massaCombustivelKg, massaOxidanteKg, integridade].every(Number.isFinite) || massaCombustivelKg < 0 || massaOxidanteKg < 0 || integridade < 0 || integridade > 1) throw new Error('Entrada de combustão inválida.');
    if (massaCombustivelKg === 0 || massaOxidanteKg === 0 || integridade === 0) return { massaReagidaKg: 0, eficiencia: 0 };
    const desvio = Math.abs(massaOxidanteKg / massaCombustivelKg / this.definicao.razaoMisturaOxidanteCombustivel - 1);
    const eficienciaMistura = Math.max(0, 1 - desvio / Math.max(this.definicao.toleranciaRazaoMistura, Number.EPSILON));
    const combustivelLimitanteKg = Math.min(massaCombustivelKg, massaOxidanteKg / this.definicao.razaoMisturaOxidanteCombustivel);
    return { massaReagidaKg: combustivelLimitanteKg * (1 + this.definicao.razaoMisturaOxidanteCombustivel), eficiencia: eficienciaMistura * integridade };
  }
}
