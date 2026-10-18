import { energiaConduzida } from '../termica/RedeTermica';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

export interface DefinicaoFixadorEstrutural {
  readonly id: string;
  readonly objetoA: Objeto;
  readonly objetoB: Objeto;
  /** Maior esforço transmitido antes da ruptura, em N. */
  readonly resistenciaTracaoN: number;
  /** Resistência à compressão em N; ausente quando o vínculo só declara tração. */
  readonly resistenciaCompressaoN?: number;
  readonly limiteTermicoC?: number;
  readonly temperaturaInicialC?: number;
  readonly capacidadeTermicaJPorC?: number;
  readonly condutanciaTermicaWPorC?: number;
  /** Opt-in conservativo: portas de redes existentes, sem reservatório fictício. */
  readonly portasTermicas?: { readonly regiaoA: string; readonly regiaoB: string };
  /** Esforço solicitado pela operação que o fixador precisa transmitir. */
  readonly obterEsforcoSolicitadoN: /** Consulta esforço externo solicitado em N para verificar resistência do vínculo; core acrescenta cargas físicas observadas. Não rompe vínculo por esta leitura. @contract f-cd671b03c8af2236 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => number;
}

/** Conexão rígida simples que falha por esforço e preserva o conjunto físico. */
export class FixadorEstrutural {
  private rompido = false;
  private liberado = false;
  private readonly deslocamentoInicialM: Vetor3;
  private readonly orientacaoInicialARad: Vetor3;
  private readonly orientacaoRelativaInicialRad: Vetor3;
  /** Rotação planar do conjunto em torno do seu centro de massa. */
  private rotacaoDoConjuntoRad = 0;
  private temperaturaAtualC: number;
  private energiaConduzidaJ = 0;
  private potenciaConduzidaW = 0;
  private esforcoFisicoAtualN = 0;
  private maiorEsforcoFisicoRegistradoN = 0;
  private esforcoCompressaoAtualN = 0;
  private maiorEsforcoCompressaoRegistradoN = 0;

