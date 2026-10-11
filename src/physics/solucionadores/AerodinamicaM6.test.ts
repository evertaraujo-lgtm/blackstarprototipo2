import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../MundoFisico';
import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';

const DT = 1 / 240;
const criarCasco = (id: string, orientacaoRad = 0, velocidadeAngularRadps = 0, centroPressao = false) => new Objeto({
  id,
  massaBaseKg: 1_000,
  dimensoesM: new Vetor3(3.2, 6, 2.4),
  resistenciaColisaoJ: 1_000_000,
  limiteTermicoC: 1_000,
  areaFrontalM2: 7,
  coeficienteArrasto: 0.65,
  areaArrastoProjetadaPorOrientacao: true,
  centroPressaoLocalM: centroPressao ? new Vetor3(0, 3, 0) : undefined,
  estadoInicial: {
    posicaoM: new Vetor3(0, 1_000, 0),
    velocidadeMps: new Vetor3(0, -50, 0),
    orientacaoRad: new Vetor3(0, 0, orientacaoRad),
    velocidadeAngularRadps: new Vetor3(0, 0, velocidadeAngularRadps),
  },
});

describe('M6 — projeção aerodinâmica do veículo completo', () => {
  it('aumenta a área projetada do casco tombado usando a mesma calibração de face de referência', () => {
    const mundo = new MundoFisico(DT);
    const longitudinal = criarCasco('longitudinal');
    const lateral = criarCasco('lateral', Math.PI / 2);
    mundo.registrarObjeto(longitudinal);
    mundo.registrarObjeto(lateral);

    const forcaLongitudinalN = mundo.obterForcaArrastoAtmosferico(longitudinal).magnitude;
    const forcaLateralN = mundo.obterForcaArrastoAtmosferico(lateral).magnitude;

    expect(forcaLongitudinalN).toBeGreaterThan(0);
    expect(forcaLateralN / forcaLongitudinalN).toBeCloseTo(6 / 3.2, 12);
  });

  it('aplica arrasto no centro de pressão orientado e transmite torque ao core', () => {
    const mundo = new MundoFisico(DT);
    const casco = criarCasco('casco-com-cp', 0.1, 0, true);
    mundo.registrarObjeto(casco);
    const pontoM = casco.obterCentroPressaoM();
    expect(pontoM.x).toBeCloseTo(-3 * Math.sin(0.1), 12);
    expect(pontoM.y).toBeCloseTo(1_000 + 3 * Math.cos(0.1), 12);

    mundo.avancar(DT);

    expect(casco.getEstadoFisico().velocidadeAngularRadps.z).toBeLessThan(0);
    expect(casco.getEstadoFisico().orientacaoRad.z).toBeLessThan(0.1);
  });

  it('transmite o momento aerodinâmico ao conjunto estrutural rígido', () => {
    const mundo = new MundoFisico(DT);
    const casco = criarCasco('casco-ilha', 0.1, 0, true);
    const carga = new Objeto({
      id: 'carga-ilha', massaBaseKg: 1_000, dimensoesM: new Vetor3(3.2, 6, 2.4),
      resistenciaColisaoJ: 1_000_000, limiteTermicoC: 1_000,
      estadoInicial: {
        posicaoM: new Vetor3(0, 1_006, 0), velocidadeMps: new Vetor3(0, -50, 0),
        orientacaoRad: new Vetor3(0, 0, 0.1),
      },
    });
    mundo.registrarObjeto(casco);
    mundo.registrarObjeto(carga);
    mundo.registrarFixador(new FixadorEstrutural({
      id: 'fixador-aero-ilha', objetoA: casco, objetoB: carga,
      resistenciaTracaoN: 1_000_000, resistenciaCompressaoN: 1_000_000,
      obterEsforcoSolicitadoN: () => 0,
    }));

    mundo.avancar(DT);

    expect(casco.getEstadoFisico().velocidadeAngularRadps.z).toBeLessThan(0);
    expect(carga.getEstadoFisico().velocidadeAngularRadps.z).toBe(casco.getEstadoFisico().velocidadeAngularRadps.z);
    expect(carga.getEstadoFisico().orientacaoRad.z).toBe(casco.getEstadoFisico().orientacaoRad.z);
  });

  it('compara queda longitudinal, lateral e girando sob a mesma massa e atmosfera', () => {
    const criarEnsaio = (orientacaoRad: number, velocidadeAngularRadps: number) => {
      const mundo = new MundoFisico(DT);
      const casco = criarCasco(`casco-${orientacaoRad}-${velocidadeAngularRadps}`, orientacaoRad, velocidadeAngularRadps);
      mundo.registrarObjeto(casco);
      const areasObservadas: number[] = [];
      for (let passo = 0; passo < 480; passo += 1) {
        mundo.avancar(DT);
        if (passo % 60 === 0) {
          const velocidadeRelativa = casco.getEstadoFisico().velocidadeMps;
          areasObservadas.push(casco.getAreaArrastoEfetivaM2(velocidadeRelativa));
        }
      }
      return { casco, areasObservadas };
    };

    const longitudinal = criarEnsaio(0, 0);
    const lateral = criarEnsaio(Math.PI / 2, 0);
    const girando = criarEnsaio(0.15, 0.4);
    const velocidadeLongitudinalMps = Math.abs(longitudinal.casco.getEstadoFisico().velocidadeMps.y);
    const velocidadeLateralMps = Math.abs(lateral.casco.getEstadoFisico().velocidadeMps.y);

    expect(velocidadeLateralMps).toBeLessThan(velocidadeLongitudinalMps);
    expect(girando.areasObservadas.at(-1)).not.toBeCloseTo(girando.areasObservadas[0]!, 2);
    expect(girando.casco.massaKg).toBe(longitudinal.casco.massaKg);
    expect(girando.casco.getEstadoFisico().orientacaoRad.z).not.toBeCloseTo(0.15, 3);
  });
});
