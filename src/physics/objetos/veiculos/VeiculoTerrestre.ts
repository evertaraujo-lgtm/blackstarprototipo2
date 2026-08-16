import { Objeto, type DefinicaoObjeto, type ForcaFisicaSolicitada } from '../base/Objeto';
import { Vetor3 } from '../../Vetor3';

export interface DefinicaoVeiculoTerrestre extends DefinicaoObjeto {
  /** Quantidade de rodas que compartilham a aderência disponível. */
  readonly quantidadeRodas: number;
  /** Força longitudinal máxima que o conjunto motriz pode solicitar, em N. */
  readonly forcaTracaoMaximaN: number;
  /** Força longitudinal máxima dos freios, em N. */
  readonly forcaFrenagemMaximaN: number;
  /** Coeficiente de aderência pneu-solo usado para limitar tração e frenagem. */
  readonly coeficienteAderenciaPneus: number;
  /** Resistência ao rolamento aplicada pelo contato das rodas (0 a 1). */
  readonly coeficienteResistenciaRolamento?: number;
  /** Raio físico de cada roda, em m. */
  readonly raioRodaM?: number;
  /** Distância entre os eixos dianteiro e traseiro, em m. */
  readonly distanciaEntreEixosM?: number;
  /** Altura do chassi visível acima das rodas, em m. */
  readonly alturaChassiM?: number;
}

/**
 * Veículo terrestre de primeira ordem: as rodas convertem os comandos em uma
 * força longitudinal limitada pela aderência. A dinâmica rotacional individual
 * das rodas será um componente posterior; a resultante é aplicada ao chassi
 * no centro de massa para não inventar torque sem esse modelo de transmissão.
 */
export class VeiculoTerrestre extends Objeto {
  private comandoTracao = 0;
  private comandoFreio = 0;
  private rodasApoiadasPeloCore = false;

  public constructor(private readonly definicaoVeiculo: DefinicaoVeiculoTerrestre) {
    super(definicaoVeiculo);
    if (!Number.isInteger(definicaoVeiculo.quantidadeRodas) || definicaoVeiculo.quantidadeRodas < 2) {
      throw new Error('Veículo terrestre precisa de pelo menos duas rodas.');
    }
    for (const valor of [definicaoVeiculo.forcaTracaoMaximaN, definicaoVeiculo.forcaFrenagemMaximaN]) {
      if (!Number.isFinite(valor) || valor <= 0) throw new Error('Forças máximas devem ser finitas e positivas.');
    }
    if (!Number.isFinite(definicaoVeiculo.coeficienteAderenciaPneus) || definicaoVeiculo.coeficienteAderenciaPneus <= 0) {
      throw new Error('Aderência dos pneus deve ser finita e positiva.');
    }
    const resistenciaRolamento = definicaoVeiculo.coeficienteResistenciaRolamento ?? 0.015;
    if (!Number.isFinite(resistenciaRolamento) || resistenciaRolamento < 0 || resistenciaRolamento > 1) {
      throw new Error('Resistência ao rolamento deve estar entre 0 e 1.');
    }
    const raioRodaM = definicaoVeiculo.raioRodaM ?? 0.35;
    const distanciaEntreEixosM = definicaoVeiculo.distanciaEntreEixosM ?? definicaoVeiculo.dimensoesM.x * 0.6;
    if (!Number.isFinite(raioRodaM) || raioRodaM <= 0 || raioRodaM > definicaoVeiculo.dimensoesM.y / 2) {
      throw new Error('Raio da roda deve ser positivo e caber na geometria do veículo.');
    }
    if (!Number.isFinite(distanciaEntreEixosM) || distanciaEntreEixosM <= 0 || distanciaEntreEixosM > definicaoVeiculo.dimensoesM.x) {
      throw new Error('Distância entre eixos deve ser positiva e caber no veículo.');
    }
    const alturaChassiM = definicaoVeiculo.alturaChassiM ?? definicaoVeiculo.dimensoesM.y - (2 * raioRodaM);
    if (!Number.isFinite(alturaChassiM) || alturaChassiM <= 0 || alturaChassiM > definicaoVeiculo.dimensoesM.y - (2 * raioRodaM) + 1e-9) {
      throw new Error('Chassi deve caber acima das rodas.');
    }
  }

  public get quantidadeRodas(): number { return this.definicaoVeiculo.quantidadeRodas; }
  public get raioRodaM(): number { return this.definicaoVeiculo.raioRodaM ?? 0.35; }
  public get alturaChassiM(): number { return this.definicaoVeiculo.alturaChassiM ?? this.dimensoesM.y - (2 * this.raioRodaM); }

  /**
   * Centros das rodas no referencial físico do chassi. Como a caixa do veículo
   * representa seu envelope total, o ponto inferior da roda fica em y = -h/2:
   * quando o veículo está apoiado, a roda toca o solo por tangência, não pelo
   * centro de massa.
   */
  public getPosicoesRodasLocaisM(): readonly Vetor3[] {
    const semiEntreEixosM = (this.definicaoVeiculo.distanciaEntreEixosM ?? this.dimensoesM.x * 0.6) / 2;
    const alturaCentroRodaM = (-this.dimensoesM.y / 2) + this.raioRodaM;
    return [
      new Vetor3(-semiEntreEixosM, alturaCentroRodaM, 0),
      new Vetor3(semiEntreEixosM, alturaCentroRodaM, 0),
    ];
  }

