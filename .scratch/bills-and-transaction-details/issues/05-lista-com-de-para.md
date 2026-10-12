# 05: Lista de lançamentos com "De → Para"

**What to build:** a lista de lançamentos ganha uma coluna "De → Para" que mostra, conforme o tipo, de onde o dinheiro saiu e para onde foi, com data e descrição numa linha secundária e o valor à direita colorido por tipo.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Despesa mostra `Account → Category`; receita mostra a Account de destino (e a Fonte quando existir); transferência mostra `Account de saída → Account de entrada`
- [x] A seta tem texto acessível ("de X para Y")
- [x] Valor colorido por tipo usando os tokens de receita e despesa
- [x] Em tela estreita as duas pontas ficam empilhadas
- [x] Teste de componente para despesa, receita e transferência; E2E: criar um lançamento de cada tipo e ver a coluna correta (escrito em `apps/web/e2e`, mas não executado: não há navegador do Playwright instalado neste ambiente)
