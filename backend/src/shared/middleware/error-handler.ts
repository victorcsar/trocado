import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { env } from '../config/env';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ erro: err.message, detalhes: err.detalhes });
    return;
  }

  if (err instanceof ZodError) {
    const { formErrors, fieldErrors } = z.flattenError(err);
    res.status(400).json({ erro: formErrors[0] ?? 'Dados inválidos', detalhes: fieldErrors });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ erro: 'Já existe um registro com esse nome' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ erro: 'Registro não encontrado' });
      return;
    }
  }

  // JSON malformado no corpo da requisição
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ erro: 'JSON inválido' });
    return;
  }

  console.error('Erro não tratado:', err);
  res.status(500).json({
    erro: 'Erro interno do servidor',
    ...(env.NODE_ENV !== 'production' && err instanceof Error ? { detalhes: err.message } : {}),
  });
}

export function rotaNaoEncontrada(_req: Request, res: Response): void {
  res.status(404).json({ erro: 'Rota não encontrada' });
}
