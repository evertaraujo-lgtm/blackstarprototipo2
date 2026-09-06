import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { obterContatoCaixasOrientadas, type CaixaOrientada } from '../geometria/ContatoCaixasOrientadas';
import { ConjuntoEstruturalRigido } from '../estruturas/ConjuntoEstruturalRigido';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { ResolvedorEsforcoEstrutural } from './ResolvedorEsforcoEstrutural';

export interface ContextoResolvedorColisoes {
  readonly obterObjetos: () => Iterable<Objeto>;
  readonly obterConjuntoEstrutural: (objeto: Objeto) => ConjuntoEstruturalRigido | undefined;
  readonly obterFixadores: () => Iterable<FixadorEstrutural>;
  readonly resolvedorEsforcoEstrutural: ResolvedorEsforcoEstrutural;
  readonly distribuirCalorDeAtrito: (objetoA: Objeto, objetoB: Objeto, energiaJ: number, dtS: number) => void;
  readonly velocidadeDeRepousoMps: number;
}

/** Descobre contatos entre objetos e aplica sua resposta impulsiva. */
export class ResolvedorColisoes {
  public constructor(private readonly contexto: ContextoResolvedorColisoes) {}

  public resolver(dtS: number): void {
    const objetos = [...this.contexto.obterObjetos()];
    for (let indiceA = 0; indiceA < objetos.length; indiceA += 1) {
      for (let indiceB = indiceA + 1; indiceB < objetos.length; indiceB += 1) {
        const objetoA = objetos[indiceA];
        const objetoB = objetos[indiceB];
        if (this.estaoNaMesmaIlhaEstrutural(objetoA, objetoB)) continue;
        const usarGeometriaEspecifica = objetoA.getEstadoFisico().orientacaoRad.z !== 0 || objetoB.getEstadoFisico().orientacaoRad.z !== 0;
        const contato = obterContatoCaixasOrientadas(this.obterCaixa(objetoA, usarGeometriaEspecifica), this.obterCaixa(objetoB, usarGeometriaEspecifica));
        if (contato && contato.penetracaoM > 0) {
          this.resolverContato(objetoA, objetoB, contato.normal, contato.penetracaoM, contato.pontoM, dtS);
        }
      }
    }
  }

  private obterCaixa(objeto: Objeto, usarGeometriaEspecifica: boolean): CaixaOrientada {
    const estado = objeto.getEstadoFisico();
    return {
      posicaoM: estado.posicaoM,
      dimensoesM: objeto.dimensoesM,
      orientacaoZRad: estado.orientacaoRad.z,
      ...(usarGeometriaEspecifica ? { verticesLocais2D: objeto.getVerticesColisaoLocais2D().map((ponto) => ({ x: ponto.x, y: ponto.y })) } : {}),
    };
  }

  private estaoNaMesmaIlhaEstrutural(objetoA: Objeto, objetoB: Objeto): boolean {
    const conjuntoA = this.contexto.obterConjuntoEstrutural(objetoA);
    return conjuntoA !== undefined && conjuntoA === this.contexto.obterConjuntoEstrutural(objetoB);
  }

