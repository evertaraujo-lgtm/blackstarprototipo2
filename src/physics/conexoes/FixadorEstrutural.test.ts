import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../MundoFisico';
import { Propulsor } from '../objetos/propulsao/Propulsor';
import { TanquePropelente } from '../objetos/propulsao/TanquePropelente';
import { VeiculoTerrestre } from '../objetos/veiculos/VeiculoTerrestre';
import { SuperficiePlano } from '../SuperficiePlano';
import { Vetor3 } from '../Vetor3';
import { FixadorEstrutural } from './FixadorEstrutural';

const criarConjunto = (resistenciaTracaoN: number) => {
  const mundo = new MundoFisico(1 / 240);
  const veiculo = new VeiculoTerrestre({ id: `veiculo-${resistenciaTracaoN}`, massaBaseKg: 1_500, dimensoesM: new Vetor3(4, 1.5, 1), resistenciaColisaoJ: 50_000, limiteTermicoC: 1_000, quantidadeRodas: 4, forcaTracaoMaximaN: 4_500, forcaFrenagemMaximaN: 9_000, coeficienteAderenciaPneus: 0.9, estadoInicial: { posicaoM: new Vetor3(0, 0.75, 0) } });
  const propulsor = new Propulsor({ id: `propulsor-${resistenciaTracaoN}`, massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano', estadoInicial: { posicaoM: new Vetor3(0, 2, 0) } });
  const tanque = new TanquePropelente({ id: `tanque-${resistenciaTracaoN}`, massaBaseKg: 200, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, tipoPropelente: 'metano', capacidadePropelenteKg: 20, massaPropelenteInicialKg: 20, estadoInicial: { posicaoM: new Vetor3(-2, 0.5, 0) } });
  propulsor.conectarTanque(tanque, 20); propulsor.definirThrottle(1);
  propulsor.ligarSistema('elétrico'); propulsor.ligarSistema('hidráulico'); propulsor.ligarSistema('combustível'); propulsor.ligarSistema('controle'); propulsor.solicitarIgnicao();
  const fixador = new FixadorEstrutural({ id: `fixador-${resistenciaTracaoN}`, objetoA: veiculo, objetoB: propulsor, resistenciaTracaoN, obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN });
  mundo.registrarSuperficie(new SuperficiePlano(`solo-${resistenciaTracaoN}`, 'concreto', 0, 1_000_000, 0.02, 0.9));
  mundo.registrarObjeto(veiculo); mundo.registrarObjeto(propulsor); mundo.registrarObjeto(tanque); mundo.registrarFixador(fixador);
  return { mundo, veiculo, propulsor, fixador };
};

describe('FixadorEstrutural', () => {
  it('mantém veículo e propulsor como conjunto quando suporta o empuxo', () => {
    const { mundo, veiculo, propulsor, fixador } = criarConjunto(25_000);
    mundo.avancar(0.5);
    expect(fixador.estaRompido).toBe(false);
    const velocidadeDoCentroDeMassa = veiculo.getEstadoFisico().velocidadeMps.multiplicar(veiculo.massaKg / (veiculo.massaKg + propulsor.massaKg))
      .adicionar(propulsor.getEstadoFisico().velocidadeMps.multiplicar(propulsor.massaKg / (veiculo.massaKg + propulsor.massaKg)));
    expect(velocidadeDoCentroDeMassa.x).toBeGreaterThan(0.1);
    expect(propulsor.getEstadoFisico().velocidadeAngularRadps.z).toBeCloseTo(veiculo.getEstadoFisico().velocidadeAngularRadps.z, 8);
  });

  it('rompe antes de transmitir empuxo acima da resistência declarada', () => {
    const { mundo, veiculo, propulsor, fixador } = criarConjunto(10_000);
    mundo.avancar(0.1);
    expect(fixador.estaRompido).toBe(true);
    expect(propulsor.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(veiculo.getEstadoFisico().velocidadeMps.x);
  });

  it('converte força fora do centro de massa em rotação comum do conjunto', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    const tanque = new TanquePropelente({
      id: 'tanque-excentrico-teste', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
      tipoPropelente: 'metano', capacidadePropelenteKg: 1, massaPropelenteInicialKg: 0, estadoInicial: { posicaoM: new Vetor3(0, 10, 0) },
    });
    const propulsor = new Propulsor({
      id: 'propulsor-excentrico-teste', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 10_000, vazaoMaximaKgS: 1, propelenteCompativel: 'metano', estadoInicial: { posicaoM: new Vetor3(1, 10, 0) },
    });
    const fixador = new FixadorEstrutural({ id: 'fixador-excentrico-teste', objetoA: tanque, objetoB: propulsor, resistenciaTracaoN: 20_000, obterEsforcoSolicitadoN: () => 10_000 });
    mundo.registrarObjeto(tanque);
    mundo.registrarObjeto(propulsor);
    mundo.registrarFixador(fixador);
    mundo.aplicarForca(propulsor, new Vetor3(0, 10_000, 0));

    mundo.avancar(1 / 240);

    const rotacaoTanque = tanque.getEstadoFisico().orientacaoRad.z;
    const rotacaoPropulsor = propulsor.getEstadoFisico().orientacaoRad.z;
    expect(fixador.estaRompido).toBe(false);
    expect(Math.abs(rotacaoTanque)).toBeGreaterThan(0.0001);
    expect(rotacaoPropulsor).toBeCloseTo(rotacaoTanque, 10);
    expect(propulsor.getEstadoFisico().velocidadeAngularRadps.z).toBeCloseTo(tanque.getEstadoFisico().velocidadeAngularRadps.z, 10);
  });

  it('transmite a massa do conjunto para o dano quando uma peça toca o solo', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    const solo = new SuperficiePlano('solo-impacto-conjunto', 'concreto', 0, 1_000_000, 0.02, 0.9);
    const tanque = new TanquePropelente({
      id: 'tanque-impacto-conjunto', massaBaseKg: 19_000, dimensoesM: new Vetor3(2, 2, 1), resistenciaColisaoJ: 1_000_000, limiteTermicoC: 1_000,
      tipoPropelente: 'metano', capacidadePropelenteKg: 1_000, massaPropelenteInicialKg: 1_000, estadoInicial: { posicaoM: new Vetor3(0, 3, 0), velocidadeMps: new Vetor3(0, -5, 0) },
    });
    const propulsor = new Propulsor({
      id: 'propulsor-impacto-conjunto', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 20_000, vazaoMaximaKgS: 1, propelenteCompativel: 'metano', estadoInicial: { posicaoM: new Vetor3(0, 0.5, 0), velocidadeMps: new Vetor3(0, -5, 0) },
    });
    const fixador = new FixadorEstrutural({ id: 'fixador-impacto-conjunto', objetoA: tanque, objetoB: propulsor, resistenciaTracaoN: 1_000_000, obterEsforcoSolicitadoN: () => 0 });
    mundo.registrarSuperficie(solo);
    mundo.registrarObjeto(tanque);
    mundo.registrarObjeto(propulsor);
    mundo.registrarFixador(fixador);

    mundo.avancar(1 / 240);

    expect(propulsor.integridadeEstrutural).toBeLessThan(1);
  });
});
