import { describe, expect, it } from 'vitest';
import { amostrarCruzamentosMach, type EstadoCruzamentoMach } from './CruzamentosMach';

const estado = (mudancas: Partial<EstadoCruzamentoMach> = {}): EstadoCruzamentoMach => ({
  tempoS: 1, passo: 1, mach: 9.5, altitudeM: 90000, arcoM: 1000, velocidadeMps: 3000,
  velocidadeRadialMps: -100, velocidadeTangencialMps: 2998, trajetoriaRad: -0.03,
  atitudeLocalRad: 0.6, alphaRad: 0.7, omegaRadps: 0.01, pressaoDinamicaPa: 5000,
  fluxoTermicoWm2: 80000, torqueAerodinamicoNm: -2000, energiaMecanicaEspecificaJPorKg: -1e7,
  temperaturaCorpoC: 180, temperaturaFlapsC: [400, 420], integridadeCorpo: 1,
  integridadeFlaps: [1, 1], alimentacaoFlaps: [true, true], vinculosFlaps: [true, true],
  estadoControle: 'automatico', autoridadeDisponivel: true, ...mudancas,
});

describe('amostragem de cruzamentos Mach em passos físicos', () => {
  it('interpela o cruzamento e a telemetria entre os dois estados consecutivos', () => {
    const anterior = estado({ tempoS: 0.5, passo: 120, mach: 10.5, altitudeM: 100000 });
    const atual = estado({ tempoS: 0.5041666667, passo: 121, mach: 9.5, altitudeM: 90000 });
    const [evento] = amostrarCruzamentosMach(anterior, atual, [10]);
    expect(evento.fracaoPasso).toBeCloseTo(0.5, 12);
    expect(evento.tempoS).toBeCloseTo(0.50208333335, 12);
    expect(evento.estado.altitudeM).toBe(95000);
    expect(evento.passoFinal).toBe(121);
    expect(evento.componentesEssenciaisIntegrais).toBe(true);
    expect(evento.controleDisponivel).toBe(true);
  });

  it('marca como reprovado cruzamento após perda de flap, energia ou autoridade', () => {
    const anterior = estado({ tempoS: 0, passo: 10, mach: 2.1 });
    const atual = estado({ tempoS: 1 / 240, passo: 11, mach: 1.9,
      integridadeFlaps: [0, 1], alimentacaoFlaps: [false, true], estadoControle: 'sem-autoridade', autoridadeDisponivel: false });
    const [evento] = amostrarCruzamentosMach(anterior, atual, [2]);
    expect(evento.componentesEssenciaisIntegrais).toBe(false);
    expect(evento.controleDisponivel).toBe(false);
  });

  it('não inventa cruzamentos em aceleração, igualdade ou passos descontínuos', () => {
    const anterior = estado({ tempoS: 0, passo: 4, mach: 9 });
    expect(amostrarCruzamentosMach(anterior, estado({ tempoS: 1, passo: 5, mach: 10 }), [10])).toEqual([]);
    expect(amostrarCruzamentosMach(anterior, estado({ tempoS: 1, passo: 6, mach: 8 }), [10])).toEqual([]);
    expect(amostrarCruzamentosMach(anterior, estado({ tempoS: 0, passo: 5, mach: 8 }), [10])).toEqual([]);
  });
});
