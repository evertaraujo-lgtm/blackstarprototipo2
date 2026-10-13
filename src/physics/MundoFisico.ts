import { SuperficiePlano } from './SuperficiePlano';
import { AmbientePlano, type AmbienteFisico } from './ambiente/AmbienteFisico';
import { Objeto, type CondicoesAtmosfericas } from './objetos/base/Objeto';
import { FixadorEstrutural } from './conexoes/FixadorEstrutural';
import { ChumbadorAoSolo } from './conexoes/ChumbadorAoSolo';
import { SuperficieFisica } from './SuperficieFisica';
import { Vetor3 } from './Vetor3';
import { IntegradorFisico } from './solucionadores/IntegradorFisico';
import type { ForcaAplicada } from './tipos/ForcaAplicada';
import { SistemaAtmosferico } from './solucionadores/SistemaAtmosferico';
import { SistemaTermico } from './solucionadores/SistemaTermico';
import { ResolvedorEsforcoEstrutural } from './solucionadores/ResolvedorEsforcoEstrutural';
import { ResolvedorColisoes } from './solucionadores/ResolvedorColisoes';
import { ResolvedorContatoSuperficie } from './solucionadores/ResolvedorContatoSuperficie';
import type { ContatoSuperficieFisico } from './solucionadores/ResolvedorContatoSuperficie';
import { ConjuntoEstruturalRigido } from './estruturas/ConjuntoEstruturalRigido';
import { SwitchFimDeCurso } from './sensores/SwitchFimDeCurso';
import { SistemaSensores } from './sensores/SistemaSensores';
import { SensoresVeiculoComposto } from './sensores/SensoresVeiculoComposto';
import { GuiaLinear } from './conexoes/GuiaLinear';
import { JuntaRotacionalDeBancada } from './conexoes/JuntaRotacionalDeBancada';

export interface ConfiguracaoMundoFisico {
  readonly ambiente?: AmbienteFisico;
  /** KDK somente para gravidade; forças dissipativas/operacionais usam passo explícito. */
  readonly integracao?: 'euler-semi-implicito' | 'verlet-gravitacional';
  /** Densidade de referência ao nível do mar; o core aplica a variação padrão com altitude. Zero declara vácuo. */
  readonly densidadeAtmosfericaKgM3?: number;
  readonly velocidadeArMps?: Vetor3;
  /** Rajadas determinísticas que se somam ao vento base no intervalo [início, início + duração). */
  readonly rajadasVento?: readonly RajadaVento[];
  readonly temperaturaAmbienteC?: number;
}

export interface RajadaVento {
  readonly inicioS: number;
  readonly duracaoS: number;
  readonly velocidadeAdicionalMps: Vetor3;
}

interface ForcaExternaPendente {
  readonly forcaN: Vetor3;
  /** Ausente significa aplicação no centro de massa atual de cada subpasso. */
  readonly pontoM?: Vetor3;
}

interface ImpulsoExternoPendente {
  readonly impulsoNs: Vetor3;
  readonly pontoM?: Vetor3;
}

