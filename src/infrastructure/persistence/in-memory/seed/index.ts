import type { TenantSeed } from '../tenant-database.js';
import { processosSeed as govScProcessos } from './tenants/gov-sc/processos.seed.js';
import { usuariosSeed as govScUsuarios } from './tenants/gov-sc/usuarios.seed.js';
import { processosSeed as florianopolisProcessos } from './tenants/pref-florianopolis/processos.seed.js';
import { usuariosSeed as florianopolisUsuarios } from './tenants/pref-florianopolis/usuarios.seed.js';
import { processosSeed as joinvilleProcessos } from './tenants/pref-joinville/processos.seed.js';
import { usuariosSeed as joinvilleUsuarios } from './tenants/pref-joinville/usuarios.seed.js';

/**
 * Uma entrada por cliente. Cada cliente tem sua própria pasta em tenants/<tenant-id>/;
 * nunca misture dados de clientes diferentes no mesmo arquivo.
 */
export const TENANT_SEEDS: Readonly<Record<string, TenantSeed>> = {
  'pref-florianopolis': { usuarios: florianopolisUsuarios, processos: florianopolisProcessos },
  'pref-joinville': { usuarios: joinvilleUsuarios, processos: joinvilleProcessos },
  'gov-sc': { usuarios: govScUsuarios, processos: govScProcessos },
};

/** Nomes das variáveis de ambiente com as senhas dos usuários mock (validadas no boot). */
export function variaveisDeSenhaMock(seeds: Readonly<Record<string, TenantSeed>> = TENANT_SEEDS): string[] {
  return Object.values(seeds).flatMap((seed) => seed.usuarios.map((u) => u.senhaEnv));
}
