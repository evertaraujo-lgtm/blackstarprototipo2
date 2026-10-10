import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import { ControladorDesaceleracaoDePropulsores } from './ControladorDesaceleracaoDePropulsores';
import { ControladorPousoDePropulsores } from './ControladorPousoDePropulsores';

const leituras = (altitudeM: number, velocidadeVerticalMps: number) => ({
  posicaoGpsM: Vetor3.zero,
  altitudeM,
  velocidadeVerticalMps,
  velocidadeHorizontalMps: 0,
  inclinacaoRad: 0,
});

describe('adaptadores de controles de propulsores', () => {
  it('corta o throttle quando a desaceleração deixa de atuar', () => {
    const controlador = new ControladorDesaceleracaoDePropulsores();
    controlador.configurar({ velocidadeInicioMps: 10, velocidadeVerticalAlvoMps: -7, altitudeMinimaM: 40 }, ['motor']);
    controlador.habilitar();

    expect(controlador.calcularSolicitacoes(leituras(100, -20), 0.1).find((solicitacao) => solicitacao.recurso === 'throttle')?.valor).toBeGreaterThan(0);
    expect(controlador.calcularSolicitacoes(leituras(100, -8), 0.1)).toContainEqual({ idAtuador: 'motor', recurso: 'throttle', valor: 0 });
  });

  it('cede a atuação quando o controle de pouso fica fora da faixa configurada', () => {
    const controlador = new ControladorPousoDePropulsores();
    controlador.configurar({ altitudeAlvoM: 4, altitudeInicioFrenagemM: 40, usarGatilhoAltitude: true }, ['motor']);
    controlador.habilitar();

    expect(controlador.calcularSolicitacoes(leituras(20, -8), 0.1).find((solicitacao) => solicitacao.recurso === 'throttle')?.valor).toBeGreaterThan(0);
    expect(controlador.calcularSolicitacoes(leituras(50, -8), 0.1)).toEqual([]);
  });
});
