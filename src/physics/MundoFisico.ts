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
import { SistemaHidrodinamico, type EstadoImersao } from './agua/SistemaHidrodinamico';
import type { RegiaoAquatica } from './agua/RegiaoAquatica';
import type { PrismaDeslocador } from './agua/GeometriaSubmersa';
import type { PerfilAtmosferico } from './ambiente/PerfilAtmosfericoReentrada';

export interface ConfiguracaoMundoFisico {
  /** Opt-in de cargas axiais distribuídas e diagnóstico das cargas realmente integradas. */
  readonly avaliarCargasEstruturaisDistribuidas?: boolean;
  /** Perfil especializado opt-in. Ausente preserva atmosfera histórica. */
  readonly perfilAtmosferico?: PerfilAtmosferico;
  readonly regioesAquaticas?: readonly RegiaoAquatica[];
  readonly ambiente?: AmbienteFisico;
  /** KDK para gravidade e empuxo hidrostático declarado; dissipação/operação usam passo explícito. */
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
  private readonly hidrodinamica?: SistemaHidrodinamico;
  private readonly perfilAtmosferico?: PerfilAtmosferico;
  private readonly avaliarCargasEstruturaisDistribuidas: boolean;
  private readonly diagnosticosAngularesPasso = new Map<string, { impulsoGravitacionalNmS: number; torqueAerodinamicoNm: number; torqueOutrosContinuosNm: number }>();
  private dtDiagnosticoS = 0;

