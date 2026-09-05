import { Vetor3 } from '../Vetor3';

interface Ponto2D { readonly x: number; readonly y: number; }

/** Estado geométrico mínimo para consultas de contato; não possui dinâmica. */
export interface CaixaOrientada {
  readonly posicaoM: Vetor3;
  readonly dimensoesM: Vetor3;
  readonly orientacaoZRad: number;
}

export interface ContatoCaixasOrientadas {
  /** Normal que aponta da primeira caixa para a segunda. */
  readonly normal: Vetor3;
  readonly penetracaoM: number;
  readonly pontoM: Vetor3;
}

/**
 * Consulta geométrica usada tanto pelo resolvedor físico quanto por sensores.
 * Contato por tangência é aceito com uma tolerância numérica curta, para que
 * um fim de curso não perca o sinal depois da correção de penetração do core.
 */
export function obterContatoCaixasOrientadas(
  caixaA: CaixaOrientada,
  caixaB: CaixaOrientada,
  toleranciaContatoM = 0,
): ContatoCaixasOrientadas | undefined {
  if (!Number.isFinite(toleranciaContatoM) || toleranciaContatoM < 0) {
    throw new Error('Tolerância de contato deve ser finita e não negativa.');
  }
  const a = obterVertices2D(caixaA);
  const b = obterVertices2D(caixaB);
  let penetracaoM = Number.POSITIVE_INFINITY;
  let normal: Ponto2D | undefined;
  for (const eixo of [...obterEixos(a), ...obterEixos(b)]) {
    const pa = projetar(a, eixo);
    const pb = projetar(b, eixo);
    const sobreposicao = Math.min(pa.maximo, pb.maximo) - Math.max(pa.minimo, pb.minimo);
    if (sobreposicao < -toleranciaContatoM) return undefined;
    if (sobreposicao < penetracaoM) {
      const apontaParaB = ((caixaB.posicaoM.x - caixaA.posicaoM.x) * eixo.x) + ((caixaB.posicaoM.y - caixaA.posicaoM.y) * eixo.y) >= 0;
      normal = apontaParaB ? eixo : { x: -eixo.x, y: -eixo.y };
      penetracaoM = sobreposicao;
    }
  }
  const sobreposicaoZ = ((caixaA.dimensoesM.z + caixaB.dimensoesM.z) / 2) - Math.abs(caixaB.posicaoM.z - caixaA.posicaoM.z);
  if (sobreposicaoZ < -toleranciaContatoM || !normal) return undefined;
  const regiao = recortarPoligono(a, b);
  // Em uma tangência, o recorte pode não ter área. O meio dos centros ainda
  // fornece uma posição de observação, sem afetar a resolução física.
  const ponto = regiao.length > 0 ? centroide(regiao) : {
    x: (caixaA.posicaoM.x + caixaB.posicaoM.x) / 2,
    y: (caixaA.posicaoM.y + caixaB.posicaoM.y) / 2,
  };
  const z = obterCentroDaIntersecao(caixaA.posicaoM.z, caixaA.dimensoesM.z, caixaB.posicaoM.z, caixaB.dimensoesM.z);
  if (sobreposicaoZ < penetracaoM) {
    return { normal: new Vetor3(0, 0, caixaB.posicaoM.z >= caixaA.posicaoM.z ? 1 : -1), penetracaoM: Math.max(0, sobreposicaoZ), pontoM: new Vetor3(ponto.x, ponto.y, z) };
  }
  return { normal: new Vetor3(normal.x, normal.y, 0), penetracaoM: Math.max(0, penetracaoM), pontoM: new Vetor3(ponto.x, ponto.y, z) };
}

function obterVertices2D(caixa: CaixaOrientada): Ponto2D[] {
  const metadeX = caixa.dimensoesM.x / 2;
  const metadeY = caixa.dimensoesM.y / 2;
  const c = Math.cos(caixa.orientacaoZRad);
  const s = Math.sin(caixa.orientacaoZRad);
  return [new Vetor3(-metadeX, -metadeY, 0), new Vetor3(metadeX, -metadeY, 0), new Vetor3(metadeX, metadeY, 0), new Vetor3(-metadeX, metadeY, 0)]
    .map((ponto) => ({ x: caixa.posicaoM.x + (ponto.x * c) - (ponto.y * s), y: caixa.posicaoM.y + (ponto.x * s) + (ponto.y * c) }));
}

function obterEixos(vertices: readonly Ponto2D[]): Ponto2D[] {
  return vertices.map((ponto, indice) => {
    const proximo = vertices[(indice + 1) % vertices.length];
    const dx = proximo.x - ponto.x; const dy = proximo.y - ponto.y;
    const modulo = Math.hypot(dx, dy);
    return { x: -dy / modulo, y: dx / modulo };
  });
}

function projetar(vertices: readonly Ponto2D[], eixo: Ponto2D): { minimo: number; maximo: number } {
  const valores = vertices.map((ponto) => (ponto.x * eixo.x) + (ponto.y * eixo.y));
  return { minimo: Math.min(...valores), maximo: Math.max(...valores) };
}

function recortarPoligono(sujeito: readonly Ponto2D[], recortador: readonly Ponto2D[]): Ponto2D[] {
  let resultado = [...sujeito];
  for (let indice = 0; indice < recortador.length && resultado.length > 0; indice += 1) {
    const inicio = recortador[indice]; const fim = recortador[(indice + 1) % recortador.length];
    const entrada = resultado; resultado = [];
    for (let atual = 0; atual < entrada.length; atual += 1) {
      const anterior = entrada[(atual + entrada.length - 1) % entrada.length]; const ponto = entrada[atual];
      const dentro = dentroDaAresta(ponto, inicio, fim); const anteriorDentro = dentroDaAresta(anterior, inicio, fim);
      if (dentro !== anteriorDentro) resultado.push(intersecao(anterior, ponto, inicio, fim));
      if (dentro) resultado.push(ponto);
    }
  }
  return resultado;
}

function dentroDaAresta(ponto: Ponto2D, inicio: Ponto2D, fim: Ponto2D): boolean {
  return ((fim.x - inicio.x) * (ponto.y - inicio.y)) - ((fim.y - inicio.y) * (ponto.x - inicio.x)) >= -1e-9;
}

function intersecao(a: Ponto2D, b: Ponto2D, inicio: Ponto2D, fim: Ponto2D): Ponto2D {
  const dx = b.x - a.x; const dy = b.y - a.y; const ex = fim.x - inicio.x; const ey = fim.y - inicio.y;
  const t = (((inicio.x - a.x) * ey) - ((inicio.y - a.y) * ex)) / ((dx * ey) - (dy * ex));
  return { x: a.x + (t * dx), y: a.y + (t * dy) };
}

function centroide(vertices: readonly Ponto2D[]): Ponto2D {
  const soma = vertices.reduce((acumulado, ponto) => ({ x: acumulado.x + ponto.x, y: acumulado.y + ponto.y }), { x: 0, y: 0 });
  return { x: soma.x / vertices.length, y: soma.y / vertices.length };
}

function obterCentroDaIntersecao(centroA: number, dimensaoA: number, centroB: number, dimensaoB: number): number {
  const inicio = Math.max(centroA - dimensaoA / 2, centroB - dimensaoB / 2);
  const fim = Math.min(centroA + dimensaoA / 2, centroB + dimensaoB / 2);
  return (inicio + fim) / 2;
}
