import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

export interface DefinicaoFixadorEstrutural {
  readonly id: string;
  readonly objetoA: Objeto;
  readonly objetoB: Objeto;
  /** Maior esforço transmitido antes da ruptura, em N. */
  readonly resistenciaTracaoN: number;
  /** Resistência à compressão em N; ausente quando o vínculo só declara tração. */
  readonly resistenciaCompressaoN?: number;
  readonly limiteTermicoC?: number;
  readonly temperaturaInicialC?: number;
  readonly capacidadeTermicaJPorC?: number;
  readonly condutanciaTermicaWPorC?: number;
  /** Esforço solicitado pela operação que o fixador precisa transmitir. */
  readonly obterEsforcoSolicitadoN: () => number;
}

/** Conexão rígida simples que falha por esforço e preserva o conjunto físico. */
export class FixadorEstrutural {
  private rompido = false;
  private readonly deslocamentoInicialM: Vetor3;
  private readonly orientacaoInicialARad: Vetor3;
  private readonly orientacaoRelativaInicialRad: Vetor3;
  /** Rotação planar do conjunto em torno do seu centro de massa. */
  private rotacaoDoConjuntoRad = 0;
  private temperaturaAtualC: number;
  private esforcoFisicoAtualN = 0;
  private maiorEsforcoFisicoRegistradoN = 0;
  private esforcoCompressaoAtualN = 0;
  private maiorEsforcoCompressaoRegistradoN = 0;

  public constructor(private readonly definicao: DefinicaoFixadorEstrutural) {
    if (!definicao.id || !Number.isFinite(definicao.resistenciaTracaoN) || definicao.resistenciaTracaoN <= 0) {
      throw new Error('Definição de fixador estrutural inválida.');
    }
    if (definicao.resistenciaCompressaoN !== undefined
      && (!Number.isFinite(definicao.resistenciaCompressaoN) || definicao.resistenciaCompressaoN <= 0)) {
      throw new Error('Resistência à compressão do fixador inválida.');
    }
    if (definicao.objetoA === definicao.objetoB) throw new Error('Fixador precisa ligar objetos distintos.');
    this.deslocamentoInicialM = definicao.objetoB.getEstadoFisico().posicaoM.subtrair(definicao.objetoA.getEstadoFisico().posicaoM);
    this.orientacaoInicialARad = definicao.objetoA.getEstadoFisico().orientacaoRad;
    this.orientacaoRelativaInicialRad = definicao.objetoB.getEstadoFisico().orientacaoRad.subtrair(definicao.objetoA.getEstadoFisico().orientacaoRad);
    this.temperaturaAtualC = definicao.temperaturaInicialC ?? 20;
  }

  public get id(): string { return this.definicao.id; }
  public get estaRompido(): boolean { return this.rompido; }
  public get resistenciaTracaoN(): number { return this.definicao.resistenciaTracaoN; }
  public get temperaturaC(): number { return this.temperaturaAtualC; }
  public get limiteTermicoC(): number { return this.definicao.limiteTermicoC ?? 500; }
  public get resistenciaTracaoEfetivaN(): number {
    if (this.temperaturaAtualC <= this.limiteTermicoC) return this.resistenciaTracaoN;
    return Math.max(0, this.resistenciaTracaoN * (1 - (this.temperaturaAtualC - this.limiteTermicoC) / 200));
  }
  /** Maior esforço físico transmitido pelo core no passo atual, em N. */
  public get esforcoFisicoSolicitadoN(): number { return this.esforcoFisicoAtualN; }
  /** Pico de esforço físico desde a criação do fixador, em N. */
  public get picoEsforcoFisicoN(): number { return this.maiorEsforcoFisicoRegistradoN; }
  /** Maior compressão física transmitida pelo core desde a criação, em N. */
  public get picoEsforcoCompressaoFisicoN(): number { return this.maiorEsforcoCompressaoRegistradoN; }
  public get objetoA(): Objeto { return this.definicao.objetoA; }
  public get objetoB(): Objeto { return this.definicao.objetoB; }

