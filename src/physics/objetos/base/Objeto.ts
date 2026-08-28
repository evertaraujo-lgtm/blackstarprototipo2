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
  readonly temperaturaInicialC?: number;
  readonly capacidadeTermicaJPorC?: number;
  readonly areaTermicaM2?: number;
  readonly coeficienteConveccaoWPorM2C?: number;
  readonly taxaDanoTermicoPorSegundo?: number;
  readonly areaFrontalM2?: number;
  readonly coeficienteArrasto?: number;
  /** Fração da potência de arrasto que aquece o próprio objeto (0 a 1). */
  readonly fracaoAquecimentoAerodinamico?: number;
  readonly estadoInicial?: Partial<EstadoFisico>;
}

/** Uma solicitação de força produzida por um componente do objeto. */
export interface ForcaFisicaSolicitada {
  readonly forcaN: Vetor3;
  readonly pontoM?: Vetor3;
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
  private paraquedasAcoplado?: Paraquedas;
  private temperaturaAtualC: number;
  private energiaTermicaDeAtritoJ = 0;
  private energiaTermicaAerodinamicaJ = 0;

  public constructor(private readonly definicao: DefinicaoObjeto) {
    if (!definicao.id) throw new Error('Objeto precisa de identidade.');
    if (definicao.massaBaseKg <= 0) throw new Error('Massa base deve ser positiva.');
    if (definicao.dimensoesM.x <= 0 || definicao.dimensoesM.y <= 0 || definicao.dimensoesM.z <= 0) {
      throw new Error('Dimensões devem ser positivas.');
    }
    if (definicao.resistenciaColisaoJ <= 0 || !Number.isFinite(definicao.limiteTermicoC)) {
      throw new Error('Resistência a colisão deve ser positiva e limite térmico deve ser finito.');
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

    this.estado = {
      posicaoM: definicao.estadoInicial?.posicaoM ?? Vetor3.zero,
      velocidadeMps: definicao.estadoInicial?.velocidadeMps ?? Vetor3.zero,
      orientacaoRad: definicao.estadoInicial?.orientacaoRad ?? Vetor3.zero,
      velocidadeAngularRadps: definicao.estadoInicial?.velocidadeAngularRadps ?? Vetor3.zero,
    };
    this.temperaturaAtualC = definicao.temperaturaInicialC ?? 20;
  }

  public get id(): string { return this.definicao.id; }
  public get massaBaseKg(): number { return this.definicao.massaBaseKg; }
  public get massaKg(): number { return this.definicao.massaBaseKg + this.massaVariavelKg + (this.paraquedasAcoplado?.massaKg ?? 0); }
  public get dimensoesM(): Vetor3 { return this.definicao.dimensoesM; }
  public get resistenciaColisaoJ(): number { return this.definicao.resistenciaColisaoJ; }
  public get dissipacaoImpacto(): number { return this.definicao.dissipacaoImpacto ?? 0.15; }
  public get coeficienteAtrito(): number { return this.definicao.coeficienteAtrito ?? 0.65; }
  public get coeficienteAtritoEntreObjetos(): number { return this.definicao.coeficienteAtritoEntreObjetos ?? 0; }
  public get limiteTermicoC(): number { return this.definicao.limiteTermicoC; }
  public get temperaturaC(): number { return this.temperaturaAtualC; }
  public get capacidadeTermicaJPorC(): number { return this.definicao.capacidadeTermicaJPorC ?? this.massaKg * 500; }
  public get areaTermicaM2(): number { return this.definicao.areaTermicaM2 ?? Math.max(0.1, this.dimensoesM.x * this.dimensoesM.y); }
  public get coeficienteConveccaoWPorM2C(): number { return this.definicao.coeficienteConveccaoWPorM2C ?? 10; }
  public get areaFrontalM2(): number { return this.definicao.areaFrontalM2 ?? 0; }
  public get coeficienteArrasto(): number { return this.definicao.coeficienteArrasto ?? 1; }
  public get fracaoAquecimentoAerodinamico(): number { return this.definicao.fracaoAquecimentoAerodinamico ?? 0.1; }
  public get energiaTermicaDeAtritoAcumuladaJ(): number { return this.energiaTermicaDeAtritoJ; }
  public get energiaTermicaAerodinamicaAcumuladaJ(): number { return this.energiaTermicaAerodinamicaJ; }
  public get paraquedasEstaAberto(): boolean { return this.paraquedasAcoplado?.estaAberto ?? false; }
  public get integridadeEstrutural(): number { return this.integridade; }
  public get horasConsumidas(): number { return this.horasVidaUtilConsumidas; }

  public getEstadoFisico(): EstadoFisico {
    return { ...this.estado };
  }

  /**
   * Componentes podem solicitar forças ao núcleo neste ponto do passo físico.
   * A implementação base não produz força; ela existe para que o core não
   * precise conhecer subclasses ou controladores de domínio.
   */
  public obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    return [];
  }
  public obterPotenciaTermicaGeradaW(): number { return 0; }
  public obterJatoTermico(): JatoTermico | undefined { return undefined; }

  /** Preparação determinística de recursos antes da integração do passo. */
  public prepararPassoOperacional(_dtS: number): void {}

