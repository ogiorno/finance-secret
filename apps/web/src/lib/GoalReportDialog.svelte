<script lang="ts">
  import { Trash } from "@lucide/svelte";
  import type { Contribution } from "@finance/database";
  import { ConfirmDialog, Dialog, IconButton, Money, Progress, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatBRL, toast } from "@finance/ui";
  import { formatDate } from "./flow";
  import { currentPeriod } from "./local-date";
  import { session } from "./session.svelte";

  let { open = $bindable(false), goalId }: { open?: boolean; goalId: number | null } = $props();

  const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const monthName = (period: string) => `${MONTHS[Number(period.slice(5, 7)) - 1]} de ${period.slice(0, 4)}`;

  const view = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo || goalId === null) return null;
    try {
      return { report: repo.getGoalReport(goalId, currentPeriod()), contributions: repo.listContributions(goalId) };
    } catch {
      return null;
    }
  });

  const maxMonth = $derived(Math.max(1, ...(view?.report.months.map((month) => Math.abs(month.netCents)) ?? [])));

  let deleteOpen = $state(false);
  let deleting = $state<Contribution | null>(null);

  function askDelete(contribution: Contribution) {
    deleting = contribution;
    deleteOpen = true;
  }

  function confirmDelete() {
    const target = deleting;
    if (!target) return;
    try {
      session.change((repo) => repo.deleteContribution(target.id));
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : "Não foi possível apagar.", tone: "destructive", duration: 0 });
    }
  }
</script>

<Dialog bind:open title={view ? `Relatório: ${view.report.goal.name}` : "Relatório da meta"}>
  {#if view}
    {@const report = view.report}
    <div class="grid gap-4">
      <div class="grid gap-2">
        <div class="flex items-baseline justify-between gap-2">
          <Money class="text-2xl font-semibold" cents={report.savedCents} />
          {#if report.goal.targetCents !== null}<span class="text-sm text-muted-foreground">de {formatBRL(report.goal.targetCents)}</span>{/if}
        </div>
        {#if report.progressPercent !== null}
          <Progress value={report.progressPercent} aria-label={`${report.progressPercent}% do alvo guardado`} />
          <p class="text-xs text-muted-foreground">{report.progressPercent}% do alvo guardado</p>
        {/if}
      </div>

      <ul class="grid gap-1 text-sm">
        {#if report.months.length > 0}
          <li>No ritmo atual você coloca <strong>{formatBRL(report.averageMonthlyCents)}</strong> por mês.</li>
        {/if}
        {#if report.estimatedPeriod !== null && report.goal.targetCents !== null && report.savedCents < report.goal.targetCents}
          <li>Nesse ritmo, o alvo é atingido em <strong>{monthName(report.estimatedPeriod)}</strong>.</li>
        {/if}
        {#if report.neededMonthlyCents !== null && report.neededMonthlyCents > 0 && report.goal.targetDate}
          <li>Para cumprir o prazo ({formatDate(report.goal.targetDate)}), coloque <strong>{formatBRL(report.neededMonthlyCents)}</strong> por mês.</li>
        {/if}
        {#if report.goal.targetCents !== null && report.savedCents >= report.goal.targetCents}
          <li>O alvo já foi atingido.</li>
        {/if}
      </ul>

      {#if report.months.length === 0}
        <p class="text-sm text-muted-foreground">Ainda não há aportes nesta meta.</p>
      {:else}
        <div>
          <h3 class="mb-2 text-sm font-semibold">Mês a mês</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead class="text-right">Colocado</TableHead>
                <TableHead class="text-right">Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each [...report.months].reverse() as month (month.month)}
                <TableRow>
                  <TableCell>
                    <div>{month.month.slice(5, 7)}/{month.month.slice(0, 4)}</div>
                    <div class="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div class={`h-full rounded-full ${month.netCents < 0 ? "bg-expense" : "bg-income"}`} style={`width: ${(Math.abs(month.netCents) / maxMonth) * 100}%`}></div>
                    </div>
                  </TableCell>
                  <TableCell class="text-right"><Money cents={month.netCents} tone="auto" showSign /></TableCell>
                  <TableCell class="text-right"><Money cents={month.cumulativeCents} /></TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 class="mb-2 text-sm font-semibold">Aportes e resgates</h3>
          <ul class="divide-y rounded-lg border">
            {#each view.contributions as contribution (contribution.id)}
              <li class="flex items-center gap-2 px-3 py-2 text-sm">
                <div class="min-w-0 flex-1">
                  <div>{formatDate(contribution.date)}</div>
                  {#if contribution.note}<div class="truncate text-xs text-muted-foreground">{contribution.note}</div>{/if}
                </div>
                <Money class="font-medium whitespace-nowrap" cents={contribution.amountCents} tone="auto" showSign />
                <IconButton icon={Trash} label={`Apagar ${contribution.amountCents < 0 ? "resgate" : "aporte"} de ${formatDate(contribution.date)}`} onclick={() => askDelete(contribution)} />
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <ConfirmDialog
      bind:open={deleteOpen}
      title={deleting && deleting.amountCents < 0 ? "Apagar este resgate?" : "Apagar este aporte?"}
      description={deleting
        ? `${formatBRL(Math.abs(deleting.amountCents))} de ${formatDate(deleting.date)} sai do histórico da meta. O dinheiro das suas contas não muda.`
        : undefined}
      confirmLabel="Apagar"
      destructive
      onconfirm={confirmDelete}
    />
  {/if}
</Dialog>
