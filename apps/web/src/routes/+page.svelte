<script lang="ts">
  import {
    Alert, Card, CardContent, CardHeader, CardTitle, EmptyState, Kpi, Link, Money, MonthStepper, PageHeader,
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  } from "@finance/ui";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import SpendingChart from "$lib/SpendingChart.svelte";
  import CashFlowChart, { type CashFlowMonth } from "$lib/CashFlowChart.svelte";
  import TransactionTable from "$lib/TransactionTable.svelte";
  import { session } from "$lib/session.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  let chosenMonth = $state<string | null>(null);

  const view = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const latest = repo.listTransactions({ limit: 1 })[0]?.date.slice(0, 7);
    const month = chosenMonth ?? latest ?? currentMonth;
    const year = Number(month.slice(0, 4));
    const monthNumber = Number(month.slice(5, 7));
    const trend: CashFlowMonth[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(year, monthNumber - 1 - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const summary = repo.getMonthSummary(key);
      return {
        month: key,
        label: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(date),
        incomeCents: summary.incomeCents,
        expenseCents: summary.expenseCents,
      };
    });
    const spending = repo.getExpensesByCategory(month);
    const periodLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
    return {
      month,
      periodLabel,
      trend,
      spendingTotal: spending.reduce((total, item) => total + item.totalCents, 0),
      autoHistorical: chosenMonth === null && latest !== undefined && latest !== currentMonth,
      balance: repo.getTotalBalance(),
      summary: repo.getMonthSummary(month),
      spending,
      recent: repo.listTransactions({ limit: 8 }),
      hasAccounts: repo.listAccounts().length > 0,
    };
  });
</script>

<svelte:head><title>Dashboard · Finanças</title></svelte:head>

<PageHeader title="Dashboard" />

{#if !view}
  <OpenDatabasePanel onOpened={() => { const next = page.url.searchParams.get("next"); if (next?.startsWith("/") && !next.startsWith("//")) void goto(next); }} />
{:else}
  <div class="mb-4 grid gap-2">
    <MonthStepper value={view.month} onchange={(month) => (chosenMonth = month)} />
    {#if view.autoHistorical}<Alert>Mostrando {view.month}, o último mês com lançamentos. Use Hoje para ver o mês atual.</Alert>{/if}
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
    <CardHeader><CardTitle>Receitas e despesas</CardTitle></CardHeader>
    <CardContent>
      {#if view.trend.every((item) => item.incomeCents === 0 && item.expenseCents === 0)}
        <EmptyState title="Sem receitas ou despesas nos últimos seis meses." class="py-6" />
      {:else}
        <p class="mb-3 text-sm text-muted-foreground">Últimos seis meses até {view.periodLabel}. Transferências não entram nestes totais.</p>
        <CashFlowChart data={view.trend} />
        <Table>
          <TableHeader><TableRow><TableHead>Mês</TableHead><TableHead class="text-right">Receitas</TableHead><TableHead class="text-right">Despesas</TableHead></TableRow></TableHeader>
          <TableBody>
            {#each view.trend as item (item.month)}
              <TableRow>
                <TableCell>{item.label}</TableCell>
                <TableCell class="text-right"><Money cents={item.incomeCents} tone="income" /></TableCell>
                <TableCell class="text-right"><Money cents={item.expenseCents} tone="expense" /></TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </CardContent>
  </Card>

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
              <TableRow><TableHead>Categoria</TableHead><TableHead class="text-right">Parte</TableHead><TableHead class="text-right">Total</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {#each view.spending as item (item.categoryId)}
                <TableRow>
                  <TableCell>{item.name}</TableCell>
                  <TableCell class="text-right">{new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(item.totalCents / view.spendingTotal)}</TableCell>
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
    <CardContent class="px-0"><TransactionTable items={view.recent} pendingDeleteId={session.pendingDeleteId} pendingDeleteGroupId={session.pendingDeleteGroupId} /></CardContent>
  </Card>
{/if}
