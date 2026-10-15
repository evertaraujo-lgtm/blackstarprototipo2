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

  /** Exige limites inteiros positivos de canais e amostras; mantém observação limitada em memória sem participar da física. @contract f-eeb5e031f4aaf6c2 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly limiteCanais = 10, private readonly limiteAmostras = 6_000) {
    if (!Number.isInteger(limiteCanais) || limiteCanais <= 0) throw new Error('O limite de canais do TracePLC deve ser um inteiro positivo.');
    if (!Number.isInteger(limiteAmostras) || limiteAmostras <= 0) throw new Error('O limite de amostras deve ser positivo.');
  }

  /** Devolve `this.canaisInternos`. Efeitos indiretos seguem as dependências chamadas. @contract f-755af57d2473cda0 */
  public get canais(): readonly CanalTracePLC[] { return this.canaisInternos; }
  /** Devolve `this.amostrasInternas`. Efeitos indiretos seguem as dependências chamadas. @contract f-07fdf780b26f99a6 */
  public get amostras(): readonly AmostraTracePLC[] { return this.amostrasInternas; }

  /** Valida nome/cor/porta de leitura, escala finita crescente e capacidade; adiciona canal sem avaliar sinal neste momento. @contract f-f3ba099a9d5d7167 @reviewed M12-DOC: implementação lida. */
  public adicionarSinal(nome: string, obterSinal: () => SinalTracePLC, cor: string, escala?: EscalaTracePLC): void {
    if (!nome || !cor || typeof obterSinal !== 'function') throw new Error('Canal do TracePLC inválido.');
    if (escala && (!Number.isFinite(escala.minimo) || !Number.isFinite(escala.maximo) || escala.maximo <= escala.minimo)) throw new Error('Escala do TracePLC inválida.');
    if (this.canaisInternos.length >= this.limiteCanais) throw new Error(`TracePLC limitado a ${this.limiteCanais} canais.`);
    this.canaisInternos.push({ nome, obterSinal, cor, escala });
  }

  /** Esvazia canais/amostras e reinicia referência temporal; não reinicia mundo nem sensores. @contract f-11ed476f97388fe3 @reviewed M12-DOC: implementação lida. */
  public limpar(): void {
    this.canaisInternos.length = 0;
    this.amostrasInternas.length = 0;
    this.ultimoTempoS = -Infinity;
  }

  /** Lê sinais finitos/booleanos no tempo simulado s, convertendo booleano em 0/1. Mudança registra imediatamente; sinal igual em menos de 0,05 s é omitido salvo forçado. Limita histórico removendo mais antigo; não é amostragem física nem replay integral. @contract f-1b711a9b0f762a4a @reviewed M12-DOC: implementação lida. */
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

  /** Busca linearmente amostra com menor distância temporal; empate preserva primeira e lista vazia retorna índice zero. @contract f-fc2ec4a5f9b91d62 @reviewed M12-DOC: implementação lida. */
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
