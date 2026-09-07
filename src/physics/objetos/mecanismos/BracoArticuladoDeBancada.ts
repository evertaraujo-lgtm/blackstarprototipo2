import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { Vetor3 } from '../../Vetor3';
import { Objeto, type DefinicaoObjeto } from '../base/Objeto';

/** Haste fisica com fixador universal na extremidade. */
export class BracoArticuladoDeBancada extends Objeto {
  public constructor(definicao: DefinicaoObjeto) { super(definicao); }

  public criarFixadorNaExtremidade(objeto: Objeto, resistenciaTracaoN: number): FixadorEstrutural {
    return new FixadorEstrutural({
      id: `${this.id}-fixador-${objeto.id}`,
      objetoA: this,
      objetoB: objeto,
      resistenciaTracaoN,
      obterEsforcoSolicitadoN: () => 0,
    });
  }

  public obterPontoDaExtremidadeM(): Vetor3 {
    const estado = this.getEstadoFisico();
    const c = Math.cos(estado.orientacaoRad.z); const s = Math.sin(estado.orientacaoRad.z);
    return estado.posicaoM.adicionar(new Vetor3(this.dimensoesM.x * c / 2, this.dimensoesM.x * s / 2, 0));
  }
}
