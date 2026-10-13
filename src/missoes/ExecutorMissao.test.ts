import { describe, expect, it } from 'vitest';
import { criarEnsaioOrbitalInerte } from '../cenarios/EnsaioOrbitalInerte';
import { CicloMissao } from './CicloMissao';
import { executarMissaoAtePasso } from './ExecutorMissao';
import type { InstanciaMissao } from './ContratoMissao';

function inerte() {
  const e = criarEnsaioOrbitalInerte(); const ciclo = new CicloMissao();
  const instancia: InstanciaMissao<'pausar', ReturnType<typeof e.ler>> = {
    id: 'prova-porta-orbital', passoS: 1,
    get passosExecutados() { return ciclo.passosExecutados; },
    get estadoExecucao() { return ciclo.estadoExecucao; },
    iniciar: () => ciclo.iniciar(), pausar: () => ciclo.pausar(),
    receberComando: () => { ciclo.pausar(); return { aceito: true, motivo: 'pausada' }; },
    avancarPasso: () => { if (ciclo.estadoExecucao !== 'executando') return false; e.mundo.avancar(1); ciclo.registrarPasso(); return true; },
    observar: e.ler, obterEventos: () => [],
  };
  return { instancia, e };
}
describe('M10-C — contrato e executor genérico', () => {
  it('opera corpo inerte sem depender de propulsão ou BSS e respeita pausa', () => {
    const { instancia, e } = inerte(); const inicial = e.corpo.getEstadoFisico();
    expect(instancia.avancarPasso()).toBe(false);
    expect(() => executarMissaoAtePasso(instancia, 10)).toThrow('interrompido');
    expect(e.corpo.getEstadoFisico()).toEqual(inicial);
    instancia.iniciar(); executarMissaoAtePasso(instancia, 10);
    expect(e.mundo.tempoS).toBe(10);
    instancia.pausar(); expect(instancia.avancarPasso()).toBe(false);
    instancia.iniciar(); executarMissaoAtePasso(instancia, 20);
    expect(e.mundo.tempoS).toBe(20);
  });
  it('agenda na fronteira correta e rejeita orçamento/ordem inválidos antes de avançar', () => {
    const { instancia, e } = inerte(); instancia.iniciar();
    expect(() => executarMissaoAtePasso(instancia, 2.5)).toThrow('inválido');
    expect(() => executarMissaoAtePasso(instancia, 10, [{ passo: 4, comando: 'pausar' }, { passo: 3, comando: 'pausar' }])).toThrow('ordenados');
    expect(e.mundo.tempoS).toBe(0);
    expect(() => executarMissaoAtePasso(instancia, 10, [{ passo: 4, comando: 'pausar' }])).toThrow('interrompido');
    expect(e.mundo.tempoS).toBe(4);
  });
});
