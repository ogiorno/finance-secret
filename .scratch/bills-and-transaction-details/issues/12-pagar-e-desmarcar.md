# 12: Pagar e desmarcar uma conta

**What to build:** marcar uma conta do mês como paga abre um painel com Account (obrigatória, padrão da conta recorrente), valor (padrão o esperado) e a data em Opções avançadas, e cria uma despesa Posted vinculada àquela ocorrência. Desmarcar apaga a despesa vinculada depois de confirmar. A aba mostra "Livre depois das contas".

**Blocked by:** 02 (Totais só de contas ativas e confirmar toda exclusão), 11 (Aba "Contas a pagar" no dashboard), 01 (Registro rápido e "Sem categoria")

**Status:** done

- [x] Pagar cria a Transaction e o vínculo numa única operação de banco; o saldo e as Despesas do mês mudam só depois de pagar
- [x] O valor pago pode diferir do esperado, sem alterar o valor esperado da conta
- [x] Pagar duas vezes o mesmo período é recusado
- [x] Pagar com cartão de crédito aumenta a dívida do cartão
- [x] Desmarcar pede confirmação e apaga a despesa vinculada
- [x] Apagar a despesa em outra tela devolve a conta para Pendente
- [x] "Livre depois das contas" = Saldo total − pendentes e atrasadas do mês; pode ficar negativo e aparece como alerta, sem bloquear
- [x] Testes de repositório nos dois drivers e E2E: pagar escolhendo o cartão, ver Paga e o total, desmarcar (escrito em `apps/web/e2e`, mas não executado: não há navegador do Playwright instalado neste ambiente)
