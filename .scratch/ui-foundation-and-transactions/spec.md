Status: ready-for-agent

# Fundação de UI e lançamentos

## Problem Statement

As telas atuais funcionam, mas a interface não está boa. O menu e alguns controles foram montados à mão, em vez de usar o design system. Não consigo corrigir um lançamento errado (só apagar e refazer). O formulário de novo lançamento ocupa o topo da tela e empurra a lista para baixo. Apagar é definitivo e usa o aviso do navegador. No celular a tabela rola para o lado e a barra de navegação aperta. A lista corta em 200 itens sem avisar. Na primeira abertura não está claro o que fazer.

## Solution

Uma base de componentes no design system (cabeçalho de página, campo de formulário, estado vazio, diálogos, avisos, controle segmentado, seletor de mês), as quatro telas migradas para ela, e os lançamentos reformulados: lista em primeiro plano, lançamento rápido em diálogo, edição de qualquer lançamento, exclusão com "Desfazer", filtros, busca e uma versão boa para o celular. Contas ganham editar e arquivar, e a primeira abertura vira uma tela de boas-vindas. O detalhamento visual e de interação está em `docs/ui-spec.md`.

## User Stories

1. Como usuário, quero que todas as telas tenham o mesmo cabeçalho, espaçamento e botões, para que o app pareça um produto só.
2. Como usuário, quero um menu lateral com ícones no computador, para chegar às telas sem ler textos longos.
3. Como usuário de celular, quero uma barra inferior com cinco itens e ícones, para navegar com o polegar sem os rótulos se cortarem.
4. Como usuário, quero ver qual modo estou usando (Offline mode, Connected mode ou Desktop mode), para saber o que o app pode fazer agora.
5. Como usuário do Offline mode, quero ver no menu que há alterações não exportadas, para não perder dados ao fechar a página.
6. Como usuário, quero que cada campo de formulário mostre dica e erro logo abaixo, para saber o que corrigir.
7. Como usuário, quero que, ao enviar com erro, o foco vá para o primeiro campo inválido, para corrigir sem procurar.
8. Como usuário, quero um estado vazio com um botão de ação ("Criar a primeira conta"), para saber o próximo passo.
9. Como usuário, quero registrar um lançamento sem sair da lista, abrindo-o num diálogo, para continuar vendo meus dados.
10. Como usuário de celular, quero que o novo lançamento abra numa folha de baixo para cima, para preencher com uma mão.
11. Como usuário, quero escolher o tipo (Despesa, Receita, Transferência) num controle segmentado, para trocar com um toque.
12. Como usuário, quero que o campo de valor receba o foco ao abrir o lançamento, para digitar de imediato.
13. Como usuário, quero digitar `1250`, `1.250,00` ou `1250,5` no valor e vê-lo formatado ao sair do campo, para ter certeza do que será gravado.
14. Como usuário, quero que o lançamento lembre a última conta e a data usadas, para lançar vários em sequência mais rápido.
15. Como usuário, quero "Salvar e adicionar outro", para registrar vários lançamentos sem reabrir o diálogo.
16. Como usuário, quero editar qualquer lançamento (valor, data, descrição, conta, categoria, status), para corrigir erros sem apagar.
17. Como usuário, quero editar uma Transfer e ter as duas pernas atualizadas juntas, para que os saldos continuem batendo.
18. Como usuário, quero que o app impeça escolher uma Category de tipo diferente do lançamento, para não gerar dados incoerentes.
19. Como usuário, quero marcar um lançamento como Pending ou Posted ao criar ou editar, para controlar o que entra nos saldos.
20. Como usuário, quero excluir um lançamento e ver um aviso com "Desfazer" por alguns segundos, para me recuperar de um clique errado.
21. Como usuário, quero que excluir uma Transfer deixe claro que as duas pernas somem, para não ser surpreendido.
22. Como usuário, quero um diálogo de confirmação apenas para o que não pode ser desfeito, para não ser interrompido à toa.
23. Como usuário, quero escolher o mês com setas e um botão "Hoje", para navegar sem depender do seletor do navegador.
24. Como usuário, quero que o painel me diga quando está mostrando um mês diferente do atual, para não achar que os dados estão errados.
25. Como usuário, quero filtrar por conta, categoria e texto e ver os filtros como etiquetas removíveis, para saber o que está aplicado.
26. Como usuário, quero um botão "Carregar mais" quando a lista passa de 200, para não perder lançamentos em silêncio.
27. Como usuário de celular, quero cada lançamento como um item de lista (data e descrição à esquerda, valor à direita), para ler sem rolar para o lado.
28. Como usuário de celular, quero alvos de toque de pelo menos 44 px, para acertar os botões.
29. Como usuário, quero ações de cada linha num menu "⋯", para a lista ficar limpa.
30. Como usuário, quero renomear uma conta, para corrigir o nome.
31. Como usuário, quero arquivar uma conta com histórico (Archived), para ela sumir dos novos lançamentos sem apagar o passado.
32. Como usuário, quero excluir uma conta que nunca foi usada, para limpar contas criadas por engano.
33. Como usuário, quero ver contas arquivadas se eu pedir, para consultar o histórico.
34. Como usuário novo, quero uma tela de boas-vindas com "Criar banco vazio" como ação principal, para saber por onde começar.
35. Como usuário novo, quero "Abrir arquivo .db" e "Ver demonstração" como opções secundárias, para escolher meu caminho.
36. Como usuário sem banco aberto, quero ser levado à tela de boas-vindas ao abrir qualquer outra rota, para não ver telas vazias.
37. Como usuário de teclado, quero que os diálogos prendam o foco, fechem com Esc e devolvam o foco ao botão que os abriu, para usar o app sem mouse.
38. Como usuário com leitor de tela, quero que todo controle tenha rótulo e que avisos usem papéis adequados, para entender o que acontece.
39. Como usuário, quero que valores positivos e negativos tragam sinal e não só cor, para ler sem depender de cor.
40. Como usuário, quero os temas claro e escuro em todos os componentes novos, para usar à noite.
41. Como usuário que prefere menos movimento, quero que as animações respeitem essa preferência, para não me incomodar.
42. Como mantenedor, quero que a verificação de tokens também cubra as telas do app, para o design system ser garantido pelo CI.

