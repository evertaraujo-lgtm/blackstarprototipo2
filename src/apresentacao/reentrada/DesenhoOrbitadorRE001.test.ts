import { describe, expect, it } from 'vitest';
import { desenharOrbitadorRE001 } from './DesenhoOrbitadorRE001';

type Operacao = readonly [string, ...unknown[]];

function contextoDeGravacao(): { ctx: CanvasRenderingContext2D; operacoes: Operacao[] } {
  const operacoes: Operacao[] = [];
  const alvo = new Proxy({}, {
    get(_objeto, propriedade) {
      if (propriedade === 'createLinearGradient') return (...argumentos: unknown[]) => {
        operacoes.push(['createLinearGradient', ...argumentos]);
        return { addColorStop: (offset: number, cor: string) => { operacoes.push(['addColorStop', offset, cor]); } };
      };
      return (...argumentos: unknown[]) => { operacoes.push([String(propriedade), ...argumentos]); };
    },
    set(_objeto, propriedade, valor) {
      operacoes.push([String(propriedade), typeof valor === 'object' ? 'gradient' : valor]);
      return true;
    },
  });
  return { ctx: alvo as unknown as CanvasRenderingContext2D, operacoes };
}

const aparencia = (rolagemRad: number, flaps = [{ conectado: true, deflexaoRad: 0, integridade: 1 }]) => ({
  pixelsPorMetro: 2.5,
  rolagemRad,
  integridade: 1,
  flaps,
});

describe('símbolo lateral longitudinal do RE-001', () => {
  it.each([0, Math.PI / 2, -Math.PI / 2])('mantém a mesma silhueta lateral com rolagem virtual %s rad', rolagemRad => {
    const referencia = contextoDeGravacao(), resultado = contextoDeGravacao();
    desenharOrbitadorRE001(referencia.ctx, aparencia(0));
    desenharOrbitadorRE001(resultado.ctx, aparencia(rolagemRad));
    expect(resultado.operacoes).toEqual(referencia.operacoes);
  });

  it.each([-Math.PI / 6, 0, Math.PI / 6])('aplica a deflexão do flap de perfil (%s rad)', deflexaoRad => {
    const { ctx, operacoes } = contextoDeGravacao();
    desenharOrbitadorRE001(ctx, aparencia(0, [{ conectado: true, deflexaoRad, integridade: 1 }]));
    expect(operacoes.filter(([nome]) => nome === 'rotate')).toEqual([['rotate', -deflexaoRad]]);
  });

  it('omite o flap desconectado da arte integrada', () => {
    const { ctx, operacoes } = contextoDeGravacao();
    desenharOrbitadorRE001(ctx, aparencia(0, [{ conectado: false, deflexaoRad: 0.3, integridade: 1 }]));
    expect(operacoes.some(([nome]) => nome === 'rotate')).toBe(false);
    expect(operacoes.some(([nome]) => nome === 'arc')).toBe(false);
  });
});
