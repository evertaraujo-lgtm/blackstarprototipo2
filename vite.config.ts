import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/** Gera as páginas inicial e de bancada para Firebase Hosting. */
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        principal: resolve(import.meta.dirname, 'index.html'),
        testes: resolve(import.meta.dirname, 'tests.html'),
      },
    },
  },
});
