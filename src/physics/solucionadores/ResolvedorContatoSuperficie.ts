import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { ConjuntoEstruturalRigido } from '../estruturas/ConjuntoEstruturalRigido';
import { Objeto } from '../objetos/base/Objeto';
import { SuperficiePlano } from '../SuperficiePlano';
import { Vetor3 } from '../Vetor3';
import { ResolvedorEsforcoEstrutural } from './ResolvedorEsforcoEstrutural';

export interface ContextoResolvedorContatoSuperficie {
  readonly obterObjetos: () => Iterable<Objeto>;
  readonly obterSuperficies: () => Iterable<SuperficiePlano>;
  readonly obterConjuntoEstrutural: (objeto: Objeto) => ConjuntoEstruturalRigido | undefined;
  readonly obterMassaEfetivaNoContato: (objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3) => number | undefined;
  readonly obterFixadores: () => Iterable<FixadorEstrutural>;
  readonly resolvedorEsforcoEstrutural: ResolvedorEsforcoEstrutural;
  readonly distribuirCalorDeAtrito: (objeto: Objeto, superficie: SuperficiePlano, energiaJ: number, dtS: number) => void;
  readonly gravidadeMps2: Vetor3;
  readonly velocidadeDeRepousoMps: number;
}

/** Resolve apoio, impacto, atrito e dano entre corpos e superfícies. */
export class ResolvedorContatoSuperficie {
  public constructor(private readonly contexto: ContextoResolvedorContatoSuperficie) {}

  public resolver(dtS: number): void {
    for (const superficie of this.contexto.obterSuperficies()) {
      const conjuntosProcessados = new Set<ConjuntoEstruturalRigido>();
      for (const objeto of this.contexto.obterObjetos()) {
        const conjunto = this.contexto.obterConjuntoEstrutural(objeto);
        if (conjunto && conjuntosProcessados.has(conjunto)) continue;
        if (conjunto) conjuntosProcessados.add(conjunto);
        const membros = conjunto?.membros ?? [objeto];
        const cantosPorObjeto = membros.flatMap((membro) => this.obterCantosOrientados(membro).map((canto) => ({ membro, canto })));
        const menorAlturaM = Math.min(...cantosPorObjeto.map(({ canto }) => canto.y));
        const penetracaoM = superficie.alturaM - menorAlturaM;
        if (penetracaoM <= 0) continue;
        const toleranciaM = 1e-9;
        const contatos = cantosPorObjeto.filter(({ canto }) => Math.abs(canto.y - menorAlturaM) <= toleranciaM);
        const cantosDeContato = contatos.map(({ canto }) => canto);
        const mediaDosContatos = cantosDeContato.reduce((soma, canto) => soma.adicionar(canto), Vetor3.zero).multiplicar(1 / cantosDeContato.length);
        const centroMassa = conjunto?.obterCentroDeMassaAtual() ?? objeto.getEstadoFisico().posicaoM;
        const menorX = Math.min(...cantosDeContato.map((canto) => canto.x));
        const maiorX = Math.max(...cantosDeContato.map((canto) => canto.x));
        const pontoContatoM = new Vetor3(Math.max(menorX, Math.min(maiorX, centroMassa.x)), mediaDosContatos.y, mediaDosContatos.z);
        const objetoDeContato = contatos[0].membro;
        if (conjunto) {
          const apoios = [menorX, maiorX]
            .filter((x, indice, valores) => indice === 0 || Math.abs(x - valores[indice - 1]) > toleranciaM)
            .map((x) => new Vetor3(x, mediaDosContatos.y, mediaDosContatos.z));
          apoios.forEach((apoio, indice) => this.resolverContatoDaIlha(
            conjunto, objetoDeContato, superficie, penetracaoM, apoio, dtS, indice === apoios.length - 1,
          ));
        } else {
          this.resolverContatoDoObjeto(objetoDeContato, superficie, penetracaoM, pontoContatoM, dtS);
        }
      }
    }
  }

  private obterCantosOrientados(objeto: Objeto): Vetor3[] {
    const estado = objeto.getEstadoFisico();
    const cosseno = Math.cos(estado.orientacaoRad.z);
    const seno = Math.sin(estado.orientacaoRad.z);
    return objeto.getPontosDeContatoLocaisM().map((ponto) => new Vetor3(
      estado.posicaoM.x + (ponto.x * cosseno) - (ponto.y * seno),
      estado.posicaoM.y + (ponto.x * seno) + (ponto.y * cosseno),
      estado.posicaoM.z + ponto.z,
    ));
  }

