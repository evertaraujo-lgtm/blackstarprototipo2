import { ChumbadorAoSolo } from '../../conexoes/ChumbadorAoSolo';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { GuiaLinear } from '../../conexoes/GuiaLinear';
import { Objeto } from '../base/Objeto';
import { Porta } from './Porta';
import { TravaPorta } from './TravaPorta';

export interface DefinicaoConjuntoPortaBatente {
  readonly porta: Porta;
  readonly pecasDoBatente: readonly Objeto[];
  readonly guiaDaPorta: GuiaLinear;
  readonly trava?: TravaPorta;
  readonly guiaDaTrava?: GuiaLinear;
  readonly fixadoresDoBatente: readonly FixadorEstrutural[];
  readonly chumbadoresDoBatente: readonly ChumbadorAoSolo[];
}

/**
 * Composição do mecanismo sem criar um corpo físico duplicado. A porta é um
 * módulo móvel; o batente é a cadeia estrutural que recebe a reação do motor.
 */
export class ConjuntoPortaBatente {
  public constructor(private readonly definicao: DefinicaoConjuntoPortaBatente) {
    if (definicao.pecasDoBatente.length === 0 || definicao.chumbadoresDoBatente.length === 0) {
      throw new Error('Conjunto porta/batente exige estrutura e apoio físico.');
    }
    if (definicao.trava !== undefined && definicao.guiaDaTrava === undefined) {
      throw new Error('Trava física exige guia no conjunto porta/batente.');
    }
    const pecas = new Set(definicao.pecasDoBatente);
    if (definicao.chumbadoresDoBatente.some(chumbador => !pecas.has(chumbador.objeto))) {
      throw new Error('Chumbador do conjunto deve pertencer ao batente.');
    }
    if (definicao.fixadoresDoBatente.some(fixador => !pecas.has(fixador.objetoA) || !pecas.has(fixador.objetoB))) {
      throw new Error('Fixador do conjunto deve ligar peças do batente.');
    }
  }

  public get porta(): Porta { return this.definicao.porta; }
  public get trava(): TravaPorta | undefined { return this.definicao.trava; }
  public get pecasDoBatente(): readonly Objeto[] { return this.definicao.pecasDoBatente; }
  public get fixadoresDoBatente(): readonly FixadorEstrutural[] { return this.definicao.fixadoresDoBatente; }
  public get chumbadoresDoBatente(): readonly ChumbadorAoSolo[] { return this.definicao.chumbadoresDoBatente; }
  public get objetosFisicos(): readonly Objeto[] {
    return [this.porta, ...this.pecasDoBatente, ...(this.trava ? [this.trava] : [])];
  }

  public get apoioEstruturalDisponivel(): boolean {
    return this.pecasDoBatente.every(peca => peca.integridadeEstrutural > 0)
      && !this.definicao.guiaDaPorta.estaRompida
      && (this.definicao.guiaDaTrava === undefined || !this.definicao.guiaDaTrava.estaRompida)
      && this.fixadoresDoBatente.every(fixador => !fixador.estaRompido)
      && this.chumbadoresDoBatente.every(chumbador => !chumbador.estaRompido);
  }

  public get motivosDeApoioIndisponivel(): readonly string[] {
    const motivos: string[] = [];
    if (this.pecasDoBatente.some(peca => peca.integridadeEstrutural === 0)) motivos.push('peça do batente destruída');
    if (this.definicao.guiaDaPorta.estaRompida) motivos.push('guia da porta rompida');
    if (this.definicao.guiaDaTrava?.estaRompida) motivos.push('guia da trava rompida');
    if (this.fixadoresDoBatente.some(fixador => fixador.estaRompido)) motivos.push('união do batente rompida');
    if (this.chumbadoresDoBatente.some(chumbador => chumbador.estaRompido)) motivos.push('batente sem fundação');
    return motivos;
  }
}
