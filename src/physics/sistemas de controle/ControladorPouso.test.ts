import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import type { LeiturasVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorPouso } from './ControladorPouso';

const leituras = (parcial: Partial<LeiturasVeiculoComposto> = {}): LeiturasVeiculoComposto => ({
  posicaoGpsM: Vetor3.zero,
  altitudeM: 100,
  velocidadeVerticalMps: -8,
  velocidadeHorizontalMps: 0,
  inclinacaoRad: 0,
  ...parcial,
});

describe('ControladorPouso', () => {
  it('permanece inativo até ser habilitado', () => {
    const controlador = new ControladorPouso();
    expect(controlador.calcularComando(leituras(), 1)).toMatchObject({ fase: 'inativo', throttle: 0 });
  });

  it('reduz a velocidade-alvo perto do solo e eleva o throttle ao cair rápido', () => {
    const controlador = new ControladorPouso({ altitudeAlvoM: 3, taxaMaximaThrottlePorS: 10 });
    controlador.habilitar();

    const comando = controlador.calcularComando(leituras({ altitudeM: 8, velocidadeVerticalMps: -10 }), 0.1);

    expect(comando.fase).toBe('frenagem');
    expect(comando.velocidadeVerticalAlvoMps).toBeGreaterThan(-8);
    expect(comando.throttle).toBeGreaterThan(0.5);
  });

  it.each([20, 200, 2_000])('mantém a descida dentro do perfil seguro a %d m de altitude', (altitudeM) => {
    const controlador = new ControladorPouso({ altitudeAlvoM: 3, taxaMaximaThrottlePorS: 10 });
    controlador.habilitar();

    const comando = controlador.calcularComando(leituras({ altitudeM, velocidadeVerticalMps: -20 }), 0.1);

    expect(comando.velocidadeVerticalAlvoMps).toBeGreaterThanOrEqual(-8);
    expect(comando.throttle).toBe(1);
  });

  it('usa inclinação e deriva horizontal para solicitar gimbal restaurador limitado', () => {
    const controlador = new ControladorPouso({ limiteGimbalRad: 0.2, taxaMaximaThrottlePorS: 10 });
    controlador.habilitar();

    const positivo = controlador.calcularComando(leituras({ inclinacaoRad: 0.1, velocidadeHorizontalMps: 4 }), 0.1);
    const negativo = controlador.calcularComando(leituras({ inclinacaoRad: -0.1, velocidadeHorizontalMps: -4 }), 0.1);

    expect(positivo.anguloGimbalRad).toBe(0.2);
    expect(negativo.anguloGimbalRad).toBe(-0.2);
  });

  it('corta o throttle somente no envelope seguro de toque', () => {
    const controlador = new ControladorPouso({ altitudeAlvoM: 3, taxaMaximaThrottlePorS: 10 });
    controlador.habilitar();

    expect(controlador.calcularComando(leituras({ altitudeM: 3.05, velocidadeVerticalMps: -0.5 }), 0.1)).toMatchObject({ fase: 'toque', throttle: 0 });
    expect(controlador.calcularComando(leituras({ altitudeM: 3.05, velocidadeVerticalMps: -3 }), 0.1)).toMatchObject({ fase: 'frenagem' });
  });

  it('entra em estado seguro quando uma leitura deixa de ser finita', () => {
    const controlador = new ControladorPouso();
    controlador.habilitar();

    expect(controlador.calcularComando(leituras({ altitudeM: Number.NaN }), 0.1)).toMatchObject({
      fase: 'falha-de-sensores', throttle: 0, anguloGimbalRad: 0, leiturasValidas: false,
    });
  });
});
