import { describe, expect, it } from 'vitest';
import { CONFIGURACAO_REENTRADA, criarCenarioReentrada, criarEnsaioReentrada, validarConfiguracaoExplicitaReentrada, reproduzirEnsaioReentrada } from './EnsaioReentrada';

describe('RE-003 — configuração explícita, componentes e diário', () => {
  it('aplica 5000 °C nos corpos reais e no JSON do passo zero', () => {
    const c = validarConfiguracaoExplicitaReentrada({ ...CONFIGURACAO_REENTRADA,
      limiteOrbitadorC: 5000, limiteFlapsC: 5000, limiteBateriaC: 5000 });
    const fisico = criarCenarioReentrada(c);
    expect(fisico.objetos.map(o => o.limiteTermicoC)).toEqual([5000, 5000, 5000, 5000]);
    const e = criarEnsaioReentrada(c), d = e.exportar();
    expect(d.passosExecutados).toBe(0);
    expect(d.identificacao).toMatchObject({ configuracao: { limiteOrbitadorC: 5000, limiteFlapsC: 5000, limiteBateriaC: 5000 } });
    expect(d.inicial).toMatchObject({ limiteOrbitadorC: 5000, limiteFlapsC: 5000, limiteBateriaC: 5000 });
  });

  it.each(['resistenciaCorpoJ', 'resistenciaFlapJ', 'resistenciaFixadorN'] as const)('aplica isoladamente %s sem alterar outros parâmetros', chave => {
    const c = validarConfiguracaoExplicitaReentrada({ ...CONFIGURACAO_REENTRADA,
      parametros: { ...CONFIGURACAO_REENTRADA.parametros, [chave]: 5000 } });
    const f = criarCenarioReentrada(c);
    expect(f.orbitador.resistenciaColisaoJ).toBe(chave === 'resistenciaCorpoJ' ? 5000 : 1e8);
    expect(f.flaps.map(o => o.resistenciaColisaoJ)).toEqual([1, 1].map(() => chave === 'resistenciaFlapJ' ? 5000 : 1e6));
    expect(f.fixadores.map(o => o.resistenciaTracaoN)).toEqual([1, 1, 1].map(() => chave === 'resistenciaFixadorN' ? 5000 : 1e8));
    expect(f.bateria.resistenciaColisaoJ).toBe(1e6);
    expect(criarEnsaioReentrada(c).exportar().identificacao).toMatchObject({ configuracao: c });
  });

  it.each([undefined, null, [], {}, { limiteFlapsC: 5000 }])('rejeita entrada incompleta: %j', valor => {
    expect(() => validarConfiguracaoExplicitaReentrada(valor)).toThrow(/configura/i);
  });

  it.each(['limiteOrbitadorC', 'limiteFlapsC', 'limiteBateriaC', 'altitudeM', 'parametros', 'corredor', 'aproximacao'])('não usa fallback para ausência de %s', chave => {
    const c: Record<string, unknown> = { ...CONFIGURACAO_REENTRADA }; delete c[chave];
    expect(() => validarConfiguracaoExplicitaReentrada(c)).toThrow(chave);
  });

  it.each(['parametros', 'corredor', 'aproximacao'] as const)('exige todas as propriedades aninhadas: %s', chave => {
    expect(() => validarConfiguracaoExplicitaReentrada({ ...CONFIGURACAO_REENTRADA, [chave]: {} })).toThrow(/incompleta/);
    expect(() => validarConfiguracaoExplicitaReentrada({ ...CONFIGURACAO_REENTRADA,
      [chave]: { ...CONFIGURACAO_REENTRADA[chave], desconhecido: 5000 } })).toThrow(/desconhecido/);
  });

  it.each([NaN, Infinity, -Infinity, '', '5000', 5000.00001, -200.00001, undefined])('rejeita limiar inválido %s sem converter para padrão', valor => {
    expect(() => validarConfiguracaoExplicitaReentrada({ ...CONFIGURACAO_REENTRADA, limiteFlapsC: valor })).toThrow();
  });

  it.each([-200, 0, 900, 5000])('preserva exatamente limiar válido %s °C', valor => {
    expect(validarConfiguracaoExplicitaReentrada({ ...CONFIGURACAO_REENTRADA, limiteFlapsC: valor }).limiteFlapsC).toBe(valor);
  });

  it.each([0, -1, NaN, Infinity, 1e12 + 1])('rejeita resistência mecânica inválida %s', resistenciaCorpoJ => {
    expect(() => validarConfiguracaoExplicitaReentrada({ ...CONFIGURACAO_REENTRADA,
      parametros: { ...CONFIGURACAO_REENTRADA.parametros, resistenciaCorpoJ } })).toThrow(/resistenciaCorpoJ/);
  });

  it('aceita a resistência máxima existente, preserva o legado declarado e congela cópias', () => {
    const entrada = JSON.parse(JSON.stringify(CONFIGURACAO_REENTRADA));
    delete entrada.transferencia; entrada.parametros.resistenciaCorpoJ = 1e12;
    const c = validarConfiguracaoExplicitaReentrada(entrada);
    expect(c.parametros.resistenciaCorpoJ).toBe(1e12);
    expect(c.transferencia).toEqual(CONFIGURACAO_REENTRADA.transferencia);
    expect(Object.isFrozen(c)).toBe(true); expect(Object.isFrozen(c.parametros)).toBe(true);
    entrada.parametros.resistenciaCorpoJ = 5000;
    expect(c.parametros.resistenciaCorpoJ).toBe(1e12);
  });

  it('mantém a configuração e replay antes/durante/depois de execução, sem herdar edição posterior', () => {
    const entrada = JSON.parse(JSON.stringify(CONFIGURACAO_REENTRADA)); entrada.limiteFlapsC = 5000;
    const c = validarConfiguracaoExplicitaReentrada(entrada), e = criarEnsaioReentrada(c);
    const antes = e.exportar(); entrada.limiteFlapsC = 900; entrada.parametros.resistenciaFlapJ = 5000;
    e.iniciar(); for (let i = 0; i < 10; i++) e.avancarPasso(); const durante = e.exportar(); e.pausar();
    const depois = e.exportar();
    expect(antes.identificacao).toEqual(durante.identificacao); expect(durante.identificacao).toEqual(depois.identificacao);
    expect(reproduzirEnsaioReentrada(depois).exportar()).toEqual(depois);
    expect(e.observar().limiteFlapsC).toBe(5000);
  });
});
