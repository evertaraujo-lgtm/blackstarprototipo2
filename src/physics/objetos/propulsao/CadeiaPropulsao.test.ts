import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';
import { BombaPropelente } from './alimentacao/BombaPropelente';
import { LinhaDePropelente } from './alimentacao/LinhaDePropelente';
import { ValvulaPropelente } from './alimentacao/ValvulaPropelente';
import { Bocal } from './combustao/Bocal';
import { CamaraCombustao } from './combustao/CamaraCombustao';
import { Propulsor } from './Propulsor';

const criarTanque = (id: string, tipo: string) => new TanquePropelente({ id, tipoPropelente: tipo, massaBaseKg: 10, capacidadePropelenteKg: 20, massaPropelenteInicialKg: 20, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 300 });
const criarBateria = () => new Bateria({ id: 'bateria', massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 80, tensaoNominalV: 28, capacidadeEnergiaJ: 10_000, energiaInicialJ: 10_000 });

describe('Cadeia de propulsão', () => {
  it('transfere combustível e oxidante por linhas, bombas e válvulas até câmara e bocal', () => {
    const combustivel = criarTanque('tanque-combustivel', 'metano');
    const oxidante = criarTanque('tanque-oxidante', 'oxigenio');
    const bateria = criarBateria();
    const valvulaCombustivel = new ValvulaPropelente({ id: 'valvula-combustivel', vazaoMaximaKgS: 2 });
    const valvulaOxidante = new ValvulaPropelente({ id: 'valvula-oxidante', vazaoMaximaKgS: 8 });
    valvulaCombustivel.definirAbertura(1); valvulaOxidante.definirAbertura(1);
    const linhaCombustivel = new LinhaDePropelente({ id: 'linha-combustivel', tanque: combustivel, tipoPropelente: 'metano', comprimentoMaximoM: 5, vazaoMaximaKgS: 2, valvula: valvulaCombustivel });
    const linhaOxidante = new LinhaDePropelente({ id: 'linha-oxidante', tanque: oxidante, tipoPropelente: 'oxigenio', comprimentoMaximoM: 5, vazaoMaximaKgS: 8, valvula: valvulaOxidante });
    const bomba = new BombaPropelente({ id: 'bomba', tensaoNominalV: 28, vazaoMaximaKgS: 8, potenciaEletricaMaximaW: 100 });
    const posicaoCamara = new Vetor3(0, 0, 0);
    const massaCombustivel = bomba.bombear(linhaCombustivel, bateria, 1, 1, posicaoCamara);
    const massaOxidante = bomba.bombear(linhaOxidante, bateria, 4, 1, posicaoCamara);
    const resultado = new CamaraCombustao({ razaoMisturaOxidanteCombustivel: 4, toleranciaRazaoMistura: 0.1 }).reagir(massaCombustivel, massaOxidante, 1);
    const empuxo = new Bocal({ empuxoMaximoN: 1_000, eficienciaNominal: 0.95 }).calcularEmpuxo(resultado, 1);
    expect(massaCombustivel).toBe(1);
    expect(massaOxidante).toBe(4);
    expect(resultado.eficiencia).toBe(1);
    expect(resultado.massaReagidaKg).toBe(5);
    expect(empuxo).toBe(950);
    expect(bateria.energiaArmazenadaJ).toBeLessThan(10_000);
  });

  it('corta o fluxo e a combustão quando uma linha rompe por afastamento', () => {
    const tanque = criarTanque('tanque-rompido', 'metano');
    const valvula = new ValvulaPropelente({ id: 'valvula', vazaoMaximaKgS: 2 });
    valvula.definirAbertura(1);
    const linha = new LinhaDePropelente({ id: 'linha-rompida', tanque, tipoPropelente: 'metano', comprimentoMaximoM: 1, vazaoMaximaKgS: 2, valvula });
    expect(linha.fornecerMassa(1, 1, new Vetor3(1.01, 0, 0))).toBe(0);
    expect(linha.estaRompida).toBe(true);
    expect(new CamaraCombustao({ razaoMisturaOxidanteCombustivel: 4, toleranciaRazaoMistura: 0.1 }).reagir(0, 4, 1).eficiencia).toBe(0);
  });

  it('desconecta uma linha individualmente sem alterar a existência física do tanque', () => {
    const tanque = criarTanque('tanque-desconectado', 'metano');
    const valvula = new ValvulaPropelente({ id: 'valvula-desconectada', vazaoMaximaKgS: 2 });
    valvula.definirAbertura(1);
    const linha = new LinhaDePropelente({ id: 'linha-desconectada', tanque, tipoPropelente: 'metano', comprimentoMaximoM: 5, vazaoMaximaKgS: 2, valvula });
    linha.desconectar();
    expect(linha.estaDesconectada).toBe(true);
    expect(linha.estaRompida).toBe(false);
    expect(linha.fornecerMassa(1, 1, new Vetor3(0, 0, 0))).toBe(0);
    expect(tanque.massaPropelenteKg).toBe(20);
  });

  it('marca como rompida uma mangueira que se solta e corta seu fluxo', () => {
    const tanque = criarTanque('tanque-linha-solta', 'metano');
    const valvula = new ValvulaPropelente({ id: 'valvula-linha-solta', vazaoMaximaKgS: 2 });
    valvula.definirAbertura(1);
    const linha = new LinhaDePropelente({ id: 'linha-solta', tanque, tipoPropelente: 'metano', comprimentoMaximoM: 5, vazaoMaximaKgS: 2, valvula });
    linha.romper();
    expect(linha.estaRompida).toBe(true);
    expect(linha.fornecerMassa(1, 1, new Vetor3(0, 0, 0))).toBe(0);
    expect(tanque.massaPropelenteKg).toBe(20);
  });

  it('faz o próprio propulsor gerar empuxo somente pela cadeia bipropelente configurada', () => {
    const combustivel = criarTanque('tanque-propulsor-combustivel', 'metano');
    const oxidante = criarTanque('tanque-propulsor-oxidante', 'oxigenio');
    const bateria = criarBateria();
    const valvulaCombustivel = new ValvulaPropelente({ id: 'valvula-propulsor-combustivel', vazaoMaximaKgS: 1 });
    const valvulaOxidante = new ValvulaPropelente({ id: 'valvula-propulsor-oxidante', vazaoMaximaKgS: 4 });
    valvulaCombustivel.definirAbertura(1); valvulaOxidante.definirAbertura(1);
    const propulsor = new Propulsor({ id: 'propulsor-bipropelente', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, empuxoMaximoN: 1_000, vazaoMaximaKgS: 1, propelenteCompativel: 'metano' });
    propulsor.conectarTanque(combustivel);
    propulsor.conectarBateria(bateria);
    const linhaCombustivel = new LinhaDePropelente({ id: 'linha-propulsor-combustivel', tanque: combustivel, tipoPropelente: 'metano', comprimentoMaximoM: 5, vazaoMaximaKgS: 1, valvula: valvulaCombustivel });
    const linhaOxidante = new LinhaDePropelente({ id: 'linha-propulsor-oxidante', tanque: oxidante, tipoPropelente: 'oxigenio', comprimentoMaximoM: 5, vazaoMaximaKgS: 4, valvula: valvulaOxidante });
    propulsor.configurarCadeiaBipropelente({
      linhaCombustivel,
      bombaCombustivel: new BombaPropelente({ id: 'bomba-propulsor-combustivel', tensaoNominalV: 28, vazaoMaximaKgS: 1, potenciaEletricaMaximaW: 100 }),
      linhaOxidante,
      bombaOxidante: new BombaPropelente({ id: 'bomba-propulsor-oxidante', tensaoNominalV: 28, vazaoMaximaKgS: 4, potenciaEletricaMaximaW: 100 }),
      camara: new CamaraCombustao({ razaoMisturaOxidanteCombustivel: 4, toleranciaRazaoMistura: 0.1 }),
      bocal: new Bocal({ empuxoMaximoN: 1_000, eficienciaNominal: 1 }),
    });
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(propulsor.ligarSistema(sistema)).toBe(true);
    propulsor.definirThrottle(1);
    expect(propulsor.solicitarIgnicao()).toBe(true);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(1_000);
    propulsor.definirThrottle(0.25);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(250);
    valvulaOxidante.definirAbertura(0);
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.empuxoAtualN).toBe(0);
    linhaCombustivel.romper();
    const cargaAntesDaFalhaJ = bateria.energiaArmazenadaJ;
    propulsor.prepararPassoOperacional(1);
    expect(propulsor.sistemaEstaOperacional('combustível')).toBe(false);
    expect(propulsor.estaIgnitado).toBe(false);
    expect(linhaOxidante.vazaoAtualKgS).toBe(0);
    expect(bateria.energiaArmazenadaJ).toBe(cargaAntesDaFalhaJ);
  });
});
