import type { TenantRepository } from '../../../domain/tenant/tenant.repository.js';
import type { InMemoryDatabaseRegistry } from './in-memory-database.registry.js';

export class InMemoryTenantRepository implements TenantRepository {
  constructor(private readonly registry: InMemoryDatabaseRegistry) {}

  async existe(tenantId: string): Promise<boolean> {
    return this.registry.existe(tenantId);
  }
}
