import { TipoLancamento } from '@prisma/client';
import { intervaloDeCompetencias, somarMeses } from '../../shared/datas';
import { prisma } from '../../shared/prisma';
import { vencimentoDaFatura } from '../cartoes/fatura';

export interface TotaisDoMes {
  entrouCentavos: number;
  saiuCentavos: number;
  guardadoCentavos: number;
  resgatadoCentavos: number;
  /** entrou + resgatado − guardado − saiu */
  sobrouCentavos: number;
}

/** Quantos meses anteriores entram na média de comparação por categoria. */
const MESES_DA_MEDIA = 3;

export function calcularTotais(somas: Partial<Record<TipoLancamento, number>>): TotaisDoMes {
  const entrou = somas.ENTRADA ?? 0;
  const saiu = somas.SAIDA ?? 0;
  const guardado = somas.GUARDAR ?? 0;
  const resgatado = somas.RESGATAR ?? 0;
  return {
    entrouCentavos: entrou,
    saiuCentavos: saiu,
    guardadoCentavos: guardado,
    resgatadoCentavos: resgatado,
    sobrouCentavos: entrou + resgatado - guardado - saiu,
  };
}

/** Quanto da entrada foi guardado, em %, com uma casa decimal. Sem entrada, não há taxa. */
export function taxaDePoupanca(totais: TotaisDoMes): number | null {
  if (!totais.entrouCentavos) return null;
  return Math.round((totais.guardadoCentavos / totais.entrouCentavos) * 1000) / 10;
}

async function somasPorTipo(usuarioId: string, competencias: string[]) {
  const grupos = await prisma.lancamento.groupBy({
    by: ['competencia', 'tipo'],
    where: { usuarioId, competencia: { in: competencias } },
    _sum: { valorCentavos: true },
  });
  const porMes = new Map<string, Partial<Record<TipoLancamento, number>>>(competencias.map((c) => [c, {}]));
  for (const g of grupos) porMes.get(g.competencia)![g.tipo] = g._sum.valorCentavos ?? 0;
  return porMes;
}

async function somasPorCategoria(usuarioId: string, tipo: 'ENTRADA' | 'SAIDA', competencias: string[]) {
  const grupos = await prisma.lancamento.groupBy({
    by: ['categoriaId'],
    where: { usuarioId, tipo, competencia: { in: competencias } },
    _sum: { valorCentavos: true },
  });
  return new Map(grupos.map((g) => [g.categoriaId!, g._sum.valorCentavos ?? 0]));
}

async function faturasDoMes(usuarioId: string, competencia: string) {
  const grupos = await prisma.lancamento.groupBy({
    by: ['cartaoId'],
    where: { usuarioId, competencia, cartaoId: { not: null } },
    _sum: { valorCentavos: true },
    _count: true,
  });
  if (!grupos.length) return [];
  const cartoes = await prisma.cartao.findMany({ where: { id: { in: grupos.map((g) => g.cartaoId!) } } });
  return grupos
    .map((g) => {
      const cartao = cartoes.find((c) => c.id === g.cartaoId)!;
      return {
        cartao: { id: cartao.id, nome: cartao.nome, cor: cartao.cor },
        vencimento: vencimentoDaFatura(competencia, cartao),
        totalCentavos: g._sum.valorCentavos ?? 0,
        quantidade: g._count,
      };
    })
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export const resumoService = {
  /** Tudo o que a tela do mês e o resumo precisam de uma vez. */
  async doMes(usuarioId: string, competencia: string) {
    const anteriores = intervaloDeCompetencias(somarMeses(competencia, -MESES_DA_MEDIA), somarMeses(competencia, -1));

    const [somas, saidas, saidasAnteriores, entradas, categorias, faturas, proximasFaturas, parcelasFuturas] =
      await Promise.all([
        somasPorTipo(usuarioId, [competencia]),
        somasPorCategoria(usuarioId, 'SAIDA', [competencia]),
        somasPorCategoria(usuarioId, 'SAIDA', anteriores),
        somasPorCategoria(usuarioId, 'ENTRADA', [competencia]),
        prisma.categoria.findMany({ where: { usuarioId }, select: { id: true, nome: true, cor: true } }),
        faturasDoMes(usuarioId, competencia),
        faturasDoMes(usuarioId, somarMeses(competencia, 1)),
        prisma.lancamento.aggregate({
          where: { usuarioId, cartaoId: { not: null }, competencia: { gt: competencia } },
          _sum: { valorCentavos: true },
        }),
      ]);

    const totais = calcularTotais(somas.get(competencia)!);
    const categoria = (id: string) => categorias.find((c) => c.id === id)!;

    const gastosPorCategoria = [...saidas]
      .map(([id, valorCentavos]) => {
        const mediaAnterior = Math.round((saidasAnteriores.get(id) ?? 0) / MESES_DA_MEDIA);
        return {
          categoria: categoria(id),
          valorCentavos,
          mediaAnteriorCentavos: mediaAnterior,
          // Variação sobre a média dos meses anteriores; sem histórico, não compara
          variacaoPercentual: mediaAnterior ? Math.round(((valorCentavos - mediaAnterior) / mediaAnterior) * 100) : null,
        };
      })
      .sort((a, b) => b.valorCentavos - a.valorCentavos);

    const entradasPorCategoria = [...entradas]
      .map(([id, valorCentavos]) => ({ categoria: categoria(id), valorCentavos }))
      .sort((a, b) => b.valorCentavos - a.valorCentavos);

    return {
      competencia,
      totais,
      taxaDePoupanca: taxaDePoupanca(totais),
      gastosPorCategoria,
      entradasPorCategoria,
      faturas,
      // Faturas do mês seguinte que já têm compras: o "vai entrar no mês que vem"
      proximasFaturas,
      parcelasFuturasCentavos: parcelasFuturas._sum.valorCentavos ?? 0,
    };
  },

  /** Série mensal para o gráfico de 12 meses (ou outra quantidade), terminando em `ate`. */
  async serie(usuarioId: string, ate: string, quantidade: number) {
    const competencias = intervaloDeCompetencias(somarMeses(ate, -(quantidade - 1)), ate);
    const somas = await somasPorTipo(usuarioId, competencias);
    return competencias.map((competencia) => {
      const totais = calcularTotais(somas.get(competencia)!);
      return { competencia, ...totais, taxaDePoupanca: taxaDePoupanca(totais) };
    });
  },
};
