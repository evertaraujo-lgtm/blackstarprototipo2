import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada } from '../base/Objeto';
import { EstadoOperacional, GerenciadorDeSistemas, SistemaOperacional } from '../../SistemaOperacional';
import { TanquePropelente } from './TanquePropelente';
import { Vetor3 } from '../../Vetor3';

export interface DefinicaoPropulsor extends DefinicaoObjeto {
  readonly empuxoMaximoN: number;
  readonly vazaoMaximaKgS: number;
  readonly propelenteCompativel: string;
}

export type IdSistemaPropulsor = 'elétrico' | 'hidráulico' | 'combustível' | 'controle';

/** Propulsor físico que exige sequência de partida e ignição explícita. */
export class Propulsor extends Objeto {
  private throttle = 0;
  private tanque?: TanquePropelente;
  private comprimentoMaxMangueiraM = 0;
  private mangueiraRompida = false;
  private empuxoAtualCalculadoN = 0;
  private vazaoAtualCalculadaKgS = 0;
  private ignicaoConfirmada = false;
  private ultimaNegacaoDeComando?: string;
  private readonly sistemaEletrico = new SistemaOperacional('elétrico', EstadoOperacional.Desligado);
  private readonly sistemaHidraulico = new SistemaOperacional('hidráulico', EstadoOperacional.Desligado);
  private readonly sistemaCombustivel = new SistemaOperacional('combustível', EstadoOperacional.Desligado);
  private readonly sistemaControle = new SistemaOperacional('controle', EstadoOperacional.Desligado);
  private readonly sistemas = new GerenciadorDeSistemas([this.sistemaEletrico, this.sistemaHidraulico, this.sistemaCombustivel, this.sistemaControle]);
  public constructor(private readonly definicaoPropulsor: DefinicaoPropulsor) {
    super(definicaoPropulsor);
    if (definicaoPropulsor.empuxoMaximoN <= 0 || definicaoPropulsor.vazaoMaximaKgS <= 0 || !definicaoPropulsor.propelenteCompativel) throw new Error('Definição de propulsor inválida.');
  }
  public get empuxoAtualN(): number { return this.empuxoAtualCalculadoN; }
  public get vazaoAtualKgS(): number { return this.vazaoAtualCalculadaKgS; }
  public get throttleAtual(): number { return this.throttle; }
  public get bloqueios(): readonly string[] { return this.sistemas.motivosDeBloqueio(); }
  public get estaIgnitado(): boolean { return this.ignicaoConfirmada; }
  public get mangueiraEstaRompida(): boolean { return this.mangueiraRompida; }
  public get tanqueConectado(): TanquePropelente | undefined { return this.tanque; }
  public get diagnosticoOperacional(): readonly string[] {
    const motivos = [...this.sistemas.motivosDeBloqueio()];
    if (!this.tanque) motivos.push('tanque não conectado');
    else if (this.tanque.massaPropelenteKg === 0) motivos.push('sem propelente');
    if (this.mangueiraRompida) motivos.push('mangueira rompida');
    if (this.throttle === 0) motivos.push('throttle em zero');
    if (!this.ignicaoConfirmada) motivos.push('ignição não realizada');
    if (this.ultimaNegacaoDeComando) motivos.push(this.ultimaNegacaoDeComando);
    return motivos;
  }
  /** Consulta encapsulada; não expõe a instância mutável do sistema interno. */
  public obterEstadoDoSistema(id: IdSistemaPropulsor): EstadoOperacional {
    return this.obterSistema(id).estado;
  }
  public sistemaEstaOperacional(id: IdSistemaPropulsor): boolean {
    return this.obterSistema(id).operacional;
  }
  public conectarTanque(tanque: TanquePropelente, comprimentoMaxMangueiraM = 10): void {
    if (tanque.tipoPropelente !== this.definicaoPropulsor.propelenteCompativel) throw new Error('Propelente incompatível.');
    if (!Number.isFinite(comprimentoMaxMangueiraM) || comprimentoMaxMangueiraM <= 0) throw new Error('Comprimento de mangueira inválido.');
    this.tanque = tanque;
    this.comprimentoMaxMangueiraM = comprimentoMaxMangueiraM;
    this.mangueiraRompida = false;
  }
  public definirThrottle(throttle: number): void {
    if (!Number.isFinite(throttle) || throttle < 0 || throttle > 1) throw new Error('Throttle deve estar entre 0 e 1.');
    this.throttle = throttle;
  }
  /**
   * Liga um subsistema somente após o estágio anterior. A coordenação de missão
   * pode chamar esta API em sequência; a bancada a expõe para manutenção.
   */
  public ligarSistema(id: IdSistemaPropulsor): boolean {
    const sistema = this.obterSistema(id);
    if (sistema.operacional) return true;
    if (id === 'combustível' && this.mangueiraRompida) {
      this.ultimaNegacaoDeComando = 'não é possível ligar combustível: mangueira rompida';
      return false;
    }
    const dependencia = this.dependenciaDePartida(id);
    if (dependencia && !this.obterSistema(dependencia).operacional) {
      this.ultimaNegacaoDeComando = `não é possível ligar ${id}: ${dependencia} não está operacional`;
      return false;
    }
    sistema.definirEstado(EstadoOperacional.Operacional);
    this.ultimaNegacaoDeComando = undefined;
    return true;
  }
  /** Comando operacional de parada solicitado por um controlador ou operador. */
  public desligarSistema(id: IdSistemaPropulsor): void {
    this.definirEstadoDoSistema(id, EstadoOperacional.Desligado);
  }
  /** Uma parada, falha ou degradação cancela a ignição vigente. */
  public definirEstadoDoSistema(id: IdSistemaPropulsor, estado: EstadoOperacional): void {
    this.obterSistema(id).definirEstado(estado);
    if (estado !== EstadoOperacional.Operacional) {
      this.desligarDependentesDe(id);
      this.ignicaoConfirmada = false;
    }
  }
  /** Confirma uma nova ignição depois que todos os permissivos estão válidos. */
  public solicitarIgnicao(): boolean {
    if (!this.sistemas.operacaoAutorizada()) {
      this.ultimaNegacaoDeComando = 'ignição bloqueada: sistemas obrigatórios indisponíveis';
      return false;
    }
    if (!this.tanque || this.tanque.massaPropelenteKg === 0 || this.mangueiraRompida) {
      this.ultimaNegacaoDeComando = 'ignição bloqueada: alimentação de propelente indisponível';
      return false;
    }
    this.ignicaoConfirmada = true;
    this.ultimaNegacaoDeComando = undefined;
    return true;
  }
  public override prepararPassoOperacional(dtS: number): void {
    this.empuxoAtualCalculadoN = 0;
    this.vazaoAtualCalculadaKgS = 0;
    // Uma falha observada pelo core invalida a ignição e derruba os estágios
    // posteriores, inclusive quando a falha vier de uma integração externa.
    this.propagarIndisponibilidades();
    if (!this.sistemas.operacaoAutorizada()) this.ignicaoConfirmada = false;
    if (!this.ignicaoConfirmada || !this.tanque || this.throttle === 0) return;
    if (this.mangueiraRompida || this.distanciaAoTanqueM() > this.comprimentoMaxMangueiraM) {
      this.mangueiraRompida = true;
      // A alimentação física foi perdida: combustível deixa de estar
      // operacional e a cadeia dependente é interrompida imediatamente.
      this.definirEstadoDoSistema('combustível', EstadoOperacional.Desligado);
      return;
    }
    const massaNecessariaKg = this.throttle * this.definicaoPropulsor.vazaoMaximaKgS * dtS;
    const massaFornecidaKg = this.tanque.fornecerPropelente(massaNecessariaKg);
    this.empuxoAtualCalculadoN = this.definicaoPropulsor.empuxoMaximoN * this.throttle * (massaNecessariaKg === 0 ? 0 : massaFornecidaKg / massaNecessariaKg);
    this.vazaoAtualCalculadaKgS = massaFornecidaKg / dtS;
  }
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    if (this.empuxoAtualCalculadoN === 0) return [];
    const angulo = this.getEstadoFisico().orientacaoRad.z;
    return [{ forcaN: new Vetor3(Math.cos(angulo) * this.empuxoAtualCalculadoN, Math.sin(angulo) * this.empuxoAtualCalculadoN, 0) }];
  }

  private distanciaAoTanqueM(): number {
    if (!this.tanque) return Number.POSITIVE_INFINITY;
    return this.getEstadoFisico().posicaoM.subtrair(this.tanque.getEstadoFisico().posicaoM).magnitude;
  }
  private obterSistema(id: IdSistemaPropulsor): SistemaOperacional {
    return {
      'elétrico': this.sistemaEletrico,
      'hidráulico': this.sistemaHidraulico,
      'combustível': this.sistemaCombustivel,
      controle: this.sistemaControle,
    }[id];
  }
  private dependenciaDePartida(id: IdSistemaPropulsor): IdSistemaPropulsor | undefined {
    return {
      'elétrico': undefined,
      'hidráulico': 'elétrico',
      'combustível': 'hidráulico',
      controle: 'combustível',
    }[id];
  }
  private desligarDependentesDe(id: IdSistemaPropulsor): void {
    const sequencia: readonly IdSistemaPropulsor[] = ['elétrico', 'hidráulico', 'combustível', 'controle'];
    const indice = sequencia.indexOf(id);
    for (const dependente of sequencia.slice(indice + 1)) {
      this.obterSistema(dependente).definirEstado(EstadoOperacional.Desligado);
    }
  }
  private propagarIndisponibilidades(): void {
    const sequencia: readonly IdSistemaPropulsor[] = ['hidráulico', 'combustível', 'controle'];
    for (const id of sequencia) {
      const dependencia = this.dependenciaDePartida(id);
      if (dependencia && !this.obterSistema(dependencia).operacional) {
        this.obterSistema(id).definirEstado(EstadoOperacional.Desligado);
      }
    }
  }
}
