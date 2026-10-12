# Spec de UI e UX

Complementa [design-system.md](design-system.md) (tokens e regras de estilo) com o que faltava: auditoria das telas atuais, padrões de interação e o desenho das telas novas (cupom, Assistant, Recurring bill, bancos). Termos em [GLOSSARY.md](../GLOSSARY.md). Quem implementa UI usa a skill `finance-ui`, que aponta para este arquivo.

## 1. Auditoria das telas atuais

Atualização em 2026-10-11 após a implementação das melhorias de UI/UX.

### Corrigido e verificado

- `AppShell`, `NavLink`, `PageHeader`, `Field`, `EmptyState`, `Link`, `Checkbox`, `Dialog`, `MonthStepper` e `SegmentedControl` já existem em `@finance/ui` e são usados nas jornadas atuais.
- Lançamentos agora priorizam a lista, com criação e edição em `Dialog` responsivo. No celular, o formulário ocupa a tela e mantém ações visíveis; `Esc` devolve o foco ao gatilho.
- A lista tem busca, filtros por mês/conta/categoria, contagem e carregamento progressivo. Não há corte silencioso em 200 itens.
- Exclusão tem cinco segundos para desfazer. A linha permanece marcada como pendente; a exportação espera a conclusão ou o desfazer.
- Contas podem ser renomeadas, arquivadas e reativadas. O diálogo de arquivamento explica que o saldo sai do total do painel.
- A primeira abertura fica no painel e preserva a rota solicitada. O painel usa `MonthStepper` e avisa quando escolhe automaticamente um mês anterior.
- `check:tokens` verifica `packages/ui/src` e `apps/web/src`; padrões de controles crus ainda são avisos, não erros.

### Ainda aberto

- Quando houver Connected mode, Receipt e Assistant, definir estados de carregamento e erro para operações de rede.
- Avaliar paginação por cursor no repositório se a base crescer muito. O carregamento atual aumenta o limite e refaz a consulta.
- Verificar teclado virtual e áreas seguras em aparelhos físicos. O navegador automatizado confirmou foco, `Esc` e ausência de rolagem horizontal a 375/1280 px.
- A tela inicial ainda usa o título geral Dashboard antes de abrir os dados. Uma identidade visual e texto de boas-vindas específicos podem ser explorados depois.

## 2. Princípios

1. **Compor, nunca estilizar.** Tela monta componentes de `@finance/ui`. Faltou um: cria em `packages/ui` primeiro, com variantes e só tokens.
2. **Lista primeiro, formulário sob demanda.** O que o usuário consulta ocupa a tela; criar e editar abrem em Dialog (desktop) ou Sheet (celular).
3. **Cor nunca sozinha.** Sinal `+`/`−`, ícone ou texto acompanham cor (já vale para `Money` e gráficos).
4. **Confirmar antes de apagar, e ainda poder desfazer.** Todo botão de excluir abre `ConfirmDialog` (com o nome do que será apagado e o efeito, "Cancelar" com o foco inicial). Depois de confirmar, excluir lançamentos ainda mostra toast com **Desfazer** (a exclusão só é gravada ao fim de alguns segundos). Excluir banco inteiro exige digitar o nome.
5. **Dizer onde se está.** Modo (Offline, Conectado, Desktop) e banco ativo sempre visíveis; alterações não exportadas indicadas no menu, não só num banner.
6. **Desabilitar com motivo, não esconder.** O que não existe no Offline mode (importar cupom, Assistant) aparece desabilitado com "Disponível no modo conectado".
7. **Toque primeiro.** Alvos de pelo menos 44 px em `pointer: coarse`; barra inferior no celular com ícone e rótulo curto.
8. **Todo estado tem tela.** Cada lista e cada ação assíncrona define vazio, carregando, erro e sucesso.

## 3. Padrões de interação

