export const PROCESSO_STATUS = ['em_andamento', 'concluido'] as const;

export type ProcessoStatus = (typeof PROCESSO_STATUS)[number];

export interface Processo {
  id: string;
  numero: string;
  titulo: string;
  status: ProcessoStatus;
  /** ISO 8601 em UTC. */
  criadoEm: string;
}
