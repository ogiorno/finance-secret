Status: done (implementada e verificada em 2026-10-12; os testes E2E foram escritos mas não executados, por falta do navegador do Playwright; o item do Assistant ficou para a spec do servidor)

# Contas a pagar e detalhe das compras

## Problem Statement

Tenho despesas que se repetem todo mês (aluguel, internet, assinaturas) e hoje não sei, olhando o app, o que já paguei e o que ainda falta pagar no mês. Também não consigo abrir uma compra e ver o que há dentro dela: um cupom de R$ 522,00 do supermercado é só um número, sem os produtos. E nem sempre fica claro de onde o dinheiro saiu (cartão de crédito, débito, VR), então a compra é registrada incompleta ou na conta errada.

## Solution

Uma aba **Contas a pagar** no dashboard lista, para o mês escolhido, todas as **Recurring bills** esperadas, cada uma como **Pendente**, **Atrasada** ou **Paga**. Marcar uma conta como paga pergunta de qual Account saiu o dinheiro e o valor real, e grava uma Transaction de despesa vinculada àquela ocorrência do mês. Qualquer Transaction pode ter uma lista de **itens** (produto, quantidade, preço); clicar na Transaction abre o detalhe com a origem (Account), a Category, a data e os itens. As compras de supermercado já caem na Category "Mercado", e os gráficos existentes mostram o total por mês. Quando o Assistant recebe uma compra sem Account, ele pergunta de onde saiu o dinheiro antes de gravar.

## User Stories

1. Como usuário, quero cadastrar uma Recurring bill (nome, valor esperado, periodicidade mensal ou anual, dia de vencimento, Category, Fixa ou Supérflua, Account padrão opcional), para registrar o que se repete.
2. Como usuário, quero editar e arquivar uma Recurring bill, para refletir mudanças sem perder o histórico de pagamentos.
3. Como usuário, quero ver na aba Contas a pagar todas as contas esperadas do mês escolhido, para saber o que está em aberto.
4. Como usuário, quero ver o status de cada conta (Pendente, Atrasada, Paga), para priorizar o que pagar.
5. Como usuário, quero ver no topo da aba o total esperado, o total já pago e o que falta, para planejar o mês.
6. Como usuário, quero navegar entre meses, para ver o que paguei antes e o que vem pela frente.
7. Como usuário, quero marcar uma conta como paga escolhendo a Account de origem, o valor real e a data, para registrar o pagamento sem digitar duas vezes.
8. Como usuário, quero que o valor real possa diferir do esperado (ex.: conta de luz), sem alterar o valor esperado da Recurring bill.
9. Como usuário, quero desmarcar um pagamento, para corrigir um engano; a Transaction vinculada é apagada depois de eu confirmar.
10. Como usuário, quero que a conta volte a ficar Pendente se eu apagar a Transaction vinculada em outra tela, para a aba nunca mentir.
11. Como usuário, quero que contas anuais só apareçam no mês do vencimento, para não poluir os outros meses.
12. Como usuário, quero filtrar as contas por Category e por Fixa ou Supérflua, para analisar um grupo.
13. Como usuário, quero clicar em uma Transaction e ver o detalhe: valor, data, Account de origem, Category, descrição e itens, para saber o que foi aquele pagamento.
14. Como usuário, quero adicionar, editar e remover itens (nome, quantidade, preço unitário) de uma Transaction, para detalhar compras como a do supermercado.
15. Como usuário, quero ver a diferença entre a soma dos itens e o total da compra (descontos, arredondamentos), sem que isso bloqueie o registro.
16. Como usuário, quero que uma Transaction continue válida sem nenhum item, para detalhar só quando valer a pena.
17. Como usuário, quero ver o total de "Mercado" por mês nos gráficos existentes, para acompanhar quanto gasto com supermercado.
18. Como usuário, quero que o Assistant pergunte "você pagou isso onde?" (crédito, débito, VR etc.) quando eu informar uma compra sem Account, para nunca gravar sem origem.
19. Como usuário, quero que a Account seja obrigatória no registro de qualquer compra, inclusive as que o Assistant propõe, para nunca gravar sem saber de onde o dinheiro saiu.
20. Como usuário, quero usar tudo isso também no Offline mode, para consultar e editar fora do servidor.
21. Como usuário, quero que toda Transaction guarde a data em que foi executada (padrão: hoje), para o histórico refletir quando o dinheiro realmente se moveu.
22. Como usuário, quero registrar uma Transaction informando só o valor (e a Account e a Category, quando não houver padrão), para o registro rápido levar poucos segundos.
23. Como usuário, quero trocar a data de execução em "Opções avançadas", escondida por padrão, para lançar compras de dias anteriores sem poluir o fluxo rápido.
24. Como usuário, quero voltar depois ao detalhe da Transaction para completar descrição, itens e data, para detalhar só quando eu quiser.
25. Como usuário, quero um ícone "i" ao lado de cada indicador do dashboard (Saldo total, Receitas do mês, Despesas do mês, Resultado do mês e os totais de Contas a pagar) que explique em uma frase o que ele considera, para eu não me perder nos números.
26. Como usuário, quero que todo botão de excluir peça confirmação antes de apagar (Transaction, item, Recurring bill, pagamento), para não perder dados por um clique errado.
27. Como usuário, quero que o indicador "Resultado do mês" tenha um "i" que explique o cálculo, mostre "Sobrou" ou "Faltou" ao lado do valor e possa ser aberto em "Como chegamos neste saldo" (saldo no início do mês + receitas − despesas = saldo no fim), para entender de onde o número vem.
28. Como usuário, quero ver na aba Contas a pagar quanto do meu saldo fica livre depois de pagar o que falta no mês, para saber se vou conseguir pagar tudo.
29. Como usuário, quero que a lista de lançamentos mostre uma coluna "De → Para" (ex.: Cartão → Mercado, Esposa → Conta corrente, Conta corrente → Cartão), para entender de relance de onde o dinheiro saiu e para onde foi.
30. Como usuário, quero informar o método de pagamento (débito, crédito, pix, boleto, VR, dinheiro, outro) como campo opcional, já preenchido pelo tipo da conta, para distinguir como o dinheiro saiu sem digitar a mais.
31. Como usuário, quero marcar uma despesa como Extra (imprevisto) em Opções avançadas, para separar o que não estava planejado sem perder a categoria real do gasto.
32. Como usuário, quero ver "Extras do mês" no dashboard e filtrar a lista por Extra, para saber quanto os imprevistos custaram.

