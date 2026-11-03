import type { ValidationProblem } from '@fms/shared';

export const PROBLEM_TYPES = {
  validation: 'https://fms.local/errors/validation',
  notFound: 'https://fms.local/errors/not-found',
  unauthorized: 'https://fms.local/errors/unauthorized',
  forbidden: 'https://fms.local/errors/forbidden',
  unavailable: 'https://fms.local/errors/unavailable',
} as const;

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: ValidationProblem[];
}

export class FmsError extends Error {
  readonly status: number;
  readonly type: string;
  readonly errors?: ValidationProblem[];

  constructor(status: number, type: string, message: string, errors?: ValidationProblem[]) {
    super(message);
    this.name = 'FmsError';
    this.status = status;
    this.type = type;
    this.errors = errors;
  }
}

export function validationError(detail: string, errors: ValidationProblem[]): FmsError {
  return new FmsError(400, PROBLEM_TYPES.validation, detail, errors);
}

export function notFoundError(detail = 'Resource not found'): FmsError {
  return new FmsError(404, PROBLEM_TYPES.notFound, detail);
}

export function unauthorizedError(detail = 'Missing or invalid credential'): FmsError {
  return new FmsError(401, PROBLEM_TYPES.unauthorized, detail);
}

export function forbiddenError(detail = 'Insufficient capability'): FmsError {
  return new FmsError(403, PROBLEM_TYPES.forbidden, detail);
}

export function unavailableError(detail = 'Dependency unavailable'): FmsError {
  return new FmsError(503, PROBLEM_TYPES.unavailable, detail);
}

const TITLES: Record<number, string> = {
  400: 'Invalid Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  503: 'Unavailable',
};

export function problemBody(error: FmsError): ProblemDetails {
  return {
    type: error.type,
    title: TITLES[error.status] ?? 'Error',
    status: error.status,
    detail: error.message,
    ...(error.errors ? { errors: error.errors } : {}),
  };
}
