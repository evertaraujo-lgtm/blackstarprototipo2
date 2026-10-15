import { CampoCentral, CampoUniforme, TERRA, type CampoGravitacional } from './CampoGravitacional';
import { ReferencialEsferico, ReferencialPlano, type ReferencialFisico } from './ReferencialFisico';
import { Vetor3 } from '../Vetor3';

/** Combina campo e geometria coerentes. Rotação planetária ainda não implementada. */
export interface AmbienteFisico {
  readonly campo: CampoGravitacional;
  readonly referencial: ReferencialFisico;
  obterConfiguracao(): object;
}
export class AmbientePlano implements AmbienteFisico {
  public readonly campo = new CampoUniforme();
  public readonly referencial = new ReferencialPlano();
  /** Identifica modelo legado plano-m8, plano XY, rotação nula e configuração do campo para distinguir revisões físicas em replay. @contract f-ebfc7a954a604a55 @reviewed M12-DOC: implementação lida. */
  public obterConfiguracao(): object { return { revisao: 'plano-m8', plano: 'XY', rotacaoRadps: 0, campo: this.campo.obterConfiguracao() }; }
}
export class AmbienteTerrestre implements AmbienteFisico {
  public readonly campo: CampoCentral;
  public readonly referencial: ReferencialEsferico;
  /** Cria campo central e referencial esférico compartilhando centro terrestre; rejeita centro fora de XY e mantém planeta sem rotação. @contract f-f569648fe3d1f712 @reviewed M12-DOC: implementação lida. */
  public constructor(centroM = new Vetor3(0, -TERRA.raioM, 0)) {
    if (centroM.z !== 0) throw new Error('Terra central restrita ao plano XY.');
    this.campo = new CampoCentral(centroM);
    this.referencial = new ReferencialEsferico(centroM);
  }
  /** Expõe revisão M9, raio, campo e g0 de referência de Isp; não confunde g0 com gravidade superficial calculada. Rotação permanece zero. @contract f-39460d33143e6426 @reviewed M12-DOC: implementação lida. */
  public obterConfiguracao(): object {
    return { revisao: 'terra-esferica-m9', plano: 'XY', rotacaoRadps: 0, raioM: this.referencial.raioM,
      g0ReferenciaIspMps2: TERRA.g0Mps2, campo: this.campo.obterConfiguracao() };
  }
}
