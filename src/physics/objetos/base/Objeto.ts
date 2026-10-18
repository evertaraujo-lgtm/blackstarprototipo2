import { RedeTermica, type DefinicaoRedeTermica } from '../../termica/RedeTermica';
import { Vetor3 } from '../../Vetor3';
import { Paraquedas, type EstadoParaquedas } from '../componentes/Paraquedas';

export interface EstadoFisico {
  readonly posicaoM: Vetor3;
  readonly velocidadeMps: Vetor3;
  readonly orientacaoRad: Vetor3;
  readonly velocidadeAngularRadps: Vetor3;
}

export interface DefinicaoObjeto {
  readonly id: string;
  readonly massaBaseKg: number;
  readonly dimensoesM: Vetor3;
  readonly resistenciaColisaoJ: number;
  /** Fração de energia dissipada pelo próprio material em um impacto (0 a < 1). */
  readonly dissipacaoImpacto?: number;
  /** Coeficiente de atrito dinâmico contra superfícies (0 a 1). */
  readonly coeficienteAtrito?: number;
  /** Coeficiente de atrito contra outros objetos apoiados (0 a 1). */
  readonly coeficienteAtritoEntreObjetos?: number;
  /** Limite de temperatura acima do qual inicia degradação, em graus Celsius. */
  readonly limiteTermicoC: number;
  /** Fusão/colapso do material em °C; opcional e superior ao início do dano. */
  readonly temperaturaFusaoC?: number;
  /** Falha térmica total, sem implicar fusão do material. */
  readonly temperaturaFalhaTotalC?: number;
  readonly temperaturaInicialC?: number;
  readonly capacidadeTermicaJPorC?: number;
  readonly areaTermicaM2?: number;
  readonly coeficienteConveccaoWPorM2C?: number;
  readonly taxaDanoTermicoPorSegundo?: number;
  readonly areaFrontalM2?: number;
  readonly coeficienteArrasto?: number;
  /** Escala a área frontal pela projeção da geometria XY conforme atitude e fluxo relativo. */
  readonly areaArrastoProjetadaPorOrientacao?: boolean;
  /** Centro de pressão do arrasto, relativo ao centro do objeto, em m. */
  readonly centroPressaoLocalM?: Vetor3;
  /** Fração da potência de arrasto que aquece o próprio objeto (0 a 1). */
  readonly fracaoAquecimentoAerodinamico?: number;
  readonly estadoInicial?: Partial<EstadoFisico>;
}

/** Uma solicitação de força produzida por um componente do objeto. */
export interface ForcaFisicaSolicitada {
  readonly forcaN: Vetor3;
  readonly pontoM?: Vetor3;
  /** Torque externo solicitado diretamente, em N.m. */
  readonly torqueNm?: Vetor3;
}

export interface CondicoesAtmosfericas {
  readonly densidadeArKgM3: number;
  readonly velocidadeArMps: Vetor3;
}

export interface JatoTermico {
  readonly potenciaW: number;
  readonly alcanceM: number;
  readonly aberturaRad: number;
  readonly direcaoM: Vetor3;
}

/**
 * Entidade física base. Somente o MundoFisico deve alterar seu estado
 * cinemático por meio de atualizarEstadoPeloCore.
 */
export class Objeto {
  private massaVariavelKg = 0;
  private integridade = 1;
  private horasVidaUtilConsumidas = 0;
  private estado: EstadoFisico;
  private inerciaCalculada?: { massaKg: number; x: number; y: number; z: number; valor: Vetor3 };
  private paraquedasAcoplado?: Paraquedas;
  private temperaturaAtualC: number;
  private redeTermica?: RedeTermica;
  private energiaTermicaDeAtritoJ = 0;
  private energiaTermicaAerodinamicaJ = 0;

