import { describe, expect, it } from 'vitest';
import { Objeto } from './Objeto';
import { Vetor3 } from '../../Vetor3';

describe('Objeto', () => {
  it('expõe e preserva todas as propriedades físicas fundamentais configuradas', () => {
    const objeto = new Objeto({
      id: 'objeto-propriedades', massaBaseKg: 1_500, dimensoesM: new Vetor3(4, 2, 3),
      resistenciaColisaoJ: 200_000, dissipacaoImpacto: 0.2, coeficienteAtrito: 0.7,
      resistenciaCalorK: 1_200, areaFrontalM2: 6, coeficienteArrasto: 0.35,
      estadoInicial: { posicaoM: new Vetor3(2, 3, 4), velocidadeMps: new Vetor3(5, 0, 0) },
    });

    objeto.definirMassaVariavelKg(250);
    objeto.registrarUso(2.5);
    const estado = objeto.getEstadoFisico();
    expect(objeto.id).toBe('objeto-propriedades');
    expect(objeto.massaBaseKg).toBe(1_500);
    expect(objeto.massaKg).toBe(1_750);
    expect(objeto.dimensoesM).toEqual(new Vetor3(4, 2, 3));
    expect(objeto.resistenciaColisaoJ).toBe(200_000);
    expect(objeto.dissipacaoImpacto).toBe(0.2);
    expect(objeto.coeficienteAtrito).toBe(0.7);
    expect(objeto.resistenciaCalorK).toBe(1_200);
    expect(objeto.areaFrontalM2).toBe(6);
    expect(objeto.coeficienteArrasto).toBe(0.35);
    expect(estado.posicaoM).toEqual(new Vetor3(2, 3, 4));
    expect(estado.velocidadeMps).toEqual(new Vetor3(5, 0, 0));
    expect(objeto.horasConsumidas).toBe(2.5);
    expect(objeto.getMomentoInerciaKgM2()).toEqual(new Vetor3(11_375 / 6, 43_750 / 12, 8_750 / 3));
  });

  it('aplica dano somente acima da resistência estrutural e mantém os pontos de contato do volume', () => {
    const objeto = new Objeto({
      id: 'objeto-dano-contato', massaBaseKg: 10, dimensoesM: new Vetor3(2, 4, 6),
      resistenciaColisaoJ: 100, resistenciaCalorK: 500,
    });
    objeto.aplicarDanoPorImpacto(100);
    expect(objeto.integridadeEstrutural).toBe(1);
    objeto.aplicarDanoPorImpacto(150);
    expect(objeto.integridadeEstrutural).toBeCloseTo(0.5, 10);
    expect(objeto.getPontosDeContatoLocaisM()).toHaveLength(8);
    expect(objeto.getVerticesColisaoLocais2D()).toHaveLength(4);
  });

  it('acumula calor em graus Celsius e degrada progressivamente acima do limite térmico', () => {
    const objeto = new Objeto({
      id: 'objeto-termico', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100,
      resistenciaCalorK: 373.15, limiteTermicoC: 100, temperaturaInicialC: 20, capacidadeTermicaJPorC: 100,
      taxaDanoTermicoPorSegundo: 0.1,
    });
    objeto.aplicarEnergiaTermicaPeloCore(10_000, 1);
    expect(objeto.temperaturaC).toBeCloseTo(120, 10);
    expect(objeto.integridadeEstrutural).toBeLessThan(1);
    expect(objeto.integridadeEstrutural).toBeGreaterThan(0);
  });
});
