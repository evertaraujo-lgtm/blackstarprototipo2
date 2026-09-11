import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { PropulsorVetorizado } from '../propulsao/PropulsorVetorizado';
import { Bss03 } from './Bss03';

const criarBss03 = () => {
  const nave = new Bss03({
    id: 'bss03-manual', massaBaseKg: 900, dimensoesM: new Vetor3(5, 5.6, 3),
    resistenciaColisaoJ: 2_000_000, limiteTermicoC: 1_000,
    estadoInicial: { posicaoM: new Vetor3(0, 4, 0) },
    idsPropulsoresDecolagem: ['decolagem-e', 'decolagem-d'],
    idsPropulsoresPouso: ['pouso-e', 'pouso-d'],
    controlePouso: { altitudeAlvoM: 4 },
  });
  const criarMotor = (id: string) => new PropulsorVetorizado({
    id, massaBaseKg: 70, dimensoesM: new Vetor3(0.8, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000,
    empuxoMaximoN: 20_000, vazaoMaximaKgS: 0.5, propelenteCompativel: 'metano',
    vetorizacao: { limiteAngularRad: 3 * Math.PI / 180, velocidadeAngularMaximaRadps: Math.PI / 6 },
  });
  const motores = ['decolagem-e', 'decolagem-d', 'pouso-e', 'pouso-d'].map(criarMotor);
  for (const motor of motores) { nave.adicionarModulo(motor); nave.instalarPropulsor(motor); }
  return { nave, motores };
};

describe('Bss03', () => {
  it('não liga sistemas, ignição, throttle ou controladores automaticamente', () => {
    const { nave, motores } = criarBss03();

    expect(nave.controleAtivoBss03).toBe('manual');
    expect(motores.every((motor) => !motor.estaIgnitado && motor.throttleAtual === 0)).toBe(true);
    expect(nave.controleDeInclinacaoEstaHabilitado).toBe(false);
    expect(nave.controleDePousoEstaHabilitado).toBe(false);
  });

  it('troca os controladores somente quando o operador solicita', () => {
    const { nave, motores } = criarBss03();

    nave.ativarControleDeInclinacao();
    expect(nave.controleAtivoBss03).toBe('inclinacao');
    expect(nave.controleDeInclinacaoEstaHabilitado).toBe(true);

    nave.ativarControleDePouso();
    expect(nave.controleAtivoBss03).toBe('pouso');
    expect(nave.controleDeInclinacaoEstaHabilitado).toBe(false);
    expect(nave.controleDePousoEstaHabilitado).toBe(true);
    expect(motores.every((motor) => !motor.estaIgnitado)).toBe(true);

    nave.desativarControlesAutomaticos();
    expect(nave.controleAtivoBss03).toBe('manual');
  });

  it('não corta a decolagem se o comando explícito de pouso não conseguir ignitar os motores de pouso', () => {
    const { nave, motores } = criarBss03();
    const [motorDecolagem] = motores;
    motorDecolagem.definirThrottle(0.7);

    const resultados = nave.acionarModoDePouso();

    expect(resultados.every((resultado) => !resultado.aceito)).toBe(true);
    expect(nave.controleAtivoBss03).toBe('manual');
    expect(motorDecolagem.throttleAtual).toBe(0.7);
  });

  it('assume o pouso por um único comando do operador depois de confirmar seus permissivos', () => {
    const { nave, motores } = criarBss03();
    const tanque = new TanquePropelente({
      id: 'tanque-pouso', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
      tipoPropelente: 'metano', capacidadePropelenteKg: 20, massaPropelenteInicialKg: 20,
    });
    const bateria = new Bateria({
      id: 'bateria-pouso', massaBaseKg: 20, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
      tensaoNominalV: 28, capacidadeEnergiaJ: 100_000, energiaInicialJ: 100_000,
    });
    const motoresDecolagem = motores.slice(0, 2);
    const motoresPouso = motores.slice(2);
    for (const motor of motoresPouso) {
      motor.conectarTanque(tanque);
      motor.conectarBateria(bateria);
    }
    for (const motor of motoresDecolagem) motor.definirThrottle(0.7);

    const resultados = nave.acionarModoDePouso();

    expect(resultados.every((resultado) => resultado.aceito)).toBe(true);
    expect(motoresDecolagem.every((motor) => motor.throttleAtual === 0)).toBe(true);
    expect(motoresPouso.every((motor) => motor.estaIgnitado && motor.throttleAtual === 0)).toBe(true);
    expect(nave.controleAtivoBss03).toBe('pouso');

    nave.retornarAoControleDeInclinacao();
    expect(motoresPouso.every((motor) => motor.throttleAtual === 0)).toBe(true);
    expect(nave.controleAtivoBss03).toBe('inclinacao');
  });
});
