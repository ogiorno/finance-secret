# 06: Detalhe da transação

**What to build:** clicar numa linha da lista abre o detalhe da Transaction com valor, data de execução, Account de origem, Category, descrição e status, todos editáveis depois do registro rápido.

**Blocked by:** 05 (Lista de lançamentos com "De → Para")

**Status:** done

- [x] Clicar na linha (ou acionar pelo teclado) abre o painel de detalhe
- [x] O painel mostra todos os campos da Transaction, inclusive a data e a Category (inclusive "Sem categoria")
- [x] Editar e salvar atualiza a lista, os saldos e os totais; a regra de edição concorrente existente continua valendo
- [x] Transfer abre o detalhe das duas pernas como uma só operação
- [x] A exclusão no detalhe usa o diálogo de confirmação
- [x] E2E: abrir, editar a Category e a data, e ver a lista atualizada (escrito em `apps/web/e2e`, mas não executado: não há navegador do Playwright instalado neste ambiente)
