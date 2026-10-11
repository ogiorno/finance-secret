<script lang="ts">
  import {
    Card, CardContent, CardHeader, CardTitle, Input, Kpi, Label, Money,
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

<h1 class="mb-6 text-2xl font-semibold">Dashboard</h1>

{#if !view}
  <OpenDatabasePanel />
{:else}
  <div class="mb-4 flex items-end gap-3">
    <div class="grid gap-1.5">
      <Label for="month">Mês</Label>
      <Input id="month" type="month" value={view.month} onchange={(e) => (chosenMonth = e.currentTarget.value || null)} class="w-44" />
    </div>
  </div>

  {#if !view.hasAccounts}
    <Card class="mb-4">
      <CardContent>Crie sua primeira conta em <a class="font-medium text-primary underline" href="/accounts">Contas</a> para começar a lançar.</CardContent>
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
        <p class="text-sm text-muted-foreground">Sem despesas neste mês.</p>
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
