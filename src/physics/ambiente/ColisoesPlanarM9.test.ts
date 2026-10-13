import { SuperficieEsferica } from '../SuperficieEsferica';
import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { AmbienteTerrestre } from './AmbienteFisico';
import { obterContatoCaixasOrientadas } from '../geometria/ContatoCaixasOrientadas';

describe('M9-F — colisões não introduzem dinâmica fora do plano', () => {
  it.each([0, 0.1])('placas finas em Z colidem por XY com orientação %f', (theta) => {
    const mundo = new MundoFisico(0.01, { ambiente: new AmbienteTerrestre(), densidadeAtmosfericaKgM3: 0 });
    const objetos = [-1, 1].map((sinal) => new Objeto({ id: String(sinal), massaBaseKg: 10, dimensoesM: new Vetor3(2, 2, 0.1),
      limiteTermicoC: 1000, resistenciaColisaoJ: 1e6, estadoInicial: { posicaoM: new Vetor3(sinal * 0.2, 100, 0),
        velocidadeMps: new Vetor3(-sinal, 0, 0), orientacaoRad: new Vetor3(0, 0, theta) } }));
    for (const o of objetos) mundo.registrarObjeto(o);
    for (let i = 0; i < 10; i++) mundo.avancar(0.01);
    for (const o of objetos) {
      const e = o.getEstadoFisico();
      expect(e.posicaoM.z).toBe(0); expect(e.velocidadeMps.z).toBe(0);
      expect(e.velocidadeAngularRadps.x).toBe(0); expect(e.velocidadeAngularRadps.y).toBe(0);
    }
    expect(objetos[0].getEstadoFisico().velocidadeMps.x).toBeLessThan(0);
  });
  it('placa tombando no planeta não adquire giro X/Y por espessura em Z', () => {
    const ambiente = new AmbienteTerrestre();
    const mundo = new MundoFisico(1 / 240, { ambiente, densidadeAtmosfericaKgM3: 0 });
    mundo.registrarSuperficie(new SuperficieEsferica('terra', ambiente.campo.centroM));
    const o = new Objeto({ id: 'placa', massaBaseKg: 10, dimensoesM: new Vetor3(3, 0.2, 0.1),
      limiteTermicoC: 1000, resistenciaColisaoJ: 1e6, estadoInicial: { posicaoM: new Vetor3(0, 1, 0),
        velocidadeMps: new Vetor3(0, -3, 0), orientacaoRad: new Vetor3(0, 0, 0.4) } });
    mundo.registrarObjeto(o);
    for (let i = 0; i < 240; i++) mundo.avancar(1 / 240);
    const e = o.getEstadoFisico();
    expect(e.velocidadeAngularRadps.x).toBe(0); expect(e.velocidadeAngularRadps.y).toBe(0);
    expect(e.posicaoM.z).toBe(0); expect(e.velocidadeMps.z).toBe(0);
  });
  it('consulta opt-in XY preserva a seleção Z do modelo legado', () => {
    const a = { posicaoM: new Vetor3(-0.2, 0, 0), dimensoesM: new Vetor3(2, 2, 0.1), orientacaoZRad: 0 };
    const b = { ...a, posicaoM: new Vetor3(0.2, 0, 0) };
    expect(obterContatoCaixasOrientadas(a, b)!.normal.z).toBe(1);
    expect(obterContatoCaixasOrientadas(a, b, 0, true)!.normal.z).toBe(0);
  });
});