## Implementation Decisions

- **Vocabulário (atualizar `GLOSSARY.md`):**
  - **Recurring bill** passa a ser uma expectativa que *gera* Transactions apenas quando o usuário marca o pagamento. Continua não sendo uma Transaction e não conta em saldos antes de paga. Isso substitui "nunca gera lançamentos" da spec `receipts-assistant-databases` e o item "Geração automática" de seu Out of Scope: aqui nada é gerado sozinho, só por ação explícita.
  - **Occurrence**: a Recurring bill esperada em um mês `YYYY-MM`. Calculada, não armazenada, até ser paga.
  - **Item**: uma linha de detalhe de uma Transaction (produto, quantidade, preço). Substitui `receipt_items`.
  - **Origin** não é termo novo: é a **Account** da Transaction (cartão de crédito, débito e VR já são Accounts, via Account types).
- **Modelo de dados (migration nova, nos dois drivers, ADR 0001):**
  - `recurring_bills`: `id`, `name`, `amount_cents` (esperado), `frequency` (`monthly` | `yearly`), `due_day`, `due_month` (só anual), `category_id`, `classification` (`fixed` | `discretionary`), `default_account_id` nulo, `is_active`.
  - `bill_payments`: `id`, `bill_id`, `period` (`YYYY-MM`), `transaction_id` `UNIQUE`, `UNIQUE(bill_id, period)`, `ON DELETE CASCADE` a partir da Transaction. Pagar = inserir a linha; desmarcar ou apagar a Transaction remove a linha.
  - `transaction_items`: `id`, `transaction_id` (`ON DELETE CASCADE`), `position`, `name`, `quantity_milli` inteiro, `unit_price_cents`, `total_cents`. Campos que nem todo cupom tem (código de barras, unidade) ficam em `metadata_json` opcional; o desenho fino é da implementação.
