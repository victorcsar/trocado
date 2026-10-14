import { z } from 'zod';
import { competenciaSchema, corSchema, nomeSchema } from '../../shared/schemas';

const dia = (rotulo: string) =>
  z
    .number({ error: `Informe o dia de ${rotulo}` })
    .int()
    .min(1, `Dia de ${rotulo} entre 1 e 31`)
    .max(31, `Dia de ${rotulo} entre 1 e 31`);

const campos = z.object({
  nome: nomeSchema,
  diaFechamento: dia('fechamento'),
  diaVencimento: dia('vencimento'),
  cor: corSchema,
  ativo: z.boolean(),
});

const diasDiferentes = (c: { diaFechamento?: number; diaVencimento?: number }) =>
  c.diaFechamento === undefined || c.diaFechamento !== c.diaVencimento;
const mensagemDias = { message: 'Fechamento e vencimento não podem ser no mesmo dia', path: ['diaVencimento'] };

export const criarCartaoSchema = campos.omit({ ativo: true }).refine(diasDiferentes, mensagemDias);
export type CriarCartaoInput = z.infer<typeof criarCartaoSchema>;

export const atualizarCartaoSchema = campos.partial().refine(diasDiferentes, mensagemDias);
export type AtualizarCartaoInput = z.infer<typeof atualizarCartaoSchema>;

export const filtroFaturaSchema = z.object({ competencia: competenciaSchema });
