import { randomUUID } from 'node:crypto';
import { FormaPagamento } from '@prisma/client';
import { NaoEncontradoError, RegraError } from '../../shared/errors/app-error';
import { competenciaDaData } from '../../shared/datas';
import { dividirEmParcelas } from '../../shared/dinheiro';
import { prisma, Tx } from '../../shared/prisma';
import { caixinhaDaConta, caixinhaParaGuardar } from '../caixinhas/caixinhas.service';
import { garantirSaldosPositivos } from '../caixinhas/saldos';
import { competenciasDasParcelas, vencimentoDaFatura } from '../cartoes/fatura';
import { incluirRelacoes, paraLancamentoDto } from './lancamento.dto';
import { EntradaInput, LancamentoInput, SaidaInput } from './lancamentos.schemas';

type Compra = SaidaInput & { formaPagamento: 'CREDITO'; cartaoId: string };

const ehCompra = (input: LancamentoInput): input is Compra =>
  input.tipo === 'SAIDA' && input.formaPagamento === 'CREDITO';

/**
 * Categoria precisa ser da conta, do tipo certo e estar ativa.
 * Na edição, a categoria que o lançamento já tinha passa mesmo se foi desativada depois.
 */
async function categoriaValida(db: Tx, usuarioId: string, id: string, tipo: 'ENTRADA' | 'SAIDA', atualId?: string | null) {
  const categoria = await db.categoria.findFirst({ where: { id, usuarioId } });
  if (!categoria) throw new NaoEncontradoError('Categoria');
  if (categoria.tipo !== tipo) {
    throw new RegraError(tipo === 'ENTRADA' ? 'Essa categoria é de gasto, não de entrada' : 'Essa categoria é de entrada, não de gasto');
  }
  if (!categoria.ativa && categoria.id !== atualId) throw new RegraError(`A categoria "${categoria.nome}" está desativada`);
  return categoria;
}

async function cartaoValido(db: Tx, usuarioId: string, id: string, atualId?: string | null) {
  const cartao = await db.cartao.findFirst({ where: { id, usuarioId } });
  if (!cartao) throw new NaoEncontradoError('Cartão');
  if (!cartao.ativo && cartao.id !== atualId) throw new RegraError(`O cartão "${cartao.nome}" está desativado`);
  return cartao;
}

/** Campos validados de um lançamento que não é compra no cartão. */
async function camposSimples(db: Tx, usuarioId: string, input: Exclude<LancamentoInput, Compra>, atual?: { categoriaId: string | null }) {
  const base = {
    tipo: input.tipo,
    valorCentavos: input.valorCentavos,
    data: input.data,
    competencia: competenciaDaData(input.data),
    descricao: input.descricao,
    categoriaId: null as string | null,
    caixinhaId: null as string | null,
    formaPagamento: null as FormaPagamento | null,
  };
  switch (input.tipo) {
    case 'ENTRADA':
    case 'SAIDA': {
      const categoria = await categoriaValida(db, usuarioId, input.categoriaId, input.tipo, atual?.categoriaId);
      return { campos: { ...base, categoriaId: categoria.id, formaPagamento: input.formaPagamento ?? null }, categoria };
    }
    case 'GUARDAR': {
      const caixinha = await caixinhaParaGuardar(db, usuarioId, input.caixinhaId);
      return { campos: { ...base, caixinhaId: caixinha.id }, categoria: null };
    }
    case 'RESGATAR': {
      // Dá pra resgatar de caixinha arquivada; o saldo é conferido no fim da transação
      const caixinha = await caixinhaDaConta(db, usuarioId, input.caixinhaId);
      return { campos: { ...base, caixinhaId: caixinha.id }, categoria: null };
    }
  }
}

/** Compra no cartão: uma linha por parcela, cada uma na competência da sua fatura. */
async function gravarCompra(db: Tx, usuarioId: string, input: Compra, cartaoAtualId?: string | null): Promise<string[]> {
  const categoria = await categoriaValida(db, usuarioId, input.categoriaId, 'SAIDA');
  const cartao = await cartaoValido(db, usuarioId, input.cartaoId, cartaoAtualId);
  const compraId = randomUUID();
  const valores = dividirEmParcelas(input.valorCentavos, input.parcelas);
  const competencias = competenciasDasParcelas(input.data, cartao, input.parcelas);
  await db.lancamento.createMany({
    data: valores.map((valorCentavos, i) => ({
      usuarioId,
      tipo: 'SAIDA' as const,
      valorCentavos,
      data: input.data,
      competencia: competencias[i]!,
      descricao: input.descricao,
      categoriaId: categoria.id,
      formaPagamento: 'CREDITO' as const,
      cartaoId: cartao.id,
      compraId,
      parcela: i + 1,
      totalParcelas: input.parcelas,
    })),
  });
  const parcelas = await db.lancamento.findMany({ where: { compraId }, select: { id: true }, orderBy: { parcela: 'asc' } });
  return parcelas.map((p) => p.id);
}

