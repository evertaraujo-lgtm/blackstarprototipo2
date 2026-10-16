import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { setTimeout as esperar } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import type { Browser, Page } from 'playwright-core';
import { preview } from 'vite';

/** Cria aba observada; eventos registram erros sem mascarar respostas HTTP de falha.  @contract f-3be43bfd8ef4e2b3 */
async function abrirPagina(browser: Browser, largura: number, altura: number, erros: string[], falhas: string[]): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: largura, height: altura }, acceptDownloads: true });
  await (await page.context().newCDPSession(page)).send('Network.setCacheDisabled', { cacheDisabled: true });
  page.on('pageerror', e => erros.push(e instanceof Error ? e.message : String(e)));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) falhas.push(`${r.status()} ${r.url()}`); });
  return page;
}

/** Exercita lazy loading/decode e verifica overflow; somente apresentação e leitura DOM.  @contract f-f647b4b757fc111c */
async function conferirImagens(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 30));
    }
    await Promise.all([...document.images].map(i => i.decode()));
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow horizontal.');
  assert(await page.evaluate(() => [...document.images].every(i => i.naturalWidth > 0)), 'Imagem quebrada.');
}

/**
 * Valida site e interfaces nativas em Chrome, sem dependência de outro checkout.
 * @param raiz Raiz única P2 com dist compilado. SITE_URL opcional usa servidor já
 * ativo; sem ele abre preview local em porta livre. CHROME_BIN aponta navegador.
 * @returns Evidências compactas. Escreve somente capturas/download em /tmp ou
 * SCREENSHOT_DIR; comanda simuladores exclusivamente por seus controles públicos.
 * @remarks Fecha browser/preview em finally. Nunca chama Firebase ou altera fontes.
  @contract f-533365172ff4d81e */
