import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { ConjuntoEstruturalRigido } from '../estruturas/ConjuntoEstruturalRigido';
import { Objeto } from '../objetos/base/Objeto';
import { SuperficieFisica } from '../SuperficieFisica';
import { Vetor3 } from '../Vetor3';
import { ResolvedorEsforcoEstrutural } from './ResolvedorEsforcoEstrutural';

export interface ContextoResolvedorContatoSuperficie {
  readonly obterObjetos: () => Iterable<Objeto>;
  readonly obterSuperficies: () => Iterable<SuperficieFisica>;
  readonly obterConjuntoEstrutural: (objeto: Objeto) => ConjuntoEstruturalRigido | undefined;
  readonly obterMassaEfetivaNoContato: (objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3) => number | undefined;
  readonly obterFixadores: () => Iterable<FixadorEstrutural>;
  readonly resolvedorEsforcoEstrutural: ResolvedorEsforcoEstrutural;
  readonly distribuirCalorDeAtrito: (objeto: Objeto, superficie: SuperficieFisica, energiaJ: number, dtS: number) => void;
  readonly obterGravidadeMps2: (p: Vetor3) => Vetor3;
  readonly velocidadeDeRepousoMps: number;
}

/** Tolerância de 2 mm para contato/apoio numérico; não alcança objetos a centímetros do plano. */
export const TOLERANCIA_CONTATO_SUPERFICIE_M = 2e-3;

/** Ponto de contato calculado pelo resolvedor no último subpasso do mundo. */
export interface ContatoSuperficieFisico {
  readonly objetoId: string;
  readonly superficieId: string;
  readonly pontoContatoM: Vetor3;
  /** Positivo indica interseção que o core corrigiu; negativo é a folga observacional em m. */
  readonly penetracaoM: number;
  readonly velocidadeNormalAntesMps: number;
  readonly velocidadeNormalDepoisMps: number;
  readonly energiaImpactoJ: number;
  readonly normal: Vetor3;
  readonly impulsoNormalNs: number;
  readonly emProximidade: boolean;
  readonly emContatoGeometrico: boolean;
  readonly sustentacaoAplicada: boolean;
  readonly emApoio: boolean;
}

/** Resolve apoio, impacto, atrito e dano entre corpos e superfícies. */
export class ResolvedorContatoSuperficie {
  private contatosDoUltimoPasso: ContatoSuperficieFisico[] = [];

  public constructor(private readonly contexto: ContextoResolvedorContatoSuperficie) {}

  /** Snapshot dos pontos de contato efetivamente processados pelo core no último passo. */
  public obterContatos(): readonly ContatoSuperficieFisico[] {
    return this.contatosDoUltimoPasso.map((contato) => ({ ...contato }));
  }

