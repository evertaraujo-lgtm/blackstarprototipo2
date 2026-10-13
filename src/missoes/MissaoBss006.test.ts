import { describe, expect, it } from 'vitest';
import { BSS006_VOO_EXPERIMENTAL, MissaoBss006 } from './MissaoBss006';
import { executarMissaoAtePasso } from './ExecutorMissao';

export function preparar(m: ReturnType<typeof BSS006_VOO_EXPERIMENTAL.criar>) {
  for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const)
    expect(m.receberComando({ tipo: 'sistema', sistema, ligar: true }).aceito).toBe(true);
  expect(m.receberComando({ tipo: 'throttle', valor: 0.65 }).aceito).toBe(true);
  expect(m.receberComando({ tipo: 'ignicao' }).aceito).toBe(true);
}
describe('M10-D — primeira missão independente', () => {
  it('nasce na plataforma esférica, separa início de ignição e recusa permissivos inválidos', () => {
    const m = BSS006_VOO_EXPERIMENTAL.criar();
    const inicial = m.observar();
    expect(inicial.pouso.contatoInicial).toBe(true); expect(inicial.pouso.toqueRetorno).toBe(false);
    expect(inicial.altitudeM).toBeCloseTo(4.8, 6); expect(inicial.metanoKg).toBe(600);
    expect(inicial.cenario.modeloFisico).toMatchObject({ revisao: 'terra-esferica-m9', plano: 'XY' });
    expect(m.receberComando({ tipo: 'ignicao' }).aceito).toBe(false);
    expect(m.receberComando({ tipo: 'sistema', sistema: 'controle', ligar: true }).aceito).toBe(false);
    expect(m.receberComando({ tipo: 'throttle', valor: NaN }).aceito).toBe(false);
    m.iniciar(); executarMissaoAtePasso(m, 240);
    expect(m.observar().empuxoN).toBe(0); expect(m.observar().metanoKg).toBe(600);
    expect(m.observar().pouso.toqueRetorno).toBe(false);
  });
  it('aciona forças reais, pausa sem consumo e reinicializa por definição sem estado residual', () => {
    const m = BSS006_VOO_EXPERIMENTAL.criar(); preparar(m); m.iniciar(); executarMissaoAtePasso(m, 480);
    const o = m.observar(); expect(o.tempoS).toBeGreaterThan(1.99); expect(o.empuxoN).toBeGreaterThan(0);
    expect(o.vazaoKgS).toBeGreaterThan(0); expect(o.metanoKg).toBeLessThan(600); expect(o.altitudeM).toBeGreaterThan(4.8);
    expect(o.objetivos.find(x => x.id === 'decolagem')?.estado).toBe('atingido');
    expect(m.receberComando({ tipo: 'alvo-pouso', deslocamentoM: 34.7 }).aceito).toBe(false);
    m.pausar(); const pausada = m.observar(); expect(m.avancarPasso()).toBe(false); expect(m.observar()).toEqual(pausada);
    const nova = BSS006_VOO_EXPERIMENTAL.criar(); expect(nova.observar().tempoS).toBe(0);
    expect(nova.observar().metanoKg).toBe(600); expect(nova.estadoExecucao).toBe('preparada');
    expect(nova.obterEventos()).toHaveLength(1);
  });
  it('snapshots e eventos não oferecem acesso mutável à instância física', () => {
    const m = BSS006_VOO_EXPERIMENTAL.criar(); const o = m.observar();
    expect(() => Object.assign(o.casco.posicaoM, { y: 100 })).toThrow();
    expect(() => Object.assign(o.corpos[0], { integridade: 0 })).toThrow();
    expect(() => Object.assign(o.cenario.modeloFisico, { falsificado: true })).toThrow();
    const evento = m.obterEventos()[0]; Object.assign(evento, { tipo: 'alterado' });
    expect(m.obterEventos()[0].tipo).toBe('missao-carregada'); expect(m.observar()).toEqual(o);
  });
  it('configuração local em outro ponto da Terra usa geometria/atitude radial e valida entradas', () => {
    const m = BSS006_VOO_EXPERIMENTAL.criar({ arcoBaseM: 1_000_000, alvoPousoLocalM: -34.7 });
    expect(m.observar().altitudeM).toBeCloseTo(4.8, 5);
    expect(m.observar().atitudeLocalRad).toBeCloseTo(0, 6);
    expect(m.observar().alvoPousoLocalM).toBeCloseTo(-34.7, 6);
    expect(() => BSS006_VOO_EXPERIMENTAL.criar({ altitudeTransicaoM: -1 })).toThrow();
    expect(() => BSS006_VOO_EXPERIMENTAL.criar({ ventoTangencialMps: Infinity })).toThrow();
  });
});

it('permite outro plano identificado usando o mesmo veículo e executor', () => {
  const m = new MissaoBss006({ transicaoAutomatica: false, altitudeTransicaoM: 80 }, 'BSS006_PERFIL_MANUAL');
  expect(m.id).toBe('BSS006_PERFIL_MANUAL'); expect(m.observar().corpos[0].id).toBe('bss-006');
  m.iniciar(); executarMissaoAtePasso(m, 1); expect(m.observar().passo).toBe(1);
});
