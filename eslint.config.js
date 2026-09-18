import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'logs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
    },
  },
  {
    // Somente config.ts lê process.env (CLAUDE.md, seção 4.6).
    files: ['src/**/*.ts'],
    ignores: ['src/main/config.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Leia variáveis de ambiente apenas em src/main/config.ts.' },
      ],
    },
  },
  {
    // Domínio não depende de nenhuma biblioteca externa nem de camadas externas.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['fastify*', '@fastify/*', 'zod', 'jose', 'pino'], message: 'O domínio não importa bibliotecas de infraestrutura.' },
            { group: ['**/application/**', '**/infrastructure/**', '**/main/**'], message: 'O domínio não importa camadas externas.' },
          ],
        },
      ],
    },
  },
  {
    // Specs podem usar os adapters em memória como dublês (CLAUDE.md, seção 10, passo 4).
    files: ['src/application/**/*.ts'],
    ignores: ['src/application/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['fastify*', '@fastify/*', 'zod', 'jose', 'pino'], message: 'Services não importam bibliotecas de infraestrutura.' },
            { group: ['**/infrastructure/**', '**/main/**'], message: 'A camada de aplicação não importa infraestrutura.' },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.ts', 'src/main/server.ts'],
    rules: { 'no-console': 'off' },
  },
);
