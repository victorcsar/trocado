import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, rotaNaoEncontrada } from './shared/middleware/error-handler';
import { authRoutes, contaRoutes } from './modules/conta/conta.routes';
import { categoriasRoutes } from './modules/categorias/categorias.routes';
import { cartoesRoutes } from './modules/cartoes/cartoes.routes';
import { caixinhasRoutes } from './modules/caixinhas/caixinhas.routes';
import { lancamentosRoutes } from './modules/lancamentos/lancamentos.routes';
import { resumoRoutes } from './modules/resumo/resumo.routes';

export function criarApp() {
  const app = express();

  // Atrás do nginx: o IP real (para o limite de tentativas de login) vem do proxy
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/saude', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/conta', contaRoutes);
  app.use('/api/categorias', categoriasRoutes);
  app.use('/api/cartoes', cartoesRoutes);
  app.use('/api/caixinhas', caixinhasRoutes);
  app.use('/api/lancamentos', lancamentosRoutes);
  app.use('/api/resumo', resumoRoutes);

  app.use('/api', rotaNaoEncontrada);
  app.use(errorHandler);

  return app;
}
