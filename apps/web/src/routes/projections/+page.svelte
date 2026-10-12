<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";
  import {
    Alert,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    EmptyState,
    InfoTip,
    Money,
    PageHeader,
    Progress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@finance/ui";
  import { todayLocal } from "$lib/local-date";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { session } from "$lib/session.svelte";

  const HORIZON = 3;

  const view = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const today = todayLocal();
    return { today, projection: repo.getCashProjection(today, HORIZON), hasAccounts: repo.listAccounts().length > 0 };
  });

  const longName = (month: string) =>
    new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const shortName = (month: string) =>
    new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(" de ", "/");

  /** As faturas que ainda aceitam compras, a partir da que fecha primeiro. */
  const invoices = $derived(
    view && view.projection.firstOpenInvoiceMonth !== null
      ? view.projection.months.filter((month) => month.month >= (view.projection.firstOpenInvoiceMonth ?? ""))
      : [],
  );

  const lines = [
    {
      key: "income",
      label: "+ Receitas a receber",
      info: "No mês atual, as receitas recorrentes cadastradas que ainda não foram recebidas. Nos meses seguintes, as recorrentes cadastradas ou, se não houver, a mesma receita do último mês (marcado com *). Vem de A pagar e receber.",
    },
    {
      key: "bills",
      label: "− Contas fixas a pagar",
      info: "Contas fixas pendentes e atrasadas do mês, pelo valor esperado de cada uma. Vem de A pagar e receber.",
    },
    {
      key: "variable",
      label: "− Gastos do dia a dia (estimado)",
      info: "Média mensal dos gastos fora do cartão e das contas fixas nos últimos 3 meses com histórico. No mês atual, só a parte dos dias que faltam. É uma estimativa, não um valor lançado.",
    },
    {
      key: "card",
      label: "− Fatura do cartão a pagar",
      info: "O que entrou na fatura que fecha no mês (compras do ciclo anterior) menos o que você já pagou dela. Vem dos lançamentos nos cartões.",
    },
  ] as const;

  function amount(month: NonNullable<typeof view>["projection"]["months"][number], key: (typeof lines)[number]["key"]): number {
    if (key === "income") return month.incomeCents;
    if (key === "bills") return month.billsCents;
    if (key === "variable") return month.variableCents;
    return month.cardPaymentCents;
  }
</script>

<svelte:head><title>Projeções · Finanças</title></svelte:head>

