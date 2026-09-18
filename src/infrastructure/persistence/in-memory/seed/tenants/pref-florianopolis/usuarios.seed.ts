import type { UsuarioSeed } from '../../../tenant-database.js';

/** Senhas NÃO ficam aqui: cada usuário aponta para a variável do .env (senhaEnv). */
export const usuariosSeed: UsuarioSeed[] = [
  {
    id: '0902ecdb-fb10-422e-acd2-7c644cf981a0',
    nome: 'Administrador Florianópolis',
    email: 'admin@florianopolis.sc.gov.br',
    senhaEnv: 'MOCK_SENHA_FLORIANOPOLIS_ADMIN',
    perfil: 'admin',
    ativo: true,
    criadoEm: '2026-01-02T12:00:00.000Z',
  },
  {
    id: '6bed8955-567c-401d-98c0-a3cd78b147df',
    nome: 'Servidor Florianópolis',
    email: 'servidor@florianopolis.sc.gov.br',
    senhaEnv: 'MOCK_SENHA_FLORIANOPOLIS_SERVIDOR',
    perfil: 'servidor',
    ativo: true,
    criadoEm: '2026-01-03T12:00:00.000Z',
  },
];
