# Pesquisa: gráficos e entrada de valores

Data: 2026-10-11. Escopo: painel e lançamento atuais; conceito de porcentagens para uma função futura.

## Estado observado no projeto

- O painel já mostra um gráfico de rosca de despesas por categoria, com tabela de valores ao lado (`apps/web/src/routes/+page.svelte`, `apps/web/src/lib/SpendingChart.svelte`).
- O lançamento atual recebe valor em um campo decimal e formata em BRL ao perder o foco (`apps/web/src/routes/transactions/+page.svelte`).
- Não há hoje fluxo de relatório com edição de porcentagens. Portanto, o controle percentual abaixo é uma proposta de componente, não uma função existente ou concluída.

## Referências primárias

1. [Actual Budget — Reports Dashboard](https://actualbudget.org/docs/reports/): o fluxo de caixa separa receitas e despesas ao longo do tempo; os relatórios oferecem filtros e intervalos de data. [Custom Reports](https://actualbudget.org/docs/reports/custom-reports/) documenta as representações em tabela, barras, linhas, área e rosca. **Aplicação:** o próximo gráfico deste projeto deve responder uma pergunta diferente da rosca: “como receitas e despesas mudaram mês a mês?”. Os mesmos dados precisam estar disponíveis em tabela; alternar todos os tipos de gráfico neste estágio aumentaria controles sem melhorar a tarefa principal.
2. [Actual Budget — Split Transactions](https://actualbudget.org/docs/transactions/split-transactions/): a soma das partes precisa igualar o total; a ferramenta oferece distribuição igual ou proporcional do restante e trata centavos indivisíveis. **Aplicação:** se uma função futura repartir um valor entre partes, manter a soma como invariante e definir explicitamente a regra dos centavos.
3. [Carbon Design System — Slider accessibility](https://www.carbondesignsystem.com/building-blocks/core/components/slider/accessibility): o slider e o campo numérico ficam sincronizados; ambos podem receber foco e ser operados pelo teclado; a entrada numérica permite precisão. **Aplicação:** arraste não pode ser a única forma de ajuste.
4. [Material Design — Sliders](https://m2.material.io/develop/web/components/input-controls/sliders/): o retorno visual deve acompanhar o ajuste, e o número pode ser editável para definir um valor exato. **Aplicação:** refletir o efeito no gráfico/valor enquanto o usuário altera o rascunho, sem gravar cada movimento.
5. [W3C WAI-ARIA APG — Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/): setas, Home e End são operações esperadas; o controle precisa de rótulo e valor acessíveis. O APG alerta para limitações de sliders em tecnologias assistivas de toque e pede testes em aparelhos reais. **Aplicação:** manter campo numérico alternativo e validar interação em celular real antes de chamar o controle de pronto.
6. [Apache ECharts — Web Accessibility](https://echarts.apache.org/handbook/en/best-practices/aria/): a descrição ARIA e padrões `decal` podem complementar cores nas séries. **Aplicação:** rótulos, padrões e tabela de dados devem acompanhar os gráficos renderizados em canvas.
7. [GitHub de Actual Budget — feedback sobre relatórios](https://github.com/actualbudget/actual/issues/1918): usuários discutiram que porcentagens impressas em todas as fatias de uma rosca com muitas categorias podem poluir a visualização. É feedback de uma issue, não uma regra de design validada para este projeto. **Aplicação:** mostrar porcentagem exata na tabela/tooltip, sem etiquetar todas as fatias.

## Proposta UX acordada entre os agentes

### Agora: leitura mais útil no painel

- Acrescentar um gráfico de **receitas × despesas por mês**, usando os dados já registrados. Barras pareadas ou duas linhas são candidatas; barras pareadas facilitam comparar os dois montantes em cada mês. Exibir o período inteiro e não somente o mês escolhido isolado.
- Manter a rosca por categoria para composição do mês; incluir a participação percentual na tabela correspondente, calculada sobre o total das despesas do período.
- Tabela equivalente para o gráfico temporal, com mês, receitas e despesas. Valores com rótulos e sinais; não depender só de cor. O estado sem dados precisa explicar o que falta, em vez de mostrar eixos vazios.
- A apresentação não deve insinuar que receitas e despesas são metas. São números observados, derivados dos lançamentos.

### Próximo passo de entrada monetária, condicionado a teste rápido com usuários

- Conservar o campo de valor livre, pois ele é preciso, rápido por teclado e já atende `inputmode="decimal"`. Diferenciar a experiência pela **prévia imediata do efeito** enquanto o lançamento é editado: valor formatado, tipo, conta e categoria selecionados em um resumo legível do rascunho (por exemplo, “Despesa de R$ X · Conta Y · Categoria Z”). Evitar projetar saldo futuro: lançamentos com data histórica poderiam tornar essa mensagem ambígua.
- Evitar sugestões automáticas de valores de gasto ou animações de recompensa por registrar despesa. A hipótese de “sensação boa” aqui é clareza e controle: ver o efeito, corrigir sem fricção e salvar com confirmação. Validar com usuários se essa prévia reduz dúvidas ou distrai durante o registro.

### Futuro: “divisor vinculado” para uma decisão que some 100%

- Só usar quando o significado do produto exigir duas partes complementares. Exemplo abstrato: A = 65% implica B = 35%. Não aplicar a qualquer campo percentual independente.
- Componente: dois cartões de números grandes (`A 65%`, `B 35%`) ligados por uma barra horizontal segmentada. Mover a divisão altera os dois valores instantaneamente. Cada lado também tem campo numérico para edição precisa; teclado opera a divisão. Mostrar “Total 100%” permanentemente.
- Para valores monetários relacionados, prévia `A R$ … / B R$ …` calculada a partir de um total conhecido. Calcular A em centavos inteiros e B = total − A; assim nenhum centavo se perde. Exibir o total e manter A + B = 100% quando a relação for percentual.
- Separar **prévia** de **salvamento**. Arrastar ou digitar atualiza um rascunho; “Salvar” confirma uma única alteração; “Cancelar” descarta; “Desfazer” recupera a última distribuição salva quando aplicável.
- Não estender diretamente este componente para três ou mais partes. Antes disso, definir qual parte cede quando outra cresce, como evitar valores negativos e qual regra distribui centavos. Um controle de duas partes tem semântica muito mais clara.
- A barra não substitui o número e não deve usar gráfico de rosca como controle: divisórias pequenas são difíceis de operar e o usuário precisa de precisão. Critérios de aceite: A+B=100 em todos os estados válidos, Tab/setas/Home/End e digitação exata, alvo de toque de 44 px, foco visível, cancelar descarta, sem perda de centavos. Validar toque, teclado, leitor de tela e contraste.

## Decisão e limite da pesquisa

A decisão para a interface atual é melhorar a **leitura dos dados reais** com comparação temporal e percentuais calculados, mantendo a entrada monetária direta. O divisor percentual é uma direção de componente para uma função que ainda precisará de regra de negócio e teste de usabilidade. Esta pesquisa não cria relatórios editáveis nem um novo fluxo de produto.

