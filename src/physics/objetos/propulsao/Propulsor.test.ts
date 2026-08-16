import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../../MundoFisico';
import { Objeto } from '../base/Objeto';
import { Propulsor } from './Propulsor';
import { EstadoOperacional } from '../../SistemaOperacional';
import { SuperficiePlano } from '../../SuperficiePlano';
import { TanquePropelente } from './TanquePropelente';
import { Vetor3 } from '../../Vetor3';
import { VeiculoTerrestre } from '../veiculos/VeiculoTerrestre';

const criarPropulsor = () => new Propulsor({ id: 'propulsor', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000, coeficienteAtritoEntreObjetos: 0.65, empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano' });
const criarTanque = (massa = 20) => new TanquePropelente({ id: `tanque-${massa}`, massaBaseKg: 200, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, resistenciaCalorK: 1_000, tipoPropelente: 'metano', capacidadePropelenteKg: 20, massaPropelenteInicialKg: massa });
const prepararParaIgnicao = (propulsor: Propulsor, tanque = criarTanque()) => {
  propulsor.conectarTanque(tanque);
  expect(propulsor.ligarSistema('elétrico')).toBe(true);
  expect(propulsor.ligarSistema('hidráulico')).toBe(true);
  expect(propulsor.ligarSistema('combustível')).toBe(true);
  expect(propulsor.ligarSistema('controle')).toBe(true);
  return tanque;
};

describe('Propulsor', () => {
  it.each([0.25, 0.5, 1])('gera empuxo proporcional ao throttle de %s', (throttle) => {
    const propulsor = criarPropulsor(); const tanque = prepararParaIgnicao(propulsor); propulsor.definirThrottle(throttle); expect(propulsor.solicitarIgnicao()).toBe(true);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBeCloseTo(20_000 * throttle, 10);
    expect(tanque.massaPropelenteKg).toBeCloseTo(20 - (2 * throttle), 10);
  });

  it('não gera empuxo sem propelente ou com sistema obrigatório em falha', () => {
    const semCombustivel = criarPropulsor(); prepararParaIgnicao(semCombustivel, criarTanque(0)); semCombustivel.definirThrottle(1); expect(semCombustivel.solicitarIgnicao()).toBe(false); semCombustivel.prepararPassoOperacional(1);
    expect(semCombustivel.empuxoAtualN).toBe(0);
    const comFalha = criarPropulsor(); prepararParaIgnicao(comFalha); comFalha.definirEstadoDoSistema('elétrico', EstadoOperacional.Falha); comFalha.definirThrottle(1); comFalha.prepararPassoOperacional(1);
    expect(comFalha.empuxoAtualN).toBe(0);
    expect(comFalha.bloqueios).toContain('elétrico');
    expect(comFalha.diagnosticoOperacional).toContain('elétrico');
  });

  it('rompe a mangueira de 10 m e interrompe o empuxo quando o propulsor se afasta do tanque', () => {
    const propulsor = criarPropulsor(); const tanque = criarTanque();
    propulsor.conectarTanque(tanque, 10); propulsor.ligarSistema('elétrico'); propulsor.ligarSistema('hidráulico'); propulsor.ligarSistema('combustível'); propulsor.ligarSistema('controle'); propulsor.definirThrottle(1); propulsor.solicitarIgnicao();
    propulsor.atualizarEstadoPeloCore({ ...propulsor.getEstadoFisico(), posicaoM: new Vetor3(10.01, 0, 0) });
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.mangueiraEstaRompida).toBe(true);
    expect(propulsor.empuxoAtualN).toBe(0);
    expect(propulsor.obterEstadoDoSistema('combustível')).toBe(EstadoOperacional.Desligado);
    expect(propulsor.obterEstadoDoSistema('controle')).toBe(EstadoOperacional.Desligado);
    expect(propulsor.estaIgnitado).toBe(false);
    expect(propulsor.ligarSistema('combustível')).toBe(false);
    expect(propulsor.diagnosticoOperacional).toContain('não é possível ligar combustível: mangueira rompida');
    expect(tanque.massaPropelenteKg).toBe(20);
  });

  it('exige a sequência elétrica, hidráulica, combustível, controle e ignição', () => {
    const propulsor = criarPropulsor(); prepararParaIgnicao(propulsor);
    expect(propulsor.ligarSistema('controle')).toBe(true);
    propulsor.definirThrottle(1);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(0);
    expect(propulsor.diagnosticoOperacional).toContain('ignição não realizada');
    expect(propulsor.solicitarIgnicao()).toBe(true);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(20_000);
  });

  it('não permite ligar hidráulico sem elétrica e exige nova ignição após uma falha', () => {
    const propulsor = criarPropulsor();
    expect(propulsor.ligarSistema('hidráulico')).toBe(false);
    expect(propulsor.diagnosticoOperacional).toContain('não é possível ligar hidráulico: elétrico não está operacional');
    prepararParaIgnicao(propulsor); propulsor.definirThrottle(1); propulsor.solicitarIgnicao();
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(20_000);
    propulsor.definirEstadoDoSistema('elétrico', EstadoOperacional.Falha);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.estaIgnitado).toBe(false);
    expect(propulsor.obterEstadoDoSistema('hidráulico')).toBe(EstadoOperacional.Desligado);
    expect(propulsor.obterEstadoDoSistema('combustível')).toBe(EstadoOperacional.Desligado);
    expect(propulsor.obterEstadoDoSistema('controle')).toBe(EstadoOperacional.Desligado);
    propulsor.definirEstadoDoSistema('elétrico', EstadoOperacional.Operacional);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(0);
    expect(propulsor.solicitarIgnicao()).toBe(false);
    expect(propulsor.ligarSistema('hidráulico')).toBe(true);
    expect(propulsor.ligarSistema('combustível')).toBe(true);
    expect(propulsor.ligarSistema('controle')).toBe(true);
    expect(propulsor.solicitarIgnicao()).toBe(true);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(20_000);
  });

  it('empurra uma parede de 10000 kg por contato, sem qualquer fixação', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-propulsor', 'concreto', 0, 1_000_000, 0.02, 0.9);
    const propulsor = criarPropulsor();
    propulsor.atualizarEstadoPeloCore({ ...propulsor.getEstadoFisico(), posicaoM: new Vetor3(0, 0.5, 0) });
    const tanque = prepararParaIgnicao(propulsor); propulsor.definirThrottle(1); propulsor.solicitarIgnicao();
    const parede = new Objeto({ id: 'parede-10000kg', massaBaseKg: 10_000, dimensoesM: new Vetor3(1, 3, 3), resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_000, estadoInicial: { posicaoM: new Vetor3(3, 1.5, 0) } });
    mundo.registrarSuperficie(solo); mundo.registrarObjeto(propulsor); mundo.registrarObjeto(parede);
    let maiorVelocidadePositivaMps = 0;
    for (let passo = 0; passo < 240; passo += 1) {
      mundo.avancar(1 / 240);
      maiorVelocidadePositivaMps = Math.max(maiorVelocidadePositivaMps, parede.getEstadoFisico().velocidadeMps.x);
    }
    expect(maiorVelocidadePositivaMps).toBeGreaterThan(0);
    expect(parede.getEstadoFisico().posicaoM.x).toBeGreaterThan(3);
  });

  it('move um veículo passivo por atrito quando está apenas apoiado sobre ele', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-veiculo-propulsor', 'concreto', 0, 1_000_000, 0.02, 0.9);
    const veiculo = new VeiculoTerrestre({
      id: 'veiculo-passivo', massaBaseKg: 1_500, dimensoesM: new Vetor3(4, 1.5, 1.8), resistenciaColisaoJ: 50_000, resistenciaCalorK: 1_000,
      quantidadeRodas: 4, forcaTracaoMaximaN: 4_500, forcaFrenagemMaximaN: 9_000, coeficienteAderenciaPneus: 0.9, coeficienteResistenciaRolamento: 0.01, coeficienteAtritoEntreObjetos: 0.65,
      estadoInicial: { posicaoM: new Vetor3(0, 0.75, 0) },
    });
    const propulsor = criarPropulsor();
    propulsor.atualizarEstadoPeloCore({ ...propulsor.getEstadoFisico(), posicaoM: new Vetor3(0, 2, 0) });
    prepararParaIgnicao(propulsor); propulsor.definirThrottle(1); propulsor.solicitarIgnicao();
    mundo.registrarSuperficie(solo); mundo.registrarObjeto(veiculo); mundo.registrarObjeto(propulsor);
    mundo.avancar(1);

    expect(veiculo.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(0.05);
    expect(veiculo.getEstadoFisico().posicaoM.x).toBeGreaterThan(0.01);
    expect(propulsor.getEstadoFisico().posicaoM.x).toBeGreaterThan(veiculo.getEstadoFisico().posicaoM.x);
  });
});
