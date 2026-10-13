import { obterTelemetriaOrbital } from './TelemetriaOrbital';
import { SuperficiePlano } from '../SuperficiePlano';
import { describe, expect, it } from 'vitest';
import { criarEstadoInicialLocal } from './EstadoInicialLocal';
import { AmbienteTerrestre } from './AmbienteFisico';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { VeiculoComposto } from '../objetos/veiculos/VeiculoComposto';
import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { Vetor3 } from '../Vetor3';
import { criarEnsaioOrbitalInerte } from '../../cenarios/EnsaioOrbitalInerte';
import { CameraFisica2D } from '../../visualizacao/CameraFisica2D';

const ambiente = new AmbienteTerrestre();
const ref = ambiente.referencial;
describe('M9-G — interfaces para ensaios suborbitais/orbitais e separação futura', () => {
  it('estado inicial local é transformado uma vez e recupera grandezas operacionais', () => {
    const e = criarEstadoInicialLocal(ref, { arcoM: ref.raioM * Math.PI / 2, altitudeM: 100000,
      velocidadeRadialMps: 100, velocidadeTangencialMps: 7000, atitudeLocalRad: 0.3, taxaAtitudeLocalRadps: 0.01 });
    expect(ref.altitudeGeometricaM(e.posicaoM)).toBeCloseTo(100000, 8);
    expect(ref.vetorParaLocal(e.velocidadeMps, e.posicaoM).y).toBeCloseTo(100, 11);
    expect(ref.atitudeLocalRad(e.orientacaoRad.z, e.posicaoM)).toBeCloseTo(0.3, 12);
    expect(ref.taxaAtitudeLocalRadps(e.velocidadeAngularRadps.z, e.posicaoM, e.velocidadeMps)).toBeCloseTo(0.01, 12);
  });
  it('liberação sem impulso preserva estados, remove massa do agregado e libera dois corpos no mesmo core', () => {
    const mundo = new MundoFisico(0.01, { ambiente, densidadeAtmosfericaKgM3: 0 });
    const base = (id: string, massaBaseKg: number, x: number) => ({ id, massaBaseKg, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 1e6, limiteTermicoC: 1000, estadoInicial: { posicaoM: new Vetor3(x, 400000, 0), velocidadeMps: new Vetor3(7000, 0, 0) } });
    const casco = new VeiculoComposto(base('corpo-a', 100, 0));
    const modulo = new Objeto(base('corpo-b', 10, 2));
    casco.adicionarModulo(modulo);
    const f = new FixadorEstrutural({ id: 'separacao', objetoA: casco, objetoB: modulo, resistenciaTracaoN: 1e6, obterEsforcoSolicitadoN: () => 0 });
    casco.adicionarFixador(f); casco.registrarNoMundo(mundo); mundo.avancar(0.01);
    expect(casco.massaInstantaneaDoConjuntoKg).toBe(110);
    const antes = [casco, modulo].map(o => o.getEstadoFisico());
    expect(f.liberar()).toBe(true); expect(f.liberar()).toBe(false);
    expect(f.estaRompido).toBe(false); expect(f.estaAtivo).toBe(false); expect(f.estado).toBe('liberado');
    expect([casco, modulo].map(o => o.getEstadoFisico())).toEqual(antes);
    expect(casco.massaInstantaneaDoConjuntoKg).toBe(100);
    const livre = new MundoFisico(0.01, { ambiente, densidadeAtmosfericaKgM3: 0 });
    const provas = antes.map((estadoInicial, i) => new Objeto({ ...base(`livre-${i}`, i ? 10 : 100, 0), estadoInicial }));
    for (const o of provas) livre.registrarObjeto(o);
    livre.avancar(0.01); mundo.avancar(0.01);
    [casco, modulo].forEach((o, i) => {
      expect(o.getEstadoFisico().posicaoM.subtrair(provas[i].getEstadoFisico().posicaoM).magnitude).toBeLessThan(1e-8);
      expect(o.getEstadoFisico().velocidadeMps.subtrair(provas[i].getEstadoFisico().velocidadeMps).magnitude).toBeLessThan(1e-10);
    });
  });
  it.each(['circular', 'eliptica'] as const)('demonstração %s usa corpo inerte e mantém o snapshot inicial', (tipo) => {
    const c = criarEnsaioOrbitalInerte(tipo);
    const inicial = c.obterConfiguracao();
    for (let i = 0; i < 600; i++) c.mundo.avancar(1);
    expect(c.obterConfiguracao()).toEqual(inicial);
    expect(c.ler().estado).toBe('orbital');
    expect(Math.abs(c.ler().energiaEspecificaJPorKg / c.inicial.energiaEspecificaJPorKg - 1)).toBeLessThan(1e-6);
    expect(c.corpo.integridadeEstrutural).toBe(1);
    expect(c.mundo.obterForcaArrastoAtmosferico(c.corpo).magnitude).toBe(0);
  });
  it('telemetria orbital também rejeita vetores fora do plano', () => {
    expect(() => obterTelemetriaOrbital(new Vetor3(0, 400000, 1), Vetor3.zero, ambiente.campo)).toThrow(/XY/);
    expect(() => obterTelemetriaOrbital(new Vetor3(0, 400000, 0), new Vetor3(0, 0, 1), ambiente.campo)).toThrow(/XY/);
  });
  it('API central rejeita solo global plano e vento fora de XY', () => {
    const mundo = new MundoFisico(0.01, { ambiente, densidadeAtmosfericaKgM3: 0 });
    expect(() => mundo.registrarSuperficie(new SuperficiePlano('infinito', 'concreto', 0, 1e6))).toThrow(/Plano infinito/);
    expect(() => new MundoFisico(0.01, { ambiente, velocidadeArMps: new Vetor3(0, 0, 1) })).toThrow(/XY/);
  });
  it.each([0, 0.3, Math.PI / 2, Math.PI])('consulta otimizada do plano mantém igualdade exata em theta=%f', (theta) => {
    const mundo = new MundoFisico();
    const plano = new SuperficiePlano('plano', 'concreto', 1.3, 1e6);
    const o = new Objeto({ id: 'query', massaBaseKg: 1, dimensoesM: new Vetor3(3, 2, 1), limiteTermicoC: 1000,
      resistenciaColisaoJ: 1e6, estadoInicial: { posicaoM: new Vetor3(10.2, 2.4, 0), orientacaoRad: new Vetor3(0, 0, theta) } });
    mundo.registrarObjeto(o);
    const e = o.getEstadoFisico();
    const distanciaGenerica = Math.min(...o.getPontosDeContatoLocaisM().map(p => plano.distanciaAssinadaM(new Vetor3(
      e.posicaoM.x + p.x * Math.cos(theta) - p.y * Math.sin(theta),
      e.posicaoM.y + p.x * Math.sin(theta) + p.y * Math.cos(theta), e.posicaoM.z + p.z))));
    expect(mundo.obterMenorDistanciaSuperficieM(o, plano)).toBe(distanciaGenerica);
  });
  it('câmera round-trip não altera o mundo e respeita Y físico positivo', () => {
    const c = criarEnsaioOrbitalInerte();
    const antes = c.corpo.getEstadoFisico();
    for (const escala of [0.1, 100, 40000]) {
      const camera = new CameraFisica2D(ambiente.campo.centroM, escala, 1200, 800);
      const pixel = camera.projetar(antes.posicaoM);
      expect(pixel.y).toBeLessThan(400);
      expect(camera.desprojetar(pixel.x, pixel.y).subtrair(antes.posicaoM).magnitude).toBeLessThan(1e-8);
    }
    expect(c.corpo.getEstadoFisico()).toEqual(antes);
  });
});
