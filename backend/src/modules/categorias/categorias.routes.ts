import { Router } from 'express';
import { requireAuth, usuarioDaRequisicao } from '../../shared/middleware/require-auth';
import { validarBody } from '../../shared/middleware/validate';
import { categoriasService } from './categorias.service';
import { atualizarCategoriaSchema, criarCategoriaSchema } from './categorias.schemas';

export const categoriasRoutes = Router();

categoriasRoutes.use(requireAuth);

categoriasRoutes.get('/', async (req, res) => {
  res.json({ categorias: await categoriasService.listar(usuarioDaRequisicao(req)) });
});

categoriasRoutes.post('/', validarBody(criarCategoriaSchema), async (req, res) => {
  res.status(201).json({ categoria: await categoriasService.criar(usuarioDaRequisicao(req), req.body) });
});

categoriasRoutes.put('/:id', validarBody(atualizarCategoriaSchema), async (req, res) => {
  res.json({ categoria: await categoriasService.atualizar(usuarioDaRequisicao(req), req.params.id, req.body) });
});

categoriasRoutes.delete('/:id', async (req, res) => {
  await categoriasService.excluir(usuarioDaRequisicao(req), req.params.id);
  res.status(204).end();
});