  /** Valida definição física e limites declarados; cria estado inicial congelado e temperatura °C. Massas/dimensões positivas são responsabilidade da configuração. @contract f-0a5a2a6326f96011 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoObjeto) {
    if (!definicao.id) throw new Error('Objeto precisa de identidade.');
    if (definicao.massaBaseKg <= 0) throw new Error('Massa base deve ser positiva.');
    if (definicao.dimensoesM.x <= 0 || definicao.dimensoesM.y <= 0 || definicao.dimensoesM.z <= 0) {
      throw new Error('Dimensões devem ser positivas.');
    }
    if (definicao.resistenciaColisaoJ <= 0 || !Number.isFinite(definicao.limiteTermicoC)) {
      throw new Error('Resistência a colisão deve ser positiva e limite térmico deve ser finito.');
    }
    if (definicao.temperaturaFusaoC !== undefined &&
        (!Number.isFinite(definicao.temperaturaFusaoC) || definicao.temperaturaFusaoC <= definicao.limiteTermicoC)) {
      throw new Error('Temperatura de fusão deve ser finita e superior ao limite de dano, em °C.');
    }
    const dissipacaoImpacto = definicao.dissipacaoImpacto ?? 0.15;
    if (!Number.isFinite(dissipacaoImpacto) || dissipacaoImpacto < 0 || dissipacaoImpacto >= 1) {
      throw new Error('Dissipação de impacto deve estar entre 0 e 1.');
    }
    const coeficienteAtrito = definicao.coeficienteAtrito ?? 0.65;
    if (!Number.isFinite(coeficienteAtrito) || coeficienteAtrito < 0 || coeficienteAtrito > 1) {
      throw new Error('Coeficiente de atrito deve estar entre 0 e 1.');
    }
    const coeficienteAtritoEntreObjetos = definicao.coeficienteAtritoEntreObjetos ?? 0;
    if (!Number.isFinite(coeficienteAtritoEntreObjetos) || coeficienteAtritoEntreObjetos < 0 || coeficienteAtritoEntreObjetos > 1) {
      throw new Error('Atrito entre objetos deve estar entre 0 e 1.');
    }
    if (definicao.areaFrontalM2 !== undefined && definicao.areaFrontalM2 <= 0) {
      throw new Error('Área frontal deve ser positiva.');
    }
    if (definicao.coeficienteArrasto !== undefined && definicao.coeficienteArrasto < 0) {
      throw new Error('Coeficiente de arrasto não pode ser negativo.');
    }
    const fracaoAquecimentoAerodinamico = definicao.fracaoAquecimentoAerodinamico ?? 0.1;
    if (!Number.isFinite(fracaoAquecimentoAerodinamico) || fracaoAquecimentoAerodinamico < 0 || fracaoAquecimentoAerodinamico > 1) {
      throw new Error('Fração de aquecimento aerodinâmico deve estar entre 0 e 1.');
    }

    this.estado = Object.freeze({
      posicaoM: definicao.estadoInicial?.posicaoM ?? Vetor3.zero,
      velocidadeMps: definicao.estadoInicial?.velocidadeMps ?? Vetor3.zero,
      orientacaoRad: definicao.estadoInicial?.orientacaoRad ?? Vetor3.zero,
      velocidadeAngularRadps: definicao.estadoInicial?.velocidadeAngularRadps ?? Vetor3.zero,
    });
    if (definicao.temperaturaFalhaTotalC !== undefined && (!Number.isFinite(definicao.temperaturaFalhaTotalC) || definicao.temperaturaFalhaTotalC <= definicao.limiteTermicoC)) throw new Error('Temperatura de falha total inválida.');
    this.temperaturaAtualC = definicao.temperaturaInicialC ?? 20;
  }

  /** Devolve `this.definicao.id`. Efeitos indiretos seguem as dependências chamadas. @contract f-23fabd3a58761361 */
  public get id(): string { return this.definicao.id; }
  /** Devolve `this.definicao.massaBaseKg`. Efeitos indiretos seguem as dependências chamadas. @contract f-b964968d0fb19009 */
  public get massaBaseKg(): number { return this.definicao.massaBaseKg; }
  /** Devolve `this.definicao.massaBaseKg + this.massaVariavelKg + (this.paraquedasAcoplado?.massaKg ?? 0)`. Efeitos indiretos seguem as dependências chamadas. @contract f-eff125a966da1f02 */
  public get massaKg(): number { return this.definicao.massaBaseKg + this.massaVariavelKg + (this.paraquedasAcoplado?.massaKg ?? 0); }
  /** Devolve `this.definicao.dimensoesM`. Efeitos indiretos seguem as dependências chamadas. @contract f-f13282f5a28640a9 */
  public get dimensoesM(): Vetor3 { return this.definicao.dimensoesM; }
  /** Devolve `this.definicao.resistenciaColisaoJ`. Efeitos indiretos seguem as dependências chamadas. @contract f-4f9ca4814fdaace8 */
  public get resistenciaColisaoJ(): number { return this.definicao.resistenciaColisaoJ; }
  /** Devolve `this.definicao.dissipacaoImpacto ?? 0.15`. Efeitos indiretos seguem as dependências chamadas. @contract f-4e4d0b39192935bf */
  public get dissipacaoImpacto(): number { return this.definicao.dissipacaoImpacto ?? 0.15; }
  /** Devolve `this.definicao.coeficienteAtrito ?? 0.65`. Efeitos indiretos seguem as dependências chamadas. @contract f-04613d7dbacb323b */
  public get coeficienteAtrito(): number { return this.definicao.coeficienteAtrito ?? 0.65; }
  /** Devolve `this.definicao.coeficienteAtritoEntreObjetos ?? 0`. Efeitos indiretos seguem as dependências chamadas. @contract f-a56d92711ddba117 */
  public get coeficienteAtritoEntreObjetos(): number { return this.definicao.coeficienteAtritoEntreObjetos ?? 0; }
  /** Limiar estrutural °C na rede optante; limite concentrado legado nos demais. @contract f-ef895eec91db525d */
  public get limiteTermicoC(): number { return this.redeTermica?.obterRegiao(this.redeTermica.definicao.regiaoEstrutural).limiteTermicoC ?? this.definicao.limiteTermicoC; }
  /** Devolve `this.definicao.temperaturaFusaoC`. Efeitos indiretos seguem as dependências chamadas. @contract f-8a88686ab77df881 */
  public get temperaturaFusaoC(): number | undefined { return this.definicao.temperaturaFusaoC; }
  /** Devolve `this.definicao.temperaturaFalhaTotalC`. Efeitos indiretos seguem as dependências chamadas. @contract f-e691146ec640ca1b */
  public get temperaturaFalhaTotalC(): number | undefined { return this.definicao.temperaturaFalhaTotalC; }
  /** Temperatura estrutural °C na rede optante; temperatura uniforme legada nos demais. @contract f-f51e927410ea5fc0 */
  public get temperaturaC(): number { return this.redeTermica?.obterRegiao(this.redeTermica.definicao.regiaoEstrutural).temperaturaC ?? this.temperaturaAtualC; }
  /** Capacidade estrutural J/°C na rede optante; capacidade concentrada legada nos demais. @contract f-50b0fd0df35bc5d7 */
  public get capacidadeTermicaJPorC(): number { return this.redeTermica?.obterRegiao(this.redeTermica.definicao.regiaoEstrutural).capacidadeJPorC ?? this.definicao.capacidadeTermicaJPorC ?? this.massaKg * 500; }
  /** Devolve `this.definicao.areaTermicaM2 ?? Math.max(0.1, this.dimensoesM.x * this.dimensoesM.y)`. Efeitos indiretos seguem as dependências chamadas. @contract f-cf1ecdb8534b1ed7 */
  public get areaTermicaM2(): number { return this.definicao.areaTermicaM2 ?? Math.max(0.1, this.dimensoesM.x * this.dimensoesM.y); }
  /** Devolve `this.definicao.coeficienteConveccaoWPorM2C ?? 10`. Efeitos indiretos seguem as dependências chamadas. @contract f-af88ebcdb549f68a */
  public get coeficienteConveccaoWPorM2C(): number { return this.definicao.coeficienteConveccaoWPorM2C ?? 10; }
  /** Devolve `this.definicao.areaFrontalM2 ?? 0`. Efeitos indiretos seguem as dependências chamadas. @contract f-32aa5b53d57963b0 */
  public get areaFrontalM2(): number { return this.definicao.areaFrontalM2 ?? 0; }
  /** Devolve `this.definicao.coeficienteArrasto ?? 1`. Efeitos indiretos seguem as dependências chamadas. @contract f-0c3a9624f2ce2cbf */
  public get coeficienteArrasto(): number { return this.definicao.coeficienteArrasto ?? 1; }
  /** Devolve `this.definicao.fracaoAquecimentoAerodinamico ?? 0.1`. Efeitos indiretos seguem as dependências chamadas. @contract f-584efc7e11184cb2 */
  public get fracaoAquecimentoAerodinamico(): number { return this.definicao.fracaoAquecimentoAerodinamico ?? 0.1; }
  /** Devolve `this.energiaTermicaDeAtritoJ`. Efeitos indiretos seguem as dependências chamadas. @contract f-51f1927917f5a0d0 */
  public get energiaTermicaDeAtritoAcumuladaJ(): number { return this.energiaTermicaDeAtritoJ; }
  /** Devolve `this.energiaTermicaAerodinamicaJ`. Efeitos indiretos seguem as dependências chamadas. @contract f-2848da0fe68bc5e8 */
  public get energiaTermicaAerodinamicaAcumuladaJ(): number { return this.energiaTermicaAerodinamicaJ; }
  /** Devolve `this.paraquedasAcoplado?.estaAberto ?? false`. Efeitos indiretos seguem as dependências chamadas. @contract f-1107671263be49a8 */
  public get paraquedasEstaAberto(): boolean { return this.paraquedasAcoplado?.estaAberto ?? false; }
  /** Devolve `this.integridade`. Efeitos indiretos seguem as dependências chamadas. @contract f-16714b3ef5311e65 */
  public get integridadeEstrutural(): number { return this.integridade; }
  /** Devolve `this.horasVidaUtilConsumidas`. Efeitos indiretos seguem as dependências chamadas. @contract f-6b9361e290ef0d54 */
  public get horasConsumidas(): number { return this.horasVidaUtilConsumidas; }

