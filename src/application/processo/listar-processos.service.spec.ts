import { beforeEach, describe, expect, it } from 'vitest';
import type { Processo } from '../../domain/processo/processo.entity.js';
import { ValidationError } from '../../domain/shared/errors.js';
import { InMemoryDatabaseRegistry } from '../../infrastructure/persistence/in-memory/in-memory-database.registry.js';
import { InMemoryProcessoRepository } from '../../infrastructure/persistence/in-memory/processo.in-memory.repository.js';
import { ListarProcessosService } from './listar-processos.service.js';

function processo(id: string, status: Processo['status'], criadoEm: string): Processo {
  return { id, numero: `2026/${id}`, titulo: `Processo ${id}`, status, criadoEm };
}

const PROCESSOS_TENANT_A: Processo[] = [
  processo('a1', 'em_andamento', '2026-01-01T10:00:00.000Z'),
  processo('a2', 'concluido', '2026-03-01T10:00:00.000Z'),
  processo('a3', 'em_andamento', '2026-02-01T10:00:00.000Z'),
];

const PROCESSOS_TENANT_B: Processo[] = [processo('b1', 'em_andamento', '2026-04-01T10:00:00.000Z')];

describe('ListarProcessosService', () => {
  let service: ListarProcessosService;

  beforeEach(() => {
    const registry = InMemoryDatabaseRegistry.fromDatabases({
      'tenant-a': { usuarios: [], processos: PROCESSOS_TENANT_A },
      'tenant-b': { usuarios: [], processos: PROCESSOS_TENANT_B },
      'tenant-vazio': { usuarios: [], processos: [] },
    });
    service = new ListarProcessosService(new InMemoryProcessoRepository(registry));
  });

  it('lista todos os processos do tenant quando não há filtro de status', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-a' });

    expect(resultado.total).toBe(3);
    expect(resultado.page).toBe(1);
    expect(resultado.data.map((p) => p.id).sort()).toEqual(['a1', 'a2', 'a3']);
  });

  it('não retorna processos de outro tenant', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-b' });

    expect(resultado.data.map((p) => p.id)).toEqual(['b1']);
    expect(resultado.data.some((p) => p.id.startsWith('a'))).toBe(false);
  });

  it('filtra por status em_andamento', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-a', status: 'em_andamento' });

    expect(resultado.total).toBe(2);
    expect(resultado.data.every((p) => p.status === 'em_andamento')).toBe(true);
  });

  it('filtra por status concluido', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-a', status: 'concluido' });

    expect(resultado.data.map((p) => p.id)).toEqual(['a2']);
  });

  it('ordena por data de criação, do mais recente para o mais antigo', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-a' });

    expect(resultado.data.map((p) => p.id)).toEqual(['a2', 'a3', 'a1']);
  });

  it('pagina o resultado mantendo o total geral', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-a', page: 2, limit: 2 });

    expect(resultado).toMatchObject({ total: 3, page: 2 });
    expect(resultado.data.map((p) => p.id)).toEqual(['a1']);
  });

  it('retorna lista vazia com total zero para tenant sem processos', async () => {
    const resultado = await service.execute({ tenantId: 'tenant-vazio' });

    expect(resultado).toEqual({ data: [], total: 0, page: 1 });
  });

  it('aplica o limite padrão de 20 itens por página', async () => {
    const muitos = Array.from({ length: 25 }, (_, i) =>
      processo(`m${i}`, 'em_andamento', new Date(Date.UTC(2026, 0, i + 1)).toISOString()),
    );
    const registry = InMemoryDatabaseRegistry.fromDatabases({ t: { usuarios: [], processos: muitos } });
    const resultado = await new ListarProcessosService(new InMemoryProcessoRepository(registry)).execute({ tenantId: 't' });

    expect(resultado.data).toHaveLength(20);
    expect(resultado.total).toBe(25);
  });

  it.each([
    { page: 0, limit: 20 },
    { page: 1, limit: 0 },
    { page: 1, limit: 101 },
    { page: 1.5, limit: 20 },
  ])('rejeita paginação inválida %o', async (paginacao) => {
    await expect(service.execute({ tenantId: 'tenant-a', ...paginacao })).rejects.toBeInstanceOf(ValidationError);
  });
});