  private resolverContatoDaIlha(
    conjunto: ConjuntoEstruturalRigido,
    objetoDeContato: Objeto,
    superficie: SuperficiePlano,
    penetracaoM: number,
    pontoContatoM: Vetor3,
    dtS: number,
    corrigirPenetracao: boolean,
  ): void {
    const normal = new Vetor3(0, 1, 0);
    const velocidadeNormal = conjunto.obterVelocidadeNoPonto(pontoContatoM).produtoEscalar(normal);
    let impulsoNormalNs = 0;
    if (velocidadeNormal < 0) {
      const massaEfetivaKg = conjunto.obterMassaEfetivaNoContato(pontoContatoM, normal);
      const energiaImpactoJ = 0.5 * massaEfetivaKg * velocidadeNormal ** 2;
      const restitituicao = this.calcularRestituicaoDeContato(energiaImpactoJ, objetoDeContato.resistenciaColisaoJ, superficie.resistenciaColisaoJ, objetoDeContato.dissipacaoImpacto, superficie.dissipacaoImpacto, velocidadeNormal);
      impulsoNormalNs = -((1 + restitituicao) * velocidadeNormal) * massaEfetivaKg;
      conjunto.aplicarImpulsoNoPonto(normal.multiplicar(impulsoNormalNs), pontoContatoM);
      objetoDeContato.aplicarDanoPorImpacto(energiaImpactoJ);
      superficie.aplicarDanoPorImpacto(energiaImpactoJ);
      this.contexto.resolvedorEsforcoEstrutural.registrarImpulsoDeContato(objetoDeContato, conjunto.membros, impulsoNormalNs, normal, dtS, this.contexto.obterFixadores());
    }

    if (impulsoNormalNs > 0) {
      const velocidadeNoContato = conjunto.obterVelocidadeNoPonto(pontoContatoM);
      const velocidadeTangencial = velocidadeNoContato.subtrair(normal.multiplicar(velocidadeNoContato.produtoEscalar(normal)));
      if (velocidadeTangencial.magnitude > 1e-9) {
        const direcaoAtrito = velocidadeTangencial.multiplicar(-1 / velocidadeTangencial.magnitude);
        const massaEfetivaTangencialKg = conjunto.obterMassaEfetivaNoContato(pontoContatoM, direcaoAtrito);
        const impulsoNecessarioNs = velocidadeTangencial.magnitude * massaEfetivaTangencialKg;
        const impulsoNormalDeApoioNs = conjunto.massaTotalKg * Math.abs(this.contexto.gravidadeMps2.y) * dtS;
        const apoioNormalNs = Math.max(impulsoNormalNs, impulsoNormalDeApoioNs);
        const coeficienteAtrito = Math.min(objetoDeContato.getCoeficienteAtritoDeContato(), superficie.coeficienteAtritoDinamico);
        const impulsoAtritoNs = Math.min(impulsoNecessarioNs, coeficienteAtrito * apoioNormalNs);
        const energiaDissipadaJ = this.calcularEnergiaDissipadaPorAtrito(impulsoAtritoNs, velocidadeTangencial.magnitude, 1 / massaEfetivaTangencialKg);
        this.contexto.distribuirCalorDeAtrito(objetoDeContato, superficie, energiaDissipadaJ, dtS);
        conjunto.aplicarImpulsoNoPonto(direcaoAtrito.multiplicar(impulsoAtritoNs), pontoContatoM);
      }
    }
    if (corrigirPenetracao) conjunto.corrigirPenetracao(normal, penetracaoM);
  }

