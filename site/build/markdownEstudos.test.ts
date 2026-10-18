import { describe, expect, it } from 'vitest';
import { converterMarkdownSeguro, paginaEstudoMarkdown } from './markdownEstudos';

describe('Cadernos RE-004 em HTML', () => {
  it('renderiza títulos, tabelas, listas, código, referências e download Markdown', () => {
    const md = '# Estudo\n\n**Resumo** e \x60Objeto\x60.\n\n| Grandeza | Valor |\n|---|---:|\n| Flap | 900 °C |\n\n- Item **forte**\n1. Próximo\n\n\x60\x60\x60text\nObjeto\n├── Flap\n\x60\x60\x60\n\n> Observação.\n\nFonte: https://www.nasa.gov/history/sts1/pages/tps.html';
    const html = paginaEstudoMarkdown(md, '01-auditoria-termica-comparativa');
    expect(html).toContain('<h1>Estudo</h1>');
    expect(html).toContain('<strong>Resumo</strong>');
    expect(html).toContain('<code>Objeto</code>');
    expect(html).toContain('<table>');
    expect(html).toContain('<td class="numeric">900 °C</td>');
    expect(html).toContain('<ul><li>Item <strong>forte</strong></li></ul>');
    expect(html).toContain('<ol><li>Próximo</li></ol>');
    expect(html).toContain('<pre><code>Objeto\n├── Flap</code></pre>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('href="https://www.nasa.gov/history/sts1/pages/tps.html"');
    expect(html).toContain('Baixar arquivo original .md');
  });
  it('escapa HTML fornecido no texto', () => {
    const html = converterMarkdownSeguro('# Título\n\n<script>alert(1)</script> e **texto**');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<strong>texto</strong>');
  });
  it('rejeita cadernos ausentes e blocos inválidos', () => {
    expect(() => paginaEstudoMarkdown('# Teste', 'fora')).toThrow('Caderno desconhecido');
    expect(() => paginaEstudoMarkdown('Sem título', '01-auditoria-termica-comparativa')).toThrow('sem título');
    expect(() => converterMarkdownSeguro('| A | B |\n|---|---|\n| 1 |')).toThrow('Tabela Markdown inconsistente');
    expect(() => converterMarkdownSeguro('\x60\x60\x60text\nabc')).toThrow('Bloco Markdown sem fechamento');
  });
});
