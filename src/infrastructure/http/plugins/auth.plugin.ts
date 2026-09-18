import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TokenService } from '../../../domain/auth/token-service.js';
import { ForbiddenError, UnauthorizedError } from '../../../domain/shared/errors.js';
import { tenantDa } from '../request-context.js';

/**
 * Hook onRequest (depois do tenant): exige Bearer token em toda rota que não
 * declare `config: { publica: true }` (CLAUDE.md, seção 4.2).
 */
export function criarAutenticacao(tokenService: TokenService) {
  return async function autenticar(request: FastifyRequest): Promise<void> {
    if (request.routeOptions.config.publica) return;

    const [esquema, token] = (request.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !token) throw new UnauthorizedError('TOKEN_AUSENTE');

    const claims = await tokenService.verificar(token);
    if (claims.tenantId !== tenantDa(request).id) throw new ForbiddenError('TENANT_TOKEN_DIVERGENTE');

    request.usuario = { id: claims.sub, tenantId: claims.tenantId, perfil: claims.perfil };
  };
}

/** Hook onSend: nada da API pode ficar em cache de navegador ou proxy (seção 4.5). */
export async function semCache(_request: FastifyRequest, reply: FastifyReply, payload: unknown): Promise<unknown> {
  reply.header('cache-control', 'no-store').header('pragma', 'no-cache');
  return payload;
}