  /**
   * Massa efetiva do conjunto rígido no ponto de contato plano. Ela inclui
   * translação de ambas as massas e a inércia composta em torno do centro de
   * massa; é usada pelo core para medir energia de impacto sem subestimá-la.
   */
  public obterMassaEfetivaNoContato(objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3): number | undefined {
    if (this.rompido || (objeto !== this.objetoA && objeto !== this.objetoB)) return undefined;
    const estadoA = this.objetoA.getEstadoFisico();
    const estadoB = this.objetoB.getEstadoFisico();
    const massaA = this.objetoA.massaKg;
    const massaB = this.objetoB.massaKg;
    const massaTotal = massaA + massaB;
    const centroMassa = estadoA.posicaoM.multiplicar(massaA / massaTotal).adicionar(estadoB.posicaoM.multiplicar(massaB / massaTotal));
    const bracoA = estadoA.posicaoM.subtrair(centroMassa);
    const bracoB = estadoB.posicaoM.subtrair(centroMassa);
    const inerciaCompostaZ = this.objetoA.getMomentoInerciaKgM2().z + massaA * bracoA.magnitude ** 2
      + this.objetoB.getMomentoInerciaKgM2().z + massaB * bracoB.magnitude ** 2;
    const torqueUnitarioZ = pontoContatoM.subtrair(centroMassa).produtoVetorial(normal).z;
    return 1 / ((1 / massaTotal) + (torqueUnitarioZ ** 2 / inerciaCompostaZ));
  }

  /** Avaliado pelo core após a preparação operacional e antes da integração. */
  public prepararPasso(dtS = 0): void {
    if (this.rompido) return;
    this.esforcoFisicoAtualN = 0;
    this.esforcoCompressaoAtualN = 0;
    if (dtS > 0) {
      const mediaC = (this.objetoA.temperaturaC + this.objetoB.temperaturaC) / 2;
      const condutancia = this.definicao.condutanciaTermicaWPorC ?? 100;
      const capacidade = this.definicao.capacidadeTermicaJPorC ?? 10_000;
      this.temperaturaAtualC += (condutancia * (mediaC - this.temperaturaAtualC) * dtS) / capacidade;
    }
    if (Math.abs(this.definicao.obterEsforcoSolicitadoN()) > this.resistenciaTracaoEfetivaN) this.rompido = true;
  }

  /** Recebe o esforço calculado pelo core a partir de um impulso de contato. */
  public registrarEsforcoFisicoN(esforcoN: number): void {
    if (!Number.isFinite(esforcoN) || esforcoN < 0) throw new Error('Esforço físico do fixador inválido.');
    if (this.rompido) return;
    this.esforcoFisicoAtualN = Math.max(this.esforcoFisicoAtualN, esforcoN);
    this.maiorEsforcoFisicoRegistradoN = Math.max(this.maiorEsforcoFisicoRegistradoN, esforcoN);
    if (this.esforcoFisicoAtualN > this.resistenciaTracaoEfetivaN) this.rompido = true;
  }

  /** Recebe a compressão axial calculada pelo core quando essa capacidade foi declarada. */
  public registrarEsforcoDeCompressaoFisicoN(esforcoN: number): void {
    if (!Number.isFinite(esforcoN) || esforcoN < 0) throw new Error('Esforço físico do fixador inválido.');
    if (this.rompido || this.definicao.resistenciaCompressaoN === undefined) return;
    this.esforcoCompressaoAtualN = Math.max(this.esforcoCompressaoAtualN, esforcoN);
    this.maiorEsforcoCompressaoRegistradoN = Math.max(this.maiorEsforcoCompressaoRegistradoN, esforcoN);
    const fatorTermico = this.resistenciaTracaoEfetivaN / this.resistenciaTracaoN;
    if (this.esforcoCompressaoAtualN > this.definicao.resistenciaCompressaoN * fatorTermico) this.rompido = true;
  }