- **Status:** `Paga` se existe `bill_payments` do período; senão `Atrasada` se a data de vencimento já passou (em data local, sem hora); senão `Pendente`. Dia de vencimento maior que o último dia do mês cai no último dia (31 em fevereiro vira 28 ou 29).
- **Data de execução:** é a `transaction_date` que já existe (texto `YYYY-MM-DD`, data local, sem hora); não se cria campo novo. `created_at` continua sendo o momento do registro, separado da data de execução. Padrão = hoje. Hoje o formulário de lançamento mostra a data sempre; passa a escondê-la em **Opções avançadas** (seção recolhida), junto com descrição, status Pending e, no detalhe, os itens.
- **Sem categoria:** existe uma Category de sistema "Sem categoria" para despesa e outra para receita (o `type` da Transaction continua igual ao da Category). Se o usuário não escolher Category, a Transaction usa a "Sem categoria" do seu tipo; depois pode reclassificar no detalhe. Elas vêm no banco novo e em migração dos antigos, não podem ser excluídas nem arquivadas, e entram nos gráficos como qualquer Category. Transferências seguem sem Category.
- **Totais só de contas ativas (decidido):** Receitas, Despesas, Extras e Resultado do mês passam a somar apenas Transactions de Accounts ativas, como o Saldo total já faz. Isso alinha os totais e faz "Como chegamos neste saldo" fechar. Ajuste em `getMonthSummary` e `getExpensesByCategory`.
- **Valor esperado de uma conta recorrente:** ao editar o valor, abre um modal perguntando a partir de quando o novo valor vale: "Este mês em diante" (padrão), "Só a partir do próximo mês" ou "Recalcular também os meses pendentes e atrasados". Meses já pagos nunca mudam (o valor pago está na Transaction). Modelo: `recurring_bill_amounts` (`bill_id`, `effective_period` `YYYY-MM`, `amount_cents`); o esperado de um mês é o valor com maior `effective_period` menor ou igual a ele.
- **Previsão (spec futura, `forecast`):** o app terá um conceito de previsão: cálculo das dívidas fixas (contas recorrentes) e das outras dívidas já lançadas no cartão. Fica fora desta spec; aqui só se garante que o motor de ocorrências e os saldos de cartão possam alimentá-la.
- **Tela "Fluxo do dinheiro":** decidida como funcionalidade do app, em spec própria (`money-flow`).
- **Registro rápido:** o formulário principal pede só o necessário: valor, e Account e Category quando não vierem pré-preenchidas (última Account usada, como hoje). Tipo (despesa, receita, transferência) segue visível. Tudo o mais fica em Opções avançadas ou no detalhe, editável depois. A mesma regra vale para o painel de pagar uma conta.
- **Pagar:** abre um painel com Account (padrão = `default_account_id`, obrigatória), valor (padrão = esperado) e a Category da conta; a data (padrão = hoje) fica em Opções avançadas. Grava uma Transaction `expense`, `posted`, e a linha em `bill_payments`, numa única transação de banco. Se a Account for cartão de crédito, vale a regra existente: o gasto aumenta a dívida do cartão.
- **Account obrigatória em qualquer gravação feita pela IA:** a ferramenta de gravação de Transaction do Assistant rejeita `accountId` vazio. Quando falta, o Assistant devolve a pergunta ("em qual conta você pagou?"), listando as Accounts ativas, em vez de supor.
- **Regras de dinheiro (validação pedida):** o código já usa centavos inteiros (`amount_cents INTEGER`, `Number.isInteger`, `parseBRLToCents`). Esta feature mantém e reforça:
  - Nenhum `float` em valores: quantidade em milésimos (`quantity_milli`, 1,250 kg = 1250); `total_cents = round_half_up(quantity_milli × unit_price_cents / 1000)` calculado só com inteiros em `packages/core`.
  - Valores vindos da IA chegam como texto decimal (`"12.34"`) e são convertidos por uma função de `core` para centavos; JSON com número fracionário é rejeitado, nunca passado por `parseFloat`.
  - Rateios e divisões distribuem o resto em centavos (a soma das partes é sempre igual ao total).
  - Vírgula só existe na entrada e na exibição (`parseBRLToCents`, `<Money>`).
