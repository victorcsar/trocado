import { z } from 'zod';
import { centavosSchema, competenciaSchema, dataSchema, idSchema } from '../../shared/schemas';

export const FORMAS_PAGAMENTO = ['PIX', 'DEBITO', 'CREDITO', 'DINHEIRO', 'TRANSFERENCIA', 'BOLETO'] as const;
const formaSchema = z.enum(FORMAS_PAGAMENTO, { error: 'Forma de pagamento inválida' });

const descricaoSchema = z.string().trim().max(120, 'Descrição longa demais (máx. 120)').default('');

const comum = {
  valorCentavos: centavosSchema,
  data: dataSchema,
  descricao: descricaoSchema,
};

const entradaSchema = z
  .object({
    tipo: z.literal('ENTRADA'),
    ...comum,
    categoriaId: idSchema,
    formaPagamento: formaSchema.exclude(['CREDITO']).optional(),
    // Parte da entrada que já vai para uma caixinha (a sugestão vem do percentual da conta)
    guardar: z
      .object({
        valorCentavos: z.number().int().min(0, 'Valor a guardar não pode ser negativo'),
        caixinhaId: idSchema.optional(),
      })
      .optional(),
  })
  .refine((e) => !e.guardar || e.guardar.valorCentavos <= e.valorCentavos, {
    message: 'Não dá pra guardar mais do que entrou',
    path: ['guardar', 'valorCentavos'],
  });

const saidaSchema = z
  .object({
    tipo: z.literal('SAIDA'),
    ...comum,
    categoriaId: idSchema,
    formaPagamento: formaSchema,
    cartaoId: idSchema.optional(),
    parcelas: z.number().int().min(1).max(48, 'No máximo 48 parcelas').default(1),
  })
  .superRefine((s, ctx) => {
    if (s.formaPagamento === 'CREDITO' && !s.cartaoId) {
      ctx.addIssue({ code: 'custom', message: 'Escolha o cartão', path: ['cartaoId'] });
    }
    if (s.formaPagamento !== 'CREDITO' && s.parcelas > 1) {
      ctx.addIssue({ code: 'custom', message: 'Parcelas só no cartão de crédito', path: ['parcelas'] });
    }
  });

const guardarSchema = z.object({
  tipo: z.literal('GUARDAR'),
  ...comum,
  caixinhaId: idSchema.optional(),
});

const resgatarSchema = z.object({
  tipo: z.literal('RESGATAR'),
  ...comum,
  caixinhaId: idSchema,
});

export const lancamentoSchema = z.discriminatedUnion('tipo', [entradaSchema, saidaSchema, guardarSchema, resgatarSchema], {
  error: 'Tipo deve ser ENTRADA, SAIDA, GUARDAR ou RESGATAR',
});
export type LancamentoInput = z.infer<typeof lancamentoSchema>;
export type EntradaInput = z.infer<typeof entradaSchema>;
export type SaidaInput = z.infer<typeof saidaSchema>;

export const filtroLancamentosSchema = z.object({
  competencia: competenciaSchema,
});
