# 11: Aba "Contas a pagar" no dashboard

**What to build:** uma aba no dashboard lista, para o mês escolhido, as contas recorrentes esperadas, cada uma como Pendente, Atrasada ou Paga, com os totais esperado, pago e falta.

**Blocked by:** 10 (Cadastro de contas recorrentes), 03 ("i" de ajuda nos indicadores)

**Status:** done

- [x] A aba mostra as ocorrências do mês; contas anuais só aparecem no mês do vencimento
- [x] Status: Paga se houver pagamento no período; senão Atrasada se o vencimento já passou (data local); senão Pendente
- [x] Totais esperado, pago e falta, cada um com "i" explicando o cálculo (a despesa só conta quando é paga)
- [x] Navegação entre meses e filtros por Category e por Fixa/Supérflua
- [x] Estado vazio convida a cadastrar a primeira conta
- [x] Testes de core para status, vencimento em mês curto e ano bissexto; E2E: ver Pendente e Atrasada em meses diferentes (escrito em `apps/web/e2e`, mas não executado: não há navegador do Playwright instalado neste ambiente)
