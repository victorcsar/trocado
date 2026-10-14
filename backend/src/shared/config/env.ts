import { existsSync } from 'node:fs';
import { z } from 'zod';

// Em desenvolvimento o .env fica na pasta do backend; no Docker as variáveis vêm do compose
if (existsSync('.env')) process.loadEnvFile('.env');

const booleano = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

/** Variável opcional: vazia no .env ("USUARIO_EMAIL=") conta como não definida. */
const opcional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  SESSAO_DIAS: z.coerce.number().int().min(1).default(30),
  COOKIE_SECURE: booleano,

  // Conta criada ao subir, se ainda não existir uma com esse e-mail
  USUARIO_NOME: opcional(z.string()),
  USUARIO_EMAIL: opcional(z.email('USUARIO_EMAIL deve ser um e-mail')),
  USUARIO_SENHA: opcional(z.string().min(8, 'USUARIO_SENHA deve ter no mínimo 8 caracteres')),

  // Instância de demonstração (portfólio): mostra o login da conta de exemplo na tela de entrada
  DEMO: booleano,
});

const resultado = envSchema.safeParse(process.env);

if (!resultado.success) {
  console.error('Variáveis de ambiente inválidas:');
  console.error(JSON.stringify(z.flattenError(resultado.error).fieldErrors, null, 2));
  process.exit(1);
}

export const env = resultado.data;
