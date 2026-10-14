import { it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Oráculo medido na M11-H antes das otimizações; compara a trajetória completa a 30 Hz e o replay a 1 Hz.
it('preserva exatamente a trajetória de entrada e tombamento anterior à M11-P', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'blackstar-perf-'));
  try {
    const saida = join(dir, 'resultado.json');
    await promisify(execFile)(process.execPath, [resolve('node_modules/vite-node/vite-node.mjs'),
      'scripts/benchmark-missao.ts', '--segundos', '8', '--saida', saida], { maxBuffer: 1024 * 1024 });
    const r = JSON.parse(await readFile(saida, 'utf8'));
    expect(r.hashObservacoes).toBe('bdbb0f5adc9974df4f0c0936d3d772440236ebf769270328ee512c4367c7c35b');
    expect(r.hashDiario).toBe('4e6904667639118be5e9ce6f01262e8accf1b857678a20ae0fd86317a663f6a1');
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 120_000);
