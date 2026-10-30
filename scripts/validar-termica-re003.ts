import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { EnsaioReentrada } from '../src/cenarios/EnsaioReentrada';

/** Ensaio H do RE-003: duas receitas SI idênticas salvo limiar 900/5000 °C.
 * Executa o mesmo core a 1/240 s por 410 s de coleta, sem mudar leis, temperatura
 * inicial, controles ou resistências. Compara trajetória antes do dano e observa
 * início real de degradação; não exige sobrevivência após falhas. Escreve evidência
 * separada, sem sobrescrever referências históricas e sem publicar resultados.
 * @contract f-f789e7f0f396e3e7
   */
function validarLimiaresTermicos(): void {
  const receita = { altitudeM: 120000, velocidadeMps: 7700, semente: 1, passoS: 1 / 240 };
  const a = new EnsaioReentrada({ ...receita, limiteFlapsC: 900 });
  const b = new EnsaioReentrada({ ...receita, limiteFlapsC: 5000 });
  const iniciais = [a.observar(), b.observar()];
  assert.deepEqual(iniciais[0].estado, iniciais[1].estado);
  assert.deepEqual(iniciais[0].flaps.map(f => f.estado), iniciais[1].flaps.map(f => f.estado));
  a.iniciar(); b.iniciar();
  let cruzamento: object | undefined;
  const amostras: object[] = [];
  for (let i = 1; i <= 410 * 240; i++) {
    assert(a.avancarPasso()); assert(b.avancarPasso());
    if (!cruzamento && a.obterEventos().some(e => e.tipo === 'limite-termico-flaps')) {
      const oa = a.observar(), ob = b.observar();
      assert(oa.flaps.some(f => f.temperaturaC > 900 && f.integridade < 1));
      assert(ob.flaps.every(f => f.temperaturaC < 5000 && f.integridade === 1));
      assert(ob.flaps.some(f => f.temperaturaC > 900));
      cruzamento = { passo: i, referencia: oa, diagnostico: ob };
    }
    if (i % 240 === 0) {
      const oa = a.observar(), ob = b.observar();
      if (!cruzamento) {
        assert.deepEqual(oa.estado, ob.estado);
        assert.deepEqual(oa.flaps.map(f => f.temperaturaC), ob.flaps.map(f => f.temperaturaC));
      }
      amostras.push({ tempoS: i / 240,
        referencia: { temperaturaC: oa.flaps.map(f => f.temperaturaC), integridade: oa.flaps.map(f => f.integridade), corpo: oa.integridade },
        diagnostico: { temperaturaC: ob.flaps.map(f => f.temperaturaC), integridade: ob.flaps.map(f => f.integridade), corpo: ob.integridade } });
    }
  }
  assert(cruzamento, 'Receita precisa cruzar 900 °C para testar o efeito do limiar.');
  assert(!b.obterEventos().some(e => e.tipo === 'limite-termico-flaps'), 'Verificar eventual cruzamento de 5000 °C separadamente.');
  mkdirSync('docs/validacoes/re003', { recursive: true });
  const resultado = { resultado: 'OK', receita, duracaoColetaS: 410, limiaresC: [900, 5000],
    identificacoes: [a.obterIdentificacao(), b.obterIdentificacao()], iniciais, cruzamento, amostras,
    finais: [a.observar(), b.observar()], eventos: [a.obterEventos(), b.obterEventos()] };
  writeFileSync('docs/validacoes/re003/comparacao-termica.json', JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify({ resultado: 'OK', passoCruzamento: (cruzamento as { passo: number }).passo,
    tempoCruzamentoS: (cruzamento as { passo: number }).passo / 240, finais: resultado.finais.map(o => ({ temperaturaC: o.flaps.map(f => f.temperaturaC), integridade: o.flaps.map(f => f.integridade) })) }));
}
validarLimiaresTermicos();
