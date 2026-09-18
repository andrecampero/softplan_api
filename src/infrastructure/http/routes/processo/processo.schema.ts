import { z } from 'zod';
import { PROCESSO_STATUS } from '../../../../domain/processo/processo.entity.js';
import { respostasDeErroProtegidas } from '../../schemas/error.schema.js';
import { paginacaoQuerySchema, paginaDeSchema } from '../../schemas/pagination.schema.js';

export const processoSchema = z.object({
  id: z.string().describe('Identificador único (UUID)'),
  numero: z.string().describe('Número do processo'),
  titulo: z.string(),
  status: z.enum(PROCESSO_STATUS),
  criadoEm: z.string().describe('Data de criação em ISO 8601 (UTC)'),
});

export const listarProcessosQuerySchema = paginacaoQuerySchema.extend({
  status: z.enum(PROCESSO_STATUS).optional().describe('Filtra pelo status do processo'),
});

export const listarProcessosSchema = {
  tags: ['Processos'],
  summary: 'Lista os processos do órgão (tenant) autenticado',
  security: [{ tenantId: [], bearerAuth: [] }],
  querystring: listarProcessosQuerySchema,
  response: { 200: paginaDeSchema(processoSchema), ...respostasDeErroProtegidas },
};
