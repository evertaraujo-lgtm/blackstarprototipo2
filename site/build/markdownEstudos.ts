/**
 * Conversor estático do subconjunto Markdown usado nos três cadernos RE-004.
 * Escapa HTML e admite apenas links HTTP(S); não injeta scripts no navegador.
 */
const nomes = [
  '01-auditoria-termica-comparativa',
  '02-arquitetura-e-modelo-termico',
  '03-protocolo-proximos-ensaios',
] as const;

function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function inline(texto: string): string {
  const padrao = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|\x60([^\x60\n]+)\x60|https?:\/\/[^\s<>()]+/g;
  let result = '', pos = 0;
  for (const m of texto.matchAll(padrao)) {
    result += escapar(texto.slice(pos, m.index ?? 0));
    if (m[2]) result += '<a href="' + escapar(m[2]) + '" target="_blank" rel="noopener noreferrer">' + escapar(m[1]) + '</a>';
    else if (m[3]) result += '<strong>' + inline(m[3]) + '</strong>';
    else if (m[4] !== undefined) result += '<code>' + escapar(m[4]) + '</code>';
    else {
      const url = m[0].replace(/[.,;:]+$/, '');
      result += '<a href="' + escapar(url) + '" target="_blank" rel="noopener noreferrer">' + escapar(url) + '</a>' + escapar(m[0].slice(url.length));
    }
    pos = (m.index ?? 0) + m[0].length;
  }
  return result + escapar(texto.slice(pos));
}

function cols(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}
function tableDivider(line: string): boolean {
  const cells = cols(line);
  return cells.length >= 2 && cells.every(c => /^:?-{3,}:?$/.test(c));
}
function listType(line: string): 'ul' | 'ol' | null {
  if (/^\s*-\s+/.test(line)) return 'ul';
  if (/^\s*\d+\.\s+/.test(line)) return 'ol';
  return null;
}
function beginsBlock(lines: string[], i: number): boolean {
  const l = lines[i].trim();
  return /^#{1,6}\s+/.test(l) || /^\x60{3}/.test(l) || /^>\s?/.test(l)
    || /^(-{3,}|\*{3,})$/.test(l) || listType(l) !== null
    || (l.startsWith('|') && i + 1 < lines.length && tableDivider(lines[i + 1]));
}

export function converterMarkdownSeguro(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  for (let i = 0; i < lines.length;) {
    const l = lines[i].trim();
    if (!l) { i++; continue; }
    const fence = l.match(/^\x60{3}\s*([A-Za-z0-9_-]*)\s*$/);
    if (fence) {
      i++;
      const code: string[] = [];
      while (i < lines.length && !/^\x60{3}\s*$/.test(lines[i].trim())) code.push(lines[i++]);
      if (i === lines.length) throw new Error('Bloco Markdown sem fechamento.');
      i++;
      html.push('<pre><code>' + escapar(code.join('\n')) + '</code></pre>');
      continue;
    }
    const head = l.match(/^(#{1,6})\s+(.+)$/);
    if (head) {
      const n = head[1].length;
      html.push('<h' + n + '>' + inline(head[2]) + '</h' + n + '>');
      i++;
      continue;
    }
    if (l.startsWith('|') && i + 1 < lines.length && tableDivider(lines[i + 1])) {
      const header = cols(l), align = cols(lines[i + 1]);
      if (header.length !== align.length) throw new Error('Tabela Markdown inconsistente.');
      i += 2;
      const th = header.map((v, n) => '<th' + (align[n].endsWith(':') ? ' class="numeric"' : '') + '>' + inline(v) + '</th>').join('');
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const values = cols(lines[i++]);
        if (values.length !== header.length) throw new Error('Linha de tabela Markdown inconsistente.');
        rows.push('<tr>' + values.map((v, n) => '<td' + (align[n].endsWith(':') ? ' class="numeric"' : '') + '>' + inline(v) + '</td>').join('') + '</tr>');
      }
      html.push('<div class="table-scroll"><table><thead><tr>' + th + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>');
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(l)) { html.push('<hr>'); i++; continue; }
    const kind = listType(l);
    if (kind) {
      const items: string[] = [];
      while (i < lines.length && listType(lines[i]) === kind) {
        items.push('<li>' + inline(lines[i].trim().replace(kind === 'ul' ? /^-\s+/ : /^\d+\.\s+/, '')) + '</li>');
        i++;
      }
      html.push('<' + kind + '>' + items.join('') + '</' + kind + '>');
      continue;
    }
    if (l.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      html.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>');
      continue;
    }
    const p = [l];
    i++;
    while (i < lines.length && lines[i].trim() && !beginsBlock(lines, i)) p.push(lines[i++].trim());
    html.push('<p>' + inline(p.join(' ')) + '</p>');
  }
  return html.join('\n');
}

export function paginaEstudoMarkdown(source: string, name: string): string {
  if (!nomes.includes(name as typeof nomes[number])) throw new Error('Caderno desconhecido.');
  const title = source.match(/^#\s+(.+)$/m)?.[1];
  if (!title) throw new Error('Caderno Markdown sem título principal.');
  const tabs = nomes.map((nome, i) => '<a' + (nome === name ? ' aria-current="page"' : '') +
    ' href="/estudos/re004/' + nome + '.html">Caderno ' + (i + 1) + '</a>').join('');
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="theme-color" content="#101112">'
    + '<title>' + escapar(title) + ' | Black Star Space</title>'
    + '<meta name="description" content="Estudo de engenharia térmica RE-004 do orbitador Black Star.">'
    + '<link rel="stylesheet" href="/estudos/re004/leitura.css">'
    + '<link rel="icon" href="/media/emblema.webp" type="image/webp"></head>'
    + '<body><a class="skip" href="#conteudo">Pular para o estudo</a><header class="header">'
    + '<a class="brand" href="/"><img src="/media/emblema.webp" alt="" width="44" height="34">BLACK STAR SPACE</a>'
    + '<nav aria-label="Navegação"><a href="/pesquisa">Pesquisa</a><a href="/pesquisa/termica-re004">Auditoria RE-004</a></nav></header>'
    + '<main id="conteudo"><div class="eyebrow">BLACK STAR SPACE / RE-004</div>'
    + '<div class="intro"><span>CADERNO TÉCNICO · ESTUDO NUMÉRICO · 18 OUT 2026</span>'
    + '<a class="download" href="/estudos/re004/' + name + '.md" download>Baixar arquivo original .md ↓</a></div>'
    + '<nav class="tabs" aria-label="Outros cadernos">' + tabs + '</nav>'
    + '<article class="article">' + converterMarkdownSeguro(source) + '</article>'
    + '<div class="back"><a href="/pesquisa/termica-re004">← Voltar aos gráficos e comparativos</a></div></main>'
    + '<footer>BLACK STAR SPACE · Universo ficcional. Simulações não certificadas para voo real.</footer></body></html>';
}
