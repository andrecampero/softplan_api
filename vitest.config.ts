import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/application/**', 'src/infrastructure/http/**', 'src/infrastructure/security/**'],
      exclude: ['**/*.spec.ts'],
      thresholds: { lines: 80 },
    },
  },
});
