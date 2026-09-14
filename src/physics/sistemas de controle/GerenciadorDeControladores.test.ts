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
