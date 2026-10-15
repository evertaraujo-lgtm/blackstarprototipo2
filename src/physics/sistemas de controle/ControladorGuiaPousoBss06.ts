import type { AletaAerodinamica } from '../objetos/componentes/AletaAerodinamica';
import type { EstadoVetorizacao } from '../objetos/propulsao/vetorizacao/InterfacesVetorizacao';
import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import type { ControladorDeVoo, SolicitacaoDeAtuador } from './GerenciadorDeControladores';
import { Vetor3 } from '../Vetor3';
import { ControladorAletasAerodinamicas } from './ControladorAletasAerodinamicas';

export interface LeiturasGuiaPousoBss06 {
  readonly gravidadeLocalMps2?: number;
  readonly erroHorizontalM: number;
  readonly velocidadeHorizontalMps: number;
  readonly velocidadeVerticalMps: number;
  readonly orientacaoRad: number;
  readonly velocidadeAngularRadps: number;
  readonly massaKg: number;
  readonly empuxoN: number;
  readonly densidadeArKgM3: number;
  readonly velocidadeArMps: Vetor3;
  readonly emModoPouso?: boolean;
  readonly atuadoresConectados?: boolean;
  readonly forcaAerodinamicaXN?: number;
  readonly torqueAerodinamicoNm?: number;
  /** Braço real do motor em relação ao CM, no referencial do casco. */
  readonly bracoPropulsorLocalM?: Vetor3;
}

/** Somente leitura do motor; o comando passa pelo ComputadorDeVoo. */
export interface MotorDaGuiaPouso {
  readonly id: string;
  /** Consulta posição/limites reais do gimbal para arbitragem da guiagem; não amplia curso disponível. @contract f-51e931aaa927f1e1 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  obterEstadoDaVetorizacao(): EstadoVetorizacao;
}

export interface DiagnosticoGuiaPouso {
  readonly fase: 'inativo' | 'sem-energia' | 'aguardando-descida' | 'descida' | 'sem-vinculo';
  readonly atitudeAlvoRad: number;
  readonly aceleracaoHorizontalAlvoMps2: number;
  readonly empuxoDisponivelN: number;
  readonly pressaoDinamicaPa: number;
  readonly gimbalSolicitadoRad: number;
  readonly gimbalSaturado: boolean;
  readonly compensacaoGimbalRad: number;
  readonly torqueNaoCompensavel: boolean;
}

/** Guiagem planar idealizada. Não comanda throttle, ignição ou estado cinemático. */
export class ControladorGuiaPousoBss06 implements ControladorDeVoo {
  public readonly id = 'guia-pouso-bss06';
  public readonly prioridade = 95;
  private habilitado = false;
  private readonly controladorAletas: ControladorAletasAerodinamicas | undefined;
  private diagnostico: DiagnosticoGuiaPouso = {
    fase: 'inativo', atitudeAlvoRad: 0, aceleracaoHorizontalAlvoMps2: 0,
    empuxoDisponivelN: 0, pressaoDinamicaPa: 0, gimbalSolicitadoRad: 0, gimbalSaturado: false,
    compensacaoGimbalRad: 0, torqueNaoCompensavel: false,
  };

