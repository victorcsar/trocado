/**
 * Cria uma conta de demonstração com 12 meses de dados fictícios.
 *
 *   npm run db:popular                          # demo@trocado.app / demonstracao
 *   npm run db:popular -- --email x@y.com --senha outra-senha --ate 2026-10
 *   npm run db:popular -- --substituir          # apaga a conta de mesmo e-mail antes
 *
 * O sorteio usa semente fixa: o mesmo mês final gera sempre os mesmos dados.
 * Passa pelos mesmos serviços da API, então parcelas, faturas e caixinhas seguem as regras reais.
 */
import { parseArgs } from 'node:util';
import { competenciaDaData, diasNoMes, ehCompetenciaValida, hoje, intervaloDeCompetencias, partesDaCompetencia, somarMeses } from '../shared/datas';
import { percentualDe } from '../shared/dinheiro';
import { prisma } from '../shared/prisma';
import { caixinhasService } from '../modules/caixinhas/caixinhas.service';
import { cartoesService } from '../modules/cartoes/cartoes.service';
import { contaService } from '../modules/conta/conta.service';
import { lancamentosService } from '../modules/lancamentos/lancamentos.service';
import { LancamentoInput } from '../modules/lancamentos/lancamentos.schemas';

const { values: args } = parseArgs({
  options: {
    email: { type: 'string', default: 'demo@trocado.app' },
    senha: { type: 'string', default: 'demonstracao' },
    nome: { type: 'string', default: 'Conta de demonstração' },
    ate: { type: 'string' },
    substituir: { type: 'boolean', default: false },
  },
});

/** Gerador pseudoaleatório com semente (mulberry32). */
function sorteador(semente: number) {
  let a = semente >>> 0;
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const inteiro = (min: number, max: number) => min + Math.floor(proximo() * (max - min + 1));
  return {
    inteiro,
    /** Valor em centavos entre min e max reais, com centavos "de verdade". */
    reais: (min: number, max: number) => inteiro(min * 100, max * 100),
    chance: (p: number) => proximo() < p,
    um: <T>(lista: readonly T[]) => lista[inteiro(0, lista.length - 1)]!,
  };
}

const dia = (competencia: string, d: number) => {
  const { ano, mes } = partesDaCompetencia(competencia);
  return `${competencia}-${String(Math.min(d, diasNoMes(ano, mes))).padStart(2, '0')}`;
};

