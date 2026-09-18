export const ERROR_CODES = [
  'TENANT_ID_OBRIGATORIO',
  'TENANT_ID_INVALIDO',
  'REQUISICAO_INVALIDA',
  'CREDENCIAIS_INVALIDAS',
  'TOKEN_AUSENTE',
  'TOKEN_INVALIDO',
  'TOKEN_EXPIRADO',
  'TENANT_NAO_AUTORIZADO',
  'TENANT_TOKEN_DIVERGENTE',
  'RECURSO_NAO_ENCONTRADO',
  'ROTA_NAO_ENCONTRADA',
  'RATE_LIMIT_EXCEDIDO',
  'ERRO_INTERNO',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorDetail {
  campo: string;
  mensagem: string;
}

export type RateLimitContexto = 'api' | 'login';

export interface AppErrorOptions {
  details?: ErrorDetail[];
  retryAfterSeconds?: number;
  rateLimitContexto?: RateLimitContexto;
  registrarLog?: boolean;
  /** Campos extras só para o log (nunca vão para a resposta). */
  logContexto?: Record<string, string>;
  cause?: unknown;
}

/**
 * Erro de negócio/segurança conhecido. O texto exibido ao cliente vem sempre do
 * catálogo de mensagens da camada HTTP, a partir do `code`.
 */
export class AppError extends Error {
  readonly details?: ErrorDetail[];
  readonly retryAfterSeconds?: number;
  readonly rateLimitContexto?: RateLimitContexto;
  readonly registrarLog: boolean;
  readonly logContexto?: Record<string, string>;

  constructor(
    readonly code: ErrorCode,
    options: AppErrorOptions = {},
  ) {
    super(code, { cause: options.cause });
    this.name = new.target.name;
    this.details = options.details;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.rateLimitContexto = options.rateLimitContexto;
    this.registrarLog = options.registrarLog ?? true;
    this.logContexto = options.logContexto;
  }
}

export class ValidationError extends AppError {}
export class UnauthorizedError extends AppError {}
export class ForbiddenError extends AppError {}
export class NotFoundError extends AppError {}
export class RateLimitError extends AppError {}
