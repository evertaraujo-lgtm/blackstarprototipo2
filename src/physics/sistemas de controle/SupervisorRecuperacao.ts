import { GerenciadorDeControladores } from './GerenciadorDeControladores';
import { avaliarFronteiraAproximacao, configurarFronteiraAproximacao,
  type ConfiguracaoFronteiraAproximacao, type EstadoFronteiraAproximacao } from './FronteiraAproximacao';

/** Posse exclusiva RE→aproximação→pouso. Neste marco somente a primeira fronteira
 * é avaliável; pouso não é executado. O protótipo sem atuação não satisfaz B.
 */
export class SupervisorRecuperacao {
  private solicitado = false;
  private automatico = false;
  private fase: 'reentrada' | 'aproximacao' | 'falha' = 'reentrada';
  private avaliacao?: ReturnType<typeof avaliarFronteiraAproximacao>;
  private readonly limites: ConfiguracaoFronteiraAproximacao;
  /** Recebe registro existente e congela critérios independentes dos antigos de pouso.  @contract f-100510609617f2a3 */
  public constructor(private readonly gerenciador: GerenciadorDeControladores, limites: ConfiguracaoFronteiraAproximacao) {
    this.limites = configurarFronteiraAproximacao(limites);
  }
  /** Define tentativa automática; não dispensa os requisitos operacionais.  @contract f-1533e482f466d653 */
  public definirAutomatico(ativo: boolean): void { this.automatico = ativo; }
  /** Agenda avaliação única de posse, sem ignição ou atuação.  @contract f-9c317fe82816cb1a */
  public solicitarAproximacao(): void { this.solicitado = true; }
  /** Avalia A/B e troca seleção exclusivamente quando B está atendido.
   * Perda crítica retira as três seleções e mantém falha travada para diagnóstico.
   * @contract f-658ed3f1e0b5263f
   */
  public atualizar(e: EstadoFronteiraAproximacao): void {
    this.avaliacao = avaliarFronteiraAproximacao(e, this.limites);
    const falha = !this.avaliacao.requisitos[0].atendido || e.integridade <= 0
      || (this.fase === 'aproximacao' && (!e.propulsaoDisponivel || !e.integracaoCompativel
        || !e.alimentacaoDisponivel || e.integridadeFlaps <= 0));
    if (falha || this.fase === 'falha') {
      for (const id of ['reentrada', 'aproximacao', 'pouso']) this.gerenciador.desabilitar(id);
      this.fase = 'falha';
    } else if (this.fase === 'reentrada' && (this.solicitado || this.automatico) && this.avaliacao.autorizado) {
      this.gerenciador.desabilitar('reentrada'); this.gerenciador.desabilitar('pouso');
      this.gerenciador.habilitar('aproximacao'); this.fase = 'aproximacao';
    }
    this.solicitado = false;
  }
  /** Expõe DTO imutável com candidato A separado da autorização B.  @contract f-0cddc17ba40e187d */
  public observar() { return { fase: this.fase, automatico: this.automatico,
    candidatoCinematico: this.avaliacao?.candidatoCinematico ?? false,
    autorizado: this.fase !== 'falha' && (this.avaliacao?.autorizado ?? false),
    requisitos: this.avaliacao?.requisitos ?? [], limites: this.limites, avaliacao: this.avaliacao ?? null }; }
}
