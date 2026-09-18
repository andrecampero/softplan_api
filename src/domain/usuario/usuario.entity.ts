export const PERFIS = ['admin', 'servidor'] as const;

export type Perfil = (typeof PERFIS)[number];

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  /** Hash scrypt. Nunca sai do repositório para uma resposta HTTP ou log. */
  senhaHash: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
}
