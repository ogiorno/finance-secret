Status: done (implementada e verificada em 2026-10-12; o teste E2E foi escrito mas não executado, por falta do navegador do Playwright)

# Fluxo do dinheiro (tela de visualização)

## Problem Statement

Olhando a lista de lançamentos, é difícil entender de onde o dinheiro saiu e para onde foi, principalmente com várias contas (corrente, cartão, VR), fontes de renda e destinos. Eu e qualquer pessoa nova no app nos perdemos.

## Solution

Uma tela **Fluxo do dinheiro** com um diagrama de caixinhas e setas, no estilo de quadro (fundo pontilhado), onde vejo para um mês: de quais **Fontes** o dinheiro entrou, por quais **Contas** passou e para quais **destinos** foi (Contas a pagar, Mercado e outras Categories, Despesas extras, Metas). Balões curtos explicam cada parte, e clicar numa caixa ou seta mostra as Transactions daquele trecho. O diagrama é montado a partir dos dados do banco, nunca desenhado à mão.

## User Stories

1. Como usuário, quero ver as Fontes, as Contas e os destinos do mês escolhido numa só tela, para entender o caminho do dinheiro.
2. Como usuário, quero que cada seta mostre o valor movido (e a espessura reflita o tamanho), para ver o que pesa mais.
3. Como usuário, quero clicar numa caixa ou seta e ver ao lado as Transactions daquele trecho (por exemplo, tudo que saiu do Cartão para Mercado), para investigar.
4. Como usuário, quero balões curtos explicando o que cada coluna significa (Fonte, Conta, Destino), para não me perder.
5. Como usuário, quero distinguir o que é gasto do que não é (fatura do cartão e reserva de Metas aparecem tracejadas), para não contar duas vezes.
6. Como usuário, quero navegar entre meses, para comparar.
7. Como usuário, quero ver as Despesas extras como destino próprio, para enxergar os imprevistos.
8. Como usuário, quero uma tabela equivalente ao diagrama (De, Para, valor), para ler com teclado e leitor de tela.
9. Como usuário, quero usar a tela no Offline mode.

## Implementation Decisions

- **Vocabulário:** o diagrama usa os termos do glossário: Source (Fonte), Account, Category, Transfer, Goal, Extra. Não cria termo novo de domínio.
- **Dados:** uma consulta de repositório devolve as arestas do mês: `origem`, `destino`, `total_cents`, só Transactions Posted de Accounts ativas. Arestas: Fonte → Account (receitas), Account → Category (despesas), Account → Account (transferências, tracejadas), Account → Goal (aportes, tracejadas e fora de gasto). Despesas Extra aparecem como destino "Despesas extras" no lugar da Category; as recorrentes aparecem como "Contas a pagar".
- **Como ficou:** tela "Fluxo do dinheiro" (rota `/flow`, no menu e com o seletor de mês). As metas não têm conta de origem, então aparecem num aviso abaixo do diagrama (e não como seta); as transferências entre contas são setas tracejadas curvadas pela esquerda. Escolher uma caixa ou seta destaca o trecho e lista as Transactions dele; a tabela equivalente fica na mesma tela. Limite de seis destinos antes de agrupar em "Outros".
- **Layout:** três colunas fixas (entra, conta, sai), fundo pontilhado com tokens do tema. Caixas e setas são SVG montado por componente em `@finance/ui`; setas com espessura proporcional ao valor (escala em centavos inteiros, sem float acumulado). Com muitos destinos, os menores se agrupam em "Outros" clicável.
- **Balões:** componente de ajuda reaproveitando o `InfoTip` da spec `bills-and-transaction-details`, fixos junto às caixas; podem ser recolhidos.
- **Interação:** clique filtra a lista de Transactions do trecho (a mesma lista da tela de Lançamentos, com a coluna De → Para).
- **Acessibilidade:** a tabela equivalente é obrigatória (padrão do projeto para gráficos); cores nunca são a única distinção (tracejado + legenda).
- **Dinheiro:** centavos inteiros; totais das arestas somam exatamente os totais do dashboard.
- **Dependências:** Fontes (`income-sources`), De → Para e Extras (`bills-and-transaction-details`), Metas (`goals`). Pode ser entregue com o que já existir e ganhar colunas conforme essas specs entrarem.
- **Interface:** segue `docs/ui-spec.md` e o design system (`@finance/ui`, só tokens, skill `finance-ui`), texto em PT-BR.

## Testing Decisions

- **Repositório (nos dois drivers):** as arestas somam os totais do mês de Receitas, Despesas e Resultado; transferência e aporte não entram como gasto; conta arquivada fica de fora; mês sem dados devolve vazio.
- **Componente:** renderização com 1 e com muitos destinos ("Outros"), tabela equivalente com os mesmos números, espessura monotônica com o valor.
- **E2E:** abrir o mês, clicar em Cartão → Mercado e ver as Transactions corretas.

## Out of Scope

- Edição pelo diagrama (arrastar para criar lançamento).
- Previsão de meses futuros (spec `forecast`).
- Comparação entre bancos.
- Exportar o diagrama como imagem.

## Further Notes

- Referência visual: o diagrama mostrado na conversa (fontes à esquerda, contas ao centro, destinos à direita, balões amarelos).
- Pergunta aberta: o limite de caixas por coluna antes de agrupar em "Outros" (sugestão: 6).
