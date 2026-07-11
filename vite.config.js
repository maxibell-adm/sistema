import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(process.cwd(), 'src'),
    },
  },
  base: '/sistema/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    charset: 'utf-8',
  },
});
