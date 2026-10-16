import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { caminhoArtigo, fonteArtigo, paginasInstitucionais } from '../../site/build/pluginInstitucional';

/** Enumera arquivos de uma saída conhecida em ordem estável; somente leitura FS.  @contract f-37e394dbdd56c265 */
export function listarArquivos(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap(entrada => {
    const caminho = join(pasta, entrada.name);
    return entrada.isDirectory() ? listarArquivos(caminho) : [caminho];
  }).sort();
}

/** Lê bytes de um arquivo e retorna SHA-256; não normaliza PDF, imagens ou texto.  @contract f-e434e38838c174a9 */
export function hashArquivo(caminho: string): string {
  return createHash('sha256').update(readFileSync(caminho)).digest('hex');
}

/**
 * Resolve URL local dentro de dist, incluindo as duas rotas sem extensão.
 * @throws Em travessia de diretório, escape de dist ou recurso ausente.
 * @returns Caminho absoluto existente, sem usar fallback para a homepage.
  @contract f-4430a7c8ba885481 */
export function resolverRecurso(dist: string, caminho: string): string {
  const nome = decodeURIComponent(caminho);
  const arquivo = resolve(dist, `.${nome}`);
  if (!nome.startsWith('/') || (arquivo !== dist && !arquivo.startsWith(dist + '/'))) throw new Error(`Caminho fora de dist: ${caminho}`);
  const alvo = arquivo === dist ? join(dist, 'index.html') : ['/pesquisa', '/simulador'].includes(nome) ? arquivo + '.html' : arquivo;
  if (!existsSync(alvo)) throw new Error(`Recurso ausente: ${caminho}`);
  return alvo;
}

/**
 * Qualifica arquivos e referências da distribuição única, sem executar simulação.
 * @param raiz Checkout P2 com build concluído; lê dist, fonte do artigo e Hosting.
 * @returns Contagens auditáveis. Não grava arquivos nem chama Firebase/deploy.
 * @throws Em página/recurso ausente, PDF divergente, publicação de internos/legado
 * ou configuração que possa mascarar ausência de assets com HTML.
  @contract f-85ec71145d9ea817 */
export function verificarDistribuicao(raiz: string): { paginas: number; imagens: number; referencias: number; pdfIdentico: boolean } {
  const dist = resolve(raiz, 'dist');
  const entradas = [...paginasInstitucionais, 'tests.html', 'missao.html', 'orbitas.html'];
  const imagens = new Set<string>();
  let referencias = 0;
  for (const pagina of entradas) {
    const html = readFileSync(join(dist, pagina), 'utf8');
    if (!/<html[\s>]/i.test(html)) throw new Error(`Página inválida: ${pagina}`);
    if (/starship_v1|vendor\/prototipo2|src\/js\//.test(html)) throw new Error(`Dependência legada em ${pagina}`);
    for (const [, origem] of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) imagens.add(origem);
    for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|data:|mailto:)/.test(url)) continue;
      const ref = new URL(url, `https://local/${pagina}`);
      const arquivo = resolverRecurso(dist, ref.pathname);
      if (ref.hash && arquivo.endsWith('.html') && !readFileSync(arquivo, 'utf8').includes(`id="${decodeURIComponent(ref.hash.slice(1))}"`)) throw new Error(`Âncora ausente: ${url}`);
      referencias++;
    }
    for (const [, srcset] of html.matchAll(/\bsrcset="([^"]+)"/g)) {
      for (const imagem of srcset.split(',')) resolverRecurso(dist, imagem.trim().split(/\s+/)[0]);
    }
  }
  for (const arquivo of listarArquivos(dist)) {
    const nome = relative(dist, arquivo).replaceAll('\\', '/');
    if (/^(?:docs|src|scripts|vendor|node_modules|site)\/|starship_v1|\.(?:ts|map)$/.test(nome)) throw new Error(`Arquivo interno/legado publicado: ${nome}`);
  }
  const pdf = resolverRecurso(dist, caminhoArtigo);
  if (hashArquivo(pdf) !== hashArquivo(resolve(raiz, fonteArtigo))) throw new Error('PDF público diverge da fonte canônica.');
  if (!readFileSync(pdf).subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Fonte documental inválida.');
  const hosting = JSON.parse(readFileSync(resolve(raiz, 'firebase.json'), 'utf8')).hosting;
  if (hosting.public !== 'dist' || hosting.rewrites?.some((r: { source: string }) => r.source === '**')) throw new Error('Hosting deve publicar somente dist, sem rewrite global.');
  if (!hosting.predeploy?.includes('npm --prefix "$PROJECT_DIR" run preparar:deploy')) throw new Error('Hosting deve preparar e validar build antes de publicar.');
  return { paginas: entradas.length, imagens: imagens.size, referencias, pdfIdentico: true };
}
