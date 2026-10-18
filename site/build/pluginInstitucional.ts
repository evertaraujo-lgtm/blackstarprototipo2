import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { paginaEstudoMarkdown } from './markdownEstudos';

export const paginasInstitucionais = ['index.html', 'pesquisa.html', 'simulador.html', 'termica-re004.html'] as const;
export const caminhoArtigo = '/publicacoes/pouso-propulsivo-bss-2026.pdf';
export const fonteArtigo = 'docs/estudos/Artigo_Cientifico_BlackStar_BSS_Pouso_Propulsivo.pdf';
/** Fontes canônicas e URLs estáveis; publicação não implica qualificação de voo. */
export const publicacoes = Object.freeze([
  { caminho: caminhoArtigo, fonte: fonteArtigo },
  { caminho: '/publicacoes/engenharia-orbita-retorno-re001-2026.pdf',
    fonte: 'docs/estudos/Black_Star_RE001_Tese_Engenharia_Orbita_e_Retorno.pdf' },
] as const);
export const estudosMarkdown = Object.freeze([
  { caminho: '/estudos/re004/01-auditoria-termica-comparativa.md', fonte: 'docs/estudos/re004/01-auditoria-termica-comparativa.md' },
  { caminho: '/estudos/re004/02-arquitetura-e-modelo-termico.md', fonte: 'docs/estudos/re004/02-arquitetura-e-modelo-termico.md' },
  { caminho: '/estudos/re004/03-protocolo-proximos-ensaios.md', fonte: 'docs/estudos/re004/03-protocolo-proximos-ensaios.md' },
] as const);

/**
 * Integra HTMLs agrupados em site/ às rotas públicas, sem gerar conteúdo em JS.
 * @param raiz Checkout único do P2; resolve fontes HTML, PDF e Markdown cadastradas.
 * @returns Plugin Vite: atende fontes canônicas no dev e emite HTML/documentos no build.
 * @remarks Não importa domínio físico, não sincroniza repositórios nem faz deploy.
  @contract f-1a321c694e8857ca */
export function pluginInstitucional(raiz: string): Plugin {
  let desenvolvimento = false;

  /**
   * Mapeia páginas cadastradas, incluindo /pesquisa/termica-re004; no dev atende
   * os PDFs e cadernos Markdown canônicos com MIME próprio e sem corpo em HEAD.
   * @returns void. Altera URL interna do servidor ou responde bytes/MIME; demais
   * recursos seguem ao Vite MPA, cujo fallback não transforma ausência em homepage.
   * @remarks Lê somente fontes cadastradas; erros de leitura seguem para next.
   * No preview, documentos são atendidos pela saída estática já compilada.
    @contract f-8acac9034ca2a25b */
  function atenderInstitucional(req: IncomingMessage, res: ServerResponse, next: (erro?: unknown) => void): void {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const publicacao = publicacoes.find(p => p.caminho === url.pathname);
    const estudo = estudosMarkdown.find(e => e.caminho === url.pathname);
    const estudoHtml = estudosMarkdown.find(e => e.caminho.replace(/\.md$/, '.html') === url.pathname);
    const pagina = paginasInstitucionais.find(p => (p === 'termica-re004.html' && url.pathname === '/pesquisa/termica-re004') || url.pathname === `/${p}`
      || url.pathname === (p === 'index.html' ? '/' : `/${p.slice(0, -5)}`));
    if (pagina) {
      req.url = `${desenvolvimento ? '/site/pages/' : '/'}${pagina}${url.search}`;
      next();
    } else if (desenvolvimento && publicacao) {
      try {
        const bytes = readFileSync(resolve(raiz, publicacao.fonte));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', bytes.length);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end(req.method === 'HEAD' ? undefined : bytes);
      } catch (erro) { next(erro); }
    } else if (desenvolvimento && estudoHtml) {
      try {
        const fonte = readFileSync(resolve(raiz, estudoHtml.fonte), 'utf8');
        const nome = estudoHtml.caminho.split('/').pop()!.replace(/\.md$/, '');
        const html = Buffer.from(paginaEstudoMarkdown(fonte, nome), 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Length', html.length);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end(req.method === 'HEAD' ? undefined : html);
      } catch (erro) { next(erro); }
    } else if (desenvolvimento && estudo) {
      try {
        const bytes = readFileSync(resolve(raiz, estudo.fonte));
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Length', bytes.length);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end(req.method === 'HEAD' ? undefined : bytes);
      } catch (erro) { next(erro); }
    } else next();
  }

  return {
    name: 'site-institucional-unificado',
    enforce: 'post',
    /** Registra rotas das fontes no dev; não grava HTML de preparação na raiz.  @contract f-27a49be181fc5126 */
    configureServer(server) {
      desenvolvimento = true;
      server.middlewares.use(atenderInstitucional);
    },
    /** Registra as mesmas URLs no preview do dist já compilado, sem fallback global.  @contract f-3e76145b889c0ddc */
    configurePreviewServer(server) {
      server.middlewares.use(atenderInstitucional);
    },
    /**
     * Move os HTMLs institucionais cadastrados para a raiz e emite cada PDF e
     * caderno Markdown com os mesmos bytes de sua fonte canônica.
     * @remarks Executa após processamento HTML do Vite; recusa ausência/colisão.
     * Não copia bundle de simulador nem diretório vizinho; documentos emitidos
     * são exclusivamente os cadastrados em publicacoes e estudosMarkdown.
      @contract f-423d67f295d31202 */
    generateBundle(_opcoes, bundle) {
      for (const pagina of paginasInstitucionais) {
        const chave = `site/pages/${pagina}`;
        const html = bundle[chave];
        if (!html || html.type !== 'asset') this.error(`HTML institucional ausente: ${chave}`);
        if (bundle[pagina]) this.error(`Colisão de saída HTML: ${pagina}`);
        html.fileName = pagina;
        bundle[pagina] = html;
        delete bundle[chave];
      }
      for (const publicacao of publicacoes) this.emitFile({ type: 'asset', fileName: publicacao.caminho.slice(1),
        source: readFileSync(resolve(raiz, publicacao.fonte)) });
      for (const estudo of estudosMarkdown) {
        const fonte = readFileSync(resolve(raiz, estudo.fonte), 'utf8');
        this.emitFile({ type: 'asset', fileName: estudo.caminho.slice(1), source: fonte });
        const nome = estudo.caminho.split('/').pop()!.replace(/\.md$/, '');
        this.emitFile({ type: 'asset', fileName: estudo.caminho.replace(/\.md$/, '.html').slice(1),
          source: paginaEstudoMarkdown(fonte, nome) });
      }
    },
  };
}
