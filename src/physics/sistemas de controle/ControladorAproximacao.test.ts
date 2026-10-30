import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import { ControladorAproximacao, type ConfiguracaoControladorAproximacao } from './ControladorAproximacao';

const config: ConfiguracaoControladorAproximacao = {
  alvoArcoM: 1000, aceleracaoHorizontalMaximaMps2: 5, aceleracaoVerticalMaximaMps2: 5,
  velocidadeHorizontalMaximaMps: 100, velocidadeVerticalMaximaMps: 20, ganhoVelocidadePorS: 1,
  propulsores: [{ id: 'motor-a', empuxoMaximoN: 1_000_000, gimbalMaximoRad: 0.2 },
    { id: 'motor-b', empuxoMaximoN: 1_000_000, gimbalMaximoRad: 0.3 }],
};
const leituras = (mudancas: Record<string, unknown> = {}) => ({
  posicaoGpsM: new Vetor3(0, 1000, 0), posicaoHorizontalM: 0, altitudeM: 1000,
  velocidadeVerticalMps: -50, velocidadeHorizontalMps: 300, inclinacaoRad: 0,
  gravidadeLocalMps2: 9.8, massaInstantaneaKg: 80_000, sensoresValidos: true, idadeLeituraS: 0,
  ...mudancas,
});

describe('ControladorAproximacao', () => {
  it('calcula velocidades de frenagem por sqrt(2ad) e emite pedidos físicos limitados', () => {
    const c = new ControladorAproximacao(config); c.habilitar();
    const pedidos = c.calcularSolicitacoes(leituras(), 1 / 240);
    const estado = c.observar();
    expect(estado.velocidadeHorizontalAlvoMps).toBe(100);
    expect(estado.velocidadeVerticalAlvoMps).toBe(-20);
    expect(estado.aceleracaoHorizontalSolicitadaMps2).toBe(-5);
    expect(estado.aceleracaoVerticalLiquidaSolicitadaMps2).toBe(5);
    expect(estado.aceleracaoVerticalEmpuxoSolicitadaMps2).toBeCloseTo(14.8);
    expect(estado.gimbalSolicitadoRad).toBeCloseTo(0.2);
    expect(estado.saturado).toBe(true);
    expect(pedidos).toHaveLength(4);
    expect(pedidos).toContainEqual({ idAtuador: 'motor-a', recurso: 'throttle', valor: estado.throttleSolicitado });
    expect(pedidos).toContainEqual({ idAtuador: 'motor-b', recurso: 'gimbal', valor: estado.gimbalSolicitadoRad });
  });

  it('pede throttle zero quando os sensores ficam inválidos e não ativa ignição', () => {
    const c = new ControladorAproximacao(config); c.habilitar();
    expect(c.calcularSolicitacoes(leituras({ sensoresValidos: false }), 1 / 240))
      .toEqual([{ idAtuador: 'motor-a', recurso: 'throttle', valor: 0 },
        { idAtuador: 'motor-b', recurso: 'throttle', valor: 0 }]);
    expect(c.observar().estado).toBe('falha-sensores');
  });

  it('não acelera lateralmente quando a velocidade já está abaixo do limite de frenagem', () => {
    const c = new ControladorAproximacao(config); c.habilitar();
    c.calcularSolicitacoes(leituras({ velocidadeHorizontalMps: 7.38 }), 1 / 240);
    expect(c.observar().velocidadeHorizontalAlvoMps).toBeCloseTo(7.38);
    expect(c.observar().aceleracaoHorizontalSolicitadaMps2).toBeCloseTo(0);
  });

  it('recusa atuar depois de ultrapassar o alvo e valida dt', () => {
    const c = new ControladorAproximacao(config); c.habilitar();
    expect(c.calcularSolicitacoes(leituras({ posicaoHorizontalM: 1001 }), 1 / 240))
      .toEqual([{ idAtuador: 'motor-a', recurso: 'throttle', valor: 0 },
        { idAtuador: 'motor-b', recurso: 'throttle', valor: 0 }]);
    expect(c.observar().estado).toBe('alvo-ultrapassado');
    expect(() => c.calcularSolicitacoes(leituras(), 1)).toThrow();
    expect(() => new ControladorAproximacao({ ...config, alvoArcoM: NaN })).toThrow();
  });
});
