import type { EstadoFisico } from '../objetos/base/Objeto';
import { Objeto } from '../objetos/base/Objeto';
import type { ForcaAplicada } from '../solucionadores/IntegradorFisico';
import { Vetor3 } from '../Vetor3';

/** Estado de uma ilha de corpos unidos por vínculos rígidos no plano XY. */
export class ConjuntoEstruturalRigido {
  private readonly referenciasLocaisM = new Map<Objeto, Vetor3>();
  private readonly orientacoesRelativasRad = new Map<Objeto, Vetor3>();
  private readonly estadosDeMontagem = new Map<Objeto, EstadoFisico>();
  private anguloDoConjuntoRad: number;

  public constructor(private readonly objetos: readonly Objeto[]) {
    const objetoDeReferencia = objetos[0];
    const anguloInicial = objetoDeReferencia.getEstadoFisico().orientacaoRad.z;
    this.anguloDoConjuntoRad = anguloInicial;
    const centroMassa = this.obterCentroDeMassaAtual();
    for (const objeto of objetos) {
      const estado = objeto.getEstadoFisico();
      this.estadosDeMontagem.set(objeto, estado);
      this.referenciasLocaisM.set(objeto, this.rotacionarNoPlano(estado.posicaoM.subtrair(centroMassa), -anguloInicial));
      this.orientacoesRelativasRad.set(objeto, estado.orientacaoRad.subtrair(new Vetor3(0, 0, anguloInicial)));
    }
  }

  /**
   * Conserva momento linear e angular de todos os membros simultaneamente.
   * Avançar o ângulo só ocorre uma vez por passo; após colisões, a projeção
   * reaplica a rigidez sem introduzir avanço angular duplicado.
   */
  public sincronizar(dtS: number, avancarOrientacao: boolean): void {
    const centroMassa = this.obterCentroDeMassaAtual();
    const massaTotalKg = this.objetos.reduce((soma, objeto) => soma + objeto.massaKg, 0);
    const velocidadeDoCentroMps = this.objetos.reduce(
      (soma, objeto) => soma.adicionar(objeto.getEstadoFisico().velocidadeMps.multiplicar(objeto.massaKg / massaTotalKg)),
      Vetor3.zero,
    );
    const inerciaZ = this.obterInerciaCompostaZ();
    const momentoAngularZ = this.objetos.reduce((soma, objeto) => {
      const estado = objeto.getEstadoFisico();
      const braco = estado.posicaoM.subtrair(centroMassa);
      return soma + braco.produtoVetorial(estado.velocidadeMps.multiplicar(objeto.massaKg)).z
        + objeto.getMomentoInerciaKgM2().z * estado.velocidadeAngularRadps.z;
    }, 0);
    const velocidadeAngularZ = momentoAngularZ / inerciaZ;
    if (avancarOrientacao) this.anguloDoConjuntoRad += velocidadeAngularZ * dtS;
    const velocidadeAngular = new Vetor3(0, 0, velocidadeAngularZ);

    for (const objeto of this.objetos) {
      const estadoAnterior = objeto.getEstadoFisico();
      const referenciaLocal = this.referenciasLocaisM.get(objeto)!;
      const braco = this.rotacionarNoPlano(referenciaLocal, this.anguloDoConjuntoRad);
      const velocidadeTangencial = new Vetor3(-velocidadeAngularZ * braco.y, velocidadeAngularZ * braco.x, 0);
      const orientacaoRelativa = this.orientacoesRelativasRad.get(objeto)!;
      objeto.atualizarEstadoPeloCore({
        ...estadoAnterior,
        posicaoM: centroMassa.adicionar(braco),
        velocidadeMps: velocidadeDoCentroMps.adicionar(velocidadeTangencial),
        orientacaoRad: new Vetor3(orientacaoRelativa.x, orientacaoRelativa.y, orientacaoRelativa.z + this.anguloDoConjuntoRad),
        velocidadeAngularRadps: velocidadeAngular,
      });
    }
  }

  public contem(objeto: Objeto): boolean { return this.objetos.includes(objeto); }

  public get membros(): readonly Objeto[] { return this.objetos; }

  /** Reação da fundação rígida: preserva a geometria montada da ilha inteira. */
  public restringirAoSolo(): void {
    for (const objeto of this.objetos) objeto.atualizarEstadoPeloCore(this.estadosDeMontagem.get(objeto)!);
  }

  public get massaTotalKg(): number {
    return this.objetos.reduce((soma, objeto) => soma + objeto.massaKg, 0);
  }

  /** Massa dinâmica vista em um ponto e direção de contato do conjunto inteiro. */
  public obterMassaEfetivaNoContato(pontoContatoM: Vetor3, normal: Vetor3): number {
    const massaTotalKg = this.massaTotalKg;
    const braco = pontoContatoM.subtrair(this.obterCentroDeMassaAtual());
    const torqueUnitarioZ = braco.produtoVetorial(normal).z;
    return 1 / ((1 / massaTotalKg) + (torqueUnitarioZ ** 2 / this.obterInerciaCompostaZ()));
  }

  public obterCentroDeMassaAtual(): Vetor3 {
    const massaTotalKg = this.massaTotalKg;
    return this.objetos.reduce(
      (soma, objeto) => soma.adicionar(objeto.getEstadoFisico().posicaoM.multiplicar(objeto.massaKg / massaTotalKg)),
      Vetor3.zero,
    );
  }

