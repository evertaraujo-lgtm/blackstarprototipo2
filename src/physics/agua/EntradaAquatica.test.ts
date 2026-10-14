import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Vetor3 } from '../Vetor3';
import { AmbienteTerrestre } from '../ambiente/AmbienteFisico';
import { GeografiaCosteira } from '../ambiente/GeografiaCosteira';
import { RegiaoAquatica } from './RegiaoAquatica';
import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { criarEnsaioAmerissagem } from '../../missoes/EnsaioAmerissagem';

function ambiente() {
  const a = new AmbienteTerrestre(), c = new GeografiaCosteira(a.referencial,
    { inicioArcoM: -100, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 1000, nivelMarM: 0 });
  return { a, agua: new RegiaoAquatica('agua', c, 1000) };
}
function entrada(dt: number, velocidade = 60, theta = 0, resistencia = 25_000) {
  const { a, agua } = ambiente(), m = new MundoFisico(dt, { ambiente: a, regioesAquaticas: [agua] });
  const o = new Objeto({ id: 'prova', massaBaseKg: 2000, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: resistencia,
    limiteTermicoC: 1000, estadoInicial: { posicaoM: new Vetor3(0, 0.8, 0), velocidadeMps: new Vetor3(0, -velocidade, 0), orientacaoRad: new Vetor3(0, 0, theta) } });
  m.registrarObjeto(o); m.registrarGeometriaAquatica(o, { dimensoesM: o.dimensoesM, coeficienteArrasto: 1 });
  for (let n = 0; n < 120; n++) m.avancar(1 / 240);
  return { o, s: m.obterImersao(o)[0], contatos: m.obterContatosDoObjeto(o) };
}
describe('Entrada: trabalho resistivo, integridade e cargas dos vínculos', () => {
  it('entrada rápida causa dano mensurável em diferentes atitudes, sem colisão rígida', () => {
    for (const theta of [0, Math.PI / 4, Math.PI / 2]) {
      const b = entrada(1 / 240, 60, theta); expect(b.s.energiaEntradaJ).toBeGreaterThan(25_000);
      expect(b.o.integridadeEstrutural).toBeLessThan(1); expect(b.contatos).toHaveLength(0);
    }
  });
  it('não danifica apenas por tocar água e não reaplica energia de entrada a cada passo', () => {
    const lento = entrada(1 / 240, 0.5, 0, 500_000); expect(lento.o.integridadeEstrutural).toBe(1);
    const o = lento.o; o.aplicarDanoPorCarregamentoPeloCore(0, 600_000); expect(o.integridadeEstrutural).toBeCloseTo(0.8, 10);
    o.aplicarDanoPorCarregamentoPeloCore(600_000, 650_000); expect(o.integridadeEstrutural).toBeCloseTo(0.7, 10);
  });
  it('dano não acrescenta um segundo impulso e energia converge com dt', () => {
    const a = entrada(1 / 240), intacto = entrada(1 / 240, 60, 0, 1e12), b = entrada(1 / 480);
    expect(a.o.getEstadoFisico()).toEqual(intacto.o.getEstadoFisico());
    expect(Math.abs(a.s.energiaEntradaJ / b.s.energiaEntradaJ - 1)).toBeLessThan(0.02);
  });
  it('cargas iguais por massa não rompem vínculo; empuxo desigual produz tração e ruptura', () => {
    const simular = (larguraB: number) => {
      const { a, agua } = ambiente(), m = new MundoFisico(1 / 240, { ambiente: a, regioesAquaticas: [agua] });
      const criar = (id: string, y: number, x: number) => new Objeto({ id, massaBaseKg: 1000, dimensoesM: new Vetor3(x, 1, 1), resistenciaColisaoJ: 1e6,
        limiteTermicoC: 1000, estadoInicial: { posicaoM: new Vetor3(0, y, 0) } });
      const A = criar('A', -3, 1), B = criar('B', -1, larguraB); m.registrarObjeto(A); m.registrarObjeto(B);
      const f = new FixadorEstrutural({ id: 'fixador', objetoA: A, objetoB: B, resistenciaTracaoN: 100, resistenciaCompressaoN: 100, obterEsforcoSolicitadoN: () => 0 });
      m.registrarFixador(f);
      for (const o of [A, B]) m.registrarGeometriaAquatica(o, { dimensoesM: o.dimensoesM, coeficienteArrasto: 0 });
      m.avancar(1 / 240); return f;
    };
    expect(simular(1).estaRompido).toBe(false); const desigual = simular(2); expect(desigual.estaRompido).toBe(true); expect(desigual.picoEsforcoFisicoN).toBeGreaterThan(100);
  });
  it('impacto aquático do BSS com empuxo ativo expõe dano e degrada propulsão', () => {
    const { mundo, veiculo: v } = criarEnsaioAmerissagem(0.005, 80, 5);
    for (const s of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(v.propulsor.ligarSistema(s)).toBe(true);
    expect(v.propulsor.solicitarIgnicao()).toBe(true); v.veiculo.desabilitarControleDeInclinacao();
    // A coleta do impacto termina após perda de >80% de integridade; o mundo não é congelado.
    // Não executar toda a evolução de 12 destroços para repetir o mesmo critério de dano.
    for (let i = 0; i < 120 && v.objetos.every(o => o.integridadeEstrutural >= 0.2); i++) mundo.avancar(1 / 240);
    expect(Math.min(...v.objetos.map(o => o.integridadeEstrutural))).toBeLessThan(0.2);
    expect(v.tanqueCombustivel.massaPropelenteKg).toBeLessThan(600);
    expect(v.objetos.flatMap(o => mundo.obterImersao(o)).some(s => s.energiaEntradaJ > 500_000)).toBe(true);
  }, 60_000);
});
