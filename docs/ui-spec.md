# Spec de UI e UX

Complementa [design-system.md](design-system.md) (tokens e regras de estilo) com o que faltava: auditoria das telas atuais, padrões de interação e o desenho das telas novas (cupom, Assistant, Recurring bill, bancos). Termos em [GLOSSARY.md](../GLOSSARY.md). Quem implementa UI usa a skill `finance-ui`, que aponta para este arquivo.

## 1. Auditoria das telas atuais

Estado em 2026-10-11: `+layout`, `/`, `/transactions`, `/accounts`, `/backup` e os componentes de `apps/web/src/lib`.

### O que já está certo

- Nenhuma cor, raio, sombra ou valor arbitrário literal nas telas: tudo vem de token.
- As telas compõem `@finance/ui` (`Card`, `Table`, `Kpi`, `Money`, `Alert`, `Button`, `Input`, `NativeSelect`, `Label`).
- Acessibilidade de base: `aria-current` na navegação, foco visível, `Money` com sinal, gráfico com tabela equivalente e `decal`, `sr-only` na coluna de ações.
- Tema claro e escuro funcionando, inclusive no gráfico.

### Desvios do design system (devem virar componente em `packages/ui`)

| # | Onde | Problema | Correção |
|---|---|---|---|
| D1 | `+layout.svelte` | Sidebar, links e barra inferior montados com `<a>` e uma classe de ~250 caracteres, copiada duas vezes | `NavLink` e `AppShell` (sidebar e barra inferior) |
| D2 | `TransactionTable.svelte:50` | `<button>` cru para "Excluir", alvo de toque minúsculo | `Button variant="ghost" size="sm"` (ou menu de ações) |
| D3 | `+page.svelte:49`, `transactions:96` | `<a class="font-medium text-primary underline">` repetido | `Button variant="link"` com `href` ou componente `Link` |
| D4 | `transactions:148` | `<input type="checkbox">` cru | `Checkbox` |
| D5 | `transactions:85` | `confirm()` do navegador | `ConfirmDialog` |
| D6 | 4 páginas | `<h1 class="mb-6 text-2xl font-semibold">` repetido | `PageHeader` (título, descrição, ações) |
| D7 | ~14 campos | `<div class="grid gap-1.5"><Label/><Input/></div>` repetido, sem dica nem erro por campo | `Field` (label, hint, erro, `aria-describedby`, `aria-invalid`) |
| D8 | 3 lugares | `<p class="px-5 py-6 text-sm text-muted-foreground">` para estado vazio | `EmptyState` (ícone, texto, ação) |

### Lacunas de enforcement

- `check:tokens` só varre `packages/ui`. As telas em `apps/web/src` não são verificadas, então a regra 3 do design system não é garantida pelo CI. Ampliar o script para `apps/web/src` (cores, valores arbitrários) e, como aviso, `<button`, `<a class=` e `confirm(` nas rotas.
- Não consegui rodar `npm run check:tokens -w @finance/ui` nesta sessão (Windows apontando para o caminho do WSL, Node 22 em vez do 24). Rodar no WSL antes de usar este resultado como verdade.

### Problemas de UX

