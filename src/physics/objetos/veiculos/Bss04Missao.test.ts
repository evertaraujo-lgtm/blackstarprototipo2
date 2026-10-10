import { describe, expect, it } from 'vitest';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { SuperficiePlano } from '../../SuperficiePlano';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { PropulsorVetorizado } from '../propulsao/PropulsorVetorizado';
import { criarPernasFixasBss04 } from './Bss04';
import { VeiculoComposto } from './VeiculoComposto';

describe('BSS-004 — pouso automático fuzzy-PID', () => {
  it('mantém o gimbal ativo, amortece a deriva horizontal e pousa suavemente', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const base = (id: string, massaBaseKg: number, dimensoesM: Vetor3, posicaoM: Vetor3) => ({
      id, massaBaseKg, dimensoesM, resistenciaColisaoJ: 1_000_000, limiteTermicoC: 1_000,
      estadoInicial: { posicaoM },
    });
    const nave = new VeiculoComposto({
      ...base('bss04-missao', 800, new Vetor3(3.2, 6, 2.4), new Vetor3(0, 4.8, 0)),
      estadoInicial: { posicaoM: new Vetor3(0, 4.8, 0), velocidadeMps: new Vetor3(5, 0, 0) },
      areaFrontalM2: 7, coeficienteArrasto: 0.65,
    });
    const bateria = new Bateria({
      ...base('bss04-bateria-missao', 30, new Vetor3(1.2, 0.8, 1), new Vetor3(0, 9, 0)),
      tensaoNominalV: 24, capacidadeEnergiaJ: 500_000, energiaInicialJ: 500_000,
    });
    const tanque = new TanquePropelente({
      ...base('bss04-tanque-missao', 120, new Vetor3(2, 1.5, 1.8), new Vetor3(0, 7, 0)),
      tipoPropelente: 'metano', capacidadePropelenteKg: 600, massaPropelenteInicialKg: 600,
    });
    const motor = new PropulsorVetorizado({
      ...base('bss04-motor-missao', 90, new Vetor3(1.6, 1.4, 1.4), new Vetor3(0, 1.1, 0)),
      estadoInicial: { posicaoM: new Vetor3(0, 1.1, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
      tensaoAlimentacaoNominalV: 24, potenciaEletricaMaximaW: 1_200,
      empuxoMaximoN: 40_000, vazaoMaximaKgS: 0.8, propelenteCompativel: 'metano',
      vetorizacao: { limiteAngularRad: 15 * Math.PI / 180, velocidadeAngularMaximaRadps: 90 * Math.PI / 180 },
    });
    motor.conectarTanque(tanque, 8);
    motor.conectarBateria(bateria, 8);
    const pernas = criarPernasFixasBss04(new Vetor3(0, 4.8, 0));
    const modulos = [bateria, tanque, motor, ...pernas];
    for (const modulo of modulos) nave.adicionarModulo(modulo);
    nave.instalarPropulsor(motor);
    for (const modulo of modulos) nave.adicionarFixador(new FixadorEstrutural({
      id: `fixador-${modulo.id}`, objetoA: nave, objetoB: modulo,
      resistenciaTracaoN: 1_000_000, resistenciaCompressaoN: 1_000_000,
      obterEsforcoSolicitadoN: () => motor.empuxoAtualN,
    }));
    mundo.registrarSuperficie(new SuperficiePlano('solo-bss04-missao', 'concreto', 0, 5_000_000, 0.3, 0.9));
    nave.registrarNoMundo(mundo);
    nave.habilitarControleDeInclinacao();
    const leituraMassaInicial = nave.obterLeiturasDoComputadorDeVoo().massaInstantaneaKg!;
    expect(leituraMassaInicial).toBeCloseTo(modulos.reduce((soma, modulo) => soma + modulo.massaKg, nave.massaKg), 6);

    expect(nave.solicitarIgnicaoDoPropulsor(motor.id).aceito).toBe(true);
    nave.definirThrottleDoPropulsor(motor.id, 0.65);
    while (nave.getEstadoFisico().posicaoM.y < 80 && mundo.tempoS < 30) mundo.avancar(0.1);
    expect(nave.getEstadoFisico().posicaoM.y, `vy=${nave.getEstadoFisico().velocidadeMps.y} throttle=${motor.throttleAtual} thrust=${motor.empuxoAtualN} angle=${nave.getEstadoFisico().orientacaoRad.z}`).toBeGreaterThanOrEqual(80);

    nave.habilitarControleDeDescidaFuzzyPid({
      altitudeAlvoM: 4.8, altitudeTransicaoM: 80,
      velocidadeDescidaMaximaMps: 12, velocidadeToqueMps: 0.35,
      empuxoMaximoN: motor.empuxoMaximoN, ganhoProporcionalThrottlePorMps: 0.09,
      ganhoIntegralThrottlePorM: 0.004, ganhoDerivativoThrottleSegundosPorM: 0.015,
      taxaMaximaThrottlePorS: 10, erroParaEmpuxoMaximoMps: 2,
    }, [motor.id]);
    expect(nave.controleDeInclinacaoEstaHabilitado).toBe(true);

    let passosEsperaQueda = 0;
    while (nave.obterLeiturasDosSensores().velocidadeVerticalMps > 0 && passosEsperaQueda < 1_000) {
      mundo.avancar(0.1);
      passosEsperaQueda += 1;
      if (nave.obterLeiturasDosSensores().velocidadeVerticalMps > 0) expect(motor.throttleAtual).toBe(0);
    }
    expect(passosEsperaQueda).toBeLessThan(1_000);
    const velocidadeHorizontalNoInicioDaDescidaMps = Math.abs(nave.getEstadoFisico().velocidadeMps.x);
    expect(velocidadeHorizontalNoInicioDaDescidaMps).toBeGreaterThan(1);

    let velocidadeDescidaMaximaMps = 0;
    let passosPouso = 0;
    const amostrasFinais: string[] = [];
    while (nave.getEstadoFisico().posicaoM.y > 4.85 && passosPouso < 6_000) {
      mundo.avancar(0.1);
      passosPouso += 1;
      velocidadeDescidaMaximaMps = Math.max(velocidadeDescidaMaximaMps, -nave.obterLeiturasDosSensores().velocidadeVerticalMps);
      const leitura = nave.obterLeiturasDosSensores();
      if (leitura.altitudeM < 12 && passosPouso % 2 === 0) {
        const comando = nave.obterUltimoComandoDeDescidaFuzzyPid();
        amostrasFinais.push(`h=${leitura.altitudeM.toFixed(2)} vy=${leitura.velocidadeVerticalMps.toFixed(2)} alvo=${comando.velocidadeVerticalAlvoMps.toFixed(2)} throttle=${motor.throttleAtual.toFixed(2)} thrust=${motor.empuxoAtualN.toFixed(0)} mass=${leitura.massaInstantaneaKg?.toFixed(0)} gimbal=${motor.obterEstadoDaVetorizacao().anguloAtualRad.toFixed(3)} angle=${motor.getEstadoFisico().orientacaoRad.z.toFixed(3)} broken=${nave.fixadoresEstruturais.some((fixador) => fixador.estaRompido)}`);
      }
    }

    const velocidadeNoToqueMps = nave.obterLeiturasDosSensores().velocidadeVerticalMps;
    expect(passosPouso).toBeLessThan(6_000);
    expect(velocidadeDescidaMaximaMps).toBeLessThan(15);
    expect(Math.abs(velocidadeNoToqueMps), amostrasFinais.join('\n')).toBeLessThanOrEqual(0.7);
    expect(Math.abs(nave.getEstadoFisico().velocidadeMps.x), amostrasFinais.join('\n'))
      .toBeLessThanOrEqual(Math.min(0.5, velocidadeHorizontalNoInicioDaDescidaMps * 0.1));
    expect(nave.controleDeInclinacaoEstaHabilitado).toBe(true);
    expect(Math.min(...[nave, ...modulos].map((objeto) => objeto.integridadeEstrutural))).toBe(1);
    expect(nave.fixadoresEstruturais.every((fixador) => !fixador.estaRompido)).toBe(true);
    expect(nave.obterLeiturasDoComputadorDeVoo().massaInstantaneaKg).toBeLessThan(leituraMassaInicial);
    expect(motor.getEstadoFisico().posicaoM.y - motor.dimensoesM.x / 2).toBeGreaterThan(0.15);
  }, 90_000);
});
