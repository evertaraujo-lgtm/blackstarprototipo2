import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build, createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createServer as criarServidorHttp } from 'node:http';
import { pluginInstitucional, paginasInstitucionais, fonteArtigo, caminhoArtigo, publicacoes } from './pluginInstitucional';
import { verificarDistribuicao } from '../../scripts/site/verificar';

const raiz = mkdtempSync(join(tmpdir(), 'blackstar-build-unico-'));
let servidor: ViteDevServer;
let base: string;
const http = criarServidorHttp();
const documento = Buffer.from('%PDF-1.7\nDocumento de fixture para verificar identidade de bytes.');
const fontes = [...paginasInstitucionais.map(p => `site/pages/${p}`), 'tests.html', 'missao.html', 'orbitas.html'];

beforeAll(async () => {
  mkdirSync(join(raiz, 'site/public/media'), { recursive: true });
  writeFileSync(join(raiz, 'site/public/media/fixture.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  mkdirSync(dirname(join(raiz, fonteArtigo)), { recursive: true });
  writeFileSync(join(raiz, fonteArtigo), documento);
  for (const publicacao of publicacoes) writeFileSync(join(raiz, publicacao.fonte), documento);
  for (const fonte of fontes) {
    mkdirSync(dirname(join(raiz, fonte)), { recursive: true });
    writeFileSync(join(raiz, fonte), `<!doctype html><html lang="pt-BR"><head><title>${fonte}</title></head><body><h1 id="conteudo">${fonte}</h1><img src="/media/fixture.svg" alt="Fixture" width="1" height="1"><a href="/pesquisa#conteudo">Pesquisa</a><a href="${caminhoArtigo}">Artigo</a></body></html>`);
  }
  writeFileSync(join(raiz, 'firebase.json'), JSON.stringify({ hosting: { public: 'dist', rewrites: [{ source: '/pesquisa', destination: '/pesquisa.html' }], predeploy: ['npm --prefix "$PROJECT_DIR" run preparar:deploy'] } }));
  await build({ root: raiz, configFile: false, logLevel: 'silent', appType: 'mpa', publicDir: 'site/public', plugins: [pluginInstitucional(raiz)], build: { rollupOptions: { input: fontes.map(p => join(raiz, p)) } } });
  servidor = await createServer({ root: raiz, configFile: false, logLevel: 'silent', appType: 'mpa', publicDir: 'site/public', plugins: [pluginInstitucional(raiz)], server: { middlewareMode: { server: http } } });
  http.on('request', servidor.middlewares);
  await new Promise<void>(pronto => http.listen(0, '127.0.0.1', pronto));
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
}, 30000);

afterAll(async () => { await servidor?.close(); await new Promise<void>(pronto => http.close(() => pronto())); rmSync(raiz, { recursive: true, force: true }); });

describe('Build único e rotas nativas sem outro repositório', () => {
  it('emite seis HTMLs na raiz, publica PDF idêntico e mantém a fonte única', () => {
    for (const pagina of [...paginasInstitucionais, 'tests.html', 'missao.html', 'orbitas.html']) expect(existsSync(join(raiz, 'dist', pagina))).toBe(true);
    expect(existsSync(join(raiz, 'dist/site/pages/index.html'))).toBe(false);
    expect(readFileSync(join(raiz, 'dist', caminhoArtigo))).toEqual(documento);
    expect(verificarDistribuicao(raiz)).toMatchObject({ paginas: 6, imagens: 1, pdfIdentico: true });
  });

  it('serve diretamente e após recarga as rotas institucionais e mantém interfaces existentes', async () => {
    for (const rota of ['/', '/index.html', '/pesquisa', '/simulador', '/tests.html', '/missao.html', '/orbitas.html']) {
      const a = await fetch(base + rota), b = await fetch(base + rota);
      expect(a.status).toBe(200); expect(b.status).toBe(200);
      expect(await a.text()).toContain('<h1 id="conteudo">');
    }
    const pdf = await fetch(base + caminhoArtigo);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    expect(Buffer.from(await pdf.arrayBuffer())).toEqual(documento);
  });

  it('retorna 404 em JS, CSS, imagem e PDF ausentes e no legado abandonado', async () => {
    for (const rota of ['/assets/ausente.js', '/assets/ausente.css', '/media/ausente.webp', '/publicacoes/ausente.pdf', '/rota-inexistente', '/starship_v1.html', '/vendor/prototipo2/tests.html']) expect((await fetch(base + rota)).status, rota).toBe(404);
  });

  it('preserva ambos os PDFs em dev/build, HEAD, query string e ausência de fallback', async () => {
    for (const publicacao of publicacoes) {
      expect(readFileSync(join(raiz, 'dist', publicacao.caminho))).toEqual(documento);
      const resposta = await fetch(base + publicacao.caminho + '?download=1');
      expect(resposta.status).toBe(200);
      expect(resposta.headers.get('content-type')).toBe('application/pdf');
      expect(Buffer.from(await resposta.arrayBuffer())).toEqual(documento);
      const head = await fetch(base + publicacao.caminho, { method: 'HEAD' });
      expect(head.status).toBe(200); expect(head.headers.get('content-length')).toBe(String(documento.length));
      expect(await head.text()).toBe('');
    }
    const novo = join(raiz, 'dist', publicacoes[1].caminho);
    try { writeFileSync(novo, '%PDF-alterado'); expect(() => verificarDistribuicao(raiz)).toThrow('fonte canônica'); }
    finally { writeFileSync(novo, documento); }
  });

  it('rejeita recurso quebrado, PDF divergente e reintrodução de runtime legado', () => {
    const pagina = join(raiz, 'dist/index.html'), original = readFileSync(pagina);
    try {
      writeFileSync(pagina, Buffer.concat([original, Buffer.from('<script src="/assets/nao-existe.js"></script>')]));
      expect(() => verificarDistribuicao(raiz)).toThrow('Recurso ausente');
    } finally { writeFileSync(pagina, original); }
    const pdf = join(raiz, 'dist', caminhoArtigo);
    try { writeFileSync(pdf, '%PDF-divergente'); expect(() => verificarDistribuicao(raiz)).toThrow('fonte canônica'); }
    finally { writeFileSync(pdf, documento); }
    const legado = join(raiz, 'dist/starship_v1.html');
    try { writeFileSync(legado, '<html>Legado</html>'); expect(() => verificarDistribuicao(raiz)).toThrow('interno/legado'); }
    finally { rmSync(legado); }
  });
});
