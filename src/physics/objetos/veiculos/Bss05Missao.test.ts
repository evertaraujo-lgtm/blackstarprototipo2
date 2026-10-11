import { describe, expect, it } from 'vitest';
import { criarTesteBss005 } from '../../../cenarios/BancadaBss';
import { GRAVIDADE_PADRAO_MPS2 } from '../propulsao/combustao/Bocal';
import { TanquePropelente } from '../fontes-de-energia/TanquePropelente';

// A missão e a interface usam exatamente a mesma montagem, inclusive painel,
// geometria, resistência, superfície e cadeia química. Este ensaio só valida subida.
describe('BSS-005 — capacidade da montagem real com Isp nominal de 350 s', () => {
  it('decola e atinge 15 km, registrando a reserva em vez de presumir retorno seguro', () => {
    const cenario = criarTesteBss005();
    const casco = cenario.seguirObjeto;
    const motor = cenario.propulsorControlavel;
    const tanques = cenario.objetos.filter((objeto): objeto is TanquePropelente => objeto instanceof TanquePropelente);
    const massaInicialKg = casco.massaInstantaneaDoConjuntoKg;
    const reservaInicialKg = tanques.reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0);
    expect(massaInicialKg).toBeCloseTo(5289.1660309923745, 8);
    expect(reservaInicialKg).toBe(3000);
    expect(motor.empuxoMaximoN / (massaInicialKg * GRAVIDADE_PADRAO_MPS2)).toBeGreaterThan(1.5);
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(motor.ligarSistema(sistema)).toBe(true);
    motor.definirThrottle(1);
    expect(motor.solicitarIgnicao()).toBe(true);
    // Limite é apenas watchdog do teste; não encerra o cenário na interface.
    for (let passo = 0; passo < 120 * 240 && casco.getEstadoFisico().posicaoM.y < 15000; passo++) {
      cenario.mundo.avancar(1 / 240);
      if (motor.empuxoAtualN === 0) break;
    }
    const reservaKg = tanques.reduce((soma, tanque) => soma + tanque.massaPropelenteKg, 0);
    const diagnostico = `t=${cenario.mundo.tempoS} s; y=${casco.getEstadoFisico().posicaoM.y} m; reserva=${reservaKg} kg; bloqueios=${motor.diagnosticoOperacional.join(', ')}`;
    expect(casco.getEstadoFisico().posicaoM.y, diagnostico).toBeGreaterThanOrEqual(15000);
    expect(cenario.mundo.tempoS).toBeCloseTo(72.6875, 3);
    expect(reservaKg).toBeCloseTo(458.7215235134394, 5);
    expect(massaInicialKg - casco.massaInstantaneaDoConjuntoKg).toBeCloseTo(reservaInicialKg - reservaKg, 8);
    expect(motor.impulsoEspecificoEfetivoS).toBeCloseTo(350, 8);
    expect(motor.estaIgnitado).toBe(true);
    expect(cenario.objetos.every((objeto) => objeto.integridadeEstrutural === 1)).toBe(true);
    expect(cenario.fixadores.every((fixador) => !fixador.estaRompido)).toBe(true);
  }, 90000);
});
