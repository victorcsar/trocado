import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from '../src/app';
import { contaService } from '../src/modules/conta/conta.service';

const app = criarApp();
const SENHA = 'senha-de-teste-123';
let sequencia = 0;

/** Conta nova com sessão aberta, para cada bloco de testes não depender dos outros. */
async function novaConta() {
  const email = `teste${++sequencia}-${Date.now()}@exemplo.com`;
  await contaService.criarUsuario({ nome: 'Teste', email, senha: SENHA });
  const agente = request.agent(app);
  await agente.post('/api/auth/entrar').send({ email, senha: SENHA }).expect(200);
  const { body } = await agente.get('/api/categorias').expect(200);
  const categoria = (nome: string) => body.categorias.find((c: { nome: string }) => c.nome === nome).id as string;
  const caixinhas = (await agente.get('/api/caixinhas').expect(200)).body.caixinhas;
  return { agente, email, categoria, reservaId: caixinhas[0].id as string };
}

describe('sessão', () => {
  it('bloqueia quem não fez login', async () => {
    await request(app).get('/api/lancamentos?competencia=2026-10').expect(401);
  });

  it('recusa senha errada sem dizer se o e-mail existe', async () => {
    const { email } = await novaConta();
    const errada = await request(app).post('/api/auth/entrar').send({ email, senha: 'errada' }).expect(401);
    const inexistente = await request(app).post('/api/auth/entrar').send({ email: 'ninguem@x.com', senha: 'x' }).expect(401);
    expect(errada.body.erro).toBe(inexistente.body.erro);
  });

  it('conta nova já vem com categorias e a caixinha padrão', async () => {
    const { agente } = await novaConta();
    const { body } = await agente.get('/api/caixinhas').expect(200);
    expect(body.caixinhas).toHaveLength(1);
    expect(body.caixinhas[0]).toMatchObject({ nome: 'Reserva de emergência', padrao: true, saldoCentavos: 0 });
  });
});

