import { describe, expect, it } from 'vitest';
import { configurarParametrosReentrada, MODELO_REENTRADA, type ParametrosReentrada } from './ModeloAerodinamicoReentrada';

describe('diagnóstico preciso da configuração de reentrada', () => {
  it('preserva os padrões e o limite inclusivo exato de rolagem', () => {
    const p = configurarParametrosReentrada();
    expect(p.cursoRolagemRad).toBe(Math.PI / 2);
    expect(p.cursoFlapRad).toBe(MODELO_REENTRADA.cursoFlapRad);
    expect(Object.isFrozen(p)).toBe(true);
    expect(configurarParametrosReentrada({ taxaFlapRadps: 10, taxaRolagemRadps: 10, fracaoCargaInicialBateria: 1 })).toBeDefined();
  });

  it.each<[keyof ParametrosReentrada, number, string]>([
    ['cursoFlapRad', Math.PI / 2, 'menor que'],
    ['cursoRolagemRad', 1.5707963267949, 'menor ou igual'],
    ['fracaoCargaInicialBateria', 1.01, '100%'],
    ['taxaFlapRadps', 10.01, 'rad/s'],
    ['taxaRolagemRadps', 10.01, 'rad/s'],
  ])('identifica %s e seu valor sem ampliar limites', (chave, valor, detalhe) => {
    expect(() => configurarParametrosReentrada({ [chave]: valor })).toThrow(chave);
    expect(() => configurarParametrosReentrada({ [chave]: valor })).toThrow(String(valor));
    expect(() => configurarParametrosReentrada({ [chave]: valor })).toThrow(detalhe);
  });
});
