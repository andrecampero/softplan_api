import type { Usuario } from '../../../domain/usuario/usuario.entity.js';
import type { UsuarioRepository } from '../../../domain/usuario/usuario.repository.js';
import type { InMemoryDatabaseRegistry } from './in-memory-database.registry.js';

export class InMemoryUsuarioRepository implements UsuarioRepository {
  constructor(private readonly registry: InMemoryDatabaseRegistry) {}

  async buscarPorEmail(tenantId: string, email: string): Promise<Usuario | null> {
    const usuario = this.registry.get(tenantId).usuarios.find((u) => u.email === email);
    return usuario ? structuredClone(usuario) : null;
  }
}
