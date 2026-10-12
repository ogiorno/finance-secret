<script lang="ts">
  import { ArrowDownRight, ArrowUpRight, Scale, Utensils, Wallet } from "@lucide/svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CountUp,
    EmptyState,
    IconChip,
    Kpi,
    Link,
    Money,
    PageHeader,
    toneForName,
    TrendBadge,
  } from "@finance/ui";
  import CashFlowChart from "$lib/CashFlowChart.svelte";
  import { BAR_CLASS, categoryStyle } from "$lib/category-style";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { period } from "$lib/period.svelte";
  import SpendingChart from "$lib/SpendingChart.svelte";
  import { session } from "$lib/session.svelte";
  import TransactionList from "$lib/TransactionList.svelte";

  function change(current: number, previous: number): number | null {
    return previous > 0 ? ((current - previous) / previous) * 100 : null;
  }

  const view = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const month = period.month;
    const [year = 0, mon = 1] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const now = new Date();
    const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === mon;
    const lastDay = isCurrent ? now.getDate() : daysInMonth;

    const summary = repo.getMonthSummary(month);
    const previous = repo.getMonthSummary(period.previous);
    const items = repo.listTransactions({ month, limit: 5000 });

    // O mês começa zerado no dia 1 e acumula; depois de hoje (mês corrente) a linha termina.
    const perDay = Array.from({ length: daysInMonth }, () => ({ income: 0, expense: 0 }));
    for (const item of items) {
      if (item.status !== "posted" || item.type === "transfer") continue;
      const day = perDay[Number(item.date.slice(8, 10)) - 1];
      if (day) day[item.type] += item.amountCents;
    }
    let income = 0;
    let expense = 0;
    const flow = perDay.map((day, index) => {
      income += day.income;
      expense += day.expense;
      return index < lastDay ? { income, expense } : null;
    });

    return {
      summary,
      incomeTrend: change(summary.incomeCents, previous.incomeCents),
      expenseTrend: change(summary.expenseCents, previous.expenseCents),
      balance: repo.getTotalBalance(),
      spending: repo.getExpensesByCategory(month),
      usage: repo.getAccountTypeUsage(month),
      recent: items.slice(0, 6),
      hasAccounts: repo.listAccounts().length > 0,
      days: perDay.map((_, index) => index + 1),
      incomeFlow: flow.map((entry) => entry?.income ?? null),
      expenseFlow: flow.map((entry) => entry?.expense ?? null),
    };
  });

  const spendingTotal = $derived(view?.spending.reduce((sum, item) => sum + item.totalCents, 0) ?? 0);

  let barsReady = $state(false);
  $effect(() => {
    void view;
    barsReady = false;
    const timer = setTimeout(() => (barsReady = true), 80);
    return () => clearTimeout(timer);
  });
</script>

<svelte:head><title>Painel · Finanças</title></svelte:head>