- **Formulários**: cada campo em `Field`. Validação ao sair do campo e ao enviar; o erro aparece sob o campo e o foco vai ao primeiro inválido. Botão principal à direita, secundário à esquerda; erro do servidor (que não é de campo) em `Alert` no topo do Dialog.
- **Lançamento rápido**: botão "Novo lançamento" (e atalho `n`) abre Dialog; no celular, botão flutuante abre Sheet. Tipo em `SegmentedControl`. Ordem: valor (com foco), tipo, conta, categoria, data, descrição. Lembra a última conta e a data. Ações: "Salvar" e "Salvar e adicionar outro".
- **Valor**: `inputmode="decimal"`, aceita `1250`, `1.250,00` e `1250,5`; ao sair do campo formata como `1.250,50`. Enquanto o lançamento é editado, uma prévia mostra valor, tipo, conta e categoria sem alterar os dados até Salvar. Não projetar saldo a partir de lançamento histórico.
- **Gráficos do painel**: barras pareadas mostram receitas e despesas nos seis meses até o mês selecionado, com tabela equivalente de valores. A rosca mostra composição das despesas do mês; sua tabela inclui participação percentual calculada. Gráficos não dependem só de cor, têm descrição em PT-BR e dados acessíveis em tabela; sem dados, mostram estado vazio. Transferências não entram nos totais.
- **Porcentagens vinculadas (conceito futuro)**: usar um divisor de duas partes A+B=100% somente quando houver regra de negócio para uma alocação proporcional. Arrastar deve atualizar ambos os lados e seus valores em reais, mas campos numéricos e teclado permanecem alternativas precisas; Salvar confirma, Cancelar descarta. Ver `docs/research-interacoes-valores.md`. Não aplicar aos percentuais derivados da rosca.
- **Mês**: `MonthStepper` (`‹ Outubro 2026 ›`) e botão "Hoje". O dashboard avisa quando abre num mês diferente do atual.
- **Tabelas**: no celular cada linha vira um item de lista (data e descrição à esquerda, valor à direita, conta e categoria em segunda linha). Ações da linha em menu `⋯`. Filtros ativos aparecem como chips removíveis. Lista passa dos 200: paginação "Carregar mais", sem corte silencioso.
- **Feedback**: sucesso em Toast (4 s, `role="status"`); erro de ação em Toast persistente com "Tentar de novo"; erro de campo sob o campo.
- **Vazio**: `EmptyState` com uma ação ("Criar a primeira conta"). Nunca só um texto cinza.
- **Carregando**: `Skeleton` com o formato do conteúdo; operação longa (ler cupom) mostra etapas e botão **Cancelar**.
- **Teclado**: Dialog prende o foco e devolve ao gatilho; `Esc` fecha; tudo alcançável por Tab; atalhos listados em "?".
- **Primeira abertura** (sem banco carregado): uma tela de boas-vindas só em `/`, com "Criar banco vazio" como ação principal, "Abrir arquivo .db" e "Ver demonstração" como secundárias. As outras rotas redirecionam para ela.

## 4. Componentes

A fundação atual de `@finance/ui` inclui `AppShell`, `NavLink`, `PageHeader`, `Field`, `EmptyState`, `Checkbox`, `Link`, `Dialog`, `ConfirmDialog`, `Toaster`, `SegmentedControl`, `MonthStepper`, os componentes de cartão/tabela/formulário e os componentes financeiros `Money` e `Kpi`. Ícones de `@lucide/svelte` já são usados.

Para as telas futuras da seção 5, ainda podem ser necessários `Stepper`, `FileDrop`, `Spinner`, `Tabs`, `Tooltip`, `DropdownMenu`, `ProposalCard`, `Combobox`, `Popover` e `DatePicker`. Criar em `packages/ui` quando a jornada correspondente for implementada; `ProposalCard` fica no app.

Os controles leem os tokens de `theme.css`, inclusive altura de toque de 44 px em `pointer: coarse`.

## 5. Telas novas

### Navegação
Sidebar (desktop) e barra inferior (celular, 5 itens): **Painel, Lançamentos, Contas, Contas fixas** (Recurring bills), **Mais** (Cupons, Assistant, Bancos, Configurações, Importar e exportar). No topo da sidebar: nome do banco ativo (menu para trocar) e selo do modo. Itens que o modo atual não suporta ficam desabilitados com dica.

