import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../../MundoFisico';
import { Objeto } from '../base/Objeto';
import { Propulsor, TENSAO_ALIMENTACAO_PADRAO_PROPULSOR_V } from './Propulsor';
import { EstadoOperacional } from '../../SistemaOperacional';
import { SuperficiePlano } from '../../SuperficiePlano';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { Bateria } from '../fontes-de-energia/Bateria';
import { Vetor3 } from '../../Vetor3';
import { VeiculoTerrestre } from '../veiculos/VeiculoTerrestre';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';

const criarBateria = (energiaInicialJ = 100_000) => new Bateria({ id: `bateria-${energiaInicialJ}`, massaBaseKg: 20, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, tensaoNominalV: 28, capacidadeEnergiaJ: 100_000, energiaInicialJ });
const criarPropulsor = () => {
  const propulsor = new Propulsor({ id: 'propulsor', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, coeficienteAtritoEntreObjetos: 0.65, empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano' });
  propulsor.conectarBateria(criarBateria(), 1_000);
  return propulsor;
};
const criarTanque = (massa = 20) => new TanquePropelente({ id: `tanque-${massa}`, massaBaseKg: 200, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, tipoPropelente: 'metano', capacidadePropelenteKg: 20, massaPropelenteInicialKg: massa });
const prepararParaIgnicao = (propulsor: Propulsor, tanque = criarTanque()) => {
  propulsor.conectarTanque(tanque);
  expect(propulsor.ligarSistema('elétrico')).toBe(true);
  expect(propulsor.ligarSistema('hidráulico')).toBe(true);
  expect(propulsor.ligarSistema('combustível')).toBe(true);
  expect(propulsor.ligarSistema('controle')).toBe(true);
  return tanque;
};

describe('Propulsor', () => {
  it('declara tensão nominal padrão, que pode ser configurada e valida em volts', () => {
    expect(criarPropulsor().tensaoAlimentacaoNominalV).toBe(TENSAO_ALIMENTACAO_PADRAO_PROPULSOR_V);
    const propulsor48V = new Propulsor({
      id: 'propulsor-48v', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano', tensaoAlimentacaoNominalV: 48,
    });
    expect(propulsor48V.tensaoAlimentacaoNominalV).toBe(48);
    expect(() => new Propulsor({
      id: 'propulsor-tensao-invalida', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano', tensaoAlimentacaoNominalV: 0,
    })).toThrow('Tensão nominal de alimentação do propulsor inválida.');
  });

  it('sem fonte elétrica conectada não liga, não ignita nem produz empuxo', () => {
    const propulsor = new Propulsor({
      id: 'propulsor-sem-fonte', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano',
    });
    propulsor.conectarTanque(criarTanque());
    propulsor.definirThrottle(1);
    expect(propulsor.ligarSistema('elétrico')).toBe(false);
    expect(propulsor.diagnosticoOperacional).toContain('não é possível ligar elétrico: alimentação elétrica indisponível');
    expect(propulsor.solicitarIgnicao()).toBe(false);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(0);
  });

  it('não gera potência térmica nem jato sem ignição e empuxo efetivos', () => {
    const propulsor = new Propulsor({
      id: 'propulsor-termico-sem-ignicao', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, potenciaTermicaMaximaW: 3_000_000, propelenteCompativel: 'metano',
    });
    propulsor.definirThrottle(1);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(0);
    expect(propulsor.potenciaTermicaAtualW).toBe(0);
    expect(propulsor.obterJatoTermico()).toBeUndefined();
  });

  it('consome a carga finita da bateria e corta o empuxo quando ela descarrega', () => {
    const propulsor = new Propulsor({
      id: 'propulsor-bateria-finita', massaBaseKg: 1_000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 20_000, vazaoMaximaKgS: 2, propelenteCompativel: 'metano', potenciaEletricaMaximaW: 1_000,
    });
    const bateria = criarBateria(500);
    propulsor.conectarTanque(criarTanque());
    propulsor.conectarBateria(bateria);
    prepararParaIgnicao(propulsor);
    propulsor.definirThrottle(1);
    expect(propulsor.solicitarIgnicao()).toBe(true);
    propulsor.prepararPassoOperacional(1);
    expect(bateria.energiaArmazenadaJ).toBe(0);
    expect(propulsor.empuxoAtualN).toBe(10_000);
    expect(propulsor.estaIgnitado).toBe(false);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(0);
  });

  it('rejeita bateria de tensão incompatível e rompe o cabo quando ela se afasta', () => {
    const propulsor = criarPropulsor();
    expect(() => propulsor.conectarBateria(new Bateria({
      id: 'bateria-48v', massaBaseKg: 20, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000,
      tensaoNominalV: 48, capacidadeEnergiaJ: 1_000, energiaInicialJ: 1_000,
    }))).toThrow('Tensão da bateria incompatível.');
    const bateriaDistante = criarBateria();
    propulsor.conectarBateria(bateriaDistante, 10);
    propulsor.conectarTanque(criarTanque());
    prepararParaIgnicao(propulsor);
    propulsor.definirThrottle(1);
    propulsor.solicitarIgnicao();
    bateriaDistante.atualizarEstadoPeloCore({ ...bateriaDistante.getEstadoFisico(), posicaoM: new Vetor3(10.01, 0, 0) });
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.caboEletricoEstaRompido).toBe(true);
    expect(propulsor.empuxoAtualN).toBe(0);
  });

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
    const parede = new Objeto({ id: 'parede-10000kg', massaBaseKg: 10_000, dimensoesM: new Vetor3(1, 3, 3), resistenciaColisaoJ: 500_000, limiteTermicoC: 1_000, estadoInicial: { posicaoM: new Vetor3(3, 1.5, 0) } });
    mundo.registrarSuperficie(solo); mundo.registrarObjeto(propulsor); mundo.registrarObjeto(parede);
    let maiorVelocidadePositivaMps = 0;
    for (let passo = 0; passo < 240; passo += 1) {
      mundo.avancar(1 / 240);
      maiorVelocidadePositivaMps = Math.max(maiorVelocidadePositivaMps, parede.getEstadoFisico().velocidadeMps.x);
    }
    expect(maiorVelocidadePositivaMps).toBeGreaterThan(0);
    expect(parede.getEstadoFisico().posicaoM.x).toBeGreaterThan(3);
  });

  it('sofre dano estrutural ao atingir uma barreira após acelerar por empuxo', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    const propulsor = criarPropulsor();
    propulsor.atualizarEstadoPeloCore({ ...propulsor.getEstadoFisico(), posicaoM: new Vetor3(-50, 10, 0) });
    const tanque = prepararParaIgnicao(propulsor);
    propulsor.conectarTanque(tanque, 1_000);
    propulsor.definirThrottle(1);
    expect(propulsor.solicitarIgnicao()).toBe(true);
    const barreira = new Objeto({
      id: 'barreira-destrutiva', massaBaseKg: 100_000_000, dimensoesM: new Vetor3(1, 10, 1), resistenciaColisaoJ: 10_000_000, limiteTermicoC: 1_000,
      estadoInicial: { posicaoM: new Vetor3(0, 10, 0) },
    });
    mundo.registrarObjeto(propulsor);
    mundo.registrarObjeto(barreira);

    mundo.avancar(3);

    expect(propulsor.integridadeEstrutural).toBeLessThan(1);
    expect(barreira.integridadeEstrutural).toBe(1);
  });

  it('perde eficiência progressivamente por dano e falha ao perder toda integridade', () => {
    const propulsor = criarPropulsor();
    prepararParaIgnicao(propulsor);
    propulsor.definirThrottle(1);
    expect(propulsor.solicitarIgnicao()).toBe(true);
    propulsor.aplicarDanoPorImpacto(150_000);

    propulsor.prepararPassoOperacional(1);

    expect(propulsor.integridadeEstrutural).toBeCloseTo(0.5);
    expect(propulsor.eficienciaPorIntegridade).toBeCloseTo(0.5);
    expect(propulsor.empuxoAtualN).toBeCloseTo(10_000);

    propulsor.aplicarDanoPorImpacto(200_000);
    propulsor.prepararPassoOperacional(1);

    expect(propulsor.estaEstruturalmenteInoperante).toBe(true);
    expect(propulsor.empuxoAtualN).toBe(0);
    expect(propulsor.estaIgnitado).toBe(false);
    expect(propulsor.solicitarIgnicao()).toBe(false);
  });

  it('move um veículo passivo por atrito quando está apenas apoiado sobre ele', () => {
    const mundo = new MundoFisico(1 / 240);
    const solo = new SuperficiePlano('solo-veiculo-propulsor', 'concreto', 0, 1_000_000, 0.02, 0.9);
    const veiculo = new VeiculoTerrestre({
      id: 'veiculo-passivo', massaBaseKg: 1_500, dimensoesM: new Vetor3(4, 1.5, 1.8), resistenciaColisaoJ: 50_000, limiteTermicoC: 1_000,
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

  it('desliza uma bancada sem fundação quando o empuxo supera o atrito com o concreto', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    const concreto = new SuperficiePlano('concreto-bancada-livre-teste', 'concreto', 0, 1_000_000, 0.65, 0.65);
    const bancada = new Objeto({
      id: 'bancada-livre-teste', massaBaseKg: 500, dimensoesM: new Vetor3(5, 1, 1), resistenciaColisaoJ: 1_000_000,
      limiteTermicoC: 1_000, coeficienteAtrito: 0.65, estadoInicial: { posicaoM: new Vetor3(0, 0.5, 0) },
    });
    const propulsor = criarPropulsor();
    propulsor.atualizarEstadoPeloCore({ ...propulsor.getEstadoFisico(), posicaoM: new Vetor3(0, 1.5, 0) });
    const tanque = prepararParaIgnicao(propulsor);
    tanque.atualizarEstadoPeloCore({ ...tanque.getEstadoFisico(), posicaoM: new Vetor3(1.5, 1.5, 0) });
    propulsor.definirThrottle(1);
    expect(propulsor.solicitarIgnicao()).toBe(true);
    const fixadorMotor = new FixadorEstrutural({ id: 'fixador-motor-bancada-livre-teste', objetoA: bancada, objetoB: propulsor, resistenciaTracaoN: 50_000, obterEsforcoSolicitadoN: () => propulsor.empuxoAtualN });
    const fixadorTanque = new FixadorEstrutural({ id: 'fixador-tanque-bancada-livre-teste', objetoA: bancada, objetoB: tanque, resistenciaTracaoN: 50_000, obterEsforcoSolicitadoN: () => 0 });
    mundo.registrarSuperficie(concreto);
    mundo.registrarObjeto(bancada); mundo.registrarObjeto(propulsor); mundo.registrarObjeto(tanque);
    mundo.registrarFixador(fixadorMotor); mundo.registrarFixador(fixadorTanque);

    mundo.avancar(1);

    expect(fixadorMotor.estaRompido).toBe(false);
    expect(bancada.getEstadoFisico().posicaoM.x).toBeGreaterThan(0.01);
    expect(bancada.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(0);
  });
  it.each(['abrirInterruptor', 'desconectar', 'romper'] as const)('corta ignição, combustível e empuxo pela conexão elétrica: %s', (acao) => {
    const propulsor = criarPropulsor(); const tanque = prepararParaIgnicao(propulsor);
    propulsor.definirThrottle(1); expect(propulsor.solicitarIgnicao()).toBe(true);
    propulsor.prepararPassoOperacional(0.01);
    const massa = tanque.massaPropelenteKg;
    const energia = propulsor.bateriaConectada!.energiaArmazenadaJ;
    propulsor.conexaoEletrica![acao](); propulsor.prepararPassoOperacional(0.01);
    expect(propulsor.empuxoAtualN).toBe(0);
    expect(propulsor.estaIgnitado).toBe(false);
    expect(propulsor.sistemaEstaOperacional('elétrico')).toBe(false);
    expect(propulsor.sistemaEstaOperacional('combustível')).toBe(false);
    expect(tanque.massaPropelenteKg).toBe(massa);
    expect(propulsor.bateriaConectada!.energiaArmazenadaJ).toBe(energia);
  });
  it('rompe o cabo por alcance mesmo com o propulsor desligado', () => {
    const propulsor = criarPropulsor(); const bateria = criarBateria();
    propulsor.conectarBateria(bateria, 1);
    bateria.atualizarEstadoPeloCore({ ...bateria.getEstadoFisico(), posicaoM: new Vetor3(10, 0, 0) });
    propulsor.prepararPassoOperacional(0.01);
    expect(propulsor.caboEletricoEstaRompido).toBe(true);
    expect(propulsor.ligarSistema('elétrico')).toBe(false);
  });

});
