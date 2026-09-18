import { describe, expect, it } from 'vitest';
import { criarAppDeTeste, USUARIOS } from '../helpers/criar-app-de-teste.js';

describe('Tratamento de erros e logs', () => {
  it('erro inesperado vira 500 com mensagem amigável e requestId, e o stack vai só para o log', async () => {
    const t = await criarAppDeTeste({
      sobrescrever: {
        listarProcessosService: {
          execute: () => {
            throw new TypeError('Cannot read properties of undefined (detalhe interno)');
          },
        },
      },
    });
    const token = await t.obterToken(USUARIOS.florianopolisAdmin);

    const resposta = await t.app.inject({
      method: 'GET',
      url: '/processos',
      headers: { 'x-tenant-id': 'pref-florianopolis', authorization: `Bearer ${token}` },
    });
    const { error } = resposta.json();

    expect(resposta.statusCode).toBe(500);
    expect(error.code).toBe('ERRO_INTERNO');
    expect(error.message).toContain('Ocorreu um erro inesperado');
    expect(error.message).toContain(error.requestId);
    expect(resposta.body).not.toContain('detalhe interno');
    expect(resposta.body).not.toContain('TypeError');

    const linha = t.lerLog().find((l) => l.requestId === error.requestId);
    expect(linha).toMatchObject({ level: 'error', code: 'ERRO_INTERNO', statusCode: 500, tenantId: 'pref-florianopolis' });
    expect(linha?.err?.stack).toContain('TypeError');
  });

  it.each([
    ['400 sem tenant', { method: 'GET', url: '/processos' }, 'TENANT_ID_OBRIGATORIO'],
    ['401 sem token', { method: 'GET', url: '/processos', headers: { 'x-tenant-id': 'gov-sc' } }, 'TOKEN_AUSENTE'],
    ['403 tenant desconhecido', { method: 'GET', url: '/processos', headers: { 'x-tenant-id': 'nao-existe' } }, 'TENANT_NAO_AUTORIZADO'],
    ['404 rota inexistente', { method: 'GET', url: '/nao-existe' }, 'ROTA_NAO_ENCONTRADA'],
  ] as const)('registra %s no log como warn com o mesmo requestId da resposta', async (_caso, requisicao, code) => {
    const t = await criarAppDeTeste();

    const resposta = await t.app.inject(requisicao);
    const { requestId } = resposta.json().error;

    expect(t.lerLog()).toContainEqual(expect.objectContaining({ level: 'warn', code, requestId }));
    expect(resposta.headers['x-request-id']).toBe(requestId);
  });

  it('JSON malformado vira 400 REQUISICAO_INVALIDA', async () => {
    const t = await criarAppDeTeste();

    const resposta = await t.app.inject({
      method: 'POST',
      url: '/auth/token',
      headers: { 'x-tenant-id': 'gov-sc', 'content-type': 'application/json' },
      payload: '{"email": ',
    });

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().error.code).toBe('REQUISICAO_INVALIDA');
  });

  it('nunca grava senha nem token no log', async () => {
    const t = await criarAppDeTeste();
    const token = await t.obterToken(USUARIOS.florianopolisAdmin);

    await t.app.inject({
      method: 'POST',
      url: '/auth/token',
      headers: { 'x-tenant-id': 'pref-florianopolis' },
      payload: { email: USUARIOS.florianopolisAdmin.email, senha: 'SenhaSecretaQueNaoPodeVazar' },
    });
    await t.app.inject({ method: 'GET', url: '/processos', headers: { 'x-tenant-id': 'pref-joinville', authorization: `Bearer ${token}` } });

    const conteudo = JSON.stringify(t.lerLog());
    expect(t.lerLog().length).toBeGreaterThan(0);
    expect(conteudo).not.toContain('SenhaSecretaQueNaoPodeVazar');
    expect(conteudo).not.toContain(token);
  });

  it('usa o x-request-id recebido quando válido', async () => {
    const t = await criarAppDeTeste();

    const resposta = await t.app.inject({ method: 'GET', url: '/processos', headers: { 'x-request-id': 'rastreio-12345678' } });

    expect(resposta.json().error.requestId).toBe('rastreio-12345678');
  });
});
