<script lang="ts">
  import type { TransactionListItem } from "@finance/database";
  import { Badge, EmptyState, Money, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@finance/ui";

  let {
    items,
    onDelete,
  }: { items: TransactionListItem[]; onDelete?: (item: TransactionListItem) => void } = $props();

  const typeLabel = { income: "Receita", expense: "Despesa", transfer: "Transferência" } as const;
  const typeBadge = { income: "income", expense: "expense", transfer: "transfer" } as const;

  function formatDate(date: string): string {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }
</script>

{#if items.length === 0}
  <EmptyState title="Nenhum lançamento neste período." />
{:else}
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Data</TableHead>
        <TableHead>Descrição</TableHead>
        <TableHead>Conta</TableHead>
        <TableHead>Categoria</TableHead>
        <TableHead class="text-right">Valor</TableHead>
        {#if onDelete}<TableHead><span class="sr-only">Ações</span></TableHead>{/if}
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each items as item (item.id)}
        <TableRow>
          <TableCell class="whitespace-nowrap">{formatDate(item.date)}</TableCell>
          <TableCell>
            {item.description || typeLabel[item.type]}
            {#if item.status === "pending"}<Badge variant="warning" class="ml-1">Pendente</Badge>{/if}
          </TableCell>
          <TableCell>{item.accountName}</TableCell>
          <TableCell>
            {#if item.categoryName}{item.categoryName}{:else}<Badge variant={typeBadge[item.type]}>{typeLabel[item.type]}</Badge>{/if}
          </TableCell>
          <TableCell class="text-right whitespace-nowrap">
            <Money cents={item.amountCents} tone={item.type === "transfer" ? "neutral" : item.type} showSign={item.type === "transfer"} />
          </TableCell>
          {#if onDelete}
            <TableCell class="text-right">
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Excluir lançamento de ${formatDate(item.date)}`}
                onclick={() => onDelete(item)}>Excluir</button
              >
            </TableCell>
          {/if}
        </TableRow>
      {/each}
    </TableBody>
  </Table>
{/if}
