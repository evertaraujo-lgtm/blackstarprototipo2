import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { Vetor3 } from '../../Vetor3';
import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

/** Haste fisica com fixador universal na extremidade. */
export class BracoArticuladoDeBancada extends Objeto {
  /** Dependências diretas: `super`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-2429e53025cf49cb */
  public constructor(definicao: DefinicaoObjeto) { super(definicao); }

  /** Dependências diretas: `FixadorEstrutural`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-3f5ea8e45bcaaae5 */
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

  /** Devolve `estado.posicaoM.adicionar(new Vetor3(this.dimensoesM.x * c / 2, this.dimensoesM.x * s / 2, 0))`. Dependências diretas: `this.getEstadoFisico`, `estado.posicaoM.adicionar`, `Vetor3`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-709fd001e86246a3 */
  public obterPontoDaExtremidadeM(): Vetor3 {
    const estado = this.getEstadoFisico();
    const c = Math.cos(estado.orientacaoRad.z); const s = Math.sin(estado.orientacaoRad.z);
    return estado.posicaoM.adicionar(new Vetor3(this.dimensoesM.x * c / 2, this.dimensoesM.x * s / 2, 0));
  }
}
