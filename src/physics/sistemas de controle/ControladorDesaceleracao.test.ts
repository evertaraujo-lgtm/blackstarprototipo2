import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import { ControladorDesaceleracao } from './ControladorDesaceleracao';

const leituras = (altitudeM: number, velocidadeVerticalMps: number) => ({
  posicaoGpsM: Vetor3.zero, altitudeM, velocidadeVerticalMps,
  velocidadeHorizontalMps: 0, inclinacaoRad: 0,
});

describe('ControladorDesaceleracao', () => {
  it('permanece inativo até a queda ultrapassar a velocidade configurada', () => {
    const controlador = new ControladorDesaceleracao({ velocidadeInicioMps: 10, altitudeMinimaM: 40 });
    controlador.habilitar();
    expect(controlador.calcularComando(leituras(100, -8), 0.1)).toMatchObject({ ativo: false, throttle: 0 });
  });

  it('usa PID de velocidade para elevar potência durante queda rápida acima da faixa de pouso', () => {
    const controlador = new ControladorDesaceleracao({ velocidadeInicioMps: 10, velocidadeVerticalAlvoMps: -7, altitudeMinimaM: 40, taxaMaximaThrottlePorS: 10 });
    controlador.habilitar();
    expect(controlador.calcularComando(leituras(100, -18), 0.1)).toMatchObject({ ativo: true, velocidadeAlvoMps: -7 });
    expect(controlador.calcularComando(leituras(100, -18), 0.1).throttle).toBeGreaterThan(0.6);
  });

  it('cede o throttle ao pouso ao entrar na altitude mínima', () => {
    const controlador = new ControladorDesaceleracao({ altitudeMinimaM: 40 });
    controlador.habilitar();
    expect(controlador.calcularComando(leituras(40, -18), 0.1)).toMatchObject({ ativo: false, throttle: 0 });
  });
});