  /** Forças aerodinâmicas produzidas por componentes do objeto. */
  public obterForcasAerodinamicas(_condicoes: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[] {
    return [];
  }

  /** Acopla um único paraquedas físico ao objeto nesta etapa do modelo. */
  public acoplarParaquedas(paraquedas: Paraquedas): void {
    if (this.paraquedasAcoplado) throw new Error('Objeto já possui paraquedas acoplado.');
    this.paraquedasAcoplado = paraquedas;
  }
  public acionarParaquedas(): void {
    if (!this.paraquedasAcoplado) throw new Error('Objeto não possui paraquedas acoplado.');
    this.paraquedasAcoplado.acionar();
  }
  public recolherParaquedas(): void {
    if (!this.paraquedasAcoplado) throw new Error('Objeto não possui paraquedas acoplado.');
    this.paraquedasAcoplado.recolher();
  }
  public obterEstadoDoParaquedas(): EstadoParaquedas | undefined {
    return this.paraquedasAcoplado?.obterEstado();
  }
  public configurarAreaDoParaquedas(areaFrontalM2: number): void {
    if (!this.paraquedasAcoplado) throw new Error('Objeto não possui paraquedas acoplado.');
    this.paraquedasAcoplado.configurarAreaFrontal(areaFrontalM2);
  }
  public getAreaArrastoEfetivaM2(): number {
    return this.areaFrontalM2 + (this.paraquedasEstaAberto ? this.paraquedasAcoplado!.areaFrontalM2 : 0);
  }
  public getCoeficienteArrastoEfetivo(): number {
    const areaBase = this.areaFrontalM2;
    const areaParaquedas = this.paraquedasEstaAberto ? this.paraquedasAcoplado!.areaFrontalM2 : 0;
    if (areaBase + areaParaquedas === 0) return 0;
    return ((areaBase * this.coeficienteArrasto) + (areaParaquedas * (this.paraquedasAcoplado?.coeficienteArrasto ?? 0))) / (areaBase + areaParaquedas);
  }

  /** Vértices locais elegíveis para contato com uma superfície física. */
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

  /** Polígono local da seção XY usado em colisões entre objetos. */
  public getVerticesColisaoLocais2D(): readonly Vetor3[] {
    const metadeX = this.dimensoesM.x / 2;
    const metadeY = this.dimensoesM.y / 2;
    return [
      new Vetor3(-metadeX, -metadeY, 0), new Vetor3(metadeX, -metadeY, 0),
      new Vetor3(metadeX, metadeY, 0), new Vetor3(-metadeX, metadeY, 0),
    ];
  }

  /** Pontos que podem fornecer aderência para tração; objetos passivos não têm nenhum. */
  public getPontosDeTracaoLocaisM(): readonly Vetor3[] { return []; }

  /** Atualização exclusiva do core sobre a existência de apoio de tração. */
  public atualizarContatoDeTracaoPeloCore(_apoiado: boolean): void {
    // Objetos sem sistema de tração não precisam reagir.
  }

  /** Atrito tangencial usado pelo resolvedor de contato com superfícies. */
  public getCoeficienteAtritoDeContato(): number {
    return this.coeficienteAtrito;
  }


  public definirMassaVariavelKg(massaKg: number): void {
    if (!Number.isFinite(massaKg) || massaKg < 0) throw new Error('Massa variável deve ser finita e não negativa.');
    this.massaVariavelKg = massaKg;
  }

  public registrarUso(deltaHoras: number): void {
    if (!Number.isFinite(deltaHoras) || deltaHoras < 0) throw new Error('Uso deve ser finito e não negativo.');
    this.horasVidaUtilConsumidas += deltaHoras;
  }

  public aplicarDanoPorImpacto(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de impacto inválida.');
    if (energiaJ <= this.resistenciaColisaoJ) return;
    const danoRelativo = (energiaJ - this.resistenciaColisaoJ) / this.resistenciaColisaoJ;
    this.integridade = Math.max(0, this.integridade - danoRelativo);
  }

  /** API do core térmico: energia positiva aquece, negativa resfria. */
  public aplicarEnergiaTermicaPeloCore(energiaJ: number, dtS: number): void {
    if (!Number.isFinite(energiaJ) || !Number.isFinite(dtS) || dtS <= 0) throw new Error('Atualização térmica inválida.');
    this.temperaturaAtualC += energiaJ / this.capacidadeTermicaJPorC;
    if (this.temperaturaAtualC <= this.limiteTermicoC) return;
    const excessoC = this.temperaturaAtualC - this.limiteTermicoC;
    const taxa = this.definicao.taxaDanoTermicoPorSegundo ?? 0.02;
    this.integridade = Math.max(0, this.integridade - taxa * (excessoC / 100) * dtS);
  }

  /** Energia mecânica dissipada em contato, registrada separadamente para telemetria. */
  public aplicarCalorDeAtritoPeloCore(energiaJ: number, dtS: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de atrito inválida.');
    this.energiaTermicaDeAtritoJ += energiaJ;
    this.aplicarEnergiaTermicaPeloCore(energiaJ, dtS);
  }

  /** Parcela da dissipação aerodinâmica que efetivamente entra no corpo. */
  public aplicarAquecimentoAerodinamicoPeloCore(energiaJ: number, dtS: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia aerodinâmica inválida.');
    this.energiaTermicaAerodinamicaJ += energiaJ;
    this.aplicarEnergiaTermicaPeloCore(energiaJ, dtS);
  }

  /** API reservada ao MundoFisico; não deve ser chamada por controladores ou UI. */
  public atualizarEstadoPeloCore(estado: EstadoFisico): void {
    this.estado = estado;
  }

  /** Aproximação de paralelepípedo homogêneo nos eixos locais. */
  public getMomentoInerciaKgM2(): Vetor3 {
    const { x, y, z } = this.dimensoesM;
    const massa = this.massaKg;
    return new Vetor3(
      (massa * (y ** 2 + z ** 2)) / 12,
      (massa * (x ** 2 + z ** 2)) / 12,
      (massa * (x ** 2 + y ** 2)) / 12,
    );
  }
}
