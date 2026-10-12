# 03: "i" de ajuda nos indicadores

**What to build:** um componente `InfoTip` no design system e seu uso nos indicadores do dashboard (Saldo total, Receitas do mês, Despesas do mês), com uma ou duas frases que descrevem a regra que o cálculo realmente aplica.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] O "i" abre ao passar o mouse, ao focar com o teclado ou ao tocar, e fecha com Esc
- [x] O texto é associado ao ícone para leitor de tela
- [x] Saldo total diz: soma das contas ativas, cartões e empréstimos como dívida, sem bens nem pendentes
- [x] Receitas e Despesas dizem: dinheiro que entrou/saiu no mês, sem transferências nem pendentes; despesa conta quando é paga
- [x] Só tokens do tema; a verificação de tokens do design system passa
- [x] Teste de componente: abre com hover e com foco, fecha com Esc (sem infraestrutura de teste de componente no projeto; conferido à mão no navegador)
