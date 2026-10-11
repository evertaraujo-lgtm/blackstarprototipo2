import { describe, expect, it } from 'vitest';
import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { MundoFisico } from '../MundoFisico';
import { Vetor3 } from '../Vetor3';
import { AletaAerodinamica } from '../objetos/componentes/AletaAerodinamica';
import { Bateria } from '../objetos/fontes-de-energia/Bateria';
import { PropulsorVetorizado } from '../objetos/propulsao/PropulsorVetorizado';
import { VeiculoComposto } from '../objetos/veiculos/VeiculoComposto';
import { ControladorGuiaPousoBss06 } from './ControladorGuiaPousoBss06';

const criarPropulsor = (): PropulsorVetorizado => new PropulsorVetorizado({
  id: 'bss06-guia-motor-teste', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1),
  resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, empuxoMaximoN: 40_000,
  vazaoMaximaKgS: 1, propelenteCompativel: 'metano',
  vetorizacao: { limiteAngularRad: 15 * Math.PI / 180, velocidadeAngularMaximaRadps: Math.PI },
});

const criarAleta = (posicaoM = Vetor3.zero): AletaAerodinamica => new AletaAerodinamica({
  id: 'bss06-guia-aleta-teste', massaBaseKg: 10, dimensoesM: new Vetor3(0.5, 1, 0.5),
  resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, areaEfetivaM2: 5,
  coeficienteSustentacaoPorRad: 2, coeficienteArrasto: 1, deflexaoMaximaRad: Math.PI / 7,
  velocidadeAngularMaximaRadps: Math.PI, potenciaNominalAtuadorW: 100, potenciaEmRepousoW: 1,
  fonteEletrica: new Bateria({
    id: 'bss06-guia-bateria-teste', massaBaseKg: 5, dimensoesM: new Vetor3(0.5, 0.5, 0.5),
    resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, tensaoNominalV: 24,
    capacidadeEnergiaJ: 10_000, energiaInicialJ: 10_000, estadoInicial: { posicaoM },
  }),
  estadoInicial: { posicaoM },
});

