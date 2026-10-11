import { describe, expect, it } from 'vitest';
import { criarTesteBss005 } from '../../../cenarios/BancadaBss';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { Bocal, GRAVIDADE_PADRAO_MPS2 } from './combustao/Bocal';
import { CamaraCombustao } from './combustao/CamaraCombustao';
import { Objeto } from '../base/Objeto';
import { Vetor3 } from '../../Vetor3';
import { BombaPropelente } from './alimentacao/BombaPropelente';

const DT_S = 1 / 240;
const VAZAO_TOTAL_KGS = 120_000 / (350 * GRAVIDADE_PADRAO_MPS2);
const criarEnsaio = () => {
  const cenario = criarTesteBss005();
  const motor = cenario.propulsorControlavel;
  const metano = cenario.objetos.find((objeto) => objeto.id === 'tanque-decolagem-metano') as TanquePropelente;
  const oxidante = cenario.objetos.find((objeto) => objeto.id === 'tanque-decolagem-oxidante') as TanquePropelente;
  for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(motor.ligarSistema(sistema)).toBe(true);
  expect(motor.solicitarIgnicao()).toBe(true);
  return { cenario, motor, metano, oxidante };
};

describe('Propulsão química idealizada — montagem real BSS-005', () => {
  it.each([0, 0.5, 1])('fecha empuxo, Isp e perda de massa com throttle %s', (throttle) => {
    const { cenario, motor, metano, oxidante } = criarEnsaio();
    motor.definirThrottle(throttle);
    const antes = { massa: cenario.seguirObjeto.massaInstantaneaDoConjuntoKg, metano: metano.massaPropelenteKg, oxidante: oxidante.massaPropelenteKg };
    cenario.mundo.avancar(DT_S);
    const combustivelConsumido = antes.metano - metano.massaPropelenteKg;
    const oxidanteConsumido = antes.oxidante - oxidante.massaPropelenteKg;
    expect(motor.empuxoAtualN).toBeCloseTo(120_000 * throttle, 6);
    expect(motor.vazaoAtualKgS).toBeCloseTo(VAZAO_TOTAL_KGS * throttle, 9);
    expect(combustivelConsumido).toBeCloseTo(motor.vazaoAtualKgS * DT_S / 5, 10);
    expect(oxidanteConsumido).toBeCloseTo(combustivelConsumido * 4, 10);
    expect(antes.massa - cenario.seguirObjeto.massaInstantaneaDoConjuntoKg).toBeCloseTo(combustivelConsumido + oxidanteConsumido, 10);
    expect(motor.vazaoReagidaKgS).toBeCloseTo(motor.vazaoAtualKgS, 10);
    if (throttle > 0) expect(motor.impulsoEspecificoEfetivoS).toBeCloseTo(350, 9);
    else expect(motor.impulsoEspecificoEfetivoS).toBeUndefined();
  });

  it.each([DT_S, DT_S / 2])('preserva unidades e balanço com dt = %s s', (dtS) => {
    const { cenario, motor, metano, oxidante } = criarEnsaio();
    motor.definirThrottle(1);
    const antesKg = metano.massaPropelenteKg + oxidante.massaPropelenteKg;
    cenario.mundo.avancar(dtS);
    expect(antesKg - metano.massaPropelenteKg - oxidante.massaPropelenteKg).toBeCloseTo(VAZAO_TOTAL_KGS * dtS, 9);
    expect(motor.empuxoAtualN).toBeCloseTo(120_000, 6);
  });

  it('reduz empuxo uma vez por dano, mantendo o consumo real', () => {
    const { cenario, motor } = criarEnsaio();
    motor.aplicarDanoPorImpacto(motor.resistenciaColisaoJ * 1.5);
    motor.definirThrottle(1);
    cenario.mundo.avancar(DT_S);
    expect(motor.integridadeEstrutural).toBe(0.5);
    expect(motor.empuxoAtualN).toBeCloseTo(60_000, 6);
    expect(motor.vazaoAtualKgS).toBeCloseTo(VAZAO_TOTAL_KGS, 9);
    expect(motor.impulsoEspecificoEfetivoS).toBeCloseTo(175, 9);
  });

  it.each(['metano', 'oxidante'] as const)('interrompe a alimentação conjunta quando falta %s', (tipo) => {
    const { cenario, motor, metano, oxidante } = criarEnsaio();
    const tanque = tipo === 'metano' ? metano : oxidante;
    tanque.fornecerPropelente(tanque.massaPropelenteKg);
    const antesKg = metano.massaPropelenteKg + oxidante.massaPropelenteKg;
    motor.definirThrottle(1);
    cenario.mundo.avancar(DT_S);
    expect(motor.empuxoAtualN).toBe(0);
    expect(motor.vazaoAtualKgS).toBe(0);
    expect(motor.estaIgnitado).toBe(false);
    expect(metano.massaPropelenteKg + oxidante.massaPropelenteKg).toBe(antesKg);
    expect(cenario.linhasComFalhaControlavel.combustivel.vazaoAtualKgS).toBe(0);
    expect(cenario.linhasComFalhaControlavel.oxidante.vazaoAtualKgS).toBe(0);
  });

  it('limita os dois fluxos pela reserva restante e contabiliza o último pulso parcial', () => {
    const { cenario, motor, metano, oxidante } = criarEnsaio();
    oxidante.fornecerPropelente(oxidante.massaPropelenteKg - 0.02);
    const antesKg = metano.massaPropelenteKg;
    motor.definirThrottle(1);
    cenario.mundo.avancar(DT_S);
    expect(antesKg - metano.massaPropelenteKg).toBeCloseTo(0.005, 10);
    expect(oxidante.massaPropelenteKg).toBe(0);
    expect(motor.vazaoAtualKgS).toBeCloseTo(6, 8);
    expect(motor.impulsoEspecificoEfetivoS).toBeCloseTo(350, 8);
    cenario.mundo.avancar(DT_S);
    expect(motor.estaIgnitado).toBe(false);
    expect(motor.empuxoAtualN).toBe(0);
    expect(motor.vazaoAtualKgS).toBe(0);
  });

  it('partilha a energia disponível entre bombas sem alterar a mistura', () => {
    const { cenario, motor } = criarEnsaio();
    const potenciaBombasW = motor.potenciaEletricaMaximaW * 5 / 6;
    motor.conexaoEletrica!.configurarCorrenteMaxima(potenciaBombasW / (2 * 24));
    motor.definirThrottle(1);
    cenario.mundo.avancar(DT_S);
    const linhas = cenario.linhasComFalhaControlavel;
    expect(linhas.oxidante.vazaoAtualKgS).toBeCloseTo(linhas.combustivel.vazaoAtualKgS * 4, 9);
    expect(motor.vazaoAtualKgS).toBeCloseTo(VAZAO_TOTAL_KGS / 2, 8);
    expect(motor.empuxoAtualN).toBeCloseTo(60_000, 6);
    expect(motor.impulsoEspecificoEfetivoS).toBeCloseTo(350, 9);
  });

  it('contabiliza o último pulso elétrico parcial e bloqueia o passo seguinte', () => {
    const { motor, metano, oxidante } = criarEnsaio();
    const bateria = motor.bateriaConectada!;
    const energiaDoPulsoJ = motor.potenciaEletricaMaximaW * 5 / 6 * DT_S;
    bateria.fornecerEnergia(bateria.energiaArmazenadaJ - energiaDoPulsoJ / 2);
    const antesKg = metano.massaPropelenteKg + oxidante.massaPropelenteKg;
    motor.definirThrottle(1);
    motor.prepararPassoOperacional(DT_S);
    expect(bateria.energiaArmazenadaJ).toBe(0);
    expect(motor.estaIgnitado).toBe(true); // pulso autorizado na entrada do intervalo
    expect(motor.empuxoAtualN).toBeCloseTo(60000, 5);
    expect(antesKg - metano.massaPropelenteKg - oxidante.massaPropelenteKg).toBeCloseTo(motor.vazaoAtualKgS * DT_S, 9);
    expect(motor.impulsoEspecificoEfetivoS).toBeCloseTo(350, 8);
    motor.prepararPassoOperacional(DT_S);
    expect(motor.estaIgnitado).toBe(false);
    expect(motor.empuxoAtualN).toBe(0);
    expect(motor.vazaoAtualKgS).toBe(0);
  });

  it('rejeita uma configuração química cujo empuxo não fecha com Isp e vazão', () => {
    const { cenario, motor } = criarEnsaio();
    const bomba = new BombaPropelente({ id: 'bomba-verificacao', tensaoNominalV: 24, vazaoMaximaKgS: 40, potenciaEletricaMaximaW: 1000 });
    const cadeia = {
      linhaCombustivel: cenario.linhasComFalhaControlavel.combustivel,
      linhaOxidante: cenario.linhasComFalhaControlavel.oxidante,
      bombaCombustivel: bomba, bombaOxidante: bomba,
      camara: new CamaraCombustao({ razaoMisturaOxidanteCombustivel: 4, toleranciaRazaoMistura: 0.1 }),
    };
    for (const [empuxoMaximoN, impulsoEspecificoNominalS] of [[120000, 700], [60000, 350]]) {
      expect(() => motor.configurarCadeiaBipropelente({ ...cadeia,
        bocal: new Bocal({ empuxoMaximoN: empuxoMaximoN!, impulsoEspecificoNominalS: impulsoEspecificoNominalS!, eficienciaNominal: 1 }),
      })).toThrow('incompatível');
    }
    expect(motor.impulsoEspecificoNominalS).toBe(350);
  });

  it('produz dano mensurável ao acelerar por empuxo contra uma barreira física', () => {
    const { cenario, motor } = criarEnsaio();
    // Mesmos material e limite térmico da barreira do ensaio de Propulsor.
    // Corpo livre: também cai sob gravidade; não há ancoragem nem reposicionamento.
    const barreira = new Objeto({ id: 'barreira-quimica', massaBaseKg: 100000000,
      dimensoesM: new Vetor3(30, 1, 30), resistenciaColisaoJ: 10000000, limiteTermicoC: 1000,
      estadoInicial: { posicaoM: new Vetor3(0, 100, 0) },
    });
    cenario.mundo.registrarObjeto(barreira);
    motor.definirThrottle(1);
    let acelerou = false;
    for (let passo = 0; passo < 5 * 240; passo++) {
      cenario.mundo.avancar(DT_S);
      acelerou ||= motor.empuxoAtualN > 0 && cenario.seguirObjeto.getEstadoFisico().velocidadeMps.y > 5;
      if (cenario.objetos.some((objeto) => objeto.integridadeEstrutural < 1)) break;
    }
    expect(acelerou).toBe(true);
    expect(cenario.objetos.some((objeto) => objeto.integridadeEstrutural < 1)).toBe(true);
  });

  it.each(['ignicao', 'controle', 'eletrica', 'integridade'] as const)('não gera empuxo nem consumo sem %s', (falha) => {
    const { motor, metano, oxidante } = criarEnsaio();
    motor.definirThrottle(1);
    if (falha === 'ignicao') { motor.desligarSistema('controle'); motor.ligarSistema('controle'); }
    if (falha === 'controle') motor.desligarSistema('controle');
    if (falha === 'eletrica') motor.bateriaConectada!.fornecerEnergia(motor.bateriaConectada!.energiaArmazenadaJ);
    if (falha === 'integridade') motor.aplicarDanoPorImpacto(motor.resistenciaColisaoJ * 2);
    const antesKg = metano.massaPropelenteKg + oxidante.massaPropelenteKg;
    // O teste de perda elétrica prepara o motor diretamente para não recarregar
    // a bateria com o painel solar antes de avaliar o permissivo.
    motor.prepararPassoOperacional(DT_S);
    expect(motor.empuxoAtualN).toBe(0);
    expect(motor.vazaoAtualKgS).toBe(0);
    expect(metano.massaPropelenteKg + oxidante.massaPropelenteKg).toBe(antesKg);
    expect(motor.estaIgnitado).toBe(false);
  });

  it('limpa as leituras de fluxo ao zerar o throttle', () => {
    const { cenario, motor } = criarEnsaio();
    motor.definirThrottle(1);
    cenario.mundo.avancar(DT_S);
    motor.definirThrottle(0);
    cenario.mundo.avancar(DT_S);
    expect(motor.vazaoAtualKgS).toBe(0);
    expect(cenario.linhasComFalhaControlavel.combustivel.vazaoAtualKgS).toBe(0);
    expect(cenario.linhasComFalhaControlavel.oxidante.vazaoAtualKgS).toBe(0);
    expect(motor.potenciaTermicaAtualW).toBe(0);
  });
});

