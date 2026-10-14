import type { Objeto } from '../objetos/base/Objeto';
import type { ForcaAplicada } from '../tipos/ForcaAplicada';
import { Vetor3 } from '../Vetor3';
import { calcularGeometriaSubmersa, validarPrisma, verticesPrismaM, type PrismaDeslocador, type GeometriaImersa } from './GeometriaSubmersa';
import { RegiaoAquatica } from './RegiaoAquatica';

export interface EstadoImersao {
  readonly objetoId: string; readonly regiaoId: string;
  readonly volumeTotalM3: number; readonly volumeSubmersoM3: number; readonly fracaoSubmersa: number;
  readonly centroEmpuxoM?: Vetor3; readonly forcaEmpuxoN: Vetor3;
  readonly forcaArrastoN: Vetor3; readonly torqueHidrodinamicoNm: Vetor3;
  readonly potenciaDissipadaW: number; readonly velocidadeEntradaMps: number;
  readonly energiaEntradaJ: number; readonly picoVelocidadeEntradaMps: number;
}
/** Cargas físicas em pontos: não escreve cinemática ou integra um mundo paralelo. */
export class SistemaHidrodinamico {
  private readonly formas = new Map<Objeto, PrismaDeslocador>();
  private readonly cache = new Map<Objeto, { posicao: Vetor3; theta: number; geometria: readonly GeometriaImersa[] }>();
  private readonly entradas = new Map<string, { volumeAnteriorM3: number; energiaJ: number; picoMps: number; ativa: boolean;
    potenciaAnteriorW: number; dtAnteriorS: number; distanciaMinimaM: number; distanciaMaximaM: number }>();
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
  public verificarDeclaracoes(objetos: Iterable<Objeto>): void {
    for (const o of objetos) if (!this.formas.has(o)) throw new Error(`Geometria aquática não declarada: ${o.id}. Declare deslocamento/área explicitamente, inclusive zero para componentes internos.`);
  }
  public calcular(objeto: Objeto, referenciaM = objeto.getEstadoFisico().posicaoM, incluirEmpuxo = true): { forcas: readonly ForcaAplicada[]; estados: readonly EstadoImersao[] } {
    const p = this.formas.get(objeto); if (!p) return { forcas: [], estados: [] };
    const e = objeto.getEstadoFisico(), estados: EstadoImersao[] = [], forcas: ForcaAplicada[] = [];
    for (const [indice, agua] of this.regioes.entries()) {
      const g = this.geometrias(objeto, p)[indice], B = g.centroEmpuxoM;
      const forcaEmpuxoN = B ? this.gravidade(B).multiplicar(-agua.densidadeKgM3 * g.volumeSubmersoM3) : Vetor3.zero;
      if (B && incluirEmpuxo) forcas.push({ forcaN: forcaEmpuxoN, pontoM: B });
      let forcaArrastoN = Vetor3.zero, torqueArrasto = Vetor3.zero, potenciaDissipadaW = 0;
      for (const el of g.elementos) {
        const v = e.velocidadeMps.adicionar(e.velocidadeAngularRadps.produtoVetorial(el.centroM.subtrair(e.posicaoM)))
          .subtrair(agua.velocidadeEm(el.centroM));
        const velocidade = v.magnitude; if (velocidade === 0) continue;
        const area = this.areaProjetada(p, e.orientacaoRad.z, v) * el.volumeM3 / g.volumeTotalM3;
        const f = v.multiplicar(-0.5 * agua.densidadeKgM3 * p.coeficienteArrasto * area * velocidade);
        forcas.push({ forcaN: f, pontoM: el.centroM });
        forcaArrastoN = forcaArrastoN.adicionar(f);
        torqueArrasto = torqueArrasto.adicionar(el.centroM.subtrair(referenciaM).produtoVetorial(f));
        potenciaDissipadaW += Math.max(0, -f.produtoEscalar(v));
      }
      const vr = e.velocidadeMps.subtrair(agua.velocidadeEm(e.posicaoM));
      const entrada = this.entradas.get(`${objeto.id}/${agua.id}`);
      estados.push({ objetoId: objeto.id, regiaoId: agua.id, volumeTotalM3: g.volumeTotalM3,
        volumeSubmersoM3: g.volumeSubmersoM3, fracaoSubmersa: g.fracaoGeometrica, centroEmpuxoM: B,
        forcaEmpuxoN, forcaArrastoN, torqueHidrodinamicoNm: torqueArrasto.adicionar(B ? B.subtrair(referenciaM).produtoVetorial(forcaEmpuxoN) : Vetor3.zero),
        potenciaDissipadaW, velocidadeEntradaMps: Math.max(0, -vr.produtoEscalar(agua.costa.referencial.radial(e.posicaoM))),
        energiaEntradaJ: entrada?.energiaJ ?? 0, picoVelocidadeEntradaMps: entrada?.picoMps ?? 0 });
    }
    return { forcas, estados };
  }
  /** Forças conservativas, para a mesma composição kick–drift–kick da gravidade. */
  public obterEmpuxos(objeto: Objeto): readonly ForcaAplicada[] {
    const p = this.formas.get(objeto); if (!p) return [];
    return this.geometrias(objeto, p).flatMap((g, i) => g.centroEmpuxoM ? [{ pontoM: g.centroEmpuxoM,
      forcaN: this.gravidade(g.centroEmpuxoM).multiplicar(-this.regioes[i].densidadeKgM3 * g.volumeSubmersoM3) }] : []);
  }
  /** Trabalho resistivo na fase de volume crescente: modelo energético de entrada, sem impulso adicional. */
  public atualizarCarregamento(objeto: Objeto, dtS: number): void {
    const forma = this.formas.get(objeto); if (!forma) return;
    const vertices = verticesPrismaM(objeto.getEstadoFisico(), forma);
    for (const [i, s] of this.calcular(objeto).estados.entries()) {
      const chave = `${objeto.id}/${s.regiaoId}`;
      const agua = this.regioes[i], alturas = vertices.map(p => agua.costa.referencial.altitudeGeometricaM(p) - agua.costa.configuracao.nivelMarM);
      const minimo = Math.min(...alturas), maximo = Math.max(...alturas);
      let e = this.entradas.get(chave);
      if (!e) { e = { volumeAnteriorM3: 0, energiaJ: 0, picoMps: 0, ativa: false, potenciaAnteriorW: 0,
        dtAnteriorS: 0, distanciaMinimaM: minimo, distanciaMaximaM: maximo }; this.entradas.set(chave, e); }
      if (s.volumeSubmersoM3 === 0) e.ativa = false;
      if (e.volumeAnteriorM3 === 0 && s.velocidadeEntradaMps > 0) { e.ativa = true; e.energiaJ = 0; e.picoMps = s.velocidadeEntradaMps; }
      if (e.ativa && s.volumeSubmersoM3 > 0 && s.velocidadeEntradaMps > 0 && s.volumeSubmersoM3 >= e.volumeAnteriorM3) {
        // Integra o intervalo anterior por trapézio, localizando entrada/imersão completa por cruzamento dos extremos.
        const inicio = e.distanciaMinimaM > 0 && minimo < 0 ? e.distanciaMinimaM / (e.distanciaMinimaM - minimo) : 0;
        const fim = e.distanciaMaximaM > 0 && maximo < 0 ? e.distanciaMaximaM / (e.distanciaMaximaM - maximo) : 1;
        const antes = e.energiaJ;
        e.energiaJ += Math.max(0, fim - inicio) * e.dtAnteriorS * (e.potenciaAnteriorW
          + (s.potenciaDissipadaW - e.potenciaAnteriorW) * (inicio + fim) / 2);
        e.picoMps = Math.max(e.picoMps, s.velocidadeEntradaMps);
        objeto.aplicarDanoPorCarregamentoPeloCore(antes, e.energiaJ);
      } else e.ativa = false;
      if (s.fracaoSubmersa >= 1 - 1e-12) e.ativa = false;
      e.volumeAnteriorM3 = s.volumeSubmersoM3;
      e.potenciaAnteriorW = s.potenciaDissipadaW; e.dtAnteriorS = dtS;
      e.distanciaMinimaM = minimo; e.distanciaMaximaM = maximo;
    }
  }
  private geometrias(o: Objeto, p: PrismaDeslocador): readonly GeometriaImersa[] {
    const e = o.getEstadoFisico(), c = this.cache.get(o);
    if (c && c.posicao.x === e.posicaoM.x && c.posicao.y === e.posicaoM.y && c.posicao.z === e.posicaoM.z && c.theta === e.orientacaoRad.z) return c.geometria;
    const geometria = this.regioes.map(a => calcularGeometriaSubmersa(e, p, a));
    this.cache.set(o, { posicao: e.posicaoM, theta: e.orientacaoRad.z, geometria }); return geometria;
  }
  public fracaoExpostaAr(o: Objeto): number {
    const p = this.formas.get(o); return p ? Math.max(0, 1 - this.geometrias(o, p).reduce((s, g) => s + g.fracaoGeometrica, 0)) : 1;
  }
  private areaProjetada(p: PrismaDeslocador, theta: number, v: Vetor3): number {
    const c = Math.cos(theta), s = Math.sin(theta), modulo = v.magnitude;
    const vx = (v.x * c + v.y * s) / modulo, vy = (-v.x * s + v.y * c) / modulo;
    return p.dimensoesM.z * (p.dimensoesM.y * Math.abs(vx) + p.dimensoesM.x * Math.abs(vy));
  }
  /** Restrição de estabilidade por derivada da resistência e rigidez hidrostática; não limita velocidade. */
  public limitePassoS(o: Objeto, massaKg: number, inerciaZ: number, G: Vetor3): number {
    const p = this.formas.get(o); if (!p) return Infinity;
    const e = o.getEstadoFisico(); let taxa = 0, limite = Infinity;
    for (const [i, agua] of this.regioes.entries()) {
      const g = this.geometrias(o, p)[i]; if (g.volumeSubmersoM3 === 0) continue;
      for (const el of g.elementos) {
        const v = e.velocidadeMps.adicionar(e.velocidadeAngularRadps.produtoVetorial(el.centroM.subtrair(e.posicaoM))).subtrair(agua.velocidadeEm(el.centroM));
        if (v.magnitude === 0) continue;
        const area = this.areaProjetada(p, e.orientacaoRad.z, v) * el.volumeM3 / g.volumeTotalM3;
        taxa += agua.densidadeKgM3 * p.coeficienteArrasto * area * v.magnitude * (1 / massaKg + el.centroM.subtrair(G).magnitude ** 2 / inerciaZ);
      }
      const areaMax = p.dimensoesM.z * Math.hypot(p.dimensoesM.x, p.dimensoesM.y);
      limite = Math.min(limite, 0.1 * Math.sqrt(massaKg / (agua.densidadeKgM3 * this.gravidade(e.posicaoM).magnitude * areaMax)));
    }
    // ≤1% de variação local da carga por passo: precisão de entrada, além de estabilidade.
    return Math.min(limite, taxa > 0 ? 0.01 / taxa : Infinity);
  }
  public obterConfiguracao() { return { regioes: this.regioes.map(a => a.obterConfiguracao()),
    volumes: [...this.formas].map(([o, p]) => ({ objetoId: o.id, ...p })) }; }
}
