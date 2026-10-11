import { describe, expect, it } from 'vitest';
import { SistemaAtmosferico } from './SistemaAtmosferico';
import { SistemaTermico } from './SistemaTermico';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { AletaAerodinamica } from '../objetos/componentes/AletaAerodinamica';
import { Bateria } from '../objetos/fontes-de-energia/Bateria';
import { Vetor3 } from '../Vetor3';

const DT = 1 / 240;
// Mesmos material e limite térmico dos ensaios existentes do core.
const base = { massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000 };
const atmosfera = new SistemaAtmosferico(1.225, Vetor3.zero);

describe('M4 — atmosfera e térmica compartilhadas', () => {
  // Referências hidrostáticas das duas primeiras camadas U.S. Standard Atmosphere 1976.
  // A altitude geométrica é aproximada pela geopotencial nesta implementação.
  it.each([[0, 1.225], [11_000, 0.363918], [15_000, 0.193674]])('densidade em %s m: %s kg/m³', (h, referencia) => {
    expect(atmosfera.obterDensidadeArKgM3(h)).toBeCloseTo(referencia, 5);
  });

  it('mantém continuidade na tropopausa, decaimento e escala de densidade configurada', () => {
    const antes = atmosfera.obterDensidadeArKgM3(11_000 - 0.001);
    const depois = atmosfera.obterDensidadeArKgM3(11_000 + 0.001);
    expect(Math.abs(antes - depois)).toBeLessThan(2e-7);
    expect(atmosfera.obterDensidadeArKgM3(15_000)).toBeLessThan(depois);
    expect(atmosfera.obterDensidadeArKgM3(-10)).toBe(1.225);
    expect(new SistemaAtmosferico(0.6125, Vetor3.zero).obterDensidadeArKgM3(15_000))
      .toBeCloseTo(atmosfera.obterDensidadeArKgM3(15_000) / 2, 12);
    expect(() => atmosfera.obterDensidadeArKgM3(NaN)).toThrow();
    expect(() => new SistemaAtmosferico(-1, Vetor3.zero)).toThrow();
  });

  it.each([0, 11_000, 15_000])('arrasto, aquecimento e aleta usam a mesma densidade local em %s m', (h) => {
    const vento = new Vetor3(5, 0, 0);
    const mundo = new MundoFisico(DT, { velocidadeArMps: vento });
    const bateria = new Bateria({ ...base, id: 'bateria', tensaoNominalV: 24, capacidadeEnergiaJ: 100_000, energiaInicialJ: 100_000,
      estadoInicial: { posicaoM: new Vetor3(0, h, 0) } });
    const aleta = new AletaAerodinamica({
      ...base, id: 'aleta', areaEfetivaM2: 4, coeficienteArrasto: 1.1, coeficienteSustentacaoPorRad: 2,
      fonteEletrica: bateria, operacaoAutorizada: () => true,
      deflexaoMaximaRad: 0.5, velocidadeAngularMaximaRadps: 1,
      potenciaNominalAtuadorW: 500, potenciaEmRepousoW: 5,
      estadoInicial: { posicaoM: new Vetor3(0, h, 0), velocidadeMps: new Vetor3(5, -100, 0) },
    });
    aleta.solicitarDeflexaoRad(0.1); aleta.prepararPassoOperacional(0.1);
    mundo.registrarObjeto(aleta);
    const ambiente = mundo.obterCondicoesAtmosfericas(aleta);
    const q = 0.5 * atmosfera.obterDensidadeArKgM3(h) * 100 ** 2;
    expect(ambiente.densidadeArKgM3).toBe(atmosfera.obterDensidadeArKgM3(h));
    const drag = mundo.obterForcaArrastoAtmosferico(aleta);
    expect(drag.y).toBeCloseTo(q * 4 * 1.1, 9);
    expect(aleta.obterForcasAerodinamicas(ambiente)[0]!.forcaN.x).toBeCloseTo(q * 4 * 2 * 0.1, 9);
    mundo.avancar(DT);
    expect(aleta.energiaTermicaAerodinamicaAcumuladaJ).toBeCloseTo(drag.y * 100 * aleta.fracaoAquecimentoAerodinamico * DT, 9);
    expect(aleta.integridadeEstrutural).toBe(1);
  });

  it.each([0, 11_000, 15_000])('troca ambiente escala com densidade em %s m, respeita temperatura em °C', (h) => {
    const corpo = new Objeto({ ...base, id: 'quente', temperaturaInicialC: 100, capacidadeTermicaJPorC: 1_000,
      areaTermicaM2: 2, coeficienteConveccaoWPorM2C: 10,
      estadoInicial: { posicaoM: new Vetor3(0, h, 0) } });
    new SistemaTermico(atmosfera, 20).atualizar([corpo], DT);
    const deltaT = 10 * 2 * (100 - 20) * atmosfera.obterDensidadeArKgM3(h) / 1.225 * DT / 1_000;
    expect(corpo.temperaturaC).toBeCloseTo(100 - deltaT, 12);
  });

  it('vácuo elimina arrasto, aquecimento por ar e convecção ambiente; geração interna permanece', () => {
    class CorpoComFonte extends Objeto { public override obterPotenciaTermicaGeradaW() { return 1_000; } }
    const mundo = new MundoFisico(DT, { densidadeAtmosfericaKgM3: 0 }); // Vácuo explícito.
    const corpo = new CorpoComFonte({ ...base, id: 'vacuo', temperaturaInicialC: 100, capacidadeTermicaJPorC: 1_000,
      areaTermicaM2: 2, coeficienteConveccaoWPorM2C: 10, estadoInicial: { velocidadeMps: new Vetor3(100, 0, 0) } });
    mundo.registrarObjeto(corpo);
    expect(mundo.obterForcaArrastoAtmosferico(corpo).magnitude).toBe(0);
    mundo.avancar(DT);
    expect(corpo.energiaTermicaAerodinamicaAcumuladaJ).toBe(0);
    expect(corpo.temperaturaC).toBeCloseTo(100 + DT, 12);
  });

  it('convecção pode aquecer ou resfriar sem atravessar equilíbrio em dt grande', () => {
    for (const temperaturaInicialC of [0, 100]) {
      const corpo = new Objeto({ ...base, id: 'equilibrio', temperaturaInicialC, capacidadeTermicaJPorC: 1,
        areaTermicaM2: 2, coeficienteConveccaoWPorM2C: 100 });
      new SistemaTermico(atmosfera, 20).atualizar([corpo], 1);
      expect(corpo.temperaturaC).toBe(20);
    }
    expect(() => new MundoFisico(DT, { temperaturaAmbienteC: NaN })).toThrow('Temperatura');
  });

  it('fluxo relativo aquece e degrada progressivamente até colapso térmico de forma reproduzível', () => {
    const executar = () => {
      const corpo = new Objeto({ ...base, id: 'exposto', capacidadeTermicaJPorC: 100, temperaturaInicialC: 990,
        areaFrontalM2: 1, coeficienteArrasto: 1, coeficienteConveccaoWPorM2C: 0,
        fracaoAquecimentoAerodinamico: 0.25, estadoInicial: { velocidadeMps: new Vetor3(1_000, 0, 0) } });
      const termico = new SistemaTermico(atmosfera, 20);
      const historico = [];
      // Ensaio térmico isolado com fluxo prescrito, sem alegar trajetória de reentrada.
      for (let i = 0; i < 20; i++) { termico.atualizar([corpo], DT); historico.push([corpo.temperaturaC, corpo.integridadeEstrutural]); }
      return historico;
    };
    const historico = executar();
    expect(historico[0]![1]).toBeGreaterThan(0);
    expect(historico[0]![1]).toBeLessThan(1);
    expect(historico.at(-1)![1]).toBe(0);
    expect(executar()).toEqual(historico);
  });
});