describe('Bocal químico e combustão', () => {
  it('rejeita mistura incorreta e não aplica empuxo a material sem reação', () => {
    const camara = new CamaraCombustao({ razaoMisturaOxidanteCombustivel: 4, toleranciaRazaoMistura: 0.1 });
    const resultado = camara.reagir(1, 2, 1);
    const bocal = new Bocal({ empuxoMaximoN: 120_000, eficienciaNominal: 1, impulsoEspecificoNominalS: 350 });
    expect(resultado.eficiencia).toBe(0);
    expect(bocal.calcularEmpuxo(resultado, 1, 1, 1)).toBe(0);
    expect(bocal.calcularEmpuxo(camara.reagir(0, 2, 1), 1, 1, 1)).toBe(0);
  });

  it.each([0, -1, NaN, Infinity])('rejeita Isp inválido %s', (isp) => {
    expect(() => new Bocal({ empuxoMaximoN: 120_000, eficienciaNominal: 1, impulsoEspecificoNominalS: isp })).toThrow();
  });

  it('exige dt válido para converter massa em vazão', () => {
    const bocal = new Bocal({ empuxoMaximoN: 120_000, eficienciaNominal: 1, impulsoEspecificoNominalS: 350 });
    expect(() => bocal.calcularEmpuxo({ massaReagidaKg: 1, eficiencia: 1 }, 1)).toThrow();
    expect(() => bocal.calcularEmpuxo({ massaReagidaKg: 1, eficiencia: 1 }, 1, 1, 0)).toThrow();
  });
});
