<script lang="ts">
  import type { TransactionListItem } from "@finance/database";
  import { Badge, Button, Card, EmptyState, Money, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@finance/ui";

  let {
    items,
    onEdit,
    onDelete,
    pendingDeleteId = null,
    pendingDeleteGroupId = null,
  }: {
    items: TransactionListItem[];
    onEdit?: (item: TransactionListItem) => void;
    onDelete?: (item: TransactionListItem) => void;
    pendingDeleteId?: number | null;
    pendingDeleteGroupId?: number | null;
  } = $props();

  const typeLabel = { income: "Receita", expense: "Despesa", transfer: "Transferência" } as const;
  const typeBadge = { income: "income", expense: "expense", transfer: "transfer" } as const;

  function deletionPending(item: TransactionListItem): boolean {
    return pendingDeleteId === item.id || (item.transferGroupId !== null && pendingDeleteGroupId === item.transferGroupId);
  }

  function formatDate(date: string): string {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }
</script>

{#if items.length === 0}
  <EmptyState title="Nenhum lançamento encontrado." description="Mude os filtros ou crie um lançamento." />
{:else}
  <div class="grid gap-2 px-4 md:hidden">
    {#each items as item (item.id)}
      <Card class="gap-2 px-4 py-3" aria-label={`${item.description || typeLabel[item.type]}, ${formatDate(item.date)}`}>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-medium">{item.description || typeLabel[item.type]}</div>
            <div class="text-xs text-muted-foreground">{formatDate(item.date)} · {item.accountName}</div>
          </div>
          <Money cents={item.amountCents} tone={item.type === "transfer" ? "neutral" : item.type} showSign={item.type === "transfer"} />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap gap-1">
            {#if item.categoryName}<Badge variant="secondary">{item.categoryName}</Badge>{:else}<Badge variant={typeBadge[item.type]}>{typeLabel[item.type]}</Badge>{/if}
            {#if item.status === "pending"}<Badge variant="warning">Pendente</Badge>{/if}
            {#if deletionPending(item)}<Badge variant="warning">Exclusão pendente</Badge>{/if}
          </div>
          {#if onEdit || onDelete}
            <div class="flex gap-1">
              {#if onEdit}<Button variant="ghost" size="sm" onclick={() => onEdit?.(item)} disabled={pendingDeleteId !== null}>Editar</Button>{/if}
              {#if onDelete}<Button variant="ghost" size="sm" onclick={() => onDelete?.(item)} disabled={pendingDeleteId !== null}>Excluir</Button>{/if}
            </div>
          {/if}
        </div>
      </Card>
    {/each}
  </div>
  <div class="hidden md:block">
    <Table>
      <TableHeader><TableRow>
        <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Conta</TableHead><TableHead>Categoria</TableHead><TableHead class="text-right">Valor</TableHead>
        {#if onEdit || onDelete}<TableHead><span class="sr-only">Ações</span></TableHead>{/if}
      </TableRow></TableHeader>
      <TableBody>
        {#each items as item (item.id)}
          <TableRow>
            <TableCell class="whitespace-nowrap">{formatDate(item.date)}</TableCell>
            <TableCell>
              {item.description || typeLabel[item.type]}
              {#if item.status === "pending"}<Badge variant="warning" class="ml-1">Pendente</Badge>{/if}
              {#if deletionPending(item)}<Badge variant="warning" class="ml-1">Exclusão pendente</Badge>{/if}
            </TableCell>
            <TableCell>{item.accountName}</TableCell>
            <TableCell>{#if item.categoryName}{item.categoryName}{:else}<Badge variant={typeBadge[item.type]}>{typeLabel[item.type]}</Badge>{/if}</TableCell>
            <TableCell class="text-right whitespace-nowrap"><Money cents={item.amountCents} tone={item.type === "transfer" ? "neutral" : item.type} showSign={item.type === "transfer"} /></TableCell>
            {#if onEdit || onDelete}
              <TableCell class="text-right whitespace-nowrap">
                {#if onEdit}<Button variant="ghost" size="sm" aria-label={`Editar ${item.description || typeLabel[item.type]} de ${formatDate(item.date)}`} onclick={() => onEdit?.(item)} disabled={pendingDeleteId !== null}>Editar</Button>{/if}
                {#if onDelete}<Button variant="ghost" size="sm" aria-label={`Excluir ${item.description || typeLabel[item.type]} de ${formatDate(item.date)}`} onclick={() => onDelete?.(item)} disabled={pendingDeleteId !== null}>Excluir</Button>{/if}
              </TableCell>
            {/if}
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
{/if}
