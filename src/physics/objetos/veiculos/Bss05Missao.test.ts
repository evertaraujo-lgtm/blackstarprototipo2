import { describe, expect, it } from 'vitest';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { SuperficiePlano } from '../../SuperficiePlano';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { PropulsorVetorizado } from '../propulsao/PropulsorVetorizado';
import { BombaPropelente } from '../propulsao/alimentacao/BombaPropelente';
import { LinhaDePropelente } from '../propulsao/alimentacao/LinhaDePropelente';
import { ValvulaPropelente } from '../propulsao/alimentacao/ValvulaPropelente';
import { Bocal } from '../propulsao/combustao/Bocal';
import { CamaraCombustao } from '../propulsao/combustao/CamaraCombustao';
import { criarPernasFixasBss04 } from './Bss04';
import { VeiculoComposto } from './VeiculoComposto';

describe('BSS-005 — tanques ampliados', () => {
  it('mantém empuxo/peso para decolar e ultrapassa 15 km com os tanques cheios', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const deslocamentoM = 0.3;
    const base = (id: string, massaBaseKg: number, dimensoesM: Vetor3, posicaoM: Vetor3) => ({
      id, massaBaseKg, dimensoesM, resistenciaColisaoJ: 1_000_000, limiteTermicoC: 1_000,
      estadoInicial: { posicaoM: posicaoM.adicionar(new Vetor3(0, deslocamentoM, 0)) },
    });
    const dimensoesTanque = new Vetor3(2 * Math.cbrt(5), 1.5 * Math.cbrt(5), 1.8 * Math.cbrt(5));
    const casco = new VeiculoComposto({
      ...base('bss05-missao', 800, new Vetor3(3.2, 6, 2.4), new Vetor3(0, 4.8, 0)),
      estadoInicial: { posicaoM: new Vetor3(0, 4.8, 0) }, areaFrontalM2: 7, coeficienteArrasto: 0.65,
    });
    const combustivel = new TanquePropelente({
      ...base('bss05-tanque-metano', 180 * 5 ** (2 / 3), dimensoesTanque, new Vetor3(0, 8.9325, 0)),
      tipoPropelente: 'metano', capacidadePropelenteKg: 600, massaPropelenteInicialKg: 600,
    });
    const oxidante = new TanquePropelente({
      ...base('bss05-tanque-oxigenio', 160 * 5 ** (2 / 3), dimensoesTanque, new Vetor3(0, 11.6475, 0)),
      tipoPropelente: 'oxigenio', capacidadePropelenteKg: 2_400, massaPropelenteInicialKg: 2_400,
    });
    const bateria = new Bateria({
      ...base('bss05-bateria', 50, new Vetor3(1.2, 0.8, 1), new Vetor3(0, 13.73, 0)),
      tensaoNominalV: 24, capacidadeEnergiaJ: 1_000_000, energiaInicialJ: 1_000_000,
    });
    const motor = new PropulsorVetorizado({
      ...base('bss05-propulsor', 270, new Vetor3(1.6, 1.4, 1.4), new Vetor3(0, 0.8, 0)),
      estadoInicial: { posicaoM: new Vetor3(0, 1.1, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
      tensaoAlimentacaoNominalV: 24, potenciaEletricaMaximaW: 3_600, potenciaTermicaMaximaW: 6_000_000,
      empuxoMaximoN: 120_000, vazaoMaximaKgS: 2.4, propelenteCompativel: 'metano',
      vetorizacao: { limiteAngularRad: 15 * Math.PI / 180, velocidadeAngularMaximaRadps: 90 * Math.PI / 180 },
    });
    motor.conectarTanque(combustivel, 16);
    motor.conectarBateria(bateria, 16);
    const valvulaCombustivel = new ValvulaPropelente({ id: 'bss05-valvula-metano', vazaoMaximaKgS: 2.4 });
    const valvulaOxidante = new ValvulaPropelente({ id: 'bss05-valvula-oxigenio', vazaoMaximaKgS: 9.6 });
    const linhaCombustivel = new LinhaDePropelente({ id: 'bss05-linha-metano', tanque: combustivel, tipoPropelente: 'metano', comprimentoMaximoM: 16, vazaoMaximaKgS: 2.4, valvula: valvulaCombustivel });
    const linhaOxidante = new LinhaDePropelente({ id: 'bss05-linha-oxigenio', tanque: oxidante, tipoPropelente: 'oxigenio', comprimentoMaximoM: 16, vazaoMaximaKgS: 9.6, valvula: valvulaOxidante });
    motor.configurarCadeiaBipropelente({
      linhaCombustivel,
      bombaCombustivel: new BombaPropelente({ id: 'bss05-bomba-metano', tensaoNominalV: 24, vazaoMaximaKgS: 2.4, potenciaEletricaMaximaW: 1_200 }),
      linhaOxidante,
      bombaOxidante: new BombaPropelente({ id: 'bss05-bomba-oxigenio', tensaoNominalV: 24, vazaoMaximaKgS: 9.6, potenciaEletricaMaximaW: 1_800 }),
      camara: new CamaraCombustao({ razaoMisturaOxidanteCombustivel: 4, toleranciaRazaoMistura: 0.1 }),
      bocal: new Bocal({ empuxoMaximoN: 120_000, eficienciaNominal: 1 }),
    });
    const pernas = criarPernasFixasBss04(new Vetor3(0, 4.8, 0), 'bss05');
    const modulos = [combustivel, oxidante, bateria, motor, ...pernas];
    for (const modulo of modulos) casco.adicionarModulo(modulo);
    casco.instalarPropulsor(motor);
    for (const modulo of modulos) casco.adicionarFixador(new FixadorEstrutural({
      id: `bss05-fixador-${modulo.id}`, objetoA: casco, objetoB: modulo,
      resistenciaTracaoN: 1_000_000, resistenciaCompressaoN: 1_000_000,
      obterEsforcoSolicitadoN: () => motor.empuxoAtualN,
    }));
    mundo.registrarSuperficie(new SuperficiePlano('bss05-solo', 'concreto', 0, 5_000_000, 0.3, 0.9));
    casco.registrarNoMundo(mundo);
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(motor.ligarSistema(sistema)).toBe(true);
    motor.definirThrottle(1);
    expect(motor.solicitarIgnicao()).toBe(true);

    const massaInicialKg = casco.massaInstantaneaDoConjuntoKg;
    expect(combustivel.massaPropelenteKg).toBe(600);
    expect(oxidante.massaPropelenteKg).toBe(2_400);
    expect(motor.empuxoMaximoN / (massaInicialKg * 9.80665)).toBeGreaterThan(1.5);

    let passos = 0;
    while (casco.getEstadoFisico().posicaoM.y < 15_000 && passos < 80_000) {
      mundo.avancar(1 / 240);
      passos += 1;
      if (motor.empuxoAtualN === 0) break;
    }

    expect(casco.getEstadoFisico().posicaoM.y, `t=${mundo.tempoS.toFixed(1)} s, massa=${casco.massaInstantaneaDoConjuntoKg.toFixed(0)} kg, combustível=${combustivel.massaPropelenteKg.toFixed(0)} kg, oxidante=${oxidante.massaPropelenteKg.toFixed(0)} kg`).toBeGreaterThanOrEqual(15_000);
    expect(casco.massaInstantaneaDoConjuntoKg).toBeLessThan(massaInicialKg);
    expect(casco.fixadoresEstruturais.every((fixador) => !fixador.estaRompido)).toBe(true);
  }, 90_000);
});