- **Itens x Category:** itens não têm Category própria. A Transaction inteira vai para a sua Category, então os gráficos continuam somando por Transaction e nada muda neles.
- **Soma dos itens:** pode diferir do total da Transaction; a tela mostra a diferença como "ajustes/descontos". Nunca bloqueia (cupons têm desconto). O valor que conta em saldo e gráficos é sempre o total da Transaction.
- **Ícone de ajuda (`InfoTip`):** componente novo em `@finance/ui`, usado no rótulo do `Kpi`. Abre ao passar o mouse, focar ou tocar (acessível por teclado e leitor de tela, `aria-describedby`), mostra uma ou duas frases e fecha com Esc. Só tokens do tema. O texto é uma propriedade do indicador, em PT-BR, sempre descrevendo a regra que o cálculo realmente aplica. Rascunho:
  - **Saldo total:** "Soma do saldo das suas contas ativas. Cartões e empréstimos entram como dívida (negativo). Não inclui bens nem lançamentos pendentes."
  - **Receitas do mês:** "Dinheiro que entrou no mês escolhido. Transferências entre suas contas e lançamentos pendentes não contam."
  - **Despesas do mês:** "Dinheiro que saiu no mês escolhido, no dia em que foi pago. Contas ainda não pagas e transferências não contam."
  - **Resultado do mês:** "Receitas menos despesas do mês. Se for positivo, sobrou dinheiro; se for negativo, você gastou mais do que recebeu."
  - **Contas a pagar (esperado, pago, falta, livre depois):** "Esperado é a soma das contas do mês; pago é o que já virou lançamento; falta é a diferença. Livre depois é o seu saldo livre menos o que ainda falta pagar."
  - Os mesmos textos devem seguir as regras do `GLOSSARY.md` (Posted, Pending, Transfer); se a regra de um indicador mudar, o texto muda junto.
- **Método de pagamento:** `transactions.payment_method` nulo, enum fixa (`debit`, `credit`, `pix`, `boleto`, `meal_voucher`, `cash`, `other`). Complementa a regra "origem = Account" (a Account continua obrigatória e é o "de onde"). O padrão vem de `account_types.default_payment_method` (editável, então tipos de conta personalizados também definem o seu): cartão de crédito = `credit`, VR = `meal_voucher`, corrente = `debit`. O usuário pode trocar em Opções avançadas. O método nunca altera saldos; só descreve e filtra.
- **Despesa Extra:** `transactions.is_extra` (0 ou 1), só em despesas, interruptor em Opções avançadas. Não muda a Category. O dashboard ganha "Extras do mês" (soma de despesas Posted extras no mês, com "i"), e a lista filtra por Extra. Despesas geradas por conta recorrente nunca são Extra.
- **Lista "De → Para":** montada a partir do tipo: despesa = `Account → Category`, receita = `Fonte → Account` (Fonte vem da spec `income-sources`; sem Fonte mostra só a Account), transferência = `Account de saída → Account de entrada`. A seta tem texto acessível ("de X para Y"). Data, método e item resumido ficam numa segunda linha menor; valor à direita colorido por tipo (tokens `text-income` e `text-expense`). Em tela estreita as duas pontas empilham. O clique abre o detalhe.
- **Mapa do fluxo (decisão aberta):** o diagrama Fontes → Contas → Destinos discutido na conversa pode virar uma tela "Fluxo do dinheiro" no app. Não entra nesta spec até confirmação.
- **Redesign do "Resultado do mês" (vindo do conceito de roll-forward):** o nome continua "Resultado do mês", mas agora com um "i" que explica o cálculo e um rótulo colorido ao lado do valor: "Sobrou" (receita) ou "Faltou" (despesa), com a linha de apoio "Receitas − Despesas". O nome técnico `resultCents` não muda. Clicar no cartão abre **"Como chegamos neste saldo"**, uma tabela que fecha: saldo no início do mês + receitas − despesas = saldo no fim do mês. Se não fechar, mostra a linha "Diferença sem explicação" com o valor e o motivo provável (transferência com uma conta arquivada, cuja outra ponta não entra no saldo total), em vez de esconder; nunca se ajusta o número para fechar. Implica um saldo por data no repositório (`getTotalBalance` aceitar uma data final).
- **Regime de caixa explícito:** o app registra a despesa quando é paga, não quando vence. Uma Recurring bill pendente é uma obrigação, não uma despesa; só entra em Despesas ao ser paga. O texto dos "i" diz isso.
- **Livre depois das contas:** na aba Contas a pagar, `livre depois = Saldo total − Reservado (metas) − contas pendentes e atrasadas do mês`. Pode ser negativo e então aparece como alerta, sem bloquear.
- **Confirmar exclusão:** toda ação de excluir, sem exceção, abre um diálogo de confirmação antes de apagar, com o nome do que será apagado e o efeito ("Isso também apaga o lançamento vinculado"). Botões "Cancelar" (foco inicial) e "Excluir". Vale para apagar Transaction, item, Recurring bill e desmarcar pagamento. Usa um único componente de diálogo do `@finance/ui` (o mesmo já usado em "Arquivar"), para a regra não depender de cada tela lembrar. Excluir banco continua exigindo digitar o nome.
- **Dashboard:** a aba "Contas a pagar" segue `docs/ui-spec.md` e o design system (`@finance/ui`, só tokens, skill `finance-ui`). Mensagem vazia orienta a cadastrar a primeira conta.
- **Detalhe da Transaction:** o clique na linha da lista abre um painel lateral (ou página) com os campos e os itens; edição inline com a mesma validação de hoje.
- **Offline mode:** tudo disponível, pois é SQL puro. Só o Assistant segue exigindo servidor.
- **Relação com a spec anterior:** a parte de Recurring bills de `receipts-assistant-databases` é absorvida por esta. A leitura de Receipt por QR Code continua naquela spec, com entrada na página de Lançamentos ("Importar cupom"); os itens do cupom usam `transaction_items`, e na prévia a Account é obrigatória e começa vazia.

