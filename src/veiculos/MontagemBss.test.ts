import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { criarTesteBss001, criarTesteBss005, criarTesteBss006 } from '../cenarios/BancadaBss';
import { DEFINICAO_BSS006 } from './DefinicaoBss006';
import { MundoFisico } from '../physics/MundoFisico';
import { SuperficieEsferica } from '../physics/SuperficieEsferica';
import { AmbienteTerrestre } from '../physics/ambiente/AmbienteFisico';

const arquivo = 'docs/validacoes/2026-10-13-m10-base-m9.json';
describe('M10-B — referência física pré-extração (M9-G)', () => {
  it('mantém identidade, geometria, massa, energia, consumo, contatos e arbitragem', () => {
    const casos = [criarTesteBss001(), criarTesteBss005(), criarTesteBss006(), criarTesteBss006({ ambienteFisico: new AmbienteTerrestre() })];
    const coletar = () => casos.map(c => ({ modelo: c.mundo.obterConfiguracaoFisica(), tempoS: c.mundo.tempoS,
      objetos: c.objetos.map(o => ({ id: o.id, estado: o.getEstadoFisico(), massaKg: o.massaKg, dimensoesM: o.dimensoesM,
        integridade: o.integridadeEstrutural, temperaturaC: o.temperaturaC })),
      contatos: c.mundo.obterContatosComSuperficie(), fixadores: c.fixadores.map(f => ({ id: f.id, estado: f.estado })),
      dados: c.obterDadosMissao(), arbitragem: c.seguirObjeto.obterSolicitacoesAplicadas() }));
    const inicial = coletar();
    for (const c of casos) {
      const motor = c.propulsorControlavel;
      for (const s of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) expect(motor.ligarSistema(s)).toBe(true);
      expect(motor.solicitarIgnicao()).toBe(true);
      for (let i = 0; i < 480; i++) { c.atualizarControle?.(); c.mundo.avancar(1 / 240); }
    }
    const resultado = JSON.parse(JSON.stringify({ revisaoBase: '00db5fe', passoS: 1 / 240, inicial, final: coletar() }));
    expect(resultado).toEqual(JSON.parse(readFileSync(arquivo, 'utf8')));
  }, 30_000);
});

it('definição direta e bancada compartilham parâmetros e estados exatos', () => {
  const ambiente = new AmbienteTerrestre();
  const mundo = new MundoFisico(1 / 240, { ambiente });
  const solo = new SuperficieEsferica('solo-decolagem-solar', ambiente.campo.centroM, ambiente.referencial.raioM, 1_000_000, 0.04, 0.9);
  mundo.registrarSuperficie(solo);
  const v = DEFINICAO_BSS006.montar(mundo, solo);
  const b = criarTesteBss006({ ambienteFisico: new AmbienteTerrestre() });
  expect(v.tanqueCombustivel.massaPropelenteKg).toBe(600);
  expect(v.tanqueOxidante.massaPropelenteKg).toBe(2400);
  expect(v.propulsor.empuxoMaximoN).toBe(120_000);
  expect(v.aletasAerodinamicas).toHaveLength(2);
  expect(v.objetos.map(o => ({ id: o.id, estado: o.getEstadoFisico(), kg: o.massaKg })))
    .toEqual(b.objetos.map(o => ({ id: o.id, estado: o.getEstadoFisico(), kg: o.massaKg })));
  expect(v.obterDadosMissao()).toEqual(b.obterDadosMissao());
});
