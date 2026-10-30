import { describe, expect, it } from 'vitest';
import { criarEnsaioPropulsivoOrbitadorRe002 } from './EnsaioPropulsivoOrbitadorRe002';

describe('montagem propulsiva RE-002E', () => {
  it('registra casco, propulsor, tanques e bateria como objetos vinculados sem ignição implícita', () => {
    const ensaio = criarEnsaioPropulsivoOrbitadorRe002();
    expect(ensaio.veiculo.massaInstantaneaDoConjuntoKg).toBeGreaterThan(78_900 + 18_000);
    expect(ensaio.propulsor.estaIgnitado).toBe(false);
    expect(ensaio.propulsor.empuxoAtualN).toBe(0);
    expect(ensaio.tanqueMetano.massaPropelenteKg).toBe(3_600);
    expect(ensaio.tanqueOxidante.massaPropelenteKg).toBe(14_400);
    expect(ensaio.veiculo.fixadoresEstruturais).toHaveLength(4);
    expect(ensaio.mundo.tempoS).toBe(0);
  });

  it('só permite empuxo depois da solicitação explícita de ignição', () => {
    const ensaio = criarEnsaioPropulsivoOrbitadorRe002();
    const respostas = ensaio.veiculo.solicitarIgnicaoDosPropulsores();
    expect(respostas).toHaveLength(1);
    expect(respostas[0].aceito).toBe(true);
    ensaio.veiculo.definirThrottleDoPropulsor(ensaio.propulsor.id, 0.5);
    ensaio.mundo.avancar(1 / 240);
    expect(ensaio.propulsor.empuxoAtualN).toBeGreaterThan(0);
    expect(ensaio.tanqueMetano.massaPropelenteKg).toBeLessThan(3_600);
    expect(ensaio.veiculo.massaInstantaneaDoConjuntoKg).toBeLessThan(ensaio.massaInicialKg);
  });
});
