import type { Usuario } from './usuario.entity.js';

/** PORT: busca sempre restrita à base do tenant informado. */
export interface UsuarioRepository {
  buscarPorEmail(tenantId: string, email: string): Promise<Usuario | null>;
}
