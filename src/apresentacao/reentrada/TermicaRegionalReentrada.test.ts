import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { beforeAll, afterAll, describe, it } from 'vitest';
import { chromium, type Browser } from 'playwright-core';
import { preview, type PreviewServer } from 'vite';
import type { ConfiguracaoReentrada, DiarioReentrada } from '../../cenarios/EnsaioReentrada';

let servidor: PreviewServer | undefined, browser: Browser | undefined, base: string;
beforeAll(async () => {
  servidor = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: true } });
  base = `http://127.0.0.1:${(servidor.httpServer.address() as AddressInfo).port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROME_BIN ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
}, 60000);
afterAll(async () => {
  await browser?.close();
  if (servidor) await new Promise<void>((resolve, reject) => servidor!.httpServer.close(e => e ? reject(e) : resolve()));
});

describe('RE-004 — interface, configuração e diário real', () => {
  it.each([1440, 390])('redes editáveis, métricas regionais e recuperação (%s px)', async largura => {
    const page = await browser!.newPage({ viewport: { width: largura, height: 1000 }, acceptDownloads: true });
    const erros: string[] = []; page.on('pageerror', e => erros.push(e.message));
    page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`); });
    try {
      await page.goto(base + '/reentrada.html', { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-metrica="regiao-corpo-superficie"]');
      assert.equal(await page.locator('#re-perfil-termico').inputValue(), 'tps-experimental');
      await page.locator('summary').filter({ hasText: 'Configuração avançada' }).click();
      // Restauração sem input/change: leitura no início deve continuar soberana.
      await page.evaluate(() => {
        for (const id of ['re-limite-corpo', 're-limite-flaps']) (document.getElementById(id) as HTMLInputElement).value = '5000';
      });
      await page.click('#re-reset'); await page.click('#re-passo');
      await page.waitForFunction(() => document.querySelector('#re-tempo-real')!.textContent!.includes('t = 1.000 s'));
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('#re-exportar')]);
      const diario = JSON.parse(readFileSync((await download.path())!, 'utf8')) as DiarioReentrada;
      const c = (diario.identificacao as { configuracao: ConfiguracaoReentrada }).configuracao;
      assert.equal(c.termica!.corpo.regioes[0].limiteTermicoC, 5000);
      assert.equal(c.termica!.flap.regioes[0].limiteTermicoC, 5000);
      assert.equal(c.termica!.flap.regioes[1].limiteTermicoC, 800);
      assert.equal(diario.final.termica!.corpo.regioes.length, 3);
      assert.equal(diario.final.termica!.flaps[0].regioes.length, 3);
      assert(diario.final.termica!.corpo.potenciaIncidenteW > 0);
      await page.selectOption('#re-perfil-termico', 'sem-tps'); await page.click('#re-reset');
      assert.match((await page.locator('#re-config-aplicada').textContent())!, /sem-tps/);
      await page.locator('summary').filter({ hasText: 'Rede térmica · materiais e regiões' }).click();
      const editor = await page.locator('#re-termica-json').inputValue();
      const editada = JSON.parse(editor); editada.corpo.regioes[1].limiteTermicoC = 750;
      await page.fill('#re-termica-json', JSON.stringify(editada)); await page.click('#re-reset');
      assert.match((await page.locator('[data-metrica="regiao-corpo-estrutura"]').textContent())!, /750/);
      await page.fill('#re-termica-json', '{JSON inválido'); await page.click('#re-reset');
      assert.match((await page.locator('#re-mensagem').textContent())!, /Configuração rejeitada/);
      assert.equal(await page.locator('#re-termica-json').inputValue(), '{JSON inválido');
      await page.click('#re-restaurar-padroes');
      assert.equal(await page.locator('#re-perfil-termico').inputValue(), 'tps-experimental');
      assert.match((await page.locator('#re-mensagem').textContent())!, /Configuração aplicada/);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const pasta = 'docs/validacoes/re004'; mkdirSync(pasta, { recursive: true });
      await page.locator('#re-canvas').screenshot({ path: `${pasta}/cena-${largura}.png` });
      await page.locator('#re-graficos').screenshot({ path: `${pasta}/graficos-${largura}.png` });
      writeFileSync(`${pasta}/interface-${largura}.json`, JSON.stringify({ largura, erros, verificacoes: ['TPS', 'sem TPS', 'limites superficiais 5000 sem evento', 'limite estrutural editado', 'JSON rejeitado sem fallback', 'restauração padrão', 'tempo avançou', 'download real'], configuracao: c }, null, 2));
      await page.selectOption('#re-perfil-termico', 'legado'); await page.click('#re-reset');
      assert.equal(await page.locator('[data-metrica="regiao-corpo-superficie"]').count(), 0);
      assert.match((await page.locator('#re-config-aplicada').textContent())!, /legado concentrado/);
      await page.addInitScript(() => {
        const observer = new MutationObserver(() => {
          const e = document.getElementById('re-termica-json') as HTMLTextAreaElement | null;
          if (e) { e.value = '{JSON restaurado inválido'; observer.disconnect(); }
        });
        observer.observe(document, { childList: true, subtree: true });
      });
      await page.goto(base + '/reentrada.html', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('#re-mensagem')!.textContent!.includes('Configuração rejeitada'));
      assert.equal(await page.locator('#re-termica-json').inputValue(), '{JSON restaurado inválido');
      assert(await page.locator('#re-cena-indisponivel').isVisible());
      await page.click('#re-restaurar-padroes');
      await page.waitForSelector('[data-metrica="regiao-corpo-superficie"]');
      assert.deepEqual(erros, []);
    } finally { await page.close(); }
  }, 60000);
});
