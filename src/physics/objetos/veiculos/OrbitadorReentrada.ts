import type { ReferencialFisico } from '../../ambiente/ReferencialFisico';
import { PerfilAtmosfericoReentrada } from '../../ambiente/PerfilAtmosfericoReentrada';
import { avaliarAerodinamica, MODELO_REENTRADA, type CargasReentrada } from '../../reentrada/ModeloAerodinamicoReentrada';
import { Objeto, type CondicoesAtmosfericas, type EstadoFisico, type ForcaFisicaSolicitada } from '../base/Objeto';
import { RolagemVirtual } from '../componentes/RolagemVirtual';
import { Vetor3 } from '../../Vetor3';

/** Corpo ADM físico especializado; não presume sistemas de um orbitador de voo. */
export class OrbitadorReentrada extends Objeto {
  private readonly rolagem: RolagemVirtual;

  /** Material concentrado provisório e geometria de engenharia, SI. TPS/estrutura
   * não são camadas independentes. Recebe serviços compartilhados, sem DOM/relógio.
   * @contract f-f474385619746e2c
   */
  public constructor(estadoInicial: EstadoFisico, limiteTermicoC: number, phiInicialRad: number,
    private readonly perfil: PerfilAtmosfericoReentrada, private readonly referencial: ReferencialFisico,
    private readonly lerVelocidadeArMps: () => Vetor3) {
    super({ id: 'orbitador-re-001', massaBaseKg: MODELO_REENTRADA.massaCorpoKg,
      dimensoesM: new Vetor3(40, 8, 16), resistenciaColisaoJ: MODELO_REENTRADA.resistenciaCorpoJ,
      limiteTermicoC, areaFrontalM2: MODELO_REENTRADA.areaReferenciaM2,
      capacidadeTermicaJPorC: MODELO_REENTRADA.massaCorpoKg * 800,
      areaTermicaM2: 80, coeficienteConveccaoWPorM2C: 10, estadoInicial });
    this.rolagem = new RolagemVirtual(phiInicialRad, MODELO_REENTRADA.taxaRolagemRadps);
  }

  /** Consulta cargas com a mesma densidade/vento do core e perfil compartilhado.  @contract f-14919f1c850cb153 */
  public avaliar(condicoes: CondicoesAtmosfericas): CargasReentrada {
    const e = this.getEstadoFisico();
    return avaliarAerodinamica(e, condicoes, this.perfil.amostrar(this.referencial.altitudeGeometricaM(e.posicaoM)),
      this.integridadeEstrutural, this.rolagem.observar().atualRad);
  }

  /** Cd analítico pelo fluxo atual; arrasto é aplicado exclusivamente pelo core.  @contract f-5af7c6e41f3ef618 */
  public override getCoeficienteArrastoEfetivo(vRel = Vetor3.zero): number {
    const e = this.getEstadoFisico();
    return this.avaliar({ densidadeArKgM3: 0, velocidadeArMps: e.velocidadeMps.subtrair(vRel) }).cd;
  }

  /** CP global m obtido da geometria longitudinal e atitude física XY atuais.  @contract f-a11b6560d6de12a1 */
  public override obterCentroPressaoM(): Vetor3 {
    const e = this.getEstadoFisico(), cp = this.avaliar({ densidadeArKgM3: 0, velocidadeArMps: this.lerVelocidadeArMps() }).centroPressaoLocalM;
    return e.posicaoM.adicionar(new Vetor3(Math.cos(e.orientacaoRad.z) * cp, Math.sin(e.orientacaoRad.z) * cp, 0));
  }

  /** Somente sustentação projetada; não repete o arrasto aplicado pelo mundo.  @contract f-acefff1a6872cd5c */
  public override obterForcasAerodinamicas(c: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[] {
    return [{ forcaN: this.avaliar(c).forcaSustentacaoN, pontoM: this.obterCentroPressaoM() }];
  }

  /** Fluxo indicador vezes área efetiva, limitado à dissipação D·V; substitui a
   * fração histórica. SistemaTermico aplica uma vez e conserva contadores/dano.
   * @contract f-93990e131a83cd8a
   */
  public override obterPotenciaAquecimentoAerodinamicoW(c: CondicoesAtmosfericas, potenciaW: number): number {
    return Math.min(potenciaW, this.avaliar(c).fluxoTermicoIndicadorWm2 * MODELO_REENTRADA.areaAquecidaM2);
  }

  /** Atualiza exclusivamente a cinemática virtual em subpassos do core, s;
   * colapso estrutural indisponibiliza a capacidade, sem alterar atitude XY.
   * @contract f-b9aa4b0a352500a1
   */
  public override prepararPassoOperacional(dtS: number): void {
    if (this.integridadeEstrutural === 0) this.rolagem.definirDisponibilidade(false);
    this.rolagem.avancar(dtS);
  }
  /** Solicitação operacional registrada em rad e segundos simulados.  @contract f-8ed0223bd082e085 */
  public solicitarRolagem(rad: number, tempoS: number): void { this.rolagem.solicitar(rad, tempoS); }
  /** Perda de disponibilidade não altera atitude física XY.  @contract f-fccd1b9a46c52b5d */
  public definirDisponibilidadeRolagem(disponivel: boolean): void { this.rolagem.definirDisponibilidade(disponivel); }
  /** Snapshot consultável da aproximação virtual.  @contract f-9b79263187f0a4ca */
  public observarRolagem() { return this.rolagem.observar(); }
  /** Cópia do histórico de comandos prescritos para exportação.  @contract f-0b0738b39eddc914 */
  public obterHistoricoRolagem() { return this.rolagem.obterHistorico(); }
}
