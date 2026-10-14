import { Router } from 'express';
import { requireAuth, usuarioDaRequisicao } from '../../shared/middleware/require-auth';
import { validarBody } from '../../shared/middleware/validate';
import { caixinhasService } from './caixinhas.service';
import { atualizarCaixinhaSchema, criarCaixinhaSchema, transferirSchema } from './caixinhas.schemas';

export const caixinhasRoutes = Router();

caixinhasRoutes.use(requireAuth);

caixinhasRoutes.get('/', async (req, res) => {
  res.json({ caixinhas: await caixinhasService.listar(usuarioDaRequisicao(req)) });
});

caixinhasRoutes.post('/', validarBody(criarCaixinhaSchema), async (req, res) => {
  res.status(201).json({ caixinha: await caixinhasService.criar(usuarioDaRequisicao(req), req.body) });
});

// Rotas fixas antes das com :id
caixinhasRoutes.post('/transferencias', validarBody(transferirSchema), async (req, res) => {
  res.status(201).json({ transferencia: await caixinhasService.transferir(usuarioDaRequisicao(req), req.body) });
});

caixinhasRoutes.delete('/transferencias/:id', async (req, res) => {
  await caixinhasService.excluirTransferencia(usuarioDaRequisicao(req), req.params.id);
  res.status(204).end();
});

caixinhasRoutes.put('/:id', validarBody(atualizarCaixinhaSchema), async (req, res) => {
  res.json({ caixinha: await caixinhasService.atualizar(usuarioDaRequisicao(req), req.params.id, req.body) });
});

caixinhasRoutes.delete('/:id', async (req, res) => {
  await caixinhasService.excluir(usuarioDaRequisicao(req), req.params.id);
  res.status(204).end();
});

caixinhasRoutes.get('/:id/movimentos', async (req, res) => {
  res.json(await caixinhasService.movimentos(usuarioDaRequisicao(req), req.params.id));
});
