import { obterContatoCaixasOrientadas } from '../geometria/ContatoCaixasOrientadas';
import { ConjuntoEstruturalRigido } from '../estruturas/ConjuntoEstruturalRigido';
import { Objeto } from '../objetos/base/Objeto';
import { SuperficiePlano } from '../SuperficiePlano';
import { SwitchFimDeCurso } from './SwitchFimDeCurso';

/** Mantém sensores registrados e atualiza suas leituras a partir do mundo físico. */
export class SistemaSensores {
  private readonly switchesFimDeCurso = new Map<string, SwitchFimDeCurso>();

  public constructor(
    private readonly obterObjetos: () => Iterable<Objeto>,
    private readonly obterSuperficies: () => Iterable<SuperficiePlano>,
    private readonly obterConjuntoEstrutural: (objeto: Objeto) => ConjuntoEstruturalRigido | undefined,
  ) {}

  public registrarSwitchFimDeCurso(switchFimDeCurso: SwitchFimDeCurso): void {
    if (this.switchesFimDeCurso.has(switchFimDeCurso.id)) throw new Error(`Switch de fim de curso já registrado: ${switchFimDeCurso.id}.`);
    this.switchesFimDeCurso.set(switchFimDeCurso.id, switchFimDeCurso);
    this.atualizarSwitchesFimDeCurso();
  }

  /** Reavalia contatos sem avançar o relógio físico. */
  public reavaliarSwitchesFimDeCurso(): void {
    this.atualizarSwitchesFimDeCurso();
  }

  /** Atualiza as leituras após as respostas físicas do passo. */
  public atualizar(): void {
    this.atualizarSwitchesFimDeCurso();
  }

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
        switchFimDeCurso.obterPontosDaFaceSensivelM().some((ponto) => ponto.y <= superficie.alturaM + toleranciaContatoM),
      );
      switchFimDeCurso.atualizarContatoPeloCore(tocaSuperficie ? { id: tocaSuperficie.id, tipo: 'superficie' } : undefined);
    }
  }

  private estaoNaMesmaIlhaEstrutural(objetoA: Objeto, objetoB: Objeto): boolean {
    const conjuntoA = this.obterConjuntoEstrutural(objetoA);
    return conjuntoA !== undefined && conjuntoA === this.obterConjuntoEstrutural(objetoB);
  }
}
