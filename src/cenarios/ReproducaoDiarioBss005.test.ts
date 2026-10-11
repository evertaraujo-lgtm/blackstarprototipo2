import { describe, expect, it } from 'vitest';
import { criarTesteBss005 } from './BancadaBss';
import { executarReplayDiarioBss005 } from './ReproducaoDiarioBss005';
import { RegistroEnsaioBancada } from '../visualizacao/RegistroEnsaioBancada';

const DT = 1 / 240;

const criarDiario = () => {
  const cenario = criarTesteBss005();
  const registro = new RegistroEnsaioBancada(DT, {
    nome: cenario.nome,
    parametros: cenario.obterConfiguracaoEnsaio?.(),
    estadoInicial: cenario.objetos.map((objeto) => ({
      id: objeto.id,
      massaKg: objeto.massaKg,
      temperaturaC: objeto.temperaturaC,
      integridade: objeto.integridadeEstrutural,
      estado: objeto.getEstadoFisico(),
    })),
  });
  for (const [acao, valor] of [
    ['click:toggle-electric'], ['click:toggle-hydraulic'], ['click:toggle-fuel'], ['click:toggle-control'],
    ['input:throttle-input', '100'], ['click:ignite-engine'],
  ] as const) registro.registrarEntrada(acao, valor);
  for (let passo = 0; passo < 24; passo++) {
    if (passo === 12) registro.registrarEntrada('input:throttle-input', '0');
    if (passo === 15) registro.registrarEntrada('change:bss04-mode', 'pouso');
    registro.registrarPasso(DT);
  }
  return registro.exportar();
};

describe('replay de diário manual BSS-005', () => {
  it('reaplica comandos pelos métodos públicos e reproduz massa e estado determinísticos', () => {
    const diario = criarDiario();
    const primeiro = executarReplayDiarioBss005(diario, 0.025);
    const repetido = executarReplayDiarioBss005(diario, 0.025);

    expect(primeiro.passosExecutados).toBe(24);
    expect(primeiro.comandos.every((comando) => comando.aceito)).toBe(true);
    expect(primeiro.comandos.find((comando) => comando.acao === 'change:bss04-mode')?.passo).toBe(15);
    expect(primeiro.eventos.some((evento) => evento.tipo === 'corte-de-empuxo')).toBe(true);
    expect(primeiro.erroBalancoMaxKg).toBeLessThan(1e-7);
    expect(repetido).toEqual(primeiro);
  });

  it('rejeita diário de outra montagem antes de avançar o core', () => {
    const diario = criarDiario();
    const configuracao = diario.configuracao as { parametros: { id: string } };
    configuracao.parametros.id = 'bss-006';
    expect(() => executarReplayDiarioBss005(diario)).toThrow('configuração atual do BSS-005');
  });

  it('rejeita diário com estado físico inicial diferente da montagem atual', () => {
    const diario = criarDiario();
    const configuracao = diario.configuracao as {
      estadoInicial: { id: string; massaKg: number; temperaturaC: number; integridade: number; estado: unknown }[];
    };
    configuracao.estadoInicial[0]!.estado = { posicaoM: { x: 25, y: 0, z: 0 } };
    expect(() => executarReplayDiarioBss005(diario)).toThrow('estado físico inicial atual do BSS-005');
  });

  it('rejeita diário sem fotografia do estado inicial', () => {
    const diario = criarDiario();
    const { estadoInicial: _estadoInicial, ...configuracaoSemEstado } = diario.configuracao as Record<string, unknown>;
    const semEstadoInicial = {
      ...diario,
      configuracao: configuracaoSemEstado,
    };
    expect(() => executarReplayDiarioBss005(semEstadoInicial)).toThrow('estado físico inicial atual do BSS-005');
  });

  it('falha claramente quando o diário contém uma ação ainda não suportada', () => {
    const diario = criarDiario();
    const comAcaoDesconhecida = {
      ...diario,
      entradas: [...diario.entradas, { passo: 24, acao: 'change:unknown' }],
    };
    expect(() => executarReplayDiarioBss005(comAcaoDesconhecida)).toThrow('ainda não suportada');
  });
});
