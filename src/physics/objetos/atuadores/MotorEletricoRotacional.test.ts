import { describe, expect, it } from 'vitest';
import { ChumbadorAoSolo } from '../../conexoes/ChumbadorAoSolo';
import { JuntaRotacionalDeBancada } from '../../conexoes/JuntaRotacionalDeBancada';
import { MundoFisico } from '../../MundoFisico';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';
import { BracoArticuladoDeBancada } from '../mecanismos/BracoArticuladoDeBancada';
import { MotorEletricoRotacional } from './MotorEletricoRotacional';

const base = (id: string, massaBaseKg: number, posicaoM: Vetor3) => ({
  id, massaBaseKg, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, estadoInicial: { posicaoM },
});

describe('MotorEletricoRotacional', () => {
  it('gira a haste pela junta quando recebe energia e comando angular', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    const bateria = new Bateria({ ...base('bateria-motor-teste', 10, new Vetor3(-2, 2, 0)), tensaoNominalV: 24, capacidadeEnergiaJ: 10_000, energiaInicialJ: 10_000 });
    const braco = new BracoArticuladoDeBancada({ ...base('haste-motor-teste', 5, new Vetor3(1, 2, 0)), dimensoesM: new Vetor3(2, 0.2, 0.2), estadoInicial: { posicaoM: new Vetor3(1, 2, 0) } });
    const motor = new MotorEletricoRotacional({
      ...base('motor-teste', 20, new Vetor3(0, 2, 0)), fonteEletrica: bateria,
      obterAnguloAtualRad: () => braco.getEstadoFisico().orientacaoRad.z,
      obterVelocidadeAngularRadps: () => braco.getEstadoFisico().velocidadeAngularRadps.z,
      torqueMaximoNm: 500, velocidadeAngularMaximaRadps: 2, aceleracaoMaximaRadps2: 10, potenciaNominalW: 100,
    });
    const junta = new JuntaRotacionalDeBancada({ id: 'junta-motor-teste', objetoBase: motor, braco, motor, pontoNoObjetoBaseM: Vetor3.zero, pontoNoBracoM: new Vetor3(-1, 0, 0) });
    mundo.registrarObjeto(bateria); mundo.registrarObjeto(motor); mundo.registrarObjeto(braco);
    mundo.registrarChumbadorAoSolo(new ChumbadorAoSolo({ id: 'chumbador-motor-teste', objeto: motor, resistenciaN: 100_000 }));
    mundo.registrarJuntaRotacionalDeBancada(junta);
    expect(junta.ignoraColisaoEntre(motor, braco)).toBe(true);
    expect(junta.ignoraColisaoEntre(motor, bateria)).toBe(false);
    mundo.avancar(1 / 240);
    expect(motor.conexaoEletrica.correnteAtualA).toBe(0);
    motor.definirAnguloAlvoRad(Math.PI / 4);
    mundo.avancar(0.5);
    expect(motor.torqueAtualNm).not.toBe(0);
    expect(braco.getEstadoFisico().orientacaoRad.z).toBeGreaterThan(0.05);
    expect(motor.conexaoEletrica.correnteAtualA).toBeGreaterThan(0);
    expect(bateria.energiaArmazenadaJ).toBeLessThan(10_000);
  });

  it('mantem a posicao inicial travada ate receber comando de movimento', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    const bateria = new Bateria({ ...base('bateria-trava-teste', 10, new Vetor3(-2, 2, 0)), tensaoNominalV: 24, capacidadeEnergiaJ: 10_000, energiaInicialJ: 10_000 });
    const braco = new BracoArticuladoDeBancada({ ...base('haste-trava-teste', 5, new Vetor3(1, 2, 0)), dimensoesM: new Vetor3(2, 0.2, 0.2), estadoInicial: { posicaoM: new Vetor3(1, 2, 0) } });
    const motor = new MotorEletricoRotacional({ ...base('motor-trava-teste', 20, new Vetor3(0, 2, 0)), fonteEletrica: bateria, obterAnguloAtualRad: () => braco.getEstadoFisico().orientacaoRad.z, obterVelocidadeAngularRadps: () => braco.getEstadoFisico().velocidadeAngularRadps.z, torqueMaximoNm: 500, velocidadeAngularMaximaRadps: 2, aceleracaoMaximaRadps2: 10, potenciaNominalW: 100 });
    const junta = new JuntaRotacionalDeBancada({ id: 'junta-trava-teste', objetoBase: motor, braco, motor, pontoNoObjetoBaseM: Vetor3.zero, pontoNoBracoM: new Vetor3(-1, 0, 0), travaMecanicaInicial: true });
    mundo.registrarObjeto(bateria); mundo.registrarObjeto(motor); mundo.registrarObjeto(braco);
    mundo.registrarChumbadorAoSolo(new ChumbadorAoSolo({ id: 'chumbador-trava-teste', objeto: motor, resistenciaN: 100_000 }));
    mundo.registrarJuntaRotacionalDeBancada(junta);
    mundo.avancar(0.5);
    expect(junta.estaTravada).toBe(true);
    expect(braco.getEstadoFisico().orientacaoRad.z).toBeCloseTo(0, 2);
    motor.definirAnguloAlvoRad(Math.PI / 4);
    mundo.avancar(0.5);
    expect(junta.estaTravada).toBe(false);
    expect(braco.getEstadoFisico().orientacaoRad.z).toBeGreaterThan(0.05);
  });
});
