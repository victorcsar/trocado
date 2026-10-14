import { Prisma } from '@prisma/client';

/** Relações que acompanham todo lançamento devolvido pela API. */
export const incluirRelacoes = {
  categoria: { select: { id: true, nome: true, cor: true } },
  caixinha: { select: { id: true, nome: true, cor: true } },
  cartao: { select: { id: true, nome: true, cor: true } },
} satisfies Prisma.LancamentoInclude;

export type LancamentoComRelacoes = Prisma.LancamentoGetPayload<{ include: typeof incluirRelacoes }>;

export function paraLancamentoDto(l: LancamentoComRelacoes) {
  return {
    id: l.id,
    tipo: l.tipo,
    valorCentavos: l.valorCentavos,
    data: l.data,
    competencia: l.competencia,
    descricao: l.descricao,
    formaPagamento: l.formaPagamento,
    categoria: l.categoria,
    caixinha: l.caixinha,
    cartao: l.cartao,
    compraId: l.compraId,
    parcela: l.parcela,
    totalParcelas: l.totalParcelas,
    origemId: l.origemId,
  };
}

export type LancamentoDto = ReturnType<typeof paraLancamentoDto>;
