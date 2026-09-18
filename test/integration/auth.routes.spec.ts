import { beforeAll, describe, expect, it } from 'vitest';
import { criarAppDeTeste, USUARIOS, type AppDeTeste } from '../helpers/criar-app-de-teste.js';

describe('POST /auth/token', () => {
  let t: AppDeTeste;

  const login = (tenant: string | undefined, payload: object) =>
    t.app.inject({ method: 'POST', url: '/auth/token', headers: tenant ? { 'x-tenant-id': tenant } : {}, payload });

  beforeAll(async () => {
    t = await criarAppDeTeste();
  });

  it('emite token Bearer válido por 1 hora, sem cache', async () => {
    const { tenant, email, senhaEnv } = USUARIOS.florianopolisAdmin;
    const resposta = await login(tenant, { email, senha: t.senhas[senhaEnv] });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toMatchObject({ tokenType: 'Bearer', expiresIn: 3600 });
    expect(resposta.json().accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(resposta.headers['cache-control']).toBe('no-store');
  });

  it.each([
    ['senha errada', USUARIOS.florianopolisAdmin.tenant, USUARIOS.florianopolisAdmin.email, 'senha-errada'],
    ['e-mail inexistente', USUARIOS.florianopolisAdmin.tenant, 'ninguem@florianopolis.sc.gov.br', 'qualquer-senha'],
  ])('retorna 401 CREDENCIAIS_INVALIDAS genérico para %s', async (_caso, tenant, email, senha) => {
    const resposta = await login(tenant, { email, senha });

    expect(resposta.statusCode).toBe(401);
    expect(resposta.json().error).toMatchObject({ code: 'CREDENCIAIS_INVALIDAS', message: 'E-mail ou senha incorretos.' });
  });

  it('não autentica usuário inativo', async () => {
    const { tenant, email, senhaEnv } = USUARIOS.joinvilleInativo;

    expect((await login(tenant, { email, senha: t.senhas[senhaEnv] })).statusCode).toBe(401);
  });

  it('não autentica usuário de um tenant no outro', async () => {
    const { email, senhaEnv } = USUARIOS.joinvilleAdmin;

    expect((await login('pref-florianopolis', { email, senha: t.senhas[senhaEnv] })).statusCode).toBe(401);
  });

  it('retorna 400 sem x-tenant-id', async () => {
    const resposta = await login(undefined, { email: 'a@b.gov.br', senha: 'x' });

    expect(resposta.json().error.code).toBe('TENANT_ID_OBRIGATORIO');
  });

  it('retorna 400 REQUISICAO_INVALIDA para e-mail inválido', async () => {
    const resposta = await login('pref-florianopolis', { email: 'nao-e-email', senha: 'x' });

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().error.details[0].campo).toBe('email');
  });
});
