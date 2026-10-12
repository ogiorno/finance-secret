Status: done (implementada e verificada em 2026-10-12; o teste E2E foi escrito mas não executado, por falta do navegador do Playwright)

# Fontes de renda e receitas recorrentes

## Problem Statement

Parte da minha renda vem de outra pessoa (minha esposa), e ela me repassa um valor todo mês. Hoje toda receita é só "uma receita": não sei de quem veio, não separo o que é meu do que é dela e não sei se o repasse do mês já chegou.

## Solution

Cadastro **Fontes** de renda (Eu, Esposa, outras). Toda receita aponta para uma Fonte. Cadastro **Receitas recorrentes** (o repasse mensal da esposa, o salário), que aparecem como esperadas no mês e eu marco como recebidas, no mesmo molde das Recurring bills. Relatórios mostram a receita por Fonte, mês a mês.

## User Stories

1. Como usuário, quero cadastrar Fontes de renda (nome, ativa ou arquivada), para dizer de quem veio o dinheiro.
2. Como usuário, quero que um banco novo já venha com a Fonte "Eu", para registrar a primeira receita sem configurar nada.
3. Como usuário, quero escolher a Fonte ao registrar uma receita (padrão: a última usada), sem tornar o registro mais lento.
4. Como usuário, quero cadastrar uma Receita recorrente (nome, valor esperado, mensal ou anual, dia, Fonte, Category de receita, Account de destino padrão), para o que chega sempre.
5. Como usuário, quero ver as receitas esperadas do mês como A receber, Atrasada ou Recebida, para saber se o repasse já chegou.
6. Como usuário, quero marcar como recebida informando a Account de destino e o valor real, e isso criar a Transaction de receita vinculada, para não digitar duas vezes.
7. Como usuário, quero desmarcar o recebimento (com confirmação, apagando a Transaction vinculada) e que a receita volte a A receber se a Transaction for apagada em outra tela.
8. Como usuário, quero ver a receita do mês por Fonte, e a evolução por mês, para saber quanto cada pessoa contribui.
9. Como usuário, quero filtrar a lista de lançamentos por Fonte, para achar o que veio dela.
10. Como usuário, quero que o dashboard mostre o total esperado a receber ainda no mês, para planejar.
11. Como usuário, quero arquivar uma Fonte ou Receita recorrente mantendo o histórico, para refletir mudanças.
12. Como usuário, quero usar tudo isso no Offline mode.

## Implementation Decisions

- **Vocabulário (atualizar `GLOSSARY.md`):** **Source** (Fonte): de quem ou de onde vem uma renda (pessoa ou empresa), não uma Account. **Recurring income**: expectativa de receita que se repete; só vira Transaction quando o usuário marca como recebida. Evitar "repasse" como termo de modelo (é só uma Recurring income com Source Esposa) e "transferência" (isso é entre Accounts do usuário).
- **Decisão de modelo:** o dinheiro da esposa entra como **receita do usuário** com Source "Esposa", não como Transfer, porque entra de fora das Accounts do usuário. Não se cria Account dela. Isso alimenta Receitas do mês normalmente.
- **Dados (migration, nos dois drivers):** `income_sources` (`id`, `name`, `is_active`); `transactions.source_id` nulo, preenchido só em receitas (CHECK: despesa e perna de transferência têm `source_id` nulo); `recurring_incomes` (espelha `recurring_bills`: `amount_cents`, `frequency`, `due_day`, `due_month`, `source_id`, `category_id`, `default_account_id`, `is_active`); `income_receipts` (espelha `bill_payments`: `recurring_income_id`, `period`, `transaction_id UNIQUE`, `UNIQUE(recurring_income_id, period)`, `ON DELETE CASCADE`).
- **Motor compartilhado:** vencimento, ocorrência mensal/anual, status e vínculo ao lançamento são os mesmos de Recurring bill (spec `bills-and-transaction-details`). Implementar uma vez em `packages/core` e usar nas duas; status de receita: `A receber`, `Atrasada`, `Recebida`.
- **Dashboard:** a aba passa a ter duas seções, "A pagar" e "A receber", com o mesmo painel de marcar. "Receitas do mês" continua sendo só o que já entrou (Posted); o esperado aparece à parte com "i" explicando.
- **Registro rápido:** a Fonte tem padrão (a última usada) e fica em Opções avançadas, a menos que exista mais de uma Fonte ativa; nesse caso aparece como campo curto no formulário de receita.
- **Lista de lançamentos:** receitas mostram "Fonte → Account" na coluna De → Para (sem fonte, a Category no lugar da Fonte).
- **Onde ficou na tela:** o cadastro de Fontes está na tela Contas; a visão "A receber" e o cadastro de receitas recorrentes estão na tela "A pagar e receber" (rota `/bills`); o painel mostra "A receber" no cartão de Receitas e o cartão "Receitas por fonte" (mês atual e últimos seis meses).
- **Dinheiro:** centavos inteiros, como no resto do app.
- **Confirmação de exclusão:** o diálogo único do `@finance/ui`.

## Testing Decisions

- **Core:** o mesmo conjunto de vencimento e status de Recurring bill, rodado para receitas.
- **Repositório (nos dois drivers):** receita aceita Fonte; despesa com Fonte é recusada; receber cria Transaction + vínculo atomicamente; receber duas vezes o mesmo período é recusado; apagar a Transaction volta a A receber; total por Fonte e mês correto; arquivar Fonte com histórico preserva dados.
- **E2E:** cadastrar Fonte Esposa e o repasse mensal, ver A receber, marcar recebido na conta, ver Receitas do mês e o relatório por Fonte.

## Out of Scope

- Dividir despesas entre pessoas ou calcular quem deve a quem.
- Contas conjuntas e sincronização entre dispositivos (V2).
- Imposto de renda e retenções.
- Receitas variáveis com previsão automática.

## Further Notes

- Pergunta aberta: o relatório por Fonte mostra só o que entrou (Posted) ou também o esperado? Sugestão: só o que entrou, com o esperado como linha tracejada.
- Ordem sugerida: (1) Fontes e `source_id` nas receitas, (2) Receitas recorrentes sobre o motor de Recurring bill, (3) seção "A receber", (4) relatório por Fonte.
