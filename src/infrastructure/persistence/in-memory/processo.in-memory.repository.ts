import type { Processo } from '../../../domain/processo/processo.entity.js';
import type {
  CampoOrdenacaoProcesso,
  FiltroProcessos,
  ProcessoRepository,
} from '../../../domain/processo/processo.repository.js';
import type { Ordenacao, PageRequest, PageResult } from '../../../domain/shared/pagination.js';
import type { InMemoryDatabaseRegistry } from './in-memory-database.registry.js';

export class InMemoryProcessoRepository implements ProcessoRepository {
  constructor(private readonly registry: InMemoryDatabaseRegistry) {}

  async listar(
    tenantId: string,
    filtro: FiltroProcessos,
    { page, limit }: PageRequest,
    { campo, direcao }: Ordenacao<CampoOrdenacaoProcesso>,
  ): Promise<PageResult<Processo>> {
    const sinal = direcao === 'asc' ? 1 : -1;
    const filtrados = this.registry
      .get(tenantId)
      .processos.filter((p) => !filtro.status || p.status === filtro.status)
      .sort((a, b) => a[campo].localeCompare(b[campo]) * sinal);

    const inicio = (page - 1) * limit;
    return { data: structuredClone(filtrados.slice(inicio, inicio + limit)), total: filtrados.length, page };
  }
}
