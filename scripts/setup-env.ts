/**
 * Gera o .env a partir do .env.example, trocando cada "troque-me" por um valor
 * aleatório forte. As senhas são exibidas UMA vez no terminal e ficam só no .env
 * (que não é versionado). Uso: npm run setup [-- --force]
 */
import { randomBytes, randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ARQUIVO_EXEMPLO = '.env.example';
const ARQUIVO_ENV = '.env';
const PLACEHOLDER = 'troque-me';

const EMAILS: Record<string, string> = {
  MOCK_SENHA_FLORIANOPOLIS_ADMIN: 'pref-florianopolis  admin@florianopolis.sc.gov.br',
  MOCK_SENHA_FLORIANOPOLIS_SERVIDOR: 'pref-florianopolis  servidor@florianopolis.sc.gov.br',
  MOCK_SENHA_JOINVILLE_ADMIN: 'pref-joinville      admin@joinville.sc.gov.br',
  MOCK_SENHA_JOINVILLE_INATIVO: 'pref-joinville      inativo@joinville.sc.gov.br (inativo: login deve falhar)',
  MOCK_SENHA_GOVSC_ADMIN: 'gov-sc              admin@sc.gov.br (tenant sem processos)',
};

/** Símbolos sem significado especial no .env (# inicia comentário) nem no shell. */
function senhaForte(): string {
  const grupos = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@%+-_.'];
  const todos = grupos.join('');
  const caracteres = grupos.map((g) => g[randomInt(g.length)]);
  while (caracteres.length < 16) caracteres.push(todos[randomInt(todos.length)] ?? 'x');
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j] ?? '', caracteres[i] ?? ''];
  }
  return caracteres.join('');
}

if (existsSync(ARQUIVO_ENV) && !process.argv.includes('--force')) {
  console.error(`O arquivo ${ARQUIVO_ENV} já existe. Use "npm run setup -- --force" para gerar um novo.`);
  process.exit(1);
}

const geradas: Array<[string, string]> = [];
const conteudo = readFileSync(ARQUIVO_EXEMPLO, 'utf8')
  .split('\n')
  .map((linha) => {
    const [nome, valor] = linha.split('=');
    if (!nome || valor !== PLACEHOLDER) return linha;
    const novo = nome === 'JWT_SECRET' ? randomBytes(48).toString('base64') : senhaForte();
    if (nome !== 'JWT_SECRET') geradas.push([nome, novo]);
    return `${nome}=${novo}`;
  })
  .join('\n');

writeFileSync(ARQUIVO_ENV, conteudo, { mode: 0o600 });

console.log(`\n✅ ${ARQUIVO_ENV} gerado com JWT_SECRET e senhas aleatórias.\n`);
console.log('Usuários mock (guarde as senhas; elas ficam apenas no .env):\n');
for (const [nome, senha] of geradas) console.log(`  ${EMAILS[nome] ?? nome}\n    senha: ${senha}\n`);
