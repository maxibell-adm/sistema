import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const certPath = path.join(process.cwd(), 'certs', 'localhost.pfx');
const httpsConfig = fs.existsSync(certPath)
  ? {
      pfx: fs.readFileSync(certPath),
      passphrase: '',
    }
  : false;

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
    https: httpsConfig,
  },
  build: {
    charset: 'utf-8',
  },
});