  /** Compõe registros, ambiente, integração e solucionadores determinísticos; configura água somente quando regiões são declaradas. maxDtS em s positivo/finito; densidade kg/m³ não negativa (zero = vácuo), vento m/s, temperatura °C. Legado plano/Euler por padrão; central usa KDK e restringe XY. Perfil atmosférico opcional é injetado no solucionador compartilhado, sem alterar padrões anteriores. Instala callbacks de consulta/reação, sem depender de relógio real. @contract f-518ff75ab4b7f057 */
  public constructor(private readonly maxDtS = 1 / 60, configuracao: ConfiguracaoMundoFisico = {}) {
    if (!Number.isFinite(maxDtS) || maxDtS <= 0) throw new Error('maxDt deve ser positivo.');
    this.ambiente = configuracao.ambiente ?? new AmbientePlano();
    this.perfilAtmosferico = configuracao.perfilAtmosferico;
    this.avaliarCargasEstruturaisDistribuidas = configuracao.avaliarCargasEstruturaisDistribuidas ?? false;
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
      this.ambiente.campo.modelo === 'central' ? 'vacuo-simplificado-25km' : 'extrapolacao-legada', o => this.fracaoExpostaAr(o), this.perfilAtmosferico);
    if (configuracao.regioesAquaticas?.length) this.hidrodinamica = new SistemaHidrodinamico(
      [...configuracao.regioesAquaticas], p => this.obterGravidadeMps2(p));
    this.sistemaTermico = new SistemaTermico(this.atmosfera, configuracao.temperaturaAmbienteC ?? 20, o => this.fracaoExpostaAr(o));
    this.sistemaSensores = new SistemaSensores(
      () => this.objetos.values(),
      () => this.superficies.values(),
      (objeto) => this.obterConjuntoEstruturalDoObjeto(objeto),
    );
    this.resolvedorColisoes = new ResolvedorColisoes({
      somentePlanoXY: this.ambiente.campo.modelo === 'central',
      /** Fornece ao resolvedor a direção radial local do ambiente na posição global em metros; não calcula uma vertical alternativa. @contract f-6f1f287ebb4b06bb @reviewed M12-DOC: implementação lida. */
      verticalEm: (p) => this.ambiente.referencial.radial(p),
      /** Entrega iterador dos corpos registrados aos resolvedores; os objetos continuam pertencendo ao core, sem cópia da dinâmica. @contract f-9bca04b4b6c063ed @reviewed M12-DOC: implementação lida. */
      obterObjetos: () => this.objetos.values(),
      /** Consulta a ilha estrutural atual do corpo para resolver contatos com massa e inércia compostas. @contract f-23cc335f3cc5d880 @reviewed M12-DOC: implementação lida. */
      obterConjuntoEstrutural: (objeto) => this.obterConjuntoEstruturalDoObjeto(objeto),
      /** Entrega iterador dos fixadores registrados para transmissão e eventual ruptura de esforços físicos. @contract f-7e34327905877d05 @reviewed M12-DOC: implementação lida. */
      obterFixadores: () => this.fixadores.values(),
      resolvedorEsforcoEstrutural: this.resolvedorEsforcoEstrutural,
      /** Porta que encaminha energia dissipada em J aos participantes do contato; delega ao sistema térmico entre objetos ou divide igualmente entre objeto e superfície. O dt em s acompanha o aquecimento do objeto, sem alterar cinemática. @contract f-0ef3d90e16c5ee99 @reviewed M12-DOC: implementação lida. */
      distribuirCalorDeAtrito: (objetoA, objetoB, energiaJ, dtS) => this.sistemaTermico.distribuirCalorDeAtritoEntreObjetos(objetoA, objetoB, energiaJ, dtS),
      velocidadeDeRepousoMps: MundoFisico.velocidadeDeRepousoMps,
      /** Exclui o par de colisões quando alguma junta rotacional registrada declara essa exceção física. @contract f-6ed17c159f596add @reviewed M12-DOC: implementação lida. */
      deveIgnorarColisao: (objetoA, objetoB) => [...this.juntasRotacionaisDeBancada.values()].some((junta) => junta.ignoraColisaoEntre(objetoA, objetoB)),
    });
    this.resolvedorContatoSuperficie = new ResolvedorContatoSuperficie({
      somentePlanoXY: this.ambiente.campo.modelo === 'central',
      /** Entrega iterador dos corpos registrados aos resolvedores; os objetos continuam pertencendo ao core, sem cópia da dinâmica. @contract f-f49ed769f70cbea8 @reviewed M12-DOC: implementação lida. */
      obterObjetos: () => this.objetos.values(),
      /** Entrega iterador das superfícies rígidas ao resolvedor; regiões líquidas não são adicionadas como piso. @contract f-b4cc7c84323b2b76 @reviewed M12-DOC: implementação lida. */
      obterSuperficies: () => this.superficies.values(),
      /** Consulta a ilha estrutural atual do corpo para resolver contatos com massa e inércia compostas. @contract f-79dae79b06413c98 @reviewed M12-DOC: implementação lida. */
      obterConjuntoEstrutural: (objeto) => this.obterConjuntoEstruturalDoObjeto(objeto),
      /** Encaminha ponto global em m e normal à consulta de massa efetiva, preservando contribuição da ilha estrutural. @contract f-cc331bf5e24d2670 @reviewed M12-DOC: implementação lida. */
      obterMassaEfetivaNoContato: (objeto, pontoM, normal) => this.obterMassaEfetivaNoContato(objeto, pontoM, normal),
      /** Entrega iterador dos fixadores registrados para transmissão e eventual ruptura de esforços físicos. @contract f-3f3a80a38e9070f6 @reviewed M12-DOC: implementação lida. */
      obterFixadores: () => this.fixadores.values(),
      resolvedorEsforcoEstrutural: this.resolvedorEsforcoEstrutural,
      /** Porta que encaminha energia dissipada em J aos participantes do contato; delega ao sistema térmico entre objetos ou divide igualmente entre objeto e superfície. O dt em s acompanha o aquecimento do objeto, sem alterar cinemática. @contract f-107e0418e080d86a @reviewed M12-DOC: implementação lida. */
      distribuirCalorDeAtrito: (objeto, superficie, energiaJ, dtS) => {
        if (energiaJ <= 0) return;
        objeto.aplicarCalorDeAtritoPeloCore(energiaJ / 2, dtS);
        superficie.aplicarCalorDeAtritoPeloCore(energiaJ / 2);
      },
      /** Consulta o campo ativo na posição global em m para determinar reação normal e limite de atrito. @contract f-35982ea5bb0323ff @reviewed M12-DOC: implementação lida. */
      obterGravidadeMps2: (p) => this.obterGravidadeMps2(p),
      velocidadeDeRepousoMps: MundoFisico.velocidadeDeRepousoMps,
    });
  }

  /** Consulta o tempo físico acumulado em s; não avança o mundo. @contract f-4b43112c6e426da9 @reviewed M12-DOC: implementação lida. */
  public get tempoS(): number { return this.tempoMissaoS; }
  /** Consulta o vento inercial vigente no último subpasso em m/s. @contract f-eb0f4320448a1c0c @reviewed M12-DOC: implementação lida. */
  public get velocidadeDoArMps(): Vetor3 { return this.velocidadeArAtualMps; }

  /** Vincula prisma deslocador a objeto já registrado; exige sistema aquático e delega validação de geometria exclusiva. @contract f-46c5aaa56d1d830d @reviewed M12-DOC: implementação lida. */
  public registrarGeometriaAquatica(objeto: Objeto, prisma: PrismaDeslocador): void {
    this.exigirRegistro(objeto);
    if (!this.hidrodinamica) throw new Error('Mundo sem região aquática declarada.');
    this.hidrodinamica.registrar(objeto, prisma);
  }
  /** Calcula observações aquáticas do objeto registrado, tomando G da ilha como referência de torque; pode preencher cache geométrico, sem integrar. @contract f-7961c3fbd122116b @reviewed M12-DOC: implementação lida. */
  public obterImersao(objeto: Objeto): readonly EstadoImersao[] {
    this.exigirRegistro(objeto);
    const G = this.obterConjuntoEstruturalDoObjeto(objeto)?.obterCentroDeMassaAtual() ?? objeto.getEstadoFisico().posicaoM;
    return this.hidrodinamica?.calcular(objeto, G).estados ?? [];
  }
  /** Consulta a fração geométrica fora da água, ou 1 em mundo seco; reutiliza o cache hidrodinâmico. @contract f-af1921608b77b4f3 @reviewed M12-DOC: implementação lida. */
  private fracaoExpostaAr(o: Objeto): number { return this.hidrodinamica?.fracaoExpostaAr(o) ?? 1; }

  /** Insere corpo por identidade única após validar compatibilidade XY no ambiente central; não integra. @contract f-e3413f4fbc66159f @reviewed M12-DOC: implementação lida. */
  public registrarObjeto(objeto: Objeto): void {
    if (this.objetos.has(objeto.id)) throw new Error(`Objeto já registrado: ${objeto.id}.`);
    this.validarEstadoPlanar(objeto);
    this.objetos.set(objeto.id, objeto);
  }

  /** Insere geometria sólida por ID único; rejeita plano infinito no ambiente central, preservando plataformas finitas. @contract f-6c1a2f8dcd939983 @reviewed M12-DOC: implementação lida. */
  public registrarSuperficie(superficie: SuperficieFisica): void {
    if (this.ambiente.campo.modelo === 'central' && superficie instanceof SuperficiePlano) {
      throw new Error('Plano infinito incompatível com Terra esférica: use superfície esférica ou plataforma local finita.');
    }
    if (this.superficies.has(superficie.id)) throw new Error(`Superfície já registrada: ${superficie.id}.`);
    this.superficies.set(superficie.id, superficie);
  }

  /** Registra vínculo por ID único entre dois corpos já presentes; topologia será sincronizada no passo físico. @contract f-aa7bf4ca502e4d35 @reviewed M12-DOC: implementação lida. */
  public registrarFixador(fixador: FixadorEstrutural): void {
    if (this.fixadores.has(fixador.id)) throw new Error(`Fixador já registrado: ${fixador.id}.`);
    this.exigirRegistro(fixador.objetoA); this.exigirRegistro(fixador.objetoB);
    this.fixadores.set(fixador.id, fixador);
  }

  /** Registra fundação por ID único para corpo presente; a reação física é resolvida no avanço. @contract f-30c830729acfc968 @reviewed M12-DOC: implementação lida. */
  public registrarChumbadorAoSolo(chumbador: ChumbadorAoSolo): void {
    if (this.chumbadoresAoSolo.has(chumbador.id)) throw new Error(`Chumbador já registrado: ${chumbador.id}.`);
    this.exigirRegistro(chumbador.objeto);
    this.chumbadoresAoSolo.set(chumbador.id, chumbador);
  }

  /** Registra sensor físico de contato após exigir registro do hospedeiro; delega ao SistemaSensores. @contract f-f7b5b7280dc3c8fa @reviewed M12-DOC: implementação lida. */
  public registrarSwitchFimDeCurso(switchFimDeCurso: SwitchFimDeCurso): void {
    this.exigirRegistro(switchFimDeCurso.objetoHospedeiro);
    this.sistemaSensores.registrarSwitchFimDeCurso(switchFimDeCurso);
  }

  /** Configura o ambiente inicial das leituras e instala o pacote de sensores no sistema observacional. @contract f-41ac7bae56a51a91 @reviewed M12-DOC: implementação lida. */
  public registrarSensoresVeiculo(sensores: SensoresVeiculoComposto): void {
    sensores.configurarAmbienteInicial(this.ambiente);
    this.sistemaSensores.registrarSensoresVeiculo(sensores);
  }

  /** Reavalia contatos binários imediatamente, sem integrar tempo; destinado também ao reposicionamento ADM de sensores. @contract f-3760886a2cb462bf @reviewed M12-DOC: implementação lida. */
  public reavaliarSwitchesFimDeCurso(): void { this.sistemaSensores.reavaliarSwitchesFimDeCurso(); }

  /** Registra guia por ID único e corpo presente; não impõe movimento comandado na interface. @contract f-4b87578104c96a2f @reviewed M12-DOC: implementação lida. */
  public registrarGuiaLinear(guia: GuiaLinear): void {
    if (this.guiasLineares.has(guia.id)) throw new Error(`Guia linear já registrada: ${guia.id}.`);
    this.exigirRegistro(guia.objeto);
    this.guiasLineares.set(guia.id, guia);
  }

  /** Registra junta por ID único e exige base/braço presentes; suas forças/restrições pertencem ao core. @contract f-4a3dde9baad222b7 @reviewed M12-DOC: implementação lida. */
  public registrarJuntaRotacionalDeBancada(junta: JuntaRotacionalDeBancada): void {
    if (this.juntasRotacionaisDeBancada.has(junta.id)) throw new Error(`Junta de bancada já registrada: ${junta.id}.`);
    this.exigirRegistro(junta.objetoBase); this.exigirRegistro(junta.braco);
    this.juntasRotacionaisDeBancada.set(junta.id, junta);
  }

  /**
   * Solicita uma força externa, em N, mantida durante todo o próximo avanço.
   * Para manter a força em avanços seguintes, o chamador deve solicitá-la novamente.
   * @contract f-9a9f5f5e187cc458
   */
  public aplicarForca(objeto: Objeto, forcaN: Vetor3, pontoM?: Vetor3): void {
    this.exigirRegistro(objeto);
    this.validarVetorPlanar(forcaN);
    if (pontoM) this.validarVetorPlanar(pontoM);
    const forcas = this.forcasPendentes.get(objeto.id) ?? [];
    forcas.push({ forcaN, pontoM });
    this.forcasPendentes.set(objeto.id, forcas);
  }

  /** Solicita um impulso instantâneo, em N.s, aplicado uma única vez no próximo avanço.
   * @contract f-3d2aac7e14626905
   */
  public aplicarImpulso(objeto: Objeto, impulsoNs: Vetor3, pontoM?: Vetor3): void {
    this.exigirRegistro(objeto);
    this.validarVetorPlanar(impulsoNs);
    if (pontoM) this.validarVetorPlanar(pontoM);
    const impulsos = this.impulsosPendentes.get(objeto.id) ?? [];
    impulsos.push({ impulsoNs, pontoM });
    this.impulsosPendentes.set(objeto.id, impulsos);
  }

  /** Calcula o arrasto atmosférico atual em N para corpo registrado, consultando velocidade física e densidade do mesmo ambiente. @contract f-75ef8579777a79d5 @reviewed M12-DOC: implementação lida. */
  public obterForcaArrastoAtmosferico(objeto: Objeto): Vetor3 {
    this.exigirRegistro(objeto);
    return this.atmosfera.calcularArrasto(objeto, objeto.getEstadoFisico().velocidadeMps);
  }

  /** Leitura do mesmo ambiente usado na integração; não modifica a física.
   * @contract f-db5cbfb2c2eedd9a
   */
  public obterCondicoesAtmosfericas(objeto: Objeto): CondicoesAtmosfericas {
    this.exigirRegistro(objeto);
    return {
      densidadeArKgM3: this.atmosfera.obterDensidadeNaPosicaoKgM3(objeto.getEstadoFisico().posicaoM) * this.fracaoExpostaAr(objeto),
      velocidadeArMps: this.velocidadeArAtualMps,
    };
  }

  /** Mede menor distância assinada em m dos pontos orientados/candidatos à superfície; retorna Infinity quando não há projeção válida. Exige objeto registrado. Caminho para plano conserva ordem numérica legada; demais geometrias consultam candidatos/projeção da superfície. Não corrige penetração nem resolve contato. @contract f-f9dcad885ff21798 @reviewed M12-DOC: implementação lida. */
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

  /** Contatos e apoios efetivamente resolvidos pelo core no último subpasso.
   * @contract f-9cea077721cb03c3
   */
  public obterContatosComSuperficie(): readonly ContatoSuperficieFisico[] {
    return this.resolvedorContatoSuperficie.obterContatos();
  }

  /** Contatos resolvidos deste objeto, opcionalmente limitados a uma superfície.
   * @contract f-5666d3fa4dec8f19
   */
  public obterContatosDoObjeto(objeto: Objeto, superficie?: SuperficieFisica): readonly ContatoSuperficieFisico[] {
    this.exigirRegistro(objeto);
    return this.resolvedorContatoSuperficie.obterContatos().filter((contato) =>
      contato.objetoId === objeto.id && (superficie === undefined || contato.superficieId === superficie.id),
    );
  }

  /** Soma das mesmas forças aerodinâmicas usadas na integração, em torno da referência SI.
   * @contract f-674fcddb7e0f22e1
   */
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

  /** Avança deltaS físico com subpassos limitados por maxDtS e estabilidade hidrodinâmica; não consulta relógio real. deltaS em s positivo/finito. Verifica geometrias aquáticas de todos os corpos. Impulsos pendentes entram uma vez; forças externas duram toda a chamada. Limpa ambas as filas em finally e propaga falhas. Altera cinemática, sistemas, contatos, integridade, sensores e tempo pela receita compartilhada. @contract f-6bd6caac8d77c92e @reviewed M12-DOC: implementação lida. */
  public avancar(deltaS: number): void {
    if (!Number.isFinite(deltaS) || deltaS <= 0) throw new Error('deltaS deve ser positivo e finito.');
    this.hidrodinamica?.verificarDeclaracoes(this.objetos.values());
    try {
      let restante = deltaS;
      let primeiroPasso = true;
      while (restante > 0) {
        let passoS = Math.min(restante, this.maxDtS);
        if (this.hidrodinamica) for (const objeto of this.objetos.values()) {
          const conjunto = this.obterConjuntoEstruturalDoObjeto(objeto);
          passoS = Math.min(passoS, this.hidrodinamica.limitePassoS(objeto, conjunto?.massaTotalKg ?? objeto.massaKg,
            conjunto?.momentoInerciaZKgM2 ?? objeto.getMomentoInerciaKgM2().z,
            conjunto?.obterCentroDeMassaAtual() ?? objeto.getEstadoFisico().posicaoM));
        }
        if (!Number.isFinite(passoS) || passoS <= 0) throw new Error('Passo hidrodinâmico não finito.');
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

  /** Receita explícita do passo; fenômenos físicos vivem nos subsistemas.
   * @contract f-99ffa3537971f382
   */
  private integrarPasso(dtS: number, aplicarImpulsos: boolean): void {
    this.diagnosticosAngularesPasso.clear(); this.dtDiagnosticoS = dtS;
    this.atualizarVentoDoPasso();
    this.atualizarApoioDeTracao();
    for (const objeto of this.objetos.values()) objeto.prepararPassoEnergetico(dtS);
    for (const objeto of this.objetos.values()) objeto.prepararPassoOperacional(dtS);
    this.sistemaTermico.atualizar([...this.objetos.values()], dtS);
    for (const fixador of this.fixadores.values()) fixador.prepararPasso(dtS);
    for (const chumbador of this.chumbadoresAoSolo.values()) chumbador.prepararPasso();
    this.sincronizarConjuntosEstruturais(0, false);
    if (aplicarImpulsos) this.aplicarImpulsosPendentes();
    if (this.hidrodinamica || this.avaliarCargasEstruturaisDistribuidas) {
      const ativosAntes = [...this.fixadores.values()].filter(f => f.estaAtivo).length;
      for (const o of this.objetos.values()) this.hidrodinamica?.atualizarCarregamento(o, dtS);
      for (const conjunto of this.conjuntosEstruturais.values()) {
        const cargas = conjunto.membros.map(objeto => {
          const e = objeto.getEstadoFisico();
          const forcas: ForcaAplicada[] = [
            { forcaN: this.obterGravidadeMps2(e.posicaoM).multiplicar(objeto.massaKg), pontoM: e.posicaoM },
            { forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: objeto.obterCentroPressaoM() },
            ...(this.hidrodinamica?.calcular(objeto).forcas ?? []),
            ...objeto.obterForcasOperacionais().map(f => ({ ...f, pontoM: f.pontoM ?? e.posicaoM })),
            ...objeto.obterForcasAerodinamicas(this.obterCondicoesAtmosfericas(objeto)).map(f => ({ ...f, pontoM: f.pontoM ?? e.posicaoM })),
            ...(this.forcasPendentes.get(objeto.id) ?? []).map(f => ({ ...f, pontoM: f.pontoM ?? e.posicaoM })),
          ]; return { objeto, forcas };
        });
        this.resolvedorEsforcoEstrutural.registrarCargasDistribuidas(conjunto, cargas, this.fixadores.values());
      }
      if ([...this.fixadores.values()].filter(f => f.estaAtivo).length !== ativosAntes) this.sincronizarConjuntosEstruturais(0, false);
    }
    if (this.integracao === 'verlet-gravitacional') { this.aplicarKickGravitacional(dtS / 2); this.aplicarKickHidrostatico(dtS / 2); }
    this.integrarCorpos(dtS);
    if (this.integracao === 'verlet-gravitacional') { this.aplicarKickGravitacional(dtS / 2); this.aplicarKickHidrostatico(dtS / 2); }
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

  /** Soma rajadas ativas no intervalo [início,início+duração) ao vento base e atualiza atmosfera no tempo físico atual. @contract f-412f6c5528fa3d74 @reviewed M12-DOC: implementação lida. */
  private atualizarVentoDoPasso(): void {
    let velocidade = this.velocidadeArBaseMps;
    for (const rajada of this.rajadasVento) {
      if (this.tempoMissaoS < rajada.inicioS || this.tempoMissaoS >= rajada.inicioS + rajada.duracaoS) continue;
      velocidade = velocidade.adicionar(rajada.velocidadeAdicionalMps);
    }
    this.velocidadeArAtualMps = velocidade;
    this.atmosfera.definirVelocidadeArPeloMundo(velocidade);
  }

  /** Consome a fila de impulsos em N·s uma única vez, aplicando na ilha ou corpo isolado; ponto ausente usa centro atual. @contract f-890059995735e624 @reviewed M12-DOC: implementação lida. */
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

  /** Consulta aceleração m/s² do campo do ambiente na posição inercial em m; não integra nem depende da orientação. @contract f-b8b386144342054d @reviewed M12-DOC: implementação lida. */
  public obterGravidadeMps2(posicaoM: Vetor3): Vetor3 { return this.ambiente.campo.aceleracaoEm(posicaoM); }

  /** Exporta identificação do ambiente, integração, dt máximo, revisão angular,
   * atmosfera e água para diários/replay. Perfil completo somente quando injetado.
   * A revisão angular distingue reconstrução intrínseca relativa RE-002B de
   * diários anteriores; não altera parâmetros nem garante compatibilidade antiga.
   * @contract f-d3dca202d77d15ec */
  public obterConfiguracaoFisica(): object {
    return { ...this.ambiente.obterConfiguracao(), integracao: this.integracao, revisaoDinamicaAngular: 'intrinseca-relativa-3', maxDtS: this.maxDtS, politicaAtmosferica: this.atmosfera.politicaAltitude, densidadeNivelMarKgM3: this.densidadeAtmosfericaNivelMarKgM3,
      ...(this.avaliarCargasEstruturaisDistribuidas ? { cargasDistribuidas: 'axial-pontes-1' } : {}),
      ...(this.perfilAtmosferico ? { politicaAtmosferica: 'perfil-injetado', perfilAtmosferico: this.perfilAtmosferico.obterConfiguracao() } : {}),
      ...(this.hidrodinamica ? { hidrodinamica: this.hidrodinamica.obterConfiguracao() } : {}) };
  }

  /** Metade do impulso gravitacional em cada membro, preservando torque de gradiente.
   * @contract f-ba4f542a6685a8b0
   */
  private aplicarKickGravitacional(dtS: number): void {
    const lotes = new Map<ConjuntoEstruturalRigido, { impulsoNs: Vetor3; pontoM: Vetor3 }[]>();
    for (const objeto of this.objetos.values()) {
      this.validarEstadoPlanar(objeto);
      const p = objeto.getEstadoFisico().posicaoM;
      const impulso = this.obterGravidadeMps2(p).multiplicar(objeto.massaKg * dtS);
      const conjunto = this.obterConjuntoEstruturalDoObjeto(objeto);
      if (conjunto) {
        const lote = lotes.get(conjunto) ?? []; lote.push({ impulsoNs: impulso, pontoM: p }); lotes.set(conjunto, lote);
      } else this.integrador.aplicarImpulsoNoPonto(objeto, impulso, p);
    }
    for (const [conjunto, lote] of lotes) {
      if (this.avaliarCargasEstruturaisDistribuidas) {
        const G = conjunto.obterCentroDeMassaAtual();
        const impulsoAngular = lote.reduce((s, j) => s + j.pontoM.subtrair(G).produtoVetorial(j.impulsoNs).z, 0);
        this.registrarDiagnosticoAngular(conjunto, impulsoAngular);
      }
      conjunto.aplicarImpulsosSequenciais(lote);
    }
  }
  /** Aplica impulso F_empuxo·dt em N·s nos centros de volume; usa lotes sequenciais por ilha e não reaplica o arrasto dissipativo. @contract f-1d8fd7f1e67ca925 @reviewed M12-DOC: implementação lida. */
  private aplicarKickHidrostatico(dtS: number): void {
    if (!this.hidrodinamica) return;
    const lotes = new Map<ConjuntoEstruturalRigido, { impulsoNs: Vetor3; pontoM: Vetor3 }[]>();
    for (const objeto of this.objetos.values()) for (const f of this.hidrodinamica.obterEmpuxos(objeto)) {
      const impulso = f.forcaN.multiplicar(dtS), conjunto = this.obterConjuntoEstruturalDoObjeto(objeto);
      if (conjunto) {
        const lote = lotes.get(conjunto) ?? []; lote.push({ impulsoNs: impulso, pontoM: f.pontoM }); lotes.set(conjunto, lote);
      } else this.integrador.aplicarImpulsoNoPonto(objeto, impulso, f.pontoM);
    }
    for (const [conjunto, lote] of lotes) conjunto.aplicarImpulsosSequenciais(lote);
  }

  /** Consulta cópia das cargas angulares do último subpasso, somente se ativadas.
   * Impulso gravitacional N·m·s vem dos dois kicks; torque aero/outros em N·m
   * vem da lista efetivamente integrada. Não inclui impulsos de contato/ruptura,
   * que exigem classificação separada do balanço. Não escreve estado físico.
   * @contract f-09aef6aae989916b
   */
  public obterDiagnosticoAngularDoPasso(objeto: Objeto) {
    const d = this.diagnosticosAngularesPasso.get(objeto.id);
    return d ? { ...d, dtS: this.dtDiagnosticoS } : undefined;
  }

  /** Registra grandezas derivadas das cargas aplicadas à ilha, sem reaplicá-las.
   * Sem opt-in não faz cálculos adicionais. G é o mesmo usado pela integração;
   * outros torques são a resultante não aero (gravidade KDK entra por impulso).
   * @contract f-5a683553b2a0f912
   */
  private registrarDiagnosticoAngular(conjunto: ConjuntoEstruturalRigido, impulsoGravitacionalNmS: number,
    forcas?: readonly ForcaAplicada[]): void {
    if (!this.avaliarCargasEstruturaisDistribuidas) return;
    const antigo = this.diagnosticosAngularesPasso.get(conjunto.membros[0].id);
    const G = conjunto.obterCentroDeMassaAtual();
    const aero = forcas ? this.obterCargasAerodinamicas(conjunto.membros, G).torqueNm.z : antigo?.torqueAerodinamicoNm ?? 0;
    const total = forcas?.reduce((s, f) => s + f.pontoM.subtrair(G).produtoVetorial(f.forcaN).z + (f.torqueNm?.z ?? 0), 0);
    const d = { impulsoGravitacionalNmS: (antigo?.impulsoGravitacionalNmS ?? 0) + impulsoGravitacionalNmS,
      torqueAerodinamicoNm: aero, torqueOutrosContinuosNm: total === undefined ? antigo?.torqueOutrosContinuosNm ?? 0 : total - aero };
    for (const o of conjunto.membros) this.diagnosticosAngularesPasso.set(o.id, d);
  }

  /** Rejeita componente Z diferente de zero no ambiente central; o legado conserva o contrato anterior. @contract f-bed4015e9d6bffc1 @reviewed M12-DOC: implementação lida. */
  private validarVetorPlanar(v: Vetor3): void {
    if (this.ambiente.campo.modelo === 'central' && v.z !== 0) throw new Error('Dinâmica orbital M9 restrita a XY; componente Z não permitida.');
  }
  /** Exige força/ponto em XY e torque externo somente em Z; rejeita solicitações incompatíveis com o modelo central. @contract f-8287e1f7d35ee0e5 @reviewed M12-DOC: implementação lida. */
  private validarForcaPlanar(f: ForcaAplicada): void {
    this.validarVetorPlanar(f.forcaN); this.validarVetorPlanar(f.pontoM);
    if (f.torqueNm && (f.torqueNm.x !== 0 || f.torqueNm.y !== 0)) throw new Error('Torque orbital somente em Z.');
  }
  /** No ambiente central exige posição/velocidade XY e atitude/taxa somente em Z; não projeta estados inválidos silenciosamente. @contract f-5bccf57f8e1d2ebe @reviewed M12-DOC: implementação lida. */
  private validarEstadoPlanar(objeto: Objeto): void {
    if (this.ambiente.campo.modelo !== 'central') return;
    const e = objeto.getEstadoFisico();
    this.validarVetorPlanar(e.posicaoM); this.validarVetorPlanar(e.velocidadeMps);
    if (e.orientacaoRad.x !== 0 || e.orientacaoRad.y !== 0 || e.velocidadeAngularRadps.x !== 0 || e.velocidadeAngularRadps.y !== 0) {
      throw new Error('Dinâmica orbital M9 admite orientação e rotação somente em Z.');
    }
  }

  /** Reúne forças operacionais, externas, aerodinâmicas, juntas e água; integra uma vez cada corpo isolado ou ilha e registra uso em horas. dtS em s escolhido pelo avanço. Gravidade/empuxo já aplicados por KDK são omitidos da força explícita. Pontos de aplicação são físicos e massas são instantâneas; atualiza estados somente pelos integradores/ilha. Diagnóstico opt-in captura forças no instante efetivamente integrado, após atuação e primeiro kick. @contract f-3e1c3598586d381e */
  private integrarCorpos(dtS: number): void {
    for (const objeto of this.objetos.values()) {
      if (this.obterConjuntoEstruturalDoObjeto(objeto)) continue;
      const estado = objeto.getEstadoFisico();
      const forcas = (this.forcasPendentes.get(objeto.id) ?? [])
        .map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM }));
      const forcasOperacionais = objeto.obterForcasOperacionais().map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM, torqueNm: forca.torqueNm }));
      const forcasAerodinamicas = objeto.obterForcasAerodinamicas(this.obterCondicoesAtmosfericas(objeto))
        .map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM }));
      if (this.ambiente.campo.modelo === 'central') for (const f of [...forcas, ...forcasOperacionais, ...forcasAerodinamicas]) this.validarForcaPlanar(f);
      const forcasDasJuntas = [...this.juntasRotacionaisDeBancada.values()].flatMap((junta) => junta.obterForcasPara(objeto));
      const forcasAquaticas = this.hidrodinamica?.calcular(objeto, estado.posicaoM, this.integracao !== 'verlet-gravitacional').forcas ?? [];
      this.integrador.integrarObjeto(objeto, [...forcas, ...forcasOperacionais, ...forcasAerodinamicas, ...forcasDasJuntas, { forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: objeto.obterCentroPressaoM() }, ...forcasAquaticas], this.integracao === 'verlet-gravitacional' ? Vetor3.zero : this.obterGravidadeMps2(estado.posicaoM), dtS);
      objeto.registrarUso(dtS / 3600);
    }
    for (const conjunto of this.conjuntosEstruturais.values()) {
      const forcasDoConjunto: ForcaAplicada[] = [];
      for (const objeto of conjunto.membros) {
        const estado = objeto.getEstadoFisico();
        forcasDoConjunto.push(...(this.forcasPendentes.get(objeto.id) ?? [])
          .map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM })));
        forcasDoConjunto.push(...objeto.obterForcasOperacionais().map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM, torqueNm: forca.torqueNm })));
        forcasDoConjunto.push(...objeto.obterForcasAerodinamicas(this.obterCondicoesAtmosfericas(objeto)).map((forca) => ({ forcaN: forca.forcaN, pontoM: forca.pontoM ?? estado.posicaoM })));
        if (this.integracao === 'euler-semi-implicito') forcasDoConjunto.push({ forcaN: this.obterGravidadeMps2(estado.posicaoM).multiplicar(objeto.massaKg), pontoM: estado.posicaoM });
        forcasDoConjunto.push({ forcaN: this.obterForcaArrastoAtmosferico(objeto), pontoM: objeto.obterCentroPressaoM() });
        forcasDoConjunto.push(...(this.hidrodinamica?.calcular(objeto, conjunto.obterCentroDeMassaAtual(), this.integracao !== 'verlet-gravitacional').forcas ?? []));
        for (const junta of this.juntasRotacionaisDeBancada.values()) {
          if (junta.objetoBase === objeto || junta.braco === objeto) forcasDoConjunto.push(...junta.obterForcasPara(objeto));
        }
        objeto.registrarUso(dtS / 3600);
      }
      if (this.ambiente.campo.modelo === 'central') for (const f of forcasDoConjunto) this.validarForcaPlanar(f);
      this.registrarDiagnosticoAngular(conjunto, 0, forcasDoConjunto);
      conjunto.integrar(forcasDoConjunto, dtS);
    }
  }

  /** Reconstrói componentes conexos dos fixadores ativos, reutiliza ilhas por assinatura de membros e remove ilhas cuja topologia deixou de existir; sincroniza rigidez. @contract f-af4f0f7ead83e4dc @reviewed M12-DOC: implementação lida. */
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

  /** Avalia pontos de aderência orientados contra superfícies sólidas com tolerância de 0,02 m; atualiza permissão de tração no core, sem ancorar corpos. @contract f-e0f6d2dcba6e82f4 @reviewed M12-DOC: implementação lida. */
  private atualizarApoioDeTracao(): void {
    const toleranciaApoioM = 0.02;
    for (const objeto of this.objetos.values()) {
      const pontos = this.obterPontosOrientados(objeto, objeto.getPontosDeTracaoLocaisM());
      const apoiado = pontos.length > 0 && [...this.superficies.values()].some((superficie) => pontos.some((ponto) => superficie.contemProjecao(ponto) && superficie.distanciaAssinadaM(ponto) <= toleranciaApoioM));
      objeto.atualizarContatoDeTracaoPeloCore(apoiado);
    }
  }

  /** Transforma pontos locais em m pela rotação Z e translação física atuais; devolve novos vetores globais. @contract f-9473634128208bd2 @reviewed M12-DOC: implementação lida. */
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

  /** Procura a ilha atualmente registrada que contém o mesmo objeto; ausência devolve undefined. @contract f-b219b09925e9fcb0 @reviewed M12-DOC: implementação lida. */
  private obterConjuntoEstruturalDoObjeto(objeto: Objeto): ConjuntoEstruturalRigido | undefined {
    return [...this.conjuntosEstruturais.values()].find((conjunto) => conjunto.contem(objeto));
  }

  /** Consulta massa efetiva em kg no ponto/normal da ilha ou fixador; undefined indica ausência dessas restrições. @contract f-17e4d2400cfdabbe @reviewed M12-DOC: implementação lida. */
  private obterMassaEfetivaNoContato(objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3): number | undefined {
    const conjunto = this.obterConjuntoEstruturalDoObjeto(objeto);
    if (conjunto) return conjunto.obterMassaEfetivaNoContato(pontoContatoM, normal);
    for (const fixador of this.fixadores.values()) {
      const massaEfetiva = fixador.obterMassaEfetivaNoContato(objeto, pontoContatoM, normal);
      if (massaEfetiva !== undefined) return massaEfetiva;
    }
    return undefined;
  }

  /** Impede operação do mundo sobre identidade de objeto não registrada; lança erro, sem inserir automaticamente. @contract f-f2830aafb5289482 @reviewed M12-DOC: implementação lida. */
  private exigirRegistro(objeto: Objeto): void {
    if (!this.objetos.has(objeto.id)) throw new Error(`Objeto não registrado: ${objeto.id}.`);
  }
}
