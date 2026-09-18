import type { Processo, ProcessoStatus } from '../../domain/processo/processo.entity.js';
import type { ProcessoRepository } from '../../domain/processo/processo.repository.js';
import { ValidationError } from '../../domain/shared/errors.js';
import { PAGINACAO, type PageRequest, type PageResult } from '../../domain/shared/pagination.js';

export interface ListarProcessosInput {
  tenantId: string;
  status?: ProcessoStatus;
  page?: number;
  limit?: number;
}

export class ListarProcessosService {
  constructor(private readonly processoRepository: ProcessoRepository) {}

  async execute(input: ListarProcessosInput): Promise<PageResult<Processo>> {
    const pagina = this.resolverPagina(input);

    return this.processoRepository.listar(
      input.tenantId,
      { status: input.status },
      pagina,
      { campo: 'criadoEm', direcao: 'desc' },
    );
  }

  private resolverPagina({ page, limit }: ListarProcessosInput): PageRequest {
    const pagina = { page: page ?? PAGINACAO.pagePadrao, limit: limit ?? PAGINACAO.limitPadrao };
    const pageValida = Number.isInteger(pagina.page) && pagina.page >= 1;
    const limitValido = Number.isInteger(pagina.limit) && pagina.limit >= 1 && pagina.limit <= PAGINACAO.limitMaximo;

    if (!pageValida || !limitValido) {
      throw new ValidationError('REQUISICAO_INVALIDA', {
        details: [{ campo: pageValida ? 'limit' : 'page', mensagem: 'Valor de paginação inválido' }],
      });
    }
    return pagina;
  }
}