| # | Problema | Efeito |
|---|---|---|
| U1 | Transações não podem ser **editadas**, só criadas e excluídas | Erro de digitação obriga apagar e refazer |
| U2 | Formulário de lançamento fica sempre aberto no topo, 7 campos em 3 colunas | A lista (o que se consulta mais) desce para fora da tela |
| U3 | Tipo (Despesa, Receita, Transferência) é um `select` | Escolha mais frequente escondida num dropdown |
| U4 | Excluir pede `confirm()` e não dá como desfazer; o delete é definitivo | Perda de dado sem volta |
| U5 | Sucesso ("Lançamento salvo") e erro ficam fixos no card, longe do campo | Mensagem não some e não indica qual campo falhou |
| U6 | Mês é `<input type="month">`, mal suportado no Firefox e no Safari desktop | Seletor inconsistente |
| U7 | Dashboard escolhe sozinho o mês do último lançamento, sem avisar | Usuário vê "outubro" sem saber por quê |
| U8 | Lista limitada a 200 sem aviso; sem busca por texto nem filtro por categoria | Itens somem em silêncio |
| U9 | Tabela de 5 colunas no celular | Rolagem horizontal; a barra inferior com "Importar e exportar" também aperta |
| U10 | Alvos de toque de 32 px (`size="sm"`, link "Excluir") | Abaixo dos 44 px recomendados |
| U11 | Contas sem editar, renomear ou arquivar (o glossário prevê **Archived**) | Conta criada errada fica para sempre |
| U12 | Primeira abertura: três botões do mesmo peso e o texto "Abrir seus dados" repetido em cada página | Não fica claro qual é o primeiro passo |
| U13 | Valor monetário é texto livre, sem formatação ao sair do campo | Dúvida entre `1.250,00` e `1250` |
| U14 | Sem estados de carregamento e erro de rede (hoje tudo é síncrono) | Quebra quando existirem Connected mode, Receipt e Assistant |

## 2. Princípios

1. **Compor, nunca estilizar.** Tela monta componentes de `@finance/ui`. Faltou um: cria em `packages/ui` primeiro, com variantes e só tokens.
2. **Lista primeiro, formulário sob demanda.** O que o usuário consulta ocupa a tela; criar e editar abrem em Dialog (desktop) ou Sheet (celular).
3. **Cor nunca sozinha.** Sinal `+`/`−`, ícone ou texto acompanham cor (já vale para `Money` e gráficos).
4. **Reversível por padrão.** Excluir mostra toast com **Desfazer** (a exclusão só é gravada ao fim de alguns segundos). `ConfirmDialog` fica para o que não dá para desfazer (excluir banco inteiro).
5. **Dizer onde se está.** Modo (Offline, Conectado, Desktop) e banco ativo sempre visíveis; alterações não exportadas indicadas no menu, não só num banner.
6. **Desabilitar com motivo, não esconder.** O que não existe no Offline mode (importar cupom, Assistant) aparece desabilitado com "Disponível no modo conectado".
7. **Toque primeiro.** Alvos de pelo menos 44 px em `pointer: coarse`; barra inferior no celular com ícone e rótulo curto.
8. **Todo estado tem tela.** Cada lista e cada ação assíncrona define vazio, carregando, erro e sucesso.

## 3. Padrões de interação

- **Formulários**: cada campo em `Field`. Validação ao sair do campo e ao enviar; o erro aparece sob o campo e o foco vai ao primeiro inválido. Botão principal à direita, secundário à esquerda; erro do servidor (que não é de campo) em `Alert` no topo do Dialog.
- **Lançamento rápido**: botão "Novo lançamento" (e atalho `n`) abre Dialog; no celular, botão flutuante abre Sheet. Tipo em `SegmentedControl`. Ordem: valor (com foco), tipo, conta, categoria, data, descrição. Lembra a última conta e a data. Ações: "Salvar" e "Salvar e adicionar outro".
- **Valor**: `inputmode="decimal"`, aceita `1250`, `1.250,00` e `1250,5`; ao sair do campo formata como `1.250,50`.
- **Mês**: `MonthStepper` (`‹ Outubro 2026 ›`) e botão "Hoje". O dashboard avisa quando abre num mês diferente do atual.
- **Tabelas**: no celular cada linha vira um item de lista (data e descrição à esquerda, valor à direita, conta e categoria em segunda linha). Ações da linha em menu `⋯`. Filtros ativos aparecem como chips removíveis. Lista passa dos 200: paginação "Carregar mais", sem corte silencioso.
- **Feedback**: sucesso em Toast (4 s, `role="status"`); erro de ação em Toast persistente com "Tentar de novo"; erro de campo sob o campo.
- **Vazio**: `EmptyState` com uma ação ("Criar a primeira conta"). Nunca só um texto cinza.
- **Carregando**: `Skeleton` com o formato do conteúdo; operação longa (ler cupom) mostra etapas e botão **Cancelar**.
- **Teclado**: Dialog prende o foco e devolve ao gatilho; `Esc` fecha; tudo alcançável por Tab; atalhos listados em "?".
- **Primeira abertura** (sem banco carregado): uma tela de boas-vindas só em `/`, com "Criar banco vazio" como ação principal, "Abrir arquivo .db" e "Ver demonstração" como secundárias. As outras rotas redirecionam para ela.