### Importar cupom (Fase 3.5)
Fluxo em `Stepper`, sempre com "Cancelar":
1. **Origem**: três abas, *Câmera* (se houver HTTPS ou localhost), *Colar link*, *Enviar foto do QR*. Sem câmera, a aba some e o motivo aparece em texto.
2. **Lendo**: etapas "Baixando a página", "Lendo os itens", com `Spinner`; erro com mensagem clara (domínio não aceito, página fora do ar, IA sem chave) e "Tentar de novo".
3. **Revisar**: prévia **editável**. Cabeçalho (estabelecimento, data, conta, total) e tabela de itens (nome, quantidade, preço). Avisos visíveis: "A soma dos itens (R$ X) difere do total (R$ Y)", "Este cupom já foi importado" (bloqueia o botão). Campos sem valor ficam vazios, nunca preenchidos às cegas.
4. **Salvo**: confirmação com link para o lançamento e "Importar outro".

### Assistant (Fase 3.5)
Sheet lateral (desktop) ou tela cheia (celular). Conversa com **Proposal cards**: resumo em uma frase ("Criar despesa de R$ 82,40 em Mercado"), campos editáveis em linha, botões **Aprovar**, **Editar**, **Rejeitar**; várias propostas juntas permitem "Aprovar todas". Depois de aprovada, a proposta vira linha de histórico com **Desfazer**. Cabeçalho mostra o banco ativo, para ninguém aprovar no banco errado. Sem chave configurada: `EmptyState` que leva a Configurações.

### Contas fixas (Recurring bills)
Tabela (nome, Category, valor, periodicidade, vencimento, selo **Fixa**/**Supérflua**). No topo, dois `Kpi` (total mensal fixo, total mensal supérfluo) e um `Progress` com a proporção. Criar e editar em Dialog. Filtro por Category e por classificação. Deixa claro em texto que a lista não gera lançamentos.

### Bancos (admin do Connected mode)
Lista de bancos (nome, tamanho, última alteração, selo "Ativo"). Ações por linha em menu: Ativar, Renomear, Baixar, Excluir. Excluir abre `ConfirmDialog` pedindo para digitar o nome. "Novo banco" em Dialog (vazio ou com categorias padrão).

### Configurações
Tema; provedor de IA (URL base, chave mascarada com "Trocar", modelo, botão **Testar conexão** que mostra o resultado); limite de importação. A chave nunca é exibida de volta.

## 6. Próximos passos

1. Validar o formulário com teclado virtual e área segura em aparelhos físicos.
2. Se o volume de transações exigir, substituir o carregamento por limite crescente por paginação com cursor no repositório.
3. Ao implementar o Connected mode, acrescentar estados de carregamento, erro e recuperação para operações de rede.
4. Criar os componentes futuros apenas com as telas correspondentes da seção 5.

## 7. Decisões tomadas

- **Ícones**: `@lucide/svelte` adotado.
- **Marca**: identidade verde-água mantida no tema.
- **Exclusão**: sempre pede confirmação (`ConfirmDialog`); depois, gravação adiada por cinco segundos, com `Desfazer`; a exportação aguarda o resultado.
- **Atalhos de teclado** (`n`, `?`): ficam para uma etapa futura. A navegação básica e o diálogo já funcionam por teclado.

## 8. Definição de pronto para uma tela

- Só usa componentes de `@finance/ui`; `check:tokens` passa.
- Tem estados de vazio, carregando, erro e sucesso.
- Funciona a 375 px de largura e a 1280 px, nos temas claro e escuro, sem rolagem horizontal da página.
- Navegável só por teclado, com foco visível e rótulo em todo controle; alvos de toque de 44 px no celular.
- Ação destrutiva é desfazível ou pede confirmação.
- Texto da interface em PT-BR, valores via `Money`/`formatBRL`.
- Typecheck, lint e testes passam; fluxo principal coberto por teste e2e.
