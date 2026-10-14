import { z } from 'zod';
import { ehCompetenciaValida, ehDataValida } from './datas';

/** Valor em centavos: inteiro, positivo e com teto de R$ 10 milhões (cabe folgado no int4 do Postgres). */
export const centavosSchema = z
  .number({ error: 'Informe o valor' })
  .int('O valor deve estar em centavos (inteiro)')
  .positive('O valor precisa ser maior que zero')
  .max(1_000_000_000, 'Valor alto demais (máx. R$ 10 milhões)');

export const dataSchema = z.string().refine(ehDataValida, 'Data inválida (use AAAA-MM-DD)');

export const competenciaSchema = z.string().refine(ehCompetenciaValida, 'Mês inválido (use AAAA-MM)');

export const corSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use #rrggbb)')
  .transform((c) => c.toLowerCase());

export const idSchema = z.string().trim().min(1, 'Obrigatório').max(40);

export const nomeSchema = z.string().trim().min(1, 'Informe o nome').max(40, 'Nome longo demais (máx. 40)');
