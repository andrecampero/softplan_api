/** PORT */
export interface TenantRepository {
  existe(tenantId: string): Promise<boolean>;
}
