# 04: Resultado do mês redesenhado

**What to build:** o indicador "Resultado" vira "Resultado do mês", com "i" explicando o cálculo e um rótulo colorido "Sobrou" ou "Faltou" ao lado do valor, com a linha de apoio "Receitas − Despesas". Clicar nele abre "Como chegamos neste saldo": saldo no início do mês + receitas − despesas = saldo no fim, com uma linha "Diferença sem explicação" quando não fechar.

**Blocked by:** 02 (Totais só de contas ativas e confirmar toda exclusão), 03 ("i" de ajuda nos indicadores)

**Status:** done

- [x] O cartão mostra "Resultado do mês", o valor, "Sobrou" (positivo) ou "Faltou" (negativo) e "Receitas − Despesas"
- [x] O "i" explica: receitas menos despesas; positivo = sobrou, negativo = gastou mais do que recebeu
- [x] O repositório calcula o saldo total em uma data
- [x] "Como chegamos neste saldo" lista saldo inicial, receitas, despesas e saldo final do mês escolhido
- [x] Quando o cálculo não fecha, aparece a diferença sem explicação com o motivo provável; nenhum número é ajustado para fechar
- [x] Testes de repositório (nos dois drivers) para o saldo por data e o fechamento com transferências e conta criada no mês
