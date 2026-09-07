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
