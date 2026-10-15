import type { EstadoFisico } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import type { PlanoRecorte, RegiaoAquatica } from './RegiaoAquatica';

export interface PrismaDeslocador {
  readonly dimensoesM: Vetor3;
  readonly centroLocalM?: Vetor3;
  /** Fração homogênea de material excluindo água; 1 declara compartimento estanque. */
  readonly fracaoDeslocamento?: number;
  readonly coeficienteArrasto: number;
  readonly colunas?: number;
  readonly linhas?: number;
}
export interface ElementoSubmerso { readonly volumeM3: number; readonly centroM: Vetor3 }
export interface GeometriaImersa {
  readonly volumeTotalM3: number; readonly volumeSubmersoM3: number;
  readonly centroEmpuxoM?: Vetor3; readonly elementos: readonly ElementoSubmerso[];
  readonly fracaoGeometrica: number;
}
/** Valida dimensões positivas em m, Cd não negativo, fração deslocadora [0,1], malha inteira 1–64 e centro local XY; lança erro antes de registrar volume. @contract f-00378e285877f165 @reviewed M12-DOC: implementação lida. */
export function validarPrisma(p: PrismaDeslocador): void {
  if (![p.dimensoesM.x, p.dimensoesM.y, p.dimensoesM.z].every(v => Number.isFinite(v) && v > 0)
    || !Number.isFinite(p.coeficienteArrasto) || p.coeficienteArrasto < 0
    || !Number.isFinite(p.fracaoDeslocamento ?? 1) || (p.fracaoDeslocamento ?? 1) < 0 || (p.fracaoDeslocamento ?? 1) > 1
    || ![p.colunas ?? 2, p.linhas ?? 8].every(v => Number.isSafeInteger(v) && v > 0 && v <= 64)
    || (p.centroLocalM?.z ?? 0) !== 0) throw new Error('Prisma deslocador XY inválido.');
}
/** Recorte convexo, usando coordenadas relativas ao corpo para evitar cancelamento planetocêntrico.
 * @remarks Recorta polígono convexo pelo semiplano d≤0 em coordenadas relativas ao corpo; interpola apenas cruzamentos de arestas, sem modificar os vértices originais.
 * @contract f-a0e6726cddd0db43
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
function recortar(vertices: readonly Vetor3[], plano: PlanoRecorte, origem: Vetor3): Vetor3[] {
  // Mesma ordem das operações vetoriais originais, sem alocar vetores por vértice.
  const ox = origem.x - plano.ancoraM.x, oy = origem.y - plano.ancoraM.y, oz = origem.z - plano.ancoraM.z;
  /** Devolve `(ox + v.x) * plano.normal.x + (oy + v.y) * plano.normal.y + (oz + v.z) * plano.normal.z`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-b1232e7b5e5a15c5 */
  const d = (v: Vetor3) => (ox + v.x) * plano.normal.x + (oy + v.y) * plano.normal.y + (oz + v.z) * plano.normal.z;
  const resultado: Vetor3[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length], da = d(a), db = d(b);
    if (da <= 0) resultado.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) resultado.push(a.adicionar(b.subtrair(a).multiplicar(da / (da - db))));
  }
  return resultado;
}
/** Calcula área assinada XY em m² e centroide pelo somatório de arestas; retorna undefined para área degenerada/não positiva ≤1e−18. @contract f-a0f6ad2f2412838b @reviewed M12-DOC: implementação lida. */
function momento(vertices: readonly Vetor3[]): { areaM2: number; centro: Vetor3 } | undefined {
  let area2 = 0, mx = 0, my = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length], cruz = a.x * b.y - b.x * a.y;
    area2 += cruz; mx += (a.x + b.x) * cruz; my += (a.y + b.y) * cruz;
  }
  if (area2 <= 1e-18) return undefined;
  return { areaM2: area2 / 2, centro: new Vetor3(mx / (3 * area2), my / (3 * area2), 0) };
}
/** Transforma quatro quinas XY do prisma por centro local, atitude Z e translação; extrusão Z participa do volume, não cria novos corpos. @contract f-4e3a785a1c65abbb @reviewed M12-DOC: implementação lida. */
export function verticesPrismaM(e: EstadoFisico, p: PrismaDeslocador): readonly Vetor3[] {
  const c = p.centroLocalM ?? Vetor3.zero, d = p.dimensoesM;
  const cos = Math.cos(e.orientacaoRad.z), sin = Math.sin(e.orientacaoRad.z);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
    const q = c.adicionar(new Vetor3(x * d.x / 2, y * d.y / 2, 0));
    return e.posicaoM.adicionar(new Vetor3(q.x * cos - q.y * sin, q.x * sin + q.y * cos, 0));
  });
}
/** 2D extrudado em Z: células são integração distribuída, sem massas/corpos adicionais.
 * @remarks Integra volume externo e centro de empuxo por células XY recortadas nas seções aquáticas, com espessura Z efetiva. Dimensões/centros em m, volumes m³. Malha declarada (padrão 2×8), sem alterar resolução para desempenho. Fração zero produz volume/área expostos zero; rejeição rápida de todos os planos devolve seco. Média volumétrica é calculada relativa ao corpo para reduzir cancelamento; não soma compartimentos sobrepostos nem aplica forças.
 * @contract f-0171cc1b69fb61a7
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function calcularGeometriaSubmersa(e: EstadoFisico, p: PrismaDeslocador, agua: RegiaoAquatica): GeometriaImersa {
  const d = p.dimensoesM, nx = p.colunas ?? 2, ny = p.linhas ?? 8, espessura = d.z * (p.fracaoDeslocamento ?? 1);
  // Componente interno sem exposição: não cria elementos de volume nulo (0/0 no arrasto).
  if (espessura === 0) return { volumeTotalM3: 0, volumeSubmersoM3: 0, elementos: [], fracaoGeometrica: 0 };
  const cos = Math.cos(e.orientacaoRad.z), sin = Math.sin(e.orientacaoRad.z), c = p.centroLocalM ?? Vetor3.zero;
  /** Devolve `new Vetor3(x * cos - y * sin, x * sin + y * cos, 0)`. Dependências diretas: `Vetor3`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-0bbb068bd7e55d65 */
  const girar = (x: number, y: number) => new Vetor3(x * cos - y * sin, x * sin + y * cos, 0);
  const contorno = verticesPrismaM(e, p).map(v => v.subtrair(e.posicaoM));
  /** REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-2311e018804a3702 */
  const distancia = (q: Vetor3, plano: PlanoRecorte) =>
    ((e.posicaoM.x - plano.ancoraM.x) + q.x) * plano.normal.x
    + ((e.posicaoM.y - plano.ancoraM.y) + q.y) * plano.normal.y
    + ((e.posicaoM.z - plano.ancoraM.z) + q.z) * plano.normal.z;
  const recortes = agua.recortesEm(e.posicaoM).filter(planos =>
    !planos.some(plano => contorno.every(q => distancia(q, plano) > 0)));
  // Todos os recortes rejeitados: nenhuma célula pode deslocar água nesta pose.
  if (recortes.length === 0) return { volumeTotalM3: d.x * d.y * espessura, volumeSubmersoM3: 0,
    centroEmpuxoM: undefined, elementos: [], fracaoGeometrica: 0 };
  const totalmenteImerso = recortes.length === 1 && recortes[0].every(plano => contorno.every(q => distancia(q, plano) <= 0));
  const elementos: ElementoSubmerso[] = [];
  for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) {
    const x0 = c.x - d.x / 2 + d.x * ix / nx, x1 = x0 + d.x / nx;
    const y0 = c.y - d.y / 2 + d.y * iy / ny, y1 = y0 + d.y / ny;
    if (totalmenteImerso) {
      elementos.push({ volumeM3: d.x * d.y * espessura / (nx * ny), centroM: e.posicaoM.adicionar(girar((x0 + x1) / 2, (y0 + y1) / 2)) });
      continue;
    }
    const vertices = [girar(x0, y0), girar(x1, y0), girar(x1, y1), girar(x0, y1)];
    for (const planos of recortes) {
      let poligono = vertices;
      for (const plano of planos) { poligono = recortar(poligono, plano, e.posicaoM); if (poligono.length < 3) break; }
      const m = momento(poligono); if (!m) continue;
      const volumeM3 = m.areaM2 * espessura;
      if (volumeM3 > 0) elementos.push({ volumeM3, centroM: e.posicaoM.adicionar(m.centro) });
    }
  }
  const volumeSubmersoM3 = elementos.reduce((v, p) => v + p.volumeM3, 0), volumeTotalM3 = d.x * d.y * espessura;
  const centroEmpuxoM = volumeSubmersoM3 > 0 ? e.posicaoM.adicionar(elementos.reduce((s, p) =>
    s.adicionar(p.centroM.subtrair(e.posicaoM).multiplicar(p.volumeM3 / volumeSubmersoM3)), Vetor3.zero)) : undefined;
  return { volumeTotalM3, volumeSubmersoM3, centroEmpuxoM, elementos,
    fracaoGeometrica: volumeTotalM3 > 0 ? Math.min(1, volumeSubmersoM3 / volumeTotalM3) : 0 };
}
