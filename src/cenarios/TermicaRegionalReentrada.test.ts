import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { criarCenarioReentrada, criarEnsaioReentrada, reproduzirEnsaioReentrada, configurarReentrada, type DiarioReentrada } from './EnsaioReentrada';
import { criarConfiguracaoTermicaReentrada } from '../physics/reentrada/ConfiguracaoTermicaReentrada';

const termica = criarConfiguracaoTermicaReentrada('tps-experimental');

describe('RE-004 — integração térmica regional', () => {
  it.each(['docs/validacoes/re003/interface/2-B-1440-true.json', 'docs/validacoes/re004/diario-legado-re003-node.json'])('reproduz diário histórico RE-003 %s, sem migração implícita', nome => {
    const diario = JSON.parse(readFileSync(nome, 'utf8')) as DiarioReentrada;
    expect(JSON.stringify(reproduzirEnsaioReentrada(diario).exportar())).toBe(JSON.stringify(diario));
  });

  it('opt-in não muda massa, geometria, centro/inércia ou estado inicial', () => {
    const a = criarCenarioReentrada(), b = criarCenarioReentrada({ termica });
    for (const [i, o] of a.objetos.entries()) {
      expect(b.objetos[i].massaKg).toBe(o.massaKg); expect(b.objetos[i].getEstadoFisico()).toEqual(o.getEstadoFisico());
      expect(b.objetos[i].getMomentoInerciaKgM2()).toEqual(o.getMomentoInerciaKgM2());
    }
    expect(a.orbitador.observarRedeTermica()).toBeUndefined(); expect(a.orbitador.limiteTermicoC).toBe(1100);
    expect(b.orbitador.limiteTermicoC).toBe(800);
  });
  it('aplica indicador uma vez na superfície, independente do teto local D·V', () => {
    const c = criarCenarioReentrada({ termica, altitudeM: 65000 });
    const potencias = c.objetos.map(o => o.obterPotenciaAquecimentoAerodinamicoW(c.mundo.obterCondicoesAtmosfericas(o), 0));
    expect(potencias[0]).toBeGreaterThan(0);
    c.mundo.avancar(c.configuracao.passoS);
    for (const [i, o] of c.objetos.entries()) {
      const obs = o.observarRedeTermica()!;
      expect(obs.energiaIncidenteJ).toBeCloseTo(potencias[i] * c.configuracao.passoS, 7);
      expect(o.energiaTermicaAerodinamicaAcumuladaJ).toBe(obs.energiaIncidenteJ);
      expect(Math.abs(obs.residuoEnergiaJ)).toBeLessThan(0.001);
    }
    expect(c.orbitador.observarRedeTermica()!.regioes[0].temperaturaC).toBeGreaterThan(c.orbitador.temperaturaC);
  });
  it('mecanismo aquecido perde capacidade sem destruir a estrutura fria', () => {
    const quente = { ...termica, flap: { ...termica.flap, ligacoes: [], regioes: termica.flap.regioes.map(r => ({ ...r,
      temperaturaInicialC: r.id === 'interna' ? 1120 : 20 })) } };
    const c = criarCenarioReentrada({ termica: quente, vacuo: true }); // Vácuo explícito.
    c.flaps[0].solicitarDeflexaoRad(0.4);
    for (let i = 0; i < 240; i++) c.mundo.avancar(1 / 240);
    expect(c.flaps[0].integridadeEstrutural).toBe(1);
    expect(c.flaps[0].obterDiagnosticoAtuacao().integridadeMecanismo).toBeCloseTo(0.8, 8);
    expect(c.flaps[0].deflexaoAtualRad).toBeLessThan(c.configuracao.parametros.taxaFlapRadps);
    for (let i = 0; i < 5 * 240; i++) c.mundo.avancar(1 / 240);
    expect(c.flaps[0].obterDiagnosticoAtuacao().integridadeMecanismo).toBe(0);
    const antes = c.flaps[0].deflexaoAtualRad;
    c.flaps[0].solicitarDeflexaoRad(-0.4); c.mundo.avancar(1 / 240);
    expect(c.flaps[0].deflexaoAtualRad).toBe(antes);
    expect(c.flaps[0].obterDiagnosticoAtuacao().bloqueio).toBe('termica-mecanismo');
    expect(c.flaps[0].integridadeEstrutural).toBe(1);
  });
  it.each([1 / 240, 1 / 480])('replay e eventos regionais exatos com dt=%s', dt => {
    const e = criarEnsaioReentrada({ termica: { ...termica, flap: { ...termica.flap, regioes: termica.flap.regioes.map(r => ({ ...r,
      temperaturaInicialC: r.id === 'superficie' ? 1000 : 20 })) } }, passoS: dt });
    e.iniciar(); for (let i = 0; i < Math.round(0.5 / dt); i++) e.avancarPasso();
    e.pausar();
    const diario = e.exportar();
    expect(diario.eventos.some(x => x.tipo === 'limite-termico-flap-dianteiro-superficie')).toBe(true);
    expect(diario.final.termica!.flaps[0].regioes[0].integridade).toBeLessThan(1);
    expect(diario.final.flaps[0].integridade).toBe(1);
    expect(reproduzirEnsaioReentrada(diario).exportar()).toEqual(diario);
  });
  it('refinamento mantém temperaturas próximas em pulso orbital de 5 s', () => {
    const fins = [240, 480].map(divisor => {
      const c = criarCenarioReentrada({ termica, altitudeM: 65000, passoS: 1 / divisor });
      for (let i = 0; i < 5 * divisor; i++) c.mundo.avancar(1 / divisor);
      return c.orbitador.observarRedeTermica()!;
    });
    for (let i = 0; i < 3; i++) expect(Math.abs(fins[0].regioes[i].temperaturaC - fins[1].regioes[i].temperaturaC)).toBeLessThan(0.2);
  });
  it('migração explícita preserva limites anteriores na superfície e rejeita conflito', () => {
    const t = criarConfiguracaoTermicaReentrada('sem-tps', 5000, 5000, 60);
    expect(configurarReentrada({ termica: t }).limiteOrbitadorC).toBe(5000);
    expect(() => configurarReentrada({ termica: t, limiteFlapsC: 900 })).toThrow('diverge');
    expect(() => configurarReentrada({ termica: {} as never })).toThrow();
    expect(configurarReentrada().termica).toBeUndefined();
  });
});
