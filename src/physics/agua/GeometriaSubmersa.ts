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
export function validarPrisma(p: PrismaDeslocador): void {
  if (![p.dimensoesM.x, p.dimensoesM.y, p.dimensoesM.z].every(v => Number.isFinite(v) && v > 0)
    || !Number.isFinite(p.coeficienteArrasto) || p.coeficienteArrasto < 0
    || !Number.isFinite(p.fracaoDeslocamento ?? 1) || (p.fracaoDeslocamento ?? 1) < 0 || (p.fracaoDeslocamento ?? 1) > 1
    || ![p.colunas ?? 2, p.linhas ?? 8].every(v => Number.isSafeInteger(v) && v > 0 && v <= 64)
    || (p.centroLocalM?.z ?? 0) !== 0) throw new Error('Prisma deslocador XY inválido.');
}
/** Recorte convexo, usando coordenadas relativas ao corpo para evitar cancelamento planetocêntrico. */
function recortar(vertices: readonly Vetor3[], plano: PlanoRecorte, origem: Vetor3): Vetor3[] {
  const d = (v: Vetor3) => origem.subtrair(plano.ancoraM).adicionar(v).produtoEscalar(plano.normal);
  const resultado: Vetor3[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length], da = d(a), db = d(b);
    if (da <= 0) resultado.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) resultado.push(a.adicionar(b.subtrair(a).multiplicar(da / (da - db))));
  }
  return resultado;
}
function momento(vertices: readonly Vetor3[]): { areaM2: number; centro: Vetor3 } | undefined {
  let area2 = 0, mx = 0, my = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length], cruz = a.x * b.y - b.x * a.y;
    area2 += cruz; mx += (a.x + b.x) * cruz; my += (a.y + b.y) * cruz;
  }
  if (area2 <= 1e-18) return undefined;
  return { areaM2: area2 / 2, centro: new Vetor3(mx / (3 * area2), my / (3 * area2), 0) };
}
export function verticesPrismaM(e: EstadoFisico, p: PrismaDeslocador): readonly Vetor3[] {
  const c = p.centroLocalM ?? Vetor3.zero, d = p.dimensoesM;
  const cos = Math.cos(e.orientacaoRad.z), sin = Math.sin(e.orientacaoRad.z);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
    const q = c.adicionar(new Vetor3(x * d.x / 2, y * d.y / 2, 0));
    return e.posicaoM.adicionar(new Vetor3(q.x * cos - q.y * sin, q.x * sin + q.y * cos, 0));
  });
}
/** 2D extrudado em Z: células são integração distribuída, sem massas/corpos adicionais. */
export function calcularGeometriaSubmersa(e: EstadoFisico, p: PrismaDeslocador, agua: RegiaoAquatica): GeometriaImersa {
  const d = p.dimensoesM, nx = p.colunas ?? 2, ny = p.linhas ?? 8, espessura = d.z * (p.fracaoDeslocamento ?? 1);
  const cos = Math.cos(e.orientacaoRad.z), sin = Math.sin(e.orientacaoRad.z), c = p.centroLocalM ?? Vetor3.zero;
  const girar = (x: number, y: number) => new Vetor3(x * cos - y * sin, x * sin + y * cos, 0);
  const contorno = verticesPrismaM(e, p).map(v => v.subtrair(e.posicaoM));
  const distancia = (q: Vetor3, plano: PlanoRecorte) => e.posicaoM.subtrair(plano.ancoraM).adicionar(q).produtoEscalar(plano.normal);
  const recortes = agua.recortesEm(e.posicaoM).filter(planos =>
    !planos.some(plano => contorno.every(q => distancia(q, plano) > 0)));
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
