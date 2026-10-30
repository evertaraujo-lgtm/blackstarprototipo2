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
      assert.match(await page.title(), /flaps, propulsor e RCS manuais/i);
      assert.match((await page.locator('#manual-altitude').textContent())!, /120\.000 m/);
      assert.match((await page.locator('#manual-velocidade').textContent())!, /7\.700,0 m\/s/);
      assert.match((await page.locator('#manual-alpha').textContent())!, /0,00°/);
      assert.match((await page.locator('#manual-empuxo').textContent())!, /0,00 MN/);
      await page.click('#manual-armar-rcs');
      assert.match((await page.locator('#manual-rcs-estado').textContent())!, /Armado/);
      const caixaRcs = await page.locator('#manual-rcs-cima').boundingBox();
      assert(caixaRcs, 'Comando RCS de nariz para cima sem caixa visual.');
      await page.mouse.move(caixaRcs.x + caixaRcs.width / 2, caixaRcs.y + caixaRcs.height / 2);
      await page.mouse.down();
      await page.locator('#manual-passo').evaluate(element => (element as HTMLButtonElement).click());
      await page.mouse.up();
      const omega = (await page.locator('#manual-omega').textContent())!.split('°')[0].replace(',', '.');
      assert(Number(omega) > 0, `RCS não girou a nave para cima (${omega}°/s).`);
      assert.match((await page.locator('#manual-rcs-estado').textContent())!, /Armado/);
      const nitrogenio = (await page.locator('#manual-rcs-propelente').textContent())!;
      assert.notEqual(nitrogenio, '500,0 kg', 'RCS não consumiu propelente.');
      await page.locator('#manual-throttle').evaluate(element => {
        const input = element as HTMLInputElement; input.value = '20'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.click('#manual-ignitar');
      assert.match((await page.locator('#manual-mensagem').textContent())!, /Comando aplicado/);
      await page.click('#manual-passo');
      const empuxo = (await page.locator('#manual-empuxo').textContent())!.split(' ')[0].replace(',', '.');
      assert(Number(empuxo) > 0, `Propulsor ignitado sem empuxo (${empuxo} MN).`);
      await page.locator('#manual-dianteiro').evaluate((element) => {
        const input = element as HTMLInputElement; input.value = '15'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.locator('#manual-traseiro').evaluate((element) => {
        const input = element as HTMLInputElement; input.value = '-12'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.match((await page.locator('#manual-mensagem').textContent())!, /Comando aplicado/);
      await page.click('#manual-passo');
      assert.match((await page.locator('#manual-tempo').textContent())!, /t = 3,00 s/);
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
    console.log('Smoke reentrada manual: OK (desktop e mobile; link, 120 km horizontal, propulsor, RCS e flaps).');
  } finally {
    await browser.close();
    await new Promise<void>(resolveClose => servidor.httpServer.close(() => resolveClose()));
  }
}

await executar();
