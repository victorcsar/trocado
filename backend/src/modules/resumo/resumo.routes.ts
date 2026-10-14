import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, usuarioDaRequisicao } from '../../shared/middleware/require-auth';
import { competenciaSchema } from '../../shared/schemas';
import { resumoService } from './resumo.service';

export const resumoRoutes = Router();

resumoRoutes.use(requireAuth);

const filtroMesSchema = z.object({ competencia: competenciaSchema });
const filtroSerieSchema = z.object({
  ate: competenciaSchema,
  quantidade: z.coerce.number().int().min(1).max(36).default(12),
});

resumoRoutes.get('/mes', async (req, res) => {
  const { competencia } = filtroMesSchema.parse(req.query);
  res.json(await resumoService.doMes(usuarioDaRequisicao(req), competencia));
});

resumoRoutes.get('/serie', async (req, res) => {
  const { ate, quantidade } = filtroSerieSchema.parse(req.query);
  res.json({ meses: await resumoService.serie(usuarioDaRequisicao(req), ate, quantidade) });
});
