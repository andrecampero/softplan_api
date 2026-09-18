import type { ErrorCode, RateLimitContexto } from '../../../domain/shared/errors.js';

interface MensagemErro {
  status: number;
  message: string;
}

/** Única fonte das mensagens de erro da API (CLAUDE.md, seção 7.2). */
export const ERROR_MESSAGES: Readonly<Record<ErrorCode, MensagemErro>> = {
  TENANT_ID_OBRIGATORIO: { status: 400, message: 'Não foi possível identificar o órgão. Informe o cabeçalho x-tenant-id.' },
  TENANT_ID_INVALIDO: { status: 400, message: 'O identificador do órgão está em formato inválido.' },
  REQUISICAO_INVALIDA: { status: 400, message: 'Alguns dados enviados estão inválidos. Verifique os campos e tente novamente.' },
  CREDENCIAIS_INVALIDAS: { status: 401, message: 'E-mail ou senha incorretos.' },
  TOKEN_AUSENTE: { status: 401, message: 'Você precisa estar autenticado para acessar este recurso.' },
  TOKEN_INVALIDO: { status: 401, message: 'Sua credencial de acesso é inválida. Faça login novamente.' },
  TOKEN_EXPIRADO: { status: 401, message: 'Sua sessão expirou. Faça login novamente.' },
  TENANT_NAO_AUTORIZADO: { status: 403, message: 'Este órgão não tem acesso à API.' },
  TENANT_TOKEN_DIVERGENTE: { status: 403, message: 'Sua credencial não pertence a este órgão. Faça login novamente.' },
  RECURSO_NAO_ENCONTRADO: { status: 404, message: 'O item solicitado não foi encontrado.' },
  ROTA_NAO_ENCONTRADA: { status: 404, message: 'O endereço solicitado não existe nesta API.' },
  RATE_LIMIT_EXCEDIDO: { status: 429, message: 'Você fez muitas requisições em pouco tempo. Tente novamente em instantes.' },
  ERRO_INTERNO: { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente em instantes.' },
};

function descreverEspera(segundos: number): string {
  if (segundos < 60) return `${segundos} segundo${segundos === 1 ? '' : 's'}`;
  const minutos = Math.ceil(segundos / 60);
  return `${minutos} minuto${minutos === 1 ? '' : 's'}`;
}

export function mensagemRateLimit(segundos: number, contexto: RateLimitContexto = 'api'): string {
  const espera = descreverEspera(Math.max(1, segundos));
  return contexto === 'login'
    ? `Muitas tentativas de login. Por segurança, aguarde ${espera} antes de tentar novamente.`
    : `Você fez muitas requisições em pouco tempo. Aguarde ${espera} e tente novamente.`;
}

export function mensagemErroInterno(requestId: string): string {
  return `${ERROR_MESSAGES.ERRO_INTERNO.message} Se persistir, informe o código ${requestId} ao suporte.`;
}
