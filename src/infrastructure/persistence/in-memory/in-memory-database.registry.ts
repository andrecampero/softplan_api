import type { PasswordHasher } from '../../../domain/auth/password-hasher.js';
import type { TenantDatabase, TenantSeed } from './tenant-database.js';

/**
 * Guarda uma base em memória por tenant. Os repositórios só enxergam a base
 * devolvida por `get(tenantId)`; não há como consultar dois tenants de uma vez.
 */
export class InMemoryDatabaseRegistry {
  private constructor(private readonly bases: ReadonlyMap<string, TenantDatabase>) {}

  /** Monta as bases a partir das seeds, gerando o hash de cada senha lida do .env. */
  static async fromSeeds(
    seeds: Readonly<Record<string, TenantSeed>>,
    senhas: Readonly<Record<string, string>>,
    passwordHasher: PasswordHasher,
  ): Promise<InMemoryDatabaseRegistry> {
    const bases = new Map<string, TenantDatabase>();

    for (const [tenantId, seed] of Object.entries(seeds)) {
      const { usuarios: usuariosSeed, ...colecoes } = seed;
      const usuarios = await Promise.all(
        usuariosSeed.map(async ({ senhaEnv, ...usuario }) => {
          const senha = senhas[senhaEnv];
          if (!senha) throw new Error(`Senha do usuário mock não configurada: ${senhaEnv}`);
          return { ...structuredClone(usuario), senhaHash: await passwordHasher.hash(senha) };
        }),
      );
      bases.set(tenantId, { ...structuredClone(colecoes), usuarios });
    }
    return new InMemoryDatabaseRegistry(bases);
  }

  /** Para testes: recebe bases prontas (clonadas para não haver efeito colateral). */
  static fromDatabases(bases: Readonly<Record<string, TenantDatabase>>): InMemoryDatabaseRegistry {
    return new InMemoryDatabaseRegistry(new Map(Object.entries(structuredClone(bases))));
  }

  existe(tenantId: string): boolean {
    return this.bases.has(tenantId);
  }

  get(tenantId: string): TenantDatabase {
    const base = this.bases.get(tenantId);
    if (!base) throw new Error(`Base do tenant não encontrada: ${tenantId}`);
    return base;
  }
}
