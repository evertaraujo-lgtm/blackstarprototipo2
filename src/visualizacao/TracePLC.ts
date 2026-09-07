export type SinalTracePLC = boolean | number;

export interface EscalaTracePLC {
  readonly minimo: number;
  readonly maximo: number;
  readonly unidade?: string;
}

export interface CanalTracePLC {
  readonly nome: string;
  readonly cor: string;
  readonly obterSinal: () => SinalTracePLC;
  readonly escala?: EscalaTracePLC;
}

export interface AmostraTracePLC {
  readonly tempoS: number;
  readonly sinais: readonly number[];
}

/** Histórico de sinais digitais e analógicos para diagnóstico temporal de bancada. */
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

  public adicionarSinal(nome: string, obterSinal: () => SinalTracePLC, cor: string, escala?: EscalaTracePLC): void {
    if (!nome || !cor || typeof obterSinal !== 'function') throw new Error('Canal do TracePLC inválido.');
    if (escala && (!Number.isFinite(escala.minimo) || !Number.isFinite(escala.maximo) || escala.maximo <= escala.minimo)) throw new Error('Escala do TracePLC inválida.');
    if (this.canaisInternos.length >= this.limiteCanais) throw new Error(`TracePLC limitado a ${this.limiteCanais} canais.`);
    this.canaisInternos.push({ nome, obterSinal, cor, escala });
  }

  public limpar(): void {
    this.canaisInternos.length = 0;
    this.amostrasInternas.length = 0;
    this.ultimoTempoS = -Infinity;
  }

  public registrar(tempoS: number, forcar = false): void {
    if (!Number.isFinite(tempoS) || tempoS < 0) throw new Error('Tempo do TracePLC deve ser finito e não negativo.');
    if (this.canaisInternos.length === 0) return;
    const sinais = this.canaisInternos.map((canal) => {
      const sinal = canal.obterSinal();
      if (typeof sinal === 'boolean') return sinal ? 1 : 0;
      if (typeof sinal === 'number' && Number.isFinite(sinal)) return sinal;
      throw new Error('Sinal do TracePLC deve ser booleano ou numérico finito.');
    });
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