  /** Centro local do chassi; sua face inferior deixa vão livre sob o assoalho. */
  public getCentroChassiLocalM(): Vetor3 {
    return new Vetor3(0, (this.dimensoesM.y / 2) - (this.alturaChassiM / 2), 0);
  }

  /**
   * Pontos físicos que podem tocar uma superfície: perímetro das rodas e
   * cantos do chassi. Assim o veículo apoia nas rodas quando está em pé, mas
   * o chassi também bloqueia o solo se ele tombar ou ficar invertido.
   */
  public override getPontosDeContatoLocaisM(): readonly Vetor3[] {
    const semiEntreEixosM = (this.definicaoVeiculo.distanciaEntreEixosM ?? this.dimensoesM.x * 0.6) / 2;
    const pontos: Vetor3[] = [];
    const centroChassi = this.getCentroChassiLocalM();
    const metadeChassiX = this.dimensoesM.x / 2;
    const metadeChassiY = this.alturaChassiM / 2;
    const metadeZ = this.dimensoesM.z / 2;
    for (const x of [-metadeChassiX, metadeChassiX]) {
      for (const y of [-metadeChassiY, metadeChassiY]) {
        for (const z of [-metadeZ, metadeZ]) pontos.push(new Vetor3(x, centroChassi.y + y, z));
      }
    }
    for (const centroRoda of this.getPosicoesRodasLocaisM()) {
      for (let indice = 0; indice < 12; indice += 1) {
        const angulo = (indice / 12) * Math.PI * 2;
        pontos.push(new Vetor3(
          centroRoda.x + (this.raioRodaM * Math.cos(angulo)),
          centroRoda.y + (this.raioRodaM * Math.sin(angulo)),
          0,
        ));
      }
    }
    return pontos;
  }

  public override getPontosDeTracaoLocaisM(): readonly Vetor3[] {
    const semiEntreEixosM = (this.definicaoVeiculo.distanciaEntreEixosM ?? this.dimensoesM.x * 0.6) / 2;
    const alturaTangenciaM = -this.dimensoesM.y / 2;
    return [new Vetor3(-semiEntreEixosM, alturaTangenciaM, 0), new Vetor3(semiEntreEixosM, alturaTangenciaM, 0)];
  }

  public override atualizarContatoDeTracaoPeloCore(apoiado: boolean): void {
    this.rodasApoiadasPeloCore = apoiado;
  }

  public override getCoeficienteAtritoDeContato(): number {
    return this.definicaoVeiculo.coeficienteResistenciaRolamento ?? 0.015;
  }

  /** Comando normalizado: -1 ré, 0 neutro, +1 tração para a frente. */
  public definirComandoTracao(comando: number): void {
    this.comandoTracao = this.validarComando(comando, 'Tração');
  }

  /** Comando normalizado: 0 livre, +1 força máxima de frenagem. */
  public definirComandoFreio(comando: number): void {
    if (!Number.isFinite(comando) || comando < 0 || comando > 1) throw new Error('Freio deve estar entre 0 e 1.');
    this.comandoFreio = comando;
  }

  public override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] {
    if (!this.rodasApoiadasPeloCore) return [];
    const estado = this.getEstadoFisico();
    const direcaoLongitudinal = new Vetor3(Math.cos(estado.orientacaoRad.z), Math.sin(estado.orientacaoRad.z), 0);
    const velocidadeLongitudinal = estado.velocidadeMps.produtoEscalar(direcaoLongitudinal);
    const limiteAderenciaN = this.definicaoVeiculo.coeficienteAderenciaPneus * this.massaKg * 9.80665;
    const forcaTracaoN = Math.min(
      Math.abs(this.comandoTracao) * this.definicaoVeiculo.forcaTracaoMaximaN,
      limiteAderenciaN,
    ) * Math.sign(this.comandoTracao);
    const solicitacoes: ForcaFisicaSolicitada[] = [];
    if (forcaTracaoN !== 0) solicitacoes.push({ forcaN: direcaoLongitudinal.multiplicar(forcaTracaoN) });

    if (this.comandoFreio > 0 && Math.abs(velocidadeLongitudinal) > 1e-6) {
      const forcaFreioN = Math.min(
        this.comandoFreio * this.definicaoVeiculo.forcaFrenagemMaximaN,
        limiteAderenciaN,
      );
      solicitacoes.push({ forcaN: direcaoLongitudinal.multiplicar(-Math.sign(velocidadeLongitudinal) * forcaFreioN) });
    }
    return solicitacoes;
  }

  private validarComando(comando: number, nome: string): number {
    if (!Number.isFinite(comando) || comando < -1 || comando > 1) throw new Error(`${nome} deve estar entre -1 e 1.`);
    return comando;
  }
}
