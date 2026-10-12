<script lang="ts">
  import { ArrowDownRight, ArrowUpRight, Scale, Utensils, Wallet } from "@lucide/svelte";
  import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CountUp,
    EmptyState,
    IconChip,
    InfoTip,
    Kpi,
    Link,
    Money,
    PageHeader,
    Progress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    toneForName,
    TrendBadge,
  } from "@finance/ui";
  import CashFlowChart from "$lib/CashFlowChart.svelte";
  import RollForwardDialog from "$lib/RollForwardDialog.svelte";
  import { BAR_CLASS, categoryStyle } from "$lib/category-style";
  import { todayLocal } from "$lib/local-date";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { period } from "$lib/period.svelte";
  import SpendingChart from "$lib/SpendingChart.svelte";
  import { session } from "$lib/session.svelte";
  import TransactionList from "$lib/TransactionList.svelte";

  /** Os `count` meses que terminam em `month` (`YYYY-MM`), do mais antigo ao mais novo. */
  function lastMonths(month: string, count: number): string[] {
    const [year = 0, mon = 1] = month.split("-").map(Number);
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(year, mon - 1 - (count - 1 - index), 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    });
  }

  function change(current: number, previous: number): number | null {
    return previous > 0 ? ((current - previous) / previous) * 100 : null;
  }

  let rollOpen = $state(false);
  const monthLabel = $derived.by(() => {
    const [year = 0, mon = 1] = period.month.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, mon - 1, 1));
  });

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
    const activeAccounts = new Set(repo.listAccounts().map((account) => account.id));
    const items = repo.listTransactions({ month, limit: 5000 }).filter((item) => activeAccounts.has(item.accountId));

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
      balance: repo.getBalanceBreakdown().cashCents,
      breakdown: repo.getBalanceBreakdown(),
      roll: repo.getMonthRollForward(month),
      extras: repo.getMonthExtras(month),
      toReceive: repo.getIncomeExpectations(month, todayLocal()).remainingCents,
      reserved: repo.getReservedSummary(),
      hasGoals: repo.listGoals().length > 0,
      incomeMonths: lastMonths(month, 6),
      incomeBySource: repo.getIncomeBySource(lastMonths(month, 6)[0] ?? month, month),
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
      <Kpi
        label="Saldo total"
        icon={Wallet}
        tone="primary"
        info="Dinheiro que você tem hoje nas suas contas ativas. Cartões e empréstimos não são descontados: o que você deve neles aparece embaixo, para pagar quando a fatura vencer. Não inclui bens nem lançamentos pendentes."
      >
        <CountUp cents={view.balance} tone="auto" />
        {#snippet hint()}
          {#if view.breakdown.debtCents !== 0}
            A pagar nos cartões <Money cents={view.breakdown.debtCents} tone="expense" /> (fora deste saldo)
          {/if}
        {/snippet}
      </Kpi>
    </div>
    <div class="animate-rise" style="animation-delay: 60ms">
      <Kpi
        label="Receitas do mês"
        icon={ArrowUpRight}
        tone="income"
        info="Dinheiro que entrou no mês escolhido. Transferências entre suas contas e lançamentos pendentes não contam."
      >
        <CountUp cents={view.summary.incomeCents} tone="income" />
        {#snippet trend()}{#if view.incomeTrend !== null}<TrendBadge percent={view.incomeTrend} />{/if}{/snippet}
        {#snippet hint()}
          <span class="flex items-center gap-1">
            A receber: <Money cents={view.toReceive} />
            <InfoTip
              text="O que as suas receitas recorrentes ainda vão trazer neste mês. Só entra nas Receitas do mês quando você marca como recebida."
              label="Sobre o que falta receber"
            />
          </span>
        {/snippet}
      </Kpi>
    </div>
    <div class="animate-rise" style="animation-delay: 120ms">
      <Kpi
        label="Despesas do mês"
        icon={ArrowDownRight}
        tone="expense"
        info="Dinheiro que saiu no mês escolhido, no dia em que foi pago. Compras no cartão contam no mês em que a fatura fecha (a que você vai pagar). Contas ainda não pagas, transferências e lançamentos pendentes não contam."
      >
        <CountUp cents={view.summary.expenseCents} tone="expense" />
        {#snippet trend()}{#if view.expenseTrend !== null}<TrendBadge percent={view.expenseTrend} goodWhen="down" />{/if}{/snippet}
        {#snippet hint()}
          <span class="flex items-center gap-1">
            Extras do mês: <Money cents={view.extras} tone="expense" />
            <InfoTip
              text="Imprevistos do mês: despesas que você marcou como extras. Já estão somadas nas despesas, na sua categoria de sempre."
              label="Sobre extras do mês"
            />
          </span>
        {/snippet}
      </Kpi>
    </div>
    <div class="animate-rise" style="animation-delay: 180ms">
      <Kpi
        label="Resultado do mês"
        icon={Scale}
        tone="transfer"
        info="Receitas menos despesas do mês. Se for positivo, sobrou dinheiro; se for negativo, você gastou mais do que recebeu."
      >
        <CountUp cents={view.summary.resultCents} tone="auto" showSign />
        {#snippet trend()}
          {#if view.summary.resultCents > 0}<Badge variant="income">Sobrou</Badge>
          {:else if view.summary.resultCents < 0}<Badge variant="expense">Faltou</Badge>{/if}
        {/snippet}
        {#snippet hint()}
          Receitas − Despesas ·
          <Button variant="link" size="sm" class="h-auto p-0 text-xs" onclick={() => (rollOpen = true)}>Como chegamos neste saldo</Button>
        {/snippet}
      </Kpi>
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

      {#if view.hasGoals}
        <Card class="animate-rise" style="animation-delay: 330ms">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">Metas</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-2">
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="flex items-center gap-1 text-muted-foreground">
                Reservado
                <InfoTip text="Dinheiro que você separou nas metas ativas. Ele continua nas suas contas; o saldo total não muda." label="Sobre o reservado" />
              </span>
              <Money class="font-semibold" cents={view.reserved.reservedCents} />
            </div>
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="flex items-center gap-1 text-muted-foreground">
                Livre
                <InfoTip text="Seu saldo total menos o que está reservado nas metas." label="Sobre o livre" />
              </span>
              <Money class="font-semibold" cents={view.reserved.freeCents} tone="auto" />
            </div>
            <Link href="/goals" class="text-sm">Ver metas</Link>
          </CardContent>
        </Card>
      {/if}

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

  {#if view.incomeBySource.length > 0}
    {@const thisMonth = view.incomeBySource.filter((row) => row.month === period.month)}
    {@const sourceNames = [...new Map(view.incomeBySource.map((row) => [row.sourceId, row.sourceName])).entries()]}
    {@const monthTotal = thisMonth.reduce((total, row) => total + row.totalCents, 0)}
    <Card class="mt-4 animate-rise" style="animation-delay: 400ms">
      <CardHeader><CardTitle>Receitas por fonte</CardTitle></CardHeader>
      <CardContent class="grid gap-4">
        {#if thisMonth.length === 0}
          <p class="text-sm text-muted-foreground">Nenhuma receita recebida neste mês.</p>
        {:else}
          <ul class="grid gap-2.5">
            {#each thisMonth as row (row.sourceId)}
              <li class="grid gap-1">
                <div class="flex items-center gap-2 text-sm">
                  <span class="flex-1 truncate">{row.sourceName}</span>
                  <Money cents={row.totalCents} tone="income" class="font-medium" />
                </div>
                <Progress value={row.totalCents} max={monthTotal} aria-label={`${row.sourceName}: parte das receitas do mês`} />
              </li>
            {/each}
          </ul>
        {/if}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              {#each sourceNames as [id, name] (id)}<TableHead class="text-right">{name}</TableHead>{/each}
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each [...view.incomeMonths].reverse().filter((key) => view.incomeBySource.some((row) => row.month === key)) as monthKey (monthKey)}
              <TableRow>
                <TableCell>{monthKey.slice(5, 7)}/{monthKey.slice(0, 4)}</TableCell>
                {#each sourceNames as [id] (id)}
                  <TableCell class="text-right">
                    <Money cents={view.incomeBySource.find((row) => row.month === monthKey && row.sourceId === id)?.totalCents ?? 0} />
                  </TableCell>
                {/each}
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  {/if}

  <Card class="mt-4 animate-rise" style="animation-delay: 420ms">
    <CardHeader><CardTitle>Últimos lançamentos</CardTitle></CardHeader>
    <CardContent class="px-0"><TransactionList items={view.recent} emptyTitle="Nada lançado neste mês." /></CardContent>
  </Card>

  <RollForwardDialog bind:open={rollOpen} roll={view.roll} monthLabel={monthLabel} />
{/if}