import { describe, expect, it } from 'vitest';
import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { MundoFisico } from '../MundoFisico';
import { Vetor3 } from '../Vetor3';
import { AletaAerodinamica } from '../objetos/componentes/AletaAerodinamica';
import { VeiculoComposto } from '../objetos/veiculos/VeiculoComposto';
import { ControladorAletasAerodinamicas } from './ControladorAletasAerodinamicas';

describe('ControladorAletasAerodinamicas', () => {
  it('amortece a rotação após o corte do motor usando o fluxo atmosférico', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const foguete = new VeiculoComposto({
      id: 'bss06-regressao', massaBaseKg: 1_000, dimensoesM: new Vetor3(2, 10, 1),
      resistenciaColisaoJ: 1_000_000, limiteTermicoC: 1_000, areaFrontalM2: 2, coeficienteArrasto: 0.5,
      estadoInicial: {
        posicaoM: new Vetor3(0, 5_000, 0), velocidadeMps: new Vetor3(0, -80, 0),
        orientacaoRad: new Vetor3(0, 0, 0.1), velocidadeAngularRadps: new Vetor3(0, 0, 0.2),
      },
    });
    const aleta = new AletaAerodinamica({
      id: 'bss06-aleta-regressao', massaBaseKg: 30, dimensoesM: new Vetor3(0.4, 1, 0.4),
      resistenciaColisaoJ: 100_000, limiteTermicoC: 1_000, areaEfetivaM2: 5,
      coeficienteSustentacaoPorRad: 2, coeficienteArrasto: 1.1,
      deflexaoMaximaRad: 25 * Math.PI / 180, velocidadeAngularMaximaRadps: 35 * Math.PI / 180,
      estadoInicial: { posicaoM: new Vetor3(0, 12, 0), orientacaoRad: new Vetor3(0, 0, 0.1) },
    });
    foguete.adicionarModulo(aleta);
    foguete.adicionarFixador(new FixadorEstrutural({
      id: 'bss06-fixador-aleta-regressao', objetoA: foguete, objetoB: aleta,
      resistenciaTracaoN: 1_000_000, resistenciaCompressaoN: 1_000_000, obterEsforcoSolicitadoN: () => 0,
    }));
    foguete.registrarNoMundo(mundo);
    const controlador = new ControladorAletasAerodinamicas([aleta]);
    const omegaInicial = Math.abs(foguete.getEstadoFisico().velocidadeAngularRadps.z);

    for (let passo = 0; passo < 2_400; passo += 1) {
      const estado = foguete.getEstadoFisico();
      controlador.atualizar(estado.orientacaoRad.z, estado.velocidadeAngularRadps.z, estado.velocidadeMps.y);
      mundo.avancar(1 / 240);
    }

    expect(aleta.deflexaoAtualRad).not.toBe(0);
    expect(Math.abs(foguete.getEstadoFisico().velocidadeAngularRadps.z)).toBeLessThan(omegaInicial);
    expect(Math.abs(foguete.getEstadoFisico().orientacaoRad.z)).toBeLessThan(0.2);
  });
});
