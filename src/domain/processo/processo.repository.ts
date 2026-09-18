import type { Ordenacao, PageRequest, PageResult } from '../shared/pagination.js';
import type { Processo, ProcessoStatus } from './processo.entity.js';

export interface FiltroProcessos {
  status?: ProcessoStatus;
}

export type CampoOrdenacaoProcesso = 'criadoEm';

/** PORT: todo acesso a processos exige o tenant como primeiro parâmetro. */
export interface ProcessoRepository {
  listar(
    tenantId: string,
    filtro: FiltroProcessos,
    pagina: PageRequest,
    ordenacao: Ordenacao<CampoOrdenacaoProcesso>,
  ): Promise<PageResult<Processo>>;
}