/** Núcleo determinístico de integração sem dependência de DOM, relógio ou renderização. */
export class MundoFisico {
  public static readonly gravidadeTerrestreMps2 = new Vetor3(0, -9.80665, 0);
  /** Abaixo deste módulo normal, o contato é apoio contínuo, sem quique. */
  public static readonly velocidadeDeRepousoMps = 0.05;
  /** Densidade do ar ao nível do mar usada quando o cenário não declara outra. */
  public static readonly densidadeAtmosferaPadraoKgM3 = 1.225;
  public readonly ambiente: AmbienteFisico;
  private readonly integracao: 'euler-semi-implicito' | 'verlet-gravitacional';
  private readonly objetos = new Map<string, Objeto>();
  private readonly superficies = new Map<string, SuperficieFisica>();
  private readonly fixadores = new Map<string, FixadorEstrutural>();
  private readonly chumbadoresAoSolo = new Map<string, ChumbadorAoSolo>();
  private readonly guiasLineares = new Map<string, GuiaLinear>();
  private readonly juntasRotacionaisDeBancada = new Map<string, JuntaRotacionalDeBancada>();
  private readonly conjuntosEstruturais = new Map<string, ConjuntoEstruturalRigido>();
  /** Forças solicitadas valem por toda a próxima chamada de avancar. */
  private readonly forcasPendentes = new Map<string, ForcaExternaPendente[]>();
  private readonly impulsosPendentes = new Map<string, ImpulsoExternoPendente[]>();
  private tempoMissaoS = 0;
  private readonly densidadeAtmosfericaNivelMarKgM3: number;
  private readonly velocidadeArBaseMps: Vetor3;
  private readonly rajadasVento: readonly RajadaVento[];
  private velocidadeArAtualMps: Vetor3;
  private readonly atmosfera: SistemaAtmosferico;
  private readonly integrador = new IntegradorFisico();
  private readonly sistemaTermico: SistemaTermico;
  private readonly resolvedorEsforcoEstrutural = new ResolvedorEsforcoEstrutural();
  private readonly resolvedorColisoes: ResolvedorColisoes;
  private readonly resolvedorContatoSuperficie: ResolvedorContatoSuperficie;
  private readonly sistemaSensores: SistemaSensores;

  public constructor(private readonly maxDtS = 1 / 60, configuracao: ConfiguracaoMundoFisico = {}) {
    if (!Number.isFinite(maxDtS) || maxDtS <= 0) throw new Error('maxDt deve ser positivo.');
    this.ambiente = configuracao.ambiente ?? new AmbientePlano();
    this.integracao = configuracao.integracao ?? (this.ambiente.campo.modelo === 'central' ? 'verlet-gravitacional' : 'euler-semi-implicito');
    this.densidadeAtmosfericaNivelMarKgM3 = configuracao.densidadeAtmosfericaKgM3 ?? MundoFisico.densidadeAtmosferaPadraoKgM3;
    this.velocidadeArBaseMps = configuracao.velocidadeArMps ?? Vetor3.zero;
    this.validarVetorPlanar(this.velocidadeArBaseMps);
    this.velocidadeArAtualMps = this.velocidadeArBaseMps;
    this.rajadasVento = [...(configuracao.rajadasVento ?? [])].sort((a, b) => a.inicioS - b.inicioS);
    for (const rajada of this.rajadasVento) {
      this.validarVetorPlanar(rajada.velocidadeAdicionalMps);
      if (!Number.isFinite(rajada.inicioS) || rajada.inicioS < 0 || !Number.isFinite(rajada.duracaoS) || rajada.duracaoS <= 0
        || ![rajada.velocidadeAdicionalMps.x, rajada.velocidadeAdicionalMps.y, rajada.velocidadeAdicionalMps.z].every(Number.isFinite)) {
        throw new Error('Perfil de rajada de vento inválido.');
      }
    }
    if (!Number.isFinite(this.densidadeAtmosfericaNivelMarKgM3) || this.densidadeAtmosfericaNivelMarKgM3 < 0) throw new Error('Densidade atmosférica deve ser finita e não negativa.');
    this.atmosfera = new SistemaAtmosferico(this.densidadeAtmosfericaNivelMarKgM3, this.velocidadeArAtualMps, this.ambiente.referencial,
      this.ambiente.campo.modelo === 'central' ? 'vacuo-simplificado-25km' : 'extrapolacao-legada');
    this.sistemaTermico = new SistemaTermico(this.atmosfera, configuracao.temperaturaAmbienteC ?? 20);
    this.sistemaSensores = new SistemaSensores(
      () => this.objetos.values(),
      () => this.superficies.values(),
      (objeto) => this.obterConjuntoEstruturalDoObjeto(objeto),
    );
    this.resolvedorColisoes = new ResolvedorColisoes({
      somentePlanoXY: this.ambiente.campo.modelo === 'central',
      verticalEm: (p) => this.ambiente.referencial.radial(p),
      obterObjetos: () => this.objetos.values(),
      obterConjuntoEstrutural: (objeto) => this.obterConjuntoEstruturalDoObjeto(objeto),
      obterFixadores: () => this.fixadores.values(),
      resolvedorEsforcoEstrutural: this.resolvedorEsforcoEstrutural,
      distribuirCalorDeAtrito: (objetoA, objetoB, energiaJ, dtS) => this.sistemaTermico.distribuirCalorDeAtritoEntreObjetos(objetoA, objetoB, energiaJ, dtS),
      velocidadeDeRepousoMps: MundoFisico.velocidadeDeRepousoMps,
      deveIgnorarColisao: (objetoA, objetoB) => [...this.juntasRotacionaisDeBancada.values()].some((junta) => junta.ignoraColisaoEntre(objetoA, objetoB)),
    });
    this.resolvedorContatoSuperficie = new ResolvedorContatoSuperficie({
      somentePlanoXY: this.ambiente.campo.modelo === 'central',
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
      obterGravidadeMps2: (p) => this.obterGravidadeMps2(p),
      velocidadeDeRepousoMps: MundoFisico.velocidadeDeRepousoMps,
    });
  }

