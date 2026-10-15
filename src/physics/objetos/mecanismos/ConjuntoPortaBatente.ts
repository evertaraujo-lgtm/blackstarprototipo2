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
  /** Exige peças e chumbadores do batente; trava deve ter guia, chumbadores devem ancorar peças declaradas e fixadores devem ligá-las. Não registra corpos/vínculos no mundo automaticamente. @contract f-288f1848d7fa9e2a @reviewed M12-DOC: implementação lida. */
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

  /** Devolve `this.definicao.porta`. Efeitos indiretos seguem as dependências chamadas. @contract f-8850190e77e7bf57 */
  public get porta(): Porta { return this.definicao.porta; }
  /** Devolve `this.definicao.trava`. Efeitos indiretos seguem as dependências chamadas. @contract f-315c8fbb7f091b74 */
  public get trava(): TravaPorta | undefined { return this.definicao.trava; }
  /** Devolve `this.definicao.pecasDoBatente`. Efeitos indiretos seguem as dependências chamadas. @contract f-dd331b18bbd5baf4 */
  public get pecasDoBatente(): readonly Objeto[] { return this.definicao.pecasDoBatente; }
  /** Devolve `this.definicao.fixadoresDoBatente`. Efeitos indiretos seguem as dependências chamadas. @contract f-3b3148e66162d0cb */
  public get fixadoresDoBatente(): readonly FixadorEstrutural[] { return this.definicao.fixadoresDoBatente; }
  /** Devolve `this.definicao.chumbadoresDoBatente`. Efeitos indiretos seguem as dependências chamadas. @contract f-88c9aa90b5309d6a */
  public get chumbadoresDoBatente(): readonly ChumbadorAoSolo[] { return this.definicao.chumbadoresDoBatente; }
  /** Retorna novo array com porta, peças do batente e trava opcional; não duplica os corpos físicos. @contract f-99ecb1dc2530e485 @reviewed M12-DOC: implementação lida. */
  public get objetosFisicos(): readonly Objeto[] {
    return [this.porta, ...this.pecasDoBatente, ...(this.trava ? [this.trava] : [])];
  }

  /** Exige peças íntegras, guias não rompidas, fixadores ativos e chumbadores íntegros; consulta topologia sem criar apoio artificial. @contract f-296ec4147df261ec @reviewed M12-DOC: implementação lida. */
  public get apoioEstruturalDisponivel(): boolean {
    return this.pecasDoBatente.every(peca => peca.integridadeEstrutural > 0)
      && !this.definicao.guiaDaPorta.estaRompida
      && (this.definicao.guiaDaTrava === undefined || !this.definicao.guiaDaTrava.estaRompida)
      && this.fixadoresDoBatente.every(fixador => fixador.estaAtivo)
      && this.chumbadoresDoBatente.every(chumbador => !chumbador.estaRompido);
  }

  /** Compõe diagnósticos de peça destruída, guia rompida, união rompida/liberada e fundação perdida; não altera estado. @contract f-25a540ad06590f40 @reviewed M12-DOC: implementação lida. */
  public get motivosDeApoioIndisponivel(): readonly string[] {
    const motivos: string[] = [];
    if (this.pecasDoBatente.some(peca => peca.integridadeEstrutural === 0)) motivos.push('peça do batente destruída');
    if (this.definicao.guiaDaPorta.estaRompida) motivos.push('guia da porta rompida');
    if (this.definicao.guiaDaTrava?.estaRompida) motivos.push('guia da trava rompida');
    if (this.fixadoresDoBatente.some(fixador => !fixador.estaAtivo)) motivos.push(this.fixadoresDoBatente.some(f => f.estaRompido) ? 'união do batente rompida' : 'união do batente liberada');
    if (this.chumbadoresDoBatente.some(chumbador => chumbador.estaRompido)) motivos.push('batente sem fundação');
    return motivos;
  }
}
