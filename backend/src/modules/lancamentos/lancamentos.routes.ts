import { Router } from 'express';
import { requireAuth, usuarioDaRequisicao } from '../../shared/middleware/require-auth';
import { validarBody } from '../../shared/middleware/validate';
import { lancamentosService } from './lancamentos.service';
import { filtroLancamentosSchema, lancamentoSchema } from './lancamentos.schemas';

export const lancamentosRoutes = Router();

lancamentosRoutes.use(requireAuth);

lancamentosRoutes.get('/', async (req, res) => {
  const { competencia } = filtroLancamentosSchema.parse(req.query);
  res.json(await lancamentosService.listarDoMes(usuarioDaRequisicao(req), competencia));
});

lancamentosRoutes.get('/:id', async (req, res) => {
  res.json(await lancamentosService.buscar(usuarioDaRequisicao(req), req.params.id));
});

lancamentosRoutes.post('/', validarBody(lancamentoSchema), async (req, res) => {
  res.status(201).json({ lancamentos: await lancamentosService.criar(usuarioDaRequisicao(req), req.body) });
});

lancamentosRoutes.put('/:id', validarBody(lancamentoSchema), async (req, res) => {
  res.json({ lancamentos: await lancamentosService.atualizar(usuarioDaRequisicao(req), req.params.id, req.body) });
});

lancamentosRoutes.delete('/:id', async (req, res) => {
  await lancamentosService.excluir(usuarioDaRequisicao(req), req.params.id);
  res.status(204).end();
});