## 4. Componentes

### Existem
`Alert`, `Badge`, `Button`, `Card` (+ partes), `Input`, `Kpi`, `Label`, `Money`, `NativeSelect`, `Progress`, `Separator`, `Skeleton`, `Table` (+ partes), `Textarea`.

### A criar (ordem de prioridade)

**P0, antes de qualquer tela nova** (corrige D1 a D8):
`PageHeader`, `Field`, `EmptyState`, `Checkbox`, `Link` (ou `Button variant="link"` com `href`), `NavLink`/`AppShell`, `ConfirmDialog` e `Dialog`, `Toast`, `SegmentedControl`, `MonthStepper`, `ResponsiveRow` (item de lista no celular).

**P1, para a Fase 3.5** (cupom e Assistant):
`Sheet`, `Stepper`, `FileDrop` (arrastar, escolher ou tirar foto), `Spinner`, `Tabs`, `Tooltip`, `DropdownMenu`, `ProposalCard` (compõe `Card`, `Badge` e `Button`; fica no app, não no pacote).

**P2**:
`Combobox` para categoria (lista longa com busca), `Popover`, `DatePicker`.

Dialog, Sheet, Tabs, Tooltip, DropdownMenu e Combobox usam `bits-ui` (já previsto no design system) para o teclado e o ARIA.

### Ícones e densidade
- Proposta: `@lucide/svelte` (licença ISC) para ícones de navegação, ações e estados. Decisão aberta, ver seção 7.
- Tokens a acrescentar em `theme.css`: altura de controle (`--control-h`: 2.25rem; `2.75rem` em `pointer: coarse`) e escala de texto semântica (título de página, título de seção, corpo, legenda). Os componentes passam a ler esses tokens.

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

## 6. Ordem de implementação sugerida

1. **Fundação de UI**: P0 de componentes, tokens de controle e texto, ampliar `check:tokens`. Migrar as 4 telas atuais (corrige D1 a D8).
2. **Lançamentos**: editar (U1), lançamento rápido, desfazer, filtros e celular (U2 a U10).
3. **Contas e primeira abertura**: editar e arquivar (U11), boas-vindas (U12).
4. **P1 de componentes**, depois Cupom, Assistant, Contas fixas, Bancos e Configurações, na ordem das fases 3.5 em diante.

Cada passo vira ticket pequeno e vertical (`/to-tickets`).

## 7. Decisões abertas

- **Ícones**: adotar `@lucide/svelte`? Recomendação: sim.
- **Marca**: manter o primário verde-água atual ou trocar a identidade (basta editar `theme.css`)? Recomendação: manter até o P0 estar pronto e só então avaliar.
- **Exclusão com desfazer**: aceitar o atraso de ~5 s na gravação para permitir Desfazer? Recomendação: sim.
- **Atalhos de teclado** (`n`, `?`): entram já no P0 ou depois? Recomendação: depois.

## 8. Definição de pronto para uma tela

- Só usa componentes de `@finance/ui`; `check:tokens` passa.
- Tem estados de vazio, carregando, erro e sucesso.
- Funciona a 375 px de largura e a 1280 px, nos temas claro e escuro, sem rolagem horizontal da página.
- Navegável só por teclado, com foco visível e rótulo em todo controle; alvos de toque de 44 px no celular.
- Ação destrutiva é desfazível ou pede confirmação.
- Texto da interface em PT-BR, valores via `Money`/`formatBRL`.
- Typecheck, lint e testes passam; fluxo principal coberto por teste e2e.