describe('mês com entrada, guardado, gasto e cartão', () => {
  let conta: Awaited<ReturnType<typeof novaConta>>;
  let entradaId: string;
  let cartaoId: string;

  beforeAll(async () => {
    conta = await novaConta();
  });

  it('entrada com valor guardado vai para a caixinha padrão', async () => {
    const { body } = await conta.agente
      .post('/api/lancamentos')
      .send({
        tipo: 'ENTRADA',
        valorCentavos: 500_000,
        data: '2026-10-05',
        descricao: 'Salário',
        categoriaId: conta.categoria('Salário'),
        guardar: { valorCentavos: 100_000 },
      })
      .expect(201);
    expect(body.lancamentos).toHaveLength(2);
    const [entrada, guardado] = body.lancamentos;
    entradaId = entrada.id;
    expect(guardado).toMatchObject({ tipo: 'GUARDAR', valorCentavos: 100_000, origemId: entrada.id, competencia: '2026-10' });
    expect(guardado.caixinha.id).toBe(conta.reservaId);
  });

  it('gasto no Pix conta no mês da data', async () => {
    await conta.agente
      .post('/api/lancamentos')
      .send({
        tipo: 'SAIDA',
        valorCentavos: 31_240,
        data: '2026-10-14',
        descricao: 'Atacadão',
        categoriaId: conta.categoria('Mercado'),
        formaPagamento: 'PIX',
      })
      .expect(201);
  });

  it('compra parcelada cai uma parcela em cada fatura', async () => {
    const cartao = await conta.agente
      .post('/api/cartoes')
      .send({ nome: 'Nubank', diaFechamento: 3, diaVencimento: 10, cor: '#8A05BE' })
      .expect(201);
    cartaoId = cartao.body.cartao.id;

    const { body } = await conta.agente
      .post('/api/lancamentos')
      .send({
        tipo: 'SAIDA',
        valorCentavos: 10_000,
        data: '2026-10-05',
        descricao: 'Fone',
        categoriaId: conta.categoria('Compras'),
        formaPagamento: 'CREDITO',
        cartaoId,
        parcelas: 3,
      })
      .expect(201);
    expect(body.lancamentos.map((l: { competencia: string; valorCentavos: number }) => [l.competencia, l.valorCentavos])).toEqual([
      ['2026-11', 3_334],
      ['2026-12', 3_333],
      ['2027-01', 3_333],
    ]);
  });

  it('o mês mostra a fatura agrupada, com vencimento', async () => {
    const outubro = await conta.agente.get('/api/lancamentos?competencia=2026-10').expect(200);
    expect(outubro.body.faturas).toEqual([]);
    expect(outubro.body.lancamentos).toHaveLength(3);

    const novembro = await conta.agente.get('/api/lancamentos?competencia=2026-11').expect(200);
    expect(novembro.body.faturas).toHaveLength(1);
    expect(novembro.body.faturas[0]).toMatchObject({ vencimento: '2026-11-10', totalCentavos: 3_334 });
  });

  it('resumo: guardado sai do disponível sem virar gasto', async () => {
    const { body } = await conta.agente.get('/api/resumo/mes?competencia=2026-10').expect(200);
    expect(body.totais).toEqual({
      entrouCentavos: 500_000,
      saiuCentavos: 31_240,
      guardadoCentavos: 100_000,
      resgatadoCentavos: 0,
      sobrouCentavos: 500_000 - 100_000 - 31_240,
    });
    expect(body.taxaDePoupanca).toBe(20);
    expect(body.gastosPorCategoria).toHaveLength(1);
    expect(body.proximasFaturas[0]).toMatchObject({ totalCentavos: 3_334, quantidade: 1 });
    expect(body.parcelasFuturasCentavos).toBe(10_000);
  });

  it('não deixa resgatar mais do que a caixinha tem', async () => {
    const pedido = { tipo: 'RESGATAR', valorCentavos: 150_000, data: '2026-10-20', caixinhaId: conta.reservaId };
    const { body } = await conta.agente.post('/api/lancamentos').send(pedido).expect(422);
    expect(body.erro).toContain('Reserva de emergência');

    await conta.agente.post('/api/lancamentos').send({ ...pedido, valorCentavos: 40_000 }).expect(201);
    const caixinhas = await conta.agente.get('/api/caixinhas').expect(200);
    expect(caixinhas.body.caixinhas[0].saldoCentavos).toBe(60_000);
  });

  it('tirar o guardado de uma entrada não pode deixar a caixinha negativa', async () => {
    const entrada = {
      tipo: 'ENTRADA',
      valorCentavos: 500_000,
      data: '2026-10-05',
      descricao: 'Salário',
      categoriaId: conta.categoria('Salário'),
    };
    // Já foram resgatados 400,00 dos 1.000,00: sem o guardado, a reserva ficaria em −400,00
    await conta.agente.put(`/api/lancamentos/${entradaId}`).send(entrada).expect(422);

    const { body } = await conta.agente
      .put(`/api/lancamentos/${entradaId}`)
      .send({ ...entrada, valorCentavos: 600_000, guardar: { valorCentavos: 120_000 } })
      .expect(200);
    expect(body.lancamentos.map((l: { id: string }) => l.id)).toContain(entradaId);
    const caixinhas = await conta.agente.get('/api/caixinhas').expect(200);
    expect(caixinhas.body.caixinhas[0].saldoCentavos).toBe(80_000);
  });

  it('editar a compra refaz as parcelas e excluir apaga todas', async () => {
    const novembro = await conta.agente.get('/api/lancamentos?competencia=2026-11').expect(200);
    const parcelaId = novembro.body.faturas[0].itens[0].id;

    const { body } = await conta.agente
      .put(`/api/lancamentos/${parcelaId}`)
      .send({
        tipo: 'SAIDA',
        valorCentavos: 10_000,
        data: '2026-10-05',
        descricao: 'Fone',
        categoriaId: conta.categoria('Compras'),
        formaPagamento: 'CREDITO',
        cartaoId,
        parcelas: 2,
      })
      .expect(200);
    expect(body.lancamentos).toHaveLength(2);

    await conta.agente.delete(`/api/lancamentos/${body.lancamentos[1].id}`).expect(204);
    const resumo = await conta.agente.get('/api/resumo/mes?competencia=2026-10').expect(200);
    expect(resumo.body.parcelasFuturasCentavos).toBe(0);
  });

  it('transfere entre caixinhas sem mexer no mês', async () => {
    const viagem = await conta.agente.post('/api/caixinhas').send({ nome: 'Viagem', cor: '#5fb3d9', metaCentavos: 600_000 }).expect(201);
    const transferir = { deId: conta.reservaId, paraId: viagem.body.caixinha.id, data: '2026-10-21' };
    await conta.agente.post('/api/caixinhas/transferencias').send({ ...transferir, valorCentavos: 999_999 }).expect(422);
    await conta.agente.post('/api/caixinhas/transferencias').send({ ...transferir, valorCentavos: 30_000 }).expect(201);

    const { body } = await conta.agente.get('/api/caixinhas').expect(200);
    const saldo = (nome: string) => body.caixinhas.find((c: { nome: string }) => c.nome === nome).saldoCentavos;
    expect(saldo('Reserva de emergência')).toBe(50_000);
    expect(saldo('Viagem')).toBe(30_000);

    const resumo = await conta.agente.get('/api/resumo/mes?competencia=2026-10').expect(200);
    expect(resumo.body.totais.guardadoCentavos).toBe(120_000);
  });
});

