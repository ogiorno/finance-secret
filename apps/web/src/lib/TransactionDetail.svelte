<script lang="ts">
  import { ArrowRight, Pencil, Trash } from "@lucide/svelte";
  import { PAYMENT_METHOD_LABELS } from "@finance/core";
  import type { TransactionListItem } from "@finance/database";
  import { Badge, Button, Dialog, Money } from "@finance/ui";
  import { describeFlow, formatDate } from "./flow";
  import TransactionItems from "./TransactionItems.svelte";

  let {
    open = $bindable(false),
    item,
    onEdit,
    onDelete,
  }: {
    open?: boolean;
    item: TransactionListItem | null;
    onEdit: (item: TransactionListItem) => void;
    onDelete: (item: TransactionListItem) => void;
  } = $props();

  const typeLabel = { income: "Receita", expense: "Despesa", transfer: "Transferência" } as const;
  const flow = $derived(item ? describeFlow(item) : null);
</script>

<Dialog bind:open title={item ? typeLabel[item.type] : "Lançamento"} description={item?.description || undefined}>
  {#if item && flow}
    <div class="mb-4 text-2xl font-semibold">
      <Money cents={item.amountCents} tone={item.type === "transfer" ? "neutral" : item.type} showSign={item.type === "transfer"} />
    </div>
    <dl class="grid text-sm">
      <div class="flex items-center justify-between gap-4 border-b py-2.5">
        <dt class="text-muted-foreground">De → Para</dt>
        <dd class="flex min-w-0 items-center gap-1.5 font-medium">
          <span class="sr-only">{flow.spoken}</span>
          <span class="truncate" aria-hidden="true">{flow.from}</span>
          <ArrowRight class="size-3.5 shrink-0" aria-hidden="true" />
          <span class="truncate" aria-hidden="true">{flow.to}</span>
        </dd>
      </div>
      {#if item.type !== "transfer"}
        <div class="flex items-center justify-between gap-4 border-b py-2.5">
          <dt class="text-muted-foreground">Categoria</dt>
          <dd class="font-medium">{item.categoryName ?? "Sem categoria"}</dd>
        </div>
      {/if}
      {#if item.type === "income"}
        <div class="flex items-center justify-between gap-4 border-b py-2.5">
          <dt class="text-muted-foreground">Fonte da renda</dt>
          <dd class="font-medium">{item.sourceName ?? "—"}</dd>
        </div>
      {/if}
      {#if item.type !== "transfer"}
        <div class="flex items-center justify-between gap-4 border-b py-2.5">
          <dt class="text-muted-foreground">Método de pagamento</dt>
          <dd class="font-medium">{item.paymentMethod ? PAYMENT_METHOD_LABELS[item.paymentMethod] : "—"}</dd>
        </div>
      {/if}
      {#if item.type === "expense"}
        <div class="flex items-center justify-between gap-4 border-b py-2.5">
          <dt class="text-muted-foreground">Despesa extra</dt>
          <dd class="font-medium">{item.isExtra ? "Sim" : "Não"}</dd>
        </div>
      {/if}
      <div class="flex items-center justify-between gap-4 border-b py-2.5">
        <dt class="text-muted-foreground">Data</dt>
        <dd class="font-medium">{formatDate(item.date)}</dd>
      </div>
      <div class="flex items-center justify-between gap-4 border-b py-2.5">
        <dt class="text-muted-foreground">Situação</dt>
        <dd>{#if item.status === "pending"}<Badge variant="warning">Pendente</Badge>{:else}<span class="font-medium">Realizado</span>{/if}</dd>
      </div>
      <div class="flex items-center justify-between gap-4 py-2.5">
        <dt class="text-muted-foreground">Descrição</dt>
        <dd class="font-medium">{item.description || "—"}</dd>
      </div>
    </dl>
    {#if item.type !== "transfer"}
      {#key item.id}<TransactionItems transactionId={item.id} />{/key}
    {/if}
  {/if}
  {#snippet footer()}
    {#if item}
      <Button
        variant="outline"
        onclick={() => {
          open = false;
          onDelete(item);
        }}><Trash aria-hidden="true" />Excluir</Button
      >
      <Button
        onclick={() => {
          open = false;
          onEdit(item);
        }}><Pencil aria-hidden="true" />Editar</Button
      >
    {/if}
  {/snippet}
</Dialog>
