import type { Processo } from '../../../../../../domain/processo/processo.entity.js';

export const processosSeed: Processo[] = [
  {
    id: '9ddf48b7-0b51-40e0-b1b4-d5b120f607ec',
    numero: 'JOI-2026/000100',
    titulo: 'Solicitação de alvará sanitário',
    status: 'em_andamento',
    criadoEm: '2026-01-05T12:00:00.000Z',
  },
  {
    id: '0841f257-b955-4b1f-b63c-9120ddd54862',
    numero: 'JOI-2026/000107',
    titulo: 'Pedido de reparo de pavimentação',
    status: 'concluido',
    criadoEm: '2026-01-22T13:13:00.000Z',
  },
  {
    id: '2dac6948-a6b0-4b71-bc23-feaa5def87aa',
    numero: 'JOI-2026/000114',
    titulo: 'Licitação — aquisição de merenda escolar',
    status: 'em_andamento',
    criadoEm: '2026-02-08T14:26:00.000Z',
  },
  {
    id: 'f57e5ea3-566a-4405-9d7a-a406a203bcc6',
    numero: 'JOI-2026/000121',
    titulo: 'Solicitação de transporte escolar',
    status: 'em_andamento',
    criadoEm: '2026-02-25T15:39:00.000Z',
  },
  {
    id: '9d4dadac-4cf8-44aa-b4b9-f88cca51842d',
    numero: 'JOI-2026/000128',
    titulo: 'Pedido de cópia de processo administrativo',
    status: 'concluido',
    criadoEm: '2026-03-14T16:52:00.000Z',
  },
  {
    id: '1362bbb2-55fc-423d-ae9a-1610a7eefab6',
    numero: 'JOI-2026/000135',
    titulo: 'Autorização para feira de bairro',
    status: 'em_andamento',
    criadoEm: '2026-03-31T17:05:00.000Z',
  },
  {
    id: '19de335b-939f-4c5a-8956-6317f372d753',
    numero: 'JOI-2026/000142',
    titulo: 'Solicitação de limpeza de terreno baldio',
    status: 'em_andamento',
    criadoEm: '2026-04-17T12:18:00.000Z',
  },
];
