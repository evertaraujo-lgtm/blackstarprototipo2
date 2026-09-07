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
import { ResolvedorColisoes } from './solucionadores/ResolvedorColisoes';
import { ResolvedorContatoSuperficie } from './solucionadores/ResolvedorContatoSuperficie';
import { ConjuntoEstruturalRigido } from './estruturas/ConjuntoEstruturalRigido';
import { SwitchFimDeCurso } from './sensores/SwitchFimDeCurso';
import { SistemaSensores } from './sensores/SistemaSensores';
import { SensoresVeiculoComposto } from './sensores/SensoresVeiculoComposto';
import { GuiaLinear } from './conexoes/GuiaLinear';
import { JuntaRotacionalDeBancada } from './conexoes/JuntaRotacionalDeBancada';

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
  private readonly guiasLineares = new Map<string, GuiaLinear>();
  private readonly juntasRotacionaisDeBancada = new Map<string, JuntaRotacionalDeBancada>();
  private readonly conjuntosEstruturais = new Map<string, ConjuntoEstruturalRigido>();
  private readonly forcasPendentes = new Map<string, ForcaAplicada[]>();
  private tempoMissaoS = 0;
  private readonly densidadeAtmosfericaKgM3: number;
  private readonly velocidadeArMps: Vetor3;
  private readonly atmosfera: SistemaAtmosferico;
  private readonly integrador = new IntegradorFisico();
  private readonly sistemaTermico: SistemaTermico;
  private readonly resolvedorEsforcoEstrutural = new ResolvedorEsforcoEstrutural();
  private readonly resolvedorColisoes: ResolvedorColisoes;
  private readonly resolvedorContatoSuperficie: ResolvedorContatoSuperficie;
  private readonly sistemaSensores: SistemaSensores;

  public constructor(private readonly maxDtS = 1 / 60, configuracao: ConfiguracaoMundoFisico = {}) {
    if (!Number.isFinite(maxDtS) || maxDtS <= 0) throw new Error('maxDt deve ser positivo.');
    this.densidadeAtmosfericaKgM3 = configuracao.densidadeAtmosfericaKgM3 ?? MundoFisico.densidadeAtmosferaPadraoKgM3;
    this.velocidadeArMps = configuracao.velocidadeArMps ?? Vetor3.zero;
    if (!Number.isFinite(this.densidadeAtmosfericaKgM3) || this.densidadeAtmosfericaKgM3 < 0) throw new Error('Densidade atmosférica deve ser finita e não negativa.');
    this.atmosfera = new SistemaAtmosferico(this.densidadeAtmosfericaKgM3, this.velocidadeArMps);
    this.sistemaTermico = new SistemaTermico(this.atmosfera, configuracao.temperaturaAmbienteC ?? 20);
    this.sistemaSensores = new SistemaSensores(
      () => this.objetos.values(),
      () => this.superficies.values(),
      (objeto) => this.obterConjuntoEstruturalDoObjeto(objeto),
    );
    this.resolvedorColisoes = new ResolvedorColisoes({
      obterObjetos: () => this.objetos.values(),
      obterConjuntoEstrutural: (objeto) => this.obterConjuntoEstruturalDoObjeto(objeto),
      obterFixadores: () => this.fixadores.values(),
      resolvedorEsforcoEstrutural: this.resolvedorEsforcoEstrutural,
      distribuirCalorDeAtrito: (objetoA, objetoB, energiaJ, dtS) => this.sistemaTermico.distribuirCalorDeAtritoEntreObjetos(objetoA, objetoB, energiaJ, dtS),
      velocidadeDeRepousoMps: MundoFisico.velocidadeDeRepousoMps,
      deveIgnorarColisao: (objetoA, objetoB) => [...this.juntasRotacionaisDeBancada.values()].some((junta) => junta.ignoraColisaoEntre(objetoA, objetoB)),
    });
    this.resolvedorContatoSuperficie = new ResolvedorContatoSuperficie({
      obterObjetos: () => this.objetos.values(),
      obterSuperficies: () => this.superficies.values(),
      obterConjuntoEstrutural: (objeto) => this.obterConjuntoEstruturalDoObjeto(objeto),
      obterMassaEfetivaNoContato: (objeto, pontoM, normal) => this.obterMassaEfetivaNoContato(objeto, pontoM, normal),
      obterFixadores: () => this.fixadores.values(),
      resolvedorEsforcoEstrutural: this.resolvedorEsforcoEstrutural,
      distribuirCalorDeAtrito: (objeto, superficie, energiaJ, dtS) => {
        if (energiaJ <= 0) return;
        objeto.aplicarCalorDeAtritoPeloCore(energiaJ / 2, dtS);
        superficie.aplicarCalorDeAtritoPeloCore(energiaJ / 2);
      },
      gravidadeMps2: MundoFisico.gravidadeTerrestreMps2,
      velocidadeDeRepousoMps: MundoFisico.velocidadeDeRepousoMps,
    });
  }

  public get tempoS(): number { return this.tempoMissaoS; }
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
    this.exigirRegistro(fixador.objetoA); this.exigirRegistro(fixador.objetoB);
    this.fixadores.set(fixador.id, fixador);
  }

  public registrarChumbadorAoSolo(chumbador: ChumbadorAoSolo): void {
    if (this.chumbadoresAoSolo.has(chumbador.id)) throw new Error(`Chumbador já registrado: ${chumbador.id}.`);
    this.exigirRegistro(chumbador.objeto);
    this.chumbadoresAoSolo.set(chumbador.id, chumbador);
  }

  public registrarSwitchFimDeCurso(switchFimDeCurso: SwitchFimDeCurso): void {
    this.exigirRegistro(switchFimDeCurso.objetoHospedeiro);
    this.sistemaSensores.registrarSwitchFimDeCurso(switchFimDeCurso);
  }

  public registrarSensoresVeiculo(sensores: SensoresVeiculoComposto): void {
    this.sistemaSensores.registrarSensoresVeiculo(sensores);
  }

  public reavaliarSwitchesFimDeCurso(): void { this.sistemaSensores.reavaliarSwitchesFimDeCurso(); }

  public registrarGuiaLinear(guia: GuiaLinear): void {
    if (this.guiasLineares.has(guia.id)) throw new Error(`Guia linear já registrada: ${guia.id}.`);
    this.exigirRegistro(guia.objeto);
    this.guiasLineares.set(guia.id, guia);
  }

  public registrarJuntaRotacionalDeBancada(junta: JuntaRotacionalDeBancada): void {
    if (this.juntasRotacionaisDeBancada.has(junta.id)) throw new Error(`Junta de bancada já registrada: ${junta.id}.`);
    this.exigirRegistro(junta.objetoBase); this.exigirRegistro(junta.braco);
    this.juntasRotacionaisDeBancada.set(junta.id, junta);
  }

  public aplicarForca(objeto: Objeto, forcaN: Vetor3, pontoM?: Vetor3): void {
    this.exigirRegistro(objeto);
    const forcas = this.forcasPendentes.get(objeto.id) ?? [];
    forcas.push({ forcaN, pontoM: pontoM ?? objeto.getEstadoFisico().posicaoM });
    this.forcasPendentes.set(objeto.id, forcas);
  }

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

  /** Receita explícita do passo; fenômenos físicos vivem nos subsistemas. */
  private integrarPasso(dtS: number): void {
    this.atualizarApoioDeTracao();
    for (const objeto of this.objetos.values()) objeto.prepararPassoEnergetico(dtS);
    for (const objeto of this.objetos.values()) objeto.prepararPassoOperacional(dtS);
    this.sistemaTermico.atualizar([...this.objetos.values()], dtS);
    for (const fixador of this.fixadores.values()) fixador.prepararPasso(dtS);
    for (const chumbador of this.chumbadoresAoSolo.values()) chumbador.prepararPasso();
    this.sincronizarConjuntosEstruturais(0, false);
    this.integrarCorpos(dtS);
    this.resolvedorColisoes.resolver(dtS);
    this.resolvedorContatoSuperficie.resolver(dtS);
    this.sincronizarConjuntosEstruturais(dtS, false);
    for (const chumbador of this.chumbadoresAoSolo.values()) {
      chumbador.resolverRestricao(dtS);
      if (chumbador.estaRompido) continue;
      const conjunto = this.obterConjuntoEstruturalDoObjeto(chumbador.objeto);
      if (conjunto) conjunto.restringirNoMembro(chumbador.objeto, chumbador.estadoDeAncoragem);
    }
    for (const guia of this.guiasLineares.values()) guia.resolverRestricao(dtS);
    this.sistemaSensores.atualizar(dtS);
    this.forcasPendentes.clear();
    this.tempoMissaoS += dtS;
  }

  private integrarCorpos(dtS: number): void {
    for (const objeto of this.objetos.values()) {
      if (this.obterConjuntoEstruturalDoObjeto(objeto)) continue;
      const estado = objeto.getEstadoFisico();
      const forcas = this.forcasPendentes.get(objeto.id) ?? [];
      const forcasOperacionais = objeto.obterForcasOperacionais().map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM, torqueNm: forca.torqueNm }));
      const forcasAerodinamicas = objeto.obterForcasAerodinamicas({ densidadeArKgM3: this.densidadeAtmosfericaKgM3, velocidadeArMps: this.velocidadeArMps })
        .map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM }));
      const forcasDasJuntas = [...this.juntasRotacionaisDeBancada.values()].flatMap((junta) => junta.obterForcasPara(objeto));
      this.integrador.integrarObjeto(objeto, [...forcas, ...forcasOperacionais, ...forcasAerodinamicas, ...forcasDasJuntas, { forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: estado.posicaoM }], MundoFisico.gravidadeTerrestreMps2, dtS);
      objeto.registrarUso(dtS / 3600);
    }
    for (const conjunto of this.conjuntosEstruturais.values()) {
      const forcasDoConjunto: ForcaAplicada[] = [];
      for (const objeto of conjunto.membros) {
        const estado = objeto.getEstadoFisico();
        forcasDoConjunto.push(...(this.forcasPendentes.get(objeto.id) ?? []));
        forcasDoConjunto.push(...objeto.obterForcasOperacionais().map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM, torqueNm: forca.torqueNm })));
        forcasDoConjunto.push(...objeto.obterForcasAerodinamicas({ densidadeArKgM3: this.densidadeAtmosfericaKgM3, velocidadeArMps: this.velocidadeArMps }).map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM })));
        forcasDoConjunto.push({ forcaN: MundoFisico.gravidadeTerrestreMps2.multiplicar(objeto.massaKg), pontoM: estado.posicaoM });
        forcasDoConjunto.push({ forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: estado.posicaoM });
        for (const junta of this.juntasRotacionaisDeBancada.values()) {
          if (junta.objetoBase === objeto || junta.braco === objeto) forcasDoConjunto.push(...junta.obterForcasPara(objeto));
        }
        objeto.registrarUso(dtS / 3600);
      }
      conjunto.integrar(forcasDoConjunto, dtS);
    }
  }

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
          if (!visitados.has(adjacente)) { visitados.add(adjacente); pendentes.push(adjacente); }
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

  private atualizarApoioDeTracao(): void {
    const toleranciaApoioM = 0.02;
    for (const objeto of this.objetos.values()) {
      const pontos = this.obterPontosOrientados(objeto, objeto.getPontosDeTracaoLocaisM());
      const apoiado = pontos.length > 0 && [...this.superficies.values()].some((superficie) => pontos.some((ponto) => ponto.y <= superficie.alturaM + toleranciaApoioM));
      objeto.atualizarContatoDeTracaoPeloCore(apoiado);
    }
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

  private obterConjuntoEstruturalDoObjeto(objeto: Objeto): ConjuntoEstruturalRigido | undefined {
    return [...this.conjuntosEstruturais.values()].find((conjunto) => conjunto.contem(objeto));
  }

  private obterMassaEfetivaNoContato(objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3): number | undefined {
    const conjunto = this.obterConjuntoEstruturalDoObjeto(objeto);
    if (conjunto) return conjunto.obterMassaEfetivaNoContato(pontoContatoM, normal);
    for (const fixador of this.fixadores.values()) {
      const massaEfetiva = fixador.obterMassaEfetivaNoContato(objeto, pontoContatoM, normal);
      if (massaEfetiva !== undefined) return massaEfetiva;
    }
    return undefined;
  }

  private exigirRegistro(objeto: Objeto): void {
    if (!this.objetos.has(objeto.id)) throw new Error(`Objeto não registrado: ${objeto.id}.`);
  }
}
