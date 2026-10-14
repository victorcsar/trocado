import { RegraError } from '../../shared/errors/app-error';
import { Tx } from '../../shared/prisma';

/**
 * Saldo de cada caixinha: guardado − resgatado + transferências recebidas − enviadas.
 * Sem `ids`, calcula todas as caixinhas do usuário.
 */
export async function saldosDasCaixinhas(db: Tx, usuarioId: string, ids?: string[]): Promise<Map<string, number>> {
  const filtroIds = ids ? { in: ids } : undefined;
  const [lancamentos, enviadas, recebidas] = await Promise.all([
    db.lancamento.groupBy({
      by: ['caixinhaId', 'tipo'],
      where: { usuarioId, tipo: { in: ['GUARDAR', 'RESGATAR'] }, caixinhaId: filtroIds ?? { not: null } },
      _sum: { valorCentavos: true },
    }),
    db.transferencia.groupBy({
      by: ['deId'],
      where: { usuarioId, ...(filtroIds && { deId: filtroIds }) },
      _sum: { valorCentavos: true },
    }),
    db.transferencia.groupBy({
      by: ['paraId'],
      where: { usuarioId, ...(filtroIds && { paraId: filtroIds }) },
      _sum: { valorCentavos: true },
    }),
  ]);

  const saldos = new Map<string, number>(ids?.map((id) => [id, 0]));
  const somar = (id: string | null, valor: number) => {
    if (id) saldos.set(id, (saldos.get(id) ?? 0) + valor);
  };
  for (const g of lancamentos) somar(g.caixinhaId, (g._sum.valorCentavos ?? 0) * (g.tipo === 'GUARDAR' ? 1 : -1));
  for (const g of enviadas) somar(g.deId, -(g._sum.valorCentavos ?? 0));
  for (const g of recebidas) somar(g.paraId, g._sum.valorCentavos ?? 0);
  return saldos;
}

/**
 * Confere, ao fim de uma alteração (dentro da transação), que nenhuma caixinha
 * afetada ficou negativa. Se ficou, a transação inteira é desfeita.
 */
export async function garantirSaldosPositivos(db: Tx, usuarioId: string, ids: (string | null | undefined)[]) {
  const unicos = [...new Set(ids.filter((id): id is string => !!id))];
  if (!unicos.length) return;
  const saldos = await saldosDasCaixinhas(db, usuarioId, unicos);
  for (const [id, saldo] of saldos) {
    if (saldo < 0) {
      const caixinha = await db.caixinha.findUniqueOrThrow({ where: { id }, select: { nome: true } });
      throw new RegraError(`A caixinha "${caixinha.nome}" ficaria com saldo negativo`, { caixinhaId: id, saldo });
    }
  }
}
