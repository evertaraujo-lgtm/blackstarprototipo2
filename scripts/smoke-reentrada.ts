import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

/** Exercita dist real em desktop/mobile: controles, avanço, pausa, modo manual,
 * bank limitado, perda elétrica, bloqueio de aproximação, dano térmico, parâmetros e exportação.
 * Escreve evidências locais; sem deploy ou mutação direta da física no navegador.
 * @contract f-4fe97b4e82bb0961
   */
export async function executarSmokeReentrada(): Promise<void> {
  const pasta = resolve(process.env.REENTRADA_EVIDENCIAS_DIR ?? 'docs/validacoes/reentrada'); mkdirSync(pasta, { recursive: true });
  const servidor = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: true } });
  const base = `http://127.0.0.1:${(servidor.httpServer.address() as AddressInfo).port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN ?? '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const erros: string[] = [], verificacoes: object[] = [];
  try {
    for (const largura of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width: largura, height: 1000 }, acceptDownloads: true });
      page.on('pageerror', e => erros.push(e.message));
      page.on('console', e => { if (e.type() === 'error') erros.push(e.text()); });
      page.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`); });
      assert.equal((await page.goto(base + '/simulador', { waitUntil: 'networkidle' }))!.status(), 200);
      await page.locator('a[href="/reentrada.html"]').click();
      await page.waitForSelector('[data-metrica="altitude"]');
      assert.match(await page.title(), /Reentrada|reentrada/);
      assert.equal(await page.locator('#re-limite-corpo').inputValue(), '1100');
      assert.equal(await page.locator('#re-limite-flaps').inputValue(), '900');
      assert.equal(await page.locator('#re-limite-bateria').inputValue(), '60');
      assert.equal(await page.locator('#re-altitude').inputValue(), '120000');
      assert.equal(await page.locator('#re-velocidade').inputValue(), '7700');
      assert(await page.locator('#re-config').evaluate(e => (e as HTMLFormElement).checkValidity()), 'Configuração padrão inválida no formulário.');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow horizontal.');
      await page.click('#re-play');
      await page.waitForFunction(() => /t = (?!0\.000)\d+\.\d+ s/.test(document.querySelector('#re-tempo-real')!.textContent!), undefined, { timeout: 15000 });
      await page.click('#re-play');
      await page.waitForFunction(() => document.querySelector('#re-tempo-real')!.textContent!.includes('pausada'));
      const pausado = await page.locator('#re-tempo-real').textContent();
      await page.waitForTimeout(250); assert.equal(await page.locator('#re-tempo-real').textContent(), pausado);
      await page.selectOption('#re-modo', 'manual');
      await page.waitForFunction(() => !(document.querySelector('#re-manuais') as HTMLFieldSetElement).disabled);
      await page.fill('#re-phi-alvo', '60'); await page.click('#re-alvos');
      await page.click('#re-passo');
      await page.waitForFunction(() => document.querySelector('[data-metrica="phi"]')!.textContent!.includes('10.0°'));
      await page.selectOption('#re-chaveamento', 'automatico');
      await page.click('#re-pouso');
      await page.waitForFunction(() => document.querySelector('#re-mensagem')!.textContent!.includes('Bloqueado'));
      assert.match((await page.locator('#re-mensagem').textContent())!, /Propulsão operacional/);
      await page.screenshot({ path: resolve(pasta, `reentrada-${largura}.png`), fullPage: true });
      await page.locator('summary').filter({ hasText: 'Falhas de ensaio' }).click();
      await page.click('#re-energia'); await page.click('#re-passo');
      await page.waitForFunction(() => document.querySelector('[data-metrica="flap-0"]')!.textContent!.includes('sem energia'));
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('#re-exportar')]);
      const caminho = resolve(pasta, `diario-smoke-${largura}.json`); await download.saveAs(caminho);
      const diario = JSON.parse(readFileSync(caminho, 'utf8'));
      assert(diario.passosExecutados > 240); assert.equal(diario.final.rolagem.solicitadaRad, Math.PI / 3);
      assert.equal(diario.final.flaps[0].energizado, false); assert.equal(diario.formato, 'blackstar-missao-1');
      assert.equal(diario.identificacao.configuracao.limiteOrbitadorC, 1100);
      assert.equal(diario.identificacao.configuracao.limiteBateriaC, 60);
      assert.equal(diario.final.temperaturaBateriaC, 20);
      assert(diario.entradas.some((e: { tipo: string }) => e.tipo === 'comando'));
      assert(diario.final.energiaAbsorvidaJ > 0);
      await page.click('#re-reset');
      await page.fill('#re-altitude', '65000');
      await page.locator('summary').filter({ hasText: 'Configuração avançada' }).click();
      await page.fill('#re-limite-corpo', '20.001'); await page.fill('#re-limite-flaps', '20.001');
      await page.click('#re-passo');
      await page.waitForFunction(() => document.querySelector('[data-metrica="integridade"]')!.textContent!.split('%')[0].trim() !== '100.00');
      await page.click('#re-reset');
      await page.selectOption('#re-controle-inicial', 'manual');
      await page.fill('#re-limite-corpo', '1100'); await page.fill('#re-limite-flaps', '900');
      await page.selectOption('#re-divisor-dt', '480');
      await page.fill('#re-alvo-arco', '2000000');
      await page.locator('summary').filter({ hasText: 'Parâmetros de engenharia' }).click();
      await page.fill('#re-param-cpBaseM', '-0.2');
      await page.click('#re-passo');
      await page.waitForFunction(() => document.querySelector('#re-tempo-real')!.textContent!.includes('0.0020833'));
      const [avancado] = await Promise.all([page.waitForEvent('download'), page.click('#re-exportar')]);
      const caminhoAvancado = resolve(pasta, `diario-avancado-${largura}.json`); await avancado.saveAs(caminhoAvancado);
      const d = JSON.parse(readFileSync(caminhoAvancado, 'utf8'));
      assert.equal(d.identificacao.configuracao.passoS, 1 / 480);
      assert.equal(d.identificacao.configuracao.parametros.cpBaseM, -0.2);
      assert.equal(d.identificacao.configuracao.aproximacao.alvoArcoM, 2000000);
      assert.equal(d.final.supervisor.autorizado, false);
      assert.equal(d.final.controle.estado, 'manual');
      assert.equal(await page.locator('#re-manuais').isDisabled(), false);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow avançado.');
      verificacoes.push({ largura, rota: '/reentrada.html', tempoAvancou: true, pausa: true, rolagemLimitada: true,
        modoManual: true, aproximacaoBloqueada: true, parametrosExportados: true, modoManualInicial: true, passo480: true, alimentacaoDesligada: true, exportacao: true, danoTermico: true, overflow: false });
      // Cenário dedicado: mesma reentrada RE-001, voo horizontal a 120 km e flaps manuais.
      const manual = await browser.newPage({ viewport: { width: largura, height: 850 } });
      manual.on('pageerror', e => erros.push(e.message));
      assert.equal((await manual.goto(base + '/reentrada-manual.html', { waitUntil: 'networkidle' }))!.status(), 200);
      assert.match(await manual.title(), /flaps manuais/i);
      assert.match((await manual.locator('#manual-altitude').textContent())!, /120\.000 m/);
      assert.match((await manual.locator('#manual-velocidade').textContent())!, /7\.700 m\/s/);
      assert.match((await manual.locator('#manual-alpha').textContent())!, /0,00°/);
      await manual.locator('#manual-dianteiro').evaluate((input) => { const el = input as HTMLInputElement; el.value = '15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await manual.locator('#manual-traseiro').evaluate((input) => { const el = input as HTMLInputElement; el.value = '-12'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      assert.match((await manual.locator('#manual-mensagem').textContent())!, /Comando aplicado/);
      await manual.click('#manual-passo');
      assert.match((await manual.locator('#manual-tempo').textContent())!, /t = 1,00 s/);
      assert.match((await manual.locator('#manual-dianteiro-efetivo').textContent())!, /[1-9]/);
      assert.match((await manual.locator('#manual-traseiro-efetivo').textContent())!, /-/);
      assert(await manual.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow cenário manual.');
      await manual.screenshot({ path: resolve(pasta, 'reentrada-flaps-manuais-' + largura + '.png'), fullPage: true });
      await manual.click('#manual-reiniciar');
      assert.match((await manual.locator('#manual-tempo').textContent())!, /t = 0,00 s/);
      assert.match((await manual.locator('#manual-altitude').textContent())!, /120\.000 m/);
      await manual.close();
      await page.close();
    }
    assert.deepEqual(erros, []);
    writeFileSync(resolve(pasta, 'smoke.json'), JSON.stringify({ resultado: 'OK', verificacoes, erros }, null, 2));
    console.log(JSON.stringify({ resultado: 'OK', verificacoes, erros }, null, 2));
  } finally { await browser.close(); await new Promise<void>(r => servidor.httpServer.close(() => r())); }
}
await executarSmokeReentrada();
