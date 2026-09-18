import { z } from 'zod';
import { ERROR_CODES } from '../../../domain/shared/errors.js';

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: z.enum(ERROR_CODES),
      message: z.string().describe('Mensagem amigável em pt-BR, pronta para exibir ao usuário'),
      requestId: z.string().describe('Identificador para rastrear o erro no log'),
      details: z.array(z.object({ campo: z.string(), mensagem: z.string() })).optional(),
      retryAfterSeconds: z.number().int().optional(),
    }),
  })
  .describe('Erro padrão da API');

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/** Respostas de erro comuns às rotas protegidas, para documentação OpenAPI. */
export const respostasDeErroProtegidas = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  429: errorResponseSchema,
  500: errorResponseSchema,
} as const;
