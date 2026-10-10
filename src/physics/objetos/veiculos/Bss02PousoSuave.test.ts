import { describe, expect, it } from 'vitest';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { SuperficiePlano } from '../../SuperficiePlano';
import { Vetor3 } from '../../Vetor3';
import { Objeto } from '../base/Objeto';

describe('BSS-02 — toque vertical suave', () => {
  it.each([0.2, 0.7])('preserva casco e módulos ao tocar o solo a %d m/s', (velocidadeDeToqueMps) => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    const criarPeca = (id: string, massaBaseKg: number, dimensoesM: Vetor3, posicaoM: Vetor3, orientacaoRad = 0) => new Objeto({
      id,
      massaBaseKg,
      dimensoesM,
      resistenciaColisaoJ: 500_000,
      limiteTermicoC: 1_000,
      estadoInicial: {
        posicaoM,
        velocidadeMps: new Vetor3(0, -velocidadeDeToqueMps, 0),
        orientacaoRad: new Vetor3(0, 0, orientacaoRad),
      },
    });
    const casco = criarPeca('bss02-casco', 800, new Vetor3(3.2, 6, 2.4), new Vetor3(0, 4.5, 0));
    const modulos = [
      criarPeca('bss02-tanque-metano', 300, new Vetor3(2, 1.5, 1.8), new Vetor3(0, 8.5, 0)),
      criarPeca('bss02-tanque-oxigenio', 640, new Vetor3(2, 1.5, 1.8), new Vetor3(0, 10.3, 0)),
      criarPeca('bss02-bateria', 30, new Vetor3(1.2, 0.8, 1), new Vetor3(0, 12, 0)),
      criarPeca('bss02-painel-solar', 35, new Vetor3(3, 0.25, 2), new Vetor3(0, 13.2, 0)),
      criarPeca('bss02-propulsor', 90, new Vetor3(1.6, 1.4, 1.4), new Vetor3(0, 0.8, 0), Math.PI / 2),
    ];
    const fixadores = modulos.map((modulo) => new FixadorEstrutural({
      id: `fixador-${modulo.id}`,
      objetoA: casco,
      objetoB: modulo,
      resistenciaTracaoN: modulo.id === 'bss02-propulsor' ? 1_000_000 : 300_000,
      resistenciaCompressaoN: modulo.id === 'bss02-propulsor' ? 1_000_000 : 300_000,
      obterEsforcoSolicitadoN: () => 0,
    }));
    mundo.registrarSuperficie(new SuperficiePlano('solo-bss02', 'concreto', 0, 1_000_000, 0.04, 0.9));
    mundo.registrarObjeto(casco);
    for (const modulo of modulos) mundo.registrarObjeto(modulo);
    for (const fixador of fixadores) mundo.registrarFixador(fixador);

    mundo.avancar(0.1);

    expect(
      fixadores.every((fixador) => !fixador.estaRompido),
      fixadores.map((fixador) => `${fixador.id}: falha=${fixador.estaRompido}, tração=${fixador.picoEsforcoFisicoN}, compressão=${fixador.picoEsforcoCompressaoFisicoN}`).join('\n'),
    ).toBe(true);
    expect(fixadores.at(-1)!.picoEsforcoCompressaoFisicoN).toBeGreaterThan(150_000);
    expect(fixadores.at(-1)!.picoEsforcoCompressaoFisicoN).toBeLessThan(1_000_000);
    expect([casco, ...modulos].every((objeto) => objeto.integridadeEstrutural === 1)).toBe(true);
  });
});
