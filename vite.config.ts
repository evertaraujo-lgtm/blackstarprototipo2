import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { pluginInstitucional } from './site/build/pluginInstitucional';

/** Compila site isolado e interfaces nativas P2 no mesmo dist, sem copiar builds. */
export default defineConfig({
  appType: 'mpa',
  publicDir: 'site/public',
  plugins: [pluginInstitucional(import.meta.dirname)],
  build: {
    rollupOptions: {
      input: {
        principal: resolve(import.meta.dirname, 'site/pages/index.html'),
        pesquisa: resolve(import.meta.dirname, 'site/pages/pesquisa.html'),
        termicaRe004: resolve(import.meta.dirname, 'site/pages/termica-re004.html'),
        simulador: resolve(import.meta.dirname, 'site/pages/simulador.html'),
        testes: resolve(import.meta.dirname, 'tests.html'),
        orbitas: resolve(import.meta.dirname, 'orbitas.html'),
        missao: resolve(import.meta.dirname, 'missao.html'),
        reentrada: resolve(import.meta.dirname, 'reentrada.html'),
      },
    },
  },
});
