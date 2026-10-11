import { describe, expect, it } from 'vitest';
import { RegistroEnsaioBancada } from './RegistroEnsaioBancada';

describe('diário de ensaio da bancada', () => {
  it('preserva ordem e passo das entradas e exporta cópias independentes', () => {
    const cfg = { id: 'bss-006', densidade: 1.225 };
    const r = new RegistroEnsaioBancada(1 / 240, cfg);
    cfg.densidade = 0;
    r.registrarEntrada('sistemas', true); r.registrarEntrada('throttle', 65);
    r.registrarPasso(1 / 240); r.registrarEntrada('modo', 'pouso');
    const exportado = r.exportar();
    expect(exportado.entradas).toEqual([{ passo: 0, acao: 'sistemas', valor: true }, { passo: 0, acao: 'throttle', valor: 65 }, { passo: 1, acao: 'modo', valor: 'pouso' }]);
    expect(exportado.configuracao).toEqual({ id: 'bss-006', densidade: 1.225 });
    exportado.entradas.length = 0;
    expect(r.exportar().entradas).toHaveLength(3);
    expect(exportado.passosExecutados).toBe(1);
  });
  it('recusa dt variável e entradas não finitas', () => {
    expect(() => new RegistroEnsaioBancada(0, {})).toThrow();
    const r = new RegistroEnsaioBancada(1 / 240, {});
    expect(() => r.registrarPasso(1 / 60)).toThrow('fixos');
    expect(() => r.registrarEntrada('alvo', Infinity)).toThrow();
    expect(() => r.registrarEntrada('')).toThrow();
  });
});
