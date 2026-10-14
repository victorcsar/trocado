import { z } from 'zod';
import { centavosSchema, corSchema, dataSchema, idSchema, nomeSchema } from '../../shared/schemas';

export const criarCaixinhaSchema = z.object({
  nome: nomeSchema,
  metaCentavos: centavosSchema.nullable().default(null),
  cor: corSchema,
  padrao: z.boolean().default(false),
});
export type CriarCaixinhaInput = z.infer<typeof criarCaixinhaSchema>;

export const atualizarCaixinhaSchema = z
  .object({
    nome: nomeSchema,
    metaCentavos: centavosSchema.nullable(),
    cor: corSchema,
    // Só dá pra marcar como padrão; deixar de ser acontece quando outra vira a padrão
    padrao: z.literal(true, { error: 'Para trocar a padrão, marque outra caixinha como padrão' }),
    arquivada: z.boolean(),
  })
  .partial();
export type AtualizarCaixinhaInput = z.infer<typeof atualizarCaixinhaSchema>;

export const transferirSchema = z
  .object({
    deId: idSchema,
    paraId: idSchema,
    valorCentavos: centavosSchema,
    data: dataSchema,
    descricao: z.string().trim().max(120).optional(),
  })
  .refine((t) => t.deId !== t.paraId, { message: 'Escolha caixinhas diferentes', path: ['paraId'] });
export type TransferirInput = z.infer<typeof transferirSchema>;
