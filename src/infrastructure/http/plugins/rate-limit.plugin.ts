import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { RateLimitError, type RateLimitContexto } from '../../../domain/shared/errors.js';

export interface LimitadorOptions {
  /** Nome da camada; vai para o log e isola as chaves de cada camada. */
  camada: string;
  max: number;
  janela: string;
  contexto: RateLimitContexto;
  chave: (request: FastifyRequest) => string;
  /** Requisições que não contam para esta camada. */
  ignorar?: (request: FastifyRequest) => boolean;
}

export type Limitador = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/** Registra o 429 só no primeiro bloqueio de cada chave por janela, para não inundar o log. */
class RegistroDeBloqueios {
  private readonly bloqueadosAte = new Map<string, number>();

  primeiroBloqueio(chave: string, ttlMs: number): boolean {
    const agora = Date.now();
    const ate = this.bloqueadosAte.get(chave);
    if (ate !== undefined && ate > agora) return false;

    this.bloqueadosAte.set(chave, agora + ttlMs);
    if (this.bloqueadosAte.size > 10_000) this.limparExpirados(agora);
    return true;
  }

  private limparExpirados(agora: number): void {
    for (const [chave, ate] of this.bloqueadosAte) if (ate <= agora) this.bloqueadosAte.delete(chave);
  }
}

/**
 * Cria um limitador independente sobre o @fastify/rate-limit (que precisa estar
 * registrado com `global: false`). Cada camada tem sua própria contagem.
 */
export function criarLimitador(app: FastifyInstance, opcoes: LimitadorOptions): Limitador {
  const { camada, max, janela, contexto, chave, ignorar } = opcoes;
  const verificar = app.createRateLimit({ max, timeWindow: janela, keyGenerator: (req) => `${camada}:${chave(req)}` });
  const registro = new RegistroDeBloqueios();

  return async function limitar(request, reply) {
    if (ignorar?.(request)) return;

    const resultado = await verificar(request);
    if (resultado.isAllowed) return;

    reply
      .header('x-ratelimit-limit', resultado.max)
      .header('x-ratelimit-remaining', resultado.remaining)
      .header('x-ratelimit-reset', resultado.ttlInSeconds);
    if (!resultado.isExceeded) return;

    reply.header('retry-after', resultado.ttlInSeconds);
    throw new RateLimitError('RATE_LIMIT_EXCEDIDO', {
      retryAfterSeconds: resultado.ttlInSeconds,
      rateLimitContexto: contexto,
      registrarLog: registro.primeiroBloqueio(resultado.key, resultado.ttl),
      logContexto: { camada },
    });
  };
}
