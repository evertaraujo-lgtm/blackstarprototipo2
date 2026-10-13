import { describe, expect, it } from 'vitest';
import { AmbienteTerrestre } from './AmbienteFisico';
import { SistemaAtmosferico } from '../solucionadores/SistemaAtmosferico';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { SuperficieEsferica } from '../SuperficieEsferica';
import { SuperficiePlanoLocal } from '../SuperficiePlanoLocal';
import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { SwitchFimDeCurso } from '../sensores/SwitchFimDeCurso';
import { ChumbadorAoSolo } from '../conexoes/ChumbadorAoSolo';

const ambiente = new AmbienteTerrestre();
const ref = ambiente.referencial;
const objeto = (id: string, p: Vetor3, phi: number, v = Vetor3.zero, resistencia = 1e6) => new Objeto({
  id, massaBaseKg: 10, dimensoesM: new Vetor3(1, 1, 1), limiteTermicoC: 1000,
  resistenciaColisaoJ: resistencia, dissipacaoImpacto: 0.7,
  estadoInicial: { posicaoM: p, orientacaoRad: new Vetor3(0, 0, -phi), velocidadeMps: v },
});
const mundoSolo = () => {
  const mundo = new MundoFisico(1 / 240, { ambiente, densidadeAtmosfericaKgM3: 0 });
  const solo = new SuperficieEsferica('terra', ambiente.campo.centroM);
  mundo.registrarSuperficie(solo);
  return { mundo, solo };
};

