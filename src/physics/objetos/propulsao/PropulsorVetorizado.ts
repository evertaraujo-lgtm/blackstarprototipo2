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

  /** Compõe motor físico e atuador de vetorização configurado; não duplica controle de gimbal. @contract f-77abc1442947b6a6 @reviewed M12-DOC: implementação lida. */
  public constructor(definicao: DefinicaoPropulsorVetorizado) {
    super(definicao);
    this.atuadorVetorizacao = new AtuadorVetorizacao(definicao.vetorizacao);
  }

  /** Envia alvo em rad à porta do atuador e devolve aceitação; posição real não é instantânea. @contract f-17ecfb9e1dbd23da @reviewed M12-DOC: implementação lida. */
  public solicitarVetorizacao(anguloAlvoRad: number): boolean {
    return this.atuadorVetorizacao.solicitar({ anguloAlvoRad });
  }

  /** Consulta snapshot operacional do atuador real de gimbal. @contract f-cc6b5f6a31ccfd7c @reviewed M12-DOC: implementação lida. */
  public obterEstadoDaVetorizacao(): EstadoVetorizacao {
    return this.atuadorVetorizacao.obterEstado();
  }

  /** Injeção de travamento mecânico para ensaios de contingência.
   * @contract f-5ce2f30c9412cad9
   */
  public injetarFalhaNoAtuadorDeVetorizacao(): void { this.atuadorVetorizacao.injetarFalhaMecanica(); }

  /** Prepara propulsão base e avança atuador por dtS em s, condicionado aos sistemas elétrico/hidráulico/controle reais. @contract f-063b680dce0c060c @reviewed M12-DOC: implementação lida. */
  public override prepararPassoOperacional(dtS: number): void {
    super.prepararPassoOperacional(dtS);
    const sistemasDaVetorizacaoDisponiveis = this.sistemaEstaOperacional('elétrico') &&
      this.sistemaEstaOperacional('hidráulico') && this.sistemaEstaOperacional('controle');
    this.atuadorVetorizacao.avancar(dtS, sistemasDaVetorizacaoDisponiveis);
  }

  /** Orienta empuxo N pela soma da atitude física Z e ângulo efetivamente atingido pelo gimbal; zero empuxo devolve lista vazia. @contract f-4cf1126ded73450f @reviewed M12-DOC: implementação lida. */
  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    if (this.empuxoAtualN === 0) return [];
    const angulo = this.getEstadoFisico().orientacaoRad.z + this.atuadorVetorizacao.obterEstado().anguloAtualRad;
    return [{ forcaN: new Vetor3(Math.cos(angulo) * this.empuxoAtualN, Math.sin(angulo) * this.empuxoAtualN, 0) }];
  }
}
