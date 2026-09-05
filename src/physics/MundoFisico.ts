import { Objeto } from './objetos/base/Objeto';
import { FixadorEstrutural } from './conexoes/FixadorEstrutural';
import { ChumbadorAoSolo } from './conexoes/ChumbadorAoSolo';
import { SuperficiePlano } from './SuperficiePlano';
import { Vetor3 } from './Vetor3';
import { IntegradorFisico } from './solucionadores/IntegradorFisico';
import type { ForcaAplicada } from './tipos/ForcaAplicada';
import { SistemaAtmosferico } from './solucionadores/SistemaAtmosferico';
import { SistemaTermico } from './solucionadores/SistemaTermico';
import { ResolvedorEsforcoEstrutural } from './solucionadores/ResolvedorEsforcoEstrutural';
import { ConjuntoEstruturalRigido } from './estruturas/ConjuntoEstruturalRigido';
import { obterContatoCaixasOrientadas } from './geometria/ContatoCaixasOrientadas';
import { SwitchFimDeCurso } from './sensores/SwitchFimDeCurso';
import { GuiaLinear } from './conexoes/GuiaLinear';

interface Ponto2D { readonly x: number; readonly y: number; }

export interface ConfiguracaoMundoFisico {
  /** Densidade constante para o modelo atmosférico atualmente implementado. */
  readonly densidadeAtmosfericaKgM3?: number;
  readonly velocidadeArMps?: Vetor3;
  readonly temperaturaAmbienteC?: number;
}

/** Núcleo determinístico de integração sem dependência de DOM, relógio ou renderização. */
export class MundoFisico {
  public static readonly gravidadeTerrestreMps2 = new Vetor3(0, -9.80665, 0);
  /** Abaixo deste módulo normal, o contato é apoio contínuo, sem quique. */
  public static readonly velocidadeDeRepousoMps = 0.05;
  /** Densidade do ar ao nível do mar usada quando o cenário não declara outra. */
  public static readonly densidadeAtmosferaPadraoKgM3 = 1.225;
  private readonly objetos = new Map<string, Objeto>();
  private readonly superficies = new Map<string, SuperficiePlano>();
  private readonly fixadores = new Map<string, FixadorEstrutural>();
  private readonly chumbadoresAoSolo = new Map<string, ChumbadorAoSolo>();
  private readonly switchesFimDeCurso = new Map<string, SwitchFimDeCurso>();
  private readonly guiasLineares = new Map<string, GuiaLinear>();
  private readonly conjuntosEstruturais = new Map<string, ConjuntoEstruturalRigido>();
  private readonly forcasPendentes = new Map<string, ForcaAplicada[]>();
  private tempoMissaoS = 0;
  private readonly densidadeAtmosfericaKgM3: number;
  private readonly velocidadeArMps: Vetor3;
  private readonly temperaturaAmbienteC: number;
  private readonly atmosfera: SistemaAtmosferico;
  private readonly sistemaTermico: SistemaTermico;
  private readonly integrador = new IntegradorFisico();
  private readonly resolvedorEsforcoEstrutural = new ResolvedorEsforcoEstrutural();

  public constructor(private readonly maxDtS = 1 / 60, configuracao: ConfiguracaoMundoFisico = {}) {
    if (!Number.isFinite(maxDtS) || maxDtS <= 0) throw new Error('maxDt deve ser positivo.');
    this.densidadeAtmosfericaKgM3 = configuracao.densidadeAtmosfericaKgM3 ?? MundoFisico.densidadeAtmosferaPadraoKgM3;
    this.velocidadeArMps = configuracao.velocidadeArMps ?? Vetor3.zero;
    this.temperaturaAmbienteC = configuracao.temperaturaAmbienteC ?? 20;
    if (!Number.isFinite(this.densidadeAtmosfericaKgM3) || this.densidadeAtmosfericaKgM3 < 0) {
      throw new Error('Densidade atmosférica deve ser finita e não negativa.');
    }
    this.atmosfera = new SistemaAtmosferico(this.densidadeAtmosfericaKgM3, this.velocidadeArMps);
    this.sistemaTermico = new SistemaTermico(this.atmosfera, this.temperaturaAmbienteC);
  }

  public get tempoS(): number { return this.tempoMissaoS; }
  /** Velocidade do ar configurada para o mundo, em m/s, para observação/telemetria. */
  public get velocidadeDoArMps(): Vetor3 { return this.velocidadeArMps; }

  public registrarObjeto(objeto: Objeto): void {
    if (this.objetos.has(objeto.id)) throw new Error(`Objeto já registrado: ${objeto.id}.`);
    this.objetos.set(objeto.id, objeto);
  }

  public registrarSuperficie(superficie: SuperficiePlano): void {
    if (this.superficies.has(superficie.id)) throw new Error(`Superfície já registrada: ${superficie.id}.`);
    this.superficies.set(superficie.id, superficie);
  }

  public registrarFixador(fixador: FixadorEstrutural): void {
    if (this.fixadores.has(fixador.id)) throw new Error(`Fixador já registrado: ${fixador.id}.`);
    this.exigirRegistro(fixador.objetoA);
    this.exigirRegistro(fixador.objetoB);
    this.fixadores.set(fixador.id, fixador);
  }

  public registrarChumbadorAoSolo(chumbador: ChumbadorAoSolo): void {
    if (this.chumbadoresAoSolo.has(chumbador.id)) throw new Error(`Chumbador já registrado: ${chumbador.id}.`);
    this.exigirRegistro(chumbador.objeto);
    this.chumbadoresAoSolo.set(chumbador.id, chumbador);
  }

  /** Registra um sensor que apenas observa os contatos físicos deste mundo. */
  public registrarSwitchFimDeCurso(switchFimDeCurso: SwitchFimDeCurso): void {
    if (this.switchesFimDeCurso.has(switchFimDeCurso.id)) throw new Error(`Switch de fim de curso já registrado: ${switchFimDeCurso.id}.`);
    this.exigirRegistro(switchFimDeCurso.objetoHospedeiro);
    this.switchesFimDeCurso.set(switchFimDeCurso.id, switchFimDeCurso);
    // Contatos iniciais devem estar disponíveis antes do primeiro comando.
    this.atualizarSwitchesFimDeCurso();
  }

