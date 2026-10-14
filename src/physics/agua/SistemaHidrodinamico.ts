import type { Objeto } from '../objetos/base/Objeto';
import type { ForcaAplicada } from '../tipos/ForcaAplicada';
import { Vetor3 } from '../Vetor3';
import { calcularGeometriaSubmersa, validarPrisma, verticesPrismaM, type PrismaDeslocador } from './GeometriaSubmersa';
import { RegiaoAquatica } from './RegiaoAquatica';

export interface EstadoImersao {
  readonly objetoId: string; readonly regiaoId: string;
  readonly volumeTotalM3: number; readonly volumeSubmersoM3: number; readonly fracaoSubmersa: number;
  readonly centroEmpuxoM?: Vetor3; readonly forcaEmpuxoN: Vetor3;
  readonly forcaArrastoN: Vetor3; readonly torqueHidrodinamicoNm: Vetor3;
  readonly potenciaDissipadaW: number; readonly velocidadeEntradaMps: number;
}
/** Cargas físicas em pontos: não escreve cinemática ou integra um mundo paralelo. */
export class SistemaHidrodinamico {
  private readonly formas = new Map<Objeto, PrismaDeslocador>();
  public constructor(public readonly regioes: readonly RegiaoAquatica[], private readonly gravidade: (p: Vetor3) => Vetor3) {
    if (new Set(regioes.map(r => r.id)).size !== regioes.length) throw new Error('Região aquática duplicada.');
    for (let i = 0; i < regioes.length; i++) for (let j = i + 1; j < regioes.length; j++) {
      const a = regioes[i].costa, b = regioes[j].costa;
      if (a.configuracao.inicioArcoM < b.fimArcoM && b.configuracao.inicioArcoM < a.fimArcoM) throw new Error('Regiões aquáticas sobrepostas não suportadas.');
    }
  }
  public registrar(objeto: Objeto, forma: PrismaDeslocador): void {
    validarPrisma(forma);
    if (this.formas.has(objeto)) throw new Error('Objeto já possui geometria aquática.');
    // SAT planar: volumes declarados precisam ser exclusivos. Não duplica compartimentos internos.
    const v = verticesPrismaM(objeto.getEstadoFisico(), forma);
    for (const [outro, p] of this.formas) {
      if ((p.fracaoDeslocamento ?? 1) === 0 || (forma.fracaoDeslocamento ?? 1) === 0) continue;
      const w = verticesPrismaM(outro.getEstadoFisico(), p), separadas = [v, w].some(poly => poly.some((a, i) => {
        const b = poly[(i + 1) % poly.length], n = new Vetor3(a.y - b.y, b.x - a.x, 0);
        const proj = (q: readonly Vetor3[]) => q.map(x => x.subtrair(v[0]).produtoEscalar(n));
        const pv = proj(v), pw = proj(w);
        return Math.max(...pv) <= Math.min(...pw) + 1e-8 || Math.max(...pw) <= Math.min(...pv) + 1e-8;
      }));
      if (!separadas) throw new Error(`Volumes deslocadores sobrepostos: ${objeto.id}/${outro.id}. Declare geometria exclusiva.`);
    }
    this.formas.set(objeto, Object.freeze({ ...forma }));
  }
  public calcular(objeto: Objeto, referenciaM = objeto.getEstadoFisico().posicaoM): { forcas: readonly ForcaAplicada[]; estados: readonly EstadoImersao[] } {
    const p = this.formas.get(objeto); if (!p) return { forcas: [], estados: [] };
    const e = objeto.getEstadoFisico(), estados: EstadoImersao[] = [], forcas: ForcaAplicada[] = [];
    for (const agua of this.regioes) {
      const g = calcularGeometriaSubmersa(e, p, agua), B = g.centroEmpuxoM;
      const forcaEmpuxoN = B ? this.gravidade(B).multiplicar(-agua.densidadeKgM3 * g.volumeSubmersoM3) : Vetor3.zero;
      if (B) forcas.push({ forcaN: forcaEmpuxoN, pontoM: B });
      const vr = e.velocidadeMps.subtrair(agua.velocidadeEm(e.posicaoM));
      estados.push({ objetoId: objeto.id, regiaoId: agua.id, volumeTotalM3: g.volumeTotalM3,
        volumeSubmersoM3: g.volumeSubmersoM3, fracaoSubmersa: g.fracaoGeometrica, centroEmpuxoM: B,
        forcaEmpuxoN, forcaArrastoN: Vetor3.zero, torqueHidrodinamicoNm: B ? B.subtrair(referenciaM).produtoVetorial(forcaEmpuxoN) : Vetor3.zero,
        potenciaDissipadaW: 0, velocidadeEntradaMps: Math.max(0, -vr.produtoEscalar(agua.costa.referencial.radial(e.posicaoM))) });
    }
    return { forcas, estados };
  }
  public obterConfiguracao() { return { regioes: this.regioes.map(a => a.obterConfiguracao()),
    volumes: [...this.formas].map(([o, p]) => ({ objetoId: o.id, ...p })) }; }
}
