import { parseArgs } from 'node:util';
import { TERRA } from '../src/physics/ambiente/CampoGravitacional';
import { readFileSync, writeFileSync } from 'node:fs';
import type { DiarioMissao } from '../src/missoes/RegistroMissao';
import type { ComandoBss006, ObservacaoBss006 } from '../src/missoes/TiposMissaoBss006';

interface Medicao { cpuMs: number; duracaoMs: number; gcMs: number; gcEventos: number; hashObservacoes: string; hashDiario: string }
const { values } = parseArgs({ options: {
  antes: { type: 'string', default: 'docs/validacoes/2026-10-14-m11-p-baseline.json' },
  depois: { type: 'string', default: 'docs/validacoes/2026-10-14-m11-p-final.json' },
  'diario-antes': { type: 'string' }, 'diario-depois': { type: 'string' }, saida: { type: 'string' },
} });
const a = JSON.parse(readFileSync(values.antes!, 'utf8')) as Medicao, b = JSON.parse(readFileSync(values.depois!, 'utf8')) as Medicao;
if (a.hashObservacoes !== b.hashObservacoes || a.hashDiario !== b.hashDiario) throw new Error('Trajetória ou diário divergiu.');
const resultado: Record<string, unknown> = { hashesExatos: true, reducaoCpu: 1 - b.cpuMs / a.cpuMs,
  reducaoParede: 1 - b.duracaoMs / a.duracaoMs, reducaoTempoGc: 1 - b.gcMs / a.gcMs, reducaoEventosGc: 1 - b.gcEventos / a.gcEventos };
if (values['diario-antes'] || values['diario-depois']) {
  if (!values['diario-antes'] || !values['diario-depois']) throw new Error('Forneça os dois diários.');
  type Diario = DiarioMissao<ComandoBss006, ObservacaoBss006>;
  const d1 = JSON.parse(readFileSync(values['diario-antes'], 'utf8')) as Diario;
  const d2 = JSON.parse(readFileSync(values['diario-depois'], 'utf8')) as Diario;
  if (JSON.stringify(d1) !== JSON.stringify(d2)) throw new Error('Campos do diário divergem.');
  const metricas = (o: ObservacaoBss006) => {
    const G = o.aquatico!.centroMassaM, C = o.cenario.centroTerraM, R = o.cenario.raioTerraM;
    let energiaJ = 0, momentoAngularKgM2S = 0;
    for (const c of o.corpos) {
      const e = c.estado, v = e.velocidadeMps, p = e.posicaoM, m = c.massaKg;
      const I = m * (c.dimensoesM.x ** 2 + c.dimensoesM.y ** 2) / 12;
      const r = Math.hypot(p.x - C.x, p.y - C.y, p.z - C.z);
      // Energia mecânica do veículo relativa ao nível do mar; potencial hidrostático não exposto pelo modelo.
      energiaJ += .5 * m * (v.x ** 2 + v.y ** 2 + v.z ** 2) + .5 * I * e.velocidadeAngularRadps.z ** 2
        + TERRA.muM3S2 * m * (1 / R - 1 / r);
      momentoAngularKgM2S += (p.x - G.x) * (m * v.y) - (p.y - G.y) * (m * v.x) + I * e.velocidadeAngularRadps.z;
    }
    return { energiaJ, momentoAngularKgM2S };
  };
  const o1 = [d1.inicial, ...d1.amostras.map(x => x.observacao), d1.final];
  const o2 = [d2.inicial, ...d2.amostras.map(x => x.observacao), d2.final];
  let erroEnergiaJ = 0, erroMomentoAngularKgM2S = 0, numerosComparados = 0, erroNumericoMaximo = 0;
  const comparar = (x: unknown, y: unknown): void => {
    if (typeof x === 'number' && typeof y === 'number') { numerosComparados++; erroNumericoMaximo = Math.max(erroNumericoMaximo, Math.abs(x - y)); }
    else if (Array.isArray(x) && Array.isArray(y)) x.forEach((v, i) => comparar(v, y[i]));
    else if (x && y && typeof x === 'object' && typeof y === 'object') for (const k of Object.keys(x)) comparar((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k]);
  };
  for (let i = 0; i < o1.length; i++) {
    comparar(o1[i], o2[i]); const x = metricas(o1[i]), y = metricas(o2[i]);
    erroEnergiaJ = Math.max(erroEnergiaJ, Math.abs(x.energiaJ - y.energiaJ));
    erroMomentoAngularKgM2S = Math.max(erroMomentoAngularKgM2S, Math.abs(x.momentoAngularKgM2S - y.momentoAngularKgM2S));
  }
  resultado.diarios = { camposExatos: true, observacoes: o1.length, numerosComparados, erroNumericoMaximo, erroEnergiaJ, erroMomentoAngularKgM2S,
    notaEnergia: 'Gravidade relativa ao nível do mar + cinética translacional/rotacional; não inclui potencial hidrostático. Comparação de regressão, sem afirmar conservação no meio dissipativo.',
    entrada: d2.eventos.find(e => e.tipo === 'entrada-na-agua')?.tempoS,
    tombamento: d2.eventos.find(e => e.tipo === 'tombamento-observado')?.tempoS,
    equilibrio: d2.eventos.find(e => e.tipo === 'equilibrio-flutuacao-observado')?.tempoS };
}
if (values.saida) writeFileSync(values.saida, JSON.stringify(resultado, null, 2) + '\n');
console.log(JSON.stringify(resultado, null, 2));
