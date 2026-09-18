import pino, { type Logger } from 'pino';

export interface LoggerOptions {
  /** Arquivo que recebe os erros (warn e error). */
  arquivo: string;
  /** Nível do console (desenvolvimento). */
  nivel: string;
  /** Espelha os logs no console (só em development). */
  console: boolean;
  /** Escrita síncrona: usada nos testes para ler o arquivo logo após a requisição. */
  sync?: boolean;
}

/** Campos que nunca podem ir para o log (CLAUDE.md, seção 7.3). */
export const CAMPOS_SENSIVEIS = [
  'req.headers.authorization',
  'headers.authorization',
  'authorization',
  'senha',
  'senhaHash',
  'accessToken',
  'body',
  '*.senha',
  '*.senhaHash',
  '*.accessToken',
  '*.authorization',
];

export function criarLogger({ arquivo, nivel, console: noConsole, sync = false }: LoggerOptions): Logger {
  const streams: pino.StreamEntry[] = [
    { level: 'warn', stream: pino.destination({ dest: arquivo, mkdir: true, sync }) },
  ];
  if (noConsole) streams.push({ level: nivel as pino.Level, stream: process.stdout });

  return pino(
    {
      level: noConsole ? nivel : 'warn',
      base: undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: CAMPOS_SENSIVEIS, censor: '[REMOVIDO]' },
    },
    pino.multistream(streams),
  );
}