/**
 * Mantém o valor guardado junto com a entrada: cria, atualiza ou remove.
 * Devolve as caixinhas mexidas, para conferir o saldo no fim.
 */
async function sincronizarGuardado(
  db: Tx,
  usuarioId: string,
  entrada: { id: string; data: string; competencia: string; descricao: string },
  guardar: EntradaInput['guardar'],
  nomeDaCategoria: string,
): Promise<string[]> {
  const existentes = await db.lancamento.findMany({ where: { origemId: entrada.id }, orderBy: { createdAt: 'asc' } });
  const antigas = existentes.map((g) => g.caixinhaId!);

  if (!guardar?.valorCentavos) {
    await db.lancamento.deleteMany({ where: { origemId: entrada.id } });
    return antigas;
  }

  const caixinha = await caixinhaParaGuardar(db, usuarioId, guardar.caixinhaId ?? existentes[0]?.caixinhaId ?? undefined);
  const dados = {
    valorCentavos: guardar.valorCentavos,
    data: entrada.data,
    competencia: entrada.competencia,
    descricao: entrada.descricao || nomeDaCategoria,
    caixinhaId: caixinha.id,
  };
  const [primeiro, ...sobras] = existentes;
  if (primeiro) {
    await db.lancamento.update({ where: { id: primeiro.id }, data: dados });
    if (sobras.length) await db.lancamento.deleteMany({ where: { id: { in: sobras.map((s) => s.id) } } });
  } else {
    await db.lancamento.create({ data: { ...dados, usuarioId, tipo: 'GUARDAR', origemId: entrada.id } });
  }
  return [...antigas, caixinha.id];
}

/** Grava um lançamento novo e devolve os ids criados e as caixinhas mexidas. */
async function gravar(db: Tx, usuarioId: string, input: LancamentoInput, atual?: { categoriaId: string | null; cartaoId: string | null }) {
  if (ehCompra(input)) {
    return { ids: await gravarCompra(db, usuarioId, input, atual?.cartaoId), caixinhas: [] as string[] };
  }
  const { campos, categoria } = await camposSimples(db, usuarioId, input, atual);
  const criado = await db.lancamento.create({ data: { ...campos, usuarioId } });
  const caixinhas = campos.caixinhaId ? [campos.caixinhaId] : [];
  if (input.tipo === 'ENTRADA') {
    caixinhas.push(...(await sincronizarGuardado(db, usuarioId, criado, input.guardar, categoria!.nome)));
  }
  return { ids: [criado.id], caixinhas };
}

async function lancamentoDaConta(db: Tx, usuarioId: string, id: string) {
  const lancamento = await db.lancamento.findFirst({ where: { id, usuarioId } });
  if (!lancamento) throw new NaoEncontradoError('Lançamento');
  return lancamento;
}

async function carregar(ids: string[]) {
  const lancamentos = await prisma.lancamento.findMany({
    where: { OR: [{ id: { in: ids } }, { origemId: { in: ids } }] },
    include: incluirRelacoes,
    orderBy: [{ parcela: 'asc' }, { createdAt: 'asc' }],
  });
  return lancamentos.map(paraLancamentoDto);
}

