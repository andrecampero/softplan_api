import { buildApp } from '../infrastructure/http/app.js';
import { criarLogger } from '../infrastructure/logging/logger.js';
import { carregarConfig, ConfigError, LOG_FILE_PADRAO } from './config.js';
import { criarDependencias } from './container.js';

async function iniciar(): Promise<void> {
  let config;
  try {
    config = carregarConfig();
  } catch (erro) {
    const detalhe = erro instanceof ConfigError ? erro.message : String(erro);
    criarLogger({ arquivo: LOG_FILE_PADRAO, nivel: 'error', console: false, sync: true }).error(
      { code: 'CONFIG_INVALIDA' },
      detalhe,
    );
    console.error(`\n❌ A API não foi iniciada.\n${detalhe}\n\nCopie .env.example para .env (ou rode "npm run setup") e preencha as variáveis.\n`);
    process.exit(1);
  }

  const logger = criarLogger({ arquivo: config.log.arquivo, nivel: config.log.nivel, console: config.ambiente === 'development' });

  process.on('unhandledRejection', (motivo) => logger.error({ err: motivo, code: 'UNHANDLED_REJECTION' }, 'Promise rejeitada sem tratamento'));
  process.on('uncaughtException', (erro) => {
    logger.error({ err: erro, code: 'UNCAUGHT_EXCEPTION' }, erro.message);
    logger.flush();
    process.exit(1);
  });

  const app = await buildApp(await criarDependencias(config, logger));
  await app.listen({ port: config.porta, host: config.host });
  console.log(`✅ API 1DOC em http://localhost:${config.porta}  |  Documentação: http://localhost:${config.porta}/docs`);
}

void iniciar();