  /** Valida portas de rede optantes e condutância W/°C, sem evoluir calor.
   * Captura deslocamento/atitude relativos de dois corpos distintos; valida resistência de tração N e compressão opcional N positivas/finitas; inicializa temperatura °C. @contract f-0f5869bdaef2f59f @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoFixadorEstrutural) {
    if (!definicao.id || !Number.isFinite(definicao.resistenciaTracaoN) || definicao.resistenciaTracaoN <= 0) {
      throw new Error('Definição de fixador estrutural inválida.');
    }
    if (definicao.resistenciaCompressaoN !== undefined
      && (!Number.isFinite(definicao.resistenciaCompressaoN) || definicao.resistenciaCompressaoN <= 0)) {
      throw new Error('Resistência à compressão do fixador inválida.');
    }
    if (definicao.objetoA === definicao.objetoB) throw new Error('Fixador precisa ligar objetos distintos.');
    this.deslocamentoInicialM = definicao.objetoB.getEstadoFisico().posicaoM.subtrair(definicao.objetoA.getEstadoFisico().posicaoM);
    this.orientacaoInicialARad = definicao.objetoA.getEstadoFisico().orientacaoRad;
    this.orientacaoRelativaInicialRad = definicao.objetoB.getEstadoFisico().orientacaoRad.subtrair(definicao.objetoA.getEstadoFisico().orientacaoRad);
    this.temperaturaAtualC = definicao.temperaturaInicialC ?? 20;
    if (definicao.portasTermicas) {
      if (!Number.isFinite(definicao.condutanciaTermicaWPorC) || definicao.condutanciaTermicaWPorC! < 0
        || !definicao.objetoA.obterRedeTermicaPeloCore()?.obterRegiao(definicao.portasTermicas.regiaoA)
        || !definicao.objetoB.obterRedeTermicaPeloCore()?.obterRegiao(definicao.portasTermicas.regiaoB)) throw new Error('Portas/condutância térmica do fixador inválidas.');
    }
  }

  /** Consulta identidade declarada do vínculo. @contract f-055ce00a96446730 @reviewed M12-DOC: implementação lida. */
  public get id(): string { return this.definicao.id; }
  /** Consulta ruptura física do vínculo. @contract f-c9224d78e0658832 @reviewed M12-DOC: implementação lida. */
  public get estaRompido(): boolean { return this.rompido; }
  /** Exige vínculo sem ruptura e sem liberação operacional. @contract f-ea793a469f4e1520 @reviewed M12-DOC: implementação lida. */
  public get estaAtivo(): boolean { return !this.rompido && !this.liberado; }
  /** Distingue rompido, liberado e íntegro, priorizando ruptura na consulta. @contract f-52fa73b48adba727 @reviewed M12-DOC: implementação lida. */
  public get estado(): 'integro' | 'rompido' | 'liberado' { return this.rompido ? 'rompido' : this.liberado ? 'liberado' : 'integro'; }
  /** Comando de separação. O mundo reconstrói a topologia sem fabricar impulso.
   * @remarks Libera vínculo ativo uma vez e retorna confirmação; a reconstrução do mundo separa corpos sem impulso artificial.
   * @contract f-db2b2b03b157c491
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public liberar(): boolean {
    if (!this.estaAtivo) return false;
    this.liberado = true;
    return true;
  }
  /** Consulta resistência nominal declarada em N. @contract f-4103566e9591bff2 @reviewed M12-DOC: implementação lida. */
  public get resistenciaTracaoN(): number { return this.definicao.resistenciaTracaoN; }
  /** Consulta temperatura atual do fixador em °C. @contract f-e6634126f28d273d @reviewed M12-DOC: implementação lida. */
  public get temperaturaC(): number { return this.temperaturaAtualC; }
  /** Consulta limite térmico declarado ou referência histórica de 500 °C; não cria material novo. @contract f-031d3fa6bd416fc1 @reviewed M12-DOC: implementação lida. */
  public get limiteTermicoC(): number { return this.definicao.limiteTermicoC ?? 500; }
  /** Reduz resistência nominal linearmente acima do limite térmico, chegando a zero após excesso de 200 °C; retorno N. @contract f-548f76af02c856bd @reviewed M12-DOC: implementação lida. */
  public get resistenciaTracaoEfetivaN(): number {
    if (this.temperaturaAtualC <= this.limiteTermicoC) return this.resistenciaTracaoN;
    return Math.max(0, this.resistenciaTracaoN * (1 - (this.temperaturaAtualC - this.limiteTermicoC) / 200));
  }
  /** Maior esforço físico transmitido pelo core no passo atual, em N.
   * @contract f-d070c5bceb8ecb50
   */
  public get esforcoFisicoSolicitadoN(): number { return this.esforcoFisicoAtualN; }
  /** Pico de esforço físico desde a criação do fixador, em N.
   * @contract f-b6b54cc2bff852a6
   */
  public get picoEsforcoFisicoN(): number { return this.maiorEsforcoFisicoRegistradoN; }
  /** Maior compressão física transmitida pelo core desde a criação, em N.
   * @contract f-bf69d7a54da177a1
   */
  public get picoEsforcoCompressaoFisicoN(): number { return this.maiorEsforcoCompressaoRegistradoN; }
  /** Devolve primeiro corpo físico conectado, por referência. @contract f-8ad1a2e72e49b9f8 @reviewed M12-DOC: implementação lida. */
  public get objetoA(): Objeto { return this.definicao.objetoA; }
  /** Devolve segundo corpo físico conectado, por referência. @contract f-d799977675a682c6 @reviewed M12-DOC: implementação lida. */
  public get objetoB(): Objeto { return this.definicao.objetoB; }

  /**
   * Massa efetiva do conjunto rígido no ponto de contato plano. Ela inclui
   * translação de ambas as massas e a inércia composta em torno do centro de
   * massa; é usada pelo core para medir energia de impacto sem subestimá-la.
   * @contract f-91c49432497b575a
   */
  public obterMassaEfetivaNoContato(objeto: Objeto, pontoContatoM: Vetor3, normal: Vetor3): number | undefined {
    if (!this.estaAtivo || (objeto !== this.objetoA && objeto !== this.objetoB)) return undefined;
    const estadoA = this.objetoA.getEstadoFisico();
    const estadoB = this.objetoB.getEstadoFisico();
    const massaA = this.objetoA.massaKg;
    const massaB = this.objetoB.massaKg;
    const massaTotal = massaA + massaB;
    const centroMassa = estadoA.posicaoM.multiplicar(massaA / massaTotal).adicionar(estadoB.posicaoM.multiplicar(massaB / massaTotal));
    const bracoA = estadoA.posicaoM.subtrair(centroMassa);
    const bracoB = estadoB.posicaoM.subtrair(centroMassa);
    const inerciaCompostaZ = this.objetoA.getMomentoInerciaKgM2().z + massaA * bracoA.magnitude ** 2
      + this.objetoB.getMomentoInerciaKgM2().z + massaB * bracoB.magnitude ** 2;
    const torqueUnitarioZ = pontoContatoM.subtrair(centroMassa).produtoVetorial(normal).z;
    return 1 / ((1 / massaTotal) + (torqueUnitarioZ ** 2 / inerciaCompostaZ));
  }

