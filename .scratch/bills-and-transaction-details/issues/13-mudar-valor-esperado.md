# 13: Mudar o valor esperado de uma conta

**What to build:** ao editar o valor de uma conta recorrente, um modal pergunta a partir de quando o novo valor vale. O valor esperado de cada mês passa a respeitar essa vigência, e meses já pagos nunca mudam.

**Blocked by:** 11 (Aba "Contas a pagar" no dashboard)

**Status:** done

- [x] Alterar o valor abre um modal com três opções: "Este mês em diante" (padrão), "Só a partir do próximo mês" e "Recalcular também os meses pendentes e atrasados"
- [x] Cada escolha grava uma vigência por mês; o esperado de um mês é o valor da vigência mais recente que já começou
- [x] Meses pagos mantêm o valor da Transaction e não são alterados em nenhuma opção
- [x] Cancelar o modal não altera nada
- [x] A aba Contas a pagar e seus totais refletem a vigência
- [x] Testes de core para a escolha da vigência e de repositório nos dois drivers
