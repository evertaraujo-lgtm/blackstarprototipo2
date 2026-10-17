import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listarFontes } from './projeto';

describe('Rastreabilidade das fontes institucionais', () => {
  it('inclui TypeScript de site e mantém IDs relativos/ordem sem inventariar imagens ou HTML', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'blackstar-auditoria-site-'));
    try {
      for (const pasta of ['src', 'scripts', 'site/scripts', 'site/public']) mkdirSync(join(raiz, pasta), { recursive: true });
      for (const nome of ['src/z.ts', 'scripts/a.ts', 'site/scripts/navegação.ts', 'site/public/figura.webp', 'site/index.html']) writeFileSync(join(raiz, nome), '');
      expect(listarFontes(raiz)).toEqual(['scripts/a.ts', 'site/scripts/navegação.ts', 'src/z.ts']);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  it('continua aceitando fixtures antigas sem diretório site', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'blackstar-sem-site-'));
    try { mkdirSync(join(raiz, 'src')); mkdirSync(join(raiz, 'scripts')); expect(listarFontes(raiz)).toEqual([]); }
    finally { rmSync(raiz, { recursive: true, force: true }); }
  });
});
