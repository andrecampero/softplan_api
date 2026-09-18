import type { Logger } from 'pino';
import { AutenticarUsuarioService } from '../application/auth/autenticar-usuario.service.js';
import { ListarProcessosService } from '../application/processo/listar-processos.service.js';
import type { AppDependencies } from '../infrastructure/http/app.js';
import { InMemoryDatabaseRegistry } from '../infrastructure/persistence/in-memory/in-memory-database.registry.js';
import { InMemoryProcessoRepository } from '../infrastructure/persistence/in-memory/processo.in-memory.repository.js';
import { TENANT_SEEDS } from '../infrastructure/persistence/in-memory/seed/index.js';
import { InMemoryTenantRepository } from '../infrastructure/persistence/in-memory/tenant.in-memory.repository.js';
import { InMemoryUsuarioRepository } from '../infrastructure/persistence/in-memory/usuario.in-memory.repository.js';
import { JoseTokenService } from '../infrastructure/security/jose-token-service.js';
import { ScryptPasswordHasher } from '../infrastructure/security/scrypt-password-hasher.js';
import type { AppConfig } from './config.js';

/** Composition root: único lugar que liga ports às implementações concretas. */
export async function criarDependencias(config: AppConfig, logger: Logger): Promise<AppDependencies> {
  const passwordHasher = new ScryptPasswordHasher();
  const registry = await InMemoryDatabaseRegistry.fromSeeds(TENANT_SEEDS, config.senhasMock, passwordHasher);
  const tokenService = new JoseTokenService(config.jwtSecret, config.tokenExpiracaoSegundos);

  return {
    config,
    logger,
    tenantRepository: new InMemoryTenantRepository(registry),
    tokenService,
    autenticarUsuarioService: new AutenticarUsuarioService(
      new InMemoryUsuarioRepository(registry),
      passwordHasher,
      tokenService,
    ),
    listarProcessosService: new ListarProcessosService(new InMemoryProcessoRepository(registry)),
  };
}