describe('regras de validação', () => {
  it('pede o cartão quando a forma é crédito', async () => {
    const { agente, categoria } = await novaConta();
    const { body } = await agente
      .post('/api/lancamentos')
      .send({ tipo: 'SAIDA', valorCentavos: 1_000, data: '2026-10-01', categoriaId: categoria('Lazer'), formaPagamento: 'CREDITO' })
      .expect(400);
    expect(body.detalhes.cartaoId).toEqual(['Escolha o cartão']);
  });

  it('não aceita categoria de gasto numa entrada', async () => {
    const { agente, categoria } = await novaConta();
    await agente
      .post('/api/lancamentos')
      .send({ tipo: 'ENTRADA', valorCentavos: 1_000, data: '2026-10-01', categoriaId: categoria('Lazer') })
      .expect(422);
  });

  it('categoria usada não pode ser excluída, só desativada', async () => {
    const { agente, categoria } = await novaConta();
    await agente
      .post('/api/lancamentos')
      .send({ tipo: 'SAIDA', valorCentavos: 1_000, data: '2026-10-01', categoriaId: categoria('Lazer'), formaPagamento: 'PIX' })
      .expect(201);
    await agente.delete(`/api/categorias/${categoria('Lazer')}`).expect(409);
    await agente.put(`/api/categorias/${categoria('Lazer')}`).send({ ativa: false }).expect(200);
  });

  it('uma conta não enxerga nem usa os dados de outra', async () => {
    const dono = await novaConta();
    const outro = await novaConta();
    const { body } = await dono.agente
      .post('/api/lancamentos')
      .send({ tipo: 'SAIDA', valorCentavos: 1_000, data: '2026-10-01', categoriaId: dono.categoria('Lazer'), formaPagamento: 'PIX' })
      .expect(201);

    await outro.agente.get(`/api/lancamentos/${body.lancamentos[0].id}`).expect(404);
    await outro.agente.delete(`/api/lancamentos/${body.lancamentos[0].id}`).expect(404);
    await outro.agente
      .post('/api/lancamentos')
      .send({ tipo: 'SAIDA', valorCentavos: 1_000, data: '2026-10-01', categoriaId: dono.categoria('Lazer'), formaPagamento: 'PIX' })
      .expect(404);
    const lista = await outro.agente.get('/api/lancamentos?competencia=2026-10').expect(200);
    expect(lista.body.lancamentos).toEqual([]);
  });
});
