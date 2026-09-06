export type SinalTracePLC = 0 | 1;

export interface CanalTracePLC {
  readonly nome: string;
  readonly cor: string;
  readonly obterSinal: () => SinalTracePLC;
}

export interface AmostraTracePLC {
  readonly tempoS: number;
  readonly sinais: readonly SinalTracePLC[];
}

/** Histórico de sinais digitais para diagnóstico temporal de bancada. */
export class TracePLC {
  private readonly canaisInternos: CanalTracePLC[] = [];
  private readonly amostrasInternas: AmostraTracePLC[] = [];
  private ultimoTempoS = -Infinity;

  public constructor(private readonly limiteCanais = 10, private readonly limiteAmostras = 6_000) {
    if (!Number.isInteger(limiteCanais) || limiteCanais <= 0 || limiteCanais > 10) throw new Error('O TracePLC aceita de 1 a 10 canais.');
    if (!Number.isInteger(limiteAmostras) || limiteAmostras <= 0) throw new Error('O limite de amostras deve ser positivo.');
  }

  public get canais(): readonly CanalTracePLC[] { return this.canaisInternos; }
  public get amostras(): readonly AmostraTracePLC[] { return this.amostrasInternas; }

  public adicionarSinal(nome: string, obterSinal: () => SinalTracePLC, cor: string): void {
    if (!nome || !cor || typeof obterSinal !== 'function') throw new Error('Canal do TracePLC inválido.');
    if (this.canaisInternos.length >= this.limiteCanais) throw new Error(`TracePLC limitado a ${this.limiteCanais} canais.`);
    this.canaisInternos.push({ nome, obterSinal, cor });
  }

  public limpar(): void {
    this.canaisInternos.length = 0;
    this.amostrasInternas.length = 0;
    this.ultimoTempoS = -Infinity;
  }

  public registrar(tempoS: number, forcar = false): void {
    if (!Number.isFinite(tempoS) || tempoS < 0) throw new Error('Tempo do TracePLC deve ser finito e não negativo.');
    if (this.canaisInternos.length === 0) return;
    const sinais = this.canaisInternos.map((canal) => canal.obterSinal());
    if (!sinais.every((sinal) => sinal === 0 || sinal === 1)) throw new Error('Sinal do TracePLC deve ser 0 ou 1.');
    const ultima = this.amostrasInternas.at(-1);
    const mesmoSinal = ultima?.sinais.length === sinais.length && ultima.sinais.every((sinal, indice) => sinal === sinais[indice]);
    if (!forcar && ultima && tempoS - this.ultimoTempoS < 0.05 && mesmoSinal) return;
    this.amostrasInternas.push({ tempoS, sinais });
    if (this.amostrasInternas.length > this.limiteAmostras) this.amostrasInternas.shift();
    this.ultimoTempoS = tempoS;
  }

  public obterIndiceMaisProximo(tempoS: number): number {
    if (this.amostrasInternas.length === 0) return 0;
    let melhorIndice = 0;
    let menorDistancia = Infinity;
    this.amostrasInternas.forEach((amostra, indice) => {
      const distancia = Math.abs(amostra.tempoS - tempoS);
      if (distancia < menorDistancia) { menorDistancia = distancia; melhorIndice = indice; }
    });
    return melhorIndice;
  }
}
