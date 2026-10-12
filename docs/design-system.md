# Design system (`@finance/ui`)

Pacote `packages/ui`. Componentes Svelte 5 + Tailwind v4 que leem **todos** os valores visuais de um único arquivo: [`packages/ui/src/theme.css`](../packages/ui/src/theme.css).

Origem: estrutura e variantes adaptadas de [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT, Copyright (c) 2023 shadcn), convertidas de React/Radix para Svelte 5, com tokens e semântica financeira próprios. O shadcn usa Tailwind, não Twind.

## Regras

1. **Cor, raio, sombra e fonte só se definem em `theme.css`.** Componentes usam classes de token (`bg-primary`, `text-income`, `rounded-lg`).
2. **Proibido em componentes:** hex/rgb/oklch literais, paleta padrão do Tailwind (`bg-red-500`, `text-white`) e valores arbitrários (`w-[13px]`). `npm run check:tokens -w @finance/ui` falha o CI se aparecerem.
3. **Telas do app não estilizam do zero:** compõem componentes de `@finance/ui`. Se faltar um, cria-se em `packages/ui`.
4. **Tema:** claro/escuro via `data-theme` no `<html>`. `initTheme()` aplica o salvo ou o do sistema; `setTheme()` troca e salva.

## Tokens

| Grupo | Tokens |
|---|---|
| Superfícies | `background`, `foreground`, `card`, `popover`, `sidebar`, `muted`, `secondary`, `accent` (+ `-foreground`) |
| Marca e ação | `primary`, `destructive` (+ `-foreground`), `ring`, `border`, `input` |
| Semântica financeira | `income` (verde), `expense` (vermelho forte), `transfer`, `warning`, `success`, `benefit` (vale-alimentação e afins) |
| Categorias e gráficos | `cat-1` … `cat-7` (os gráficos usam as mesmas cores, `chart-1` … `chart-6`) |
| Movimento | `animate-rise`, `animate-fade`; `prefers-reduced-motion` desliga tudo |
| Controles | `h-control`, `h-control-sm`, `h-control-lg` (maiores em tela de toque); `text-page-title`, `text-section-title` |
| Forma | `--radius` (deriva `sm/md/lg/xl`), `shadow-xs/sm/md` |

Trocar a identidade visual = editar os valores em `theme.css`; nenhum componente muda.

## Acessibilidade

- Cor nunca é o único sinal: `Money` mostra `+`/`−`; gráficos devem usar padrões além de `chart-*` e ter tabela equivalente.
- Foco visível em todo controle (`ring`); `prefers-reduced-motion` respeitado em `theme.css`.

## Identidade

Azul de tecnologia como cor primária, verde para receita e um vermelho forte para despesa; negativo nunca depende só de cor (`Money` sempre mostra o sinal). Cada categoria tem uma das sete cores `cat-*`, escolhida pelo nome (`toneForName`), então a mesma categoria tem a mesma cor em qualquer banco. Prefira **ícones** a texto em ações (editar, excluir, arquivar): `IconButton` leva o nome da ação como `aria-label` e `title`.

## Componentes

`Button`, `IconButton`, `Badge`, `Card` (+ `CardHeader/Title/Description/Content/Footer`), `Input`, `Textarea`, `NativeSelect`, `Checkbox`, `SegmentedControl`, `Label`, `Field`, `Alert`, `Skeleton`, `Separator`, `Progress`, `Table` (+ partes), `PageHeader`, `EmptyState`, `Link`, `MonthStepper`, `Disclosure` (seção recolhida, como "Opções avançadas"), `InfoTip` ("i" que explica um número em uma ou duas frases; `Kpi` aceita `info`).

Overlays (bits-ui): `Dialog` (folha no celular, diálogo no desktop), `ConfirmDialog` (com `requireText` para exclusões graves), `Menu`, `Toaster` + `toast.show(...)` (com ação "Desfazer").

Navegação: `AppShell` (menu lateral fixo com seções, barra superior fixa, barra inferior no celular) e `NavLink` (item desabilitado com `disabledHint`, por exemplo "Em breve").

Financeiros: `Money` (sinal sempre correto), `CountUp` (conta de zero até o valor), `Kpi`, `TrendBadge`, `IconChip` (ícone em quadrado colorido).

Pendentes: `Tabs`, `Tooltip`, `Combobox`, `Sheet` próprio. Entram quando uma tela precisar.
## Uso

```svelte
<script lang="ts">
  import "@finance/ui/theme.css";
  import { Kpi, Money } from "@finance/ui";
</script>

<Kpi label="Receitas do mês"><Money cents={523000} tone="income" /></Kpi>
```

Auditoria das telas, padrões de UX, componentes a criar e telas novas: [ui-spec.md](ui-spec.md).
