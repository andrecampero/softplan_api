import { describe, expect, it } from 'vitest';
import { variaveisDeSenhaMock } from '../infrastructure/persistence/in-memory/seed/index.js';
import { carregarConfig, ConfigError } from './config.js';

const envValido = (): NodeJS.ProcessEnv => ({
  JWT_SECRET: 'x'.repeat(48),
  ...Object.fromEntries(variaveisDeSenhaMock().map((nome) => [nome, `senha-forte-${nome}`])),
});

function problemas(env: NodeJS.ProcessEnv): string[] {
  try {
    carregarConfig(env);
    return [];
  } catch (erro) {
    return erro instanceof ConfigError ? erro.problemas : ['erro inesperado'];
  }
}

describe('carregarConfig', () => {
  it('carrega a configuração com expiração de token fixa em 1 hora e padrões de rate limit', () => {
    const config = carregarConfig(envValido());

    expect(config.tokenExpiracaoSegundos).toBe(3600);
    expect(config.rateLimit).toEqual({ janela: '1 minute', ipMax: 600, usuarioMax: 120, loginMax: 5, loginIpMax: 30 });
    expect(config.log.arquivo).toBe('logs/log_api.log');
  });

  it('lista o nome das variáveis obrigatórias ausentes', () => {
    const lista = problemas({});

    expect(lista.some((p) => p.startsWith('JWT_SECRET'))).toBe(true);
    expect(lista.some((p) => p.startsWith('MOCK_SENHA_FLORIANOPOLIS_ADMIN'))).toBe(true);
  });

  it('recusa valores de exemplo "troque-me"', () => {
    expect(problemas({ ...envValido(), MOCK_SENHA_GOVSC_ADMIN: 'troque-me' })).toEqual([
      expect.stringMatching(/^MOCK_SENHA_GOVSC_ADMIN: ainda está com o valor de exemplo/),
    ]);
  });

  it('recusa JWT_SECRET curto sem expor o valor', () => {
    const lista = problemas({ ...envValido(), JWT_SECRET: 'curto-demais' });

    expect(lista).toEqual([expect.stringMatching(/^JWT_SECRET: .*32 caracteres/)]);
    expect(lista.join()).not.toContain('curto-demais');
  });
});
