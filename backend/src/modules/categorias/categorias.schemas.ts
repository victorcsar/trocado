import { z } from 'zod';
import { corSchema, nomeSchema } from '../../shared/schemas';

export const criarCategoriaSchema = z.object({
  nome: nomeSchema,
  tipo: z.enum(['ENTRADA', 'SAIDA'], { error: 'Tipo deve ser ENTRADA ou SAIDA' }),
  cor: corSchema,
});
export type CriarCategoriaInput = z.infer<typeof criarCategoriaSchema>;

// O tipo não muda depois de criada: os lançamentos dela dependem disso
export const atualizarCategoriaSchema = z
  .object({ nome: nomeSchema, cor: corSchema, ativa: z.boolean() })
  .partial();
export type AtualizarCategoriaInput = z.infer<typeof atualizarCategoriaSchema>;
