import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

if (existsSync('.env')) process.loadEnvFile('.env');

// Cada execução usa um schema novo e só dela, no banco trocado_teste (mesmo Postgres do compose:
// docker compose up -d db). O global-setup aplica as migrations nele e o remove no fim.
// No CI, o GitHub Actions sobe um Postgres e define TEST_DATABASE_URL.
const base = process.env.TEST_DATABASE_URL ?? (process.env.DATABASE_URL ?? '').replace(/\/[^/?]+(\?|$)/, '/trocado_teste$1');
const url = new URL(base);
url.searchParams.set('schema', `teste_${Date.now()}`);
process.env.TROCADO_TESTE_URL = url.toString();

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['test/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TROCADO_TESTE_URL,
      JWT_SECRET: 'segredo-so-para-os-testes-com-mais-de-32-caracteres',
    },
    // Os testes de API dividem o mesmo schema
    fileParallelism: false,
  },
});