  /** Devolve referência ao estado físico congelado atual, contendo vetores imutáveis; escrita legítima do core substitui o registro inteiro. @contract f-7d456f55b10d8f57 @reviewed M12-DOC: implementação lida. */
  public getEstadoFisico(): EstadoFisico {
    // Estado somente para leitura; cada escrita do core substitui o snapshot inteiro.
    return this.estado;
  }

  /**
   * Componentes podem solicitar forças ao núcleo neste ponto do passo físico.
   * A implementação base não produz força; ela existe para que o core não
   * precise conhecer subclasses ou controladores de domínio.
   * @contract f-65a0ceec1434076f
   */
  public obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    return [];
  }
  /** Hook base sem geração interna: retorna 0 W; especializações podem fornecer potência física. @contract f-16defccad83f402d @reviewed M12-DOC: implementação lida. */
  public obterPotenciaTermicaGeradaW(): number { return 0; }
  /** Potência W transferida ao corpo a partir da dissipação no ar W. O padrão
   * preserva a fração histórica; especializações retornam uma única parcela,
   * limitada à dissipação pelo SistemaTermico. Consulta pura; aplicação só pelo core.
   * @contract f-8a36fd8decc22230
   */
  public obterPotenciaAquecimentoAerodinamicoW(_condicoes: CondicoesAtmosfericas, potenciaDissipadaW: number): number {
    return potenciaDissipadaW * this.fracaoAquecimentoAerodinamico;
  }
  /** Hook base sem jato térmico: retorna undefined; especializações declaram geometria e potência. @contract f-c5780a53173bbe5c @reviewed M12-DOC: implementação lida. */
  public obterJatoTermico(): JatoTermico | undefined { return undefined; }

  /** Preparação determinística de recursos antes da integração do passo. */
  /** Reserva orçamentos energéticos antes de preparar qualquer consumidor.
   * @contract f-c3ef45c3f688a134
   */
  public prepararPassoEnergetico(_dtS: number): void {}
  /** Hook base sem operação; especializações atualizam sistemas/solicitações antes da integração, sem escrever cinemática. @contract f-22d0031bf76cca21 @reviewed M12-DOC: implementação lida. */
  public prepararPassoOperacional(_dtS: number): void {}

  /** Forças aerodinâmicas produzidas por componentes do objeto.
   * @contract f-5a683317d550638e
   */
  public obterForcasAerodinamicas(_condicoes: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[] {
    return [];
  }

  /** Acopla um único paraquedas físico ao objeto nesta etapa do modelo.
   * @contract f-25d8c1802ba46a63
   */
  public acoplarParaquedas(paraquedas: Paraquedas): void {
    if (this.paraquedasAcoplado) throw new Error('Objeto já possui paraquedas acoplado.');
    this.paraquedasAcoplado = paraquedas;
  }
  /** Exige paraquedas acoplado e solicita abertura pública; não altera velocidades nem cria pouso seguro. @contract f-cdf77bbe9a51340c @reviewed M12-DOC: implementação lida. */
  public acionarParaquedas(): void {
    if (!this.paraquedasAcoplado) throw new Error('Objeto não possui paraquedas acoplado.');
    this.paraquedasAcoplado.acionar();
  }
  /** Exige paraquedas acoplado e solicita recolhimento; efeito aerodinâmico será consultado pelo core. @contract f-caaad9a3f8a27be6 @reviewed M12-DOC: implementação lida. */
  public recolherParaquedas(): void {
    if (!this.paraquedasAcoplado) throw new Error('Objeto não possui paraquedas acoplado.');
    this.paraquedasAcoplado.recolher();
  }
  /** Consulta estado do componente acoplado ou undefined quando ausente; não abre/recolhe nem integra. @contract f-fc2e1c6d21493f40 @reviewed M12-DOC: implementação lida. */
  public obterEstadoDoParaquedas(): EstadoParaquedas | undefined {
    return this.paraquedasAcoplado?.obterEstado();
  }
  /** Exige componente acoplado e delega validação/configuração da área em m². @contract f-ed5813132a308e2b @reviewed M12-DOC: implementação lida. */
  public configurarAreaDoParaquedas(areaFrontalM2: number): void {
    if (!this.paraquedasAcoplado) throw new Error('Objeto não possui paraquedas acoplado.');
    this.paraquedasAcoplado.configurarAreaFrontal(areaFrontalM2);
  }
  /** Soma área projetada do corpo e área do paraquedas efetivamente aberto em m²; não aplica arrasto. @contract f-9772c89d7b8fb24d @reviewed M12-DOC: implementação lida. */
  public getAreaArrastoEfetivaM2(velocidadeRelativaMps = Vetor3.zero): number {
    return this.obterAreaBaseProjetadaM2(velocidadeRelativaMps)
      + (this.paraquedasEstaAberto ? this.paraquedasAcoplado!.areaFrontalM2 : 0);
  }
  /** Calcula Cd médio ponderado pelas áreas do corpo e paraquedas aberto; retorna zero se área total zero. @contract f-00d7e5f4edb84da9 @reviewed M12-DOC: implementação lida. */
  public getCoeficienteArrastoEfetivo(velocidadeRelativaMps = Vetor3.zero): number {
    const areaBase = this.obterAreaBaseProjetadaM2(velocidadeRelativaMps);
    const areaParaquedas = this.paraquedasEstaAberto ? this.paraquedasAcoplado!.areaFrontalM2 : 0;
    if (areaBase + areaParaquedas === 0) return 0;
    return ((areaBase * this.coeficienteArrasto) + (areaParaquedas * (this.paraquedasAcoplado?.coeficienteArrasto ?? 0))) / (areaBase + areaParaquedas);
  }

  /** Ponto de aplicação do arrasto do corpo, transformado pela orientação atual.
   * @contract f-d00a5622f840c0a5
   */
  public obterCentroPressaoM(): Vetor3 {
    const local = this.definicao.centroPressaoLocalM ?? Vetor3.zero;
    const orientacao = this.estado.orientacaoRad.z;
    const cosseno = Math.cos(orientacao);
    const seno = Math.sin(orientacao);
    return this.estado.posicaoM.adicionar(new Vetor3(
      local.x * cosseno - local.y * seno,
      local.x * seno + local.y * cosseno,
      local.z,
    ));
  }

  /** Projeta largura XY perpendicular ao fluxo relativo e escala a área de referência X×Z; retorna área nominal quando projeção desabilitada ou fluxo desprezível. @contract f-f3c40939a6d363c1 @reviewed M12-DOC: implementação lida. */
  private obterAreaBaseProjetadaM2(velocidadeRelativaMps: Vetor3): number {
    if (!this.definicao.areaArrastoProjetadaPorOrientacao || this.areaFrontalM2 === 0
      || velocidadeRelativaMps.magnitude < 1e-9) return this.areaFrontalM2;

    const normalX = -velocidadeRelativaMps.y / velocidadeRelativaMps.magnitude;
    const normalY = velocidadeRelativaMps.x / velocidadeRelativaMps.magnitude;
    const orientacao = this.estado.orientacaoRad.z;
    const eixoLocalX = new Vetor3(Math.cos(orientacao), Math.sin(orientacao), 0);
    const eixoLocalY = new Vetor3(-Math.sin(orientacao), Math.cos(orientacao), 0);
    const larguraProjetadaM = this.dimensoesM.x * Math.abs(normalX * eixoLocalX.x + normalY * eixoLocalX.y)
      + this.dimensoesM.y * Math.abs(normalX * eixoLocalY.x + normalY * eixoLocalY.y);
    // areaFrontalM2 calibra a face larga de referência (dimensões X × Z).
    return this.areaFrontalM2 * larguraProjetadaM / this.dimensoesM.x;
  }

  /** Vértices locais elegíveis para contato com uma superfície física.
   * @contract f-b1f2e8ab94d95be1
   */
  public getPontosDeContatoLocaisM(): readonly Vetor3[] {
    const metadeX = this.dimensoesM.x / 2;
    const metadeY = this.dimensoesM.y / 2;
    const metadeZ = this.dimensoesM.z / 2;
    const pontos: Vetor3[] = [];
    for (const x of [-metadeX, metadeX]) {
      for (const y of [-metadeY, metadeY]) {
        for (const z of [-metadeZ, metadeZ]) pontos.push(new Vetor3(x, y, z));
      }
    }
    return pontos;
  }

  /** Polígono local da seção XY usado em colisões entre objetos.
   * @contract f-3c9f23c18e868b72
   */
  public getVerticesColisaoLocais2D(): readonly Vetor3[] {
    const metadeX = this.dimensoesM.x / 2;
    const metadeY = this.dimensoesM.y / 2;
    return [
      new Vetor3(-metadeX, -metadeY, 0), new Vetor3(metadeX, -metadeY, 0),
      new Vetor3(metadeX, metadeY, 0), new Vetor3(-metadeX, metadeY, 0),
    ];
  }

  /** Pontos que podem fornecer aderência para tração; objetos passivos não têm nenhum.
   * @contract f-2018d05f39cc61f1
   */
  public getPontosDeTracaoLocaisM(): readonly Vetor3[] { return []; }

  /** Atualização exclusiva do core sobre a existência de apoio de tração.
   * @contract f-3931fc8b6aa6c14e
   */
  public atualizarContatoDeTracaoPeloCore(_apoiado: boolean): void {
    // Objetos sem sistema de tração não precisam reagir.
  }

  /** Atrito tangencial usado pelo resolvedor de contato com superfícies.
   * @contract f-d100c406dfb5788d
   */
  public getCoeficienteAtritoDeContato(): number {
    return this.coeficienteAtrito;
  }


  /** Valida massa variável kg finita/não negativa e substitui a parcela mutável; massa total e inércia consultam esse valor. @contract f-6396eb35b4f3037e @reviewed M12-DOC: implementação lida. */
  public definirMassaVariavelKg(massaKg: number): void {
    if (!Number.isFinite(massaKg) || massaKg < 0) throw new Error('Massa variável deve ser finita e não negativa.');
    this.massaVariavelKg = massaKg;
  }

  /** Acumula horas de uso não negativas/finitas; não aceita intervalo negativo. @contract f-ccbe7012d41fc881 @reviewed M12-DOC: implementação lida. */
  public registrarUso(deltaHoras: number): void {
    if (!Number.isFinite(deltaHoras) || deltaHoras < 0) throw new Error('Uso deve ser finito e não negativo.');
    this.horasVidaUtilConsumidas += deltaHoras;
  }

  /** Acima da resistência J, reduz integridade pelo excesso relativo de energia; limita em zero e não restaura dano. @contract f-2dedc3bfbf9467db @reviewed M12-DOC: implementação lida. */
  public aplicarDanoPorImpacto(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de impacto inválida.');
    if (energiaJ <= this.resistenciaColisaoJ) return;
    const danoRelativo = (energiaJ - this.resistenciaColisaoJ) / this.resistenciaColisaoJ;
    this.integridade = Math.max(0, this.integridade - danoRelativo);
  }

  /** Energia mecânica acumulada de um único carregamento, sem reaplicar o dano dos subpassos anteriores.
   * @contract f-a5fa3ef50d09119d
   */
  public aplicarDanoPorCarregamentoPeloCore(energiaAnteriorJ: number, energiaTotalJ: number): void {
    if (![energiaAnteriorJ, energiaTotalJ].every(Number.isFinite) || energiaAnteriorJ < 0 || energiaTotalJ < energiaAnteriorJ)
      throw new Error('Energia de carregamento inválida.');
    const danoAntes = Math.max(0, energiaAnteriorJ / this.resistenciaColisaoJ - 1);
    const danoDepois = Math.max(0, energiaTotalJ / this.resistenciaColisaoJ - 1);
    this.integridade = Math.max(0, this.integridade - (danoDepois - danoAntes));
  }

  /** API do core térmico: energia positiva aquece, negativa resfria.
   * Rede optante recebe na superfície sem dano repetido; legado permanece igual.
   * @contract f-c9f39a12ef5d34b7
   */
  public aplicarEnergiaTermicaPeloCore(energiaJ: number, dtS: number): void {
    if (!Number.isFinite(energiaJ) || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Atualização térmica inválida.');
    if (this.redeTermica) { this.redeTermica.adicionarEnergia(this.redeTermica.definicao.regiaoSuperficial, energiaJ, 'contato'); return; }
    this.temperaturaAtualC += energiaJ / this.capacidadeTermicaJPorC;
    if (this.temperaturaAtualC <= this.limiteTermicoC) return;
    const excessoC = this.temperaturaAtualC - this.limiteTermicoC;
    const taxa = this.definicao.taxaDanoTermicoPorSegundo ?? 0.02;
    this.integridade = Math.max(0, this.integridade - taxa * (excessoC / 100) * dtS);
    const temperaturaFinalC = Math.min(this.temperaturaFusaoC ?? Infinity, this.definicao.temperaturaFalhaTotalC ?? Infinity);
    if (Number.isFinite(temperaturaFinalC)) {
      // Envelope contínuo de perda estrutural: não recupera integridade ao resfriar.
      const integridadeMaxima = Math.max(0, 1 - excessoC / (temperaturaFinalC - this.limiteTermicoC));
      this.integridade = Math.min(this.integridade, integridadeMaxima);
    }
  }

  /** Energia mecânica dissipada em contato, registrada separadamente para telemetria.
   * @contract f-debce85196872e9e
   */
  public aplicarCalorDeAtritoPeloCore(energiaJ: number, dtS: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de atrito inválida.');
    this.energiaTermicaDeAtritoJ += energiaJ;
    this.aplicarEnergiaTermicaPeloCore(energiaJ, dtS);
  }

  /** Calor aero recebido uma vez na superfície optante ou corpo concentrado
   * legado. Contador de energia mantém origem; dano regional só na finalização.
   * @contract f-2df99f0558a645cd
   */
  public aplicarAquecimentoAerodinamicoPeloCore(energiaJ: number, dtS: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0 || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Energia/passo aerodinâmico inválido.');
    this.energiaTermicaAerodinamicaJ += energiaJ;
    if (this.redeTermica) this.redeTermica.adicionarEnergia(this.redeTermica.definicao.regiaoSuperficial, energiaJ, 'incidente');
    else this.aplicarEnergiaTermicaPeloCore(energiaJ, dtS);
  }

  /** Instala rede optante apenas na montagem, sem alterar massa, CM ou inércia.
   * Reinstalação é rejeitada para não apagar energia/dano durante uma missão.
   * @contract f-49a28bfc7e1c0730
   */
  public configurarRedeTermicaPeloCore(definicao: DefinicaoRedeTermica): void {
    if (this.redeTermica) throw new Error('Rede térmica já instalada.');
    this.redeTermica = new RedeTermica(definicao);
  }

  /** Porta de mutação reservada aos solucionadores do core e fixadores físicos.
   * Apresentação deve usar observarRedeTermica e nunca evoluir esta referência.
   * @contract f-2428daa6a99ed3ee
   */
  public obterRedeTermicaPeloCore(): RedeTermica | undefined { return this.redeTermica; }

  /** Snapshot térmico somente leitura; ausente preserva semântica concentrada.  @contract f-42efdd82fec8c0c0 */
  public observarRedeTermica() { return this.redeTermica?.observar(); }

  /** Aplica incremento de dano estrutural uma vez por passo térmico, somando-o
   * ao dano mecânico já existente. Superfície não reduz estrutura diretamente.
   * A fase térmica precede contatos cinemáticos: seu calor evolui no próximo passo.
   * @contract f-0e87f43f588acec7
   */
  public finalizarPassoTermicoPeloCore(dtS: number): void {
    if (!this.redeTermica) return;
    const id = this.redeTermica.definicao.regiaoEstrutural;
    const antes = this.redeTermica.obterRegiao(id).integridade;
    this.redeTermica.degradar(dtS);
    const depois = this.redeTermica.obterRegiao(id).integridade;
    // Sem dano mecânico, usa o valor regional diretamente para preservar os bits
    // da evolução nominal; com dano prévio, acrescenta somente o novo incremento.
    this.integridade = this.integridade === antes ? depois : Math.max(0, this.integridade - (antes - depois));
  }

  /** API reservada ao MundoFisico; não deve ser chamada por controladores ou UI.
   * @contract f-2c7176aa0d28ef32
   */
  public atualizarEstadoPeloCore(estado: EstadoFisico): void {
    this.estado = Object.freeze(estado);
  }

  /** Aproximação de paralelepípedo homogêneo nos eixos locais.
   * @remarks Calcula inércia de caixa homogênea pelos eixos locais usando massa instantânea e dimensões atuais. Retorno kg·m²; cache exige mesma massa e dimensões XYZ. Momento próprio é separado do termo de eixos paralelos da ilha; não modela tensor espacial completo.
   * @contract f-3b34554ea0acd89f
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public getMomentoInerciaKgM2(): Vetor3 {
    const { x, y, z } = this.dimensoesM;
    const massa = this.massaKg;
    const cache = this.inerciaCalculada;
    if (cache && cache.massaKg === massa && cache.x === x && cache.y === y && cache.z === z) return cache.valor;
    const valor = new Vetor3(
      (massa * (y ** 2 + z ** 2)) / 12,
      (massa * (x ** 2 + z ** 2)) / 12,
      (massa * (x ** 2 + y ** 2)) / 12,
    );
    this.inerciaCalculada = { massaKg: massa, x, y, z, valor };
    return valor;
  }
}
