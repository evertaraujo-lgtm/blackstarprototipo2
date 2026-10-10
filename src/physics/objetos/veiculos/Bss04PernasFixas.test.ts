import { describe, expect, it } from 'vitest';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { SuperficiePlano } from '../../SuperficiePlano';
import { Vetor3 } from '../../Vetor3';
import { Objeto } from '../base/Objeto';
import { criarPernasFixasBss04 } from './Bss04';

describe('BSS-04 — pernas fixas', () => {
  it.each([0.2, 0.7])('apoia nas duas sapatas ao tocar a %d m/s', (velocidadeToqueMps) => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const casco = new Objeto({
      id: 'bss04-casco-teste',
      massaBaseKg: 800,
      dimensoesM: new Vetor3(3.2, 6, 2.4),
      resistenciaColisaoJ: 500_000,
      limiteTermicoC: 1_000,
      estadoInicial: {
        posicaoM: new Vetor3(0, 4.8, 0),
        velocidadeMps: new Vetor3(0, -velocidadeToqueMps, 0),
      },
    });
    const motor = new Objeto({
      id: 'bss04-motor-teste',
      massaBaseKg: 90,
      dimensoesM: new Vetor3(1.6, 1.4, 1.4),
      resistenciaColisaoJ: 500_000,
      limiteTermicoC: 1_000,
      estadoInicial: {
        posicaoM: new Vetor3(0, 1.1, 0),
        orientacaoRad: new Vetor3(0, 0, Math.PI / 2),
      },
    });
    const pernas = criarPernasFixasBss04(new Vetor3(0, 4.8, 0));
    const modulos = [motor, ...pernas];
    const fixadores = modulos.map((modulo) => new FixadorEstrutural({
      id: `fixador-teste-${modulo.id}`,
      objetoA: casco,
      objetoB: modulo,
      resistenciaTracaoN: 1_000_000,
      resistenciaCompressaoN: 1_000_000,
      obterEsforcoSolicitadoN: () => 0,
    }));
    mundo.registrarSuperficie(new SuperficiePlano('solo-bss04-teste', 'concreto', 0, 1_000_000, 0.04, 0.9));
    mundo.registrarObjeto(casco);
    modulos.forEach((modulo) => mundo.registrarObjeto(modulo));
    fixadores.forEach((fixador) => mundo.registrarFixador(fixador));

    mundo.avancar(0.1);

    const sapatas = pernas.filter((perna) => perna.id.includes('sapata'));
    expect(sapatas).toHaveLength(2);
    expect(fixadores.every((fixador) => !fixador.estaRompido)).toBe(true);
    expect([casco, motor, ...pernas].every((objeto) => objeto.integridadeEstrutural === 1)).toBe(true);
    expect(sapatas.every((sapata) => sapata.getEstadoFisico().posicaoM.y >= sapata.dimensoesM.y / 2 - 0.01)).toBe(true);
    expect(sapatas.every((sapata) => sapata.getEstadoFisico().posicaoM.y < 0.2)).toBe(true);
    expect(motor.getEstadoFisico().posicaoM.y - motor.dimensoesM.x / 2).toBeGreaterThan(0.15);
  });
});