async function popular() {
  const hojeTexto = hoje();
  const ate = args.ate ?? competenciaDaData(hojeTexto);
  if (!ehCompetenciaValida(ate)) throw new Error(`--ate inválido: ${ate} (use AAAA-MM)`);

  const existente = await prisma.usuario.findUnique({ where: { email: args.email } });
  if (existente) {
    if (!args.substituir) throw new Error(`Já existe a conta ${args.email}. Use --substituir para recriar.`);
    await prisma.$transaction([
      prisma.transferencia.deleteMany({ where: { usuarioId: existente.id } }),
      prisma.lancamento.deleteMany({ where: { usuarioId: existente.id } }),
      prisma.usuario.delete({ where: { id: existente.id } }),
    ]);
  }

  const usuario = await contaService.criarUsuario({ nome: args.nome, email: args.email, senha: args.senha });
  const u = usuario.id;
  const categorias = await prisma.categoria.findMany({ where: { usuarioId: u } });
  const cat = (nome: string) => categorias.find((c) => c.nome === nome)!.id;

  const reserva = (await prisma.caixinha.findFirstOrThrow({ where: { usuarioId: u, padrao: true } })).id;
  const viagem = (await caixinhasService.criar(u, { nome: 'Viagem', metaCentavos: 600_000, cor: '#5fb3d9', padrao: false })).id;
  const carro = (await caixinhasService.criar(u, { nome: 'Carro', metaCentavos: 1_500_000, cor: '#e3c25b', padrao: false })).id;
  await prisma.caixinha.update({ where: { id: reserva }, data: { metaCentavos: 2_400_000 } });

  const nubank = (await cartoesService.criar(u, { nome: 'Nubank', diaFechamento: 3, diaVencimento: 10, cor: '#8a05be' })).id;
  const inter = (await cartoesService.criar(u, { nome: 'Inter', diaFechamento: 25, diaVencimento: 5, cor: '#ff7a00' })).id;

  const s = sorteador(Number(ate.replace('-', '')));
  const meses = intervaloDeCompetencias(somarMeses(ate, -11), ate);
  const pendentes: LancamentoInput[] = [];

  const gasto = (data: string, categoria: string, descricao: string, valorCentavos: number, forma: 'PIX' | 'DEBITO' | 'BOLETO' | 'DINHEIRO' | { cartao: string; parcelas?: number }) =>
    pendentes.push(
      typeof forma === 'string'
        ? { tipo: 'SAIDA', data, categoriaId: cat(categoria), descricao, valorCentavos, formaPagamento: forma, parcelas: 1 }
        : { tipo: 'SAIDA', data, categoriaId: cat(categoria), descricao, valorCentavos, formaPagamento: 'CREDITO', cartaoId: forma.cartao, parcelas: forma.parcelas ?? 1 },
    );
  const entrada = (data: string, categoria: string, descricao: string, valorCentavos: number, caixinhaId?: string, guardar = true) =>
    pendentes.push({
      tipo: 'ENTRADA',
      data,
      categoriaId: cat(categoria),
      descricao,
      valorCentavos,
      formaPagamento: 'PIX',
      guardar: guardar ? { valorCentavos: percentualDe(valorCentavos, usuario.percentualGuardar), caixinhaId } : undefined,
    });

  const COMPRAS_GRANDES: Record<number, [string, number, number]> = {
    2: ['Tênis de corrida', 52_990, 2],
    5: ['Celular novo', 239_900, 10],
    8: ['Fone bluetooth', 29_990, 3],
    10: ['Cadeira de escritório', 89_900, 6],
  };

  meses.forEach((mes, i) => {
    const { mes: numeroDoMes } = partesDaCompetencia(mes);

    entrada(dia(mes, 5), 'Salário', 'Salário', 500_000, reserva);
    if (numeroDoMes === 12) entrada(dia(mes, 18), 'Outras entradas', '13º salário', 500_000, carro);
    const freelas = s.um([0, 1, 1, 1, 2]);
    for (let f = 0; f < freelas; f++) {
      const cliente = s.um(['Site da padaria', 'Landing page', 'Ajuste no e-commerce', 'Sistema de agenda', 'Manutenção mensal']);
      entrada(dia(mes, s.inteiro(8, 27)), 'Freela', cliente, s.reais(500, 2200), i % 2 ? viagem : carro);
    }
    entrada(dia(mes, 28), 'Rendimentos', 'Rendimento da reserva', s.reais(40, 110), undefined, false);

    gasto(dia(mes, 8), 'Moradia', 'Aluguel', 110_000, 'PIX');
    gasto(dia(mes, 12), 'Contas da casa', 'Luz', s.reais(110, 230), 'BOLETO');
    gasto(dia(mes, 15), 'Contas da casa', 'Internet', 9_990, 'DEBITO');
    gasto(dia(mes, 20), 'Contas da casa', 'Água', s.reais(55, 95), 'BOLETO');
    gasto(dia(mes, 18), 'Assinaturas', 'Spotify', 2_190, { cartao: nubank });
    gasto(dia(mes, 22), 'Assinaturas', 'Netflix', 4_490, { cartao: nubank });
    if (i % 3 === 0) gasto(dia(mes, 9), 'Educação', 'Curso online', s.reais(97, 297), { cartao: inter });

    for (let k = s.inteiro(4, 6); k > 0; k--) {
      const mercado = s.um(['Atacadão', 'Assaí', 'Pão de Açúcar', 'Hortifruti', 'Mercadinho']);
      const forma = s.chance(0.5) ? { cartao: inter } : s.um(['DEBITO', 'PIX'] as const);
      gasto(dia(mes, s.inteiro(1, 28)), 'Mercado', mercado, s.reais(60, 380), forma);
    }
    for (let k = s.inteiro(4, 8); k > 0; k--) {
      const lugar = s.um(['iFood', 'Padaria', 'Hamburgueria', 'Japonês', 'Pizzaria', 'Café']);
      gasto(dia(mes, s.inteiro(1, 28)), 'Restaurantes', lugar, s.reais(22, 140), s.chance(0.75) ? { cartao: nubank } : 'PIX');
    }
    for (let k = s.inteiro(6, 12); k > 0; k--) {
      gasto(dia(mes, s.inteiro(1, 28)), 'Transporte', s.um(['Uber', '99', 'Ônibus']), s.reais(8, 45), { cartao: nubank });
    }
    if (s.chance(0.5)) gasto(dia(mes, s.inteiro(1, 28)), 'Transporte', 'Combustível', s.reais(120, 220), 'DEBITO');
    for (let k = s.inteiro(1, 2); k > 0; k--) {
      gasto(dia(mes, s.inteiro(1, 28)), 'Saúde', s.um(['Drogasil', 'Pague Menos', 'Consulta']), s.reais(25, 180), 'PIX');
    }
    for (let k = s.inteiro(1, 3); k > 0; k--) {
      const programa = s.um(['Cinema', 'Show', 'Bar com amigos', 'Ingresso de jogo', 'Livro']);
      gasto(dia(mes, s.inteiro(1, 28)), 'Lazer', programa, s.reais(35, 220), s.chance(0.6) ? { cartao: nubank } : 'PIX');
    }
    if (s.chance(0.6)) gasto(dia(mes, s.inteiro(1, 28)), 'Outros gastos', s.um(['Presente', 'Corte de cabelo', 'Lavanderia']), s.reais(30, 160), 'PIX');

    const compra = COMPRAS_GRANDES[i];
    if (compra) gasto(dia(mes, s.inteiro(4, 20)), 'Compras', compra[0], compra[1], { cartao: s.chance(0.5) ? nubank : inter, parcelas: compra[2] });

    if (i === 6) pendentes.push({ tipo: 'RESGATAR', data: dia(mes, 16), caixinhaId: reserva, valorCentavos: 80_000, descricao: 'Conserto da geladeira' });
  });

  // Mês corrente: só até hoje
  const lancamentos = pendentes.filter((l) => l.data <= hojeTexto).sort((a, b) => a.data.localeCompare(b.data));
  for (const lancamento of lancamentos) await lancamentosService.criar(u, lancamento);

  // Uma arrumação entre caixinhas, como alguém faria na vida real
  const diaDaTransferencia = dia(meses[9]!, 3);
  if (diaDaTransferencia <= hojeTexto) {
    await caixinhasService.transferir(u, { deId: reserva, paraId: viagem, valorCentavos: 50_000, data: diaDaTransferencia, descricao: 'Reforço para a viagem' });
  }

  console.log(`Conta ${args.email} criada com ${lancamentos.length} lançamentos de ${meses[0]} a ${ate}.`);
}

popular()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
