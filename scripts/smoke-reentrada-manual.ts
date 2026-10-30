import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

/** Executa smoke da rota, condição inicial, comandos/atuadores e layout desktop/mobile. @contract f-ab9f26f7af7f5326 @reviewed RE-001: rota, controle físico e apresentação conferidos. */
async function executar(): Promise<void> {
  const servidor = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: true } });
  const base = `http://127.0.0.1:${(servidor.httpServer.address() as AddressInfo).port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN ?? '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      assert.equal((await page.goto(`${base}/reentrada.html`, { waitUntil: 'networkidle' }))?.status(), 200);
      await page.locator('a[href="/reentrada-manual.html"]').click();
      await page.waitForSelector('#manual-cena');
      assert.match(await page.title(), /flaps manuais/i);
      assert.match((await page.locator('#manual-altitude').textContent())!, /120\.000 m/);
      assert.match((await page.locator('#manual-velocidade').textContent())!, /7\.700,0 m\/s/);
      assert.match((await page.locator('#manual-alpha').textContent())!, /0,00°/);
      await page.locator('#manual-dianteiro').evaluate((element) => {
        const input = element as HTMLInputElement; input.value = '15'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.locator('#manual-traseiro').evaluate((element) => {
        const input = element as HTMLInputElement; input.value = '-12'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.match((await page.locator('#manual-mensagem').textContent())!, /Comando aplicado/);
      await page.click('#manual-passo');
      assert.match((await page.locator('#manual-tempo').textContent())!, /t = 1,00 s/);
      assert(Number.parseFloat((await page.locator('#manual-dianteiro-efetivo').textContent())!) > 0);
      assert(Number.parseFloat((await page.locator('#manual-traseiro-efetivo').textContent())!) < 0);
      assert(await page.locator('#manual-graficos').evaluate(element => (element as HTMLCanvasElement).hidden), 'Canvas de gráficos interno não deve cobrir a cena.');
      const pixelsDesenhados = await page.locator('#manual-cena').evaluate(element => {
        const canvas = element as HTMLCanvasElement, dados = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
        let diferentesDoFundo = 0;
        for (let i = 0; i < dados.length; i += 4) if (dados[i] !== 5 || dados[i + 1] !== 14 || dados[i + 2] !== 32) diferentesDoFundo++;
        return diferentesDoFundo;
      });
      assert(pixelsDesenhados > 1_000, `Cena visual vazia (${pixelsDesenhados} pixels sobre o fundo).`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow em viewport ${width}px.`);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: resolve('/tmp', `reentrada-flaps-manuais-${width}.png`), fullPage: true });
      await page.close();
    }
    console.log('Smoke RE-001 flaps manuais: OK (desktop e mobile; link, 120 km horizontal, comando e atuação).');
  } finally {
    await browser.close();
    await new Promise<void>(resolveClose => servidor.httpServer.close(() => resolveClose()));
  }
}

await executar();
