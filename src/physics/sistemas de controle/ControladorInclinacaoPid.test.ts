import { describe, expect, it } from 'vitest';
import { ControladorInclinacaoPid } from './ControladorInclinacaoPid';

class ControladorDeTeste extends ControladorInclinacaoPid {
  public calcular(erroRad: number, dtS: number): number { return this.calcularComando(erroRad, dtS); }
}

describe('ControladorInclinacaoPid', () => {
  it('permanece inativo até ser habilitado e limita o comando', () => {
    const controlador = new ControladorDeTeste(2, 0, 0, 0.1);

    expect(controlador.calcular(1, 0.1)).toBe(0);
    controlador.habilitar();
    expect(controlador.calcular(1, 0.1)).toBeCloseTo(0.1, 12);
    expect(controlador.calcular(-1, 0.1)).toBeCloseTo(-0.1, 12);
    controlador.desabilitar();
    expect(controlador.calcular(1, 0.1)).toBe(0);
  });
});

describe('PID de atitude — transições e saturação', () => {
  it('não cria pico derivativo na habilitação ou na troca da referência', () => {
    const pid = new ControladorInclinacaoPid(0, 0, 3, 0.3);
    pid.habilitar();
    expect(pid.calcularComando(0.2, 1 / 240)).toBe(0);
    expect(pid.calcularComando(-0.2, 1 / 240, 0)).toBe(0);
    expect(pid.calcularComando(-0.2, 1 / 240, 0.02)).toBeCloseTo(0.06);
  });
  it('limpa integral e derivada ao desabilitar; não acumula integral saturada', () => {
    const pid = new ControladorInclinacaoPid(1, 1, 0, 0.1);
    pid.habilitar();
    for (let i = 0; i < 100; i++) expect(pid.calcularComando(1, 0.1)).toBe(0.1);
    expect(pid.calcularComando(0, 0.1)).toBe(0);
    pid.calcularComando(0.05, 0.1);
    pid.desabilitar();
    expect(pid.calcularComando(10, 0.1)).toBe(0);
    pid.habilitar();
    expect(pid.calcularComando(0, 0.1)).toBe(0);
  });
});