  /**
   * Mantém um conjunto rígido planar, conservando momento linear e angular.
   * A representação atual do core usa a rotação Z para os vínculos físicos
   * visualizados em 2D; uma futura extensão 3D poderá substituir esta parte
   * por tensor de inércia e orientação espacial.
   */
  public aplicarRestricao(dtS: number): void {
    if (this.rompido) return;
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo temporal do fixador inválido.');
    const estadoA = this.objetoA.getEstadoFisico();
    const estadoB = this.objetoB.getEstadoFisico();
    const massaA = this.objetoA.massaKg;
    const massaB = this.objetoB.massaKg;
    const massaTotal = massaA + massaB;
    const centroMassa = estadoA.posicaoM.multiplicar(massaA / massaTotal).adicionar(estadoB.posicaoM.multiplicar(massaB / massaTotal));
    const velocidade = estadoA.velocidadeMps.multiplicar(massaA / massaTotal).adicionar(estadoB.velocidadeMps.multiplicar(massaB / massaTotal));
    const bracoA = estadoA.posicaoM.subtrair(centroMassa);
    const bracoB = estadoB.posicaoM.subtrair(centroMassa);
    const momentoAngularZ =
      bracoA.produtoVetorial(estadoA.velocidadeMps.multiplicar(massaA)).z + this.objetoA.getMomentoInerciaKgM2().z * estadoA.velocidadeAngularRadps.z +
      bracoB.produtoVetorial(estadoB.velocidadeMps.multiplicar(massaB)).z + this.objetoB.getMomentoInerciaKgM2().z * estadoB.velocidadeAngularRadps.z;
    const inerciaCompostaZ =
      this.objetoA.getMomentoInerciaKgM2().z + massaA * bracoA.magnitude ** 2 +
      this.objetoB.getMomentoInerciaKgM2().z + massaB * bracoB.magnitude ** 2;
    const velocidadeAngularZ = momentoAngularZ / inerciaCompostaZ;
    this.rotacaoDoConjuntoRad += velocidadeAngularZ * dtS;
    const deslocamentoRotacionado = this.rotacionarNoPlano(this.deslocamentoInicialM, this.rotacaoDoConjuntoRad);
    const posicaoA = centroMassa.subtrair(deslocamentoRotacionado.multiplicar(massaB / massaTotal));
    const posicaoB = centroMassa.adicionar(deslocamentoRotacionado.multiplicar(massaA / massaTotal));
    const bracoCorrigidoA = posicaoA.subtrair(centroMassa);
    const bracoCorrigidoB = posicaoB.subtrair(centroMassa);
    const velocidadeAngular = new Vetor3(0, 0, velocidadeAngularZ);
    const velocidadeA = velocidade.adicionar(new Vetor3(-velocidadeAngularZ * bracoCorrigidoA.y, velocidadeAngularZ * bracoCorrigidoA.x, 0));
    const velocidadeB = velocidade.adicionar(new Vetor3(-velocidadeAngularZ * bracoCorrigidoB.y, velocidadeAngularZ * bracoCorrigidoB.x, 0));
    const orientacaoA = new Vetor3(this.orientacaoInicialARad.x, this.orientacaoInicialARad.y, this.orientacaoInicialARad.z + this.rotacaoDoConjuntoRad);
    const orientacaoB = orientacaoA.adicionar(this.orientacaoRelativaInicialRad);
    this.objetoA.atualizarEstadoPeloCore({
      ...estadoA,
      posicaoM: posicaoA,
      velocidadeMps: velocidadeA,
      velocidadeAngularRadps: velocidadeAngular,
      orientacaoRad: orientacaoA,
    });
    this.objetoB.atualizarEstadoPeloCore({
      ...estadoB,
      posicaoM: posicaoB,
      velocidadeMps: velocidadeB,
      velocidadeAngularRadps: velocidadeAngular,
      orientacaoRad: orientacaoB,
    });
  }

  private rotacionarNoPlano(vetor: Vetor3, anguloRad: number): Vetor3 {
    const cos = Math.cos(anguloRad);
    const sen = Math.sin(anguloRad);
    return new Vetor3(vetor.x * cos - vetor.y * sen, vetor.x * sen + vetor.y * cos, vetor.z);
  }
}
