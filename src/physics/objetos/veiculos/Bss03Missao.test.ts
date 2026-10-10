import { describe, expect, it } from 'vitest';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { SuperficiePlano } from '../../SuperficiePlano';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { PropulsorVetorizado } from '../propulsao/PropulsorVetorizado';
import { Objeto } from '../base/Objeto';
import { Bss03 } from './Bss03';

describe('BSS-03 — decolagem e retorno controlado', () => {
  it('sobe, transfere o controle e toca o solo sem romper a estrutura', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const base = (id: string, massaBaseKg: number, posicaoM: Vetor3) => ({
      id, massaBaseKg, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 2_000_000,
      limiteTermicoC: 1_000, estadoInicial: { posicaoM },
    });
    const nave = new Bss03({
      ...base('bss03-missao', 900, new Vetor3(0, 4, 0)), dimensoesM: new Vetor3(5, 5.6, 3),
      areaFrontalM2: 14, coeficienteArrasto: 0.72,
      idsPropulsoresDecolagem: ['decolagem-e', 'decolagem-d'],
      idsPropulsoresPouso: ['pouso-e', 'pouso-d'],
      controlePouso: {
        altitudeAlvoM: 4, altitudeInicioFrenagemM: 40, usarGatilhoAltitude: true,
        controlarGimbal: false, taxaMaximaThrottlePorS: 2, throttleSustentacao: 0.6,
      },
      controleDesaceleracao: { velocidadeInicioMps: 10, velocidadeVerticalAlvoMps: -7, altitudeMinimaM: 40 },
    });
    const tanqueDecolagem = new TanquePropelente({ ...base('tanque-decolagem', 120, new Vetor3(0, 5.2, 0)), tipoPropelente: 'metano', capacidadePropelenteKg: 250, massaPropelenteInicialKg: 250 });
    const tanquePouso = new TanquePropelente({ ...base('tanque-pouso', 120, new Vetor3(0, 3.8, 0)), tipoPropelente: 'metano', capacidadePropelenteKg: 500, massaPropelenteInicialKg: 500 });
    const bateria = new Bateria({ ...base('bateria', 60, new Vetor3(0, 2.6, 0)), tensaoNominalV: 28, capacidadeEnergiaJ: 5_000_000, energiaInicialJ: 5_000_000 });
    const criarMotor = (id: string, x: number, tanque: TanquePropelente) => {
      const motor = new PropulsorVetorizado({
        ...base(id, 70, new Vetor3(x, 0.8, 0)), dimensoesM: new Vetor3(0.8, 1, 1),
        estadoInicial: { posicaoM: new Vetor3(x, 0.8, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
        empuxoMaximoN: 20_000, vazaoMaximaKgS: 0.5, propelenteCompativel: 'metano',
        tensaoAlimentacaoNominalV: 28, potenciaEletricaMaximaW: 1_500,
        vetorizacao: { limiteAngularRad: 15 * Math.PI / 180, velocidadeAngularMaximaRadps: 45 * Math.PI / 180 },
      });
      motor.conectarTanque(tanque); motor.conectarBateria(bateria); return motor;
    };
    const decolagem = [criarMotor('decolagem-e', -1.35, tanqueDecolagem), criarMotor('decolagem-d', 1.35, tanqueDecolagem)];
    const pouso = [criarMotor('pouso-e', -0.45, tanquePouso), criarMotor('pouso-d', 0.45, tanquePouso)];
    const trem = [
      new Objeto({ ...base('trem-e', 70, new Vetor3(-2.8, 1.1, 0)), dimensoesM: new Vetor3(0.5, 1.8, 1.2), coeficienteAtrito: 0.9 }),
      new Objeto({ ...base('trem-d', 70, new Vetor3(2.8, 1.1, 0)), dimensoesM: new Vetor3(0.5, 1.8, 1.2), coeficienteAtrito: 0.9 }),
      new Objeto({ ...base('sapata-e', 40, new Vetor3(-2.8, 0.2, 0)), dimensoesM: new Vetor3(1.8, 0.4, 1.8), coeficienteAtrito: 0.95 }),
      new Objeto({ ...base('sapata-d', 40, new Vetor3(2.8, 0.2, 0)), dimensoesM: new Vetor3(1.8, 0.4, 1.8), coeficienteAtrito: 0.95 }),
    ];
    const modulos = [tanqueDecolagem, tanquePouso, bateria, ...trem, ...decolagem, ...pouso];
    for (const modulo of modulos) nave.adicionarModulo(modulo);
    for (const motor of [...decolagem, ...pouso]) nave.instalarPropulsor(motor);
    for (const modulo of modulos) nave.adicionarFixador(new FixadorEstrutural({
      id: `fixador-${modulo.id}`, objetoA: nave, objetoB: modulo,
      resistenciaTracaoN: 1_000_000, resistenciaCompressaoN: 1_000_000,
      obterEsforcoSolicitadoN: () => [...decolagem, ...pouso].reduce((soma, motor) => soma + motor.empuxoAtualN, 0),
    }));
    mundo.registrarSuperficie(new SuperficiePlano('solo', 'concreto', 0, 5_000_000, 0.3, 0.9));
    nave.registrarNoMundo(mundo);
    nave.ativarControleDeInclinacao();
    for (const motor of decolagem) {
      expect(nave.solicitarIgnicaoDoPropulsor(motor.id).aceito).toBe(true);
      nave.definirThrottleDoPropulsor(motor.id, 1);
    }
    while (nave.obterLeiturasDosSensores().altitudeM < 2_000 && mundo.tempoS < 180) mundo.avancar(0.1);
    const noArmamento = nave.obterLeiturasDosSensores();
    expect(noArmamento.altitudeM).toBeGreaterThanOrEqual(2_000);

    expect(nave.acionarModoDePouso().every((resultado) => resultado.aceito)).toBe(true);
    mundo.avancar(0.1);
    const aposDecimoDeSegundo = nave.obterLeiturasDosSensores();

    expect(decolagem.every((motor) => motor.throttleAtual === 0)).toBe(true);
    expect(pouso.every((motor) => motor.throttleAtual === 0)).toBe(true);
    expect(aposDecimoDeSegundo.altitudeM).toBeGreaterThan(0);

    let passosDescida = 0;
    let velocidadeDescidaMaxima = 0;
    while (nave.obterLeiturasDosSensores().altitudeM > 4.05 && mundo.tempoS < 600 && passosDescida < 6_000) {
      mundo.avancar(0.1);
      passosDescida += 1;
      velocidadeDescidaMaxima = Math.max(velocidadeDescidaMaxima, -nave.obterLeiturasDosSensores().velocidadeVerticalMps);
    }
    const leiturasNoToque = nave.obterLeiturasDosSensores();
    const menorIntegridade = Math.min(...[nave, ...modulos].map((objeto) => objeto.integridadeEstrutural));
    const fixadoresDoVeiculo = nave.fixadoresEstruturais;
    expect(passosDescida).toBeLessThan(6_000);
    expect(velocidadeDescidaMaxima).toBeLessThan(15);
    expect(leiturasNoToque.altitudeM).toBeLessThanOrEqual(4.05);
    expect(Math.abs(leiturasNoToque.velocidadeVerticalMps)).toBeLessThanOrEqual(0.7);
    expect(menorIntegridade).toBe(1);
    expect(fixadoresDoVeiculo.every((fixador) => !fixador.estaRompido)).toBe(true);
  }, 90_000);
});
