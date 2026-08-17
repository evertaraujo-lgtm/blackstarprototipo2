import type { ForcaFisicaSolicitada } from '../base/Objeto';
import { Vetor3 } from '../../Vetor3';
import { Propulsor, type DefinicaoPropulsor } from './Propulsor';
import { AtuadorVetorizacao } from './vetorizacao/AtuadorVetorizacao';
import type { DefinicaoSistemaVetorizacao, EstadoVetorizacao, ICapacidadeVetorizacao } from './vetorizacao/InterfacesVetorizacao';

export interface DefinicaoPropulsorVetorizado extends DefinicaoPropulsor {
  readonly vetorizacao: DefinicaoSistemaVetorizacao;
}

/** Propulsor com bocal gimbaled e mecanismo de atuação independente. */
export class PropulsorVetorizado extends Propulsor implements ICapacidadeVetorizacao {
  private readonly atuadorVetorizacao: AtuadorVetorizacao;

  public constructor(definicao: DefinicaoPropulsorVetorizado) {
    super(definicao);
    this.atuadorVetorizacao = new AtuadorVetorizacao(definicao.vetorizacao);
  }

  public solicitarVetorizacao(anguloAlvoRad: number): boolean {
    return this.atuadorVetorizacao.solicitar({ anguloAlvoRad });
  }

  public obterEstadoDaVetorizacao(): EstadoVetorizacao {
    return this.atuadorVetorizacao.obterEstado();
  }

  public override prepararPassoOperacional(dtS: number): void {
    super.prepararPassoOperacional(dtS);
    const sistemasDaVetorizacaoDisponiveis = this.sistemaEstaOperacional('elétrico') &&
      this.sistemaEstaOperacional('hidráulico') && this.sistemaEstaOperacional('controle');
    this.atuadorVetorizacao.avancar(dtS, sistemasDaVetorizacaoDisponiveis);
  }

  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    if (this.empuxoAtualN === 0) return [];
    const angulo = this.getEstadoFisico().orientacaoRad.z + this.atuadorVetorizacao.obterEstado().anguloAtualRad;
    return [{ forcaN: new Vetor3(Math.cos(angulo) * this.empuxoAtualN, Math.sin(angulo) * this.empuxoAtualN, 0) }];
  }
}
