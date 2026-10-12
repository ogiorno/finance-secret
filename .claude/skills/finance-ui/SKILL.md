---
name: finance-ui
description: Construir ou alterar qualquer tela, formulário, lista ou componente de UI do app (apps/web, packages/ui), ou revisar se uma tela segue o design system e os padrões de UX.
---

# UI do finance-secret

Toda UI compõe `@finance/ui`. Tokens e regras de estilo: `docs/design-system.md`. Auditoria, padrões de interação, componentes e telas novas: `docs/ui-spec.md`. Leia a seção do spec que cobre a tela antes de escrever código, e `GLOSSARY.md` para os nomes (Transaction, Category, Receipt, Proposal...).

## Passos

1. **Ache o padrão.** Em `docs/ui-spec.md` seção 3 (interação) e, se for tela nova, seção 5. Siga o padrão; só improvise onde o spec for silencioso, e então acrescente a regra ao spec.
2. **Monte com o que existe.** Confira `packages/ui/src/index.ts`. Se faltar o componente, crie-o em `packages/ui` primeiro (variantes com `tv`, só classes de token, exportado em `index.ts`, listado em `docs/design-system.md`). Nunca estilize do zero dentro de uma rota.
3. **Escreva a tela** cobrindo vazio, carregando, erro e sucesso, e o modo em que ela roda (Offline mode sem rede: o que depende de servidor fica desabilitado com motivo).
4. **Verifique**: rode `npm run check`. Depois abra a tela no navegador a 375 px e a 1280 px, nos temas claro e escuro, e use só o teclado.

## Pronto quando

Todos os itens da seção 8 de `docs/ui-spec.md` valem e `npm run check` passa. Dê o resultado de cada verificação, não só "ok".

## Proibido nas telas

Cor, hex, paleta padrão do Tailwind ou valor arbitrário (`w-[13px]`); `<button>`, `<a class=...>`, `<input type=checkbox>` e `confirm()` crus; `<h1>` com classes soltas (use `PageHeader`); `Label` + `Input` soltos (use `Field`); texto cinza como estado vazio (use `EmptyState`).
