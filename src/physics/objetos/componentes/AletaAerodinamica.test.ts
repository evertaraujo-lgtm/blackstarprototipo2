import { describe, expect, it } from 'vitest';
import { AletaAerodinamica } from './AletaAerodinamica';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';

const criarBateria = (id = 'bateria-aleta') => new Bateria({
  id, massaBaseKg: 10, dimensoesM: new Vetor3(0.5, 0.5, 0.5), resistenciaColisaoJ: 10_000,
  limiteTermicoC: 800, tensaoNominalV: 24, capacidadeEnergiaJ: 100_000, energiaInicialJ: 100_000,
});

const criarAleta = (fonteEletrica: Bateria, operacaoAutorizada: () => boolean = () => true) => new AletaAerodinamica({
  id: 'aleta-teste', massaBaseKg: 20, dimensoesM: new Vetor3(0.5, 1, 0.3),
  resistenciaColisaoJ: 10_000, limiteTermicoC: 800, areaEfetivaM2: 4,
  coeficienteSustentacaoPorRad: 2, coeficienteArrasto: 1.1,
  deflexaoMaximaRad: Math.PI / 6, velocidadeAngularMaximaRadps: 1,
  estadoInicial: { velocidadeMps: new Vetor3(0, -10, 0) },
  potenciaNominalAtuadorW: 500, potenciaEmRepousoW: 5, fonteEletrica, operacaoAutorizada,
});

describe('AletaAerodinamica', () => {
  it('limita curso e velocidade do atuador, e produz força lateral somente em fluxo atmosférico', () => {
    const bateria = criarBateria();
    const aleta = criarAleta(bateria);
    aleta.solicitarDeflexaoRad(Math.PI);
    aleta.prepararPassoOperacional(0.1);
    expect(aleta.deflexaoAtualRad).toBeCloseTo(0.1);
    const [forca] = aleta.obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero });
    expect(forca?.forcaN.x).toBeGreaterThan(0);
    expect(forca?.forcaN.y).toBe(0); // Arrasto é aplicado uma única vez pelo core.
    expect(aleta.obterForcasAerodinamicas({ densidadeArKgM3: 0, velocidadeArMps: Vetor3.zero })).toEqual([]);

    aleta.prepararPassoOperacional(10);
    expect(aleta.deflexaoAtualRad).toBeCloseTo(Math.PI / 6);
    expect(bateria.energiaConsumidaJ).toBeGreaterThan(0);
    aleta.aplicarDanoPorImpacto(20_000);
    expect(aleta.integridadeEstrutural).toBe(0);
    expect(aleta.obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero })).toEqual([]);
  });

  it('não move sem alimentação no circuito ou sem permissivo do sistema elétrico', () => {
    const bateria = criarBateria('bateria-aleta-sem-permissivo');
    let eletricaAutorizada = true;
    const aleta = criarAleta(bateria, () => eletricaAutorizada);
    aleta.solicitarDeflexaoRad(Math.PI / 6);
    aleta.conexaoEletrica.abrirInterruptor();
    aleta.prepararPassoOperacional(0.1);
    expect(aleta.deflexaoAtualRad).toBe(0);

    expect(aleta.conexaoEletrica.fecharInterruptor()).toBe(true);
    eletricaAutorizada = false;
    aleta.prepararPassoOperacional(0.1);
    expect(aleta.deflexaoAtualRad).toBe(0);
  });
});

describe('aleta — força líquida no core', () => {
  it.each([-0.1, 0, 0.1])('contabiliza um único arrasto e sustentação em deflexão %s rad', async (deflexao) => {
    const { MundoFisico } = await import('../../MundoFisico');
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const aleta = criarAleta(criarBateria());
    aleta.solicitarDeflexaoRad(deflexao);
    aleta.prepararPassoOperacional(0.1);
    mundo.registrarObjeto(aleta);
    const condicoes = mundo.obterCondicoesAtmosfericas(aleta);
    const velocidade = aleta.getEstadoFisico().velocidadeMps;
    const q = 0.5 * condicoes.densidadeArKgM3 * 10 ** 2;
    const arrasto = mundo.obterForcaArrastoAtmosferico(aleta);
    const sustentacao = aleta.obterForcasAerodinamicas(condicoes)[0]!.forcaN;
    const estadoAntes = aleta.getEstadoFisico();
    const cargas = mundo.obterCargasAerodinamicas([aleta], new Vetor3(0, 5, 0));
    expect(cargas.forcaN.x).toBeCloseTo(sustentacao.x, 10);
    expect(cargas.forcaN.y).toBeCloseTo(arrasto.y, 10);
    expect(cargas.torqueNm.z).toBeCloseTo(5 * sustentacao.x, 10);
    expect(aleta.getEstadoFisico()).toEqual(estadoAntes);
    expect(arrasto.y).toBeCloseTo(q * 4 * 1.1, 10);
    expect(sustentacao.x).toBeCloseTo(q * 4 * 2 * deflexao, 10);
    expect(sustentacao.y).toBeCloseTo(0, 12);
    mundo.avancar(1 / 240);
    const depois = aleta.getEstadoFisico().velocidadeMps;
    expect((depois.y - velocidade.y) * 240).toBeCloseTo(-9.80665 + arrasto.y / aleta.massaKg, 8);
    expect((depois.x - velocidade.x) * 240).toBeCloseTo(sustentacao.x / aleta.massaKg, 8);
  });
  it('não produz força com fluxo nulo ou vácuo e mantém sustentação perpendicular ao vento relativo', async () => {
    const { MundoFisico } = await import('../../MundoFisico');
    const aleta = criarAleta(criarBateria());
    aleta.solicitarDeflexaoRad(0.1);
    aleta.prepararPassoOperacional(0.1);
    for (const configuracao of [
      { densidadeAtmosfericaKgM3: 0, velocidadeArMps: Vetor3.zero }, // Vácuo explícito.
      { densidadeAtmosfericaKgM3: 1.225, velocidadeArMps: new Vetor3(0, -10, 0) },
    ]) {
      const mundo = new MundoFisico(1 / 240, configuracao);
      mundo.registrarObjeto(aleta);
      expect(mundo.obterForcaArrastoAtmosferico(aleta).magnitude).toBe(0);
      expect(aleta.obterForcasAerodinamicas(mundo.obterCondicoesAtmosfericas(aleta))).toEqual([]);
    }
    const condicoes = { densidadeArKgM3: 0.6, velocidadeArMps: new Vetor3(5, 0, 0) };
    const sustentacao = aleta.obterForcasAerodinamicas(condicoes)[0]!.forcaN;
    const fluxo = aleta.getEstadoFisico().velocidadeMps.subtrair(condicoes.velocidadeArMps);
    expect(sustentacao.produtoEscalar(fluxo)).toBeCloseTo(0, 10);
  });
});
