import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { TokenClaims, TokenEmitido, TokenService } from '../../domain/auth/token-service.js';
import { AppError } from '../../domain/shared/errors.js';
import type { Usuario } from '../../domain/usuario/usuario.entity.js';
import { InMemoryDatabaseRegistry } from '../../infrastructure/persistence/in-memory/in-memory-database.registry.js';
import { InMemoryUsuarioRepository } from '../../infrastructure/persistence/in-memory/usuario.in-memory.repository.js';
import { ScryptPasswordHasher } from '../../infrastructure/security/scrypt-password-hasher.js';
import { AutenticarUsuarioService } from './autenticar-usuario.service.js';

class TokenServiceFalso implements TokenService {
  emitidos: TokenClaims[] = [];

  async emitir(claims: TokenClaims): Promise<TokenEmitido> {
    this.emitidos.push(claims);
    return { accessToken: `token-${claims.sub}`, expiresIn: 3600 };
  }

  async verificar(): Promise<TokenClaims> {
    throw new Error('não usado neste teste');
  }
}

describe('AutenticarUsuarioService', () => {
  const hasher = new ScryptPasswordHasher();
  const senhaA = randomUUID();
  const senhaB = randomUUID();
  let tokenService: TokenServiceFalso;
  let service: AutenticarUsuarioService;

  async function usuario(dados: Partial<Usuario> & Pick<Usuario, 'id' | 'email'>, senha: string): Promise<Usuario> {
    return {
      nome: 'Usuário de teste',
      perfil: 'servidor',
      ativo: true,
      criadoEm: '2026-01-01T00:00:00.000Z',
      senhaHash: await hasher.hash(senha),
      ...dados,
    };
  }

  beforeAll(async () => {
    const registry = InMemoryDatabaseRegistry.fromDatabases({
      'tenant-a': {
        processos: [],
        usuarios: [
          await usuario({ id: 'ua', email: 'admin@a.gov.br', perfil: 'admin' }, senhaA),
          await usuario({ id: 'ua-inativo', email: 'inativo@a.gov.br', ativo: false }, senhaA),
        ],
      },
      'tenant-b': { processos: [], usuarios: [await usuario({ id: 'ub', email: 'admin@b.gov.br' }, senhaB)] },
    });
    tokenService = new TokenServiceFalso();
    service = new AutenticarUsuarioService(new InMemoryUsuarioRepository(registry), hasher, tokenService);
  });

  it('emite token com sub, tenantId e perfil para credenciais válidas', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-a', email: 'admin@a.gov.br', senha: senhaA });

    expect(resultado).toEqual({ accessToken: 'token-ua', tokenType: 'Bearer', expiresIn: 3600 });
    expect(tokenService.emitidos.at(-1)).toEqual({ sub: 'ua', tenantId: 'tenant-a', perfil: 'admin' });
  });

  it('aceita e-mail com maiúsculas e espaços', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-a', email: '  ADMIN@A.gov.br ', senha: senhaA });

    expect(resultado.accessToken).toBe('token-ua');
  });

  it.each([
    ['senha errada', { tenantId: 'tenant-a', email: 'admin@a.gov.br', senha: 'senha-errada' }],
    ['usuário inexistente', { tenantId: 'tenant-a', email: 'nao-existe@a.gov.br', senha: senhaA }],
    ['usuário inativo', { tenantId: 'tenant-a', email: 'inativo@a.gov.br', senha: senhaA }],
    ['usuário de outro tenant', { tenantId: 'tenant-a', email: 'admin@b.gov.br', senha: senhaB }],
  ])('responde CREDENCIAIS_INVALIDAS para %s (mesmo erro, sem revelar o motivo)', async (_caso, entrada) => {
    const erro = await service.execute(entrada).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(AppError);
    expect((erro as AppError).code).toBe('CREDENCIAIS_INVALIDAS');
  });
});
