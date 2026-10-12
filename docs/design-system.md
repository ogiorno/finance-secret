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
| Superfícies | `background`, `foreground`, `card`, `popover`, `muted`, `secondary`, `accent` (+ `-foreground`) |
| Marca e ação | `primary`, `destructive` (+ `-foreground`), `ring`, `border`, `input` |
| Semântica financeira | `income`, `expense`, `transfer`, `warning`, `success` |
| Gráficos | `chart-1` … `chart-6` |
| Forma | `--radius` (deriva `sm/md/lg/xl`), `shadow-xs/sm/md` |

Trocar a identidade visual = editar os valores em `theme.css`; nenhum componente muda.

## Acessibilidade

- Cor nunca é o único sinal: `Money` mostra `+`/`−`; gráficos devem usar padrões além de `chart-*` e ter tabela equivalente.
- Foco visível em todo controle (`ring`); `prefers-reduced-motion` respeitado em `theme.css`.

## Componentes

`Button`, `Badge`, `Card` (+ `CardHeader/Title/Description/Content/Footer`), `Input`, `Textarea`, `Label`, `Alert`, `Skeleton`, `Separator`, `Progress`, `Table` (+ `TableHeader/Body/Row/Head/Cell`), e os financeiros `Money` e `Kpi`.

Pendentes (exigem `bits-ui` para acessibilidade de teclado): `Dialog`, `Select`, `DropdownMenu`, `Tabs`, `Tooltip`, `Sheet`. Entram quando uma tela precisar.

## Uso

```svelte
<script lang="ts">
  import "@finance/ui/theme.css";
  import { Kpi, Money } from "@finance/ui";
</script>

<Kpi label="Receitas do mês"><Money cents={523000} tone="income" /></Kpi>
```

Auditoria das telas, padrões de UX, componentes a criar e telas novas: [ui-spec.md](ui-spec.md).
