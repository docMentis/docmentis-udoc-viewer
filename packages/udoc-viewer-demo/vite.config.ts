import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      // Point to source for HMR support during development
      'udoc-viewer': new URL('../udoc-viewer/src/index.ts', import.meta.url).pathname,
    },
  },
  server: {
    fs: {
      allow: [
        new URL('..', import.meta.url).pathname,
      ],
    },
  },
  publicDir: 'public',
});
