// Cấu hình build client: nguồn ở client/, xuất ra dist/ để server Node phục vụ.
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(import.meta.dirname, 'client'),
  base: '/',
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    host: true,
    fs: { allow: [resolve(import.meta.dirname)] },
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/api': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
    },
  },
});
