# 02: Totais só de contas ativas e confirmar toda exclusão

**What to build:** (a) Receitas, Despesas e o gráfico de despesas por Category do mês passam a somar apenas Transactions de Accounts ativas, alinhando-se ao Saldo total. (b) Todo botão de excluir do app abre o diálogo de confirmação já existente, com o nome do que será apagado e o efeito.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Arquivar uma Account tira seus lançamentos de Receitas, Despesas, Resultado e do gráfico por Category do mês
- [x] Reativar a Account devolve os lançamentos aos totais
- [x] Excluir Transaction (e qualquer outra exclusão existente no app) só apaga depois de confirmar; Cancelar não apaga nada
- [x] O diálogo mostra o nome do item e o efeito (ex.: apagar uma perna de Transfer apaga as duas)
- [x] Testes de repositório nos dois drivers para os totais; E2E: excluir abre o diálogo, Cancelar mantém, Excluir apaga (escrito em `apps/web/e2e`, mas não executado: não há navegador do Playwright instalado neste ambiente)
