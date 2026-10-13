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
  public obterConfiguracao(): object { return { revisao: 'plano-m8', plano: 'XY', rotacaoRadps: 0, campo: this.campo.obterConfiguracao() }; }
}
export class AmbienteTerrestre implements AmbienteFisico {
  public readonly campo: CampoCentral;
  public readonly referencial: ReferencialEsferico;
  public constructor(centroM = new Vetor3(0, -TERRA.raioM, 0)) {
    if (centroM.z !== 0) throw new Error('Terra central restrita ao plano XY.');
    this.campo = new CampoCentral(centroM);
    this.referencial = new ReferencialEsferico(centroM);
  }
  public obterConfiguracao(): object {
    return { revisao: 'terra-esferica-m9', plano: 'XY', rotacaoRadps: 0, raioM: this.referencial.raioM,
      g0ReferenciaIspMps2: TERRA.g0Mps2, campo: this.campo.obterConfiguracao() };
  }
}
