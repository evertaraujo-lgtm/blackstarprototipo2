import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../../MundoFisico';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from '../fontes-de-energia/Bateria';
import { CorpoDeCilindroEletrico, HasteDeCilindroEletrico } from './CilindroEletrico';

const base = (id: string, posicaoM = Vetor3.zero) => ({ id, massaBaseKg: 2, dimensoesM: new Vetor3(0.5, 0.5, 0.5), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, estadoInicial: { posicaoM } });

describe('CilindroEletrico', () => {
  it('converte comando elétrico em força física na haste, limitada pela velocidade configurada', () => {
    const bateria = new Bateria({ ...base('bateria'), tensaoNominalV: 24, capacidadeEnergiaJ: 100_000, energiaInicialJ: 100_000 });
    let cilindro!: CorpoDeCilindroEletrico;
    const haste = new HasteDeCilindroEletrico(base('haste', new Vetor3(2, 0, 0)), () => cilindro);
    cilindro = new CorpoDeCilindroEletrico({ ...base('cilindro'), haste, bateria, velocidadeAvancoMps: 0.5, velocidadeRecuoMps: 0.25, forcaMaximaN: 100 });
    const mundo = new MundoFisico(0.01, { densidadeAtmosfericaKgM3: 0 });
    [bateria, cilindro, haste].forEach((objeto) => mundo.registrarObjeto(objeto));
    cilindro.definirEntradas({ avancar: true, recuar: false, avancado: false, recuado: false });
    mundo.avancar(0.1);
    expect(cilindro.forcaNaHasteN).toBeGreaterThan(0);
    expect(haste.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(0);
    expect(haste.getEstadoFisico().velocidadeMps.x).toBeLessThan(0.6);
  });
});
