<script lang="ts">
  import { Pencil, Trash } from "@lucide/svelte";
  import type { TransactionListItem } from "@finance/database";
  import { Badge, EmptyState, IconButton, IconChip, Money } from "@finance/ui";
  import { categoryStyle } from "./category-style";

  let {
    items,
    onEdit,
    onDelete,
    emptyTitle = "Nenhum lançamento neste período.",
  }: {
    items: TransactionListItem[];
    onEdit?: (item: TransactionListItem) => void;
    onDelete?: (item: TransactionListItem) => void;
    emptyTitle?: string;
  } = $props();

  const typeLabel = { income: "Receita", expense: "Despesa", transfer: "Transferência" } as const;

  function formatDate(date: string): string {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }
</script>

{#if items.length === 0}
  <EmptyState title={emptyTitle} />
{:else}
  <ul class="divide-y">
    {#each items as item, index (item.id)}
      {@const style = categoryStyle(item.categoryName, item.type)}
      <li
        class="group flex items-center gap-3 px-5 py-3 transition-colors animate-rise hover:bg-accent/50"
        style={`animation-delay: ${Math.min(index, 12) * 35}ms`}
      >
        <IconChip icon={style.icon} tone={style.tone} title={item.categoryName ?? typeLabel[item.type]} />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate font-medium">{item.description || item.categoryName || typeLabel[item.type]}</span>
            {#if item.status === "pending"}<Badge variant="warning">Pendente</Badge>{/if}
          </div>
          <div class="truncate text-xs text-muted-foreground">
            {item.categoryName ?? typeLabel[item.type]} · {item.accountName} · {formatDate(item.date)}
          </div>
        </div>
        <Money
          class="font-semibold whitespace-nowrap"
          cents={item.amountCents}
          tone={item.type === "transfer" ? "neutral" : item.type}
          showSign={item.type === "transfer"}
        />
        {#if onEdit || onDelete}
          <div class="flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
            {#if onEdit}<IconButton icon={Pencil} label={`Editar lançamento de ${formatDate(item.date)}`} onclick={() => onEdit(item)} />{/if}
            {#if onDelete}<IconButton icon={Trash} label={`Excluir lançamento de ${formatDate(item.date)}`} onclick={() => onDelete(item)} />{/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/if}