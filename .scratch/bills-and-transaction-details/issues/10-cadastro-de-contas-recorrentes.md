# 10: Cadastro de contas recorrentes

**What to build:** cadastrar, editar e arquivar Recurring bills (nome, valor esperado, mensal ou anual, dia de vencimento, Category, Fixa ou Supérflua, Account padrão opcional), em uma tela de lista própria. É só cadastro: não gera lançamentos nem altera saldos.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Criar, editar e arquivar uma conta recorrente pela interface, com validação em português
- [x] O valor é digitado em formato brasileiro e guardado em centavos inteiros
- [x] Conta anual pede também o mês do vencimento
- [x] Dia de vencimento maior que o último dia do mês cai no último dia (31 em fevereiro vira 28 ou 29); coberto por testes de core
- [x] Arquivar mantém o histórico; excluir pede confirmação e só é permitido sem pagamentos
- [x] A lista filtra por Category e por Fixa/Supérflua e deixa claro que a conta não gera lançamentos
- [x] Migração nova funciona nos dois drivers; funciona também no Offline mode
