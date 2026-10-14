import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../shared/config/env';
import { validarBody } from '../../shared/middleware/validate';
import {
  criarSessao,
  encerrarSessao,
  requireAuth,
  usuarioDaRequisicao,
} from '../../shared/middleware/require-auth';
import { contaService } from './conta.service';
import { atualizarContaSchema, entrarSchema, trocarSenhaSchema } from './conta.schemas';

const limiteDeLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { erro: 'Muitas tentativas de login. Espere alguns minutos.' },
});

// ---------- Sessão ----------

export const authRoutes = Router();

authRoutes.post('/entrar', limiteDeLogin, validarBody(entrarSchema), async (req, res) => {
  const usuario = await contaService.autenticar(req.body.email, req.body.senha);
  criarSessao(res, usuario.id);
  res.json({ usuario });
});

authRoutes.post('/sair', (_req, res) => {
  encerrarSessao(res);
  res.status(204).end();
});

// Usado pela tela de entrada: na instância de demonstração ela mostra o login de exemplo
authRoutes.get('/modo', (_req, res) => {
  res.json({ demo: env.DEMO });
});

// ---------- Conta ----------

export const contaRoutes = Router();

contaRoutes.use(requireAuth);

contaRoutes.get('/', async (req, res) => {
  res.json({ usuario: await contaService.buscar(usuarioDaRequisicao(req)) });
});

contaRoutes.put('/', validarBody(atualizarContaSchema), async (req, res) => {
  res.json({ usuario: await contaService.atualizar(usuarioDaRequisicao(req), req.body) });
});

contaRoutes.put('/senha', validarBody(trocarSenhaSchema), async (req, res) => {
  await contaService.trocarSenha(usuarioDaRequisicao(req), req.body);
  res.status(204).end();
});
