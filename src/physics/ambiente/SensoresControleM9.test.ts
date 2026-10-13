import { describe, expect, it } from 'vitest';
import { AmbienteTerrestre } from './AmbienteFisico';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { SensoresVeiculoComposto } from '../sensores/SensoresVeiculoComposto';
import { ControladorInclinacaoDePropulsores } from '../sistemas de controle/ControladorInclinacaoDePropulsores';
import { criarTesteBss006 } from '../../cenarios/BancadaBss';
import { RegistroEnsaioBancada } from '../../visualizacao/RegistroEnsaioBancada';
import { criarTesteBss005 } from '../../cenarios/BancadaBss';
import { executarReplayDiarioBss005 } from '../../cenarios/ReproducaoDiarioBss005';

const ambiente = new AmbienteTerrestre();
const ref = ambiente.referencial;
function sensor(phi: number, altitudeM = 1000) {
  const p = ref.posicaoPorArcoM(phi * ref.raioM, altitudeM);
  const o = new Objeto({ id: 'sensor', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1),
    resistenciaColisaoJ: 1e6, limiteTermicoC: 1000, estadoInicial: { posicaoM: p,
      velocidadeMps: ref.vetorParaGlobal(new Vetor3(12, -7, 0), p),
      orientacaoRad: new Vetor3(0, 0, ref.atitudeInercialRad(0.1, p)), velocidadeAngularRadps: new Vetor3(0, 0, 0.01) } });
  const mundo = new MundoFisico(0.01, { ambiente, densidadeAtmosfericaKgM3: 0 });
  const sensores = new SensoresVeiculoComposto(o);
  mundo.registrarObjeto(o); mundo.registrarSensoresVeiculo(sensores);
  return { o, mundo, sensores };
}
function diarioCentral() {
  const c = criarTesteBss005({ ambienteFisico: ambiente });
  return new RegistroEnsaioBancada(1 / 240, {
    nome: c.nome, parametros: c.obterConfiguracaoEnsaio(), estadoInicial: c.objetos.map((o) => ({
      id: o.id, massaKg: o.massaKg, temperaturaC: o.temperaturaC, integridade: o.integridadeEstrutural, estado: o.getEstadoFisico(),
    })),
  }).exportar();
}

