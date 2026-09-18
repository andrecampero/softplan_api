import { describe, expect, it } from 'vitest';
import { criarAppDeTeste, USUARIOS } from '../helpers/criar-app-de-teste.js';

describe('Rate limit', () => {
  it('bloqueia a 6ª tentativa de login na mesma conta com mensagem amigável e Retry-After', async () => {
    const t = await criarAppDeTeste({ rateLimit: { loginMax: 5 } });
    const tentar = () =>
      t.app.inject({
        method: 'POST',
        url: '/auth/token',
        headers: { 'x-tenant-id': 'pref-florianopolis' },
        payload: { email: USUARIOS.florianopolisAdmin.email, senha: 'senha-errada' },
      });

    for (let i = 0; i < 5; i++) expect((await tentar()).statusCode).toBe(401);
    const bloqueada = await tentar();

    expect(bloqueada.statusCode).toBe(429);
    expect(Number(bloqueada.headers['retry-after'])).toBeGreaterThan(0);
    expect(bloqueada.json().error).toMatchObject({ code: 'RATE_LIMIT_EXCEDIDO', retryAfterSeconds: expect.any(Number) });
    expect(bloqueada.json().error.message).toMatch(/^Muitas tentativas de login\. Por segurança, aguarde/);
  });

  it('o bloqueio de login de uma conta não bloqueia outra conta do mesmo IP', async () => {
    const t = await criarAppDeTeste({ rateLimit: { loginMax: 2 } });
    const tentar = (email: string) =>
      t.app.inject({ method: 'POST', url: '/auth/token', headers: { 'x-tenant-id': 'pref-florianopolis' }, payload: { email, senha: 'errada' } });

    await tentar(USUARIOS.florianopolisAdmin.email);
    await tentar(USUARIOS.florianopolisAdmin.email);
    expect((await tentar(USUARIOS.florianopolisAdmin.email)).statusCode).toBe(429);

    expect((await tentar(USUARIOS.florianopolisServidor.email)).statusCode).toBe(401);
  });

  it('a cota da API é por usuário: bloquear um usuário não afeta colegas do mesmo IP nem outros tenants', async () => {
    const t = await criarAppDeTeste({ rateLimit: { usuarioMax: 3 } });
    const [admin, servidor, joinville] = await Promise.all([
      t.obterToken(USUARIOS.florianopolisAdmin),
      t.obterToken(USUARIOS.florianopolisServidor),
      t.obterToken(USUARIOS.joinvilleAdmin),
    ]);
    const listar = (tenant: string, token: string) =>
      t.app.inject({ method: 'GET', url: '/processos', headers: { 'x-tenant-id': tenant, authorization: `Bearer ${token}` } });

    for (let i = 0; i < 3; i++) expect((await listar('pref-florianopolis', admin)).statusCode).toBe(200);
    const bloqueada = await listar('pref-florianopolis', admin);

    expect(bloqueada.statusCode).toBe(429);
    expect(bloqueada.json().error.message).toMatch(/^Você fez muitas requisições em pouco tempo\. Aguarde/);
    expect((await listar('pref-florianopolis', servidor)).statusCode).toBe(200);
    expect((await listar('pref-joinville', joinville)).statusCode).toBe(200);
  });

  it('camada anti-flood por IP bloqueia excesso, mas não limita /health', async () => {
    const t = await criarAppDeTeste({ rateLimit: { ipMax: 2 } });

    for (let i = 0; i < 5; i++) expect((await t.app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    await t.app.inject({ method: 'GET', url: '/processos' });
    await t.app.inject({ method: 'GET', url: '/processos' });

    expect((await t.app.inject({ method: 'GET', url: '/processos' })).statusCode).toBe(429);
  });

  it('registra no log apenas o primeiro bloqueio de cada chave por janela', async () => {
    const t = await criarAppDeTeste({ rateLimit: { ipMax: 1 } });

    for (let i = 0; i < 6; i++) await t.app.inject({ method: 'GET', url: '/rota-qualquer' });

    const bloqueios = t.lerLog().filter((l) => l.code === 'RATE_LIMIT_EXCEDIDO');
    expect(bloqueios).toHaveLength(1);
    expect(bloqueios[0]).toMatchObject({ level: 'warn', camada: 'ip' });
  });
});
