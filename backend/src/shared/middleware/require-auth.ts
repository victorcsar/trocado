import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { NaoAutenticadoError } from '../errors/app-error';
import { prisma } from '../prisma';

export const COOKIE_SESSAO = 'trocado_sessao';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuarioId?: string;
    }
  }
}

export function criarSessao(res: Response, usuarioId: string): void {
  const token = jwt.sign({ sub: usuarioId }, env.JWT_SECRET, { expiresIn: `${env.SESSAO_DIAS}d` });
  res.cookie(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/api',
    maxAge: env.SESSAO_DIAS * 24 * 60 * 60 * 1000,
  });
}

export function encerrarSessao(res: Response): void {
  res.clearCookie(COOKIE_SESSAO, { httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE, path: '/api' });
}

/** Exige sessão válida de um usuário que ainda existe. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[COOKIE_SESSAO];
  if (typeof token !== 'string') throw new NaoAutenticadoError();

  let usuarioId: string;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('sem sub');
    usuarioId = payload.sub;
  } catch {
    throw new NaoAutenticadoError('Sessão expirada. Faça login de novo.');
  }

  const existe = await prisma.usuario.count({ where: { id: usuarioId } });
  if (!existe) throw new NaoAutenticadoError();

  req.usuarioId = usuarioId;
  next();
}

export function usuarioDaRequisicao(req: Request): string {
  if (!req.usuarioId) throw new NaoAutenticadoError();
  return req.usuarioId;
}
