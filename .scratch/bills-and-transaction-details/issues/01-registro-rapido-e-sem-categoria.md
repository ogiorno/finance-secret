# 01: Registro rápido e "Sem categoria"

**What to build:** registrar uma Transaction pedindo só o valor (mais a Account, pré-preenchida com a última usada). A data de execução (padrão hoje), a descrição e o status Pending ficam numa seção recolhida "Opções avançadas". Se nenhuma Category for escolhida, a Transaction usa a Category de sistema "Sem categoria" do seu tipo (despesa ou receita), que depois pode ser reclassificada.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Existe uma Category "Sem categoria" para despesa e outra para receita, em banco novo e em bancos antigos migrados
- [x] "Sem categoria" não pode ser excluída nem arquivada, e aparece nos gráficos como qualquer Category
- [x] O formulário principal mostra tipo, valor e Account; Category é opcional
- [x] Data (padrão hoje), descrição e Pending ficam em "Opções avançadas", fechada por padrão
- [x] Trocar a data em Opções avançadas grava a Transaction no dia escolhido e ela aparece no mês correto
- [x] Transferências continuam sem Category
- [x] Testes de repositório (nos dois drivers) e E2E: registrar só com valor e registrar trocando a data (escrito em `apps/web/e2e`, mas não executado: não há navegador do Playwright instalado neste ambiente)
