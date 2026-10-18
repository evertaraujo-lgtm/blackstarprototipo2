import { describe, expect, it } from 'vitest';
import { RedeTermica, energiaConduzida, validarRedeTermica, type DefinicaoRedeTermica } from './RedeTermica';
import { criarConfiguracaoTermicaReentrada } from '../reentrada/ConfiguracaoTermicaReentrada';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { FixadorEstrutural } from '../conexoes/FixadorEstrutural';
import { Vetor3 } from '../Vetor3';

const base = criarConfiguracaoTermicaReentrada('tps-experimental');
const semPerdas = (def: DefinicaoRedeTermica): DefinicaoRedeTermica => ({ ...def,
  regioes: def.regioes.map(r => ({ ...r, emissividade: 0 })) });
const objeto = (id: string, rede: DefinicaoRedeTermica) => {
  const o = new Objeto({ id, massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 1e6,
    limiteTermicoC: 60, coeficienteConveccaoWPorM2C: 0 }); o.configurarRedeTermicaPeloCore(rede); return o;
};

describe('RE-004 — rede térmica isolada', () => {
  it('preserva teto D·V do contrato legado; fluxo externo requer opt-in', () => {
    class FluxoPrescrito extends Objeto { public override obterPotenciaAquecimentoAerodinamicoW(): number { return 1000; } }
    const definicao = { id: 'fonte', massaBaseKg: 100, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 1e6, limiteTermicoC: 1000 };
    const legado = new FluxoPrescrito(definicao), regional = new FluxoPrescrito({ ...definicao, id: 'regional' });
    regional.configurarRedeTermicaPeloCore(base.corpo);
    const a = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 }); // Vácuo explícito; fonte é ensaio prescrito, não ar real.
    a.registrarObjeto(legado); expect(() => a.avancar(1 / 240)).toThrow('Aquecimento aerodinâmico');
    const b = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 }); // Vácuo explícito.
    b.registrarObjeto(regional); b.avancar(1 / 240);
    expect(regional.observarRedeTermica()!.energiaIncidenteJ).toBeCloseTo(1000 / 240, 10);
  });

  it('resfria por radiação em vácuo explícito, com balanço de energia', () => {
    const def = { ...base.corpo, ligacoes: [], regioes: base.corpo.regioes.map(r => ({ ...r, temperaturaInicialC: r.id === 'superficie' ? 1500 : 20 })) };
    const o = objeto('quente', def), mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 0 });
    mundo.registrarObjeto(o); mundo.avancar(1 / 240);
    const obs = o.observarRedeTermica()!;
    expect(obs.regioes[0].temperaturaC).toBeLessThan(1500); expect(obs.energiaRadiadaJ).toBeGreaterThan(0);
    expect(obs.energiaConveccaoJ).toBe(0); expect(Math.abs(obs.residuoEnergiaJ)).toBeLessThan(1e-6);
  });
  it('condução conserva energia e não atravessa equilíbrio com condutância extrema', () => {
    const j = energiaConduzida(100, 20, 100, 200, 1e9, 1);
    expect(100 - j / 100).toBeCloseTo(20 + j / 200, 12);
    const rede = new RedeTermica(semPerdas({ ...base.flap, regioes: base.flap.regioes.map(r => ({ ...r, temperaturaInicialC: r.id === 'superficie' ? 1000 : 20 })) }));
    for (let i = 0; i < 240; i++) rede.evoluir(1 / 240, 0, 20);
    const obs = rede.observar();
    expect(obs.regioes[1].temperaturaC).toBeGreaterThan(20); expect(Math.abs(obs.energiaArmazenadaJ)).toBeLessThan(1e-5);
    expect(Math.abs(obs.residuoEnergiaJ)).toBeLessThan(1e-5);
  });
  it('superfície recebe calor antes da estrutura e TPS altera mecanismo de condução', () => {
    const resultados = ['sem-tps', 'tps-experimental'].map(perfil => {
      const rede = new RedeTermica(semPerdas(criarConfiguracaoTermicaReentrada(perfil as 'sem-tps').flap));
      for (let i = 0; i < 2400; i++) { rede.iniciarPasso(); rede.adicionarEnergia('superficie', 1e5 / 240, 'incidente'); rede.evoluir(1 / 240, 0, 20); }
      expect(rede.obterRegiao('superficie').temperaturaC).toBeGreaterThan(rede.obterRegiao('estrutura').temperaturaC);
      expect(Math.abs(rede.observar().residuoEnergiaJ)).toBeLessThan(0.001);
      return rede.obterRegiao('estrutura').temperaturaC;
    });
    expect(resultados[1] - 20).toBeLessThan((resultados[0] - 20) / 2);
  });
  it('superfície degradada não destrói estrutura fria; dano é contado uma vez', () => {
    const o = objeto('dano', semPerdas({ ...base.flap, ligacoes: [], regioes: base.flap.regioes.map(r => ({ ...r,
      temperaturaInicialC: r.id === 'superficie' ? 1500 : 20, limiteTermicoC: 1000 })) }));
    o.finalizarPassoTermicoPeloCore(1);
    expect(o.observarRedeTermica()!.regioes[0].integridade).toBeCloseTo(0.9, 12);
    expect(o.integridadeEstrutural).toBe(1);
  });
  it('dano térmico soma ao impacto anterior e nunca restaura integridade', () => {
    const o = objeto('combinado', semPerdas({ ...base.flap, ligacoes: [], regioes: base.flap.regioes.map(r => ({ ...r,
      temperaturaInicialC: r.id === 'estrutura' ? 900 : 20 })) }));
    o.aplicarDanoPorImpacto(1.5e6); expect(o.integridadeEstrutural).toBe(0.5);
    o.finalizarPassoTermicoPeloCore(1); expect(o.integridadeEstrutural).toBeCloseTo(0.48, 12);
    o.finalizarPassoTermicoPeloCore(1); expect(o.integridadeEstrutural).toBeCloseTo(0.46, 12);
    const livre = objeto('nominal', semPerdas({ ...base.flap, ligacoes: [], regioes: base.flap.regioes.map(r => ({ ...r, temperaturaInicialC: 900 })) }));
    for (let i = 0; i < 1000; i++) { livre.finalizarPassoTermicoPeloCore(1 / 240); expect(livre.integridadeEstrutural).toBe(livre.observarRedeTermica()!.regioes[1].integridade); }
  });
  it('bateria aquece por caminho declarado, conserva soma e separação interrompe troca', () => {
    const a = objeto('corpo', semPerdas({ ...base.corpo, ligacoes: [], regioes: base.corpo.regioes.map(r => ({ ...r, temperaturaInicialC: 100 })) }));
    const b = objeto('bateria', base.bateria);
    const f = new FixadorEstrutural({ id: 'termico', objetoA: a, objetoB: b, resistenciaTracaoN: 1e6,
      condutanciaTermicaWPorC: 20, portasTermicas: { regiaoA: 'interna', regiaoB: 'estrutura' }, obterEsforcoSolicitadoN: () => 0 });
    f.prepararPasso(1); expect(b.temperaturaC).toBeGreaterThan(20);
    const soma = a.observarRedeTermica()!.energiaArmazenadaJ + b.observarRedeTermica()!.energiaArmazenadaJ;
    expect(Math.abs(soma)).toBeLessThan(1e-6);
    f.liberar(); const antes = b.temperaturaC; f.prepararPasso(1); expect(b.temperaturaC).toBe(antes);
    expect(f.obterDiagnosticoTermico().potenciaConduzidaW).toBe(0);
  });
  it('radiação rígida não passa do ambiente nem produz Kelvin negativo', () => {
    const def = { ...base.bateria, ambienteRadiativoC: -273.15, regioes: base.bateria.regioes.map(r => ({ ...r,
      massaTermicaKg: 0.001, calorEspecificoJPorKgC: 1, areaExpostaM2: 1e5, emissividade: 1, temperaturaInicialC: 5000 })) };
    const r = new RedeTermica(def); r.evoluir(100, 0, 20);
    expect(r.obterRegiao('estrutura').temperaturaC).toBeGreaterThanOrEqual(-273.15);
    expect(r.obterRegiao('estrutura').temperaturaC).toBeLessThan(5000);
    expect(Number.isFinite(r.observar().energiaRadiadaJ)).toBe(true);
  });
  it.each(['sem-tps', 'tps-experimental'] as const)('pulso prescrito de 120 s converge com dt=1/240 e 1/480 (%s)', perfil => {
    const fins = [240, 480].map(divisor => {
      const r = new RedeTermica(criarConfiguracaoTermicaReentrada(perfil).flap);
      for (let i = 0; i < 120 * divisor; i++) {
        const t = (i + 0.5) / divisor;
        r.iniciarPasso(); r.adicionarEnergia('superficie', 5e6 * Math.sin(Math.PI * t / 120) ** 2 / divisor, 'incidente');
        r.evoluir(1 / divisor, 0, 20); r.degradar(1 / divisor);
      }
      const o = r.observar();
      expect(Math.abs(o.residuoEnergiaJ) / o.energiaIncidenteJ).toBeLessThan(1e-8);
      return o;
    });
    for (let i = 0; i < 3; i++) expect(Math.abs(fins[0].regioes[i].temperaturaC - fins[1].regioes[i].temperaturaC)).toBeLessThan(1);
  });
  it('rejeita entradas inválidas e snapshots não permitem mutação', () => {
    expect(() => validarRedeTermica({ ...base.corpo, ambienteRadiativoC: -274 })).toThrow();
    expect(() => validarRedeTermica({ ...base.corpo, regioes: [{ ...base.corpo.regioes[0], emissividade: 2 }] })).toThrow();
    const r = new RedeTermica(base.corpo);
    expect(() => r.adicionarEnergia('superficie', Infinity, 'incidente')).toThrow();
    expect(() => r.evoluir(0, 0, 20)).toThrow();
    expect(Object.isFrozen(r.observar().regioes[0])).toBe(true);
  });
});
