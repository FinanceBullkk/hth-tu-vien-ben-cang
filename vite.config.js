// Cấu hình build client: nguồn ở client/, xuất ra dist/ để server Node phục vụ.
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Proxy ghim vào IP cụ thể: "localhost" có thể phân giải sang IPv4 lẫn IPv6,
// trong khi 127.0.0.1:3000 bị Docker deploy chiếm — ghim IP để dev không nhảy lung tung.
let gamePort = 3000;
try {
  gamePort = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8')).port ?? 3000;
} catch { /* Chưa có config.json thì dùng cổng mặc định. */ }
const gameTarget = `http://127.0.0.1:${gamePort}`;

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
      '/socket.io': { target: gameTarget, ws: true },
      '/api': gameTarget,
      '/admin': gameTarget,
    },
  },
});
