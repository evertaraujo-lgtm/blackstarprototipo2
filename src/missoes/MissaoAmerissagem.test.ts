import { describe, expect, it } from 'vitest';
import { BSS006_AMERISSAGEM_EXPERIMENTAL, MissaoBss006 } from './MissaoBss006';
import { criarMissaoBss006Registrada, reproduzirDiarioBss006 } from './ReplayMissaoBss006';

describe('M11-G — Missão aquática independente', () => {
  it('preserva a missão terrestre e carrega água somente na variante explícita', () => {
    const antigo = new MissaoBss006().observar(), novo = BSS006_AMERISSAGEM_EXPERIMENTAL.criar().observar();
    expect(antigo.id).toBe('BSS006_VOO_EXPERIMENTAL'); expect(antigo.aquatico).toBeUndefined(); expect(antigo.cenario.costa).toBeUndefined();
    expect(novo.id).toBe('BSS006_AMERISSAGEM_EXPERIMENTAL'); expect(novo.aquatico!.estado).toBe('seco');
    expect(novo.corpos.map(c => c.massaKg)).toEqual(antigo.corpos.map(c => c.massaKg));
    expect(novo.cenario.costa!.profundidadeM).toBe(50);
    expect(Object.isFrozen(novo.aquatico!.componentes)).toBe(true);
  });
  it('observa entrada real, aceita corte, pausa e cria novo ensaio sem resíduo', () => {
    const m = BSS006_AMERISSAGEM_EXPERIMENTAL.criar(); m.iniciar();
    for (let i = 0; i < 120; i++) m.avancarPasso();
    const o = m.observar(); expect(o.aquatico!.volumeSubmersoM3).toBeGreaterThan(0);
    expect(m.obterEventos().some(e => e.tipo === 'entrada-na-agua')).toBe(true);
    expect(m.receberComando({ tipo: 'desligar-motor' }).aceito).toBe(true); m.pausar();
    const pausado = m.observar(); expect(m.avancarPasso()).toBe(false); expect(m.observar()).toEqual(pausado);
    const novo = BSS006_AMERISSAGEM_EXPERIMENTAL.criar().observar(); expect(novo.tempoS).toBe(0); expect(novo.aquatico!.volumeSubmersoM3).toBe(0);
  }, 30_000);
  it('registra configuração/forças aquáticas e reproduz estados e eventos estritamente', () => {
    const m = criarMissaoBss006Registrada({ ensaioAquatico: { inclinacaoInicialRad: 0.005, velocidadeInicialMps: 0.5, altitudeInicialM: 5 } }, 24);
    m.iniciar(); for (let i = 0; i < 120; i++) m.avancarPasso(); m.pausar();
    const d = JSON.parse(JSON.stringify(m.exportar())); expect(reproduzirDiarioBss006(d).exportar()).toEqual(m.exportar());
    d.identificacao.configuracao.ensaioAquatico.velocidadeInicialMps = 4;
    expect(() => reproduzirDiarioBss006(d)).toThrow(/incompatíveis/);
  }, 30_000);
});
