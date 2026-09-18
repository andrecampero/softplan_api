import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp, type AppDependencies } from '../../src/infrastructure/http/app.js';
import { criarLogger } from '../../src/infrastructure/logging/logger.js';
import { variaveisDeSenhaMock } from '../../src/infrastructure/persistence/in-memory/seed/index.js';
import { TOKEN_EXPIRACAO_SEGUNDOS, type AppConfig, type RateLimitConfig } from '../../src/main/config.js';
import { criarDependencias } from '../../src/main/container.js';

/** Usuários das seeds. As senhas são geradas a cada execução (nada de .env nos testes). */
export const USUARIOS = {
  florianopolisAdmin: { tenant: 'pref-florianopolis', email: 'admin@florianopolis.sc.gov.br', senhaEnv: 'MOCK_SENHA_FLORIANOPOLIS_ADMIN' },
  florianopolisServidor: { tenant: 'pref-florianopolis', email: 'servidor@florianopolis.sc.gov.br', senhaEnv: 'MOCK_SENHA_FLORIANOPOLIS_SERVIDOR' },
  joinvilleAdmin: { tenant: 'pref-joinville', email: 'admin@joinville.sc.gov.br', senhaEnv: 'MOCK_SENHA_JOINVILLE_ADMIN' },
  joinvilleInativo: { tenant: 'pref-joinville', email: 'inativo@joinville.sc.gov.br', senhaEnv: 'MOCK_SENHA_JOINVILLE_INATIVO' },
  govScAdmin: { tenant: 'gov-sc', email: 'admin@sc.gov.br', senhaEnv: 'MOCK_SENHA_GOVSC_ADMIN' },
} as const;

export type UsuarioDeTeste = (typeof USUARIOS)[keyof typeof USUARIOS];

export interface LinhaDeLog {
  level: string;
  requestId?: string;
  code?: string;
  statusCode?: number;
  camada?: string;
  msg?: string;
  err?: { type: string; stack: string };
  [campo: string]: unknown;
}

export interface AppDeTeste {
  app: FastifyInstance;
  senhas: Record<string, string>;
  arquivoLog: string;
  lerLog(): LinhaDeLog[];
  obterToken(usuario: UsuarioDeTeste): Promise<string>;
}

const SEM_LIMITE = 10_000;

export async function criarAppDeTeste(
  opcoes: { rateLimit?: Partial<RateLimitConfig>; sobrescrever?: Partial<AppDependencies> } = {},
): Promise<AppDeTeste> {
  const arquivoLog = join(mkdtempSync(join(tmpdir(), 'api-1doc-')), 'test.log');
  const logger = criarLogger({ arquivo: arquivoLog, nivel: 'warn', console: false, sync: true });
  const senhas = Object.fromEntries(variaveisDeSenhaMock().map((nome) => [nome, randomUUID()]));

  const config: AppConfig = {
    ambiente: 'test',
    porta: 0,
    host: '127.0.0.1',
    corsOrigins: ['http://localhost:5173'],
    jwtSecret: randomBytes(48).toString('base64'),
    tokenExpiracaoSegundos: TOKEN_EXPIRACAO_SEGUNDOS,
    rateLimit: { janela: '1 minute', ipMax: SEM_LIMITE, usuarioMax: SEM_LIMITE, loginMax: SEM_LIMITE, loginIpMax: SEM_LIMITE, ...opcoes.rateLimit },
    log: { arquivo: arquivoLog, nivel: 'warn' },
    senhasMock: senhas,
  };

  const app = await buildApp({ ...(await criarDependencias(config, logger)), ...opcoes.sobrescrever });
  await app.ready();

  return {
    app,
    senhas,
    arquivoLog,
    lerLog: () =>
      existsSync(arquivoLog)
        ? readFileSync(arquivoLog, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as LinhaDeLog)
        : [],
    async obterToken(usuario) {
      const resposta = await app.inject({
        method: 'POST',
        url: '/auth/token',
        headers: { 'x-tenant-id': usuario.tenant },
        payload: { email: usuario.email, senha: senhas[usuario.senhaEnv] },
      });
      if (resposta.statusCode !== 200) throw new Error(`Falha ao obter token: ${resposta.body}`);
      return resposta.json<{ accessToken: string }>().accessToken;
    },
  };
}
