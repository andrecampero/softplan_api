import type { FastifyError, FastifyInstance, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError, type ErrorCode, type ErrorDetail } from '../../../domain/shared/errors.js';
import { ERROR_MESSAGES, mensagemErroInterno, mensagemRateLimit } from '../errors/error-messages.js';
import type { ErrorResponse } from '../schemas/error.schema.js';

const TAMANHO_MAXIMO_TEXTO = 1024;

const truncar = (texto: string) =>
  texto.length > TAMANHO_MAXIMO_TEXTO ? `${texto.slice(0, TAMANHO_MAXIMO_TEXTO)}…` : texto;

interface ErroTraduzido {
  status: number;
  corpo: ErrorResponse;
  registrarLog: boolean;
  logContexto?: Record<string, string>;
}

function resposta(code: ErrorCode, requestId: string, extras: Partial<ErrorResponse['error']> = {}): ErrorResponse {
  return { error: { code, message: ERROR_MESSAGES[code].message, requestId, ...extras } };
}

function detalhesDeValidacao(erro: FastifyError): ErrorDetail[] {
  return (erro.validation ?? []).map((v) => {
    const caminho = v.instancePath.replace(/^\//, '').replaceAll('/', '.');
    const campo = caminho || String((v.params as { missingProperty?: string } | undefined)?.missingProperty ?? '');
    return { campo: truncar(campo || (erro.validationContext ?? 'requisicao')), mensagem: truncar(v.message ?? 'Valor inválido') };
  });
}

function traduzir(erro: FastifyError | AppError, requestId: string): ErroTraduzido {
  if (erro instanceof AppError) {
    const { status } = ERROR_MESSAGES[erro.code];
    const message =
      erro.code === 'RATE_LIMIT_EXCEDIDO'
        ? mensagemRateLimit(erro.retryAfterSeconds ?? 60, erro.rateLimitContexto)
        : ERROR_MESSAGES[erro.code].message;
    const details = erro.details?.map((d) => ({ campo: truncar(d.campo), mensagem: truncar(d.mensagem) }));
    return {
      status,
      corpo: resposta(erro.code, requestId, { message, details, retryAfterSeconds: erro.retryAfterSeconds }),
      registrarLog: erro.registrarLog,
      logContexto: erro.logContexto,
    };
  }

  if (hasZodFastifySchemaValidationErrors(erro) || erro.validation) {
    return { status: 400, corpo: resposta('REQUISICAO_INVALIDA', requestId, { details: detalhesDeValidacao(erro) }), registrarLog: true };
  }

  // Erros do próprio Fastify com status 4xx: JSON malformado, body grande demais, content-type inválido.
  if (typeof erro.statusCode === 'number' && erro.statusCode >= 400 && erro.statusCode < 500) {
    return { status: 400, corpo: resposta('REQUISICAO_INVALIDA', requestId), registrarLog: true };
  }

  return {
    status: 500,
    corpo: resposta('ERRO_INTERNO', requestId, { message: mensagemErroInterno(requestId) }),
    registrarLog: true,
  };
}

function registrarNoLog(request: FastifyRequest, erro: Error, traduzido: ErroTraduzido): void {
  if (!traduzido.registrarLog) return;

  const contexto = {
    code: traduzido.corpo.error.code,
    statusCode: traduzido.status,
    tenantId: request.tenant?.id,
    usuarioId: request.usuario?.id,
    method: request.method,
    url: request.url.split('?')[0],
    ip: request.ip,
    ...traduzido.logContexto,
  };

  if (traduzido.status >= 500) {
    request.log.error({ ...contexto, err: erro }, truncar(erro.message));
  } else {
    request.log.warn(contexto, traduzido.corpo.error.code);
  }
}

/**
 * Único lugar que converte erros em HTTP: mensagem amigável do catálogo para o
 * cliente, detalhe técnico só no log (CLAUDE.md, seção 7).
 */
export function registrarTratamentoDeErros(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError | AppError>((erro, request, reply) => {
    const traduzido = traduzir(erro, request.id);
    registrarNoLog(request, erro, traduzido);
    return reply.status(traduzido.status).send(traduzido.corpo);
  });

  app.setNotFoundHandler((request, reply) => {
    const traduzido: ErroTraduzido = { status: 404, corpo: resposta('ROTA_NAO_ENCONTRADA', request.id), registrarLog: true };
    registrarNoLog(request, new Error('Rota não encontrada'), traduzido);
    return reply.status(404).send(traduzido.corpo);
  });
}
