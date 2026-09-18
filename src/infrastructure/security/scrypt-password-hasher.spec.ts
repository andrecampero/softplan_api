import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from './scrypt-password-hasher.js';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('aceita a senha correta', async () => {
    const hash = await hasher.hash('Senha-Correta-123');

    await expect(hasher.verify('Senha-Correta-123', hash)).resolves.toBe(true);
  });

  it('rejeita a senha errada', async () => {
    const hash = await hasher.hash('Senha-Correta-123');

    await expect(hasher.verify('senha-errada', hash)).resolves.toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (salt aleatório) e nunca guarda o texto puro', async () => {
    const [h1, h2] = await Promise.all([hasher.hash('mesma-senha'), hasher.hash('mesma-senha')]);

    expect(h1).not.toBe(h2);
    expect(h1).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(h1).not.toContain('mesma-senha');
  });

  it('rejeita hash em formato desconhecido', async () => {
    await expect(hasher.verify('qualquer', 'md5$abc')).resolves.toBe(false);
  });
});
