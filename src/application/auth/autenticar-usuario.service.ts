import type { PasswordHasher } from '../../domain/auth/password-hasher.js';
import type { TokenService } from '../../domain/auth/token-service.js';
import { UnauthorizedError } from '../../domain/shared/errors.js';
import type { UsuarioRepository } from '../../domain/usuario/usuario.repository.js';

export interface AutenticarUsuarioInput {
  tenantId: string;
  email: string;
  senha: string;
}

export interface AutenticarUsuarioOutput {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/** Valor sem significado, usado só para gastar o mesmo tempo quando o usuário não existe. */
const SENHA_FICTICIA_PARA_TEMPO_CONSTANTE = 'comparacao-de-tempo-constante';

export class AutenticarUsuarioService {
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute({ tenantId, email, senha }: AutenticarUsuarioInput): Promise<AutenticarUsuarioOutput> {
    const usuario = await this.usuarioRepository.buscarPorEmail(tenantId, email.trim().toLowerCase());
    const hash = usuario?.senhaHash ?? (await this.obterHashFicticio());
    const senhaConfere = await this.passwordHasher.verify(senha, hash);

    if (!usuario || !usuario.ativo || !senhaConfere) {
      throw new UnauthorizedError('CREDENCIAIS_INVALIDAS');
    }

    const token = await this.tokenService.emitir({ sub: usuario.id, tenantId, perfil: usuario.perfil });
    return { accessToken: token.accessToken, tokenType: 'Bearer', expiresIn: token.expiresIn };
  }

  private obterHashFicticio(): Promise<string> {
    this.hashFicticio ??= this.passwordHasher.hash(SENHA_FICTICIA_PARA_TEMPO_CONSTANTE);
    return this.hashFicticio;
  }
}
