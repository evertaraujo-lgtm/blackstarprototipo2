import { expect, it } from 'vitest';
import { criarTesteBss006 } from '../cenarios/BancadaBss';
import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';
import { BSS006_VOO_EXPERIMENTAL } from './MissaoBss006';
import { fisicaBancada, fisicaMissao, hashFisica } from '../validacao/ReferenciaBancadaM10';
it('projeção física dos snapshots corresponde à bancada e conserva energia finita', () => {
  const b = criarTesteBss006({ ambienteFisico: new AmbienteTerrestre() }), m = BSS006_VOO_EXPERIMENTAL.criar();
  for (const sistema of ['elétrico','hidráulico','combustível','controle'] as const) { b.propulsorControlavel.ligarSistema(sistema);m.receberComando({tipo:'sistema',sistema,ligar:true}); }
  b.propulsorControlavel.solicitarIgnicao();m.receberComando({tipo:'ignicao'});m.iniciar();
  const a = fisicaBancada(b), c = fisicaMissao(m.observar());
  expect(JSON.parse(JSON.stringify(c))).toEqual(JSON.parse(JSON.stringify(a)));
  expect(a.energiaEletricaJ).toBe(1_000_000); expect(hashFisica(a)).toBe(hashFisica(c));
  expect(() => hashFisica({ erro: Infinity })).toThrow('não finita');
  expect(JSON.stringify(c)).toBe(JSON.stringify(a));
});
