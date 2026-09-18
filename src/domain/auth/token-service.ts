import type { Perfil } from '../usuario/usuario.entity.js';

export interface TokenClaims {
  /** Id do usuário. */
  sub: string;
  tenantId: string;
  perfil: Perfil;
}

export interface TokenEmitido {
  accessToken: string;
  expiresIn: number;
}

/**
 * PORT. `verificar` lança UnauthorizedError com TOKEN_INVALIDO ou TOKEN_EXPIRADO.
 */
export interface TokenService {
  emitir(claims: TokenClaims): Promise<TokenEmitido>;
  verificar(token: string): Promise<TokenClaims>;
}