  public registrarGuiaLinear(guia: GuiaLinear): void {
    if (this.guiasLineares.has(guia.id)) throw new Error(`Guia linear já registrada: ${guia.id}.`);
    this.exigirRegistro(guia.objeto);
    this.guiasLineares.set(guia.id, guia);
  }

  public aplicarForca(objeto: Objeto, forcaN: Vetor3, pontoM?: Vetor3): void {
    this.exigirRegistro(objeto);
    const forcas = this.forcasPendentes.get(objeto.id) ?? [];
    forcas.push({ forcaN, pontoM: pontoM ?? objeto.getEstadoFisico().posicaoM });
    this.forcasPendentes.set(objeto.id, forcas);
  }

  /** Força de arrasto que o core aplica ao objeto em seu estado atual. */
  public obterForcaArrastoAtmosferico(objeto: Objeto): Vetor3 {
    this.exigirRegistro(objeto);
    return this.atmosfera.calcularArrasto(objeto, objeto.getEstadoFisico().velocidadeMps);
  }

  public avancar(deltaS: number): void {
    if (!Number.isFinite(deltaS) || deltaS <= 0) throw new Error('deltaS deve ser positivo e finito.');
    let restante = deltaS;
    while (restante > 0) {
      const passoS = Math.min(restante, this.maxDtS);
      this.integrarPasso(passoS);
      restante -= passoS;
    }
  }

