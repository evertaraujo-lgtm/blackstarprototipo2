import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

/**
 * Converte o impulso externo recebido por uma ilha rígida em esforço interno
 * nos fixadores que são pontes da sua topologia atual.
 *
 * O modelo inicial é planar e cobre cadeias/árvores: ao remover um fixador,
 * a fração de força atribuída a ele é proporcional à massa do lado que deixa
 * de estar conectado ao ponto de contato. Malhas com caminhos redundantes
 * permanecem extensão futura, pois exigem distribuição de esforços estática.
 */
export class ResolvedorEsforcoEstrutural {
  public registrarImpulsoDeContato(
    objetoDeContato: Objeto,
    membros: readonly Objeto[],
    impulsoNs: number,
    direcaoDaForca: { readonly x: number; readonly y: number; readonly z: number },
    dtS: number,
    fixadoresRegistrados: Iterable<FixadorEstrutural>,
  ): void {
    if (impulsoNs <= 0 || !Number.isFinite(impulsoNs) || !Number.isFinite(dtS) || dtS <= 0) return;
    const membrosDaIlha = new Set(membros);
    const fixadores = [...fixadoresRegistrados].filter((fixador) => !fixador.estaRompido
      && membrosDaIlha.has(fixador.objetoA) && membrosDaIlha.has(fixador.objetoB));
    const massaTotalKg = membros.reduce((soma, membro) => soma + membro.massaKg, 0);
    if (massaTotalKg <= 0) return;
    const forcaDeContatoN = impulsoNs / dtS;
    const esforcos = fixadores.map((fixador) => {
      const alcancaveis = this.obterMembrosAlcancaveis(objetoDeContato, membrosDaIlha, fixadores, fixador);
      // Se os dois lados continuam alcançáveis, o fixador não é ponte. A
      // distribuição de carga em malhas redundantes ainda não é modelada.
      if (alcancaveis.has(fixador.objetoA) === alcancaveis.has(fixador.objetoB)) return { fixador, tracaoN: 0, compressaoN: 0 };
      const massaRemotaKg = membros
        .filter((membro) => !alcancaveis.has(membro))
        .reduce((soma, membro) => soma + membro.massaKg, 0);
      const centroDoLadoDeContato = this.obterCentroDeMassa(membros.filter((membro) => alcancaveis.has(membro)));
      const centroDoLadoRemoto = this.obterCentroDeMassa(membros.filter((membro) => !alcancaveis.has(membro)));
      const direcaoAteOLadoRemoto = centroDoLadoRemoto.subtrair(centroDoLadoDeContato);
      const comprimentoM = direcaoAteOLadoRemoto.magnitude;
      if (comprimentoM <= 1e-9) return { fixador, tracaoN: 0, compressaoN: 0 };
      const componenteAoLongoDoVinculoN = forcaDeContatoN * (
        (direcaoDaForca.x * direcaoAteOLadoRemoto.x
          + direcaoDaForca.y * direcaoAteOLadoRemoto.y
          + direcaoDaForca.z * direcaoAteOLadoRemoto.z) / comprimentoM
      ) * (massaRemotaKg / massaTotalKg);
      return {
        fixador,
        tracaoN: Math.max(0, -componenteAoLongoDoVinculoN),
        compressaoN: Math.max(0, componenteAoLongoDoVinculoN),
      };
    });
    // Calcula todas as cargas com a topologia pré-ruptura para que a ordem
    // de iteração não mude o resultado do mesmo impulso físico.
    for (const { fixador, tracaoN, compressaoN } of esforcos) {
      fixador.registrarEsforcoFisicoN(tracaoN);
      fixador.registrarEsforcoDeCompressaoFisicoN(compressaoN);
    }
  }

  private obterCentroDeMassa(membros: readonly Objeto[]): Vetor3 {
    const massaTotalKg = membros.reduce((soma, membro) => soma + membro.massaKg, 0);
    const posicaoPonderada = membros.reduce((soma, membro) => {
      const posicao = membro.getEstadoFisico().posicaoM;
      return soma.adicionar(posicao.multiplicar(membro.massaKg));
    }, Vetor3.zero);
    return posicaoPonderada.multiplicar(1 / massaTotalKg);
  }

  private obterMembrosAlcancaveis(
    origem: Objeto,
    membrosDaIlha: ReadonlySet<Objeto>,
    fixadores: readonly FixadorEstrutural[],
    fixadorIgnorado: FixadorEstrutural,
  ): Set<Objeto> {
    const alcancaveis = new Set<Objeto>([origem]);
    const pendentes = [origem];
    while (pendentes.length > 0) {
      const atual = pendentes.pop()!;
      for (const fixador of fixadores) {
        if (fixador === fixadorIgnorado) continue;
        const vizinho = fixador.objetoA === atual ? fixador.objetoB : fixador.objetoB === atual ? fixador.objetoA : undefined;
        if (vizinho && membrosDaIlha.has(vizinho) && !alcancaveis.has(vizinho)) {
          alcancaveis.add(vizinho);
          pendentes.push(vizinho);
        }
      }
    }
    return alcancaveis;
  }
}
