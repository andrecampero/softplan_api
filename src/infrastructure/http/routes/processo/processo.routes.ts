import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ListarProcessosService } from '../../../../application/processo/listar-processos.service.js';
import { tenantDa } from '../../request-context.js';
import { listarProcessosSchema } from './processo.schema.js';

export interface ProcessoRoutesOptions {
  listarProcessosService: Pick<ListarProcessosService, 'execute'>;
}

/** Rotas sem regra de negócio: entrada validada → Service → resposta. */
export const processoRoutes: FastifyPluginAsyncZod<ProcessoRoutesOptions> = async (app, { listarProcessosService }) => {
  app.get('/processos', { schema: listarProcessosSchema }, async (request) =>
    listarProcessosService.execute({ tenantId: tenantDa(request).id, ...request.query }),
  );
};
