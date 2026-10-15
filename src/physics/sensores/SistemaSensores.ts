import { obterContatoCaixasOrientadas } from '../geometria/ContatoCaixasOrientadas';
import { ConjuntoEstruturalRigido } from '../estruturas/ConjuntoEstruturalRigido';
import { Objeto } from '../objetos/base/Objeto';
import { SuperficieFisica } from '../SuperficieFisica';
import { SwitchFimDeCurso } from './SwitchFimDeCurso';
import type { SensoresVeiculoComposto } from './SensoresVeiculoComposto';

/** Mantém sensores registrados e atualiza suas leituras a partir do mundo físico. */
export class SistemaSensores {
  private readonly switchesFimDeCurso = new Map<string, SwitchFimDeCurso>();
  private readonly sensoresVeiculo = new Map<SensoresVeiculoComposto, SensoresVeiculoComposto>();

  /** Instala fornecedores de corpos, superfícies e ilhas; cria registros de sensores vazios. Não amostra nem modifica cinemática durante a construção. @contract f-11d76a7fff48a0bd @reviewed M12-DOC: implementação lida. */
  public constructor(
    private readonly obterObjetos: () => Iterable<Objeto>,
    private readonly obterSuperficies: () => Iterable<SuperficieFisica>,
    private readonly obterConjuntoEstrutural: (objeto: Objeto) => ConjuntoEstruturalRigido | undefined,
  ) {}

  /** Dependências diretas: `this.switchesFimDeCurso.has`, `Error`, `this.switchesFimDeCurso.set`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-41e4ac6006256538 */
  public registrarSwitchFimDeCurso(switchFimDeCurso: SwitchFimDeCurso): void {
    if (this.switchesFimDeCurso.has(switchFimDeCurso.id)) throw new Error(`Switch de fim de curso já registrado: ${switchFimDeCurso.id}.`);
    this.switchesFimDeCurso.set(switchFimDeCurso.id, switchFimDeCurso);
    this.atualizarSwitchesFimDeCurso();
  }

  /** Dependências diretas: `this.sensoresVeiculo.set`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-3b889335e49e00ed */
  public registrarSensoresVeiculo(sensores: SensoresVeiculoComposto): void {
    this.sensoresVeiculo.set(sensores, sensores);
  }

  /** Reavalia contatos sem avançar o relógio físico.
   * @contract f-5ac483ba20adf88a
   */
  public reavaliarSwitchesFimDeCurso(): void {
    this.atualizarSwitchesFimDeCurso();
  }

  /** Atualiza as leituras após as respostas físicas do passo.
   * @contract f-e7730e8432cb95e1
   */
  public atualizar(dtS: number): void {
    for (const sensores of this.sensoresVeiculo.values()) sensores.atualizar(dtS);
    this.atualizarSwitchesFimDeCurso();
  }

  /** Dependências diretas: `this.switchesFimDeCurso.values`, `switchFimDeCurso.obterVolumeSensivel`, `[...this.obterObjetos()].find`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-a572c18cb0594dd6 */
  private atualizarSwitchesFimDeCurso(): void {
    const toleranciaContatoM = 1e-6;
    for (const switchFimDeCurso of this.switchesFimDeCurso.values()) {
      const volume = switchFimDeCurso.obterVolumeSensivel();
      const alvoObjeto = [...this.obterObjetos()].find((objeto) => {
        if (objeto === switchFimDeCurso.objetoHospedeiro || this.estaoNaMesmaIlhaEstrutural(objeto, switchFimDeCurso.objetoHospedeiro)) return false;
        const estado = objeto.getEstadoFisico();
        return obterContatoCaixasOrientadas(
          volume,
          { posicaoM: estado.posicaoM, dimensoesM: objeto.dimensoesM, orientacaoZRad: estado.orientacaoRad.z },
          toleranciaContatoM,
        ) !== undefined;
      });
      if (alvoObjeto) {
        switchFimDeCurso.atualizarContatoPeloCore(alvoObjeto);
        continue;
      }
      const tocaSuperficie = [...this.obterSuperficies()].find((superficie) =>
        switchFimDeCurso.obterPontosDaFaceSensivelM().some((ponto) => superficie.contemProjecao(ponto) && superficie.distanciaAssinadaM(ponto) <= toleranciaContatoM),
      );
      switchFimDeCurso.atualizarContatoPeloCore(tocaSuperficie ? { id: tocaSuperficie.id, tipo: 'superficie' } : undefined);
    }
  }

  /** Devolve `conjuntoA !== undefined && conjuntoA === this.obterConjuntoEstrutural(objetoB)`. Dependências diretas: `this.obterConjuntoEstrutural`. REVISÃO NECESSÁRIA: contrato de domínio ainda não confirmado; fatos completos no catálogo. @contract f-aa56728d6b2e26c1 */
  private estaoNaMesmaIlhaEstrutural(objetoA: Objeto, objetoB: Objeto): boolean {
    const conjuntoA = this.obterConjuntoEstrutural(objetoA);
    return conjuntoA !== undefined && conjuntoA === this.obterConjuntoEstrutural(objetoB);
  }
}
