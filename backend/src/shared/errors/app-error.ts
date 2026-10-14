export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
    readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NaoEncontradoError extends AppError {
  constructor(recurso: string) {
    super(`${recurso} não encontrado(a)`, 404);
  }
}

export class NaoAutenticadoError extends AppError {
  constructor(message = 'Faça login para continuar') {
    super(message, 401);
  }
}

export class ConflitoError extends AppError {
  constructor(message: string, detalhes?: unknown) {
    super(message, 409, detalhes);
  }
}

/** O pedido é válido no formato, mas quebra uma regra (ex.: resgatar mais do que a caixinha tem). */
export class RegraError extends AppError {
  constructor(message: string, detalhes?: unknown) {
    super(message, 422, detalhes);
  }
}