  /** Instala portas de motor, energia/contexto e opcionalmente controlador de aletas; não recebe veículo proprietário nem mundo mutável. @contract f-cc3f9e6d3cd57988 @reviewed M12-DOC: implementação lida. */
  public constructor(
    aletas: readonly AletaAerodinamica[],
    private readonly propulsor: MotorDaGuiaPouso,
    private readonly estaEnergizado: /** Consulta permissivo elétrico/controle antes de calcular/aplicar solicitações do controlador; seleção operacional continua separada da alimentação. @contract f-00969ae47719ec4b @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => boolean,
    private readonly obterContexto?: /** Consulta medidas de navegação e estado operacional da guiagem em SI/referencial local; sem acesso à instância proprietária. @contract f-5d05b87f7f7f573e @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => LeiturasGuiaPousoBss06,
  ) {
    this.controladorAletas = aletas.length > 0 ? new ControladorAletasAerodinamicas(aletas, estaEnergizado) : undefined;
  }

  /** Habilita solicitação operacional da guiagem. @contract f-88fe6289aea954f3 @reviewed M12-DOC: implementação lida. */
  public habilitar(): void { this.habilitado = true; }
  /** Desabilita e atualiza diagnóstico para inativo, sem zerar cinemática. @contract f-ceab21d5a6777c34 @reviewed M12-DOC: implementação lida. */
  public desabilitar(): void { this.habilitado = false; this.diagnostico = { ...this.diagnostico, fase: 'inativo' }; }
  /** Consulta seleção da guiagem. @contract f-87de5d7357709989 @reviewed M12-DOC: implementação lida. */
  public get estaHabilitado(): boolean { return this.habilitado; }
  /** Devolve cópia do diagnóstico, indicando sem-energia se habilitado e alimentação ausente. @contract f-df2de99f27f0f356 @reviewed M12-DOC: implementação lida. */
  public obterDiagnostico(): DiagnosticoGuiaPouso {
    return { ...this.diagnostico, ...(!this.estaEnergizado() && this.habilitado ? { fase: 'sem-energia' as const } : {}) };
  }

  /** Valida dtS s positivo/finito e substitui no contexto velocidades/atitude/taxa/massa/gravidade pelas leituras de sensores; sem fornecedor de contexto retorna lista vazia. @contract f-6500dc6bdf403411 @reviewed M12-DOC: implementação lida. */
  public calcularSolicitacoes(leituras: LeiturasVeiculoComposto, dtS: number): readonly SolicitacaoDeAtuador[] {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo de guiagem inválido.');
    if (!this.obterContexto) return [];
    const contexto = this.obterContexto();
    return this.atualizar({ ...contexto,
      velocidadeHorizontalMps: leituras.velocidadeHorizontalMps,
      velocidadeVerticalMps: leituras.velocidadeVerticalMps,
      orientacaoRad: leituras.inclinacaoRad,
      velocidadeAngularRadps: leituras.velocidadeAngularRadps ?? contexto.velocidadeAngularRadps,
      massaKg: leituras.massaInstantaneaKg ?? contexto.massaKg,
      gravidadeLocalMps2: leituras.gravidadeLocalMps2 ?? contexto.gravidadeLocalMps2,
    });
  }

  /** Produz solicitações; nunca escreve no motor fora da arbitragem.
   * @remarks Valida medidas SI, exige energia/vínculo/modo-descida; solicita gimbal a partir de erro lateral e atitude, compensando torque aerodinâmico pelo braço real do motor. Escala aletas pela pressão dinâmica. Atualiza diagnóstico de saturação/autoridade; throttle e ignição ficam fora desta guia.
   * @contract f-a20a72f46b4b979e
   * @reviewed M12-DOC: contrato confrontado com implementação.
   */
  public atualizar(leituras: LeiturasGuiaPousoBss06): readonly SolicitacaoDeAtuador[] {
    const valores = [leituras.erroHorizontalM, leituras.velocidadeHorizontalMps, leituras.velocidadeVerticalMps,
      leituras.orientacaoRad, leituras.velocidadeAngularRadps, leituras.massaKg, leituras.empuxoN, leituras.densidadeArKgM3,
      leituras.forcaAerodinamicaXN ?? 0, leituras.torqueAerodinamicoNm ?? 0, leituras.gravidadeLocalMps2 ?? 9.80665];
    if (!valores.every(Number.isFinite) || leituras.massaKg <= 0 || leituras.empuxoN < 0 || leituras.densidadeArKgM3 < 0 || (leituras.gravidadeLocalMps2 ?? 9.80665) < 0) {
      throw new Error('Leituras de guia do BSS-006 devem ser finitas e fisicamente válidas.');
    }
    if (!this.habilitado || !this.estaEnergizado() || leituras.atuadoresConectados === false) {
      this.diagnostico = { ...this.diagnostico,
        fase: !this.habilitado ? 'inativo' : !this.estaEnergizado() ? 'sem-energia' : 'sem-vinculo',
        gimbalSolicitadoRad: 0, gimbalSaturado: false,
      };
      return [];
    }
    if (leituras.emModoPouso === false || leituras.velocidadeVerticalMps >= -0.1) {
      this.controladorAletas?.atualizar(0, 0, 0);
      this.diagnostico = { ...this.diagnostico, fase: 'aguardando-descida', gimbalSolicitadoRad: 0, gimbalSaturado: false };
      return [];
    }

    const velocidadeLateralAlvoMps = limitar(leituras.erroHorizontalM * 0.12 - leituras.velocidadeHorizontalMps * 1.4, -18, 18);
    const aceleracaoHorizontalAlvoMps2 = limitar(velocidadeLateralAlvoMps * 0.18, -3, 3);
    // F_x = -T sin(theta + delta). Peso é apenas escala da referência quando
    // T é pequeno; empuxoDisponivelN continua sendo o T real, inclusive zero.
    // O gimbal inferior corrige atitude: delta positivo gera torque negativo.
    const escalaReferenciaN = Math.max(leituras.empuxoN, leituras.massaKg * (leituras.gravidadeLocalMps2 ?? 9.80665), 1);
    const razaoEmpuxo = limitar((aceleracaoHorizontalAlvoMps2 * leituras.massaKg
      - (leituras.forcaAerodinamicaXN ?? 0)) / escalaReferenciaN, -0.25, 0.25);
    const gimbal = this.propulsor.obterEstadoDaVetorizacao();
    const braco = leituras.bracoPropulsorLocalM;
    let compensacaoGimbalRad = 0;
    let torqueNaoCompensavel = false;
    if (braco && braco.y < 0 && leituras.empuxoN > 0) {
      // tau_motor = T (rx cos(delta) + ry sin(delta)). Solução no ramo
      // próximo do neutro para equilibrar o torque aero no motor inferior.
      const razaoTorque = (leituras.torqueAerodinamicoNm ?? 0) / (leituras.empuxoN * Math.hypot(braco.x, braco.y));
      const deltaEquilibrio = Math.atan2(braco.x, -braco.y) + Math.asin(limitar(razaoTorque, -1, 1));
      compensacaoGimbalRad = limitar(deltaEquilibrio, -gimbal.limiteAngularRad, gimbal.limiteAngularRad);
      torqueNaoCompensavel = Math.abs(razaoTorque) > 1 || compensacaoGimbalRad !== deltaEquilibrio;
    }
    const atitudeAlvoRad = -Math.asin(razaoEmpuxo) - compensacaoGimbalRad;
    const diferencaRad = leituras.orientacaoRad - atitudeAlvoRad;
    const erroAtitudeRad = Math.atan2(Math.sin(diferencaRad), Math.cos(diferencaRad));
    const gimbalNaoLimitadoRad = compensacaoGimbalRad + erroAtitudeRad * 1.4 + leituras.velocidadeAngularRadps * 0.55;
    const comandoGimbalRad = limitar(gimbalNaoLimitadoRad, -gimbal.limiteAngularRad, gimbal.limiteAngularRad);

    const fluxo = new Vetor3(leituras.velocidadeHorizontalMps, leituras.velocidadeVerticalMps, 0).subtrair(leituras.velocidadeArMps);
    const pressaoDinamicaPa = 0.5 * leituras.densidadeArKgM3 * fluxo.magnitude ** 2;
    const pressaoReferenciaPa = 0.5 * 1.225 * 80 ** 2;
    const fatorPressaoDinamica = pressaoDinamicaPa === 0 ? 0 : Math.min(1, pressaoReferenciaPa / pressaoDinamicaPa);
    this.controladorAletas?.atualizar(
      erroAtitudeRad * fatorPressaoDinamica,
      leituras.velocidadeAngularRadps * fatorPressaoDinamica,
      fluxo.y,
    );
    this.diagnostico = { fase: 'descida', atitudeAlvoRad, aceleracaoHorizontalAlvoMps2,
      empuxoDisponivelN: leituras.empuxoN, pressaoDinamicaPa,
      gimbalSolicitadoRad: comandoGimbalRad, gimbalSaturado: comandoGimbalRad !== gimbalNaoLimitadoRad,
      compensacaoGimbalRad, torqueNaoCompensavel };
    return [{ idAtuador: this.propulsor.id, recurso: 'gimbal', valor: comandoGimbalRad }];
  }
}

/** Satura escalar em limites prescritos, preservando valor original quando já está no intervalo. @contract f-e6fdc5f6bb0c4775 @reviewed M12-DOC: implementação lida. */
const limitar = (valor: number, minimo: number, maximo: number): number => Math.max(minimo, Math.min(maximo, valor));
