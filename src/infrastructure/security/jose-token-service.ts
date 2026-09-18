import { errors, jwtVerify, SignJWT } from 'jose';
import type { TokenClaims, TokenEmitido, TokenService } from '../../domain/auth/token-service.js';
import { UnauthorizedError } from '../../domain/shared/errors.js';
import { PERFIS, type Perfil } from '../../domain/usuario/usuario.entity.js';

const ALGORITMO = 'HS256';

function isPerfil(valor: unknown): valor is Perfil {
  return typeof valor === 'string' && (PERFIS as readonly string[]).includes(valor);
}

export class JoseTokenService implements TokenService {
  private readonly chave: Uint8Array;

  constructor(
    segredo: string,
    private readonly expiracaoSegundos: number,
  ) {
    this.chave = new TextEncoder().encode(segredo);
  }

  async emitir({ sub, tenantId, perfil }: TokenClaims): Promise<TokenEmitido> {
    const agora = Math.floor(Date.now() / 1000);
    const accessToken = await new SignJWT({ tenantId, perfil })
      .setProtectedHeader({ alg: ALGORITMO, typ: 'JWT' })
      .setSubject(sub)
      .setIssuedAt(agora)
      .setExpirationTime(agora + this.expiracaoSegundos)
      .sign(this.chave);

    return { accessToken, expiresIn: this.expiracaoSegundos };
  }

  async verificar(token: string): Promise<TokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.chave, { algorithms: [ALGORITMO], requiredClaims: ['sub', 'exp'] });
      if (typeof payload.sub !== 'string' || typeof payload.tenantId !== 'string' || !isPerfil(payload.perfil)) {
        throw new UnauthorizedError('TOKEN_INVALIDO');
      }
      return { sub: payload.sub, tenantId: payload.tenantId, perfil: payload.perfil };
    } catch (erro) {
      if (erro instanceof UnauthorizedError) throw erro;
      const code = erro instanceof errors.JWTExpired ? 'TOKEN_EXPIRADO' : 'TOKEN_INVALIDO';
      throw new UnauthorizedError(code, { cause: erro });
    }
  }
}
