import type { Perfil } from '../usuario/usuario.entity.js';

/** Usuário extraído de um token válido; só existe depois do auth.plugin. */
export interface UsuarioAutenticado {
  id: string;
  tenantId: string;
  perfil: Perfil;
}