  /** Velocidade física do corpo rígido no ponto de contato informado. */
  public obterVelocidadeNoPonto(pontoM: Vetor3): Vetor3 {
    const centroMassa = this.obterCentroDeMassaAtual();
    const velocidadeCentro = this.obterVelocidadeDoCentroAtual();
    const velocidadeAngular = new Vetor3(0, 0, this.obterVelocidadeAngularAtual(centroMassa));
    return velocidadeCentro.adicionar(velocidadeAngular.produtoVetorial(pontoM.subtrair(centroMassa)));
  }

  /** Aplica impulso diretamente à ilha, preservando a rigidez de seus membros. */
  public aplicarImpulsoNoPonto(impulsoNs: Vetor3, pontoM: Vetor3): void {
    const centroMassa = this.obterCentroDeMassaAtual();
    const velocidadeCentro = this.obterVelocidadeDoCentroAtual();
    const inerciaZ = this.obterInerciaCompostaZ();
    const velocidadeAngularZ = this.obterVelocidadeAngularAtual(centroMassa);
    const proximaVelocidadeCentro = velocidadeCentro.adicionar(impulsoNs.multiplicar(1 / this.massaTotalKg));
    const proximaVelocidadeAngularZ = velocidadeAngularZ + pontoM.subtrair(centroMassa).produtoVetorial(impulsoNs).z / inerciaZ;
    const proximaVelocidadeAngular = new Vetor3(0, 0, proximaVelocidadeAngularZ);
    for (const objeto of this.objetos) {
      const estado = objeto.getEstadoFisico();
      const braco = estado.posicaoM.subtrair(centroMassa);
      objeto.atualizarEstadoPeloCore({
        ...estado,
        velocidadeMps: proximaVelocidadeCentro.adicionar(proximaVelocidadeAngular.produtoVetorial(braco)),
        velocidadeAngularRadps: proximaVelocidadeAngular,
      });
    }
  }

  /** Corrige penetração por translação da ilha inteira, nunca de um membro isolado. */
  public corrigirPenetracao(normal: Vetor3, penetracaoM: number): void {
    const deslocamentoM = normal.multiplicar(penetracaoM);
    for (const objeto of this.objetos) {
      const estado = objeto.getEstadoFisico();
      objeto.atualizarEstadoPeloCore({ ...estado, posicaoM: estado.posicaoM.adicionar(deslocamentoM) });
    }
  }

  /** Integra todas as forças externas como uma única resultante do corpo rígido. */
  public integrar(forcas: readonly ForcaAplicada[], dtS: number): void {
    const centroMassa = this.obterCentroDeMassaAtual();
    const resultanteN = forcas.reduce((soma, forca) => soma.adicionar(forca.forcaN), Vetor3.zero);
    const torqueZ = forcas.reduce((soma, forca) => soma + forca.pontoM.subtrair(centroMassa).produtoVetorial(forca.forcaN).z, 0);
    const velocidadeCentro = this.obterVelocidadeDoCentroAtual().adicionar(resultanteN.multiplicar(dtS / this.massaTotalKg));
    const proximoCentroMassa = centroMassa.adicionar(velocidadeCentro.multiplicar(dtS));
    const velocidadeAngularZ = this.obterVelocidadeAngularAtual(centroMassa) + torqueZ * dtS / this.obterInerciaCompostaZ();
    this.anguloDoConjuntoRad += velocidadeAngularZ * dtS;
    const velocidadeAngular = new Vetor3(0, 0, velocidadeAngularZ);
    for (const objeto of this.objetos) {
      const estadoAnterior = objeto.getEstadoFisico();
      const referenciaLocal = this.referenciasLocaisM.get(objeto)!;
      const braco = this.rotacionarNoPlano(referenciaLocal, this.anguloDoConjuntoRad);
      const orientacaoRelativa = this.orientacoesRelativasRad.get(objeto)!;
      objeto.atualizarEstadoPeloCore({
        ...estadoAnterior,
        posicaoM: proximoCentroMassa.adicionar(braco),
        velocidadeMps: velocidadeCentro.adicionar(velocidadeAngular.produtoVetorial(braco)),
        orientacaoRad: new Vetor3(orientacaoRelativa.x, orientacaoRelativa.y, orientacaoRelativa.z + this.anguloDoConjuntoRad),
        velocidadeAngularRadps: velocidadeAngular,
      });
    }
  }

  private obterVelocidadeDoCentroAtual(): Vetor3 {
    return this.objetos.reduce(
      (soma, objeto) => soma.adicionar(objeto.getEstadoFisico().velocidadeMps.multiplicar(objeto.massaKg / this.massaTotalKg)),
      Vetor3.zero,
    );
  }

  private obterVelocidadeAngularAtual(centroMassa: Vetor3): number {
    const momentoAngularZ = this.objetos.reduce((soma, objeto) => {
      const estado = objeto.getEstadoFisico();
      const braco = estado.posicaoM.subtrair(centroMassa);
      return soma + braco.produtoVetorial(estado.velocidadeMps.multiplicar(objeto.massaKg)).z
        + objeto.getMomentoInerciaKgM2().z * estado.velocidadeAngularRadps.z;
    }, 0);
    return momentoAngularZ / this.obterInerciaCompostaZ();
  }

  private obterInerciaCompostaZ(): number {
    return this.objetos.reduce((soma, objeto) => {
      const referenciaLocal = this.referenciasLocaisM.get(objeto)!;
      return soma + objeto.getMomentoInerciaKgM2().z + objeto.massaKg * referenciaLocal.magnitude ** 2;
    }, 0);
  }

  private rotacionarNoPlano(vetor: Vetor3, anguloRad: number): Vetor3 {
    const cos = Math.cos(anguloRad);
    const sen = Math.sin(anguloRad);
    return new Vetor3(vetor.x * cos - vetor.y * sen, vetor.x * sen + vetor.y * cos, vetor.z);
  }
}
