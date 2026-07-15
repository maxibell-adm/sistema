import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

// Número do commit (contagem total de commits)
let buildNumber = 'dev';
let buildDate = new Date().toLocaleDateString('pt-BR');
try {
  buildNumber = execSync('git rev-list --count HEAD').toString().trim();
  buildDate = new Date().toLocaleDateString('pt-BR');
} catch (e) {
  // fallback se git não disponível
}

const certPath = path.join(process.cwd(), 'certs', 'localhost.pfx');
const httpsConfig = fs.existsSync(certPath)
  ? { pfx: fs.readFileSync(certPath), passphrase: '' }
  : false;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(process.cwd(), 'src'),
    },
  },
  base: '/sistema/',
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: httpsConfig,
  },
  build: {
    charset: 'utf-8',
  },
});
