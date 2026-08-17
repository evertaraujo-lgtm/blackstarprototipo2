import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../../MundoFisico';
import { Objeto } from '../base/Objeto';
import { Vetor3 } from '../../Vetor3';
import { VeiculoTerrestre } from '../veiculos/VeiculoTerrestre';
import { Paraquedas } from './Paraquedas';

describe('Paraquedas', () => {
  it('compõe a massa do objeto e perde a capacidade de abertura ao exceder sua resistência', () => {
    const objeto = new Objeto({ id: 'carga-paraquedas', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000 });
    const paraquedas = new Paraquedas({ id: 'estrutural', areaFrontalM2: 8 });
    objeto.acoplarParaquedas(paraquedas);
    expect(objeto.massaKg).toBeCloseTo(11.6);
    objeto.configurarAreaDoParaquedas(12);
    expect(objeto.massaKg).toBeCloseTo(12.4);
    const estado = objeto.obterEstadoDoParaquedas();
    expect(estado).toMatchObject({ areaFrontalM2: 12, coeficienteArrasto: 1.5, resistenciaTracaoN: 9_600 });
    expect(estado?.massaKg).toBeCloseTo(2.4);
    expect(paraquedas.acionar()).toBe(true);
    paraquedas.aplicarCargaTracao(9_601);
    expect(paraquedas.integridadeEstrutural).toBe(0);
    expect(paraquedas.estaAberto).toBe(false);
    expect(paraquedas.acionar()).toBe(false);
  });

  it('aumenta o arrasto efetivo e reduz a velocidade vertical de queda quando aberto', () => {
    const criarObjeto = (id: string) => new Objeto({ id, massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, areaFrontalM2: 1, coeficienteArrasto: 1, estadoInicial: { posicaoM: new Vetor3(0, 1_000, 0) } });
    const semParaquedas = criarObjeto('sem-paraquedas');
    const comParaquedas = criarObjeto('com-paraquedas');
    comParaquedas.acoplarParaquedas(new Paraquedas({ id: 'principal', areaFrontalM2: 25 }));
    comParaquedas.acionarParaquedas();
    const mundoSem = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const mundoCom = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    mundoSem.registrarObjeto(semParaquedas); mundoCom.registrarObjeto(comParaquedas);
    mundoSem.avancar(3); mundoCom.avancar(3);
    expect(Math.abs(comParaquedas.getEstadoFisico().velocidadeMps.y)).toBeLessThan(Math.abs(semParaquedas.getEstadoFisico().velocidadeMps.y));
  });

  it('produz o mesmo arrasto com o estágio rotacionado quando o fluxo de ar é o mesmo', () => {
    const criarObjeto = (id: string, orientacaoRad: number) => {
      const objeto = new Objeto({
        id, massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
        areaFrontalM2: 1, coeficienteArrasto: 1,
        estadoInicial: { posicaoM: new Vetor3(0, 1_000, 0), velocidadeMps: new Vetor3(30, 0, 0), orientacaoRad: new Vetor3(0, 0, orientacaoRad) },
      });
      objeto.acoplarParaquedas(new Paraquedas({ id: `paraquedas-${id}`, areaFrontalM2: 25 }));
      objeto.acionarParaquedas();
      return objeto;
    };
    const semRotacao = criarObjeto('sem-rotacao', 0);
    const rotacionado = criarObjeto('rotacionado', Math.PI / 2);
    const mundoSemRotacao = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const mundoRotacionado = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    mundoSemRotacao.registrarObjeto(semRotacao); mundoRotacionado.registrarObjeto(rotacionado);
    mundoSemRotacao.avancar(1); mundoRotacionado.avancar(1);
    expect(semRotacao.getEstadoFisico().velocidadeMps.x).toBeLessThan(30);
    expect(rotacionado.getEstadoFisico().velocidadeMps.x).toBeCloseTo(semRotacao.getEstadoFisico().velocidadeMps.x, 10);
  });

  it('desacelera horizontalmente um veículo quando o paraquedas abre em atmosfera', () => {
    const criarVeiculo = (id: string) => new VeiculoTerrestre({
      id, massaBaseKg: 1_500, dimensoesM: new Vetor3(4, 1.5, 1.8), resistenciaColisaoJ: 50_000, limiteTermicoC: 1_000,
      quantidadeRodas: 4, forcaTracaoMaximaN: 4_500, forcaFrenagemMaximaN: 9_000, coeficienteAderenciaPneus: 0.9,
      estadoInicial: { posicaoM: new Vetor3(0, 100, 0), velocidadeMps: new Vetor3(30, 0, 0) },
    });
    const semParaquedas = criarVeiculo('veiculo-sem-paraquedas');
    const comParaquedas = criarVeiculo('veiculo-com-paraquedas');
    comParaquedas.acoplarParaquedas(new Paraquedas({ id: 'paraquedas-veiculo', areaFrontalM2: 8 }));
    comParaquedas.acionarParaquedas();
    const mundoSem = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const mundoCom = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    mundoSem.registrarObjeto(semParaquedas); mundoCom.registrarObjeto(comParaquedas);
    mundoSem.avancar(2); mundoCom.avancar(2);
    expect(comParaquedas.getEstadoFisico().velocidadeMps.x).toBeLessThan(semParaquedas.getEstadoFisico().velocidadeMps.x);
  });
});