  private resolverContato(objetoA: Objeto, objetoB: Objeto, normal: Vetor3, penetracaoM: number, pontoContatoM: Vetor3, dtS: number): void {
    const estadoA = objetoA.getEstadoFisico();
    const estadoB = objetoB.getEstadoFisico();
    const inversoMassaA = 1 / objetoA.massaKg;
    const inversoMassaB = 1 / objetoB.massaKg;
    const somaInversos = inversoMassaA + inversoMassaB;
    if (somaInversos === 0) return;
    const bracoA = pontoContatoM.subtrair(estadoA.posicaoM);
    const bracoB = pontoContatoM.subtrair(estadoB.posicaoM);
    const velocidadeContatoA = estadoA.velocidadeMps.adicionar(estadoA.velocidadeAngularRadps.produtoVetorial(bracoA));
    const velocidadeContatoB = estadoB.velocidadeMps.adicionar(estadoB.velocidadeAngularRadps.produtoVetorial(bracoB));
    const velocidadeRelativa = velocidadeContatoB.subtrair(velocidadeContatoA);
    const velocidadeNormal = velocidadeRelativa.produtoEscalar(normal);

    let velocidadeA = estadoA.velocidadeMps;
    let velocidadeB = estadoB.velocidadeMps;
    let velocidadeAngularA = estadoA.velocidadeAngularRadps;
    let velocidadeAngularB = estadoB.velocidadeAngularRadps;
    let impulsoNormalNs = 0;
    if (velocidadeNormal < 0) {
      const restitituicao = this.calcularRestituicao(objetoA, objetoB, velocidadeNormal);
      const inerciaA = objetoA.getMomentoInerciaKgM2();
      const inerciaB = objetoB.getMomentoInerciaKgM2();
      const torqueUnitarioA = bracoA.produtoVetorial(normal);
      const torqueUnitarioB = bracoB.produtoVetorial(normal);
      const termoAngular = this.obterTermoAngular(torqueUnitarioA, inerciaA) + this.obterTermoAngular(torqueUnitarioB, inerciaB);
      impulsoNormalNs = -((1 + restitituicao) * velocidadeNormal) / (somaInversos + termoAngular);
      const impulso = normal.multiplicar(impulsoNormalNs);
      velocidadeA = velocidadeA.subtrair(impulso.multiplicar(inversoMassaA));
      velocidadeB = velocidadeB.adicionar(impulso.multiplicar(inversoMassaB));
      velocidadeAngularA = velocidadeAngularA.subtrair(this.calcularVariacaoAngular(bracoA, impulso, inerciaA));
      velocidadeAngularB = velocidadeAngularB.adicionar(this.calcularVariacaoAngular(bracoB, impulso, inerciaB));

      const massaReduzida = (objetoA.massaKg * objetoB.massaKg) / (objetoA.massaKg + objetoB.massaKg);
      const energiaImpactoJ = 0.5 * massaReduzida * velocidadeNormal ** 2;
      objetoA.aplicarDanoPorImpacto(energiaImpactoJ);
      objetoB.aplicarDanoPorImpacto(energiaImpactoJ);
      const conjuntoA = this.contexto.obterConjuntoEstrutural(objetoA);
      const conjuntoB = this.contexto.obterConjuntoEstrutural(objetoB);
      if (conjuntoA) this.contexto.resolvedorEsforcoEstrutural.registrarImpulsoDeContato(
        objetoA, conjuntoA.membros, impulsoNormalNs, normal.multiplicar(-1), dtS, this.contexto.obterFixadores(),
      );
      if (conjuntoB) this.contexto.resolvedorEsforcoEstrutural.registrarImpulsoDeContato(
        objetoB, conjuntoB.membros, impulsoNormalNs, normal, dtS, this.contexto.obterFixadores(),
      );
    }

    // O atrito entre objetos cobre apoio sobre faces quase horizontais.
    const velocidadeContatoAtualA = velocidadeA.adicionar(velocidadeAngularA.produtoVetorial(bracoA));
    const velocidadeContatoAtualB = velocidadeB.adicionar(velocidadeAngularB.produtoVetorial(bracoB));
    const velocidadeRelativaAtual = velocidadeContatoAtualB.subtrair(velocidadeContatoAtualA);
    const velocidadeTangencial = velocidadeRelativaAtual.subtrair(normal.multiplicar(velocidadeRelativaAtual.produtoEscalar(normal)));
    if (Math.abs(normal.y) >= 0.95 && velocidadeTangencial.magnitude > 1e-9 && impulsoNormalNs > 0) {
      const direcaoAtrito = velocidadeTangencial.multiplicar(1 / velocidadeTangencial.magnitude);
      const inerciaA = objetoA.getMomentoInerciaKgM2();
      const inerciaB = objetoB.getMomentoInerciaKgM2();
      const massaInversaEfetiva = somaInversos
        + this.obterTermoAngular(bracoA.produtoVetorial(direcaoAtrito), inerciaA)
        + this.obterTermoAngular(bracoB.produtoVetorial(direcaoAtrito), inerciaB);
      const impulsoNecessarioNs = velocidadeTangencial.magnitude / massaInversaEfetiva;
      const limiteAtritoNs = Math.min(objetoA.coeficienteAtritoEntreObjetos, objetoB.coeficienteAtritoEntreObjetos) * impulsoNormalNs;
      const impulsoAtrito = direcaoAtrito.multiplicar(Math.min(impulsoNecessarioNs, limiteAtritoNs));
      const energiaDissipadaJ = this.calcularEnergiaDissipadaPorAtrito(impulsoAtrito.magnitude, velocidadeTangencial.magnitude, massaInversaEfetiva);
      this.contexto.distribuirCalorDeAtrito(objetoA, objetoB, energiaDissipadaJ, dtS);
      velocidadeA = velocidadeA.adicionar(impulsoAtrito.multiplicar(inversoMassaA));
      velocidadeB = velocidadeB.subtrair(impulsoAtrito.multiplicar(inversoMassaB));
      velocidadeAngularA = velocidadeAngularA.adicionar(this.calcularVariacaoAngular(bracoA, impulsoAtrito, inerciaA));
      velocidadeAngularB = velocidadeAngularB.subtrair(this.calcularVariacaoAngular(bracoB, impulsoAtrito, inerciaB));
    }

    const correcao = normal.multiplicar(penetracaoM / somaInversos);
    objetoA.atualizarEstadoPeloCore({
      ...estadoA,
      posicaoM: estadoA.posicaoM.subtrair(correcao.multiplicar(inversoMassaA)),
      velocidadeMps: velocidadeA,
      velocidadeAngularRadps: velocidadeAngularA,
    });
    objetoB.atualizarEstadoPeloCore({
      ...estadoB,
      posicaoM: estadoB.posicaoM.adicionar(correcao.multiplicar(inversoMassaB)),
      velocidadeMps: velocidadeB,
      velocidadeAngularRadps: velocidadeAngularB,
    });
  }

