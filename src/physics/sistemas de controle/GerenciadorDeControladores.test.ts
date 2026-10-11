import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import {
  GerenciadorDeControladores,
  type ControladorDeVoo,
  type SolicitacaoDeAtuador,
} from './GerenciadorDeControladores';

const leituras = {
  posicaoGpsM: Vetor3.zero, altitudeM: 10, velocidadeVerticalMps: 0,
  velocidadeHorizontalMps: 0, inclinacaoRad: 0,
};

const criarControlador = (id: string, prioridade: number, solicitacoes: readonly SolicitacaoDeAtuador[]): ControladorDeVoo => {
  let habilitado = false;
  return {
    id, prioridade,
    get estaHabilitado() { return habilitado; },
    habilitar: () => { habilitado = true; },
    desabilitar: () => { habilitado = false; },
    calcularSolicitacoes: () => solicitacoes,
  };
};

describe('GerenciadorDeControladores', () => {
  it('mantém vários controles ativos quando seus recursos ou atuadores são independentes', () => {
    const gerenciador = new GerenciadorDeControladores();
    gerenciador.registrar(criarControlador('atitude', 50, [{ idAtuador: 'motor-a', recurso: 'gimbal', valor: 0.1 }]));
    gerenciador.registrar(criarControlador('térmico', 10, [{ idAtuador: 'válvula-radiador', recurso: 'throttle', valor: 0.8 }]));
    gerenciador.habilitar('atitude');
    gerenciador.habilitar('térmico');

    expect(gerenciador.idsAtivos()).toEqual(['atitude', 'térmico']);
    expect(gerenciador.calcularSolicitacoes(leituras, 0.1)).toEqual([
      { idAtuador: 'motor-a', recurso: 'gimbal', valor: 0.1 },
      { idAtuador: 'válvula-radiador', recurso: 'throttle', valor: 0.8 },
    ]);
  });

  it('arbitra apenas a disputa do mesmo atuador e recurso pela prioridade', () => {
    const gerenciador = new GerenciadorDeControladores();
    gerenciador.registrar(criarControlador('atitude', 50, [{ idAtuador: 'motor-a', recurso: 'gimbal', valor: 0.1 }]));
    gerenciador.registrar(criarControlador('pouso', 100, [{ idAtuador: 'motor-a', recurso: 'gimbal', valor: -0.2 }]));
    gerenciador.habilitar('atitude');
    gerenciador.habilitar('pouso');

    expect(gerenciador.calcularSolicitacoes(leituras, 0.1)).toEqual([
      { idAtuador: 'motor-a', recurso: 'gimbal', valor: -0.2 },
    ]);
  });
});

describe('arbitragem rastreável', () => {
  it('resolve empates pelo id, mantém throttle independente e limpa comandos ao perder energia', () => {
    const executar = (ids: string[]) => {
      const g = new GerenciadorDeControladores();
      for (const id of ids) {
        g.registrar(criarControlador(id, 50, [{ idAtuador: 'motor', recurso: 'gimbal', valor: id === 'a' ? 0.1 : -0.1 }]));
        g.habilitar(id);
      }
      g.registrar(criarControlador('throttle', 100, [{ idAtuador: 'motor', recurso: 'throttle', valor: 0.5 }]));
      g.habilitar('throttle');
      g.calcularSolicitacoes(leituras, 1 / 240);
      const arbitragens = g.obterUltimaArbitragem();
      expect(arbitragens).toContainEqual({ idAtuador: 'motor', recurso: 'gimbal', valor: 0.1, idControlador: 'a' });
      expect(arbitragens).toContainEqual({ idAtuador: 'motor', recurso: 'throttle', valor: 0.5, idControlador: 'throttle' });
      g.reiniciarControladores();
      expect(g.obterUltimaArbitragem()).toEqual([]);
      expect(g.idsAtivos()).toContain('a');
      return arbitragens;
    };
    expect(executar(['a', 'b'])).toEqual(executar(['b', 'a']));
  });
});

it('não conserva integral do PID que cede o gimbal à guiagem', async () => {
  const { ControladorInclinacaoDePropulsores } = await import('./ControladorInclinacaoDePropulsores');
  const g = new GerenciadorDeControladores();
  const pid = new ControladorInclinacaoDePropulsores();
  pid.configurarAlvos(['motor']);
  g.registrar(pid);
  g.registrar(criarControlador('guia', 95, [{ idAtuador: 'motor', recurso: 'gimbal', valor: 0 }]));
  g.habilitar('inclinacao');
  g.habilitar('guia');
  for (let i = 0; i < 2400; i++) g.calcularSolicitacoes({ ...leituras, inclinacaoRad: 0.1, velocidadeAngularRadps: 0 }, 1 / 240);
  g.desabilitar('guia');
  expect(g.calcularSolicitacoes({ ...leituras, velocidadeAngularRadps: 0 }, 1 / 240)).toEqual([{ idAtuador: 'motor', recurso: 'gimbal', valor: 0 }]);
});
