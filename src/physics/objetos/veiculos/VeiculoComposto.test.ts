import { describe, expect, it } from 'vitest';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { Vetor3 } from '../../Vetor3';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { Bateria } from '../fontes-de-energia/Bateria';
import { Propulsor } from '../propulsao/Propulsor';
import { VeiculoComposto } from './VeiculoComposto';

const criarVeiculoComposto = () => {
  const veiculo = new VeiculoComposto({
    id: 'corpo-central', massaBaseKg: 100, dimensoesM: new Vetor3(4, 1, 1),
    resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
    estadoInicial: { posicaoM: new Vetor3(0, 10, 0) },
  });
  const tanque = new TanquePropelente({
    id: 'tanque-central', massaBaseKg: 20, capacidadePropelenteKg: 40, massaPropelenteInicialKg: 40, tipoPropelente: 'metano',
    dimensoesM: new Vetor3(2, 2, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
    estadoInicial: { posicaoM: new Vetor3(0, 12, 0) },
  });
  const criarPropulsor = (id: string, x: number) => new Propulsor({
    id, massaBaseKg: 10, empuxoMaximoN: 1_000, vazaoMaximaKgS: 1, propelenteCompativel: 'metano',
    dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
    estadoInicial: { posicaoM: new Vetor3(x, 9, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
  });
  const propulsorA = criarPropulsor('propulsor-a', -1.5);
  const propulsorB = criarPropulsor('propulsor-b', 1.5);
  const bateria = new Bateria({ id: 'bateria-central', massaBaseKg: 20, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, tensaoNominalV: 28, capacidadeEnergiaJ: 100_000, energiaInicialJ: 100_000, estadoInicial: { posicaoM: new Vetor3(0, 11, 0) } });
  propulsorA.conectarTanque(tanque);
  propulsorB.conectarTanque(tanque);
  propulsorA.conectarBateria(bateria);
  propulsorB.conectarBateria(bateria);
  for (const modulo of [tanque, bateria, propulsorA, propulsorB]) veiculo.adicionarModulo(modulo);
  veiculo.instalarPropulsor(propulsorA);
  veiculo.instalarPropulsor(propulsorB);
  let cargaDoFixadorB = 0;
  const fixadores = [
    new FixadorEstrutural({ id: 'fixador-tanque', objetoA: veiculo, objetoB: tanque, resistenciaTracaoN: 100_000, obterEsforcoSolicitadoN: () => 0 }),
    new FixadorEstrutural({ id: 'fixador-bateria', objetoA: veiculo, objetoB: bateria, resistenciaTracaoN: 100_000, obterEsforcoSolicitadoN: () => 0 }),
    new FixadorEstrutural({ id: 'fixador-a', objetoA: veiculo, objetoB: propulsorA, resistenciaTracaoN: 100_000, obterEsforcoSolicitadoN: () => 0 }),
    new FixadorEstrutural({ id: 'fixador-b', objetoA: veiculo, objetoB: propulsorB, resistenciaTracaoN: 100, obterEsforcoSolicitadoN: () => cargaDoFixadorB }),
  ];
  for (const fixador of fixadores) veiculo.adicionarFixador(fixador);
  return { veiculo, tanque, propulsorA, propulsorB, fixadorB: fixadores[3], romperFixadorB: () => { cargaDoFixadorB = 101; } };
};

describe('VeiculoComposto', () => {
  it('exige massa estrutural positiva para o corpo central físico', () => {
    expect(() => new VeiculoComposto({
      id: 'fachada-sem-corpo', massaBaseKg: 0, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 1, limiteTermicoC: 100,
    })).toThrow('Massa base deve ser positiva.');
  });

  it('coordena dois propulsores simétricos sem criar rotação artificial no conjunto', () => {
    const { veiculo, tanque, propulsorA, propulsorB } = criarVeiculoComposto();
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    veiculo.registrarNoMundo(mundo);

    expect(veiculo.massaInstantaneaDoConjuntoKg).toBe(200);
    expect(veiculo.obterObjetosFisicosConectados()).toHaveLength(5);
    expect(veiculo.solicitarIgnicaoDosPropulsores().every((resultado) => resultado.aceito)).toBe(true);
    veiculo.definirThrottleDeTodosOsPropulsores(1);
    mundo.avancar(0.5);

    expect(propulsorA.empuxoAtualN).toBeGreaterThan(0);
    expect(propulsorB.empuxoAtualN).toBeGreaterThan(0);
    expect(tanque.massaPropelenteConsumidaKg).toBeGreaterThan(0);
    expect(veiculo.massaInstantaneaDoConjuntoKg).toBeLessThan(200);
    expect(veiculo.getEstadoFisico().orientacaoRad.z).toBeCloseTo(0, 10);
    expect(veiculo.getEstadoFisico().velocidadeAngularRadps.z).toBeCloseTo(0, 10);
  });

  it('preserva a subida quando a massa de propelente altera o centro de massa', () => {
    const { veiculo } = criarVeiculoComposto();
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    veiculo.registrarNoMundo(mundo);
    const altitudeInicialM = veiculo.getEstadoFisico().posicaoM.y;

    veiculo.solicitarIgnicaoDosPropulsores();
    veiculo.definirThrottleDeTodosOsPropulsores(1);
    mundo.avancar(10);

    expect(veiculo.getEstadoFisico().posicaoM.y).toBeGreaterThan(altitudeInicialM);
    expect(veiculo.getEstadoFisico().velocidadeMps.y).toBeGreaterThan(0);
  });

  it('expõe instrumentação do casco a partir do GPS e do sensor de nível', () => {
    const { veiculo } = criarVeiculoComposto();
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    veiculo.registrarNoMundo(mundo);
    const dtS = 1 / 240;
    mundo.avancar(dtS);
    const posicaoAnterior = veiculo.getEstadoFisico().posicaoM;
    mundo.avancar(dtS);
    const posicaoAtual = veiculo.getEstadoFisico().posicaoM;

    const leituras = veiculo.obterLeiturasDosSensores();
    expect(leituras.posicaoGpsM.x).toBeCloseTo(veiculo.getEstadoFisico().posicaoM.x, 12);
    expect(leituras.posicaoGpsM.y).toBeCloseTo(veiculo.getEstadoFisico().posicaoM.y, 12);
    expect(leituras.altitudeM).toBeCloseTo(leituras.posicaoGpsM.y, 12);
    expect(leituras.velocidadeVerticalMps).toBeCloseTo((posicaoAtual.y - posicaoAnterior.y) / dtS, 10);
    expect(leituras.velocidadeHorizontalMps).toBeCloseTo(0, 8);
    expect(leituras.inclinacaoRad).toBeCloseTo(veiculo.getEstadoFisico().orientacaoRad.z, 12);
    expect(veiculo.obterLeiturasDoComputadorDeVoo()).toEqual(leituras);
  });

  it('remove módulo rompido da massa e do centro de massa do conjunto', () => {
    const { veiculo, propulsorB, fixadorB, romperFixadorB } = criarVeiculoComposto();
    const mundo = new MundoFisico(1 / 240);
    veiculo.registrarNoMundo(mundo);
    const centroAntes = veiculo.centroDeMassaDoConjuntoM;

    romperFixadorB();
    mundo.avancar(1 / 240);

    expect(fixadorB.estaRompido).toBe(true);
    expect(veiculo.obterObjetosFisicosConectados()).not.toContain(propulsorB);
    expect(veiculo.massaInstantaneaDoConjuntoKg).toBe(190);
    expect(veiculo.centroDeMassaDoConjuntoM.x).toBeLessThan(centroAntes.x);
  });
});