export const lancamentosService = {
  /**
   * Lançamentos de um mês. As compras no cartão vêm agrupadas por fatura, porque é
   * a fatura que sai da conta naquele mês; os itens ficam dentro de cada uma.
   */
  async listarDoMes(usuarioId: string, competencia: string) {
    const todos = await prisma.lancamento.findMany({
      where: { usuarioId, competencia },
      include: incluirRelacoes,
      orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
    });
    const doCartao = todos.filter((l) => l.cartaoId);
    const cartoes = await prisma.cartao.findMany({
      where: { id: { in: [...new Set(doCartao.map((l) => l.cartaoId!))] } },
      orderBy: { nome: 'asc' },
    });

    return {
      competencia,
      lancamentos: todos.filter((l) => !l.cartaoId).map(paraLancamentoDto),
      faturas: cartoes.map((cartao) => {
        const itens = doCartao.filter((l) => l.cartaoId === cartao.id);
        return {
          cartao: { id: cartao.id, nome: cartao.nome, cor: cartao.cor },
          vencimento: vencimentoDaFatura(competencia, cartao),
          totalCentavos: itens.reduce((t, l) => t + l.valorCentavos, 0),
          itens: itens.map(paraLancamentoDto),
        };
      }),
    };
  },

  /** Um lançamento com o que o formulário de edição precisa: a compra inteira e o valor guardado. */
  async buscar(usuarioId: string, id: string) {
    const lancamento = await prisma.lancamento.findFirst({ where: { id, usuarioId }, include: incluirRelacoes });
    if (!lancamento) throw new NaoEncontradoError('Lançamento');

    const parcelas = lancamento.compraId
      ? await prisma.lancamento.findMany({
          where: { compraId: lancamento.compraId },
          select: { id: true, parcela: true, competencia: true, valorCentavos: true },
          orderBy: { parcela: 'asc' },
        })
      : [];
    const guardado =
      lancamento.tipo === 'ENTRADA'
        ? await prisma.lancamento.findFirst({ where: { origemId: id }, include: incluirRelacoes })
        : null;

    return {
      lancamento: paraLancamentoDto(lancamento),
      compra: lancamento.compraId
        ? { totalCentavos: parcelas.reduce((t, p) => t + p.valorCentavos, 0), totalParcelas: parcelas.length, parcelas }
        : null,
      guardado: guardado ? paraLancamentoDto(guardado) : null,
    };
  },

  criar(usuarioId: string, input: LancamentoInput) {
    return prisma
      .$transaction(async (tx) => {
        const { ids, caixinhas } = await gravar(tx, usuarioId, input);
        await garantirSaldosPositivos(tx, usuarioId, caixinhas);
        return ids;
      })
      .then(carregar);
  },

  /**
   * Edição. Compra no cartão (antes ou depois de editar) é refeita do zero, porque
   * valor, data ou parcelas mudam todas as parcelas; o resto é atualizado no lugar.
   */
  atualizar(usuarioId: string, id: string, input: LancamentoInput) {
    return prisma
      .$transaction(async (tx) => {
        const antigo = await lancamentoDaConta(tx, usuarioId, id);
        if (antigo.origemId && input.tipo !== 'GUARDAR') {
          throw new RegraError('Esse valor foi guardado junto com uma entrada. Edite a entrada.');
        }
        const guardadosAntigos = await tx.lancamento.findMany({ where: { origemId: id }, select: { caixinhaId: true } });
        const afetadas = [antigo.caixinhaId, ...guardadosAntigos.map((g) => g.caixinhaId)];

        if (antigo.compraId || ehCompra(input)) {
          await tx.lancamento.deleteMany({ where: { origemId: id } });
          await tx.lancamento.deleteMany({ where: antigo.compraId ? { compraId: antigo.compraId } : { id } });
          const { ids, caixinhas } = await gravar(tx, usuarioId, input, antigo);
          await garantirSaldosPositivos(tx, usuarioId, [...afetadas, ...caixinhas]);
          return ids;
        }

        const { campos, categoria } = await camposSimples(tx, usuarioId, input, antigo);
        const atualizado = await tx.lancamento.update({ where: { id }, data: campos });
        afetadas.push(campos.caixinhaId);
        if (input.tipo === 'ENTRADA') {
          afetadas.push(...(await sincronizarGuardado(tx, usuarioId, atualizado, input.guardar, categoria!.nome)));
        } else {
          await tx.lancamento.deleteMany({ where: { origemId: id } });
        }
        await garantirSaldosPositivos(tx, usuarioId, afetadas);
        return [id];
      })
      .then(carregar);
  },

  /** Exclui o lançamento; numa compra parcelada, todas as parcelas; numa entrada, o valor guardado junto. */
  async excluir(usuarioId: string, id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const antigo = await lancamentoDaConta(tx, usuarioId, id);
      const guardados = await tx.lancamento.findMany({ where: { origemId: id }, select: { caixinhaId: true } });
      await tx.lancamento.deleteMany({ where: { origemId: id } });
      await tx.lancamento.deleteMany({ where: antigo.compraId ? { compraId: antigo.compraId } : { id } });
      await garantirSaldosPositivos(tx, usuarioId, [antigo.caixinhaId, ...guardados.map((g) => g.caixinhaId)]);
    });
  },
};
