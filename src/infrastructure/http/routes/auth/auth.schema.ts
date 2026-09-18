import { z } from 'zod';
import { errorResponseSchema } from '../../schemas/error.schema.js';

export const tokenBodySchema = z.object({
  email: z.email().max(254).describe('E-mail do usuário no órgão'),
  senha: z.string().min(1).max(128),
});

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().describe('Validade do token em segundos (3600 = 1 hora)'),
});

export const obterTokenSchema = {
  tags: ['Autenticação'],
  summary: 'Troca e-mail e senha por um token de acesso (válido por 1 hora)',
  security: [{ tenantId: [] }],
  body: tokenBodySchema,
  response: {
    200: tokenResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    429: errorResponseSchema,
    500: errorResponseSchema,
  },
};
