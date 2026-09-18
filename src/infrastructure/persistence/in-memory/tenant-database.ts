import type { Processo } from '../../../domain/processo/processo.entity.js';
import type { Usuario } from '../../../domain/usuario/usuario.entity.js';

/**
 * Base de dados isolada de UM tenant (simula o database-per-tenant do legado).
 * Recurso novo (ex.: contatos) = nova coleção aqui + arquivo de seed em cada tenant.
 */
export interface TenantDatabase {
  usuarios: Usuario[];
  processos: Processo[];
}

/** Usuário como declarado na seed: a senha vem do .env, pela variável `senhaEnv`. */
export type UsuarioSeed = Omit<Usuario, 'senhaHash'> & { senhaEnv: string };

/** Seed de um tenant: igual à base, exceto que usuários trazem `senhaEnv` em vez do hash. */
export type TenantSeed = Omit<TenantDatabase, 'usuarios'> & { usuarios: UsuarioSeed[] };
