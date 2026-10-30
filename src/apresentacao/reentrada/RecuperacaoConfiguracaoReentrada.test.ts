import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { chromium, type Browser } from 'playwright-core';
import { preview, type PreviewServer } from 'vite';

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

describe('recuperação explícita da configuração rejeitada no build real', () => {
  it.each([1440, 390])('recupera cena sem fallback e sem iniciar execução (%s px)', async largura => {
    const page = await browser!.newPage({ viewport: { width: largura, height: 1000 } });
    const erros: string[] = [];
    page.on('pageerror', e => erros.push(e.message));
    // Simula configuração inválida inicial sem mudar padrões do repositório.
    await page.route('**/reentrada.html', async route => {
      const resposta = await route.fetch();
      await route.fulfill({ response: resposta, body: (await resposta.text()).replace('value="1100"', 'value="5001"') });
    });
    try {
      await page.goto(base + '/reentrada.html', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('#re-mensagem')!.textContent!.includes('Configuração rejeitada'));
      assert(await page.locator('#re-cena-indisponivel').isVisible());
      assert.equal(await page.locator('[data-metrica="altitude"]').count(), 0);
      assert.equal(await page.locator('#re-limite-corpo').inputValue(), '5001');
      // Desfaz só a injeção HTML: o padrão legítimo é 1100 °C.
      await page.locator('#re-limite-corpo').evaluate(e => { (e as HTMLInputElement).defaultValue = '1100'; });
      await page.click('#re-restaurar-padroes');
      await page.waitForSelector('[data-metrica="altitude"]');
      assert(await page.locator('#re-cena-indisponivel').isHidden());
      assert.match((await page.locator('#re-tempo-real').textContent())!, /t = 0\.000 s · preparada/);
      await page.locator('summary').filter({ hasText: 'Configuração avançada' }).click();
      await page.locator('summary').filter({ hasText: 'Parâmetros de engenharia (SI)' }).click();
      await page.fill('#re-param-cursoRolagemRad', '1.5707963267949');
      await page.fill('#re-limite-flaps', '1500');
      await page.click('#re-reset');
      assert.match((await page.locator('#re-mensagem').textContent())!, /cursoRolagemRad: 1\.5707963267949 rad/);
      assert.equal(await page.locator('#re-param-cursoRolagemRad').inputValue(), '1.5707963267949');
      await page.click('#re-restaurar-padroes');
      assert.equal(await page.locator('#re-param-cursoRolagemRad').inputValue(), String(Math.PI / 2));
      assert.equal(await page.locator('#re-limite-flaps').inputValue(), '900');
      assert.equal(await page.locator('#re-limite-bateria').inputValue(), '60');
      assert.match((await page.locator('#re-mensagem').textContent())!, /Configuração aplicada/);
      assert.match((await page.locator('#re-tempo-real').textContent())!, /t = 0\.000 s · preparada/);
      assert(await page.locator('#re-canvas').evaluate(e => {
        const c = e as HTMLCanvasElement, pixels = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        return pixels.some(v => v !== 0);
      }));
      assert.deepEqual(erros, []);
    } finally { await page.close(); }
  }, 60000);
});