  private integrarPasso(dtS: number): void {
    this.atualizarApoioDeTracao();
    for (const objeto of this.objetos.values()) objeto.prepararPassoOperacional(dtS);
    this.atualizarEstadoTermico(dtS);
    for (const fixador of this.fixadores.values()) fixador.prepararPasso(dtS);
    for (const chumbador of this.chumbadoresAoSolo.values()) chumbador.prepararPasso();
    this.sincronizarConjuntosEstruturais(0, false);
    for (const objeto of this.objetos.values()) {
      if (this.obterConjuntoEstruturalDoObjeto(objeto)) continue;
      const estado = objeto.getEstadoFisico();
      const forcas = this.forcasPendentes.get(objeto.id) ?? [];
      const forcasOperacionais = objeto.obterForcasOperacionais().map((forca) => ({
        forcaN: forca.forcaN,
        pontoM: forca.pontoM ?? estado.posicaoM,
      }));
      const forcasAerodinamicas = objeto.obterForcasAerodinamicas({
        densidadeArKgM3: this.densidadeAtmosfericaKgM3,
        velocidadeArMps: this.velocidadeArMps,
      }).map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM }));
      const forcaArrastoN = this.obterForcaArrastoAtmosferico(objeto);
      this.integrador.integrarObjeto(
        objeto,
        [...forcas, ...forcasOperacionais, ...forcasAerodinamicas, { forcaN: forcaArrastoN, pontoM: estado.posicaoM }],
        MundoFisico.gravidadeTerrestreMps2,
        dtS,
      );
      objeto.registrarUso(dtS / 3600);
    }
    for (const conjunto of this.conjuntosEstruturais.values()) {
      const forcasDoConjunto: ForcaAplicada[] = [];
      for (const objeto of conjunto.membros) {
        const estado = objeto.getEstadoFisico();
        forcasDoConjunto.push(...(this.forcasPendentes.get(objeto.id) ?? []));
        forcasDoConjunto.push(...objeto.obterForcasOperacionais().map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM })));
        forcasDoConjunto.push(...objeto.obterForcasAerodinamicas({ densidadeArKgM3: this.densidadeAtmosfericaKgM3, velocidadeArMps: this.velocidadeArMps }).map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM })));
        forcasDoConjunto.push({ forcaN: MundoFisico.gravidadeTerrestreMps2.multiplicar(objeto.massaKg), pontoM: estado.posicaoM });
        forcasDoConjunto.push({ forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: estado.posicaoM });
        objeto.registrarUso(dtS / 3600);
      }
      conjunto.integrar(forcasDoConjunto, dtS);
    }
    this.resolverColisoes(dtS);
    this.resolverContatosComSuperficies(dtS);
    // Impulsos de colisão e contato recebidos por qualquer módulo passam a
    // pertencer imediatamente ao conjunto, sem esperar o passo seguinte.
    this.sincronizarConjuntosEstruturais(dtS, false);
    for (const chumbador of this.chumbadoresAoSolo.values()) {
      chumbador.resolverRestricao(dtS);
      if (chumbador.estaRompido) continue;
      const conjunto = this.obterConjuntoEstruturalDoObjeto(chumbador.objeto);
      if (conjunto) conjunto.restringirNoMembro(chumbador.objeto, chumbador.estadoDeAncoragem);
    }
    for (const guia of this.guiasLineares.values()) guia.resolverRestricao(dtS);
    this.atualizarSwitchesFimDeCurso();
    this.forcasPendentes.clear();
    this.tempoMissaoS += dtS;
  }

  /** Geração interna, convecção ambiente e jatos térmicos no mesmo passo determinístico. */
  private atualizarEstadoTermico(dtS: number): void {
    this.sistemaTermico.atualizar([...this.objetos.values()], dtS);
  }

  /** Agrupa todos os corpos alcançáveis por fixadores íntegros em uma ilha rígida. */
  private sincronizarConjuntosEstruturais(dtS: number, avancarOrientacao: boolean): void {
    const adjacencias = new Map<Objeto, Set<Objeto>>();
    for (const fixador of this.fixadores.values()) {
      if (fixador.estaRompido) continue;
      const adjacentesA = adjacencias.get(fixador.objetoA) ?? new Set<Objeto>();
      adjacentesA.add(fixador.objetoB); adjacencias.set(fixador.objetoA, adjacentesA);
      const adjacentesB = adjacencias.get(fixador.objetoB) ?? new Set<Objeto>();
      adjacentesB.add(fixador.objetoA); adjacencias.set(fixador.objetoB, adjacentesB);
    }
    const visitados = new Set<Objeto>();
    const assinaturasAtivas = new Set<string>();
    for (const inicio of adjacencias.keys()) {
      if (visitados.has(inicio)) continue;
      const pendentes = [inicio];
      const membros: Objeto[] = [];
      visitados.add(inicio);
      while (pendentes.length > 0) {
        const atual = pendentes.pop()!;
        membros.push(atual);
        for (const adjacente of adjacencias.get(atual) ?? []) {
          if (!visitados.has(adjacente)) {
            visitados.add(adjacente);
            pendentes.push(adjacente);
          }
        }
      }
      const assinatura = membros.map((objeto) => objeto.id).sort().join('|');
      assinaturasAtivas.add(assinatura);
      let conjunto = this.conjuntosEstruturais.get(assinatura);
      if (!conjunto) {
        conjunto = new ConjuntoEstruturalRigido(membros);
        this.conjuntosEstruturais.set(assinatura, conjunto);
      }
      conjunto.sincronizar(dtS, avancarOrientacao);
    }
    for (const assinatura of this.conjuntosEstruturais.keys()) {
      if (!assinaturasAtivas.has(assinatura)) this.conjuntosEstruturais.delete(assinatura);
    }
  }

  /** Somente rodas (ou pontos declarados de tração) apoiados podem gerar aderência. */
  private atualizarApoioDeTracao(): void {
    // Margem numérica de apoio: evita alternância de aderência entre passos
    // quando a correção de penetração deixa a roda milímetros acima do plano.
    const toleranciaApoioM = 0.02;
    for (const objeto of this.objetos.values()) {
      const pontosLocais = objeto.getPontosDeTracaoLocaisM();
      const pontos = this.obterPontosOrientados(objeto, pontosLocais);
      const apoiado = pontos.length > 0 && [...this.superficies.values()].some((superficie) =>
        pontos.some((ponto) => ponto.y <= superficie.alturaM + toleranciaApoioM),
      );
      objeto.atualizarContatoDeTracaoPeloCore(apoiado);
    }
  }

  private calcularArrastoAtmosferico(objeto: Objeto, velocidadeMps: Vetor3): Vetor3 {
    return this.atmosfera.calcularArrasto(objeto, velocidadeMps);
  }

  /** Trabalho do impulso tangencial, usando a velocidade média durante a frenagem. */
  private calcularEnergiaDissipadaPorAtrito(impulsoNs: number, velocidadeTangencialMps: number, massaInversaEfetiva: number): number {
    const velocidadeFinalMps = Math.max(0, velocidadeTangencialMps - impulsoNs * massaInversaEfetiva);
    return Math.max(0, impulsoNs * (velocidadeTangencialMps + velocidadeFinalMps) / 2);
  }

  /** Sem dados de efusividade, reparte a dissipação igualmente entre os dois materiais. */
  private distribuirCalorDeAtritoEntreObjetos(objetoA: Objeto, objetoB: Objeto, energiaJ: number, dtS: number): void {
    this.sistemaTermico.distribuirCalorDeAtritoEntreObjetos(objetoA, objetoB, energiaJ, dtS);
  }

  /** A outra metade vai para a massa térmica declarada da superfície. */
  private distribuirCalorDeAtritoComSuperficie(objeto: Objeto, superficie: SuperficiePlano, energiaJ: number, dtS: number): void {
    if (energiaJ <= 0) return;
    objeto.aplicarCalorDeAtritoPeloCore(energiaJ / 2, dtS);
    superficie.aplicarCalorDeAtritoPeloCore(energiaJ / 2);
  }

  /** Todas as faces da caixa acompanham sua orientação física em Z. */
  private resolverColisoes(dtS: number): void {
    const objetos = [...this.objetos.values()];
    for (let indiceA = 0; indiceA < objetos.length; indiceA += 1) {
      for (let indiceB = indiceA + 1; indiceB < objetos.length; indiceB += 1) {
        const objetoA = objetos[indiceA];
        const objetoB = objetos[indiceB];
        // Módulos de uma mesma ilha já pertencem ao mesmo corpo rígido. Suas
        // geometrias podem se sobrepor como partes internas da estrutura e
        // não devem gerar colisão contra si próprias.
        if (this.estaoNaMesmaIlhaEstrutural(objetoA, objetoB)) continue;
        const contato = this.obterContatoCaixasOrientadas(objetoA, objetoB);
        if (contato) this.resolverContato(objetoA, objetoB, contato.normal, contato.penetracaoM, contato.pontoM, dtS);
      }
    }
  }

  private estaoNaMesmaIlhaEstrutural(objetoA: Objeto, objetoB: Objeto): boolean {
    return [...this.conjuntosEstruturais.values()].some((conjunto) => conjunto.contem(objetoA) && conjunto.contem(objetoB));
  }

  private obterCentroDeMassaDaIlha(objeto: Objeto): Vetor3 | undefined {
    return this.obterConjuntoEstruturalDoObjeto(objeto)?.obterCentroDeMassaAtual();
  }

  private obterConjuntoEstruturalDoObjeto(objeto: Objeto): ConjuntoEstruturalRigido | undefined {
    return [...this.conjuntosEstruturais.values()].find((conjunto) => conjunto.contem(objeto));
  }

  private temChumbadorAoSoloIntegro(objeto: Objeto): boolean {
    return [...this.chumbadoresAoSolo.values()].some((chumbador) => chumbador.objeto === objeto && !chumbador.estaRompido);
  }

  private conjuntoTemChumbadorAoSoloIntegro(conjunto: ConjuntoEstruturalRigido): boolean {
    return conjunto.membros.some((objeto) => this.temChumbadorAoSoloIntegro(objeto));
  }

  private resolverContatosComSuperficies(dtS: number): void {
    for (const superficie of this.superficies.values()) {
      const conjuntosProcessados = new Set<ConjuntoEstruturalRigido>();
      for (const objeto of this.objetos.values()) {
        const conjunto = this.obterConjuntoEstruturalDoObjeto(objeto);
        if (conjunto && conjuntosProcessados.has(conjunto)) continue;
        if (conjunto) conjuntosProcessados.add(conjunto);
        const membros = conjunto?.membros ?? [objeto];
        const cantosPorObjeto = membros.flatMap((membro) => this.obterCantosOrientados(membro).map((canto) => ({ membro, canto })));
        const menorAlturaM = Math.min(...cantosPorObjeto.map(({ canto }) => canto.y));
        const penetracaoM = superficie.alturaM - menorAlturaM;
        if (penetracaoM > 0) {
          const toleranciaM = 1e-9;
          const contatos = cantosPorObjeto.filter(({ canto }) => Math.abs(canto.y - menorAlturaM) <= toleranciaM);
          const cantosDeContato = contatos.map(({ canto }) => canto);
          const mediaDosContatos = cantosDeContato.reduce(
            (soma, canto) => soma.adicionar(canto),
            Vetor3.zero,
          ).multiplicar(1 / cantosDeContato.length);
          const centroMassa = conjunto?.obterCentroDeMassaAtual() ?? objeto.getEstadoFisico().posicaoM;
          const menorX = Math.min(...cantosDeContato.map((canto) => canto.x));
          const maiorX = Math.max(...cantosDeContato.map((canto) => canto.x));
          const pontoContatoM = new Vetor3(
            Math.max(menorX, Math.min(maiorX, centroMassa.x)),
            mediaDosContatos.y,
            mediaDosContatos.z,
          );
          const objetoDeContato = contatos[0].membro;
          if (conjunto) {
            // Uma base larga não pode ser reduzida a um único apoio central:
            // os extremos inferiores distribuem normal, atrito e torque.
            const apoios = [menorX, maiorX].filter((x, indice, valores) => indice === 0 || Math.abs(x - valores[indice - 1]) > toleranciaM)
              .map((x) => new Vetor3(x, mediaDosContatos.y, mediaDosContatos.z));
            apoios.forEach((apoio, indice) => this.resolverContatoDaIlhaComSuperficie(
              conjunto, objetoDeContato, superficie, penetracaoM, apoio, dtS, indice === apoios.length - 1,
            ));
          }
          else this.resolverContatoComSuperficie(objetoDeContato, superficie, penetracaoM, pontoContatoM, dtS);
        }
      }
    }
  }

  /** Vértices de um paralelepípedo após a orientação atual (rotação em Z). */
  private obterCantosOrientados(objeto: Objeto): Vetor3[] {
    return this.obterPontosOrientados(objeto, objeto.getPontosDeContatoLocaisM());
  }

  private obterPontosOrientados(objeto: Objeto, pontosLocais: readonly Vetor3[]): Vetor3[] {
    const estado = objeto.getEstadoFisico();
    const cosseno = Math.cos(estado.orientacaoRad.z);
    const seno = Math.sin(estado.orientacaoRad.z);
    return pontosLocais.map((ponto) => new Vetor3(
      estado.posicaoM.x + (ponto.x * cosseno) - (ponto.y * seno),
      estado.posicaoM.y + (ponto.x * seno) + (ponto.y * cosseno),
      estado.posicaoM.z + ponto.z,
    ));
  }

  private obterContatoCaixasOrientadas(objetoA: Objeto, objetoB: Objeto): { normal: Vetor3; penetracaoM: number; pontoM: Vetor3 } | undefined {
    // O resolvedor físico preserva sua versão analítica já validada. Sensores
    // usam a mesma técnica SAT em uma consulta geométrica sem efeitos físicos.
    if (objetoA.getEstadoFisico().orientacaoRad.z === 0 && objetoB.getEstadoFisico().orientacaoRad.z === 0) {
      return this.obterContatoAabb(objetoA, objetoB);
    }
    const estadoA = objetoA.getEstadoFisico();
    const estadoB = objetoB.getEstadoFisico();
    const a = this.obterVertices2D(objetoA);
    const b = this.obterVertices2D(objetoB);
    let penetracaoM = Number.POSITIVE_INFINITY;
    let normal: Ponto2D | undefined;
    for (const eixo of [...this.obterEixos(a), ...this.obterEixos(b)]) {
      const pa = this.projetar(a, eixo);
      const pb = this.projetar(b, eixo);
      const sobreposicao = Math.min(pa.maximo, pb.maximo) - Math.max(pa.minimo, pb.minimo);
      if (sobreposicao <= 0) return undefined;
      if (sobreposicao < penetracaoM) {
        const apontaParaB = ((estadoB.posicaoM.x - estadoA.posicaoM.x) * eixo.x) + ((estadoB.posicaoM.y - estadoA.posicaoM.y) * eixo.y) >= 0;
        normal = apontaParaB ? eixo : { x: -eixo.x, y: -eixo.y };
        penetracaoM = sobreposicao;
      }
    }
    const sobreposicaoZ = ((objetoA.dimensoesM.z + objetoB.dimensoesM.z) / 2) - Math.abs(estadoB.posicaoM.z - estadoA.posicaoM.z);
    if (sobreposicaoZ <= 0 || !normal) return undefined;
    const regiao = this.recortarPoligono(a, b);
    if (regiao.length === 0) return undefined;
    const ponto = this.centroide(regiao);
    const z = this.obterCentroDaIntersecao(estadoA.posicaoM.z, objetoA.dimensoesM.z, estadoB.posicaoM.z, objetoB.dimensoesM.z);
    if (sobreposicaoZ < penetracaoM) {
      return { normal: new Vetor3(0, 0, estadoB.posicaoM.z >= estadoA.posicaoM.z ? 1 : -1), penetracaoM: sobreposicaoZ, pontoM: new Vetor3(ponto.x, ponto.y, z) };
    }
    return { normal: new Vetor3(normal.x, normal.y, 0), penetracaoM, pontoM: new Vetor3(ponto.x, ponto.y, z) };
  }

  /** Atualiza a saída dos sensores depois que o core estabilizou os contatos do passo. */
  private atualizarSwitchesFimDeCurso(): void {
    const toleranciaContatoM = 1e-6;
    for (const switchFimDeCurso of this.switchesFimDeCurso.values()) {
      const volume = switchFimDeCurso.obterVolumeSensivel();
      const alvoObjeto = [...this.objetos.values()].find((objeto) => {
        if (objeto === switchFimDeCurso.objetoHospedeiro || this.estaoNaMesmaIlhaEstrutural(objeto, switchFimDeCurso.objetoHospedeiro)) return false;
        const estado = objeto.getEstadoFisico();
        return obterContatoCaixasOrientadas(
          volume,
          { posicaoM: estado.posicaoM, dimensoesM: objeto.dimensoesM, orientacaoZRad: estado.orientacaoRad.z },
          toleranciaContatoM,
        ) !== undefined;
      });
      if (alvoObjeto) {
        switchFimDeCurso.atualizarContatoPeloCore(alvoObjeto);
        continue;
      }
      const tocaSuperficie = [...this.superficies.values()].find((superficie) =>
        switchFimDeCurso.obterPontosDaFaceSensivelM().some((ponto) => ponto.y <= superficie.alturaM + toleranciaContatoM),
      );
      switchFimDeCurso.atualizarContatoPeloCore(tocaSuperficie ? { id: tocaSuperficie.id, tipo: 'superficie' } : undefined);
    }
  }

  private obterVertices2D(objeto: Objeto): Ponto2D[] {
    const estado = objeto.getEstadoFisico();
    const c = Math.cos(estado.orientacaoRad.z);
    const s = Math.sin(estado.orientacaoRad.z);
    return objeto.getVerticesColisaoLocais2D().map((ponto) => ({
      x: estado.posicaoM.x + (ponto.x * c) - (ponto.y * s),
      y: estado.posicaoM.y + (ponto.x * s) + (ponto.y * c),
    }));
  }

  private obterEixos(vertices: readonly Ponto2D[]): Ponto2D[] {
    return vertices.map((ponto, indice) => {
      const proximo = vertices[(indice + 1) % vertices.length];
      const dx = proximo.x - ponto.x; const dy = proximo.y - ponto.y;
      const modulo = Math.hypot(dx, dy);
      return { x: -dy / modulo, y: dx / modulo };
    });
  }

  private projetar(vertices: readonly Ponto2D[], eixo: Ponto2D): { minimo: number; maximo: number } {
    const valores = vertices.map((ponto) => (ponto.x * eixo.x) + (ponto.y * eixo.y));
    return { minimo: Math.min(...valores), maximo: Math.max(...valores) };
  }

  private recortarPoligono(sujeito: readonly Ponto2D[], recortador: readonly Ponto2D[]): Ponto2D[] {
    let resultado = [...sujeito];
    for (let indice = 0; indice < recortador.length && resultado.length > 0; indice += 1) {
      const inicio = recortador[indice]; const fim = recortador[(indice + 1) % recortador.length];
      const entrada = resultado; resultado = [];
      for (let atual = 0; atual < entrada.length; atual += 1) {
        const anterior = entrada[(atual + entrada.length - 1) % entrada.length]; const ponto = entrada[atual];
        const dentro = this.dentroDaAresta(ponto, inicio, fim); const anteriorDentro = this.dentroDaAresta(anterior, inicio, fim);
        if (dentro !== anteriorDentro) resultado.push(this.intersecao(anterior, ponto, inicio, fim));
        if (dentro) resultado.push(ponto);
      }
    }
    return resultado;
  }

  private dentroDaAresta(ponto: Ponto2D, inicio: Ponto2D, fim: Ponto2D): boolean {
    return ((fim.x - inicio.x) * (ponto.y - inicio.y)) - ((fim.y - inicio.y) * (ponto.x - inicio.x)) >= -1e-9;
  }

  private intersecao(a: Ponto2D, b: Ponto2D, inicio: Ponto2D, fim: Ponto2D): Ponto2D {
    const dx = b.x - a.x; const dy = b.y - a.y; const ex = fim.x - inicio.x; const ey = fim.y - inicio.y;
    const t = (((inicio.x - a.x) * ey) - ((inicio.y - a.y) * ex)) / ((dx * ey) - (dy * ex));
    return { x: a.x + (t * dx), y: a.y + (t * dy) };
  }

  private centroide(vertices: readonly Ponto2D[]): Ponto2D {
    const soma = vertices.reduce((acumulado, ponto) => ({ x: acumulado.x + ponto.x, y: acumulado.y + ponto.y }), { x: 0, y: 0 });
    return { x: soma.x / vertices.length, y: soma.y / vertices.length };
  }

  private obterContatoAabb(objetoA: Objeto, objetoB: Objeto): { normal: Vetor3; penetracaoM: number; pontoM: Vetor3 } | undefined {
    const posicaoA = objetoA.getEstadoFisico().posicaoM;
    const posicaoB = objetoB.getEstadoFisico().posicaoM;
    const diferenca = posicaoB.subtrair(posicaoA);
    const sobreposicaoX = ((objetoA.dimensoesM.x + objetoB.dimensoesM.x) / 2) - Math.abs(diferenca.x);
    const sobreposicaoY = ((objetoA.dimensoesM.y + objetoB.dimensoesM.y) / 2) - Math.abs(diferenca.y);
    const sobreposicaoZ = ((objetoA.dimensoesM.z + objetoB.dimensoesM.z) / 2) - Math.abs(diferenca.z);
    if (sobreposicaoX <= 0 || sobreposicaoY <= 0 || sobreposicaoZ <= 0) return undefined;

    if (sobreposicaoX <= sobreposicaoY && sobreposicaoX <= sobreposicaoZ) {
      const sinal = diferenca.x >= 0 ? 1 : -1;
      return {
        normal: new Vetor3(sinal, 0, 0), penetracaoM: sobreposicaoX,
        pontoM: new Vetor3(
          (posicaoA.x + sinal * objetoA.dimensoesM.x / 2 + posicaoB.x - sinal * objetoB.dimensoesM.x / 2) / 2,
          this.obterCentroDaIntersecao(posicaoA.y, objetoA.dimensoesM.y, posicaoB.y, objetoB.dimensoesM.y),
          this.obterCentroDaIntersecao(posicaoA.z, objetoA.dimensoesM.z, posicaoB.z, objetoB.dimensoesM.z),
        ),
      };
    }
    if (sobreposicaoY <= sobreposicaoZ) {
      const sinal = diferenca.y >= 0 ? 1 : -1;
      return {
        normal: new Vetor3(0, sinal, 0), penetracaoM: sobreposicaoY,
        pontoM: new Vetor3(
          this.obterCentroDaIntersecao(posicaoA.x, objetoA.dimensoesM.x, posicaoB.x, objetoB.dimensoesM.x),
          (posicaoA.y + sinal * objetoA.dimensoesM.y / 2 + posicaoB.y - sinal * objetoB.dimensoesM.y / 2) / 2,
          this.obterCentroDaIntersecao(posicaoA.z, objetoA.dimensoesM.z, posicaoB.z, objetoB.dimensoesM.z),
        ),
      };
    }
    const sinal = diferenca.z >= 0 ? 1 : -1;
    return {
      normal: new Vetor3(0, 0, sinal), penetracaoM: sobreposicaoZ,
      pontoM: new Vetor3(
        this.obterCentroDaIntersecao(posicaoA.x, objetoA.dimensoesM.x, posicaoB.x, objetoB.dimensoesM.x),
        this.obterCentroDaIntersecao(posicaoA.y, objetoA.dimensoesM.y, posicaoB.y, objetoB.dimensoesM.y),
        (posicaoA.z + sinal * objetoA.dimensoesM.z / 2 + posicaoB.z - sinal * objetoB.dimensoesM.z / 2) / 2,
      ),
    };
  }

  /** Centro geométrico do trecho efetivamente comum nos dois eixos. */
  private obterCentroDaIntersecao(centroA: number, dimensaoA: number, centroB: number, dimensaoB: number): number {
    const inicio = Math.max(centroA - dimensaoA / 2, centroB - dimensaoB / 2);
    const fim = Math.min(centroA + dimensaoA / 2, centroB + dimensaoB / 2);
    return (inicio + fim) / 2;
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
      const termoAngularA = (torqueUnitarioA.x ** 2 / inerciaA.x) + (torqueUnitarioA.y ** 2 / inerciaA.y) + (torqueUnitarioA.z ** 2 / inerciaA.z);
      const termoAngularB = (torqueUnitarioB.x ** 2 / inerciaB.x) + (torqueUnitarioB.y ** 2 / inerciaB.y) + (torqueUnitarioB.z ** 2 / inerciaB.z);
      const termoAngular = termoAngularA + termoAngularB;
      impulsoNormalNs = -((1 + restitituicao) * velocidadeNormal) / (somaInversos + termoAngular);
      const impulso = normal.multiplicar(impulsoNormalNs);
      velocidadeA = velocidadeA.subtrair(impulso.multiplicar(inversoMassaA));
      velocidadeB = velocidadeB.adicionar(impulso.multiplicar(inversoMassaB));
      velocidadeAngularA = velocidadeAngularA.subtrair(new Vetor3(
        bracoA.produtoVetorial(impulso).x / inerciaA.x,
        bracoA.produtoVetorial(impulso).y / inerciaA.y,
        bracoA.produtoVetorial(impulso).z / inerciaA.z,
      ));
      velocidadeAngularB = velocidadeAngularB.adicionar(new Vetor3(
        bracoB.produtoVetorial(impulso).x / inerciaB.x,
        bracoB.produtoVetorial(impulso).y / inerciaB.y,
        bracoB.produtoVetorial(impulso).z / inerciaB.z,
      ));

      const massaReduzida = (objetoA.massaKg * objetoB.massaKg) / (objetoA.massaKg + objetoB.massaKg);
      const energiaImpactoJ = 0.5 * massaReduzida * velocidadeNormal ** 2;
      objetoA.aplicarDanoPorImpacto(energiaImpactoJ);
      objetoB.aplicarDanoPorImpacto(energiaImpactoJ);
      const conjuntoA = this.obterConjuntoEstruturalDoObjeto(objetoA);
      const conjuntoB = this.obterConjuntoEstruturalDoObjeto(objetoB);
      if (conjuntoA) this.resolvedorEsforcoEstrutural.registrarImpulsoDeContato(
        objetoA, conjuntoA.membros, impulsoNormalNs, normal.multiplicar(-1), dtS, this.fixadores.values(),
      );
      if (conjuntoB) this.resolvedorEsforcoEstrutural.registrarImpulsoDeContato(
        objetoB, conjuntoB.membros, impulsoNormalNs, normal, dtS, this.fixadores.values(),
      );
    }

    // O mesmo contato físico também transmite aderência tangencial entre
    // objetos. Isso permite, por exemplo, que um propulsor apenas apoiado
    // sobre um veículo transfira força por atrito, sem vínculo artificial.
    const velocidadeContatoAtualA = velocidadeA.adicionar(velocidadeAngularA.produtoVetorial(bracoA));
    const velocidadeContatoAtualB = velocidadeB.adicionar(velocidadeAngularB.produtoVetorial(bracoB));
    const velocidadeRelativaAtual = velocidadeContatoAtualB.subtrair(velocidadeContatoAtualA);
    const velocidadeTangencial = velocidadeRelativaAtual.subtrair(normal.multiplicar(velocidadeRelativaAtual.produtoEscalar(normal)));
    // Nesta etapa o atrito entre objetos cobre apoio sobre faces quase
    // horizontais. Contatos inclinados permanecem governados pelo resolvedor
    // de impacto normal já validado, até existir um modelo completo de atrito
    // estático/dinâmico para todas as orientações.
    if (Math.abs(normal.y) >= 0.95 && velocidadeTangencial.magnitude > 1e-9 && impulsoNormalNs > 0) {
      const direcaoAtrito = velocidadeTangencial.multiplicar(1 / velocidadeTangencial.magnitude);
      const inerciaA = objetoA.getMomentoInerciaKgM2();
      const inerciaB = objetoB.getMomentoInerciaKgM2();
      const torqueAtritoA = bracoA.produtoVetorial(direcaoAtrito);
      const torqueAtritoB = bracoB.produtoVetorial(direcaoAtrito);
      const massaInversaEfetiva = somaInversos
        + (torqueAtritoA.x ** 2 / inerciaA.x) + (torqueAtritoA.y ** 2 / inerciaA.y) + (torqueAtritoA.z ** 2 / inerciaA.z)
        + (torqueAtritoB.x ** 2 / inerciaB.x) + (torqueAtritoB.y ** 2 / inerciaB.y) + (torqueAtritoB.z ** 2 / inerciaB.z);
      const impulsoNecessarioNs = velocidadeTangencial.magnitude / massaInversaEfetiva;
      const limiteAtritoNs = Math.min(objetoA.coeficienteAtritoEntreObjetos, objetoB.coeficienteAtritoEntreObjetos) * impulsoNormalNs;
      const impulsoAtrito = direcaoAtrito.multiplicar(Math.min(impulsoNecessarioNs, limiteAtritoNs));
      const energiaDissipadaJ = this.calcularEnergiaDissipadaPorAtrito(
        impulsoAtrito.magnitude, velocidadeTangencial.magnitude, massaInversaEfetiva,
      );
      this.distribuirCalorDeAtritoEntreObjetos(objetoA, objetoB, energiaDissipadaJ, dtS);
      velocidadeA = velocidadeA.adicionar(impulsoAtrito.multiplicar(inversoMassaA));
      velocidadeB = velocidadeB.subtrair(impulsoAtrito.multiplicar(inversoMassaB));
      velocidadeAngularA = velocidadeAngularA.adicionar(new Vetor3(
        bracoA.produtoVetorial(impulsoAtrito).x / inerciaA.x,
        bracoA.produtoVetorial(impulsoAtrito).y / inerciaA.y,
        bracoA.produtoVetorial(impulsoAtrito).z / inerciaA.z,
      ));
      velocidadeAngularB = velocidadeAngularB.subtrair(new Vetor3(
        bracoB.produtoVetorial(impulsoAtrito).x / inerciaB.x,
        bracoB.produtoVetorial(impulsoAtrito).y / inerciaB.y,
        bracoB.produtoVetorial(impulsoAtrito).z / inerciaB.z,
      ));
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

  /** Resolve apoio contra uma superfície no estado agregado da ilha rígida. */
  private resolverContatoDaIlhaComSuperficie(
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
      const restitituicao = this.calcularRestituicaoDeContato(
        energiaImpactoJ,
        objetoDeContato.resistenciaColisaoJ,
        superficie.resistenciaColisaoJ,
        objetoDeContato.dissipacaoImpacto,
        superficie.dissipacaoImpacto,
        velocidadeNormal,
      );
      impulsoNormalNs = -((1 + restitituicao) * velocidadeNormal) * massaEfetivaKg;
      conjunto.aplicarImpulsoNoPonto(normal.multiplicar(impulsoNormalNs), pontoContatoM);
      objetoDeContato.aplicarDanoPorImpacto(energiaImpactoJ);
      superficie.aplicarDanoPorImpacto(energiaImpactoJ);
      this.resolvedorEsforcoEstrutural.registrarImpulsoDeContato(
        objetoDeContato, conjunto.membros, impulsoNormalNs, normal, dtS, this.fixadores.values(),
      );
    }

    if (impulsoNormalNs > 0) {
      const velocidadeNoContato = conjunto.obterVelocidadeNoPonto(pontoContatoM);
      const velocidadeTangencial = velocidadeNoContato.subtrair(normal.multiplicar(velocidadeNoContato.produtoEscalar(normal)));
      if (velocidadeTangencial.magnitude > 1e-9) {
        const direcaoAtrito = velocidadeTangencial.multiplicar(-1 / velocidadeTangencial.magnitude);
        const massaEfetivaTangencialKg = conjunto.obterMassaEfetivaNoContato(pontoContatoM, direcaoAtrito);
        const impulsoNecessarioNs = velocidadeTangencial.magnitude * massaEfetivaTangencialKg;
        const impulsoNormalDeApoioNs = conjunto.massaTotalKg * Math.abs(MundoFisico.gravidadeTerrestreMps2.y) * dtS;
        const apoioNormalNs = Math.max(impulsoNormalNs, impulsoNormalDeApoioNs);
        const coeficienteAtrito = Math.min(objetoDeContato.getCoeficienteAtritoDeContato(), superficie.coeficienteAtritoDinamico);
        const impulsoAtritoNs = Math.min(impulsoNecessarioNs, coeficienteAtrito * apoioNormalNs);
        const energiaDissipadaJ = this.calcularEnergiaDissipadaPorAtrito(
          impulsoAtritoNs, velocidadeTangencial.magnitude, 1 / massaEfetivaTangencialKg,
        );
        this.distribuirCalorDeAtritoComSuperficie(objetoDeContato, superficie, energiaDissipadaJ, dtS);
        conjunto.aplicarImpulsoNoPonto(direcaoAtrito.multiplicar(impulsoAtritoNs), pontoContatoM);
      }
    }
    if (corrigirPenetracao) conjunto.corrigirPenetracao(normal, penetracaoM);
  }

  private resolverContatoComSuperficie(objeto: Objeto, superficie: SuperficiePlano, penetracaoM: number, pontoContatoM: Vetor3, dtS: number): void {
    const estado = objeto.getEstadoFisico();
    const normal = new Vetor3(0, 1, 0);
    const braco = pontoContatoM.subtrair(estado.posicaoM);
    const velocidadeContato = estado.velocidadeMps.adicionar(estado.velocidadeAngularRadps.produtoVetorial(braco));
    const velocidadeNormal = velocidadeContato.produtoEscalar(normal);
    const inercia = objeto.getMomentoInerciaKgM2();
    const torqueUnitario = braco.produtoVetorial(normal);
    const termoAngular = (torqueUnitario.x ** 2 / inercia.x) + (torqueUnitario.y ** 2 / inercia.y) + (torqueUnitario.z ** 2 / inercia.z);
    let velocidade = estado.velocidadeMps;
    let velocidadeAngular = estado.velocidadeAngularRadps;
    let impulsoNormalNs = 0;

    if (velocidadeNormal < 0) {
      const massaEfetivaDoConjuntoKg = this.obterMassaEfetivaNoContato(objeto, pontoContatoM, normal);
      const massaParaEnergiaDeImpactoKg = massaEfetivaDoConjuntoKg ?? objeto.massaKg;
      const massaEfetivaDinamicaContatoKg = massaEfetivaDoConjuntoKg
        // Corpo isolado preserva a massa efetiva local, incluindo o braço
        // de alavanca do ponto de contato; uma ilha já fornece esse efeito
        // calculado com sua massa e inércia compostas.
        ?? (1 / ((1 / objeto.massaKg) + termoAngular));
      const energiaImpactoJ = 0.5 * massaParaEnergiaDeImpactoKg * velocidadeNormal ** 2;
      const restitituicao = this.calcularRestituicaoDeContato(
        energiaImpactoJ,
        objeto.resistenciaColisaoJ,
        superficie.resistenciaColisaoJ,
        objeto.dissipacaoImpacto,
        superficie.dissipacaoImpacto,
        velocidadeNormal,
      );
      impulsoNormalNs = -((1 + restitituicao) * velocidadeNormal) * massaEfetivaDinamicaContatoKg;
      const impulso = normal.multiplicar(impulsoNormalNs);
      velocidade = velocidade.adicionar(impulso.multiplicar(1 / objeto.massaKg));
      velocidadeAngular = velocidadeAngular.adicionar(new Vetor3(
        braco.produtoVetorial(impulso).x / inercia.x,
        braco.produtoVetorial(impulso).y / inercia.y,
        braco.produtoVetorial(impulso).z / inercia.z,
      ));
      objeto.aplicarDanoPorImpacto(energiaImpactoJ);
      superficie.aplicarDanoPorImpacto(energiaImpactoJ);
    }

    // O atrito de Coulomb atua no ponto de contato após o impulso normal. Ele
    // reduz deslizamento e rotação de apoio sem inventar uma força de parada.
    if (impulsoNormalNs > 0) {
      const velocidadeNoContato = velocidade.adicionar(velocidadeAngular.produtoVetorial(braco));
      const velocidadeTangencial = velocidadeNoContato.subtrair(normal.multiplicar(velocidadeNoContato.produtoEscalar(normal)));
      if (velocidadeTangencial.magnitude > 0) {
        const direcaoAtrito = velocidadeTangencial.multiplicar(-1 / velocidadeTangencial.magnitude);
        const torqueAtritoUnitario = braco.produtoVetorial(direcaoAtrito);
        const massaEfetivaTangencialKg = this.obterMassaEfetivaNoContato(objeto, pontoContatoM, direcaoAtrito)
          ?? (1 / ((1 / objeto.massaKg)
            + (torqueAtritoUnitario.x ** 2 / inercia.x)
            + (torqueAtritoUnitario.y ** 2 / inercia.y)
            + (torqueAtritoUnitario.z ** 2 / inercia.z)));
        const impulsoNecessarioNs = velocidadeTangencial.magnitude * massaEfetivaTangencialKg;
        const impulsoNormalDeApoioNs = objeto.massaKg * Math.abs(MundoFisico.gravidadeTerrestreMps2.y) * dtS;
        const apoioNormalNs = Math.max(impulsoNormalNs, impulsoNormalDeApoioNs);
        const coeficienteAtrito = Math.min(objeto.getCoeficienteAtritoDeContato(), superficie.coeficienteAtritoDinamico);
        const impulsoAtritoNs = Math.min(impulsoNecessarioNs, coeficienteAtrito * apoioNormalNs);
        const impulsoAtrito = direcaoAtrito.multiplicar(impulsoAtritoNs);
        const energiaDissipadaJ = this.calcularEnergiaDissipadaPorAtrito(
          impulsoAtritoNs, velocidadeTangencial.magnitude, 1 / massaEfetivaTangencialKg,
        );
        this.distribuirCalorDeAtritoComSuperficie(objeto, superficie, energiaDissipadaJ, dtS);
        velocidade = velocidade.adicionar(impulsoAtrito.multiplicar(1 / objeto.massaKg));
        velocidadeAngular = velocidadeAngular.adicionar(new Vetor3(
          braco.produtoVetorial(impulsoAtrito).x / inercia.x,
          braco.produtoVetorial(impulsoAtrito).y / inercia.y,
          braco.produtoVetorial(impulsoAtrito).z / inercia.z,
        ));
      }

    }

    objeto.atualizarEstadoPeloCore({
      ...estado,
      posicaoM: estado.posicaoM.adicionar(normal.multiplicar(penetracaoM)),
      velocidadeMps: velocidade,
      velocidadeAngularRadps: velocidadeAngular,
    });
  }

  /** Considera a massa transmitida por um vínculo rígido ainda íntegro. */
  private obterMassaEfetivaNoContato(objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3): number | undefined {
    for (const conjunto of this.conjuntosEstruturais.values()) {
      if (conjunto.contem(objeto)) return conjunto.obterMassaEfetivaNoContato(pontoContatoM, normal);
    }
    for (const fixador of this.fixadores.values()) {
      const massaEfetiva = fixador.obterMassaEfetivaNoContato(objeto, pontoContatoM, normal);
      if (massaEfetiva !== undefined) return massaEfetiva;
    }
    return undefined;
  }

  /**
   * A restituição não é escolhida por tipo de colisão. É uma consequência
   * contínua da energia normal do impacto e da resistência dos materiais.
   * Materiais que excedem a energia do impacto devolvem mais impulso; quando
   * o impacto excede a resistência, mais energia é absorvida como deformação
   * e dano.
   */
  private calcularRestituicao(objetoA: Objeto, objetoB: Objeto, velocidadeNormalMps: number): number {
    const massaReduzida = (objetoA.massaKg * objetoB.massaKg) / (objetoA.massaKg + objetoB.massaKg);
    const energiaImpactoJ = 0.5 * massaReduzida * velocidadeNormalMps ** 2;
    return this.calcularRestituicaoPorEnergia(
      energiaImpactoJ,
      objetoA.resistenciaColisaoJ,
      objetoB.resistenciaColisaoJ,
      objetoA.dissipacaoImpacto,
      objetoB.dissipacaoImpacto,
    );
  }

  private calcularRestituicaoDeContato(
    energiaImpactoJ: number,
    resistenciaObjeto: number,
    resistenciaSuperficie: number,
    dissipacaoObjeto: number,
    dissipacaoSuperficie: number,
    velocidadeNormalMps: number,
  ): number {
    if (Math.abs(velocidadeNormalMps) < MundoFisico.velocidadeDeRepousoMps) return 0;
    return this.calcularRestituicaoPorEnergia(
      energiaImpactoJ,
      resistenciaObjeto,
      resistenciaSuperficie,
      dissipacaoObjeto,
      dissipacaoSuperficie,
    );
  }

  private calcularRestituicaoPorEnergia(
    energiaImpactoJ: number,
    resistenciaA: number,
    resistenciaB: number,
    dissipacaoA: number,
    dissipacaoB: number,
  ): number {
    if (energiaImpactoJ === 0) return 0;
    const capacidadeDeRetorno = Math.min(1, Math.min(resistenciaA, resistenciaB) / energiaImpactoJ);
    const dissipacaoCombinada = 1 - ((1 - dissipacaoA) * (1 - dissipacaoB));
    return capacidadeDeRetorno * (1 - dissipacaoCombinada);
  }

  private exigirRegistro(objeto: Objeto): void {
    if (!this.objetos.has(objeto.id)) throw new Error(`Objeto não registrado: ${objeto.id}.`);
  }
}
