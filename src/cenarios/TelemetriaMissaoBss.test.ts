import { describe, expect, it } from 'vitest';
import { setImmediate } from 'node:timers/promises';
import { criarTesteDecolagemComPainelSolar, criarTesteBss005, criarTesteBss006 } from './BancadaBss';
import { TanquePropelente } from '../physics/objetos/fontes-de-energia/TanquePropelente';
import { TracePLC } from '../visualizacao/TracePLC';
import { RegistroEnsaioBancada, type EntradaEnsaioBancada } from '../visualizacao/RegistroEnsaioBancada';

describe('M4 — telemetria e reprodução de entradas BSS', () => {
  it('informa delta-v ideal e distingue ausência de vazão de Isp zero', () => {
    const c = criarTesteBss005();
    const d = c.obterDadosMissao();
    expect(d.reagivelKg).toBe(3_000);
    expect(d.deltaVIdealMps).toBeCloseTo(350 * 9.80665 * Math.log(d.massaKg / (d.massaKg - 3_000)), 10);
    expect(d.impulsoEspecificoEfetivoS).toBeUndefined();
    expect(d.pressaoDinamicaPa).toBe(0);
    expect(d.diagnosticoMotor).toContain('ignição não realizada');
    expect(c.dados()).toContain('sem perdas por gravidade/arrasto');
    expect(criarTesteDecolagemComPainelSolar().obterDadosMissao().deltaVIdealMps).toBeUndefined();
  });

  it('respeita mistura, massa conectada, ruptura e diagnósticos de falha', () => {
    const c = criarTesteBss005();
    const tanques = c.objetos.filter((o): o is TanquePropelente => o instanceof TanquePropelente);
    tanques.find((t) => t.tipoPropelente === 'oxigenio')!.fornecerPropelente(2_000);
    expect(c.obterDadosMissao().reagivelKg).toBe(500);
    c.fixadores.find((f) => f.objetoB === tanques[0])!.registrarEsforcoDeCompressaoFisicoN(2_000_000);
    expect(c.obterDadosMissao().reagivelKg).toBe(0);
    expect(c.obterDadosMissao().deltaVIdealMps).toBe(0);
    c.fixadores.find((f) => f.objetoB === c.propulsorControlavel)!.registrarEsforcoDeCompressaoFisicoN(2_000_000);
    expect(c.obterDadosMissao().deltaVIdealMps).toBeUndefined();
    expect(c.obterDadosMissao().diagnosticoMotor).toContain('motor sem vínculo estrutural');
    c.propulsorControlavel.aplicarDanoPorImpacto(2_000_000);
    expect(c.obterDadosMissao().diagnosticoMotor).toContain('motor destruído');
  });

  it('reproduz voo completo com trace desligado e ligado usando o mesmo diário de entradas', async () => {
    const DT = 1 / 240;
    const executar = async (replay?: ReturnType<RegistroEnsaioBancada['exportar']>, observar = false) => {
      const c = criarTesteBss006();
      const m = c.propulsorControlavel;
      const log = new RegistroEnsaioBancada(DT, c.obterConfiguracaoEnsaio());
      const trace = new TracePLC(c.canaisTrace!.length, 6_000);
      for (const canal of c.canaisTrace!) trace.adicionarSinal(canal.nome, canal.obterSinal, canal.cor, canal.escala);
      const aplicar = ({ acao, valor }: Pick<EntradaEnsaioBancada, 'acao' | 'valor'>) => {
        switch (acao) {
          case 'click:toggle-electric': m.ligarSistema('elétrico'); break;
          case 'click:toggle-hydraulic': m.ligarSistema('hidráulico'); break;
          case 'click:toggle-fuel': m.ligarSistema('combustível'); break;
          case 'click:toggle-control': m.ligarSistema('controle'); break;
          case 'click:ignite-engine': expect(m.solicitarIgnicao()).toBe(true); break;
          case 'input:throttle-input': m.definirThrottle(Number(valor) / 100); break;
          case 'alvo-pouso-x-m': expect(c.selecionarPontoPousoX!(Number(valor))).toBe(true); break;
          case 'change:bss04-mode': c.ativarModoBss04!(valor as 'pouso'); break;
          default: throw new Error(acao);
        }
        log.registrarEntrada(acao, valor);
      };
      if (!replay) {
        aplicar({ acao: 'alvo-pouso-x-m', valor: 0 });
        for (const id of ['electric', 'hydraulic', 'fuel', 'control']) aplicar({ acao: `click:toggle-${id}` });
        aplicar({ acao: 'input:throttle-input', valor: '65' });
        aplicar({ acao: 'click:ignite-engine' });
      }
      let proximaEntrada = 0;
      let pouso = false;
      let repouso = 0;
      let toque: number[] | undefined;
      const alturaMinima = () => Math.min(...c.objetos.flatMap((o) => {
        const e = o.getEstadoFisico();
        return o.getPontosDeContatoLocaisM().map((p) => e.posicaoM.y + p.x * Math.sin(e.orientacaoRad.z) + p.y * Math.cos(e.orientacaoRad.z));
      }));
      for (let passo = 0; passo < (replay?.passosExecutados ?? 180 / DT); passo++) {
        if (passo % 2400 === 0) await setImmediate();
        if (replay) {
          while (replay.entradas[proximaEntrada]?.passo === passo) {
            const entrada = replay.entradas[proximaEntrada++]!;
            aplicar(entrada);
            if (entrada.acao === 'change:bss04-mode') pouso = true;
          }
        } else if (!pouso && c.seguirObjeto.getEstadoFisico().posicaoM.y >= 80) {
          aplicar({ acao: 'change:bss04-mode', valor: 'pouso' }); pouso = true;
        }
        const antes = c.seguirObjeto.getEstadoFisico();
        c.atualizarControle?.(); c.mundo.avancar(DT); log.registrarPasso(DT);
        if (observar) {
          trace.registrar(c.mundo.tempoS);
          c.dados(); c.telemetria(); c.obterDadosMissao();
          trace.obterIndiceMaisProximo(Math.max(0, c.mundo.tempoS - 1));
        }
        const contato = pouso && c.seguirObjeto.getEstadoFisico().posicaoM.y < 6 && alturaMinima() < 0.001;
        if (!toque && contato && antes.velocidadeMps.y < 0) toque = [antes.velocidadeMps.x, antes.velocidadeMps.y, antes.orientacaoRad.z];
        repouso = contato && c.objetos.every((o) => o.getEstadoFisico().velocidadeMps.magnitude <= 0.1 && Math.abs(o.getEstadoFisico().velocidadeAngularRadps.z) <= 0.01) ? repouso + DT : 0;
        if (!replay && repouso >= 3) break;
      }
      expect(repouso).toBeGreaterThanOrEqual(3);
      expect(toque).toBeDefined();
      expect(Math.abs(toque![0]!)).toBeLessThan(0.2);
      expect(Math.abs(toque![1]!)).toBeLessThan(0.2);
      expect(Math.abs(toque![2]!)).toBeLessThan(0.01);
      expect(c.objetos.every((o) => o.integridadeEstrutural === 1)).toBe(true);
      expect(c.fixadores.every((f) => !f.estaRompido)).toBe(true);
      expect(m.empuxoAtualN).toBe(0);
      return { log: log.exportar(), toque, repouso, final: c.objetos.map((o) => ({ id: o.id, estado: o.getEstadoFisico(), kg: o.massaKg, temperaturaC: o.temperaturaC, integridade: o.integridadeEstrutural })), sinais: trace.amostras.length };
    };
    const semTrace = await executar();
    const comTrace = await executar(semTrace.log, true);
    expect(comTrace.sinais).toBeGreaterThan(0);
    expect(semTrace.sinais).toBe(0);
    expect(comTrace.log).toEqual(semTrace.log);
    expect(comTrace.final).toEqual(semTrace.final);
    expect(comTrace.toque).toEqual(semTrace.toque);
  }, 120_000);
});
