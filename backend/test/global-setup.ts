import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

/**
 * Aplica as migrations no schema criado para esta execução (vitest.config.mts)
 * e, no fim, remove só esse schema. Nenhum dado de outro schema é tocado.
 */
export default function setup() {
  const url = process.env.TROCADO_TESTE_URL!;
  const esquema = new URL(url).searchParams.get('schema')!;
  if (!/^teste_\d+$/.test(esquema)) throw new Error(`Schema de teste inesperado: ${esquema}`);

  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });

  return async () => {
    const prisma = new PrismaClient({ datasourceUrl: url });
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${esquema}" CASCADE`);
    await prisma.$disconnect();
  };
}