export async function executarSmokeSite(raiz: string): Promise<{ resultado: string; verificacoes: unknown[]; erros: string[]; falhas: string[]; capturas: string }> {
  const executavel = process.env.CHROME_BIN ?? '/usr/bin/google-chrome';
  if (!existsSync(executavel)) throw new Error('Chrome não encontrado; configure CHROME_BIN.');
  const servidor = process.env.SITE_URL ? undefined : await preview({ root: raiz, preview: { host: '127.0.0.1', port: 0, strictPort: true } });
  const base = process.env.SITE_URL ?? `http://127.0.0.1:${(servidor!.httpServer.address() as AddressInfo).port}`;
  const capturas = process.env.SCREENSHOT_DIR ?? mkdtempSync(join(tmpdir(), 'blackstar-site-smoke-'));
  mkdirSync(capturas, { recursive: true });
  const downloads = mkdtempSync(join(capturas, 'downloads-'));
  const erros: string[] = [], falhas: string[] = [], verificacoes: unknown[] = [];
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ executablePath: executavel, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const carousel = await abrirPagina(browser, 1440, 1000, erros, falhas);
    await carousel.goto(base + '/', { waitUntil: 'networkidle' });
    await carousel.mouse.move(0, 0);
    const texto = await carousel.$eval('.hero-conteudo', e => e.textContent);
    await carousel.waitForFunction(() => document.querySelector('[data-slide-atual]')!.textContent === '02', undefined, { timeout: 12000 });
    await carousel.focus('[data-proximo]'); await carousel.keyboard.press('Enter');
    await carousel.waitForFunction(() => document.querySelector('[data-slide-atual]')!.textContent === '03');
    assert.equal(await carousel.$eval('.hero-conteudo', e => e.textContent), texto);
    assert.equal(await carousel.$eval('[data-reproducao]', e => e.getAttribute('aria-pressed')), 'true');
    await esperar(7100);
    assert.equal(await carousel.$eval('[data-slide-atual]', e => e.textContent), '03');
    await carousel.click('[data-reproducao]');
    await carousel.evaluate(() => (document.activeElement as HTMLElement).blur()); await carousel.mouse.move(0, 0);
    await carousel.waitForFunction(() => document.querySelector('[data-slide-atual]')!.textContent === '04', undefined, { timeout: 12000 });
    await carousel.emulateMedia({ reducedMotion: 'reduce' });
    await carousel.waitForFunction(() => (document.querySelector('[data-reproducao]') as HTMLButtonElement).disabled);
    await carousel.close();
    verificacoes.push('Carrossel: autoplay 7 s, teclado, pausa real, retomada e movimento reduzido.');

    for (const largura of [1440, 768, 390, 320]) {
      const page = await abrirPagina(browser, largura, largura === 1440 ? 1000 : 844, erros, falhas);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const rota of ['/', '/pesquisa', '/simulador']) {
        assert.equal((await page.goto(base + rota, { waitUntil: 'networkidle' }))!.status(), 200);
        await conferirImagens(page);
        assert.equal(await page.$$eval('h1', es => es.length), 1);
        assert.equal((await page.reload({ waitUntil: 'networkidle' }))!.status(), 200);
        if (rota === '/' && [1440, 390].includes(largura)) await page.screenshot({ path: join(capturas, `homepage-${largura}.jpg`), quality: 80 });
        verificacoes.push({ rota, largura, imagens: 'ok', recargaDireta: true });
      }
      if (largura < 960) {
        await page.focus('.menu-botao'); await page.keyboard.press('Enter');
        assert.equal(await page.$eval('.menu-botao', e => e.getAttribute('aria-expanded')), 'true');
        await page.keyboard.press('Escape');
        assert(await page.$eval('.menu-botao', e => document.activeElement === e));
        await page.click('.menu-botao'); await page.click('#menu-principal a[href="/#historia"]');
        await page.waitForFunction(() => location.hash === '#historia');
        assert.equal(await page.$eval('.menu-botao', e => e.getAttribute('aria-expanded')), 'false');
      }
      await page.close();
    }
    const page = await abrirPagina(browser, 1440, 1000, erros, falhas);
    await page.goto(base + '/pesquisa', { waitUntil: 'networkidle' });
    const pdf = await fetch(base + '/publicacoes/pouso-propulsivo-bss-2026.pdf');
    assert.equal(pdf.status, 200); assert(pdf.headers.get('content-type')!.includes('application/pdf'));
    const bytes = Buffer.from(await pdf.arrayBuffer()); assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    const aba = page.waitForEvent('popup');
    await page.click('a[target="_blank"]');
    const leitor = await aba;
    await leitor.waitForFunction(() => location.href.includes('/publicacoes/pouso-propulsivo-bss-2026.pdf')); await leitor.close();
    const baixando = page.waitForEvent('download');
    await page.click('a[download]');
    const download = await baixando;
    const arquivo = join(downloads, download.suggestedFilename());
    await download.saveAs(arquivo);
    assert(readFileSync(arquivo).equals(bytes));
    verificacoes.push('PDF: nova aba, MIME e download idêntico.');

    await page.goto(base + '/simulador', { waitUntil: 'networkidle' });
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('a[href="/missao.html"]')]);
    assert.equal(new URL(page.url()).pathname, '/missao.html');
    await page.click('#preparar'); await page.click('#ignicao'); await page.click('#iniciar');
    await page.waitForFunction(() => Number(document.querySelector('#tempo-missao')!.textContent!.replace(/[^\d.,]/g, '').replace(',', '.')) > 0);
    await esperar(700); await page.click('#pausar');
    assert(!/^0[,. ]/.test((await page.$eval('#empuxo', e => e.textContent))!.trim()), 'Motor não produziu empuxo.');
    await page.click('#reiniciar'); await page.selectOption('#variante-missao', 'agua');
    await page.click('#iniciar'); await esperar(300); await page.click('#pausar');
    assert(await page.$eval('#painel-aquatico', e => !(e as HTMLElement).hidden));
    verificacoes.push('Missão: navegação pelo portal, preparo, ignição, tempo/empuxo, pausa, reinício e água.');

    await page.goto(base + '/orbitas.html', { waitUntil: 'networkidle' });
    const inicial = await page.$eval('#orbital-dados', e => e.textContent);
    await page.click('#orbital-play'); await esperar(400); await page.click('#orbital-play');
    assert.notEqual(await page.$eval('#orbital-dados', e => e.textContent), inicial); await page.click('#orbital-reset');
    await page.goto(base + '/tests.html', { waitUntil: 'networkidle' });
    assert.equal(await page.$$eval('#scenario-selector option', es => es.length), 6);
    await page.click('#play-tests'); await esperar(400);
    assert.notEqual(await page.$eval('#sim-time', e => e.textContent), 't = 0,000 s');
    await page.click('#play-tests');
    verificacoes.push('Canvas, CSS e módulos: órbita avança/reinicia e bancada inicializa/avança.');
    await page.close();
    const movel = await abrirPagina(browser, 390, 844, erros, falhas);
    await movel.goto(base + '/missao.html', { waitUntil: 'networkidle' });
    await movel.click('#preparar'); await movel.click('#ignicao'); await movel.click('#iniciar');
    await movel.waitForFunction(() => Number(document.querySelector('#tempo-missao')!.textContent!.replace(/[^\d.,]/g, '').replace(',', '.')) > 0);
    await movel.click('#pausar'); await movel.click('#reiniciar');
    await movel.goto(base + '/orbitas.html', { waitUntil: 'networkidle' });
    const orbitaMovel = await movel.$eval('#orbital-dados', e => e.textContent);
    await movel.click('#orbital-play'); await esperar(400); await movel.click('#orbital-play');
    assert.notEqual(await movel.$eval('#orbital-dados', e => e.textContent), orbitaMovel);
    await movel.goto(base + '/tests.html', { waitUntil: 'networkidle' });
    assert.equal(await movel.$$eval('#scenario-selector option', es => es.length), 6);
    await movel.click('#play-tests'); await esperar(400); await movel.click('#play-tests');
    assert.notEqual(await movel.$eval('#sim-time', e => e.textContent), 't = 0,000 s');
    await movel.close();
    verificacoes.push('Mobile 390 × 844: missão, órbita e bancada inicializam e respondem aos controles.');
    for (const rota of ['/rota-inexistente', '/assets/ausente.js', '/assets/ausente.css', '/media/ausente.webp', '/publicacoes/ausente.pdf', '/starship_v1.html', '/vendor/prototipo2/tests.html']) {
      assert.equal((await fetch(base + rota)).status, 404, `Fallback indevido: ${rota}`);
    }
    assert.deepEqual(erros, []); assert.deepEqual(falhas, []);
    verificacoes.push('404 reais para ausências e rotas P1/vendor deliberadamente abandonadas.');
    return { resultado: 'aprovado', verificacoes, erros, falhas, capturas };
  } finally {
    await browser?.close();
    if (servidor) await new Promise<void>((concluir, falhar) => servidor.httpServer.close(erro => erro ? falhar(erro) : concluir()));
  }
}

console.log(JSON.stringify(await executarSmokeSite(process.cwd()), null, 2));
