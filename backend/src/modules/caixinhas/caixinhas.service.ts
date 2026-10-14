import { ConflitoError, NaoEncontradoError, RegraError } from '../../shared/errors/app-error';
import { prisma, Tx } from '../../shared/prisma';
import { garantirSaldosPositivos, saldosDasCaixinhas } from './saldos';
import { AtualizarCaixinhaInput, CriarCaixinhaInput, TransferirInput } from './caixinhas.schemas';

const campos = { id: true, nome: true, metaCentavos: true, cor: true, padrao: true, arquivada: true } as const;

async function daConta(db: Tx, usuarioId: string, id: string) {
  const caixinha = await db.caixinha.findFirst({ where: { id, usuarioId }, select: campos });
  if (!caixinha) throw new NaoEncontradoError('Caixinha');
  return caixinha;
}

/**
 * Caixinha que recebe um valor guardado: a escolhida (se não estiver arquivada)
 * ou, sem escolha, a padrão do usuário.
 */
export async function caixinhaParaGuardar(db: Tx, usuarioId: string, caixinhaId?: string) {
  const caixinha = caixinhaId
    ? await daConta(db, usuarioId, caixinhaId)
    : await db.caixinha.findFirst({ where: { usuarioId, padrao: true }, select: campos });
  if (!caixinha) throw new RegraError('Nenhuma caixinha padrão. Escolha onde guardar.');
  if (caixinha.arquivada) throw new RegraError(`A caixinha "${caixinha.nome}" está arquivada`);
  return caixinha;
}

export { daConta as caixinhaDaConta };

export const caixinhasService = {
  async listar(usuarioId: string) {
    const [caixinhas, saldos] = await Promise.all([
      prisma.caixinha.findMany({
        where: { usuarioId },
        select: campos,
        orderBy: [{ arquivada: 'asc' }, { padrao: 'desc' }, { nome: 'asc' }],
      }),
      saldosDasCaixinhas(prisma, usuarioId),
    ]);
    return caixinhas.map((c) => ({ ...c, saldoCentavos: saldos.get(c.id) ?? 0 }));
  },

  criar(usuarioId: string, dados: CriarCaixinhaInput) {
    return prisma.$transaction(async (tx) => {
      if (dados.padrao) await tx.caixinha.updateMany({ where: { usuarioId }, data: { padrao: false } });
      return tx.caixinha.create({ data: { ...dados, usuarioId }, select: campos });
    });
  },

  atualizar(usuarioId: string, id: string, dados: AtualizarCaixinhaInput) {
    return prisma.$transaction(async (tx) => {
      const atual = await daConta(tx, usuarioId, id);
      if (dados.arquivada) {
        if (atual.padrao || dados.padrao) throw new RegraError('A caixinha padrão não pode ser arquivada');
        const saldo = (await saldosDasCaixinhas(tx, usuarioId, [id])).get(id) ?? 0;
        if (saldo > 0) throw new RegraError('Mova o dinheiro para outra caixinha antes de arquivar');
      }
      if (dados.padrao) {
        if (atual.arquivada && dados.arquivada !== false) {
          throw new RegraError('Desarquive a caixinha antes de torná-la padrão');
        }
        await tx.caixinha.updateMany({ where: { usuarioId, id: { not: id } }, data: { padrao: false } });
      }
      return tx.caixinha.update({ where: { id }, data: dados, select: campos });
    });
  },

  async excluir(usuarioId: string, id: string): Promise<void> {
    const caixinha = await daConta(prisma, usuarioId, id);
    if (caixinha.padrao) throw new RegraError('A caixinha padrão não pode ser excluída');
    const [lancamentos, transferencias] = await Promise.all([
      prisma.lancamento.count({ where: { caixinhaId: id } }),
      prisma.transferencia.count({ where: { OR: [{ deId: id }, { paraId: id }] } }),
    ]);
    if (lancamentos || transferencias) {
      throw new ConflitoError('Essa caixinha tem movimentações. Arquive em vez de excluir.');
    }
    await prisma.caixinha.delete({ where: { id } });
  },

  transferir(usuarioId: string, dados: TransferirInput) {
    return prisma.$transaction(async (tx) => {
      await daConta(tx, usuarioId, dados.deId);
      await caixinhaParaGuardar(tx, usuarioId, dados.paraId);
      const transferencia = await tx.transferencia.create({
        data: { ...dados, descricao: dados.descricao || null, usuarioId },
      });
      await garantirSaldosPositivos(tx, usuarioId, [dados.deId]);
      return transferencia;
    });
  },

  async excluirTransferencia(usuarioId: string, id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const transferencia = await tx.transferencia.findFirst({ where: { id, usuarioId } });
      if (!transferencia) throw new NaoEncontradoError('Transferência');
      await tx.transferencia.delete({ where: { id } });
      await garantirSaldosPositivos(tx, usuarioId, [transferencia.paraId]);
    });
  },

  /** Extrato da caixinha: o que entrou e saiu dela, do mais recente para o mais antigo. */
  async movimentos(usuarioId: string, id: string) {
    const caixinha = await daConta(prisma, usuarioId, id);
    const [lancamentos, transferencias, saldos] = await Promise.all([
      prisma.lancamento.findMany({
        where: { usuarioId, caixinhaId: id },
        select: { id: true, tipo: true, data: true, valorCentavos: true, descricao: true, origemId: true, createdAt: true },
      }),
      prisma.transferencia.findMany({
        where: { usuarioId, OR: [{ deId: id }, { paraId: id }] },
        include: { de: { select: { id: true, nome: true } }, para: { select: { id: true, nome: true } } },
      }),
      saldosDasCaixinhas(prisma, usuarioId, [id]),
    ]);

    const movimentos = [
      ...lancamentos.map((l) => ({
        id: l.id,
        origem: 'LANCAMENTO' as const,
        tipo: l.tipo === 'GUARDAR' ? ('ENTROU' as const) : ('SAIU' as const),
        data: l.data,
        valorCentavos: l.valorCentavos,
        descricao: l.descricao,
        lancamentoDeOrigemId: l.origemId,
        createdAt: l.createdAt,
      })),
      ...transferencias.map((t) => {
        const saiu = t.deId === id;
        return {
          id: t.id,
          origem: 'TRANSFERENCIA' as const,
          tipo: saiu ? ('SAIU' as const) : ('ENTROU' as const),
          data: t.data,
          valorCentavos: t.valorCentavos,
          descricao: t.descricao || (saiu ? `Para ${t.para.nome}` : `De ${t.de.nome}`),
          lancamentoDeOrigemId: null,
          createdAt: t.createdAt,
        };
      }),
    ].sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.getTime() - a.createdAt.getTime());

    return {
      caixinha: { ...caixinha, saldoCentavos: saldos.get(id) ?? 0 },
      movimentos: movimentos.map(({ createdAt: _, ...m }) => m),
    };
  },
};