describe('M9-E — sensores e controles recebem geometria compartilhada', () => {
  it.each([0, 0.3, Math.PI / 2, Math.PI, -Math.PI / 2])('GPS e nível em phi=%f preservam leituras locais', (phi) => {
    const { sensores, o } = sensor(phi);
    const l = sensores.obterLeituras();
    expect(l.posicaoGpsM).toEqual(o.getEstadoFisico().posicaoM);
    expect(l.altitudeM).toBeCloseTo(1000, 8);
    expect(l.velocidadeVerticalMps).toBeCloseTo(-7, 11);
    expect(l.velocidadeHorizontalMps).toBeCloseTo(12, 11);
    expect(l.inclinacaoRad).toBeCloseTo(0.1, 12);
    expect(l.orientacaoInercialRad).toBeCloseTo(0.1 - phi, 12);
    expect(l.velocidadeAngularInercialRadps).toBe(0.01);
    expect(l.velocidadeAngularRadps).toBeCloseTo(0.01 + 12 / (ref.raioM + 1000), 12);
    expect(l.gravidadeLocalMps2).toBeCloseTo(ambiente.campo.muM3S2 / (ref.raioM + 1000) ** 2, 12);
  });
  it('congelamento persiste além da janela de histórico de 60 s', () => {
    // Permanece no exterior do planeta durante os 70 s em queda livre.
    const a = sensor(0, 400000);
    a.sensores.injetarFalha({ tipo: 'congelado', iniciarEmS: 0 });
    const inicial = a.sensores.obterLeituras();
    for (let i = 0; i < 70; i++) a.mundo.avancar(1);
    expect(a.sensores.obterLeituras().altitudeM).toBe(inicial.altitudeM);
    expect(a.sensores.obterLeituras().idadeLeituraS!).toBeGreaterThan(69.9);
    expect(a.sensores.obterLeituras().sensoresValidos).toBe(false);
  });
  it('PID em dois sítios distintos produz a mesma solicitação local', () => {
    const resultados = [0, Math.PI / 2].map((phi) => {
      const controlador = new ControladorInclinacaoDePropulsores();
      controlador.configurarAlvos(['motor']); controlador.habilitar();
      return controlador.calcularSolicitacoes(sensor(phi).sensores.obterLeituras(), 0.01)[0].valor;
    });
    expect(resultados[0]).toBeCloseTo(resultados[1], 12);
  });
  it('congelamento/atraso/desvio em ambiente central conservam física e idade', () => {
    const a = sensor(Math.PI / 2);
    a.sensores.injetarFalha({ tipo: 'congelado', iniciarEmS: 0 });
    const initial = a.sensores.obterLeituras();
    a.mundo.avancar(0.3);
    expect(a.sensores.obterLeituras().altitudeM).toBe(initial.altitudeM);
    expect(a.sensores.obterLeituras().sensoresValidos).toBe(false);
    expect(a.o.getEstadoFisico().posicaoM).not.toEqual(initial.posicaoGpsM);
    const b = sensor(Math.PI / 2);
    b.sensores.injetarFalha({ tipo: 'atraso', iniciarEmS: 0, atrasoS: 0.3 }); b.mundo.avancar(0.4);
    // A entrega usa a última amostra <= instante solicitado: quantização de
    // até um passo (0,01 s), sem interpolar uma medição inexistente.
    expect(b.sensores.obterLeituras().idadeLeituraS!).toBeGreaterThanOrEqual(0.3 - 1e-12);
    expect(b.sensores.obterLeituras().idadeLeituraS!).toBeLessThanOrEqual(0.31 + 1e-12);
    expect(b.sensores.obterLeituras().sensoresValidos).toBe(false);
    const c = sensor(Math.PI / 2);
    c.sensores.injetarFalha({ tipo: 'desvio', iniciarEmS: 0, altitudeM: 4, velocidadeVerticalMps: -2 }); c.mundo.avancar(0.01);
    expect(c.sensores.obterLeituras().altitudeM).toBeCloseTo(ref.altitudeGeometricaM(c.o.getEstadoFisico().posicaoM) + 4, 8);
  });
  it('montagem a 90° conserva conexões/partida/autoridade e altitude de lançamento', () => {
    const c = criarTesteBss006({ ambienteFisico: ambiente, arcoBaseM: ref.raioM * Math.PI / 2 });
    const motor = c.propulsorControlavel;
    expect(c.seguirObjeto.obterLeiturasDosSensores().inclinacaoRad).toBeCloseTo(0, 12);
    expect(c.seguirObjeto.obterLeiturasDosSensores().altitudeM).toBeCloseTo(4.8, 8);
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) motor.ligarSistema(sistema);
    expect(motor.solicitarIgnicao()).toBe(true);
    for (let i = 0; i < 120; i++) { c.atualizarControle?.(); c.mundo.avancar(1 / 240); }
    expect(motor.empuxoAtualN).toBeGreaterThan(0);
    expect(c.seguirObjeto.obterLeiturasDosSensores().velocidadeVerticalMps).toBeGreaterThan(0);
    expect(c.obterDadosMissao().orbital?.estado).toBe('suborbital');
    expect(c.seguirObjeto.obterSolicitacoesAplicadas().filter((s) => s.recurso === 'gimbal')).toHaveLength(1);
  });
  it('replay aceita somente o modelo físico registrado e identifica diários históricos', () => {
    const d = diarioCentral();
    expect(() => executarReplayDiarioBss005(d)).toThrow(/Modelo físico incompatível/);
    const r = executarReplayDiarioBss005(d, 1, { ambienteFisico: ambiente });
    expect(r.diarioLegadoSemModelo).toBe(false);
    const c = criarTesteBss005();
    const parametros: Record<string, unknown> = { ...c.obterConfiguracaoEnsaio() };
    delete parametros.modeloFisico;
    const velho = new RegistroEnsaioBancada(1 / 240, { nome: c.nome, parametros, estadoInicial: c.objetos.map((o) => ({
      id: o.id, massaKg: o.massaKg, temperaturaC: o.temperaturaC, integridade: o.integridadeEstrutural, estado: o.getEstadoFisico(),
    })) }).exportar();
    expect(() => executarReplayDiarioBss005(velho)).toThrow(/histórico sem modelo/);
    expect(executarReplayDiarioBss005(velho, 1, { permitirDiarioLegadoSemModelo: true }).diarioLegadoSemModelo).toBe(true);
  });
});
