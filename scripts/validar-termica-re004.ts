import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EnsaioReentrada, type ObservacaoReentrada } from '../src/cenarios/EnsaioReentrada';
import { criarConfiguracaoTermicaReentrada } from '../src/physics/reentrada/ConfiguracaoTermicaReentrada';

/** Janela de medição orbital com receita RE-003 conservada: 120 km, 7700 m/s,
 * γ=-1°, α=40°, automático, semente 1, limites superficiais/legados 5000 °C.
 * Não encerra o cenário físico: coleta 900 s, inclusive após falha. Cada perfil
 * escreve evidência nova em RE-004, sem sobrescrever fixtures/ensaios antigos.
 * RE004_BASE_LEGADA permite usar árvore arquivada do commit anterior como controle.
 * @contract f-ef79af3cabe5b51d
   */
async function compararTermica(): Promise<void> {
  const perfil = process.env.RE004_PERFIL ?? 'tps-experimental';
  if (!['legado', 'sem-tps', 'tps-experimental'].includes(perfil)) throw new Error('Perfil de comparação inválido.');
  const duracaoS = Number(process.env.RE004_DURACAO_S ?? 900);
  if (!Number.isFinite(duracaoS) || duracaoS <= 0 || duracaoS > 1200) throw new Error('Janela de coleta inválida.');
  const receita = { altitudeM: 120000, velocidadeMps: 7700, semente: 1, passoS: 1 / 240, limiteOrbitadorC: 5000, limiteFlapsC: 5000, limiteBateriaC: 60 };
  const Classe = perfil === 'legado' && process.env.RE004_BASE_LEGADA
    ? (await import(resolve(process.env.RE004_BASE_LEGADA, 'src/cenarios/EnsaioReentrada.ts'))).EnsaioReentrada as typeof EnsaioReentrada
    : EnsaioReentrada;
  const e = new Classe({ ...receita, ...(perfil === 'legado' ? {} : { termica: criarConfiguracaoTermicaReentrada(perfil as 'sem-tps', 5000, 5000, 60) }) });
  const configuracao = e.obterIdentificacao(), amostras: object[] = [];
  let residuoMaximoJ = 0;
  /** Projeta observação para curvas e comparação; sem integrar energia ou alterar
   * estados. Guarda todas as regiões e termos do balanço, além da trajetória.
   * @contract f-38093423cb9475b9
   */
  function coletar(o: ObservacaoReentrada): void {
    if (o.termica) for (const r of [o.termica.corpo, ...o.termica.flaps, o.termica.bateria]) {
      assert(Number.isFinite(r.residuoEnergiaJ)); residuoMaximoJ = Math.max(residuoMaximoJ, Math.abs(r.residuoEnergiaJ));
      for (const n of r.regioes) assert(Number.isFinite(n.temperaturaC) && n.temperaturaC >= -273.15);
    }
    amostras.push({ tempoS: o.tempoS, altitudeM: o.altitudeM, velocidadeMps: o.velocidadeMps,
      corpoC: o.temperaturaC, flapsC: o.flaps.map(f => f.temperaturaC), bateriaC: o.temperaturaBateriaC,
      integridadeCorpo: o.integridade, integridadeFlaps: o.flaps.map(f => f.integridade),
      termica: o.termica, energiaAbsorvidaJ: o.energiaAbsorvidaJ, dissipacaoW: o.dissipacaoW,
      calorTransferidoW: o.calorTransferidoW, estadosTerminais: o.estadosTerminais });
  }
  coletar(e.observar()); e.iniciar();
  for (let i = 1; i <= Math.round(duracaoS / receita.passoS); i++) {
    assert(e.avancarPasso());
    if (i % 240 === 0) coletar(e.observar());
    if (i % (240 * 60) === 0) console.log(JSON.stringify({ perfil, tempoS: i / 240 }));
  }
  const pasta = resolve('docs/validacoes/re004'); mkdirSync(pasta, { recursive: true });
  const resultado = { perfil, baseLegada: perfil === 'legado' ? '9db1ef9 (RE-003 preservado)' : null,
    receita, duracaoS, configuracao, residuoMaximoJ, amostras, eventos: e.obterEventos(), final: e.observar() };
  writeFileSync(resolve(pasta, `comparacao-${perfil}.json`), JSON.stringify(resultado));
  console.log(JSON.stringify({ perfil, concluido: true, residuoMaximoJ,
    corpoC: resultado.final.temperaturaC, flapsC: resultado.final.flaps.map(f => f.temperaturaC), bateriaC: resultado.final.temperaturaBateriaC }));
}
void compararTermica();
