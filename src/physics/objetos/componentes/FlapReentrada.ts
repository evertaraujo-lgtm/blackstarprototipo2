import { AletaAerodinamica, type DefinicaoAletaAerodinamica } from './AletaAerodinamica';
import type { CondicoesAtmosfericas, ForcaFisicaSolicitada } from '../base/Objeto';
import { calcularFluxoTermicoIndicador, projetarSustentacao, MODELO_REENTRADA, type ParametrosReentrada } from '../../reentrada/ModeloAerodinamicoReentrada';
import { Vetor3 } from '../../Vetor3';

/** Especializa cargas hipersônicas preliminares, preservando atuador elétrico Aleta. */
export class FlapReentrada extends AletaAerodinamica {
  private phiUltimoConectadoRad: number;
  private taxaEfetivaRadps = 0;
  /** Recebe somente porta de leitura da projeção e permissivo da montagem.  @contract f-713ac4483df17789 */
  public constructor(definicao: DefinicaoAletaAerodinamica,
    private readonly lerRolagemRad: () => number, private readonly montagemIntegra: () => boolean, private readonly parametros: ParametrosReentrada = MODELO_REENTRADA) {
    super(definicao);
    this.phiUltimoConectadoRad = lerRolagemRad();
  }

  /** Reutiliza atuador elétrico e acompanha bank enquanto conectado. Após separação
   * conserva última projeção prescrita: o corpo livre mantém cargas aerodinâmicas,
   * e sua posição/atitude XY continuam sendo calculadas exclusivamente pelo core.
   * @contract f-d940577d02a1ae47
   */
  public override prepararPassoOperacional(dtS: number): void {
    const anterior = this.deflexaoAtualRad;
    super.prepararPassoOperacional(dtS);
    this.taxaEfetivaRadps = dtS > 0 ? (this.deflexaoAtualRad - anterior) / dtS : 0;
    if (this.montagemIntegra()) this.phiUltimoConectadoRad = this.lerRolagemRad();
  }

  /** Força perpendicular ao fluxo no CP real do flap, N, proporcional a q.
   * Corpo destacado mantém lift/drag próprios e última projeção de bank,
   * sem transmitir forças a distância para o orbitador.
   * @contract f-e32af2d35fa6fa2c
   */
  public override obterForcasAerodinamicas(c: CondicoesAtmosfericas): readonly ForcaFisicaSolicitada[] {
    const e = this.getEstadoFisico(), v = e.velocidadeMps.subtrair(c.velocidadeArMps), V = v.magnitude;
    if (V < 1e-6 || c.densidadeArKgM3 === 0) return [];
    const L = 0.5 * c.densidadeArKgM3 * V ** 2 * this.parametros.areaFlapM2
      * this.parametros.clFlapPorRad * Math.sin(this.deflexaoAtualRad) * this.integridadeEstrutural;
    return [{ forcaN: new Vetor3(-v.y / V, v.x / V, 0).multiplicar(projetarSustentacao(L, this.phiUltimoConectadoRad)), pontoM: e.posicaoM }];
  }

  /** Cd positivo por deflexão real; permanece no caminho único de arrasto do core.  @contract f-f2617c9c3b49b631 */
  public override getCoeficienteArrastoEfetivo(): number {
    return this.parametros.cdFlapBase + this.parametros.cdFlapDeflexao * Math.sin(this.deflexaoAtualRad) ** 2;
  }

  /** Aquecimento indicador com raio/área configurados (padrões 0,5 m e 2 m²);
   * temperatura é do componente concentrado, sem interpretação de atuador interno.
   * @contract f-d1d83ab8a5f815b3
   */
  public override obterPotenciaAquecimentoAerodinamicoW(c: CondicoesAtmosfericas, dissipacaoW: number): number {
    const V = this.getEstadoFisico().velocidadeMps.subtrair(c.velocidadeArMps).magnitude;
    return Math.min(dissipacaoW, this.parametros.areaAquecidaFlapM2 * calcularFluxoTermicoIndicador(c.densidadeArKgM3, V, this.parametros.raioNarizFlapM, this.parametros.coeficienteSuttonGravesSI));
  }
  /** Capacidade térmica concentrada J/°C calculada pela massa instantânea e c configurado.  @contract f-3e48ec123ef93cbe */
  public override get capacidadeTermicaJPorC(): number { return this.massaKg * this.parametros.calorEspecificoFlapJPorKgC; }

  /** Diagnóstico do atuador prescrito, em rad/s, por permissivos reais. Torque e
   * carga mecânica não são inventados a partir dos 300 W elétricos do modelo.
   * @contract f-b750057ae1f8513b
   */
  public obterDiagnosticoAtuacao() {
    return { taxaEfetivaRadps: this.taxaEfetivaRadps, cursoRad: this.parametros.cursoFlapRad,
      taxaMaximaRadps: this.parametros.taxaFlapRadps, modeloMecanico: 'taxa-prescrita-eletrica',
      torqueDisponivelNm: null, torqueCargaNm: null,
      bloqueio: !this.montagemIntegra() ? 'vinculo' : this.integridadeEstrutural <= 0 ? 'integridade'
        : !this.conexaoEletrica.estaEnergizada ? 'alimentacao' : Math.abs(this.comandoAtualRad - this.deflexaoAtualRad) > 1e-9 ? 'curso-taxa-ou-energia' : 'nenhum' };
  }
}
