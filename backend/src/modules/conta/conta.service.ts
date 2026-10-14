import bcrypt from 'bcryptjs';
import { env } from '../../shared/config/env';
import { ConflitoError, NaoAutenticadoError, RegraError } from '../../shared/errors/app-error';
import { prisma } from '../../shared/prisma';
import { CAIXINHA_PADRAO, CATEGORIAS_PADRAO } from './padroes';
import { AtualizarContaInput, TrocarSenhaInput } from './conta.schemas';

const CUSTO_BCRYPT = 12;
// Hash qualquer, para o login levar o mesmo tempo com e-mail inexistente
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe', CUSTO_BCRYPT);

const camposPublicos = { id: true, nome: true, email: true, percentualGuardar: true } as const;

export interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
}

export const contaService = {
  /** Cria a conta já com as categorias padrão e a caixinha que recebe o valor guardado. */
  async criarUsuario({ nome, email, senha }: NovoUsuario) {
    const emailNormalizado = email.trim().toLowerCase();
    if (await prisma.usuario.count({ where: { email: emailNormalizado } })) {
      throw new ConflitoError('Já existe uma conta com esse e-mail');
    }
    return prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: emailNormalizado,
        senhaHash: await bcrypt.hash(senha, CUSTO_BCRYPT),
        categorias: { create: CATEGORIAS_PADRAO },
        caixinhas: { create: { ...CAIXINHA_PADRAO, padrao: true } },
      },
      select: camposPublicos,
    });
  },

  /**
   * Ao subir, cria a conta do .env (USUARIO_*) se ainda não existir uma com esse e-mail.
   * Conta que já existe não é alterada: a senha passa a ser a da tela de Ajustes.
   */
  async garantirUsuarioInicial(): Promise<void> {
    if (!env.USUARIO_EMAIL || !env.USUARIO_SENHA) {
      if (!(await prisma.usuario.count())) {
        console.warn('Nenhum usuário no banco. Defina USUARIO_EMAIL e USUARIO_SENHA no .env para criar o primeiro.');
      }
      return;
    }
    if (await prisma.usuario.count({ where: { email: env.USUARIO_EMAIL.trim().toLowerCase() } })) return;
    await this.criarUsuario({ nome: env.USUARIO_NOME ?? 'Eu', email: env.USUARIO_EMAIL, senha: env.USUARIO_SENHA });
    console.log(`Conta criada: ${env.USUARIO_EMAIL}`);
  },

  async autenticar(email: string, senha: string) {
    const usuario = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
    const confere = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);
    if (!usuario || !confere) throw new NaoAutenticadoError('E-mail ou senha incorretos');
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, percentualGuardar: usuario.percentualGuardar };
  },

  async buscar(usuarioId: string) {
    return prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: camposPublicos });
  },

  async atualizar(usuarioId: string, dados: AtualizarContaInput) {
    return prisma.usuario.update({ where: { id: usuarioId }, data: dados, select: camposPublicos });
  },

  async trocarSenha(usuarioId: string, { senhaAtual, novaSenha }: TrocarSenhaInput): Promise<void> {
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    if (!(await bcrypt.compare(senhaAtual, usuario.senhaHash))) throw new RegraError('A senha atual não confere');
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash: await bcrypt.hash(novaSenha, CUSTO_BCRYPT) },
    });
  },
};
