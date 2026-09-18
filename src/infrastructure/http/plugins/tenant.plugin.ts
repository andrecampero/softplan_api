import type { FastifyRequest } from 'fastify';
import { ForbiddenError, ValidationError } from '../../../domain/shared/errors.js';
import { TENANT_ID_FORMATO } from '../../../domain/tenant/tenant.js';
import type { TenantRepository } from '../../../domain/tenant/tenant.repository.js';

export const TENANT_HEADER = 'x-tenant-id';

/** Hook onRequest: valida o x-tenant-id antes de qualquer lógica (CLAUDE.md, seção 4.1). */
export function criarValidacaoDeTenant(tenantRepository: TenantRepository) {
  return async function validarTenant(request: FastifyRequest): Promise<void> {
    const valor = request.headers[TENANT_HEADER];
    const tenantId = (Array.isArray(valor) ? valor[0] : valor)?.trim();

    if (!tenantId) throw new ValidationError('TENANT_ID_OBRIGATORIO');
    if (!TENANT_ID_FORMATO.test(tenantId)) throw new ValidationError('TENANT_ID_INVALIDO');
    if (!(await tenantRepository.existe(tenantId))) throw new ForbiddenError('TENANT_NAO_AUTORIZADO');

    request.tenant = { id: tenantId };
  };
}
