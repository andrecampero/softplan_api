import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AutenticarUsuarioService } from '../../../../application/auth/autenticar-usuario.service.js';
import type { Limitador } from '../../plugins/rate-limit.plugin.js';
import { tenantDa } from '../../request-context.js';
import { obterTokenSchema } from './auth.schema.js';

export interface AuthRoutesOptions {
  autenticarUsuarioService: Pick<AutenticarUsuarioService, 'execute'>;
  limitarLoginPorOrigem: Limitador;
  limitarLoginPorConta: Limitador;
}

export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, opcoes) => {
  const { autenticarUsuarioService, limitarLoginPorOrigem, limitarLoginPorConta } = opcoes;

  app.post(
    '/auth/token',
    {
      schema: obterTokenSchema,
      config: { publica: true },
      onRequest: limitarLoginPorOrigem,
      preHandler: limitarLoginPorConta,
    },
    async (request) => autenticarUsuarioService.execute({ tenantId: tenantDa(request).id, ...request.body }),
  );
};
