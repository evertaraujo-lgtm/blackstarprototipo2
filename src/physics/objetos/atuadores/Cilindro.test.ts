import { describe, expect, it } from 'vitest';
import { Cilindro, ComCilindro } from './Cilindro';
import { CilindroEletrico } from './CilindroEletrico';
import { Objeto, type ForcaFisicaSolicitada } from '../base/Objeto';
import { Bateria } from '../fontes-de-energia/Bateria';
import { MundoFisico } from '../../MundoFisico';
import { Vetor3 } from '../../Vetor3';

const base = (id: string, x = 0) => ({ id, massaBaseKg: 2, dimensoesM: new Vetor3(0.5, 0.5, 0.5), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, estadoInicial: { posicaoM: new Vetor3(x, 0, 0) } });
const velocidades = { velocidadeAvancoMps: 0.5, velocidadeRecuoMps: 0.25 };
const entradas = { avancar: false, recuar: false, avancado: false, recuado: false };

describe('Cilindro sem corpo físico', () => {
  it('mantém comandos, reversão e fins de curso sem possuir massa ou posição', () => {
    const cilindro = new Cilindro(velocidades);
    expect(cilindro).not.toBeInstanceOf(Objeto);
    expect(cilindro.velocidadeSolicitadaMps).toBe(0);
    cilindro.definirEntradas({ ...entradas, avancar: true });
    expect(cilindro.velocidadeSolicitadaMps).toBe(0.5);
    cilindro.definirEntradas({ ...entradas, avancar: true, avancado: true });
    expect(cilindro.velocidadeSolicitadaMps).toBe(0);
    cilindro.definirEntradas({ ...entradas, recuar: true, avancado: true });
    expect(cilindro.velocidadeSolicitadaMps).toBe(-0.25);
    cilindro.definirEntradas({ ...entradas, recuar: true, recuado: true });
    expect(cilindro.velocidadeSolicitadaMps).toBe(0);
    expect(() => cilindro.definirEntradas({ ...entradas, avancar: true, recuar: true })).toThrow();
    for (const valor of [0, -1, NaN, Infinity]) expect(() => cilindro.configurarVelocidades(valor, 1)).toThrow();
  });

  it.each([0, 100_000])('uma porta herda Objeto e movimento por força com bateria de %s J (vácuo explícito)', (energiaInicialJ) => {
    let reacao: () => readonly ForcaFisicaSolicitada[] = () => [];
    class Suporte extends Objeto {
      override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return reacao(); }
    }
    const suporte = new Suporte(base('suporte', -2));
    const bateria = new Bateria({ ...base('bateria', -4), tensaoNominalV: 24, capacidadeEnergiaJ: 100_000, energiaInicialJ });
    class Porta extends ComCilindro(Objeto) {
      private readonly acionamento = new CilindroEletrico({ ...velocidades, corpo: suporte, haste: this, bateria, forcaMaximaN: 100 });
      constructor() { super(base('porta', 2)); this.instalarCilindro(this.acionamento); reacao = () => this.acionamento.obterForcasOperacionais(); }
      override prepararPassoOperacional(dtS: number): void { this.acionamento.prepararPassoOperacional(dtS); }
      override obterForcasOperacionais(): readonly ForcaFisicaSolicitada[] { return this.acionamento.obterForcasNaHaste(); }
    }
    const porta = new Porta();
    // O suporte recebe a reação pelo mesmo acionamento, como na montagem da bancada.
    const mundo = new MundoFisico(0.001, { densidadeAtmosfericaKgM3: 0 });
    [porta, suporte, bateria].forEach((objeto) => mundo.registrarObjeto(objeto));
    const estado = porta.getEstadoFisico();
    porta.definirEntradas({ ...entradas, avancar: true });
    expect(porta).toBeInstanceOf(Objeto);
    expect(porta.getEstadoFisico()).toEqual(estado);
    mundo.avancar(0.1);
    expect(porta.getEstadoFisico().velocidadeMps.x > 0).toBe(energiaInicialJ > 0);
    expect(porta.massaKg).toBe(2);
    expect(porta.resistenciaColisaoJ).toBe(10_000);
    expect(porta.getEstadoFisico().velocidadeMps.x + suporte.getEstadoFisico().velocidadeMps.x).toBeCloseTo(0, 10);
    expect(bateria.energiaConsumidaJ > 0).toBe(energiaInicialJ > 0);
  });
});
