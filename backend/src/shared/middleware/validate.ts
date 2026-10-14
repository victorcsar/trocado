import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

/**
 * Valida e normaliza o corpo da requisição com zod.
 * Em caso de erro, o ZodError é capturado pelo errorHandler (HTTP 400).
 *
 * Os generics do Request ficam como `any` de propósito: um middleware com os
 * defaults do Express 5 degrada a inferência de req.params dos handlers da
 * mesma rota para `string | string[]`.
 */
export function validarBody(schema: z.ZodType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req: Request<any, any, any, any>, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
