import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../../MundoFisico';
import { Vetor3 } from '../../Vetor3';
import { TanquePropelente } from './TanquePropelente';
import { PropulsorVetorizado } from './PropulsorVetorizado';
import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';

describe('PropulsorVetorizado', () => {
  it('atinge o comando dentro da taxa do atuador e desvia a força de empuxo', () => {
    const mundo = new MundoFisico(0.1, { densidadeAtmosfericaKgM3: 0 });
    const tanque = new TanquePropelente({
      id: 'tanque-vetorizado', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
      tipoPropelente: 'rp-1', capacidadePropelenteKg: 20, massaPropelenteInicialKg: 20, estadoInicial: { posicaoM: new Vetor3(0, 3, 0) },
    });
    const propulsor = new PropulsorVetorizado({
      id: 'merlin-vetorizado', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 10_000, vazaoMaximaKgS: 1, propelenteCompativel: 'rp-1', vetorizacao: { limiteAngularRad: 0.2, velocidadeAngularMaximaRadps: 0.5 },
      estadoInicial: { posicaoM: new Vetor3(0, 1, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
    });
    propulsor.conectarTanque(tanque, 3);
    propulsor.definirThrottle(1);
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) propulsor.ligarSistema(sistema);
    expect(propulsor.solicitarIgnicao()).toBe(true);
    expect(propulsor.solicitarVetorizacao(0.2)).toBe(true);
    expect(propulsor.solicitarVetorizacao(0.21)).toBe(false);
    mundo.registrarObjeto(tanque);
    mundo.registrarObjeto(propulsor);

    mundo.avancar(0.1);

    const estado = propulsor.obterEstadoDaVetorizacao();
    expect(estado.anguloAtualRad).toBeCloseTo(0.05, 10);
    expect(estado.estaHabilitado).toBe(true);
    const forca = propulsor.obterForcasOperacionais()[0].forcaN;
    expect(forca.x).toBeLessThan(0);
    expect(forca.y).toBeGreaterThan(0);
  });

  it('não move o atuador quando a cadeia de sistemas deixa de autorizá-lo', () => {
    const propulsor = new PropulsorVetorizado({
      id: 'atuador-bloqueado', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 10_000, vazaoMaximaKgS: 1, propelenteCompativel: 'rp-1', vetorizacao: { limiteAngularRad: 0.2, velocidadeAngularMaximaRadps: 1 },
    });
    propulsor.solicitarVetorizacao(0.1);
    propulsor.prepararPassoOperacional(0.1);
    expect(propulsor.obterEstadoDaVetorizacao()).toMatchObject({ anguloAtualRad: 0, estaHabilitado: false });
  });

  it('mantém o conjunto sem rotação quando 5° alinham o empuxo ao centro de massa', () => {
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    const deslocamentoM = 2 * Math.tan(5 * Math.PI / 180);
    const tanque = new TanquePropelente({
      id: 'tanque-correcao-cinco-graus', massaBaseKg: 30_000, dimensoesM: new Vetor3(2.5, 4, 1), resistenciaColisaoJ: 1_000_000, limiteTermicoC: 1_000,
      tipoPropelente: 'rp-1', capacidadePropelenteKg: 10_000, massaPropelenteInicialKg: 10_000, estadoInicial: { posicaoM: new Vetor3(0, 30, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
    });
    const merlin = new PropulsorVetorizado({
      id: 'merlin-correcao-cinco-graus', massaBaseKg: 470, dimensoesM: new Vetor3(1.2, 0.8, 1), resistenciaColisaoJ: 150_000, limiteTermicoC: 1_000,
      empuxoMaximoN: 845_000, vazaoMaximaKgS: 250, propelenteCompativel: 'rp-1', vetorizacao: { limiteAngularRad: 5 * Math.PI / 180, velocidadeAngularMaximaRadps: 10 * Math.PI / 180 },
      estadoInicial: { posicaoM: new Vetor3(deslocamentoM, 28, 0), orientacaoRad: new Vetor3(0, 0, Math.PI / 2) },
    });
    merlin.conectarTanque(tanque, 3);
    merlin.definirThrottle(0.6);
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) merlin.ligarSistema(sistema);
    expect(merlin.solicitarVetorizacao(5 * Math.PI / 180)).toBe(true);
    merlin.prepararPassoOperacional(0.5);
    expect(merlin.solicitarIgnicao()).toBe(true);
    const fixador = new FixadorEstrutural({ id: 'fixador-correcao-cinco-graus', objetoA: tanque, objetoB: merlin, resistenciaTracaoN: 1_000_000, obterEsforcoSolicitadoN: () => merlin.empuxoAtualN });
    mundo.registrarObjeto(tanque);
    mundo.registrarObjeto(merlin);
    mundo.registrarFixador(fixador);

    mundo.avancar(0.5);

    expect(Math.abs(tanque.getEstadoFisico().orientacaoRad.z - Math.PI / 2)).toBeLessThan(0.0001);
    expect(Math.abs(merlin.getEstadoFisico().velocidadeAngularRadps.z)).toBeLessThan(0.0001);
  });
});
