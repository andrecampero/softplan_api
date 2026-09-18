export const TENANT_ID_FORMATO = /^[a-z0-9-]{3,50}$/;

/** Tenant já validado; só existe depois de passar pelo tenant.plugin. */
export interface TenantContext {
  id: string;
}
