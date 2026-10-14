import { Router } from 'express';
import { requireAuth, usuarioDaRequisicao } from '../../shared/middleware/require-auth';
import { validarBody } from '../../shared/middleware/validate';
import { cartoesService } from './cartoes.service';
import { atualizarCartaoSchema, criarCartaoSchema, filtroFaturaSchema } from './cartoes.schemas';

export const cartoesRoutes = Router();

cartoesRoutes.use(requireAuth);

cartoesRoutes.get('/', async (req, res) => {
  res.json({ cartoes: await cartoesService.listar(usuarioDaRequisicao(req)) });
});

cartoesRoutes.post('/', validarBody(criarCartaoSchema), async (req, res) => {
  res.status(201).json({ cartao: await cartoesService.criar(usuarioDaRequisicao(req), req.body) });
});

cartoesRoutes.put('/:id', validarBody(atualizarCartaoSchema), async (req, res) => {
  res.json({ cartao: await cartoesService.atualizar(usuarioDaRequisicao(req), req.params.id, req.body) });
});

cartoesRoutes.delete('/:id', async (req, res) => {
  await cartoesService.excluir(usuarioDaRequisicao(req), req.params.id);
  res.status(204).end();
});

cartoesRoutes.get('/:id/fatura', async (req, res) => {
  const { competencia } = filtroFaturaSchema.parse(req.query);
  res.json(await cartoesService.fatura(usuarioDaRequisicao(req), req.params.id, competencia));
});
