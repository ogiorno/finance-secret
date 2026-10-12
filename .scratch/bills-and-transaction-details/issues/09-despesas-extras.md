# 09: Despesas extras

**What to build:** marcar uma despesa como Extra (imprevisto) em Opções avançadas, sem alterar sua Category. O dashboard mostra "Extras do mês" com "i", e a lista filtra por Extra.

**Blocked by:** 01 (Registro rápido e "Sem categoria"), 03 ("i" de ajuda nos indicadores)

**Status:** done

- [x] O interruptor "Extra" existe só em despesas e fica em Opções avançadas
- [x] A Category da despesa não muda ao marcá-la como Extra
- [x] O dashboard mostra "Extras do mês" somando despesas Posted extras de Accounts ativas
- [x] O "i" explica o que conta como Extra
- [x] A lista filtra por Extra e mostra uma marca nas linhas extras
- [x] Testes de repositório nos dois drivers (só Posted, só despesa, só contas ativas) e E2E: marcar, ver o total e filtrar (escrito em `apps/web/e2e`, mas não executado: não há navegador do Playwright instalado neste ambiente)