describe('ControladorGuiaPousoBss06', () => {
  it('comanda torque coordenado no gimbal e nas grid fins para inclinar em direção ao alvo', () => {
    const motor = criarPropulsor();
    const aleta = criarAleta();
    const controlador = new ControladorGuiaPousoBss06([aleta], motor, () => true);
    controlador.habilitar();
    const solicitacoes = controlador.atualizar({
      densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero,
      erroHorizontalM: 100, velocidadeHorizontalMps: 0, velocidadeVerticalMps: -30,
      orientacaoRad: 0, velocidadeAngularRadps: 0, massaKg: 1_000, empuxoN: 40_000,
    });

    expect(solicitacoes[0]?.valor).toBeGreaterThan(0);
    expect(motor.obterEstadoDaVetorizacao().anguloAlvoRad).toBe(0);
    expect(aleta.comandoAtualRad).toBeGreaterThan(0);
  });

  it('freia uma deriva para a direita quando o alvo permanece no ponto de origem', () => {
    const motor = criarPropulsor();
    const aleta = criarAleta();
    const controlador = new ControladorGuiaPousoBss06([aleta], motor, () => true);
    controlador.habilitar();
    const solicitacoes = controlador.atualizar({
      densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero,
      erroHorizontalM: 0, velocidadeHorizontalMps: 10, velocidadeVerticalMps: -30,
      orientacaoRad: 0, velocidadeAngularRadps: 0, massaKg: 1_000, empuxoN: 40_000,
    });

    expect(solicitacoes[0]?.valor).toBeLessThan(0);
    expect(aleta.comandoAtualRad).toBeLessThan(0);
    expect(Math.abs(aleta.comandoAtualRad)).toBeLessThan(Math.PI / 7);
  });

  it('reduz a deflexão de guia quando a pressão dinâmica cresce', () => {
    const motor = criarPropulsor();
    const aleta = criarAleta();
    const controlador = new ControladorGuiaPousoBss06([aleta], motor, () => true);
    controlador.habilitar();
    const leituras = {
      densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero,
      erroHorizontalM: 0, velocidadeHorizontalMps: 10, orientacaoRad: 0,
      velocidadeAngularRadps: 0, massaKg: 1_000, empuxoN: 40_000,
    };
    controlador.atualizar({ ...leituras, velocidadeVerticalMps: -80 });
    const deflexaoComVelocidadeModeradaRad = Math.abs(aleta.comandoAtualRad);
    controlador.atualizar({ ...leituras, velocidadeVerticalMps: -160 });

    expect(Math.abs(aleta.comandoAtualRad)).toBeLessThan(deflexaoComVelocidadeModeradaRad);
  });

  it('produz aceleração física na direção do alvo usando as grid fins', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const veiculo = new VeiculoComposto({
      id: 'bss06-guia-alvo-fisica', massaBaseKg: 1_000, dimensoesM: new Vetor3(2, 10, 1),
      resistenciaColisaoJ: 1_000_000, limiteTermicoC: 1_000, areaFrontalM2: 1, coeficienteArrasto: 0.5,
      estadoInicial: { posicaoM: new Vetor3(0, 100, 0), velocidadeMps: new Vetor3(0, -20, 0) },
    });
    const aleta = criarAleta(new Vetor3(0, 110, 0));
    veiculo.adicionarModulo(aleta);
    veiculo.adicionarFixador(new FixadorEstrutural({
      id: 'bss06-guia-alvo-fixador', objetoA: veiculo, objetoB: aleta,
      resistenciaTracaoN: 1_000_000, resistenciaCompressaoN: 1_000_000, obterEsforcoSolicitadoN: () => 0,
    }));
    veiculo.registrarNoMundo(mundo);
    const motor = criarPropulsor();
    const controlador = new ControladorGuiaPousoBss06([aleta], motor, () => true);
    controlador.habilitar();

    for (let passo = 0; passo < 240; passo += 1) {
      const estado = veiculo.getEstadoFisico();
      controlador.atualizar({
        densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero,
      erroHorizontalM: 20 - estado.posicaoM.x, velocidadeHorizontalMps: estado.velocidadeMps.x,
        velocidadeVerticalMps: estado.velocidadeMps.y, orientacaoRad: estado.orientacaoRad.z,
        velocidadeAngularRadps: estado.velocidadeAngularRadps.z, massaKg: veiculo.massaInstantaneaDoConjuntoKg,
        empuxoN: 40_000,
      });
      mundo.avancar(1 / 240);
    }

    expect(veiculo.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(0);
  });

  it('não aceita os comandos sem a cadeia elétrica e de controle autorizada', () => {
    const motor = criarPropulsor();
    const aleta = criarAleta();
    const controlador = new ControladorGuiaPousoBss06([aleta], motor, () => false);
    controlador.habilitar();
    controlador.atualizar({
      densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero,
      erroHorizontalM: 100, velocidadeHorizontalMps: 0, velocidadeVerticalMps: -30,
      orientacaoRad: 0, velocidadeAngularRadps: 0, massaKg: 1_000, empuxoN: 40_000,
    });

    expect(motor.obterEstadoDaVetorizacao().anguloAlvoRad).toBe(0);
    expect(aleta.comandoAtualRad).toBe(0);
  });

  it('mantém a atitude-alvo contínua quando o empuxo é cortado durante a descida', () => {
    const motor = criarPropulsor();
    const controlador = new ControladorGuiaPousoBss06([criarAleta()], motor, () => true);
    controlador.habilitar();
    const leituras = {
      densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero,
      erroHorizontalM: 0, velocidadeHorizontalMps: 0.05, velocidadeVerticalMps: -0.2,
      orientacaoRad: 0, velocidadeAngularRadps: 0, massaKg: 1_000,
    };
    controlador.atualizar({ ...leituras, empuxoN: 9_806.65 });
    const antesDoCorte = controlador.obterDiagnostico().gimbalSolicitadoRad;
    controlador.atualizar({ ...leituras, empuxoN: 0 });
    expect(controlador.obterDiagnostico().gimbalSolicitadoRad).toBeCloseTo(antesDoCorte, 10);
    expect(controlador.obterDiagnostico().empuxoDisponivelN).toBe(0);
    expect(Math.abs(antesDoCorte)).toBeLessThan(0.01);
  });
});

