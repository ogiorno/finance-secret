Status: partially-done (primeira versão: tela Projeções, ver docs/spec-decisions.md)

# Previsão (dívidas fixas e cartão)

> Rascunho de uma ideia citada pelo usuário. Ainda não é uma spec: precisa de uma rodada de perguntas antes.

## Ideia

Um conceito de **previsão** que calcula quanto o usuário vai precisar pagar à frente, somando as dívidas fixas (contas recorrentes) e as outras dívidas que já estão preparadas no cartão de crédito (compras já lançadas que viram fatura).

## Relação com o que já foi decidido

- O app registra despesa quando é paga, não quando vence (regime de caixa). A previsão olha para o futuro sem mudar isso: não gera Transactions nem mexe em saldos.
- Alimenta-se de: Recurring bills e suas Occurrences (spec `bills-and-transaction-details`), saldo devedor do cartão (Account de cartão), e opcionalmente Recurring incomes (spec `income-sources`).
- "Livre depois das contas" (spec de contas a pagar) é o primeiro pedaço dessa ideia, limitado ao mês corrente.
- Decisão existente em `docs/spec-decisions.md`: sem modelo de fatura, limite ou parcelas. A previsão precisa dizer o que fazer com isso.

## Perguntas para a rodada de grilling

1. Qual o horizonte: só o mês atual, os próximos 3 ou 6 meses, ou o ano?
2. "Dívidas já preparadas no cartão": é o saldo devedor atual do cartão como um único valor, ou compras com data de fatura/vencimento (o que exigiria modelo de fatura e parcelas)?
3. A previsão inclui as receitas esperadas (salário, repasse) para mostrar o saldo projetado, ou só as saídas?
4. Aparece onde: card no dashboard, uma aba, ou dentro de "Fluxo do dinheiro"?
5. Como tratar parcelas (compra em 6x): campo na Transaction ou nova entidade?
6. Alerta quando o saldo projetado ficar negativo?
