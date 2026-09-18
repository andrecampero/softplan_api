import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { PasswordHasher } from '../../domain/auth/password-hasher.js';

const PARAMETROS = { N: 16384, r: 8, p: 1 } as const;
const TAMANHO_SALT = 16;
const TAMANHO_CHAVE = 64;

function derivar(senha: string, salt: Buffer, opcoes: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, TAMANHO_CHAVE, opcoes, (erro, chave) => (erro ? reject(erro) : resolve(chave)));
  });
}

/** Formato: scrypt$N$r$p$saltBase64$hashBase64 */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(senha: string): Promise<string> {
    const salt = randomBytes(TAMANHO_SALT);
    const chave = await derivar(senha, salt, PARAMETROS);
    const { N, r, p } = PARAMETROS;
    return ['scrypt', N, r, p, salt.toString('base64'), chave.toString('base64')].join('$');
  }

  async verify(senha: string, hashArmazenado: string): Promise<boolean> {
    const [algoritmo, N, r, p, salt, chave] = hashArmazenado.split('$');
    if (algoritmo !== 'scrypt' || !N || !r || !p || !salt || !chave) return false;

    const esperado = Buffer.from(chave, 'base64');
    const calculado = await derivar(senha, Buffer.from(salt, 'base64'), { N: Number(N), r: Number(r), p: Number(p) });
    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
  }
}