## Testing Decisions

- Teste só comportamento visível pelo repositório e pela tela, não detalhes internos.
- **Core (unit, rápidos):** cálculo de `total_cents` por item com arredondamento, rateio sem perder centavo, conversão de texto decimal em centavos (rejeitando fracionário/`NaN`/negativo), cálculo de status e vencimento em mês curto e ano bissexto, ocorrência anual no mês certo.
- **Repositório (nos dois drivers):** pagar cria Transaction + vínculo atomicamente; pagar duas vezes o mesmo período é recusado; apagar a Transaction volta a conta para Pendente; desmarcar apaga a Transaction; arquivar bill preserva pagamentos; itens apagados junto da Transaction; saldo e totais mudam só depois de paga.
- **Assistant (com provedor falso):** compra sem Account gera pergunta e nada é gravado; com Account gera Proposal válida.
- **E2E:** registrar uma Transaction só com valor (data = hoje, Opções avançadas fechada) e outra trocando a data em Opções avançadas; ver as duas no mês correto. Cadastrar conta, ver Pendente, pagar escolhendo cartão, ver Paga e o total do mês, abrir a Transaction e editar itens, mudar de mês.
- **Lista:** teste de componente da coluna "De → Para" para despesa, receita e transferência; método padrão por tipo de conta; soma de Extras do mês só com despesas Posted extras.
- **Excluir:** E2E confirma que clicar em excluir só abre o diálogo, que Cancelar não apaga nada e que Excluir apaga.
- **InfoTip:** teste de componente: abre com foco e com hover, fecha com Esc, tem o texto associado por `aria-describedby`; e `check:tokens` continua passando.
- Prior art: suítes de transferências e exclusão; `money.test.ts` e `transaction.test.ts` em `packages/core/test`.

## Out of Scope

- Gerar pagamentos ou Transactions automaticamente (débito automático, lembretes, notificações).
- Parcelas, faturas e limite de cartão (decisão existente: sem modelo de fatura).
- Category por item e relatórios por produto.
- Periodicidades além de mensal e anual (semanal, trimestral).
- Reconciliação automática com extrato bancário.
- Sincronização e multi-dispositivo (V2).

## Further Notes

- Decidido: o status "Atrasada" usa a data local do dispositivo; no Offline mode isso é o relógio do navegador.
- Pergunta aberta: ao editar o valor esperado de uma bill, os meses já pagos mantêm o valor real pago (a Transaction); só os meses futuros e os pendentes usam o novo valor.
- Ordem das fatias (decidida): (1) detalhe da Transaction, data avançada, confirmação de exclusão, De → Para, método de pagamento e Sem categoria; (2) Fontes de renda (`income-sources`); (3) contas a pagar e a receber, com o Resultado do mês redesenhado; (4) metas (`goals`); (5) cupom por QR na página de Lançamentos, Assistant e vários bancos (`receipts-assistant-databases`, que depende do servidor da Fase 3). Tela "Fluxo do dinheiro" (`money-flow`) e Previsão (`forecast`) vêm depois de (3).