{#if !view}
  <PageHeader title="Painel" />
  <OpenDatabasePanel />
{:else}
  <PageHeader title="Painel" description="Como está o seu mês." />

  {#if !view.hasAccounts}
    <Card class="mb-4">
      <CardContent>Crie sua primeira conta em <Link href="/accounts">Contas</Link> para começar a lançar.</CardContent>
    </Card>
  {/if}

  <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
    <div class="animate-rise" style="animation-delay: 0ms">
      <Kpi label="Saldo total" icon={Wallet} tone="primary"><CountUp cents={view.balance} tone="auto" /></Kpi>
    </div>
    <div class="animate-rise" style="animation-delay: 60ms">
      <Kpi label="Receitas" icon={ArrowUpRight} tone="income">
        <CountUp cents={view.summary.incomeCents} tone="income" />
        {#snippet trend()}{#if view.incomeTrend !== null}<TrendBadge percent={view.incomeTrend} />{/if}{/snippet}
      </Kpi>
    </div>
    <div class="animate-rise" style="animation-delay: 120ms">
      <Kpi label="Despesas" icon={ArrowDownRight} tone="expense">
        <CountUp cents={view.summary.expenseCents} tone="expense" />
        {#snippet trend()}{#if view.expenseTrend !== null}<TrendBadge percent={view.expenseTrend} goodWhen="down" />{/if}{/snippet}
      </Kpi>
    </div>
    <div class="animate-rise" style="animation-delay: 180ms">
      <Kpi label="Resultado" icon={Scale} tone="transfer"><CountUp cents={view.summary.resultCents} tone="auto" showSign /></Kpi>
    </div>
  </div>

  <div class="mt-4 grid items-start gap-4 lg:grid-cols-3">
    <Card class="animate-rise lg:col-span-2" style="animation-delay: 240ms">
      <CardHeader>
        <CardTitle>Fluxo do mês</CardTitle>
        <p class="text-sm text-muted-foreground">Receitas e despesas acumuladas, a partir de zero no dia 1.</p>
      </CardHeader>
      <CardContent><CashFlowChart days={view.days} income={view.incomeFlow} expense={view.expenseFlow} /></CardContent>
    </Card>

    <div class="grid content-start gap-4">
      {#each view.usage.filter((entry) => entry.accountCount > 0) as row (row.typeKey)}
        {@const used = row.creditedCents > 0 ? Math.min(100, (row.usedCents / row.creditedCents) * 100) : 0}
        <Card class="animate-rise" style="animation-delay: 300ms">
          <CardHeader>
            <CardTitle class="flex items-center gap-2"><IconChip icon={Utensils} tone="benefit" size="sm" />{row.typeName}</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-2">
            <div class="text-2xl font-semibold tabular-nums"><CountUp cents={row.balanceCents} tone="auto" /></div>
            <div
              class="h-2 overflow-hidden rounded-full bg-benefit/20"
              role="img"
              aria-label={`${Math.round(used)}% do crédito do mês já foi usado`}
            >
              <div class="h-full rounded-full bg-benefit" style={`width: ${barsReady ? used : 0}%; transition: width 1s cubic-bezier(0.2, 0.8, 0.2, 1)`}></div>
            </div>
            <div class="flex justify-between text-xs text-muted-foreground">
              <span>Usado <Money cents={row.usedCents} /></span>
              <span>{row.creditedCents > 0 ? "de" : "sem crédito no mês"} {#if row.creditedCents > 0}<Money cents={row.creditedCents} />{/if}</span>
            </div>
          </CardContent>
        </Card>
      {/each}

      <Card class="animate-rise" style="animation-delay: 360ms">
        <CardHeader><CardTitle>Despesas por categoria</CardTitle></CardHeader>
        <CardContent>
          {#if view.spending.length === 0}
            <EmptyState title="Sem despesas neste mês." description="Tudo começa zerado a cada mês." class="py-6" />
          {:else}
            <SpendingChart data={view.spending} />
            <ul class="mt-3 grid gap-2.5">
              {#each view.spending as item (item.categoryId)}
                {@const style = categoryStyle(item.name, "expense")}
                <li class="grid gap-1">
                  <div class="flex items-center gap-2 text-sm">
                    <IconChip icon={style.icon} tone={style.tone} size="sm" />
                    <span class="flex-1 truncate">{item.name}</span>
                    <Money cents={item.totalCents} class="font-medium" />
                  </div>
                  <div class="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      class={`h-full rounded-full ${BAR_CLASS[toneForName(item.name)]}`}
                      style={`width: ${barsReady && spendingTotal > 0 ? (item.totalCents / spendingTotal) * 100 : 0}%; transition: width 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)`}
                    ></div>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
        </CardContent>
      </Card>
    </div>
  </div>

  <Card class="mt-4 animate-rise" style="animation-delay: 420ms">
    <CardHeader><CardTitle>Últimos lançamentos</CardTitle></CardHeader>
    <CardContent class="px-0"><TransactionList items={view.recent} emptyTitle="Nada lançado neste mês." /></CardContent>
  </Card>
{/if}