describe('guiagem — autoridade, sinais e transições', () => {
  const leitura = {
    erroHorizontalM: 0, velocidadeHorizontalMps: 0, velocidadeVerticalMps: -20,
    orientacaoRad: 0, velocidadeAngularRadps: 0, massaKg: 1_000, empuxoN: 10_000,
    densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero,
  };
  it.each([-1, 1])('corrige atitude e deriva de sinal %s, e não escreve no motor', (sinal) => {
    const motor = criarPropulsor();
    const guia = new ControladorGuiaPousoBss06([criarAleta()], motor, () => true);
    guia.habilitar();
    expect(guia.atualizar({ ...leitura, orientacaoRad: sinal * 0.1 })[0]!.valor * sinal).toBeGreaterThan(0);
    expect(guia.atualizar({ ...leitura, velocidadeHorizontalMps: sinal * 5 })[0]!.valor * sinal).toBeLessThan(0);
    expect(guia.obterDiagnostico().atitudeAlvoRad * sinal).toBeGreaterThan(0);
    expect(motor.obterEstadoDaVetorizacao().anguloAlvoRad).toBe(0);
  });
  it.each([[-100, -5], [-100, 5], [100, -5], [100, 5]])('valida os quadrantes x=%s e vx=%s', (erroHorizontalM, velocidadeHorizontalMps) => {
    const guia = new ControladorGuiaPousoBss06([], criarPropulsor(), () => true);
    guia.habilitar();
    guia.atualizar({ ...leitura, erroHorizontalM, velocidadeHorizontalMps });
    expect(Math.sign(guia.obterDiagnostico().aceleracaoHorizontalAlvoMps2)).toBe(Math.sign(erroHorizontalM * 0.12 - velocidadeHorizontalMps * 1.4));
    expect(Math.sign(guia.obterDiagnostico().atitudeAlvoRad)).toBe(-Math.sign(guia.obterDiagnostico().aceleracaoHorizontalAlvoMps2));
  });
  it('cede o gimbal na subida, no apogeu e ao voltar para decolagem, neutralizando as aletas', () => {
    const aleta = criarAleta();
    const guia = new ControladorGuiaPousoBss06([aleta], criarPropulsor(), () => true);
    guia.habilitar();
    guia.atualizar({ ...leitura, erroHorizontalM: 100 });
    expect(aleta.comandoAtualRad).not.toBe(0);
    for (const velocidadeVerticalMps of [20, 0, -0.05]) {
      expect(guia.atualizar({ ...leitura, velocidadeVerticalMps })).toEqual([]);
      expect(aleta.comandoAtualRad).toBe(0);
    }
    expect(guia.atualizar({ ...leitura, emModoPouso: false })).toEqual([]);
    expect(guia.atualizar({ ...leitura, atuadoresConectados: false })).toEqual([]);
    expect(guia.obterDiagnostico().fase).toBe('sem-vinculo');
  });
  it('usa densidade local e fluxo relativo para q e expõe saturação sem inventar empuxo', () => {
    const aleta = criarAleta();
    const guia = new ControladorGuiaPousoBss06([aleta], criarPropulsor(), () => true);
    guia.habilitar();
    const amostra = { ...leitura, velocidadeVerticalMps: -160, orientacaoRad: 0.5, empuxoN: 0 };
    guia.atualizar(amostra);
    const comandoDenso = Math.abs(aleta.comandoAtualRad);
    expect(guia.obterDiagnostico().pressaoDinamicaPa).toBeCloseTo(0.5 * 1.225 * 160 ** 2);
    expect(guia.obterDiagnostico().gimbalSaturado).toBe(true);
    expect(guia.obterDiagnostico().empuxoDisponivelN).toBe(0);
    guia.atualizar({ ...amostra, densidadeArKgM3: 0.3 });
    expect(Math.abs(aleta.comandoAtualRad)).toBeGreaterThan(comandoDenso);
    guia.atualizar({ ...amostra, velocidadeArMps: new Vetor3(0, -160, 0) });
    expect(guia.obterDiagnostico().pressaoDinamicaPa).toBe(0);
    expect(aleta.comandoAtualRad).toBe(0);
    guia.atualizar({ ...amostra, densidadeArKgM3: 0 });
    expect(aleta.comandoAtualRad).toBe(0);
  });
});

describe('guiagem — compensação de forças e torque reais', () => {
  it('equilibra o torque no braço inferior e conserva a direção desejada do empuxo', () => {
    const motor = criarPropulsor();
    const guia = new ControladorGuiaPousoBss06([], motor, () => true);
    guia.habilitar();
    const leitura = { erroHorizontalM: 0, velocidadeHorizontalMps: 0, velocidadeVerticalMps: -12,
      orientacaoRad: 0, velocidadeAngularRadps: 0, massaKg: 1_000, empuxoN: 10_000,
      densidadeArKgM3: 1.225, velocidadeArMps: new Vetor3(5, 0, 0),
      forcaAerodinamicaXN: 100, torqueAerodinamicoNm: -1_000, bracoPropulsorLocalM: new Vetor3(0.1, -5, 0) };
    guia.atualizar(leitura);
    const theta = guia.obterDiagnostico().atitudeAlvoRad;
    const [comando] = guia.atualizar({ ...leitura, orientacaoRad: theta });
    const delta = comando!.valor;
    expect(leitura.empuxoN * (0.1 * Math.cos(delta) - 5 * Math.sin(delta)) + leitura.torqueAerodinamicoNm).toBeCloseTo(0, 8);
    expect(-leitura.empuxoN * Math.sin(theta + delta) + leitura.forcaAerodinamicaXN).toBeCloseTo(0, 8);
    guia.atualizar({ ...leitura, empuxoN: 0 });
    expect(guia.obterDiagnostico().compensacaoGimbalRad).toBe(0);
    expect(guia.obterDiagnostico().empuxoDisponivelN).toBe(0);
    guia.atualizar({ ...leitura, torqueAerodinamicoNm: 1e8 });
    expect(guia.obterDiagnostico().torqueNaoCompensavel).toBe(true);
  });
});
