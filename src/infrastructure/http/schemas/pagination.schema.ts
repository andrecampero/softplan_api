import { z } from 'zod';
import { PAGINACAO } from '../../../domain/shared/pagination.js';

export const paginacaoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINACAO.pagePadrao).describe('Página (começa em 1)'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINACAO.limitMaximo)
    .default(PAGINACAO.limitPadrao)
    .describe(`Itens por página (1 a ${PAGINACAO.limitMaximo})`),
});

export function paginaDeSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    total: z.number().int().describe('Total de itens considerando os filtros'),
    page: z.number().int().describe('Página retornada'),
  });
}
