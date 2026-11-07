import { defineConfig } from 'vite';
export default defineConfig({ root: process.cwd(), publicDir: 'client/public', server: { host: '127.0.0.1', port: 5188, strictPort: true } });
