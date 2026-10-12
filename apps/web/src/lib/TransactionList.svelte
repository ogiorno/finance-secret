<script lang="ts">
  import { ArrowRight, Pencil, Trash } from "@lucide/svelte";
  import { PAYMENT_METHOD_LABELS } from "@finance/core";
  import type { TransactionListItem } from "@finance/database";
  import { Badge, Button, EmptyState, IconButton, IconChip, Money } from "@finance/ui";
  import { categoryStyle } from "./category-style";
  import { describeFlow, formatDate } from "./flow";

  let {
    items,
    onOpen,
    onEdit,
    onDelete,
    emptyTitle = "Nenhum lançamento neste período.",
  }: {
    items: TransactionListItem[];
    /** Abre o detalhe do lançamento ao clicar na linha. */
    onOpen?: (item: TransactionListItem) => void;
    onEdit?: (item: TransactionListItem) => void;
    onDelete?: (item: TransactionListItem) => void;
    emptyTitle?: string;
  } = $props();

  const typeLabel = { income: "Receita", expense: "Despesa", transfer: "Transferência" } as const;
</script>

{#if items.length === 0}
  <EmptyState title={emptyTitle} />
{:else}
  <ul class="divide-y">
    {#each items as item, index (item.id)}
      {@const style = categoryStyle(item.categoryName, item.type)}
      {@const flow = describeFlow(item)}
      <li
        class="group flex items-center gap-3 px-5 py-3 transition-colors animate-rise hover:bg-accent/50"
        style={`animation-delay: ${Math.min(index, 12) * 35}ms`}
      >
        {#snippet body()}
          <IconChip icon={style.icon} tone={style.tone} title={item.categoryName ?? typeLabel[item.type]} />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate font-medium">{item.description || item.categoryName || typeLabel[item.type]}</span>
              {#if item.status === "pending"}<Badge variant="warning">Pendente</Badge>{/if}
              {#if item.isExtra}<Badge variant="outline">Extra</Badge>{/if}
            </div>
            <div class="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <span class="sr-only">{flow.spoken}</span>
              <span class="flex min-w-0 items-center gap-1" aria-hidden="true">
                <span class="truncate">{flow.from}</span>
                <ArrowRight class="size-3 shrink-0" />
                <span class="truncate font-medium text-foreground">{flow.to}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span class="whitespace-nowrap">{formatDate(item.date)}</span>
              {#if item.paymentMethod}
                <span aria-hidden="true">·</span>
                <span class="whitespace-nowrap">{PAYMENT_METHOD_LABELS[item.paymentMethod]}</span>
              {/if}
            </div>
          </div>
          <Money
            class="font-semibold whitespace-nowrap"
            cents={item.amountCents}
            tone={item.type === "transfer" ? "neutral" : item.type}
            showSign={item.type === "transfer"}
          />
        {/snippet}
        {#if onOpen}
          <Button
            variant="ghost"
            class="h-auto min-w-0 flex-1 justify-start gap-3 rounded-none px-0 py-0 text-left font-normal whitespace-normal hover:bg-transparent"
            onclick={() => onOpen(item)}
          >
            {@render body()}
          </Button>
        {:else}
          <div class="flex min-w-0 flex-1 items-center gap-3">{@render body()}</div>
        {/if}
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