  /** Avaliado pelo core após a preparação operacional e antes da integração.
   * Optantes trocam energia A→B pelos mesmos J em redes declaradas, sem
   * atravessar equilíbrio. Sua temperatura é diagnóstica (média das portas), não
   * capacidade adicional. Liberação/ruptura corta caminho; legado é preservado.
   * @contract f-7423b87c58676970
   */
  public prepararPasso(dtS = 0): void {
    if (!this.estaAtivo) return;
    this.esforcoFisicoAtualN = 0;
    this.esforcoCompressaoAtualN = 0;
    if (dtS > 0 && this.definicao.portasTermicas) {
      const portas = this.definicao.portasTermicas;
      const a = this.objetoA.obterRedeTermicaPeloCore()!, b = this.objetoB.obterRedeTermicaPeloCore()!;
      const ra = a.obterRegiao(portas.regiaoA), rb = b.obterRegiao(portas.regiaoB);
      const j = energiaConduzida(ra.temperaturaC, rb.temperaturaC, ra.capacidadeJPorC, rb.capacidadeJPorC,
        this.definicao.condutanciaTermicaWPorC!, dtS);
      a.adicionarEnergia(portas.regiaoA, -j, 'externa'); b.adicionarEnergia(portas.regiaoB, j, 'externa');
      this.energiaConduzidaJ += j; this.potenciaConduzidaW = j / dtS;
      this.temperaturaAtualC = (a.obterRegiao(portas.regiaoA).temperaturaC + b.obterRegiao(portas.regiaoB).temperaturaC) / 2;
    } else if (dtS > 0) {
      const mediaC = (this.objetoA.temperaturaC + this.objetoB.temperaturaC) / 2;
      const condutancia = this.definicao.condutanciaTermicaWPorC ?? 100;
      const capacidade = this.definicao.capacidadeTermicaJPorC ?? 10_000;
      this.temperaturaAtualC += (condutancia * (mediaC - this.temperaturaAtualC) * dtS) / capacidade;
    }
    if (Math.abs(this.definicao.obterEsforcoSolicitadoN()) > this.resistenciaTracaoEfetivaN) this.rompido = true;
  }

  /** Diagnóstico SI da condução conservativa optante; potência zero se separado.
   * Legado apenas informa temperatura do vínculo, sem alegar transferência real.
   * @contract f-40f68796b6d4661c
   */
  public obterDiagnosticoTermico() {
    return Object.freeze({ modelo: this.definicao.portasTermicas ? 'condutancia-conservativa' : 'temperatura-media-legada',
      temperaturaC: this.temperaturaAtualC, energiaConduzidaJ: this.energiaConduzidaJ,
      potenciaConduzidaW: this.estaAtivo ? this.potenciaConduzidaW : 0, portas: this.definicao.portasTermicas ? Object.freeze({ ...this.definicao.portasTermicas }) : undefined });
  }

  /** Recebe o esforço calculado pelo core a partir de um impulso de contato.
   * @contract f-7bd68d1e2b32c98b
   */
  public registrarEsforcoFisicoN(esforcoN: number): void {
    if (!Number.isFinite(esforcoN) || esforcoN < 0) throw new Error('Esforço físico do fixador inválido.');
    if (!this.estaAtivo) return;
    this.esforcoFisicoAtualN = Math.max(this.esforcoFisicoAtualN, esforcoN);
    this.maiorEsforcoFisicoRegistradoN = Math.max(this.maiorEsforcoFisicoRegistradoN, esforcoN);
    if (this.esforcoFisicoAtualN > this.resistenciaTracaoEfetivaN) this.rompido = true;
  }

  /** Recebe a compressão axial calculada pelo core quando essa capacidade foi declarada.
   * @contract f-18711e23ebfb91f8
   */
  public registrarEsforcoDeCompressaoFisicoN(esforcoN: number): void {
    if (!Number.isFinite(esforcoN) || esforcoN < 0) throw new Error('Esforço físico do fixador inválido.');
    if (!this.estaAtivo || this.definicao.resistenciaCompressaoN === undefined) return;
    this.esforcoCompressaoAtualN = Math.max(this.esforcoCompressaoAtualN, esforcoN);
    this.maiorEsforcoCompressaoRegistradoN = Math.max(this.maiorEsforcoCompressaoRegistradoN, esforcoN);
    const fatorTermico = this.resistenciaTracaoEfetivaN / this.resistenciaTracaoN;
    if (this.esforcoCompressaoAtualN > this.definicao.resistenciaCompressaoN * fatorTermico) this.rompido = true;
  }

