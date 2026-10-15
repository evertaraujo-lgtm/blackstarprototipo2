import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import type { ForcaAplicada } from '../tipos/ForcaAplicada';
import type { ConjuntoEstruturalRigido } from '../estruturas/ConjuntoEstruturalRigido';

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
  /** Reação axial para cargas contínuas distribuídas: desconta aceleração comum e angular da ilha.
   * @contract f-ca6b22a41219e7be
   */
  public registrarCargasDistribuidas(conjunto: ConjuntoEstruturalRigido,
    cargas: readonly { readonly objeto: Objeto; readonly forcas: readonly ForcaAplicada[] }[], fixadoresRegistrados: Iterable<FixadorEstrutural>): void {
    const membros = new Set(conjunto.membros), G = conjunto.obterCentroDeMassaAtual();
    const fixadores = [...fixadoresRegistrados].filter(f => f.estaAtivo && membros.has(f.objetoA) && membros.has(f.objetoB));
    let F = Vetor3.zero, torque = 0;
    const resultantes = new Map<Objeto, Vetor3>();
    for (const c of cargas) for (const f of c.forcas) { F = F.adicionar(f.forcaN); torque += f.pontoM.subtrair(G).produtoVetorial(f.forcaN).z + (f.torqueNm?.z ?? 0); }
    for (const c of cargas) resultantes.set(c.objeto, c.forcas.reduce((s, f) => s.adicionar(f.forcaN), Vetor3.zero));
    const a = F.multiplicar(1 / conjunto.massaTotalKg), alfa = new Vetor3(0, 0, torque / conjunto.momentoInerciaZKgM2);
    const omega = conjunto.membros[0].getEstadoFisico().velocidadeAngularRadps;
    const esforcos = fixadores.map(f => {
      const lado = this.obterMembrosAlcancaveis(f.objetoA, membros, fixadores, f);
      if (lado.has(f.objetoB)) return { f, axialN: 0 }; // Malhas redundantes permanecem fora do modelo axial.
      const grupo = conjunto.membros.filter(o => lado.has(o)), massa = grupo.reduce((s, o) => s + o.massaKg, 0);
      const Ga = this.obterCentroDeMassa(grupo), Gb = this.obterCentroDeMassa(conjunto.membros.filter(o => !lado.has(o)));
      const braco = Ga.subtrair(G), eixo = Gb.subtrair(Ga);
      const ext = grupo.reduce((s, o) => s.adicionar(resultantes.get(o) ?? Vetor3.zero), Vetor3.zero);
      const reacao = a.adicionar(alfa.produtoVetorial(braco)).adicionar(omega.produtoVetorial(omega.produtoVetorial(braco))).multiplicar(massa).subtrair(ext);
      return { f, axialN: eixo.magnitude > 1e-9 ? reacao.produtoEscalar(eixo.multiplicar(1 / eixo.magnitude)) : 0 };
    });
    for (const { f, axialN } of esforcos) { f.registrarEsforcoFisicoN(Math.max(0, axialN)); f.registrarEsforcoDeCompressaoFisicoN(Math.max(0, -axialN)); }
  }
  /** Dependências diretas: `Set`, `[...fixadoresRegistrados].filter`, `membros.reduce`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-1569e971b21872f1 */
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
    const fixadores = [...fixadoresRegistrados].filter((fixador) => fixador.estaAtivo
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

  /** Devolve `posicaoPonderada.multiplicar(1 / massaTotalKg)`. Dependências diretas: `membros.reduce`, `posicaoPonderada.multiplicar`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-8ee28e4caeba0787 */
  private obterCentroDeMassa(membros: readonly Objeto[]): Vetor3 {
    const massaTotalKg = membros.reduce((soma, membro) => soma + membro.massaKg, 0);
    const posicaoPonderada = membros.reduce((soma, membro) => {
      const posicao = membro.getEstadoFisico().posicaoM;
      return soma.adicionar(posicao.multiplicar(membro.massaKg));
    }, Vetor3.zero);
    return posicaoPonderada.multiplicar(1 / massaTotalKg);
  }

  /** Devolve `alcancaveis`. Dependências diretas: `Set`, `pendentes.pop`, `membrosDaIlha.has`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-a116f5e9200f30cc */
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
