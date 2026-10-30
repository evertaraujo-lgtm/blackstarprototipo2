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

  it('monta o motor na cauda axial e inicia a variante manual com o nariz para cima', () => {
    const ensaio = criarEnsaioPropulsivoOrbitadorRe002({ montagemPropulsorAxial: true });
    const corpo = ensaio.veiculo.getEstadoFisico(), motor = ensaio.propulsor.getEstadoFisico();
    const dx = motor.posicaoM.x - corpo.posicaoM.x, dy = motor.posicaoM.y - corpo.posicaoM.y;
    const angulo = corpo.orientacaoRad.z;
    expect(ensaio.veiculo.obterLeiturasDoComputadorDeVoo().inclinacaoRad).toBeCloseTo(Math.PI / 2, 8);
    expect(dx * Math.cos(angulo) + dy * Math.sin(angulo)).toBeCloseTo(-18, 8);
    expect(-dx * Math.sin(angulo) + dy * Math.cos(angulo)).toBeCloseTo(0, 8);
    expect(motor.orientacaoRad.z - corpo.orientacaoRad.z).toBeCloseTo(0, 8);
  });
});
