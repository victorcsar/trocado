import { z } from 'zod';

export const entrarSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail'),
  senha: z.string().min(1, 'Informe a senha'),
});

export const atualizarContaSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome').max(60),
    percentualGuardar: z.number().int('Use um número inteiro').min(0).max(100),
  })
  .partial();
export type AtualizarContaInput = z.infer<typeof atualizarContaSchema>;

export const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: z.string().min(8, 'A nova senha precisa de pelo menos 8 caracteres').max(200),
});
export type TrocarSenhaInput = z.infer<typeof trocarSenhaSchema>;
