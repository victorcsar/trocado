import { ConflitoError, NaoEncontradoError, RegraError } from '../../shared/errors/app-error';
import { hoje } from '../../shared/datas';
import { prisma } from '../../shared/prisma';
import { paraLancamentoDto, incluirRelacoes } from '../lancamentos/lancamento.dto';
import { competenciaDaCompra, vencimentoDaFatura } from './fatura';
import { AtualizarCartaoInput, CriarCartaoInput } from './cartoes.schemas';

const campos = { id: true, nome: true, diaFechamento: true, diaVencimento: true, cor: true, ativo: true } as const;

async function daConta(usuarioId: string, id: string) {
  const cartao = await prisma.cartao.findFirst({ where: { id, usuarioId }, select: campos });
  if (!cartao) throw new NaoEncontradoError('Cartão');
  return cartao;
}

export const cartoesService = {
  /** Cartões com a fatura que está aberta hoje (a que recebe uma compra feita agora). */
  async listar(usuarioId: string) {
    const cartoes = await prisma.cartao.findMany({
      where: { usuarioId },
      select: campos,
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    });
    const dia = hoje();
    return Promise.all(
      cartoes.map(async (cartao) => {
        const competencia = competenciaDaCompra(dia, cartao);
        const soma = await prisma.lancamento.aggregate({
          where: { usuarioId, cartaoId: cartao.id, competencia },
          _sum: { valorCentavos: true },
        });
        return {
          ...cartao,
          faturaAberta: {
            competencia,
            vencimento: vencimentoDaFatura(competencia, cartao),
            totalCentavos: soma._sum.valorCentavos ?? 0,
          },
        };
      }),
    );
  },

  criar(usuarioId: string, dados: CriarCartaoInput) {
    return prisma.cartao.create({ data: { ...dados, usuarioId }, select: campos });
  },

  /**
   * Mudar fechamento ou vencimento vale para as compras novas. As já lançadas continuam
   * na fatura em que caíram, para o histórico dos meses passados não mudar.
   */
  async atualizar(usuarioId: string, id: string, dados: AtualizarCartaoInput) {
    const atual = await daConta(usuarioId, id);
    const fechamento = dados.diaFechamento ?? atual.diaFechamento;
    const vencimento = dados.diaVencimento ?? atual.diaVencimento;
    if (fechamento === vencimento) throw new RegraError('Fechamento e vencimento não podem ser no mesmo dia');
    return prisma.cartao.update({ where: { id }, data: dados, select: campos });
  },

  async excluir(usuarioId: string, id: string): Promise<void> {
    await daConta(usuarioId, id);
    const usos = await prisma.lancamento.count({ where: { cartaoId: id } });
    if (usos) throw new ConflitoError('Esse cartão tem compras lançadas. Desative em vez de excluir.');
    await prisma.cartao.delete({ where: { id } });
  },

  async fatura(usuarioId: string, id: string, competencia: string) {
    const cartao = await daConta(usuarioId, id);
    const itens = await prisma.lancamento.findMany({
      where: { usuarioId, cartaoId: id, competencia },
      include: incluirRelacoes,
      orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
    });
    return {
      cartao,
      competencia,
      vencimento: vencimentoDaFatura(competencia, cartao),
      totalCentavos: itens.reduce((t, l) => t + l.valorCentavos, 0),
      itens: itens.map(paraLancamentoDto),
    };
  },
};
