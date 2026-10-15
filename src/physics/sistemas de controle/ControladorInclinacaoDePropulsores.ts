import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorInclinacaoPid } from './ControladorInclinacaoPid';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';

/** Adaptador do PID para os propulsores selecionados, sem conhecer o veículo. */
export class ControladorInclinacaoDePropulsores implements ControladorDeVoo {
  public readonly id = 'inclinacao';
  public readonly prioridade = 50;
  private readonly pid = new ControladorInclinacaoPid(2, 0.05, 0.2, Math.PI / 12);
  private idsPropulsores: readonly string[] = [];
  private ganhoAtitudePorVelocidadeHorizontalRadPorMps = 0;
  private ganhoAtitudeHorizontalAtual = 0;

  /** Copia seleção de ids sem atuar; validação de instalação/capacidade pertence ao computador de voo. @contract f-072ca5129fc83639 @reviewed M12-DOC: implementação lida. */
  public configurarAlvos(idsPropulsores: readonly string[]): void { this.idsPropulsores = [...idsPropulsores]; }
  /** Valida ganho rad/(m/s) não negativo finito e reinicia sua entrada gradual em zero; desaceleração lateral ocorre via atitude/gimbal, sem amortecimento físico imposto. @contract f-11f93b7258dcb4d2 @reviewed M12-DOC: implementação lida. */
  public configurarAmortecimentoHorizontal(ganhoAtitudeRadPorMps: number): void {
    if (!Number.isFinite(ganhoAtitudeRadPorMps) || ganhoAtitudeRadPorMps < 0) {
      throw new Error('Parâmetros inválidos para amortecer velocidade horizontal pelo gimbal.');
    }
    this.ganhoAtitudePorVelocidadeHorizontalRadPorMps = ganhoAtitudeRadPorMps;
    this.ganhoAtitudeHorizontalAtual = 0;
  }
  /** Zera ganho pedido e atual de correção lateral; não modifica velocidade. @contract f-b9a4b283f07fe632 @reviewed M12-DOC: implementação lida. */
  public desabilitarAmortecimentoHorizontal(): void {
    this.ganhoAtitudePorVelocidadeHorizontalRadPorMps = 0;
    this.ganhoAtitudeHorizontalAtual = 0;
  }
  /** Habilita PID de inclinação com sua reinicialização interna. @contract f-abfba32141fc1536 @reviewed M12-DOC: implementação lida. */
  public habilitar(): void { this.pid.habilitar(); }
  /** Desabilita PID e remove correção de velocidade horizontal. @contract f-589f4957014d754d @reviewed M12-DOC: implementação lida. */
  public desabilitar(): void { this.pid.desabilitar(); this.desabilitarAmortecimentoHorizontal(); }
  /** Devolve `this.pid.estaHabilitado`. Efeitos indiretos seguem as dependências chamadas. @contract f-fa83f1a20c6c8201 */
  public get estaHabilitado(): boolean { return this.pid.estaHabilitado; }
  /** Reinicia PID quando habilitado sem desmarcar controle. @contract f-4435f8deac06cd35 @reviewed M12-DOC: implementação lida. */
  public reiniciarMemoria(): void { if (this.estaHabilitado) this.pid.habilitar(); }

  /** Ajusta ganho lateral gradualmente à taxa 0,02 por s, usando-o somente na descida; normaliza erro angular e calcula pedidos de gimbal. Atualiza memória do ganho/PID, sem aplicar forças nem sobrescrever orientação. @contract f-fea52c1c911aa39c @reviewed M12-DOC: implementação lida. */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!this.estaHabilitado) return [];
    const descendo = leituras.velocidadeVerticalMps < 0;
    const ganhoAlvo = descendo ? this.ganhoAtitudePorVelocidadeHorizontalRadPorMps : 0;
    const variacaoGanhoMaxima = dtS * 0.02;
    this.ganhoAtitudeHorizontalAtual += Math.max(-variacaoGanhoMaxima,
      Math.min(variacaoGanhoMaxima, ganhoAlvo - this.ganhoAtitudeHorizontalAtual));
    // vx positivo pede atitude positiva (topo para -X, empuxo para -X).
    // O ganho entra gradualmente ao chavear para pouso.
    const erroComDerivaRad = leituras.inclinacaoRad
      - (descendo ? this.ganhoAtitudeHorizontalAtual * leituras.velocidadeHorizontalMps : 0);
    const erroRad = Math.atan2(Math.sin(erroComDerivaRad), Math.cos(erroComDerivaRad));
    const gimbalRad = this.pid.calcularComando(erroRad, dtS, leituras.velocidadeAngularRadps);
    return this.idsPropulsores.map((idAtuador) => ({ idAtuador, recurso: 'gimbal' as const, valor: gimbalRad }));
  }
}