describe('M9-D — altitude radial, superfície e atmosfera compartilhadas', () => {
  it('preserva perfil M4 até 20km em qualquer posição e usa transição explícita ao vácuo', () => {
    const plano = new SistemaAtmosferico(1.225, Vetor3.zero);
    const esfera = new SistemaAtmosferico(1.225, Vetor3.zero, ref, 'vacuo-simplificado-25km');
    for (const phi of [0, 0.3, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      for (const h of [0, 11000, 15000, 20000]) {
        const p = ref.posicaoPorArcoM(phi * ref.raioM, h);
        expect(esfera.obterDensidadeNaPosicaoKgM3(p)).toBeCloseTo(plano.obterDensidadeArKgM3(h), 12);
      }
    }
    expect(esfera.obterDensidadeArKgM3(22500)).toBeCloseTo(plano.obterDensidadeArKgM3(22500) / 2, 12);
    expect(esfera.obterDensidadeArKgM3(25000)).toBe(0);
    expect(esfera.obterDensidadeArKgM3(400000)).toBe(0);
    for (const fronteira of [20000, 25000]) expect(Math.abs(esfera.obterDensidadeArKgM3(fronteira - 0.001)
      - esfera.obterDensidadeArKgM3(fronteira + 0.001))).toBeLessThan(1e-7);
  });
  it.each([0, 0.3, Math.PI / 2, Math.PI, -Math.PI / 2])('contato/repouso usa normal radial em phi=%f', (phi) => {
    const { mundo, solo } = mundoSolo();
    const p = ref.posicaoPorArcoM(phi * ref.raioM, 2);
    const corpo = objeto('caixa', p, phi);
    mundo.registrarObjeto(corpo);
    let contato;
    for (let i = 0; i < 1000; i++) {
      mundo.avancar(1 / 240);
      contato ??= mundo.obterContatosDoObjeto(corpo).find((c) => c.impulsoNormalNs > 0);
    }
    expect(contato).toBeDefined();
    expect(contato!.normal.produtoEscalar(ref.radial(p))).toBeGreaterThan(0.999999);
    expect(contato!.velocidadeNormalAntesMps).toBeLessThan(0);
    expect(contato!.impulsoNormalNs).toBeGreaterThan(0);
    expect(corpo.integridadeEstrutural).toBe(1);
    expect(corpo.getEstadoFisico().velocidadeMps.magnitude).toBeLessThan(0.05);
    const e = corpo.getEstadoFisico();
    const vertices = corpo.getPontosDeContatoLocaisM().map((local) => ref.localParaGlobal(local, e.posicaoM));
    expect(Math.min(...solo.candidatosContato(vertices).map((ponto) => solo.distanciaAssinadaM(ponto)))).toBeGreaterThan(-1e-7);
  });
  it('vácuo radial elimina arrasto e convecção, mantendo o corpo no core', () => {
    const mundo = new MundoFisico(0.01, { ambiente });
    const corpo = new Objeto({ id: 'termico', massaBaseKg: 10, resistenciaColisaoJ: 1e6, dimensoesM: new Vetor3(1, 1, 1), limiteTermicoC: 1000,
      temperaturaInicialC: 100, coeficienteConveccaoWPorM2C: 10, areaFrontalM2: 2, coeficienteArrasto: 1,
      estadoInicial: { posicaoM: ref.posicaoPorArcoM(ref.raioM * Math.PI / 2, 400000), velocidadeMps: new Vetor3(0, 100, 0) } });
    mundo.registrarObjeto(corpo);
    expect(mundo.obterCondicoesAtmosfericas(corpo).densidadeArKgM3).toBe(0);
    expect(mundo.obterForcaArrastoAtmosferico(corpo).magnitude).toBe(0);
    mundo.avancar(0.01); expect(corpo.temperaturaC).toBe(100);
  });
  it('impacto excessivo produz dano e preserva primeiro impulso quando rompe a ilha', () => {
    const { mundo } = mundoSolo();
    const a = objeto('fraco', new Vetor3(0, 0.6, 0), 0, new Vetor3(0, -100, 0), 1);
    const b = objeto('carga', new Vetor3(0, 2, 0), 0, new Vetor3(0, -100, 0));
    mundo.registrarObjeto(a); mundo.registrarObjeto(b);
    const f = new FixadorEstrutural({ id: 'f', objetoA: a, objetoB: b, resistenciaTracaoN: 10, resistenciaCompressaoN: 10, obterEsforcoSolicitadoN: () => 0 });
    mundo.registrarFixador(f); mundo.avancar(1 / 240);
    const contatos = mundo.obterContatosDoObjeto(a);
    expect(contatos.some((c) => c.impulsoNormalNs > 0 && c.velocidadeNormalAntesMps < -90)).toBe(true);
    expect(a.integridadeEstrutural).toBe(0); expect(f.estaRompido).toBe(true);
  });
  it('plataforma finita orientada funciona e não intercepta objeto fora da extensão', () => {
    const phi = Math.PI / 2;
    const ancora = ref.posicaoPorArcoM(phi * ref.raioM, 0);
    const plataforma = new SuperficiePlanoLocal('plataforma', ancora, ref.radial(ancora), 2);
    expect(plataforma.contemProjecao(ref.localParaGlobal(new Vetor3(3, 0, 0), ancora))).toBe(false);
    const mundo = new MundoFisico(1 / 240, { ambiente, densidadeAtmosfericaKgM3: 0 });
    mundo.registrarSuperficie(plataforma);
    const dentro = objeto('dentro', ref.localParaGlobal(new Vetor3(0, 0.49, 0), ancora), phi, ref.radial(ancora).multiplicar(-1));
    const fora = objeto('fora', ref.localParaGlobal(new Vetor3(4, 0.49, 0), ancora), phi, ref.radial(ancora).multiplicar(-1));
    mundo.registrarObjeto(dentro); mundo.registrarObjeto(fora); mundo.avancar(1 / 240);
    expect(mundo.obterContatosDoObjeto(dentro).length).toBeGreaterThan(0);
    expect(mundo.obterContatosDoObjeto(fora)).toHaveLength(0);
  });
  it.each([0, Math.PI / 2])('ilha mantém apoio bilateral e atrito radial em phi=%f', (phi) => {
    const { mundo, solo } = mundoSolo();
    const ancora = ref.posicaoPorArcoM(phi * ref.raioM, 0);
    const a = objeto('sapata-a', ref.localParaGlobal(new Vetor3(-2, 0.499, 0), ancora), phi,
      ref.vetorParaGlobal(new Vetor3(1, -0.1, 0), ancora));
    const b = objeto('sapata-b', ref.localParaGlobal(new Vetor3(2, 0.499, 0), ancora), phi,
      ref.vetorParaGlobal(new Vetor3(1, -0.1, 0), ancora));
    mundo.registrarObjeto(a); mundo.registrarObjeto(b);
    mundo.registrarFixador(new FixadorEstrutural({ id: 'rigido', objetoA: a, objetoB: b,
      resistenciaTracaoN: 1e6, resistenciaCompressaoN: 1e6, obterEsforcoSolicitadoN: () => 0 }));
    let bilateral = false;
    for (let i = 0; i < 240; i++) {
      mundo.avancar(1 / 240);
      bilateral ||= [a, b].every((o) => mundo.obterContatosDoObjeto(o).some((c) => c.emApoio));
    }
    expect(bilateral).toBe(true);
    expect(a.getEstadoFisico().velocidadeMps.magnitude).toBeLessThan(0.05);
    expect(solo.energiaTermicaDeAtritoAcumuladaJ).toBeGreaterThan(0);
  });
  it('proximidade sem impulso permanece distinta de sustentação', () => {
    const { mundo } = mundoSolo();
    const corpo = objeto('proximo', new Vetor3(0, 0.501, 0), 0);
    mundo.registrarObjeto(corpo); mundo.avancar(1 / 240);
    const contatos = mundo.obterContatosDoObjeto(corpo);
    expect(contatos.length).toBeGreaterThan(0);
    expect(contatos.every((c) => c.emProximidade && !c.sustentacaoAplicada && c.impulsoNormalNs === 0)).toBe(true);
  });
  it('switch de contato observa superfície radial e fundação permanece estática', () => {
    const { mundo } = mundoSolo();
    const phi = Math.PI / 2;
    const p = ref.posicaoPorArcoM(phi * ref.raioM, 0.5);
    const corpo = objeto('fonte', p, phi);
    mundo.registrarObjeto(corpo);
    const sensor = new SwitchFimDeCurso({ id: 'switch', objetoHospedeiro: corpo, face: 'yNegativa', cursoM: 0.01 });
    mundo.registrarSwitchFimDeCurso(sensor); expect(sensor.sinal).toBe(1);
    mundo.registrarChumbadorAoSolo(new ChumbadorAoSolo({ id: 'chumbador', objeto: corpo, resistenciaN: 1000 }));
    mundo.avancar(1 / 240);
    expect(corpo.getEstadoFisico().posicaoM).toEqual(p);
  });
});
