import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

export interface DefinicaoFixadorEstrutural {
  readonly id: string;
  readonly objetoA: Objeto;
  readonly objetoB: Objeto;
  /** Maior esforço transmitido antes da ruptura, em N. */
  readonly resistenciaTracaoN: number;
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

  public constructor(private readonly definicao: DefinicaoFixadorEstrutural) {
    if (!definicao.id || !Number.isFinite(definicao.resistenciaTracaoN) || definicao.resistenciaTracaoN <= 0) {
      throw new Error('Definição de fixador estrutural inválida.');
    }
    if (definicao.objetoA === definicao.objetoB) throw new Error('Fixador precisa ligar objetos distintos.');
    this.deslocamentoInicialM = definicao.objetoB.getEstadoFisico().posicaoM.subtrair(definicao.objetoA.getEstadoFisico().posicaoM);
    this.orientacaoInicialARad = definicao.objetoA.getEstadoFisico().orientacaoRad;
    this.orientacaoRelativaInicialRad = definicao.objetoB.getEstadoFisico().orientacaoRad.subtrair(definicao.objetoA.getEstadoFisico().orientacaoRad);
  }

  public get id(): string { return this.definicao.id; }
  public get estaRompido(): boolean { return this.rompido; }
  public get resistenciaTracaoN(): number { return this.definicao.resistenciaTracaoN; }
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
  public prepararPasso(): void {
    if (this.rompido) return;
    if (Math.abs(this.definicao.obterEsforcoSolicitadoN()) > this.definicao.resistenciaTracaoN) this.rompido = true;
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
