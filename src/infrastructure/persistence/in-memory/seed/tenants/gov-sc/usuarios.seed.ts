import type { UsuarioSeed } from '../../../tenant-database.js';

/** Senhas NÃO ficam aqui: cada usuário aponta para a variável do .env (senhaEnv). */
export const usuariosSeed: UsuarioSeed[] = [
  {
    id: '2c2ca2a1-b4bc-44bc-b1ba-d8e3ac9ccb01',
    nome: 'Administrador Governo SC',
    email: 'admin@sc.gov.br',
    senhaEnv: 'MOCK_SENHA_GOVSC_ADMIN',
    perfil: 'admin',
    ativo: true,
    criadoEm: '2026-01-02T12:00:00.000Z',
  },
];
