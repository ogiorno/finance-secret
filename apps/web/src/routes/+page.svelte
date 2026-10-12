<script lang="ts">
  import {
    Card, CardContent, CardHeader, CardTitle, EmptyState, Field, Input, Kpi, Link, Money, PageHeader,
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  } from "@finance/ui";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import SpendingChart from "$lib/SpendingChart.svelte";
  import TransactionTable from "$lib/TransactionTable.svelte";
  import { session } from "$lib/session.svelte";

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  let chosenMonth = $state<string | null>(null);

  const view = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const latest = repo.listTransactions({ limit: 1 })[0]?.date.slice(0, 7);
    const month = chosenMonth ?? latest ?? currentMonth;
    return {
      month,
      balance: repo.getTotalBalance(),
      summary: repo.getMonthSummary(month),
      spending: repo.getExpensesByCategory(month),
      recent: repo.listTransactions({ limit: 8 }),
      hasAccounts: repo.listAccounts().length > 0,
    };
  });
</script>

<svelte:head><title>Dashboard · Finanças</title></svelte:head>

<PageHeader title="Dashboard" />

{#if !view}
  <OpenDatabasePanel />
{:else}
  <div class="mb-4 flex items-end gap-3">
    <Field label="Mês" class="w-44">
      {#snippet control(field)}
        <Input {...field} type="month" value={view.month} onchange={(e) => (chosenMonth = e.currentTarget.value || null)} />
      {/snippet}
    </Field>
  </div>

  {#if !view.hasAccounts}
    <Card class="mb-4">
      <CardContent>Crie sua primeira conta em <Link href="/accounts">Contas</Link> para começar a lançar.</CardContent>
    </Card>
  {/if}

  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Kpi label="Saldo total"><Money cents={view.balance} /></Kpi>
    <Kpi label="Receitas do mês"><Money cents={view.summary.incomeCents} tone="income" /></Kpi>
    <Kpi label="Despesas do mês"><Money cents={view.summary.expenseCents} tone="expense" /></Kpi>
    <Kpi label="Resultado do mês"><Money cents={view.summary.resultCents} tone="auto" showSign /></Kpi>
  </div>

  <Card class="mt-4">
    <CardHeader><CardTitle>Despesas por categoria</CardTitle></CardHeader>
    <CardContent>
      {#if view.spending.length === 0}
        <EmptyState title="Sem despesas neste mês." class="py-6" />
      {:else}
        <div class="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
          <SpendingChart data={view.spending} />
          <Table>
            <TableHeader>
              <TableRow><TableHead>Categoria</TableHead><TableHead class="text-right">Total</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {#each view.spending as item (item.categoryId)}
                <TableRow>
                  <TableCell>{item.name}</TableCell>
                  <TableCell class="text-right"><Money cents={item.totalCents} /></TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      {/if}
    </CardContent>
  </Card>

  <Card class="mt-4">
    <CardHeader><CardTitle>Últimos lançamentos</CardTitle></CardHeader>
    <CardContent class="px-0"><TransactionTable items={view.recent} /></CardContent>
  </Card>
{/if}
