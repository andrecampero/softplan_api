# softplan_api — 1DOC: nova camada de API

## 1. Objetivo

O **1DOC** é uma plataforma SaaS de gestão de documentos e trâmites usada por governos
municipais e estaduais. O backend legado (monolito PHP + MySQL, um banco por cliente) é
rígido e tem regras de negócio acopladas.

Este repositório é a **fundação da nova camada de API**, que permite a governos conectar
sistemas externos de forma **segura, escalável e multitenant**, sem reescrever o legado de
uma vez (*Strangler Fig*). Ela entrega um contrato OpenAPI consumido pelo frontend
([softplan_web](https://github.com/andrecampero/softplan_web)).

Hoje os dados são **mockados em memória**, com uma base separada por cliente (tenant).

> Regras de arquitetura, convenções e o passo a passo para criar endpoints estão no
> [CLAUDE.md](CLAUDE.md). Leia antes de alterar o código.

## 2. Stack

Node.js 22 (ver `.nvmrc`) · TypeScript · Fastify 5 · Zod 4 · JWT (`jose`) · `scrypt`
(`node:crypto`) · `@fastify/rate-limit` · pino · Vitest · ESLint.

## 3. Pré-requisitos

- Node.js 22 e npm.
- Não é preciso Docker nem banco de dados.

## 4. Como subir

```bash
npm install
npm run setup        # gera o .env com JWT_SECRET e senhas aleatórias e as exibe UMA vez
npm run dev          # http://localhost:3333
```

- Documentação interativa (Swagger): http://localhost:3333/docs
- Healthcheck: http://localhost:3333/health

Prefere preencher manualmente? `cp .env.example .env` e troque cada `troque-me`:

| Variável | Para quê |
|---|---|
| `PORT`, `HOST` | Porta e interface do servidor (padrão 3333 / 0.0.0.0) |
| `CORS_ORIGIN` | Origens do frontend liberadas (padrão `http://localhost:5173`) |
| `JWT_SECRET` | Segredo do token, **mínimo 32 caracteres**. Gere com `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `RATE_LIMIT_*` | Limites por minuto: IP (600), usuário (120), login por conta (5), login por origem (30) |
| `LOG_FILE`, `LOG_LEVEL` | Arquivo de log de erros (`logs/log_api.log`) e nível do console |
| `MOCK_SENHA_*` | Senha de cada usuário mock (mínimo 8 caracteres) |

A API **não sobe** se faltar alguma variável ou se ainda houver `troque-me`, e o console
lista quais variáveis corrigir.

## 5. Como testar

```bash
npm test             # testes em modo watch
npm run test:ci      # todos os testes + cobertura (igual ao CI)
npm run lint
npm run typecheck
```

Fluxo manual com `curl`: primeiro obtenha o token, depois consulte. A senha é lida do
`.env`; nunca a escreva em arquivos.

```bash
SENHA=$(grep ^MOCK_SENHA_FLORIANOPOLIS_ADMIN .env | cut -d= -f2-)

TOKEN=$(curl -s -X POST http://localhost:3333/auth/token \
  -H 'content-type: application/json' -H 'x-tenant-id: pref-florianopolis' \
  -d "{\"email\":\"admin@florianopolis.sc.gov.br\",\"senha\":\"$SENHA\"}" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')

curl -s "http://localhost:3333/processos?status=em_andamento" \
  -H 'x-tenant-id: pref-florianopolis' -H "authorization: Bearer $TOKEN"
```

Após mudar um endpoint, atualize o contrato com `npm run openapi:export`, que gera
`openapi.json`.

## 6. Estrutura de pastas

```
src/domain/          entidades, ports (interfaces) e erros; sem dependências externas
src/application/     Services: toda regra de negócio e fluxo
src/infrastructure/  Fastify (rotas, schemas, plugins), JWT, scrypt, logs, mocks em memória
src/main/            config (.env), composition root e bootstrap
test/integration/    testes HTTP com app.inject()
scripts/             setup do .env e exportação do OpenAPI
```

Arquitetura hexagonal (Ports & Adapters). Detalhes e justificativa no [CLAUDE.md](CLAUDE.md).

## 7. Tenants e usuários mock

Cada cliente tem sua própria base em
`src/infrastructure/persistence/in-memory/seed/tenants/<tenant-id>/`.

| Tenant (`x-tenant-id`) | E-mail | Variável da senha no `.env` | Observação |
|---|---|---|---|
| `pref-florianopolis` | admin@florianopolis.sc.gov.br | `MOCK_SENHA_FLORIANOPOLIS_ADMIN` | 12 processos |
| `pref-florianopolis` | servidor@florianopolis.sc.gov.br | `MOCK_SENHA_FLORIANOPOLIS_SERVIDOR` | |
| `pref-joinville` | admin@joinville.sc.gov.br | `MOCK_SENHA_JOINVILLE_ADMIN` | 7 processos |
| `pref-joinville` | inativo@joinville.sc.gov.br | `MOCK_SENHA_JOINVILLE_INATIVO` | usuário inativo: o login falha |
| `gov-sc` | admin@sc.gov.br | `MOCK_SENHA_GOVSC_ADMIN` | nenhum processo (lista vazia) |

O token expira em **1 hora**.

## 8. Erros e logs

Todo erro segue um único formato, com mensagem amigável em pt-BR:

```json
{ "error": { "code": "TOKEN_EXPIRADO", "message": "Sua sessão expirou. Faça login novamente.", "requestId": "9f1c…" } }
```

Os erros são gravados em `logs/log_api.log`, uma linha JSON por erro: `warn` para 4xx e
`error` para 5xx, com stack. Senhas e tokens nunca são gravados. Para rastrear um erro
relatado por um usuário, procure o `requestId`:

```bash
grep '"requestId":"9f1c' logs/log_api.log
```

## 9. Solução de problemas

| Sintoma | Causa / solução |
|---|---|
| `A API não foi iniciada. Configuração inválida no .env` | Rode `npm run setup` ou corrija as variáveis listadas |
| `EADDRINUSE :3333` | Porta ocupada: altere `PORT` no `.env` ou encerre o outro processo |
| Frontend com erro de CORS | Confira se `CORS_ORIGIN` contém a URL do frontend |
| `429 RATE_LIMIT_EXCEDIDO` em testes manuais | Aguarde o tempo indicado em `retryAfterSeconds` ou aumente `RATE_LIMIT_*` no `.env` local |
| `401 CREDENCIAIS_INVALIDAS` com a senha certa | A senha precisa ser igual à do `.env` **atual**; após `npm run setup -- --force`, as senhas mudam |
| `403 TENANT_TOKEN_DIVERGENTE` | O token foi emitido para outro tenant: faça login no órgão do header `x-tenant-id` |