  public resolver(dtS: number): void {
    this.contatosDoUltimoPasso = [];
    for (const superficie of this.contexto.obterSuperficies()) {
      const conjuntosProcessados = new Set<ConjuntoEstruturalRigido>();
      for (const objeto of this.contexto.obterObjetos()) {
        const conjunto = this.contexto.obterConjuntoEstrutural(objeto);
        if (conjunto && conjuntosProcessados.has(conjunto)) continue;
        if (conjunto) conjuntosProcessados.add(conjunto);
        const membros = conjunto?.membros ?? [objeto];
        const cantosPorObjeto = membros.flatMap((membro) => superficie.candidatosContato(this.obterCantosOrientados(membro))
          .filter((canto) => superficie.contemProjecao(canto)).map((canto) => ({ membro, canto })));
        if (cantosPorObjeto.length === 0) continue;
        const menorDistanciaM = Math.min(...cantosPorObjeto.map(({ canto }) => superficie.distanciaAssinadaM(canto)));
        const penetracaoM = -menorDistanciaM;
        if (penetracaoM < -TOLERANCIA_CONTATO_SUPERFICIE_M) continue;
        // A tolerância milimétrica observa proximidade para sensores de apoio;
        // a resposta física de corpos já em interseção conserva o agrupamento preciso.
        const toleranciaM = penetracaoM < 0 ? TOLERANCIA_CONTATO_SUPERFICIE_M : 1e-9;
        const contatos = cantosPorObjeto.filter(({ canto }) => Math.abs(superficie.distanciaAssinadaM(canto) - menorDistanciaM) <= toleranciaM);
        const cantosDeContato = contatos.map(({ canto }) => canto);
        const mediaDosContatos = cantosDeContato.reduce((soma, canto) => soma.adicionar(canto), Vetor3.zero).multiplicar(1 / cantosDeContato.length);
        const centroMassa = conjunto?.obterCentroDeMassaAtual() ?? objeto.getEstadoFisico().posicaoM;
        const n = superficie.normalEm(mediaDosContatos);
        const tangente = new Vetor3(n.y, -n.x, 0);
        const coordenada = (p: Vetor3) => p.subtrair(mediaDosContatos).produtoEscalar(tangente);
        const menorX = Math.min(...cantosDeContato.map(coordenada));
        const maiorX = Math.max(...cantosDeContato.map(coordenada));
        const pontoPorCoordenada = (s: number) => mediaDosContatos.adicionar(tangente.multiplicar(s));
        const pontoContatoM = pontoPorCoordenada(Math.max(menorX, Math.min(maiorX, coordenada(centroMassa))));
        if (penetracaoM < 0) {
          const pontosDeApoio = conjunto
            ? [menorX, maiorX].filter((x, indice, valores) => indice === 0 || Math.abs(x - valores[indice - 1]) > toleranciaM)
              .map(pontoPorCoordenada)
            : [pontoContatoM];
          pontosDeApoio.forEach((ponto) => {
            const contatoMaisProximo = contatos.reduce((melhor, atual) =>
              Math.abs(coordenada(atual.canto) - coordenada(ponto)) < Math.abs(coordenada(melhor.canto) - coordenada(ponto)) ? atual : melhor,
            );
            const velocidadeNormal = conjunto
              ? conjunto.obterVelocidadeNoPonto(ponto).produtoEscalar(superficie.normalEm(ponto))
              : this.obterVelocidadeNormalNoPonto(contatoMaisProximo.membro, ponto, superficie);
            this.registrarContato(contatoMaisProximo.membro, superficie, ponto, penetracaoM, velocidadeNormal, velocidadeNormal, 0);
          });
          continue;
        }
        if (conjunto) {
          const apoios = [menorX, maiorX]
            .filter((x, indice, valores) => indice === 0 || Math.abs(x - valores[indice - 1]) > toleranciaM)
            .map(pontoPorCoordenada);
          apoios.forEach((apoio, indice) => {
            const contatoMaisProximo = contatos.reduce((melhor, atual) =>
              Math.abs(coordenada(atual.canto) - coordenada(apoio)) < Math.abs(coordenada(melhor.canto) - coordenada(apoio)) ? atual : melhor,
            );
            this.resolverContatoDaIlha(
              conjunto, contatoMaisProximo.membro, superficie, Math.max(0, penetracaoM), apoio, dtS, indice === apoios.length - 1,
            );
          });
          this.registrarApoiosProximosDaIlha(conjunto, membros, superficie);
        } else {
          this.resolverContatoDoObjeto(contatos[0].membro, superficie, Math.max(0, penetracaoM), pontoContatoM, dtS);
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
    superficie: SuperficieFisica,
    penetracaoM: number,
    pontoContatoM: Vetor3,
    dtS: number,
    corrigirPenetracao: boolean,
  ): void {
    const normal = superficie.normalEm(pontoContatoM);
    const velocidadeNormal = conjunto.obterVelocidadeNoPonto(pontoContatoM).produtoEscalar(normal);
    const contatoApoiando = velocidadeNormal <= 0;
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

    if (contatoApoiando) {
      const velocidadeNoContato = conjunto.obterVelocidadeNoPonto(pontoContatoM);
      const velocidadeTangencial = velocidadeNoContato.subtrair(normal.multiplicar(velocidadeNoContato.produtoEscalar(normal)));
      if (velocidadeTangencial.magnitude > 1e-9) {
        const direcaoAtrito = velocidadeTangencial.multiplicar(-1 / velocidadeTangencial.magnitude);
        const massaEfetivaTangencialKg = conjunto.obterMassaEfetivaNoContato(pontoContatoM, direcaoAtrito);
        const impulsoNecessarioNs = velocidadeTangencial.magnitude * massaEfetivaTangencialKg;
        const impulsoNormalDeApoioNs = conjunto.massaTotalKg * Math.max(0, -this.contexto.obterGravidadeMps2(pontoContatoM).produtoEscalar(normal)) * dtS;
        const apoioNormalNs = Math.max(impulsoNormalNs, impulsoNormalDeApoioNs);
        const coeficienteAtrito = Math.min(objetoDeContato.getCoeficienteAtritoDeContato(), superficie.coeficienteAtritoDinamico);
        const impulsoAtritoNs = Math.min(impulsoNecessarioNs, coeficienteAtrito * apoioNormalNs);
        const energiaDissipadaJ = this.calcularEnergiaDissipadaPorAtrito(impulsoAtritoNs, velocidadeTangencial.magnitude, 1 / massaEfetivaTangencialKg);
        this.contexto.distribuirCalorDeAtrito(objetoDeContato, superficie, energiaDissipadaJ, dtS);
        conjunto.aplicarImpulsoNoPonto(direcaoAtrito.multiplicar(impulsoAtritoNs), pontoContatoM);
      }
    }
    if (corrigirPenetracao) conjunto.corrigirPenetracao(normal, penetracaoM);
    this.registrarContato(objetoDeContato, superficie, pontoContatoM, penetracaoM, velocidadeNormal,
      conjunto.obterVelocidadeNoPonto(pontoContatoM).produtoEscalar(normal), impulsoNormalNs > 0
        ? Math.max(0, 0.5 * conjunto.obterMassaEfetivaNoContato(pontoContatoM, normal) * velocidadeNormal ** 2) : 0, impulsoNormalNs);
  }

  private resolverContatoDoObjeto(objeto: Objeto, superficie: SuperficieFisica, penetracaoM: number, pontoContatoM: Vetor3, dtS: number): void {
    const estado = objeto.getEstadoFisico();
    const normal = superficie.normalEm(pontoContatoM);
    const braco = pontoContatoM.subtrair(estado.posicaoM);
    const velocidadeContato = estado.velocidadeMps.adicionar(estado.velocidadeAngularRadps.produtoVetorial(braco));
    const velocidadeNormal = velocidadeContato.produtoEscalar(normal);
    const contatoApoiando = velocidadeNormal <= 0;
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

    if (contatoApoiando) {
      const velocidadeNoContato = velocidade.adicionar(velocidadeAngular.produtoVetorial(braco));
      const velocidadeTangencial = velocidadeNoContato.subtrair(normal.multiplicar(velocidadeNoContato.produtoEscalar(normal)));
      if (velocidadeTangencial.magnitude > 0) {
        const direcaoAtrito = velocidadeTangencial.multiplicar(-1 / velocidadeTangencial.magnitude);
        const massaEfetivaTangencialKg = this.contexto.obterMassaEfetivaNoContato(objeto, pontoContatoM, direcaoAtrito)
          ?? (1 / ((1 / objeto.massaKg) + this.obterTermoAngular(braco.produtoVetorial(direcaoAtrito), inercia)));
        const impulsoNecessarioNs = velocidadeTangencial.magnitude * massaEfetivaTangencialKg;
        const impulsoNormalDeApoioNs = objeto.massaKg * Math.max(0, -this.contexto.obterGravidadeMps2(pontoContatoM).produtoEscalar(normal)) * dtS;
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
    const velocidadeNormalDepois = objeto.getEstadoFisico().velocidadeMps
      .adicionar(objeto.getEstadoFisico().velocidadeAngularRadps.produtoVetorial(braco)).produtoEscalar(normal);
    this.registrarContato(objeto, superficie, pontoContatoM, penetracaoM, velocidadeNormal, velocidadeNormalDepois,
      velocidadeNormal < 0 ? Math.max(0, 0.5 * (this.contexto.obterMassaEfetivaNoContato(objeto, pontoContatoM, normal) ?? objeto.massaKg) * velocidadeNormal ** 2) : 0, impulsoNormalNs);
  }

  private registrarContato(
    objeto: Objeto,
    superficie: SuperficieFisica,
    pontoContatoM: Vetor3,
    penetracaoM: number,
    velocidadeNormalAntesMps: number,
    velocidadeNormalDepoisMps: number,
    energiaImpactoJ: number,
    impulsoNormalNs = 0,
  ): void {
    const contato: ContatoSuperficieFisico = {
      objetoId: objeto.id,
      superficieId: superficie.id,
      pontoContatoM,
      penetracaoM,
      velocidadeNormalAntesMps,
      velocidadeNormalDepoisMps,
      energiaImpactoJ,
      normal: superficie.normalEm(pontoContatoM), impulsoNormalNs,
      emProximidade: penetracaoM < 0,
      emContatoGeometrico: penetracaoM >= 0,
      sustentacaoAplicada: penetracaoM >= 0 && impulsoNormalNs > 0,
      emApoio: velocidadeNormalAntesMps <= 0
        && Math.abs(velocidadeNormalDepoisMps) <= this.contexto.velocidadeDeRepousoMps,
    };
    // Um impacto pode romper um fixador e fazer o mundo reconstruir a ilha no
    // mesmo subpasso. Preserve também o registro do impulso original: a segunda
    // passagem pode observar o corpo já separado e parado/afastando-se.
    this.contatosDoUltimoPasso.push(contato);
  }

  private obterVelocidadeNormalNoPonto(objeto: Objeto, pontoM: Vetor3, superficie: SuperficieFisica): number {
    const estado = objeto.getEstadoFisico();
    const braco = pontoM.subtrair(estado.posicaoM);
    return estado.velocidadeMps.adicionar(estado.velocidadeAngularRadps.produtoVetorial(braco)).produtoEscalar(superficie.normalEm(pontoM));
  }

  /** Registra sapatas da mesma ilha dentro da tolerância, sem aplicar força à distância. */
  private registrarApoiosProximosDaIlha(
    conjunto: ConjuntoEstruturalRigido,
    membros: readonly Objeto[],
    superficie: SuperficieFisica,
  ): void {
    for (const membro of membros) {
      const cantos = superficie.candidatosContato(this.obterCantosOrientados(membro)).filter((p) => superficie.contemProjecao(p));
      if (cantos.length === 0) continue;
      const menorDistanciaM = Math.min(...cantos.map((p) => superficie.distanciaAssinadaM(p)));
      const folgaM = menorDistanciaM;
      if (folgaM <= 0 || folgaM > TOLERANCIA_CONTATO_SUPERFICIE_M) continue;
      const cantosProximos = cantos.filter((canto) => Math.abs(superficie.distanciaAssinadaM(canto) - menorDistanciaM) <= 1e-9);
      const pontoContatoM = cantosProximos.reduce((soma, canto) => soma.adicionar(canto), Vetor3.zero)
        .multiplicar(1 / cantosProximos.length);
      const velocidadeNormal = conjunto.obterVelocidadeNoPonto(pontoContatoM).produtoEscalar(superficie.normalEm(pontoContatoM));
      this.registrarContato(membro, superficie, pontoContatoM, -folgaM, velocidadeNormal, velocidadeNormal, 0);
    }
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
