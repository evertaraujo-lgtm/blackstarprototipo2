import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { Vetor3 } from '../../Vetor3';
import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

/** Haste fisica com fixador universal na extremidade. */
export class BracoArticuladoDeBancada extends Objeto {
  /** Inicializa corpo físico do braço com propriedades de Objeto; não instala junta automaticamente. @contract f-2429e53025cf49cb @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoObjeto) { super(definicao); }

  /** Cria fixador entre braço e objeto com resistência N e solicitação externa zero; esforços físicos adicionais vêm do core. Não registra vínculo automaticamente nem reposiciona objeto na extremidade. @contract f-3f5ea8e45bcaaae5 @reviewed M12-DOC: implementação lida. */
  public criarFixadorNaExtremidade(objeto: Objeto, resistenciaTracaoN: number): FixadorEstrutural {
    return new FixadorEstrutural({
      id: `${this.id}-fixador-${objeto.id}`,
      objetoA: this,
      objetoB: objeto,
      resistenciaTracaoN,
      /** Devolve `0`. Efeitos indiretos seguem as dependências chamadas. @contract f-735d13fca338a04d */
      obterEsforcoSolicitadoN: () => 0,
    });
  }

  /** Transforma meia extensão positiva do braço em XY pela pose atual; consulta ponto global em m. @contract f-709fd001e86246a3 @reviewed M12-DOC: implementação lida. */
  public obterPontoDaExtremidadeM(): Vetor3 {
    const estado = this.getEstadoFisico();
    const c = Math.cos(estado.orientacaoRad.z); const s = Math.sin(estado.orientacaoRad.z);
    return estado.posicaoM.adicionar(new Vetor3(this.dimensoesM.x * c / 2, this.dimensoesM.x * s / 2, 0));
  }
}
