import { Vetor3 } from './Vetor3';

/** Material e contrato de geometria de uma superfície estática no plano XY. */
export abstract class SuperficieFisica {
  private integridade = 1;
  private temperaturaAtualC: number;
  private energiaTermicaDeAtritoJ = 0;

  /** Registra identidade, material, resistência em J, dissipação, atrito e estado térmico; valida id, resistência positiva, dissipação em [0,1), atrito em [0,1] e capacidade térmica positiva. Finitude da resistência não é verificada separadamente nesta implementação. @contract f-de0f9204a43fbad4 @reviewed M12-DOC: implementação lida. */
  public constructor(
    public readonly id: string,
    public readonly tipoMaterial: 'areia' | 'agua' | 'terra' | 'concreto' | 'aco' | 'outro',
    public readonly resistenciaColisaoJ: number,
    /** Fração de energia dissipada pelo material da superfície (0 a < 1). */
    public readonly dissipacaoImpacto = 0.15,
    /** Coeficiente de atrito dinâmico da superfície (0 a 1). */
    public readonly coeficienteAtritoDinamico = 0.65,
    /** Temperatura inicial da massa térmica da superfície, em °C. */
    temperaturaInicialC = 20,
    /** Capacidade térmica concentrada da região de contato, em J/°C. */
    public readonly capacidadeTermicaJPorC = 1_000_000,
  ) {
    if (!id || resistenciaColisaoJ <= 0 || !Number.isFinite(dissipacaoImpacto) || dissipacaoImpacto < 0 || dissipacaoImpacto >= 1 || !Number.isFinite(coeficienteAtritoDinamico) || coeficienteAtritoDinamico < 0 || coeficienteAtritoDinamico > 1 || !Number.isFinite(temperaturaInicialC) || !Number.isFinite(capacidadeTermicaJPorC) || capacidadeTermicaJPorC <= 0) {
      throw new Error('Definição de superfície inválida.');
    }
    this.temperaturaAtualC = temperaturaInicialC;
  }

  public abstract distanciaAssinadaM(pontoM: Vetor3): number;
  public abstract normalEm(pontoM: Vetor3): Vetor3;
  public abstract projetar(pontoM: Vetor3): Vetor3;
  /** Contrato padrão sem bordas: aceita qualquer projeção. Superfícies finitas especializam esta consulta. @contract f-0b83791d53142aaf @reviewed M12-DOC: implementação lida. */
  public contemProjecao(_pontoM: Vetor3): boolean { return true; }
  /** Retorna velocidade nula em m/s: a superfície base é estática no referencial do mundo. @contract f-4c317235a33e5226 @reviewed M12-DOC: implementação lida. */
  public velocidadeNoPonto(_pontoM: Vetor3): Vetor3 { return Vetor3.zero; }
  /** Devolve os pontos fornecidos sem copiar ou acrescentar candidatos; especializações podem incluir contatos interiores às arestas. @contract f-5d9e830dffef3966 @reviewed M12-DOC: implementação lida. */
  public candidatosContato(pontos: readonly Vetor3[]): readonly Vetor3[] { return pontos; }

  /** Consulta fração de integridade atual da superfície, sem modificar estado. @contract f-41e1ec354f9dfa4b @reviewed M12-DOC: implementação lida. */
  public get integridadeEstrutural(): number { return this.integridade; }
  /** Consulta temperatura acumulada em graus Celsius, sem conversão para Kelvin. @contract f-6431b37fd60040ec @reviewed M12-DOC: implementação lida. */
  public get temperaturaC(): number { return this.temperaturaAtualC; }
  /** Consulta em J a energia de atrito acumulada pela superfície. @contract f-2e6fb278c91dd910 @reviewed M12-DOC: implementação lida. */
  public get energiaTermicaDeAtritoAcumuladaJ(): number { return this.energiaTermicaDeAtritoJ; }

  /** Rejeita energia negativa/não finita; acima da resistência em J reduz integridade pelo excesso relativo, limitada inferiormente a zero. Energia abaixo do limite não causa dano. @contract f-27173dfe139bb15d @reviewed M12-DOC: implementação lida. */
  public aplicarDanoPorImpacto(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de impacto inválida.');
    if (energiaJ <= this.resistenciaColisaoJ) return;
    this.integridade = Math.max(0, this.integridade - ((energiaJ - this.resistenciaColisaoJ) / this.resistenciaColisaoJ));
  }

  /** Recebe a parcela de energia dissipada no par objeto–superfície.
   * @contract f-0117439d53534cc6
   */
  public aplicarCalorDeAtritoPeloCore(energiaJ: number): void {
    if (!Number.isFinite(energiaJ) || energiaJ < 0) throw new Error('Energia de atrito inválida.');
    this.energiaTermicaDeAtritoJ += energiaJ;
    this.temperaturaAtualC += energiaJ / this.capacidadeTermicaJPorC;
  }
}
