import { ConflitoError, NaoEncontradoError } from '../../shared/errors/app-error';
import { prisma } from '../../shared/prisma';
import { AtualizarCategoriaInput, CriarCategoriaInput } from './categorias.schemas';

const campos = { id: true, nome: true, tipo: true, cor: true, ativa: true } as const;

async function daConta(usuarioId: string, id: string) {
  const categoria = await prisma.categoria.findFirst({ where: { id, usuarioId } });
  if (!categoria) throw new NaoEncontradoError('Categoria');
  return categoria;
}

export const categoriasService = {
  listar(usuarioId: string) {
    return prisma.categoria.findMany({
      where: { usuarioId },
      select: campos,
      orderBy: [{ tipo: 'asc' }, { ativa: 'desc' }, { nome: 'asc' }],
    });
  },

  criar(usuarioId: string, dados: CriarCategoriaInput) {
    return prisma.categoria.create({ data: { ...dados, usuarioId }, select: campos });
  },

  async atualizar(usuarioId: string, id: string, dados: AtualizarCategoriaInput) {
    await daConta(usuarioId, id);
    return prisma.categoria.update({ where: { id }, data: dados, select: campos });
  },

  /** Só exclui categoria sem lançamentos; as usadas podem ser desativadas. */
  async excluir(usuarioId: string, id: string): Promise<void> {
    await daConta(usuarioId, id);
    const usos = await prisma.lancamento.count({ where: { categoriaId: id } });
    if (usos) {
      throw new ConflitoError(
        `Essa categoria tem ${usos} lançamento${usos > 1 ? 's' : ''}. Desative em vez de excluir.`,
      );
    }
    await prisma.categoria.delete({ where: { id } });
  },
};
