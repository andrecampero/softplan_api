import type { UsuarioSeed } from '../../../tenant-database.js';

/** Senhas NÃO ficam aqui: cada usuário aponta para a variável do .env (senhaEnv). */
export const usuariosSeed: UsuarioSeed[] = [
  {
    id: 'ba6b450a-07fa-499e-bbb1-5f2fa2b8e273',
    nome: 'Administrador Joinville',
    email: 'admin@joinville.sc.gov.br',
    senhaEnv: 'MOCK_SENHA_JOINVILLE_ADMIN',
    perfil: 'admin',
    ativo: true,
    criadoEm: '2026-01-02T12:00:00.000Z',
  },
  {
    id: '7f7c302d-61b9-4092-9f59-c1ea9369e25b',
    nome: 'Servidor Inativo Joinville',
    email: 'inativo@joinville.sc.gov.br',
    senhaEnv: 'MOCK_SENHA_JOINVILLE_INATIVO',
    perfil: 'servidor',
    ativo: false,
    criadoEm: '2026-01-04T12:00:00.000Z',
  },
];
