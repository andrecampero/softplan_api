import type { FastifyRequest } from 'fastify';
import type { UsuarioAutenticado } from '../../domain/auth/usuario-autenticado.js';
import type { TenantContext } from '../../domain/tenant/tenant.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Preenchido pelo tenant.plugin antes de qualquer handler. */
    tenant: TenantContext | null;
    /** Preenchido pelo auth.plugin nas rotas protegidas. */
    usuario: UsuarioAutenticado | null;
  }

  interface FastifyContextConfig {
    /** Rota que não exige token (o tenant continua obrigatório). Padrão: protegida. */
    publica?: boolean;
  }
}

/** Tenant validado. Só chame em rotas da API (após o tenant.plugin). */
export function tenantDa(request: FastifyRequest): TenantContext {
  if (!request.tenant) throw new Error('tenant.plugin não executou antes desta rota');
  return request.tenant;
}

/** Usuário autenticado. Só chame em rotas protegidas (após o auth.plugin). */
export function usuarioDa(request: FastifyRequest): UsuarioAutenticado {
  if (!request.usuario) throw new Error('auth.plugin não executou antes desta rota');
  return request.usuario;
}
