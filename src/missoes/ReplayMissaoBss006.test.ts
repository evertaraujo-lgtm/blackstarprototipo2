import { describe, expect, it } from 'vitest';
import { criarMissaoBss006Registrada, reproduzirDiarioBss006, validarComandoBss006 } from './ReplayMissaoBss006';
import { executarMissaoAtePasso } from './ExecutorMissao';

function diario() {
  const m = criarMissaoBss006Registrada();
  for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) m.receberComando({ tipo: 'sistema', sistema, ligar: true });
  m.receberComando({ tipo: 'ignicao' }); m.iniciar(); executarMissaoAtePasso(m, 480);
  m.pausar(); expect(m.avancarPasso()).toBe(false);
  m.receberComando({ tipo: 'throttle', valor: -1 }); // negação também reproduzível
  m.iniciar(); executarMissaoAtePasso(m, 720, [{ passo: 600, comando: { tipo: 'desligar-motor' } }]); m.pausar();
  return m;
}
describe('M10-F — diário portátil e replay versionado', () => {
  it('reproduz JSON com comandos negados, pausa, retomada, telemetria e eventos exatos', () => {
    const m = diario(); const original = m.exportar();
    const r = reproduzirDiarioBss006(JSON.parse(JSON.stringify(original)));
    expect(r.exportar()).toEqual(original); expect(m.exportar()).toEqual(original);
    expect(original.amostras).toHaveLength(4); expect(original.final.metanoKg).toBeLessThan(600);
    expect(original.final.execucao).toBe('pausada');
  }, 30_000);
  it('rejeita física/revisão/estado inicial/agenda adulterados antes de executar', () => {
    const original = JSON.parse(JSON.stringify(criarMissaoBss006Registrada().exportar()));
    for (const alterar of [
      (d: typeof original) => { d.identificacao.revisaoMissao = 'outra'; },
      (d: typeof original) => { d.identificacao.modeloFisico.campo.muM3S2 *= 2; },
      (d: typeof original) => { d.inicial.casco.posicaoM.y = 300; },
      (d: typeof original) => { d.entradas = [{ tipo: 'comando', sequencia: 0, passo: -1, comando: { tipo: 'ignicao' }, resultado: {} }]; },
    ]) { const d = structuredClone(original); alterar(d); expect(() => reproduzirDiarioBss006(d)).toThrow(); }
  });
  it('rejeita entrada sem tipo, não finita ou campo cinemático e conserva snapshot original', () => {
    expect(validarComandoBss006(null)).toBe(false);
    expect(validarComandoBss006({ tipo: 'sistema', sistema: ['elétrico'], ligar: true })).toBe(false);
    expect(validarComandoBss006({ tipo: 'falha-alimentacao', alimentacao: ['metano'] })).toBe(false);
    expect(validarComandoBss006({ tipo: 'throttle', valor: NaN })).toBe(false);
    expect(validarComandoBss006({ tipo: 'ignicao', posicaoM: [0, 300] })).toBe(false);
    const m = criarMissaoBss006Registrada(); expect(() => Object.assign(m.exportar().identificacao, { id: 'falso' })).toThrow();
    expect(() => reproduzirDiarioBss006({})).toThrow('inválido');
  });
});
