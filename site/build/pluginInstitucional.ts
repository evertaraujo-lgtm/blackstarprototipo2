import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

export const paginasInstitucionais = ['index.html', 'pesquisa.html', 'simulador.html'] as const;
export const caminhoArtigo = '/publicacoes/pouso-propulsivo-bss-2026.pdf';
export const fonteArtigo = 'docs/estudos/Artigo_Cientifico_BlackStar_BSS_Pouso_Propulsivo.pdf';

/**
 * Integra HTMLs agrupados em site/ às rotas públicas, sem gerar conteúdo em JS.
 * @param raiz Checkout único do P2; resolve fontes e PDF dentro desse diretório.
 * @returns Plugin Vite: lê fontes no dev e emite HTML/PDF somente no build.
 * @remarks Não importa domínio físico, não sincroniza repositórios nem faz deploy.
  @contract f-1a321c694e8857ca */
export function pluginInstitucional(raiz: string): Plugin {
  let desenvolvimento = false;

  /**
   * Mapeia somente rotas institucionais; dev serve a fonte canônica do PDF.
   * @returns void. Altera URL interna do servidor ou responde bytes/MIME; demais
   * recursos seguem ao Vite MPA, cujo fallback não transforma ausência em homepage.
    @contract f-8acac9034ca2a25b */
  function atenderInstitucional(req: IncomingMessage, res: ServerResponse, next: (erro?: unknown) => void): void {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pagina = paginasInstitucionais.find(p => url.pathname === `/${p}`
      || url.pathname === (p === 'index.html' ? '/' : `/${p.slice(0, -5)}`));
    if (pagina) {
      req.url = `${desenvolvimento ? '/site/pages/' : '/'}${pagina}${url.search}`;
      next();
    } else if (desenvolvimento && url.pathname === caminhoArtigo) {
      try {
        const bytes = readFileSync(resolve(raiz, fonteArtigo));
        res.setHeader('Content-Type', 'application/pdf');
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
     * Move as três saídas HTML para a raiz e emite PDF idêntico ao original.
     * @remarks Executa após processamento HTML do Vite; recusa ausência/colisão.
     * Não copia bundle de simulador, diretório vizinho ou documento interno.
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
      this.emitFile({ type: 'asset', fileName: caminhoArtigo.slice(1), source: readFileSync(resolve(raiz, fonteArtigo)) });
    },
  };
}
