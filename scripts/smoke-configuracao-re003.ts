import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium, type Page } from 'playwright-core';
import { preview } from 'vite';
import type { DiarioReentrada, ConfiguracaoReentrada } from '../src/cenarios/EnsaioReentrada';

/** Testes A–G do RE-003 no build real: inputs, início, pausa/escolha, reset,
 * validação e downloads. Não modifica instâncias físicas; a fábrica é conferida
 * nos testes de domínio. Evidências separadas, desktop/mobile, sem deploy.
 * @contract f-6243448c45e0a365
   */
async function validarInterfaceConfiguracao(): Promise<void> {
  const pasta = resolve('docs/validacoes/re003/interface'); mkdirSync(pasta, { recursive: true });
  const servidor = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: true } });
  const base = `http://127.0.0.1:${(servidor.httpServer.address() as AddressInfo).port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const erros: string[] = [], casos: object[] = [];
  let downloads = 0;

  /** Baixa JSON real e conserva a evidência integral do ensaio aplicado.  @contract f-2d05a4f5e37ea385 */
  async function exportar(page: Page, nome: string): Promise<DiarioReentrada> {
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#re-exportar')]);
    const caminho = resolve(pasta, `${++downloads}-${nome}.json`); await download.saveAs(caminho);
    return JSON.parse(readFileSync(caminho, 'utf8'));
  }
  /** Consulta somente configuração da identificação oficial do diário.  @contract f-ca4e642a3640220a */
  function configuracao(diario: DiarioReentrada): ConfiguracaoReentrada {
    return (diario.identificacao as { configuracao: ConfiguracaoReentrada }).configuracao;
  }
  /** Abre página real, observa erros e expande as seções de configuração.  @contract f-a223d9287819384a */
  async function abrir(largura: number): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: largura, height: 1000 }, acceptDownloads: true });
    page.on('pageerror', e => erros.push(e.message));
    page.on('console', e => { if (e.type() === 'error') erros.push(e.text()); });
    await page.goto(base + '/reentrada.html'); await page.waitForSelector('[data-metrica="altitude"]');
    await page.locator('summary').filter({ hasText: 'Configuração avançada' }).click();
    return page;
  }
  /** Inicia e pausa pela UI, comprovando avanço positivo do relógio da missão.  @contract f-f124caa617850c95 */
  async function iniciarPausar(page: Page): Promise<void> {
    await page.click('#re-play');
    await page.waitForFunction(() => /t = (?!0\.000)\d/.test(document.querySelector('#re-tempo-real')!.textContent!));
    await page.click('#re-play');
    await page.waitForFunction(() => document.querySelector('#re-tempo-real')!.textContent!.includes('pausada'));
  }
  try {
    for (const largura of [1440, 390]) {
      for (const eventos of [true, false]) {
        const page = await abrir(largura);
        const ids = ['re-limite-corpo', 're-limite-flaps', 're-limite-bateria'];
        if (eventos) for (const id of ids) await page.fill('#' + id, '5000');
        else await page.evaluate(ids => { for (const id of ids) (document.getElementById(id) as HTMLInputElement).value = '5000'; }, ids);
        await iniciarPausar(page);
        const d = await exportar(page, `A-${largura}-${eventos}`), c = configuracao(d);
        assert.deepEqual([c.limiteOrbitadorC, c.limiteFlapsC, c.limiteBateriaC], [5000, 5000, 5000]);
        assert.equal(d.final.limiteFlapsC, 5000); assert.equal(d.final.limiteBateriaC, 5000);
        assert.match((await page.locator('#re-config-aplicada').textContent())!, /flaps: 5000 °C/);
        assert.equal(await page.locator('#re-iniciais').isEnabled(), true);
        // B: preparação sem avanço e exportação exatamente no passo zero.
        await page.click('#re-reset'); const inicial = await exportar(page, `B-${largura}-${eventos}`);
        assert.equal(inicial.passosExecutados, 0); assert.deepEqual(configuracao(inicial), c);
        // D/F: pausa + edição pendente nunca reescreve a identificação anterior.
        await page.click('#re-passo'); const antes = await exportar(page, `F-antes-${largura}-${eventos}`);
        assert.equal(antes.passosExecutados, 240);
        await page.fill('#re-limite-flaps', '4000'); await page.click('#re-play');
        assert(await page.locator('#re-config-escolha').isVisible());
        const pendente = await exportar(page, `D-pendente-${largura}-${eventos}`);
        assert.deepEqual(pendente.identificacao, antes.identificacao); assert.equal(pendente.passosExecutados, 240);
        assert.match((await page.locator('#re-mensagem').textContent())!, /pendentes/);
        await page.click('#re-cancelar-escolha'); assert.equal(await page.locator('#re-config-escolha').isVisible(), false);
        await page.click('#re-passo'); await page.click('#re-continuar-aplicada');
        const durante = await exportar(page, `F-depois-${largura}-${eventos}`);
        assert.equal(durante.passosExecutados, 480); assert.deepEqual(durante.identificacao, antes.identificacao);
        assert.equal(await page.inputValue('#re-limite-flaps'), '4000');
        await page.click('#re-passo'); await page.click('#re-iniciar-nova');
        const novo = await exportar(page, `D-novo-${largura}-${eventos}`);
        assert.equal(novo.passosExecutados, 240); assert.equal(configuracao(novo).limiteFlapsC, 4000);
        // E: reset explícito aplica vários valores visíveis, conservando a edição.
        await page.fill('#re-altitude', '65000'); await page.fill('#re-limite-corpo', '4500');
        await page.locator('summary').filter({ hasText: 'Parâmetros de engenharia' }).click();
        await page.fill('#re-param-resistenciaCorpoJ', '1234567'); await page.click('#re-reset');
        const reset = await exportar(page, `E-${largura}-${eventos}`);
        assert.equal(reset.passosExecutados, 0);
        assert.equal(configuracao(reset).altitudeM, 65000); assert.equal(configuracao(reset).limiteOrbitadorC, 4500);
        assert.equal(configuracao(reset).parametros.resistenciaCorpoJ, 1234567);
        assert.equal(await page.inputValue('#re-limite-flaps'), '4000');
        // G: os campos inválidos são rejeitados sem preparar nem avançar.
        for (const valor of ['', '5001', '-201', 'nao-numerico']) {
          await page.evaluate(valor => { (document.getElementById('re-limite-flaps') as HTMLInputElement).value = valor; }, valor);
          await page.click('#re-play');
          assert.match((await page.locator('#re-mensagem').textContent())!, /Configuração rejeitada:/);
          const rejeitado = await exportar(page, `G-${largura}-${eventos}-${valor || 'vazio'}`);
          assert.equal(rejeitado.passosExecutados, 0); assert.deepEqual(rejeitado.identificacao, reset.identificacao);
        }
        await page.fill('#re-limite-flaps', '5000'); await page.click('#re-reset');
        assert.equal(configuracao(await exportar(page, `G-maximo-${largura}-${eventos}`)).limiteFlapsC, 5000);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.locator('summary').filter({ hasText: 'Configuração avançada' }).click();
        await page.screenshot({ path: resolve(pasta, `configuracao-${largura}-${eventos}.png`), fullPage: true });
        casos.push({ largura, eventos, primeiraExecucao: true, preparoPassoZero: true, pausaEscolha: true,
          cancelar: true, continuarAnterior: true, iniciarNovo: true, exportacaoImutavel: true, reinicializar: true, invalidosRejeitados: true });
        await page.close();
      }
    }
    // C: cada resistência separada, primeiro início sem evento anterior.
    for (const chave of ['resistenciaCorpoJ', 'resistenciaFlapJ', 'resistenciaFixadorN']) {
      const page = await abrir(1440);
      await page.locator('summary').filter({ hasText: 'Parâmetros de engenharia' }).click();
      await page.evaluate(chave => { (document.getElementById(`re-param-${chave}`) as HTMLInputElement).value = '5000'; }, chave);
      await iniciarPausar(page); const c = configuracao(await exportar(page, `C-${chave}`));
      assert.equal(c.parametros[chave as keyof typeof c.parametros], 5000);
      for (const outra of ['resistenciaCorpoJ', 'resistenciaFlapJ', 'resistenciaFixadorN'] as const) {
        if (outra !== chave) assert.equal(c.parametros[outra], outra === 'resistenciaFlapJ' ? 1e6 : 1e8);
      }
      casos.push({ resistenciaIndividual: chave, semEventos: true, aplicado: 5000 }); await page.close();
    }
    // Configuração inválida já no HTML inicial não cria ensaio padrão oculto.
    const page = await browser.newPage({ acceptDownloads: true });
    await page.route('**/reentrada.html', async route => {
      const resposta = await route.fetch();
      await route.fulfill({ response: resposta, body: (await resposta.text()).replace('value="1100"', 'value="5001"') });
    });
    await page.goto(base + '/reentrada.html');
    await page.waitForFunction(() => document.querySelector('#re-mensagem')!.textContent!.includes('Configuração rejeitada'));
    await page.click('#re-exportar'); assert.match((await page.locator('#re-mensagem').textContent())!, /Não há ensaio aplicado/);
    await page.locator('summary').filter({ hasText: 'Configuração avançada' }).click();
    await page.fill('#re-limite-corpo', '5000'); await page.click('#re-reset');
    assert.equal(configuracao(await exportar(page, 'G-inicial-recuperado')).limiteOrbitadorC, 5000);
    // Edição inválida durante pausa: continuar a receita anterior é escolha válida.
    await page.click('#re-passo'); await page.fill('#re-limite-corpo', ''); await page.click('#re-play');
    assert(await page.locator('#re-config-escolha').isVisible());
    await page.click('#re-iniciar-nova'); assert.match((await page.locator('#re-mensagem').textContent())!, /Configuração rejeitada/);
    await page.click('#re-continuar-aplicada'); await page.click('#re-play');
    assert.equal(configuracao(await exportar(page, 'D-invalido-anterior')).limiteOrbitadorC, 5000);
    casos.push({ inicialInvalidoSemDefaults: true, recuperacao: true, pausaEdicaoInvalida: true }); await page.close();
    assert.deepEqual(erros, []);
    writeFileSync(resolve(pasta, 'resultado.json'), JSON.stringify({ resultado: 'OK', casos, downloads, erros }, null, 2));
    console.log(JSON.stringify({ resultado: 'OK', casos: casos.length, downloads, erros }));
  } finally { await browser.close(); await new Promise<void>(r => servidor.httpServer.close(() => r())); }
}
await validarInterfaceConfiguracao();
