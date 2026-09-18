export interface PageRequest {
  page: number;
  limit: number;
}

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
}

export type DirecaoOrdenacao = 'asc' | 'desc';

export interface Ordenacao<Campo extends string> {
  campo: Campo;
  direcao: DirecaoOrdenacao;
}

export const PAGINACAO = {
  pagePadrao: 1,
  limitPadrao: 20,
  limitMaximo: 100,
} as const;