  public get tempoS(): number { return this.tempoMissaoS; }
  public get velocidadeDoArMps(): Vetor3 { return this.velocidadeArAtualMps; }

  public registrarObjeto(objeto: Objeto): void {
    if (this.objetos.has(objeto.id)) throw new Error(`Objeto já registrado: ${objeto.id}.`);
    this.validarEstadoPlanar(objeto);
    this.objetos.set(objeto.id, objeto);
  }

  public registrarSuperficie(superficie: SuperficieFisica): void {
    if (this.ambiente.campo.modelo === 'central' && superficie instanceof SuperficiePlano) {
      throw new Error('Plano infinito incompatível com Terra esférica: use superfície esférica ou plataforma local finita.');
    }
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
    sensores.configurarAmbienteInicial(this.ambiente);
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

  /**
   * Solicita uma força externa, em N, mantida durante todo o próximo avanço.
   * Para manter a força em avanços seguintes, o chamador deve solicitá-la novamente.
   */
  public aplicarForca(objeto: Objeto, forcaN: Vetor3, pontoM?: Vetor3): void {
    this.exigirRegistro(objeto);
    this.validarVetorPlanar(forcaN);
    if (pontoM) this.validarVetorPlanar(pontoM);
    const forcas = this.forcasPendentes.get(objeto.id) ?? [];
    forcas.push({ forcaN, pontoM });
    this.forcasPendentes.set(objeto.id, forcas);
  }

  /** Solicita um impulso instantâneo, em N.s, aplicado uma única vez no próximo avanço. */
  public aplicarImpulso(objeto: Objeto, impulsoNs: Vetor3, pontoM?: Vetor3): void {
    this.exigirRegistro(objeto);
    this.validarVetorPlanar(impulsoNs);
    if (pontoM) this.validarVetorPlanar(pontoM);
    const impulsos = this.impulsosPendentes.get(objeto.id) ?? [];
    impulsos.push({ impulsoNs, pontoM });
    this.impulsosPendentes.set(objeto.id, impulsos);
  }

  public obterForcaArrastoAtmosferico(objeto: Objeto): Vetor3 {
    this.exigirRegistro(objeto);
    return this.atmosfera.calcularArrasto(objeto, objeto.getEstadoFisico().velocidadeMps);
  }

  /** Leitura do mesmo ambiente usado na integração; não modifica a física. */
  public obterCondicoesAtmosfericas(objeto: Objeto): CondicoesAtmosfericas {
    this.exigirRegistro(objeto);
    return {
      densidadeArKgM3: this.atmosfera.obterDensidadeNaPosicaoKgM3(objeto.getEstadoFisico().posicaoM),
      velocidadeArMps: this.velocidadeArAtualMps,
    };
  }

  public obterMenorDistanciaSuperficieM(objeto: Objeto, superficie: SuperficieFisica): number {
    this.exigirRegistro(objeto);
    if (superficie instanceof SuperficiePlano) {
      // Mesma distância assinada da geometria genérica, sem construir XYZ
      // para cada vértice nas leituras intensivas dos diários legados.
      const e = objeto.getEstadoFisico(), seno = Math.sin(e.orientacaoRad.z), cosseno = Math.cos(e.orientacaoRad.z);
      const distancia = Math.min(...objeto.getPontosDeContatoLocaisM().map(p => e.posicaoM.y + p.x * seno + p.y * cosseno - superficie.alturaM));
      if (!Number.isFinite(distancia)) throw new Error('Geometria de contato não finita.');
      return distancia;
    }
    const pontos = superficie.candidatosContato(this.obterPontosOrientados(objeto, objeto.getPontosDeContatoLocaisM()))
      .filter((p) => superficie.contemProjecao(p));
    return pontos.length ? Math.min(...pontos.map((p) => superficie.distanciaAssinadaM(p))) : Infinity;
  }

  /** Contatos e apoios efetivamente resolvidos pelo core no último subpasso. */
  public obterContatosComSuperficie(): readonly ContatoSuperficieFisico[] {
    return this.resolvedorContatoSuperficie.obterContatos();
  }

  /** Contatos resolvidos deste objeto, opcionalmente limitados a uma superfície. */
  public obterContatosDoObjeto(objeto: Objeto, superficie?: SuperficieFisica): readonly ContatoSuperficieFisico[] {
    this.exigirRegistro(objeto);
    return this.resolvedorContatoSuperficie.obterContatos().filter((contato) =>
      contato.objetoId === objeto.id && (superficie === undefined || contato.superficieId === superficie.id),
    );
  }

  /** Soma das mesmas forças aerodinâmicas usadas na integração, em torno da referência SI. */
  public obterCargasAerodinamicas(objetos: readonly Objeto[], referenciaM: Vetor3): { forcaN: Vetor3; torqueNm: Vetor3 } {
    let forcaN = Vetor3.zero;
    let torqueNm = Vetor3.zero;
    for (const objeto of objetos) {
      const condicoes = this.obterCondicoesAtmosfericas(objeto);
      const posicaoM = objeto.getEstadoFisico().posicaoM;
      const forcas = [{ forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: objeto.obterCentroPressaoM() },
        ...objeto.obterForcasAerodinamicas(condicoes)];
      for (const forca of forcas) {
        forcaN = forcaN.adicionar(forca.forcaN);
        torqueNm = torqueNm.adicionar((forca.pontoM ?? posicaoM).subtrair(referenciaM).produtoVetorial(forca.forcaN));
      }
    }
    return { forcaN, torqueNm };
  }

  public avancar(deltaS: number): void {
    if (!Number.isFinite(deltaS) || deltaS <= 0) throw new Error('deltaS deve ser positivo e finito.');
    try {
      let restante = deltaS;
      let primeiroPasso = true;
      while (restante > 0) {
        const passoS = Math.min(restante, this.maxDtS);
        this.integrarPasso(passoS, primeiroPasso);
        primeiroPasso = false;
        restante -= passoS;
      }
    } finally {
      // O contrato da fila externa é a chamada inteira, não cada subpasso.
      this.forcasPendentes.clear();
      this.impulsosPendentes.clear();
    }
  }

  /** Receita explícita do passo; fenômenos físicos vivem nos subsistemas. */
  private integrarPasso(dtS: number, aplicarImpulsos: boolean): void {
    this.atualizarVentoDoPasso();
    this.atualizarApoioDeTracao();
    for (const objeto of this.objetos.values()) objeto.prepararPassoEnergetico(dtS);
    for (const objeto of this.objetos.values()) objeto.prepararPassoOperacional(dtS);
    this.sistemaTermico.atualizar([...this.objetos.values()], dtS);
    for (const fixador of this.fixadores.values()) fixador.prepararPasso(dtS);
    for (const chumbador of this.chumbadoresAoSolo.values()) chumbador.prepararPasso();
    this.sincronizarConjuntosEstruturais(0, false);
    if (aplicarImpulsos) this.aplicarImpulsosPendentes();
    if (this.integracao === 'verlet-gravitacional') this.aplicarKickGravitacional(dtS / 2);
    this.integrarCorpos(dtS);
    if (this.integracao === 'verlet-gravitacional') this.aplicarKickGravitacional(dtS / 2);
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
    this.tempoMissaoS += dtS;
  }

  private atualizarVentoDoPasso(): void {
    let velocidade = this.velocidadeArBaseMps;
    for (const rajada of this.rajadasVento) {
      if (this.tempoMissaoS < rajada.inicioS || this.tempoMissaoS >= rajada.inicioS + rajada.duracaoS) continue;
      velocidade = velocidade.adicionar(rajada.velocidadeAdicionalMps);
    }
    this.velocidadeArAtualMps = velocidade;
    this.atmosfera.definirVelocidadeArPeloMundo(velocidade);
  }

  private aplicarImpulsosPendentes(): void {
    for (const [objetoId, impulsos] of this.impulsosPendentes) {
      const objeto = this.objetos.get(objetoId);
      if (!objeto) continue;
      const conjunto = this.obterConjuntoEstruturalDoObjeto(objeto);
      for (const impulso of impulsos) {
        const pontoM = impulso.pontoM ?? objeto.getEstadoFisico().posicaoM;
        if (conjunto) conjunto.aplicarImpulsoNoPonto(impulso.impulsoNs, pontoM);
        else this.integrador.aplicarImpulsoNoPonto(objeto, impulso.impulsoNs, pontoM);
      }
    }
    this.impulsosPendentes.clear();
  }

  public obterGravidadeMps2(posicaoM: Vetor3): Vetor3 { return this.ambiente.campo.aceleracaoEm(posicaoM); }

  public obterConfiguracaoFisica(): object {
    return { ...this.ambiente.obterConfiguracao(), integracao: this.integracao, maxDtS: this.maxDtS, politicaAtmosferica: this.atmosfera.politicaAltitude, densidadeNivelMarKgM3: this.densidadeAtmosfericaNivelMarKgM3 };
  }

  /** Metade do impulso gravitacional em cada membro, preservando torque de gradiente. */
  private aplicarKickGravitacional(dtS: number): void {
    for (const objeto of this.objetos.values()) {
      this.validarEstadoPlanar(objeto);
      const p = objeto.getEstadoFisico().posicaoM;
      const impulso = this.obterGravidadeMps2(p).multiplicar(objeto.massaKg * dtS);
      const conjunto = this.obterConjuntoEstruturalDoObjeto(objeto);
      if (conjunto) conjunto.aplicarImpulsoNoPonto(impulso, p);
      else this.integrador.aplicarImpulsoNoPonto(objeto, impulso, p);
    }
  }

  private validarVetorPlanar(v: Vetor3): void {
    if (this.ambiente.campo.modelo === 'central' && v.z !== 0) throw new Error('Dinâmica orbital M9 restrita a XY; componente Z não permitida.');
  }
  private validarForcaPlanar(f: ForcaAplicada): void {
    this.validarVetorPlanar(f.forcaN); this.validarVetorPlanar(f.pontoM);
    if (f.torqueNm && (f.torqueNm.x !== 0 || f.torqueNm.y !== 0)) throw new Error('Torque orbital somente em Z.');
  }
  private validarEstadoPlanar(objeto: Objeto): void {
    if (this.ambiente.campo.modelo !== 'central') return;
    const e = objeto.getEstadoFisico();
    this.validarVetorPlanar(e.posicaoM); this.validarVetorPlanar(e.velocidadeMps);
    if (e.orientacaoRad.x !== 0 || e.orientacaoRad.y !== 0 || e.velocidadeAngularRadps.x !== 0 || e.velocidadeAngularRadps.y !== 0) {
      throw new Error('Dinâmica orbital M9 admite orientação e rotação somente em Z.');
    }
  }

  private integrarCorpos(dtS: number): void {
    for (const objeto of this.objetos.values()) {
      if (this.obterConjuntoEstruturalDoObjeto(objeto)) continue;
      const estado = objeto.getEstadoFisico();
      const forcas = (this.forcasPendentes.get(objeto.id) ?? [])
        .map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM }));
      const forcasOperacionais = objeto.obterForcasOperacionais().map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM, torqueNm: forca.torqueNm }));
      const forcasAerodinamicas = objeto.obterForcasAerodinamicas({ densidadeArKgM3: this.atmosfera.obterDensidadeNaPosicaoKgM3(estado.posicaoM), velocidadeArMps: this.velocidadeArAtualMps })
        .map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM }));
      if (this.ambiente.campo.modelo === 'central') for (const f of [...forcas, ...forcasOperacionais, ...forcasAerodinamicas]) this.validarForcaPlanar(f);
      const forcasDasJuntas = [...this.juntasRotacionaisDeBancada.values()].flatMap((junta) => junta.obterForcasPara(objeto));
      this.integrador.integrarObjeto(objeto, [...forcas, ...forcasOperacionais, ...forcasAerodinamicas, ...forcasDasJuntas, { forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: objeto.obterCentroPressaoM() }], this.integracao === 'verlet-gravitacional' ? Vetor3.zero : this.obterGravidadeMps2(estado.posicaoM), dtS);
      objeto.registrarUso(dtS / 3600);
    }
    for (const conjunto of this.conjuntosEstruturais.values()) {
      const forcasDoConjunto: ForcaAplicada[] = [];
      for (const objeto of conjunto.membros) {
        const estado = objeto.getEstadoFisico();
        forcasDoConjunto.push(...(this.forcasPendentes.get(objeto.id) ?? [])
          .map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM })));
        forcasDoConjunto.push(...objeto.obterForcasOperacionais().map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM, torqueNm: forca.torqueNm })));
        forcasDoConjunto.push(...objeto.obterForcasAerodinamicas({ densidadeArKgM3: this.atmosfera.obterDensidadeNaPosicaoKgM3(estado.posicaoM), velocidadeArMps: this.velocidadeArAtualMps }).map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM })));
        if (this.integracao === 'euler-semi-implicito') forcasDoConjunto.push({ forcaN: this.obterGravidadeMps2(estado.posicaoM).multiplicar(objeto.massaKg), pontoM: estado.posicaoM });
        forcasDoConjunto.push({ forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: objeto.obterCentroPressaoM() });
        for (const junta of this.juntasRotacionaisDeBancada.values()) {
          if (junta.objetoBase === objeto || junta.braco === objeto) forcasDoConjunto.push(...junta.obterForcasPara(objeto));
        }
        objeto.registrarUso(dtS / 3600);
      }
      if (this.ambiente.campo.modelo === 'central') for (const f of forcasDoConjunto) this.validarForcaPlanar(f);
      conjunto.integrar(forcasDoConjunto, dtS);
    }
  }

  private sincronizarConjuntosEstruturais(dtS: number, avancarOrientacao: boolean): void {
    const adjacencias = new Map<Objeto, Set<Objeto>>();
    for (const fixador of this.fixadores.values()) {
      if (!fixador.estaAtivo) continue;
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
      const apoiado = pontos.length > 0 && [...this.superficies.values()].some((superficie) => pontos.some((ponto) => superficie.contemProjecao(ponto) && superficie.distanciaAssinadaM(ponto) <= toleranciaApoioM));
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