  /**
   * Mantém um conjunto rígido planar, conservando momento linear e angular.
   * A representação atual do core usa a rotação Z para os vínculos físicos
   * visualizados em 2D; uma futura extensão 3D poderá substituir esta parte
   * por tensor de inércia e orientação espacial.
   * @contract f-64e4382f5c4846fc
   */
  public aplicarRestricao(dtS: number): void {
    if (!this.estaAtivo) return;
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo temporal do fixador inválido.');
    const estadoA = this.objetoA.getEstadoFisico();
    const estadoB = this.objetoB.getEstadoFisico();
    const massaA = this.objetoA.massaKg;
    const massaB = this.objetoB.massaKg;
    const massaTotal = massaA + massaB;
    const centroMassa = estadoA.posicaoM.multiplicar(massaA / massaTotal).adicionar(estadoB.posicaoM.multiplicar(massaB / massaTotal));
    const velocidade = estadoA.velocidadeMps.multiplicar(massaA / massaTotal).adicionar(estadoB.velocidadeMps.multiplicar(massaB / massaTotal));
    const bracoA = estadoA.posicaoM.subtrair(centroMassa);
    const bracoB = estadoB.posicaoM.subtrair(centroMassa);
    const momentoAngularZ =
      bracoA.produtoVetorial(estadoA.velocidadeMps.multiplicar(massaA)).z + this.objetoA.getMomentoInerciaKgM2().z * estadoA.velocidadeAngularRadps.z +
      bracoB.produtoVetorial(estadoB.velocidadeMps.multiplicar(massaB)).z + this.objetoB.getMomentoInerciaKgM2().z * estadoB.velocidadeAngularRadps.z;
    const inerciaCompostaZ =
      this.objetoA.getMomentoInerciaKgM2().z + massaA * bracoA.magnitude ** 2 +
      this.objetoB.getMomentoInerciaKgM2().z + massaB * bracoB.magnitude ** 2;
    const velocidadeAngularZ = momentoAngularZ / inerciaCompostaZ;
    this.rotacaoDoConjuntoRad += velocidadeAngularZ * dtS;
    const deslocamentoRotacionado = this.rotacionarNoPlano(this.deslocamentoInicialM, this.rotacaoDoConjuntoRad);
    const posicaoA = centroMassa.subtrair(deslocamentoRotacionado.multiplicar(massaB / massaTotal));
    const posicaoB = centroMassa.adicionar(deslocamentoRotacionado.multiplicar(massaA / massaTotal));
    const bracoCorrigidoA = posicaoA.subtrair(centroMassa);
    const bracoCorrigidoB = posicaoB.subtrair(centroMassa);
    const velocidadeAngular = new Vetor3(0, 0, velocidadeAngularZ);
    const velocidadeA = velocidade.adicionar(new Vetor3(-velocidadeAngularZ * bracoCorrigidoA.y, velocidadeAngularZ * bracoCorrigidoA.x, 0));
    const velocidadeB = velocidade.adicionar(new Vetor3(-velocidadeAngularZ * bracoCorrigidoB.y, velocidadeAngularZ * bracoCorrigidoB.x, 0));
    const orientacaoA = new Vetor3(this.orientacaoInicialARad.x, this.orientacaoInicialARad.y, this.orientacaoInicialARad.z + this.rotacaoDoConjuntoRad);
    const orientacaoB = orientacaoA.adicionar(this.orientacaoRelativaInicialRad);
    this.objetoA.atualizarEstadoPeloCore({
      ...estadoA,
      posicaoM: posicaoA,
      velocidadeMps: velocidadeA,
      velocidadeAngularRadps: velocidadeAngular,
      orientacaoRad: orientacaoA,
    });
    this.objetoB.atualizarEstadoPeloCore({
      ...estadoB,
      posicaoM: posicaoB,
      velocidadeMps: velocidadeB,
      velocidadeAngularRadps: velocidadeAngular,
      orientacaoRad: orientacaoB,
    });
  }

  /** Rotaciona vetor em XY pelo ângulo rad e preserva Z, devolvendo novo vetor. @contract f-d31246df8d25d2db @reviewed M12-DOC: implementação lida. */
  private rotacionarNoPlano(vetor: Vetor3, anguloRad: number): Vetor3 {
    const cos = Math.cos(anguloRad);
    const sen = Math.sin(anguloRad);
    return new Vetor3(vetor.x * cos - vetor.y * sen, vetor.x * sen + vetor.y * cos, vetor.z);
  }
}