{#if !view}
  <PageHeader title="Projeções" />
  <OpenDatabasePanel />
{:else}
  <PageHeader
    title="Projeções"
    description="Para onde o seu dinheiro vai nos próximos meses, e quanto ainda cabe no cartão sem ficar no vermelho. Nada aqui vira lançamento."
  />

  {#if !view.hasAccounts}
    <Card>
      <EmptyState title="Ainda não há contas." description="Crie uma conta e lance seus gastos para ver a projeção." />
    </Card>
  {:else}
    <div class="grid grid-cols-1 gap-6">
      {#if view.projection.firstNegativeMonth !== null}
        <Alert variant="warning">
          <span class="flex items-start gap-2">
            <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            O saldo previsto fica negativo em {longName(view.projection.firstNegativeMonth)}. Veja a tabela abaixo e o que dá para adiar ou cortar.
          </span>
        </Alert>
      {/if}

      <section class="grid min-w-0 grid-cols-1 gap-3" aria-labelledby="card-heading">
        <div>
          <h2 id="card-heading" class="flex items-center gap-1.5 text-section-title font-semibold">
            Quanto ainda posso gastar no cartão
            <InfoTip
              text="O teto de cada fatura é o que o mês dela gera: receita menos todas as contas fixas e os gastos do dia a dia estimados. Com o mesmo salário, ele é igual todo mês: o dinheiro que sobra de um mês não aumenta o teto do seguinte (um buraco que vem de trás o diminui). 'Ainda cabe' é o teto menos o que já está na fatura."
              label="Sobre o teto do cartão"
            />
          </h2>
          <p class="text-sm text-muted-foreground">Cada fatura é paga no mês em que fecha; as compras de hoje caem na próxima.</p>
        </div>

        {#if invoices.length === 0}
          <Card>
            <EmptyState title="Nenhum cartão ativo." description="Crie uma conta de tipo cartão para ver quanto cabe nas próximas faturas." />
          </Card>
        {:else}
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {#each invoices as invoice (invoice.month)}
              <Card>
                <CardHeader>
                  <CardTitle>Fatura de {longName(invoice.month)}</CardTitle>
                  <CardDescription>Paga em {longName(invoice.month)}</CardDescription>
                </CardHeader>
                <CardContent class="grid gap-3">
                  <div>
                    <div class="text-xs text-muted-foreground">Ainda cabe</div>
                    <Money class="text-2xl font-semibold" cents={invoice.cardRoomCents} tone="auto" />
                  </div>
                  <Progress value={invoice.cardInvoiceCents} max={Math.max(invoice.cardAllowanceCents, 1)} aria-label="Quanto do teto já está na fatura" />
                  <dl class="grid gap-1 text-sm">
                    <div class="flex items-center justify-between gap-3">
                      <dt class="text-muted-foreground">Já na fatura</dt>
                      <dd><Money class="font-medium" cents={invoice.cardInvoiceCents} /></dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt class="text-muted-foreground">Teto</dt>
                      <dd><Money class="font-medium" cents={invoice.cardAllowanceCents} /></dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            {/each}
          </div>
        {/if}
      </section>

      <section class="grid min-w-0 grid-cols-1 gap-3" aria-labelledby="cash-heading">
        <div>
          <h2 id="cash-heading" class="text-section-title font-semibold">Projeção do caixa</h2>
          <p class="text-sm text-muted-foreground">
            O saldo de hoje em contas (<Money cents={view.projection.startCashCents} tone="auto" />), mês a mês. O fim de um mês é o início do seguinte.
          </p>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>&nbsp;</TableHead>
                {#each view.projection.months as month, index (month.month)}
                  <TableHead class="text-right capitalize">{shortName(month.month)}{index === 0 ? " (resto)" : ""}</TableHead>
                {/each}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell class="font-medium">Saldo no início</TableCell>
                {#each view.projection.months as month (month.month)}
                  <TableCell class="text-right tabular-nums"><Money cents={month.openingCents} tone="auto" /></TableCell>
                {/each}
              </TableRow>
              {#each lines as line (line.key)}
                <TableRow>
                  <TableCell>
                    <span class="flex items-center gap-1">{line.label}<InfoTip text={line.info} label={`Sobre ${line.label}`} /></span>
                  </TableCell>
                  {#each view.projection.months as month (month.month)}
                    <TableCell class="text-right tabular-nums"
                      ><Money cents={amount(month, line.key)} />{#if line.key === "income" && month.incomeAssumed}<span title="Supondo a mesma receita do último mês"> *</span>{/if}</TableCell
                    >
                  {/each}
                </TableRow>
              {/each}
              <TableRow class="font-semibold">
                <TableCell>= Saldo no fim</TableCell>
                {#each view.projection.months as month (month.month)}
                  <TableCell class="text-right tabular-nums"><Money cents={month.closingCents} tone="auto" /></TableCell>
                {/each}
              </TableRow>
            </TableBody>
          </Table>
        </Card>
        <p class="text-xs text-muted-foreground">
          {view.projection.foots ? "A conta fecha: início + entradas − saídas é igual ao fim em todos os meses." : "A conta não fecha: há um erro no cálculo."}
          {#if view.projection.months.some((month) => month.incomeAssumed)}
            * Sem receitas recorrentes cadastradas, supus a mesma receita do último mês com receita (<Money cents={view.projection.lastIncomeCents} />).
          {/if}
          {#if view.projection.variableMonthsUsed === 0}
            Ainda não há histórico para estimar os gastos do dia a dia, então eles estão em zero e a projeção tende a ser otimista.
          {:else}
            Gastos do dia a dia: média de {view.projection.variableMonthsUsed} {view.projection.variableMonthsUsed === 1 ? "mês" : "meses"} com histórico.
          {/if}
        </p>
      </section>
    </div>
  {/if}
{/if}
