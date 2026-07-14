import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // in build la base e' il percorso del sito su GitHub Pages
  // (https://alesop95.github.io/crosswords/); in dev resta la radice
  base: command === 'build' ? '/crosswords/' : '/',
  server: {
    port: 5871,
    strictPort: true,
  },
  preview: {
    port: 5872,
    strictPort: true,
  },
}));