  private resolverContatoDoObjeto(objeto: Objeto, superficie: SuperficiePlano, penetracaoM: number, pontoContatoM: Vetor3, dtS: number): void {
    const estado = objeto.getEstadoFisico();
    const normal = new Vetor3(0, 1, 0);
    const braco = pontoContatoM.subtrair(estado.posicaoM);
    const velocidadeContato = estado.velocidadeMps.adicionar(estado.velocidadeAngularRadps.produtoVetorial(braco));
    const velocidadeNormal = velocidadeContato.produtoEscalar(normal);
    const inercia = objeto.getMomentoInerciaKgM2();
    const termoAngular = this.obterTermoAngular(braco.produtoVetorial(normal), inercia);
    let velocidade = estado.velocidadeMps;
    let velocidadeAngular = estado.velocidadeAngularRadps;
    let impulsoNormalNs = 0;

    if (velocidadeNormal < 0) {
      const massaEfetivaDoConjuntoKg = this.contexto.obterMassaEfetivaNoContato(objeto, pontoContatoM, normal);
      const massaParaEnergiaDeImpactoKg = massaEfetivaDoConjuntoKg ?? objeto.massaKg;
      const massaEfetivaDinamicaContatoKg = massaEfetivaDoConjuntoKg ?? (1 / ((1 / objeto.massaKg) + termoAngular));
      const energiaImpactoJ = 0.5 * massaParaEnergiaDeImpactoKg * velocidadeNormal ** 2;
      const restitituicao = this.calcularRestituicaoDeContato(energiaImpactoJ, objeto.resistenciaColisaoJ, superficie.resistenciaColisaoJ, objeto.dissipacaoImpacto, superficie.dissipacaoImpacto, velocidadeNormal);
      impulsoNormalNs = -((1 + restitituicao) * velocidadeNormal) * massaEfetivaDinamicaContatoKg;
      const impulso = normal.multiplicar(impulsoNormalNs);
      velocidade = velocidade.adicionar(impulso.multiplicar(1 / objeto.massaKg));
      velocidadeAngular = velocidadeAngular.adicionar(this.calcularVariacaoAngular(braco, impulso, inercia));
      objeto.aplicarDanoPorImpacto(energiaImpactoJ);
      superficie.aplicarDanoPorImpacto(energiaImpactoJ);
    }

    if (impulsoNormalNs > 0) {
      const velocidadeNoContato = velocidade.adicionar(velocidadeAngular.produtoVetorial(braco));
      const velocidadeTangencial = velocidadeNoContato.subtrair(normal.multiplicar(velocidadeNoContato.produtoEscalar(normal)));
      if (velocidadeTangencial.magnitude > 0) {
        const direcaoAtrito = velocidadeTangencial.multiplicar(-1 / velocidadeTangencial.magnitude);
        const massaEfetivaTangencialKg = this.contexto.obterMassaEfetivaNoContato(objeto, pontoContatoM, direcaoAtrito)
          ?? (1 / ((1 / objeto.massaKg) + this.obterTermoAngular(braco.produtoVetorial(direcaoAtrito), inercia)));
        const impulsoNecessarioNs = velocidadeTangencial.magnitude * massaEfetivaTangencialKg;
        const impulsoNormalDeApoioNs = objeto.massaKg * Math.abs(this.contexto.gravidadeMps2.y) * dtS;
        const apoioNormalNs = Math.max(impulsoNormalNs, impulsoNormalDeApoioNs);
        const coeficienteAtrito = Math.min(objeto.getCoeficienteAtritoDeContato(), superficie.coeficienteAtritoDinamico);
        const impulsoAtritoNs = Math.min(impulsoNecessarioNs, coeficienteAtrito * apoioNormalNs);
        const impulsoAtrito = direcaoAtrito.multiplicar(impulsoAtritoNs);
        const energiaDissipadaJ = this.calcularEnergiaDissipadaPorAtrito(impulsoAtritoNs, velocidadeTangencial.magnitude, 1 / massaEfetivaTangencialKg);
        this.contexto.distribuirCalorDeAtrito(objeto, superficie, energiaDissipadaJ, dtS);
        velocidade = velocidade.adicionar(impulsoAtrito.multiplicar(1 / objeto.massaKg));
        velocidadeAngular = velocidadeAngular.adicionar(this.calcularVariacaoAngular(braco, impulsoAtrito, inercia));
      }
    }

    objeto.atualizarEstadoPeloCore({
      ...estado,
      posicaoM: estado.posicaoM.adicionar(normal.multiplicar(penetracaoM)),
      velocidadeMps: velocidade,
      velocidadeAngularRadps: velocidadeAngular,
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

  private calcularRestituicaoDeContato(energiaImpactoJ: number, resistenciaObjeto: number, resistenciaSuperficie: number, dissipacaoObjeto: number, dissipacaoSuperficie: number, velocidadeNormalMps: number): number {
    if (Math.abs(velocidadeNormalMps) < this.contexto.velocidadeDeRepousoMps) return 0;
    return this.calcularRestituicaoPorEnergia(energiaImpactoJ, resistenciaObjeto, resistenciaSuperficie, dissipacaoObjeto, dissipacaoSuperficie);
  }

  private calcularRestituicaoPorEnergia(energiaImpactoJ: number, resistenciaA: number, resistenciaB: number, dissipacaoA: number, dissipacaoB: number): number {
    if (energiaImpactoJ === 0) return 0;
    const capacidadeDeRetorno = Math.min(1, Math.min(resistenciaA, resistenciaB) / energiaImpactoJ);
    const dissipacaoCombinada = 1 - ((1 - dissipacaoA) * (1 - dissipacaoB));
    return capacidadeDeRetorno * (1 - dissipacaoCombinada);
  }
}
