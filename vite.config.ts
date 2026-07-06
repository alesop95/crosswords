import { defineConfig } from 'vite';

export default defineConfig({
  // base '/crosswords/' verra' attivata in M5 per il deploy su GitHub Pages
  base: '/',
  server: {
    port: 5871,
    strictPort: true,
  },
  preview: {
    port: 5872,
    strictPort: true,
  },
});
