import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { processosSeed as florianopolis } from '../../src/infrastructure/persistence/in-memory/seed/tenants/pref-florianopolis/processos.seed.js';
import { processosSeed as joinville } from '../../src/infrastructure/persistence/in-memory/seed/tenants/pref-joinville/processos.seed.js';
import { criarAppDeTeste, USUARIOS, type AppDeTeste } from '../helpers/criar-app-de-teste.js';

describe('GET /processos', () => {
  let t: AppDeTeste;
  let tokenFlorianopolis: string;

  const get = (headers: Record<string, string>, query = '') => t.app.inject({ method: 'GET', url: `/processos${query}`, headers });
  const autenticado = (query = '') =>
    get({ 'x-tenant-id': 'pref-florianopolis', authorization: `Bearer ${tokenFlorianopolis}` }, query);

  beforeAll(async () => {
    t = await criarAppDeTeste();
    tokenFlorianopolis = await t.obterToken(USUARIOS.florianopolisAdmin);
  });

  afterEach(() => vi.useRealTimers());

  describe('validação do tenant (antes de qualquer lógica)', () => {
    it('retorna 400 TENANT_ID_OBRIGATORIO sem o header x-tenant-id e não chama o Service', async () => {
      const execute = vi.fn();
      const isolado = await criarAppDeTeste({ sobrescrever: { listarProcessosService: { execute } } });

      const resposta = await isolado.app.inject({ method: 'GET', url: '/processos' });

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().error).toMatchObject({
        code: 'TENANT_ID_OBRIGATORIO',
        message: 'Não foi possível identificar o órgão. Informe o cabeçalho x-tenant-id.',
      });
      expect(execute).not.toHaveBeenCalled();
    });

    it('retorna 400 TENANT_ID_INVALIDO para formato inválido', async () => {
      const resposta = await get({ 'x-tenant-id': 'Tenant Inválido!' });

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().error.code).toBe('TENANT_ID_INVALIDO');
    });

    it('retorna 403 TENANT_NAO_AUTORIZADO para tenant não cadastrado', async () => {
      const resposta = await get({ 'x-tenant-id': 'pref-inexistente' });

      expect(resposta.statusCode).toBe(403);
      expect(resposta.json().error.code).toBe('TENANT_NAO_AUTORIZADO');
    });
  });

  describe('autenticação', () => {
    it('retorna 401 TOKEN_AUSENTE sem Authorization', async () => {
      const resposta = await get({ 'x-tenant-id': 'pref-florianopolis' });

      expect(resposta.statusCode).toBe(401);
      expect(resposta.json().error.code).toBe('TOKEN_AUSENTE');
    });

    it('retorna 401 TOKEN_INVALIDO para token adulterado', async () => {
      const resposta = await get({ 'x-tenant-id': 'pref-florianopolis', authorization: `Bearer ${tokenFlorianopolis}x` });

      expect(resposta.statusCode).toBe(401);
      expect(resposta.json().error.code).toBe('TOKEN_INVALIDO');
    });

    it('retorna 401 TOKEN_EXPIRADO depois de 1 hora', async () => {
      vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-18T12:00:00Z') });
      const token = await t.obterToken(USUARIOS.florianopolisServidor);
      vi.setSystemTime(new Date('2026-09-18T13:00:01Z'));

      const resposta = await get({ 'x-tenant-id': 'pref-florianopolis', authorization: `Bearer ${token}` });

      expect(resposta.statusCode).toBe(401);
      expect(resposta.json().error).toMatchObject({ code: 'TOKEN_EXPIRADO', message: 'Sua sessão expirou. Faça login novamente.' });
    });

    it('retorna 403 TENANT_TOKEN_DIVERGENTE com token de outro tenant', async () => {
      const resposta = await get({ 'x-tenant-id': 'pref-joinville', authorization: `Bearer ${tokenFlorianopolis}` });

      expect(resposta.statusCode).toBe(403);
      expect(resposta.json().error.code).toBe('TENANT_TOKEN_DIVERGENTE');
    });
  });

  describe('contrato de resposta', () => {
    it('retorna 200 com { data, total, page } apenas com processos do tenant', async () => {
      const resposta = await autenticado();
      const corpo = resposta.json();

      expect(resposta.statusCode).toBe(200);
      expect(Object.keys(corpo).sort()).toEqual(['data', 'page', 'total']);
      expect(corpo).toMatchObject({ total: florianopolis.length, page: 1 });
      const idsDoTenant = new Set(florianopolis.map((p) => p.id));
      expect(corpo.data.every((p: { id: string }) => idsDoTenant.has(p.id))).toBe(true);
      expect(Object.keys(corpo.data[0]).sort()).toEqual(['criadoEm', 'id', 'numero', 'status', 'titulo']);
    });

    it('filtra por status', async () => {
      const corpo = (await autenticado('?status=concluido')).json();

      expect(corpo.total).toBe(florianopolis.filter((p) => p.status === 'concluido').length);
      expect(corpo.data.every((p: { status: string }) => p.status === 'concluido')).toBe(true);
    });

    it('pagina com page e limit', async () => {
      const corpo = (await autenticado('?page=2&limit=5')).json();

      expect(corpo).toMatchObject({ page: 2, total: florianopolis.length });
      expect(corpo.data).toHaveLength(5);
    });

    it('retorna 400 REQUISICAO_INVALIDA com detalhes em português para status inválido', async () => {
      const resposta = await autenticado('?status=arquivado');

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().error.code).toBe('REQUISICAO_INVALIDA');
      expect(resposta.json().error.details[0].campo).toBe('status');
    });

    it('isola os dados: Joinville vê apenas os seus processos', async () => {
      const token = await t.obterToken(USUARIOS.joinvilleAdmin);
      const corpo = (await get({ 'x-tenant-id': 'pref-joinville', authorization: `Bearer ${token}` })).json();
      const idsFlorianopolis = new Set(florianopolis.map((p) => p.id));

      expect(corpo.total).toBe(joinville.length);
      expect(corpo.data.some((p: { id: string }) => idsFlorianopolis.has(p.id))).toBe(false);
    });

    it('retorna lista vazia para tenant sem processos (gov-sc)', async () => {
      const token = await t.obterToken(USUARIOS.govScAdmin);
      const corpo = (await get({ 'x-tenant-id': 'gov-sc', authorization: `Bearer ${token}` })).json();

      expect(corpo).toEqual({ data: [], total: 0, page: 1 });
    });

    it('responde com Cache-Control: no-store e x-request-id', async () => {
      const resposta = await autenticado();

      expect(resposta.headers['cache-control']).toBe('no-store');
      expect(resposta.headers['x-request-id']).toBeTruthy();
    });
  });
});