  private obterTermoAngular(torqueUnitario: Vetor3, inercia: Vetor3): number {
    return (torqueUnitario.x ** 2 / inercia.x) + (torqueUnitario.y ** 2 / inercia.y) + (torqueUnitario.z ** 2 / inercia.z);
  }

  private calcularVariacaoAngular(braco: Vetor3, impulso: Vetor3, inercia: Vetor3): Vetor3 {
    const torque = braco.produtoVetorial(impulso);
    return new Vetor3(torque.x / inercia.x, torque.y / inercia.y, torque.z / inercia.z);
  }

  private calcularEnergiaDissipadaPorAtrito(impulsoNs: number, velocidadeTangencialMps: number, massaInversaEfetiva: number): number {
    const velocidadeFinalMps = Math.max(0, velocidadeTangencialMps - impulsoNs * massaInversaEfetiva);
    return Math.max(0, impulsoNs * (velocidadeTangencialMps + velocidadeFinalMps) / 2);
  }

  private calcularRestituicao(objetoA: Objeto, objetoB: Objeto, velocidadeNormalMps: number): number {
    const massaReduzida = (objetoA.massaKg * objetoB.massaKg) / (objetoA.massaKg + objetoB.massaKg);
    const energiaImpactoJ = 0.5 * massaReduzida * velocidadeNormalMps ** 2;
    return this.calcularRestituicaoPorEnergia(energiaImpactoJ, objetoA.resistenciaColisaoJ, objetoB.resistenciaColisaoJ, objetoA.dissipacaoImpacto, objetoB.dissipacaoImpacto);
  }

  private calcularRestituicaoPorEnergia(energiaImpactoJ: number, resistenciaA: number, resistenciaB: number, dissipacaoA: number, dissipacaoB: number): number {
    if (energiaImpactoJ === 0) return 0;
    const capacidadeDeRetorno = Math.min(1, Math.min(resistenciaA, resistenciaB) / energiaImpactoJ);
    const dissipacaoCombinada = 1 - ((1 - dissipacaoA) * (1 - dissipacaoB));
    return capacidadeDeRetorno * (1 - dissipacaoCombinada);
  }
}