## Implementation Decisions

- Os componentes novos entram no pacote do design system, usam só tokens e seguem `docs/design-system.md`. O teclado e o ARIA de diálogo, folha, abas, dica e menu vêm de bits-ui.
- Componentes desta entrega: cabeçalho de página, campo de formulário (rótulo, dica, erro, ligação ARIA), estado vazio, link, caixa de seleção, controle segmentado, seletor de mês, diálogo e diálogo de confirmação, aviso temporário (toast), item de lista responsivo, e o conjunto de navegação (item de menu e estrutura da aplicação).
- O tema ganha uma altura de controle (maior em ponteiro de toque) e uma escala de texto semântica; os componentes passam a lê-las.
- Ícones: `@lucide/svelte`, salvo decisão contrária (ver Further Notes).
- O script de verificação de tokens passa a varrer também as telas do app, e avisa sobre botões e links crus e uso de confirmação do navegador.
- Excluir lançamento adia a gravação por cerca de cinco segundos; "Desfazer" cancela a exclusão pendente. Fechar a página durante a espera aplica a exclusão. Para o que não dá para desfazer, usa-se confirmação por diálogo.
- Repositório: nova operação de **editar lançamento**, igual nos dois drivers (ADR 0001). Editar uma Transfer atualiza as duas pernas e mantém a soma zero (ADR 0002). A regra "o tipo do lançamento deve bater com o tipo da Category" continua valendo na edição. O `status` pode alternar entre Pending e Posted.
- Repositório: nova operação de **editar conta** (nome) e de **arquivar e desarquivar**; só conta sem histórico pode ser excluída (regra do glossário).
- A listagem de lançamentos aceita filtro de texto e de Category, além de mês e conta, e informa quando há mais itens além do limite.
- O formulário de lançamento reaproveita o mesmo componente para criar e editar. Lembra a última conta e a data só durante a sessão.
- O painel avisa quando o mês escolhido automaticamente (o último com lançamentos) difere do mês atual.
- A tela de boas-vindas existe só na rota inicial; as demais rotas redirecionam para ela enquanto não houver banco carregado.
- Todo texto de interface em PT-BR; valores sempre por `Money` e `formatBRL`.

## Testing Decisions

- Um bom teste verifica o que o usuário vê e faz (abrir o diálogo, preencher, salvar, ver a lista mudar), não detalhes internos de um componente.
- Seam principal: **E2E no navegador** (Playwright), no Offline mode. Cobre: criar, editar, excluir e desfazer, filtrar, buscar, carregar mais, arquivar conta, boas-vindas, e o fluxo a 375 px de largura. Os componentes novos são exercitados por esses fluxos, não um a um.
- Seam secundário: **repositório** (`packages/database`), rodando nos dois drivers, para editar lançamento (incluindo Transfer), editar e arquivar conta, filtros novos e o indicador de "há mais itens".
- O teste "zero requisições externas e zero violações de CSP" continua obrigatório para todas as telas novas.
- Acessibilidade básica no E2E: foco preso no diálogo, fechamento com Esc, rótulos presentes.
- Prior art: o E2E existente de demonstração e de criar, editar, exportar e reabrir; as suítes de repositório de transferências e de exclusão.

## Out of Scope

- Cupom, Assistant, Recurring bill, vários bancos e configurações de IA (spec `receipts-assistant-databases`).
- Desktop mode.
- Combobox com busca para Category, seletor de data próprio, atalhos de teclado.
- Mudança de identidade visual (cores, fontes).
- Sincronização entre dispositivos e senha.

## Further Notes

- Decisões ainda abertas em `docs/ui-spec.md` seção 7: ícones com `@lucide/svelte`, manter a cor primária, exclusão com atraso de cinco segundos para o "Desfazer", e atalhos de teclado depois. Este spec assume as recomendações (sim, manter, sim, depois).
- Ordem sugerida de implementação: verificação de tokens e tema, componentes de página e migração das telas, navegação, diálogos e avisos com exclusão desfazível, edição de lançamento, lançamento rápido, lista e celular, contas, boas-vindas.
