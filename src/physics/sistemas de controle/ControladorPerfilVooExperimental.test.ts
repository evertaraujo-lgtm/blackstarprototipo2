import { expect, it } from 'vitest';
import { ControladorPerfilVooExperimental } from './ControladorPerfilVooExperimental';
it('perfil solicita pouso uma vez na fronteira, sem rearmar durante oscilações de altitude', () => {
  const c = new ControladorPerfilVooExperimental(300, true);
  expect(c.atualizar(299.99)).toBeUndefined(); expect(c.atualizar(300)).toBe('pouso');
  expect(c.atualizar(299)).toBeUndefined(); expect(c.atualizar(301)).toBeUndefined();
});
it('perfil manual e leituras inválidas não acionam operação automática', () => {
  expect(new ControladorPerfilVooExperimental(300, false).atualizar(400)).toBeUndefined();
  expect(() => new ControladorPerfilVooExperimental(300, true).atualizar(NaN)).toThrow();
});
