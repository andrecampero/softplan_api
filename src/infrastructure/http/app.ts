import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { LogController, type FastifyBaseLogger, type FastifyInstance, type FastifyRequest } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AutenticarUsuarioService } from '../../application/auth/autenticar-usuario.service.js';
import type { ListarProcessosService } from '../../application/processo/listar-processos.service.js';
import type { TokenService } from '../../domain/auth/token-service.js';
import type { TenantRepository } from '../../domain/tenant/tenant.repository.js';
import type { AppConfig } from '../../main/config.js';
import { criarAutenticacao, semCache } from './plugins/auth.plugin.js';
import { registrarTratamentoDeErros } from './plugins/error-handler.js';
import { criarLimitador } from './plugins/rate-limit.plugin.js';
import { criarValidacaoDeTenant, TENANT_HEADER } from './plugins/tenant.plugin.js';
import './request-context.js';
import { authRoutes } from './routes/auth/auth.routes.js';
import { processoRoutes } from './routes/processo/processo.routes.js';

z.config(z.locales.pt());

export interface AppDependencies {
  config: Pick<AppConfig, 'ambiente' | 'corsOrigins' | 'rateLimit'>;
  logger: FastifyBaseLogger;
  tenantRepository: TenantRepository;
  tokenService: TokenService;
  autenticarUsuarioService: Pick<AutenticarUsuarioService, 'execute'>;
  listarProcessosService: Pick<ListarProcessosService, 'execute'>;
}

const REQUEST_ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;
const ROTAS_SEM_LIMITE = ['/health', '/docs'];

function gerarRequestId(request: { headers: Record<string, unknown> }): string {
  const recebido = request.headers['x-request-id'];
  return typeof recebido === 'string' && REQUEST_ID_VALIDO.test(recebido) ? recebido : randomUUID();
}

const semLimite = (request: FastifyRequest) => ROTAS_SEM_LIMITE.some((rota) => request.url.startsWith(rota));

/** Monta a aplicação sem chamar listen(): usado pelo servidor e pelos testes. */
export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
  const { config } = deps;
  const app = Fastify({
    loggerInstance: deps.logger,
    genReqId: gerarRequestId,
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    bodyLimit: 100 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarTratamentoDeErros(app);

  app.decorateRequest('tenant', null);
  app.decorateRequest('usuario', null);
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    return payload;
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.corsOrigins,
    allowedHeaders: ['content-type', 'authorization', TENANT_HEADER, 'x-request-id'],
    exposedHeaders: ['retry-after', 'x-request-id', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'],
  });

  // Rate limit — camada 1 (anti-flood por IP), antes de tudo. Seção 4.4 do CLAUDE.md.
  await app.register(rateLimit, { global: false });
  const { rateLimit: limites } = config;
  app.addHook(
    'onRequest',
    criarLimitador(app, {
      camada: 'ip',
      max: limites.ipMax,
      janela: limites.janela,
      contexto: 'api',
      chave: (req) => req.ip,
      ignorar: semLimite,
    }),
  );

  await app.register(swagger, {
    openapi: {
      info: {
        title: '1DOC — API de integração',
        description: 'Nova camada de API multitenant do 1DOC. Obtenha um token em POST /auth/token e envie-o em Authorization: Bearer.',
        version: '0.1.0',
      },
      components: {
        securitySchemes: {
          tenantId: { type: 'apiKey', in: 'header', name: TENANT_HEADER, description: 'Identificador do órgão (tenant)' },
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  if (config.ambiente !== 'production') await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', { schema: { hide: true } }, async () => ({ status: 'ok' }));

  // Rotas da API: tenant → autenticação → rate limit por usuário → handler.
  await app.register(async (api) => {
    api.addHook('onRequest', criarValidacaoDeTenant(deps.tenantRepository));
    api.addHook('onRequest', criarAutenticacao(deps.tokenService));
    api.addHook(
      'preHandler',
      criarLimitador(api, {
        camada: 'usuario',
        max: limites.usuarioMax,
        janela: limites.janela,
        contexto: 'api',
        chave: (req) => `${req.usuario?.tenantId}:${req.usuario?.id}`,
        ignorar: (req) => !req.usuario,
      }),
    );
    api.addHook('onSend', semCache);

    await api.register(authRoutes, {
      autenticarUsuarioService: deps.autenticarUsuarioService,
      limitarLoginPorOrigem: criarLimitador(api, {
        camada: 'login-origem',
        max: limites.loginIpMax,
        janela: limites.janela,
        contexto: 'login',
        chave: (req) => `${req.tenant?.id}:${req.ip}`,
      }),
      limitarLoginPorConta: criarLimitador(api, {
        camada: 'login-conta',
        max: limites.loginMax,
        janela: limites.janela,
        contexto: 'login',
        chave: (req) => `${req.tenant?.id}:${String((req.body as { email?: string }).email).trim().toLowerCase()}`,
      }),
    });
    await api.register(processoRoutes, { listarProcessosService: deps.listarProcessosService });
  });

  return app;
}
