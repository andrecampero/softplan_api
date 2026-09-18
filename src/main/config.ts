import { z } from 'zod';
import { variaveisDeSenhaMock } from '../infrastructure/persistence/in-memory/seed/index.js';

export const LOG_FILE_PADRAO = 'logs/log_api.log';

/** Regra de segurança, não configuração: o token expira em 1 hora. */
export const TOKEN_EXPIRACAO_SEGUNDOS = 3600;

const PLACEHOLDER = 'troque-me';

const naoPlaceholder = (minimo: number, descricao: string) =>
  z
    .string({ error: 'obrigatória' })
    .trim()
    .min(minimo, `${descricao} deve ter pelo menos ${minimo} caracteres`)
    .refine((valor) => valor !== PLACEHOLDER, `ainda está com o valor de exemplo "${PLACEHOLDER}"`);

const inteiroPositivo = z.coerce.number().int().positive();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: naoPlaceholder(32, 'JWT_SECRET'),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  RATE_LIMIT_IP_MAX: inteiroPositivo.default(600),
  RATE_LIMIT_USUARIO_MAX: inteiroPositivo.default(120),
  RATE_LIMIT_LOGIN_MAX: inteiroPositivo.default(5),
  RATE_LIMIT_LOGIN_IP_MAX: inteiroPositivo.default(30),
  LOG_FILE: z.string().default(LOG_FILE_PADRAO),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export interface RateLimitConfig {
  janela: string;
  ipMax: number;
  usuarioMax: number;
  loginMax: number;
  loginIpMax: number;
}

export interface AppConfig {
  ambiente: 'development' | 'test' | 'production';
  porta: number;
  host: string;
  corsOrigins: string[];
  jwtSecret: string;
  tokenExpiracaoSegundos: number;
  rateLimit: RateLimitConfig;
  log: { arquivo: string; nivel: string };
  senhasMock: Record<string, string>;
}

/** Erro de configuração: lista apenas NOMES de variáveis, nunca valores. */
export class ConfigError extends Error {
  constructor(readonly problemas: string[]) {
    super(`Configuração inválida no .env:\n${problemas.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

/** Único ponto do código que lê variáveis de ambiente (CLAUDE.md, seção 4.6). */
export function carregarConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const senhasSchema = z.object(
    Object.fromEntries(variaveisDeSenhaMock().map((nome) => [nome, naoPlaceholder(8, 'A senha')])),
  );
  const resultado = envSchema.and(senhasSchema).safeParse(env);

  if (!resultado.success) {
    throw new ConfigError(resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  const e = resultado.data;
  return {
    ambiente: e.NODE_ENV,
    porta: e.PORT,
    host: e.HOST,
    corsOrigins: e.CORS_ORIGIN.split(',').map((o) => o.trim()),
    jwtSecret: e.JWT_SECRET,
    tokenExpiracaoSegundos: TOKEN_EXPIRACAO_SEGUNDOS,
    rateLimit: {
      janela: e.RATE_LIMIT_WINDOW,
      ipMax: e.RATE_LIMIT_IP_MAX,
      usuarioMax: e.RATE_LIMIT_USUARIO_MAX,
      loginMax: e.RATE_LIMIT_LOGIN_MAX,
      loginIpMax: e.RATE_LIMIT_LOGIN_IP_MAX,
    },
    log: { arquivo: e.LOG_FILE, nivel: e.LOG_LEVEL },
    senhasMock: Object.fromEntries(variaveisDeSenhaMock().map((nome) => [nome, String(env[nome])])),
  };
}
