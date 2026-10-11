# Decisões que complementam e substituem o spec original

Resultado da sessão de grilling. Onde este arquivo e o spec original divergirem, vale este. Termos de domínio em [GLOSSARY.md](../GLOSSARY.md); decisões estruturais em [docs/adr](adr).

## Escopo

- **MVP = Fases 1 a 3** (núcleo, dashboard offline, servidor com auth e backup). Dashboard do MVP: saldo, receitas e despesas do mês, despesas por categoria, últimos lançamentos.
- Fase 4 (Tailscale) e Fase 5 (orçamentos, metas, patrimônio, layout configurável) são incrementos. Tabelas `budgets`, `goals`, `assets`, `asset_valuations` e `dashboard_configs` só entram na migration da fase que as usa.

## Dados

- Valores em centavos inteiros; **somente BRL** (CHECK em `accounts.currency`).
- IDs: `INTEGER PRIMARY KEY` autoincremental.
- `transaction_date`: texto `YYYY-MM-DD`, data local, sem hora. `created_at`/`updated_at`: UTC ISO 8601.
- Transfer: duas pernas com sinal (ADR 0002). Categoria nula nas pernas.
- `status`: `pending` | `posted`; só `posted` conta em saldos e totais.
- Cartão e empréstimo são `accounts` de tipo próprio com saldo negativo permitido; pagar a fatura é uma transferência. Sem modelo de fatura, limite ou parcelas.
- Categorias: no máximo 2 níveis; gráficos agrupam pela categoria-pai; `type` da transação igual ao da categoria. Banco novo vem com categorias padrão em PT-BR.
- Exclusão: transações são apagadas de verdade (apagar uma perna apaga o Transfer). Conta ou categoria com histórico só é arquivada (`is_active = 0`).
- Fase 5: `assets.quantity_e8` inteiro (10⁻⁸); orçamento por categoria e mês `YYYY-MM`, cópia manual do mês anterior, sem rollover, categoria-pai inclui filhas; metas com `account_id` opcional, senão `current_amount_cents` manual; `layout_json` com enum fixa de widgets, props validadas por Zod versionado e widgets inválidos descartados.

## Arquitetura

- Um único código SQL para os dois modos (ADR 0001); migrations rodam no navegador e no servidor.
- Importar banco: versão menor é migrada após oferecer cópia do original; versão maior ou arquivo inválido é rejeitado sem tocar nos dados carregados; limite padrão 50 MB, configurável.
- Usuário único por instalação. Senha definida por `npm run set-password` (hash argon2 em arquivo de configuração fora do SQLite e do Git). O servidor recusa escutar fora de `127.0.0.1` sem senha. Modo offline não tem auth.
- Edição concorrente: `PATCH` envia o `updated_at` visto; servidor responde 409 se mudou. Processo único, SQLite em WAL.

## Stack

- Node 24 LTS (`.nvmrc` e `engines`), npm workspaces sem Turborepo/Nx, TypeScript `strict` + `noUncheckedIndexedAccess`, sem `any`. Pacotes exportam TS direto, sem build individual.
- Código, tabelas e glossário em inglês; interface em PT-BR.
- Frontend: Svelte 5 + SvelteKit `adapter-static` como SPA, `base` sempre `/`; Tailwind v4; bits-ui só para primitivos acessíveis; design system em `packages/ui` ([design-system.md](design-system.md)).
- Navegador: sql.js, wasm empacotado no build. (Com headers próprios na Cloudflare, OPFS fica possível depois.)
- Servidor: Fastify, better-sqlite3, `@fastify/static`, cookie, rate-limit, CSRF, `@node-rs/argon2`. `npm start` único; Docker como plano B.
- Gráficos: ECharts modular, wrapper próprio, tabela equivalente acessível por gráfico.
- Testes: Vitest (suíte de `database` roda nos dois drivers), Playwright (offline e dois contextos no conectado), teste de zero requisições externas.

## Hospedagem (substitui GitHub Pages)

- Cloudflare **Workers static assets** (`wrangler.jsonc`), publicando só o build do web. Domínio gratuito por enquanto.
- `_headers` com CSP restritiva (`default-src 'self'`, `connect-src 'self'`, `script-src 'self'` + `wasm-unsafe-eval`, `frame-ancestors 'none'`), `Referrer-Policy: no-referrer`, `Permissions-Policy` restritiva.
- Web Analytics desligado; limitação (a Cloudflare vê IP e URL, nunca o banco) documentada em `docs/security`.
- CI: lint, tipos, testes, `npm audit`; falha se o artefato publicado contiver `.db`, `.env` ou `backups/`.
