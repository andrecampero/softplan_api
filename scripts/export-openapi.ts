/** Gera openapi.json (contrato consumido pelo frontend). Uso: npm run openapi:export */
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/infrastructure/http/app.js';
import { criarLogger } from '../src/infrastructure/logging/logger.js';
import { variaveisDeSenhaMock } from '../src/infrastructure/persistence/in-memory/seed/index.js';
import { TOKEN_EXPIRACAO_SEGUNDOS } from '../src/main/config.js';
import { criarDependencias } from '../src/main/container.js';

const logger = criarLogger({ arquivo: join(mkdtempSync(join(tmpdir(), 'openapi-')), 'log'), nivel: 'silent', console: false });
const deps = await criarDependencias(
  {
    ambiente: 'development',
    porta: 0,
    host: '127.0.0.1',
    corsOrigins: [],
    jwtSecret: randomBytes(48).toString('base64'),
    tokenExpiracaoSegundos: TOKEN_EXPIRACAO_SEGUNDOS,
    rateLimit: { janela: '1 minute', ipMax: 1, usuarioMax: 1, loginMax: 1, loginIpMax: 1 },
    log: { arquivo: '', nivel: 'silent' },
    senhasMock: Object.fromEntries(variaveisDeSenhaMock().map((nome) => [nome, randomUUID()])),
  },
  logger,
);

const app = await buildApp(deps);
await app.ready();
writeFileSync('openapi.json', `${JSON.stringify(app.swagger(), null, 2)}\n`);
await app.close();
console.log('✅ openapi.json atualizado.');
